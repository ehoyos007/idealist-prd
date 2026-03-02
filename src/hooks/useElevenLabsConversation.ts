import { useState, useRef, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import {
  ConversationMessage,
  ProjectCard,
  UploadedFile,
  DocumentChunk,
  RetrievedContext,
} from '@/types/project';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const SYSTEM_PROMPT_NEW = `You are an enthusiastic product coach and PRD brainstorming partner named Idealist.
Your goal is to help users develop their raw product ideas into structured,
actionable project requirement documents they can immediately start building from.

When a user shares an idea, engage them in a natural conversation to draw out:
1. The Core Idea: What are they building? What's the big vision? What problem does it solve?
2. Target User: Who is the primary user? What are their jobs-to-be-done? What's their context?
3. Core Features: What are the absolute must-have features for a first version (MVP)?
4. Tech Preferences: Any tech stack preferences or constraints? Platform targets?
5. Architecture: How should the major pieces fit together? Any integrations needed?
6. Success Metrics: How will they know it's working? What does success look like?
7. Risks & Unknowns: What are they unsure about? What could go wrong?
8. First Sprint: What should they build first in the first 1-2 weeks?

Be conversational, encouraging, and ask one or two questions at a time.
Push for specificity — vague answers become vague PRDs.
When you have enough information, summarize and let them know they can
end the session to generate their project card.

Keep responses concise — this is a voice conversation. Avoid long monologues.`;

const FIRST_MESSAGE_NEW =
  "Hey! I'm Idealist, your PRD brainstorming partner. Tell me about the product you want to build — what problem are you trying to solve?";

function buildRemixPrompt(project: ProjectCard): string {
  return `You are an enthusiastic product coach and PRD brainstorming partner named Idealist.
You are in REMIX mode — the user wants to iterate on an existing project.

Here is their current project:
- Project Name: ${project.projectName}
- Tagline: ${project.tagline}
- Vision: ${project.vision}
- Problem Statement: ${project.problemStatement}
- Target User: ${project.targetUser}
- Core Features: ${project.coreFeatures}
- Tech Stack: ${project.techStack}
- Architecture: ${project.architecture}
- Success Metrics: ${project.successMetrics}
- Risks & Open Questions: ${project.risksAndOpenQuestions}
- First Sprint Plan: ${project.firstSprintPlan}

Help the user explore what they want to change, improve, or pivot.
Ask focused questions about what's working, what's not, and where they want to go.
Keep responses concise — this is a voice conversation. Avoid long monologues.`;
}

function buildRemixFirstMessage(projectName: string): string {
  return `Hey! I've reviewed your project '${projectName}'. What aspects would you like to change or explore further?`;
}

export function useElevenLabsConversation() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  // Ref to hold the sendContextualUpdate function from the conversation object
  const sendContextualUpdateRef = useRef<((text: string) => void) | null>(null);

  const retrieveAndInjectContext = useCallback(
    async (query: string, currentSessionId: string) => {
      try {
        console.log(
          'Retrieving context for query:',
          query.substring(0, 50) + '...'
        );

        const { data, error } = await supabase.functions.invoke(
          'retrieve-context',
          {
            body: { query, sessionId: currentSessionId, limit: 3 },
          }
        );

        if (error) {
          console.error('Error retrieving context:', error);
          return;
        }

        if (!data?.success || !data.chunks?.length) {
          console.log('No relevant chunks found');
          return;
        }

        const chunks: DocumentChunk[] = data.chunks;
        const queryKeywords: string[] = data.queryKeywords || [];
        console.log(`Found ${chunks.length} relevant chunks`);

        const retrievedContext: RetrievedContext = {
          chunks,
          queryKeywords,
          timestamp: new Date(),
        };

        setMessages((prev) => [
          ...prev,
          {
            role: 'context',
            content: `Retrieved ${chunks.length} relevant section${chunks.length > 1 ? 's' : ''} from uploaded documents`,
            timestamp: new Date(),
            retrievedContext,
          },
        ]);

        // Inject context into the ElevenLabs stream via sendContextualUpdate
        const contextText = chunks
          .map(
            (chunk) =>
              `[From "${chunk.fileName}" section ${chunk.chunkIndex + 1}]:\n${chunk.text}`
          )
          .join('\n\n---\n\n');

        try {
          sendContextualUpdateRef.current?.(
            `[RELEVANT DOCUMENT CONTEXT - Use this to inform your response]\n\n${contextText}\n\n[END CONTEXT - Incorporate naturally without explicitly citing unless asked]`
          );
          console.log('Context injected via sendContextualUpdate');
        } catch (err) {
          console.warn(
            'Could not inject context into ElevenLabs stream (display-only):',
            err
          );
        }
      } catch (err) {
        console.error('Error in RAG retrieval:', err);
      }
    },
    []
  );

  const conversation = useConversation({
    onMessage: (payload) => {
      const role = payload.role === 'user' ? 'user' : 'assistant';
      setMessages((prev) => [
        ...prev,
        {
          role,
          content: payload.message,
          timestamp: new Date(),
        },
      ]);

      // Trigger RAG retrieval on user messages
      if (
        role === 'user' &&
        payload.message.length > 10 &&
        sessionIdRef.current
      ) {
        retrieveAndInjectContext(payload.message, sessionIdRef.current);
      }
    },
    onModeChange: ({ mode }) => {
      setIsSpeakingState(mode === 'speaking');
    },
    onConnect: () => {
      console.log('ElevenLabs conversation connected');
      setStatus('connected');
    },
    onDisconnect: (details) => {
      console.log('ElevenLabs conversation disconnected:', details.reason);
      if (details.reason === 'error') {
        setError(details.message || 'Connection lost');
        setStatus('error');
      } else {
        setStatus('disconnected');
      }
      setIsSpeakingState(false);
    },
    onError: (message, context) => {
      console.error('ElevenLabs error:', message, context);
      setError(message);
      setStatus('error');
    },
  });

  // Keep the ref in sync so retrieveAndInjectContext can call it
  sendContextualUpdateRef.current = conversation.sendContextualUpdate;

  const startConversation = useCallback(
    async (projectContext?: ProjectCard) => {
      setStatus('connecting');
      setError(null);
      setMessages([]);

      const newSessionId = crypto.randomUUID();
      setSessionId(newSessionId);
      sessionIdRef.current = newSessionId;
      console.log('Starting conversation with session ID:', newSessionId);

      try {
        console.log(
          'Requesting ElevenLabs token...',
          projectContext ? '(remix mode)' : '(new project)'
        );
        const { data, error: invokeError } = await supabase.functions.invoke(
          'elevenlabs-token',
          {
            body: projectContext ? { projectContext } : {},
          }
        );

        if (invokeError) {
          throw new Error(`Failed to get token: ${invokeError.message}`);
        }

        if (!data?.agentId) {
          console.error('Token response:', data);
          throw new Error('Failed to get agent configuration from API');
        }

        console.log('Got agent config, starting ElevenLabs session...');

        const isRemix = !!projectContext;

        // Use signedUrl for authenticated sessions; fall back to agentId for public agents
        const sessionConfig: Record<string, unknown> = data.token
          ? { signedUrl: data.token }
          : { agentId: data.agentId };

        await conversation.startSession({
          ...sessionConfig,
        });

        // For remix mode, inject project context after connection via contextual update
        if (isRemix) {
          const remixContext = buildRemixPrompt(projectContext);
          try {
            conversation.sendContextualUpdate(remixContext);
            console.log('Remix context injected via sendContextualUpdate');
          } catch (err) {
            console.warn('Could not inject remix context:', err);
          }
        }

        // Status will be set to 'connected' by the onConnect callback
      } catch (err) {
        console.error('Error starting conversation:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to start conversation'
        );
        setStatus('error');
      }
    },
    [conversation]
  );

  const endConversation = useCallback(() => {
    conversation.endSession().catch((err) => {
      console.warn('Error ending ElevenLabs session:', err);
    });
    setStatus('disconnected');
    setIsSpeakingState(false);
  }, [conversation]);

  const getTranscript = useCallback(() => {
    return messages
      .filter((m) => m.role !== 'context')
      .map((m) => {
        let content = `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`;
        if (m.attachedFile) {
          content += `\n[Attached file: ${m.attachedFile.name}]`;
          if (m.attachedFile.content) {
            content += `\n[File content: ${m.attachedFile.content}]`;
          }
        }
        return content;
      })
      .join('\n\n');
  }, [messages]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const sendFileContext = useCallback(
    (file: UploadedFile, extractedContent: string) => {
      // Add to local messages for display
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: `Uploaded file: ${file.name}`,
          timestamp: new Date(),
          attachedFile: file,
        },
      ]);

      // Inject file context into the ElevenLabs stream via contextual update
      try {
        conversation.sendContextualUpdate(
          `[FILE UPLOADED: ${file.name}]\n\nThe user has shared the following document for additional context:\n\n---\n${extractedContent}\n---\n\nPlease acknowledge this file and consider its content when discussing the project.`
        );
        console.log('File context sent via sendContextualUpdate');
      } catch (err) {
        console.warn('Could not send file context to stream:', err);
      }

      // Trigger RAG retrieval for the file content
      if (sessionIdRef.current) {
        retrieveAndInjectContext(extractedContent, sessionIdRef.current);
      }

      return true;
    },
    [conversation, retrieveAndInjectContext]
  );

  const getSessionId = useCallback(() => sessionId, [sessionId]);

  return {
    status,
    isSpeaking: isSpeakingState,
    isMuted,
    messages,
    error,
    sessionId,
    startConversation,
    endConversation,
    getTranscript,
    toggleMute,
    sendFileContext,
    getSessionId,
  };
}
