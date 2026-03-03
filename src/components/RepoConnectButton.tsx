import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Github, Loader2, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { invokeFunction } from '@/lib/supabaseHelpers';
import { ConnectedRepo, RepoDepth, RepoFetchResult } from '@/types/project';

interface RepoConnectButtonProps {
  onRepoConnected: (repo: ConnectedRepo) => void;
  sessionId: string | null;
  disabled?: boolean;
}

function parseRepoUrl(input: string): string | null {
  const shorthand = input.match(/^([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)$/);
  if (shorthand) return shorthand[1];

  const url = input.match(/github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/);
  if (url) return url[1];

  return null;
}

export function RepoConnectButton({ onRepoConnected, sessionId, disabled }: RepoConnectButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [repoInput, setRepoInput] = useState('');
  const [depth, setDepth] = useState<RepoDepth>('auto');
  const [userContext, setUserContext] = useState('');
  const [repo, setRepo] = useState<ConnectedRepo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const resetState = () => {
    setRepoInput('');
    setDepth('auto');
    setUserContext('');
    setRepo(null);
    setIsConnecting(false);
  };

  const handleConnect = async () => {
    const parsed = parseRepoUrl(repoInput.trim());
    if (!parsed) {
      toast({
        title: 'Invalid repository',
        description: 'Enter a valid owner/repo or GitHub URL.',
        variant: 'destructive',
      });
      return;
    }

    setIsConnecting(true);

    const connectedRepo: ConnectedRepo = {
      repoName: parsed,
      repoUrl: `https://github.com/${parsed}`,
      status: 'fetching',
      depth,
    };
    setRepo(connectedRepo);

    try {
      // Update status to fetching
      setRepo((prev) => prev ? { ...prev, status: 'fetching' } : prev);

      const { data, error } = await invokeFunction<RepoFetchResult>('fetch-github-repo', {
        repoUrl: parsed,
        sessionId,
        depth,
        userContext: userContext.trim() || undefined,
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = data;
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to fetch repository');
      }

      const finalRepo: ConnectedRepo = {
        ...connectedRepo,
        status: 'ready',
        summary: result.summary,
        filesProcessed: result.filesProcessed,
        chunksCreated: result.chunksCreated,
        tree: result.tree,
        resolvedDepth: result.resolvedDepth,
      };
      setRepo(finalRepo);

      // Brief delay to show success state before closing
      setTimeout(() => {
        onRepoConnected(finalRepo);
        setOpen(false);
        resetState();
      }, 1200);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setRepo((prev) =>
        prev ? { ...prev, status: 'error', error: errorMessage } : prev
      );
      setIsConnecting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetState();
  };

  const depthOptions: { value: RepoDepth; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'summary', label: 'Summary' },
    { value: 'deep', label: 'Deep' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-mono" disabled={disabled}>
          <Github className="h-4 w-4 mr-2" />
          GitHub
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">Connect GitHub Repository</DialogTitle>
        </DialogHeader>

        {/* Status display when connecting/connected */}
        {repo && repo.status !== 'error' && repo.status !== 'ready' && (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="font-mono text-sm">
              {repo.status === 'fetching' && 'Fetching repository...'}
              {repo.status === 'analyzing' && 'Analyzing codebase...'}
              {repo.status === 'indexing' && 'Indexing code chunks...'}
            </span>
          </div>
        )}

        {repo && repo.status === 'ready' && (
          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span className="font-mono text-sm">Repository connected!</span>
            </div>
            {repo.summary && (
              <p className="text-sm text-muted-foreground line-clamp-3">{repo.summary}</p>
            )}
          </div>
        )}

        {repo && repo.status === 'error' && (
          <div className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="font-mono text-sm text-destructive">{repo.error}</span>
          </div>
        )}

        {/* Input form — hidden while in-progress or success */}
        {(!repo || repo.status === 'error') && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="repo-url" className="font-mono text-xs">
                Repository
              </Label>
              <Input
                id="repo-url"
                placeholder="owner/repo or GitHub URL"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs">Depth</Label>
              <div className="flex gap-2">
                {depthOptions.map((opt) => (
                  <Badge
                    key={opt.value}
                    variant={depth === opt.value ? 'default' : 'outline'}
                    className="cursor-pointer font-mono text-xs px-3 py-1"
                    onClick={() => setDepth(opt.value)}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repo-context" className="font-mono text-xs">
                Why are you connecting this repo? (optional)
              </Label>
              <Textarea
                id="repo-context"
                placeholder="e.g. This is my backend API — I want to discuss the auth flow"
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                className="font-mono text-sm resize-none"
                rows={2}
              />
            </div>

            <Button
              onClick={handleConnect}
              className="w-full font-mono"
              disabled={!repoInput.trim() || isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Github className="h-4 w-4 mr-2" />
              )}
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
