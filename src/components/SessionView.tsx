import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceOrb } from './VoiceOrb';
import { ConversationView } from './ConversationView';
import { ChatInput } from './ChatInput';
import { FileUploadButton, processFile } from './FileUploadButton';
import { RepoConnectButton } from './RepoConnectButton';
import { useElevenLabsConversation } from '@/hooks/useElevenLabsConversation';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { invokeFunction } from '@/lib/supabaseHelpers';
import { ProjectCard, UploadedFile, ConnectedRepo } from '@/types/project';
import { Mic, Square, Loader2, Sparkles, Upload, Pause, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SessionViewProps {
  onComplete: (project: ProjectCard) => void;
  onCancel: () => void;
  onDraftSaved?: (projectId: string) => void;
  saveDraftProject?: (id: string, transcript: string) => Promise<void>;
  remixProject?: ProjectCard;
  resumeSessionId?: string | null;
  onPause?: () => void;
  sessionMode?: 'prd' | 'vision';
  visionTargetProject?: ProjectCard;
  onVisionComplete?: (visionMd: string, evalMd: string, visionTranscript: string) => void;
}

export function SessionView({
  onComplete,
  onCancel,
  onDraftSaved,
  saveDraftProject,
  remixProject,
  resumeSessionId,
  onPause,
  sessionMode = 'prd',
  visionTargetProject,
  onVisionComplete,
}: SessionViewProps) {
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
    isResuming,
    startConversation,
    endConversation,
    resumeConversation,
    getTranscript,
    toggleMute,
    sendFileContext,
    sendRepoContext,
    sendTextMessage,
  } = useElevenLabsConversation();

  const { saveSession, loadSession, startAutoSave, stopAutoSave } = useSessionPersistence();

  // B2: Auto-save while connected
  useEffect(() => {
    if (status === 'connected' && sessionId) {
      const visionMeta = sessionMode === 'vision' && visionTargetProject
        ? { sessionMode: 'vision' as const, visionTargetProjectId: visionTargetProject.id, visionTargetProjectName: visionTargetProject.projectName }
        : undefined;
      startAutoSave(() => messages, sessionId, remixProject?.projectName, visionMeta);
    }
    return () => stopAutoSave();
  }, [status, sessionId]);

  // B2: Resume session on mount if resumeSessionId provided
  useEffect(() => {
    if (!resumeSessionId) return;

    (async () => {
      const session = await loadSession(resumeSessionId);
      if (!session) {
        toast({
          title: 'Failed to load draft',
          description: 'Could not find the saved session.',
          variant: 'destructive',
        });
        onCancel();
        return;
      }

      toast({ title: 'Resuming session...', description: 'Reconnecting to voice AI with your previous conversation.' });
      await resumeConversation(session.messages, session.id);
    })();
  }, [resumeSessionId]);

  const handleFileProcessed = async (file: UploadedFile, content: string) => {
    const success = sendFileContext(file, content);
    if (!success) {
      toast({
        title: 'Failed to send file',
        description: 'The connection is not ready. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    if (sessionId) {
      try {
        console.log('Chunking and indexing file:', file.name);
        const { data, error: chunkError } = await invokeFunction('chunk-and-index', {
          text: content,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          sessionId,
        });

        if (chunkError) {
          console.error('Failed to chunk file:', chunkError);
        } else {
          const result = data as { chunkCount?: number } | null;
          console.log(`Indexed ${result?.chunkCount || 0} chunks for ${file.name}`);
          toast({
            title: 'Document indexed',
            description: `${file.name} indexed with ${result?.chunkCount || 0} chunks for smart retrieval`,
          });
        }
      } catch (err) {
        console.error('Error chunking file:', err);
      }
    }
  };

  const handleRepoConnected = (repo: ConnectedRepo) => {
    sendRepoContext(repo);
    toast({
      title: 'Repository connected',
      description: `${repo.repoName} — ${repo.resolvedDepth === 'deep' ? `${repo.chunksCreated} chunks indexed` : 'summary generated'}`,
    });
  };

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (status === 'connected') setIsDragging(true);
    },
    [status]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (status !== 'connected') {
        toast({
          title: 'Not connected',
          description: 'Start a conversation before uploading files.',
          variant: 'destructive',
        });
        return;
      }

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const file = files[0];
      setIsProcessingDrop(true);

      try {
        const result = await processFile(file);
        if (result) {
          await handleFileProcessed(result.file, result.content);
          toast({
            title: 'File attached',
            description: `${file.name} has been added to the conversation`,
          });
        }
      } catch (error) {
        toast({
          title: 'Failed to process file',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setIsProcessingDrop(false);
      }
    },
    [status, sessionId, sendFileContext, toast]
  );

  const handleStart = async () => {
    if (sessionMode === 'vision' && visionTargetProject) {
      await startConversation(visionTargetProject, 'vision');
    } else {
      await startConversation(remixProject, remixProject ? 'remix' : 'prd');
    }
  };

  // B2: Pause session
  const handlePause = async () => {
    const currentSessionId = sessionId;
    endConversation();
    stopAutoSave();

    if (currentSessionId && messages.length > 0) {
      const metadata = sessionMode === 'vision' && visionTargetProject
        ? { sessionMode: 'vision' as const, visionTargetProjectId: visionTargetProject.id, visionTargetProjectName: visionTargetProject.projectName }
        : undefined;
      await saveSession(
        messages,
        'paused',
        currentSessionId,
        remixProject?.projectName,
        metadata
      );
      toast({
        title: 'Session paused',
        description: 'Your draft has been saved. Resume anytime from your library.',
      });
    }

    onPause?.();
  };

  const handleEnd = async () => {
    const transcript = getTranscript();
    const messageCount = messages.filter((m) => m.role !== 'context').length;
    const currentSessionId = sessionId;
    const wordCount = transcript.split(/\s+/).length;

    setIsGenerating(true);
    endConversation();
    stopAutoSave();

    // A7: Improved client-side check with descriptive warning
    if (messageCount < 2) {
      setIsGenerating(false);
      toast({
        title: 'Not enough conversation',
        description: sessionMode === 'vision'
          ? 'Have a longer conversation to generate vision docs.'
          : 'Have a longer conversation to generate a project card.',
        variant: 'destructive',
      });
      onCancel();
      return;
    }

    if (wordCount < 50) {
      toast({
        title: 'Short conversation',
        description: sessionMode === 'vision'
          ? 'Your conversation is brief — the generated vision docs may have gaps marked as "[Needs Discussion]".'
          : 'Your conversation is brief — the generated PRD may have gaps marked as "[Needs Discussion]".',
      });
    }

    // Mark any paused session as completed
    if (resumeSessionId || currentSessionId) {
      await saveSession(messages, 'completed', resumeSessionId || currentSessionId!);
    }

    // Vision mode: synthesize vision docs
    if (sessionMode === 'vision' && visionTargetProject && onVisionComplete) {
      try {
        const { data, error: invokeError } = await invokeFunction('synthesize-vision', {
          transcript,
          projectContext: visionTargetProject,
        });

        if (invokeError) {
          throw new Error(invokeError.message);
        }

        const result = data as { visionMd?: string; evalMd?: string } | null;

        if (!result?.visionMd || !result?.evalMd) {
          throw new Error('No vision documents generated');
        }

        toast({
          title: 'Vision docs generated!',
          description: 'Your conversation has been synthesized into VISION.md and EVAL.md.',
        });

        onVisionComplete(result.visionMd, result.evalMd, transcript);
      } catch (err) {
        console.error('Error generating vision docs:', err);
        toast({
          title: 'Generation failed',
          description: 'Could not generate vision documents. Please try again.',
          variant: 'destructive',
        });
        onCancel();
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // PRD mode: synthesize project card
    const projectId = crypto.randomUUID();

    if (saveDraftProject) {
      await saveDraftProject(projectId, transcript);
    }

    try {
      const { data, error: invokeError } = await invokeFunction('synthesize-project', {
        transcript,
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      const result = data as { projectCard?: ProjectCard } | null;

      if (!result?.projectCard) {
        throw new Error('No project card generated');
      }

      const projectCard: ProjectCard = {
        ...result.projectCard,
        id: projectId,
        transcript,
        remixedFromId: remixProject?.id,
        remixedFromTitle: remixProject?.projectName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (currentSessionId) {
        try {
          await invokeFunction('link-documents-to-project', {
            sessionId: currentSessionId,
            projectId,
          });
          console.log('Documents linked to project');
        } catch (linkErr) {
          console.error('Failed to link documents:', linkErr);
        }
      }

      toast({
        title: 'Project card generated!',
        description: 'Your conversation has been synthesized into a structured PRD.',
      });

      onComplete(projectCard);
    } catch (err) {
      console.error('Error generating project card:', err);
      toast({
        title: 'Generation failed',
        description: 'Your transcript has been saved. You can retry from your library.',
        variant: 'destructive',
      });
      if (onDraftSaved) {
        onDraftSaved(projectId);
      } else {
        onCancel();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    endConversation();
    stopAutoSave();
    onCancel();
  };

  const handleFileUploadProcessed = async (file: UploadedFile, content: string) => {
    await handleFileProcessed(file, content);
  };

  const isVisionMode = sessionMode === 'vision';

  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="h-16 w-16 animate-spin mb-6" />
        <h2 className="text-2xl font-bold mb-2">
          {isVisionMode ? 'Generating your vision docs...' : 'Generating your project card...'}
        </h2>
        <p className="text-muted-foreground font-mono">
          {isVisionMode ? 'Synthesizing the conversation into VISION.md and EVAL.md' : 'Synthesizing the conversation into a structured PRD'}
        </p>
      </div>
    );
  }

  if (isResuming) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="h-16 w-16 animate-spin mb-6" />
        <h2 className="text-2xl font-bold mb-2">Resuming your session...</h2>
        <p className="text-muted-foreground font-mono">Loading your previous conversation and reconnecting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8">
      {/* Top area - Voice orb and controls */}
      <div className="flex flex-col items-center mb-8">
        {/* Session mode indicator */}
        {isVisionMode && visionTargetProject && (
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-sm px-3 py-1 bg-violet-500/10 text-violet-400 border-violet-500/30">
              <Eye className="h-3 w-3 mr-2" />
              Vision Session: {visionTargetProject.projectName}
            </Badge>
          </div>
        )}
        {!isVisionMode && remixProject && (
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
                {isVisionMode ? <Eye className="h-4 w-4 mr-2" /> : remixProject ? <Sparkles className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                {isVisionMode ? 'Start Vision Session' : remixProject ? 'Start Remixing' : 'Start Talking'}
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
              <FileUploadButton onFileProcessed={handleFileUploadProcessed} disabled={false} />
              <RepoConnectButton
                onRepoConnected={handleRepoConnected}
                sessionId={sessionId}
                disabled={false}
              />
              <Button onClick={handlePause} variant="outline" className="font-mono text-sm">
                <Pause className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Pause</span>
              </Button>
              <Button onClick={handleEnd} variant="destructive" className="font-mono text-sm">
                <Square className="h-4 w-4 mr-2" />
                {isVisionMode ? (
                  <>
                    <span className="hidden sm:inline">End & Generate Vision</span>
                    <span className="sm:hidden">Generate Vision</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">End & Generate Card</span>
                    <span className="sm:hidden">Generate Card</span>
                  </>
                )}
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

        {error && <p className="mt-4 text-destructive text-sm font-mono">{error}</p>}
      </div>

      {/* Conversation transcript with drag-and-drop */}
      <div
        className={cn(
          'flex-1 border-2 p-4 flex flex-col min-h-0 min-w-0 overflow-hidden transition-colors relative',
          isDragging ? 'border-dashed border-primary bg-primary/5' : 'border-primary',
          status === 'connected' && 'cursor-copy'
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
          Conversation{' '}
          {status === 'connected' && <span className="text-primary/60">(drop files here)</span>}
        </div>
        <ConversationView messages={messages} />
      </div>

      {/* B1: Text chat input — visible only when connected */}
      {status === 'connected' && (
        <ChatInput onSend={sendTextMessage} />
      )}
    </div>
  );
}
