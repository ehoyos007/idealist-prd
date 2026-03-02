import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceOrb } from './VoiceOrb';
import { ConversationView } from './ConversationView';
import { FileUploadButton, processFile } from './FileUploadButton';
import { useElevenLabsConversation } from '@/hooks/useElevenLabsConversation';
import { supabase } from '@/integrations/supabase/client';
import { ProjectCard, UploadedFile } from '@/types/project';
import { Mic, Square, Loader2, Sparkles, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SessionViewProps {
  onComplete: (project: ProjectCard) => void;
  onCancel: () => void;
  remixProject?: ProjectCard;
}

export function SessionView({ onComplete, onCancel, remixProject }: SessionViewProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingDrop, setIsProcessingDrop] = useState(false);
  const {
    status,
    isSpeaking,
    isMuted,
    messages,
    error,
    sessionId,
    startConversation,
    endConversation,
    getTranscript,
    toggleMute,
    sendFileContext
  } = useElevenLabsConversation();

  const handleFileProcessed = async (file: UploadedFile, content: string) => {
    // Send to voice AI for immediate context
    const success = sendFileContext(file, content);
    if (!success) {
      toast({
        title: "Failed to send file",
        description: "The connection is not ready. Please try again.",
        variant: "destructive"
      });
      return;
    }

    // Also chunk and index for RAG retrieval
    if (sessionId) {
      try {
        console.log('Chunking and indexing file:', file.name);
        const { data, error: chunkError } = await supabase.functions.invoke('chunk-and-index', {
          body: {
            text: content,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            sessionId
          }
        });

        if (chunkError) {
          console.error('Failed to chunk file:', chunkError);
        } else {
          console.log(`Indexed ${data?.chunkCount || 0} chunks for ${file.name}`);
          toast({
            title: "Document indexed",
            description: `${file.name} indexed with ${data?.chunkCount || 0} chunks for smart retrieval`
          });
        }
      } catch (err) {
        console.error('Error chunking file:', err);
      }
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (status === 'connected') {
      setIsDragging(true);
    }
  }, [status]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (status !== 'connected') {
      toast({
        title: "Not connected",
        description: "Start a conversation before uploading files.",
        variant: "destructive"
      });
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Process only the first file
    const file = files[0];
    setIsProcessingDrop(true);

    try {
      const result = await processFile(file, supabase);
      if (result) {
        await handleFileProcessed(result.file, result.content);
        toast({
          title: "File attached",
          description: `${file.name} has been added to the conversation`
        });
      }
    } catch (error) {
      toast({
        title: "Failed to process file",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsProcessingDrop(false);
    }
  }, [status, sessionId, sendFileContext, toast]);

  const handleStart = async () => {
    await startConversation(remixProject);
  };

  const handleEnd = async () => {
    // Capture transcript and messages BEFORE ending conversation
    const transcript = getTranscript();
    const messageCount = messages.length;
    const currentSessionId = sessionId;

    // Set generating state FIRST to prevent UI from changing
    setIsGenerating(true);

    // Now end the conversation (this changes status to 'disconnected')
    endConversation();

    if (messageCount < 2) {
      setIsGenerating(false);
      toast({
        title: "Not enough conversation",
        description: "Have a longer conversation to generate a project card.",
        variant: "destructive"
      });
      onCancel();
      return;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('synthesize-project', {
        body: { transcript }
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.projectCard) {
        throw new Error('No project card generated');
      }

      const projectId = crypto.randomUUID();

      const projectCard: ProjectCard = {
        ...data.projectCard,
        id: projectId,
        transcript,
        remixedFromId: remixProject?.id,
        remixedFromTitle: remixProject?.projectName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Link documents to the project if we had a session with uploads
      if (currentSessionId) {
        try {
          await supabase.functions.invoke('link-documents-to-project', {
            body: { sessionId: currentSessionId, projectId }
          });
          console.log('Documents linked to project');
        } catch (linkErr) {
          console.error('Failed to link documents:', linkErr);
        }
      }

      toast({
        title: "Project card generated!",
        description: "Your conversation has been synthesized into a structured PRD."
      });

      onComplete(projectCard);
    } catch (err) {
      console.error('Error generating project card:', err);
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Failed to generate project card",
        variant: "destructive"
      });
      onCancel();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    endConversation();
    onCancel();
  };

  const handleFileUploadProcessed = async (file: UploadedFile, content: string) => {
    await handleFileProcessed(file, content);
  };

  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="h-16 w-16 animate-spin mb-6" />
        <h2 className="text-2xl font-bold mb-2">Generating your project card...</h2>
        <p className="text-muted-foreground font-mono">Synthesizing the conversation into a structured PRD</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8">
      {/* Top area - Voice orb and controls */}
      <div className="flex flex-col items-center mb-8">
        {/* Remix indicator */}
        {remixProject && (
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
              <Sparkles className="h-3 w-3 mr-2" />
              Remixing: {remixProject.projectName}
            </Badge>
          </div>
        )}

        <VoiceOrb
          isActive={status === 'connected'}
          isSpeaking={isSpeaking}
          isListening={status === 'connected' && !isSpeaking}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {status === 'disconnected' && (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleStart} className="font-mono">
                {remixProject ? <Sparkles className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                {remixProject ? 'Start Remixing' : 'Start Talking'}
              </Button>
            </>
          )}

          {status === 'connecting' && (
            <Button disabled className="font-mono">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </Button>
          )}

          {status === 'connected' && (
            <>
              <FileUploadButton
                onFileProcessed={handleFileUploadProcessed}
                disabled={false}
              />
              <Button onClick={handleEnd} variant="destructive" className="font-mono text-sm">
                <Square className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">End & Generate Card</span>
                <span className="sm:hidden">Generate Card</span>
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleStart} className="font-mono">
                <Mic className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </>
          )}
        </div>

        {error && (
          <p className="mt-4 text-destructive text-sm font-mono">{error}</p>
        )}
      </div>

      {/* Conversation transcript with drag-and-drop */}
      <div
        className={cn(
          "flex-1 border-2 p-4 flex flex-col min-h-0 min-w-0 overflow-hidden transition-colors relative",
          isDragging
            ? "border-dashed border-primary bg-primary/5"
            : "border-primary",
          status === 'connected' && "cursor-copy"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Upload className="h-12 w-12" />
              <span className="font-mono text-sm">Drop file to attach</span>
            </div>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessingDrop && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="font-mono text-sm">Processing file...</span>
            </div>
          </div>
        )}

        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Conversation {status === 'connected' && <span className="text-primary/60">(drop files here)</span>}
        </div>
        <ConversationView messages={messages} />
      </div>
    </div>
  );
}
