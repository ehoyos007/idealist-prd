import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Github,
  Database,
  FolderGit2,
  LogOut,
  Check,
  Loader2,
  RefreshCw,
  Link as LinkIcon,
  Trash2,
  UserPlus,
  Lock,
  Globe,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGitHubRepos } from '@/hooks/useGitHubRepos';
import { useSupabaseProjects } from '@/hooks/useSupabaseProjects';
import { invokeFunction } from '@/lib/supabaseHelpers';
import { supabase } from '@/integrations/supabase/client';
import { IdealistProfile } from '@/hooks/useAuth';

interface SettingsViewProps {
  profile: IdealistProfile | null;
  onUpdateProfile: (updates: Partial<Pick<IdealistProfile, 'supabase_management_token'>>) => Promise<void>;
  onSignOut: () => void;
}

export function SettingsView({ profile, onUpdateProfile, onSignOut }: SettingsViewProps) {
  const { toast } = useToast();

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-8 font-mono">Settings</h1>

      <Tabs defaultValue="github">
        <TabsList className="font-mono mb-6">
          <TabsTrigger value="github" className="gap-2">
            <Github className="h-4 w-4" />
            GitHub
          </TabsTrigger>
          <TabsTrigger value="supabase" className="gap-2">
            <Database className="h-4 w-4" />
            Supabase
          </TabsTrigger>
          <TabsTrigger value="repos" className="gap-2">
            <FolderGit2 className="h-4 w-4" />
            Repositories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="github">
          <GitHubTab profile={profile} onSignOut={onSignOut} />
        </TabsContent>

        <TabsContent value="supabase">
          <SupabaseTab profile={profile} onUpdateProfile={onUpdateProfile} />
        </TabsContent>

        <TabsContent value="repos">
          <ReposTab userId={profile?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── GitHub Tab ───

function GitHubTab({ profile, onSignOut }: { profile: IdealistProfile | null; onSignOut: () => void }) {
  const { toast } = useToast();
  const [inviteUsername, setInviteUsername] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;
    setIsInviting(true);

    // Use service role via edge function to insert into allowlist
    const { error } = await invokeFunction('check-allowlist', {
      action: 'invite',
      username: inviteUsername.trim(),
    });

    // For now, insert directly (will be blocked by RLS if not service role)
    // This would need a dedicated edge function for invites
    const { error: insertError } = await supabase
      .from('idealist_allowed_users')
      .insert({ github_username: inviteUsername.trim(), invited_by: profile?.id });

    if (insertError) {
      toast({ title: 'Failed to invite user', description: insertError.message, variant: 'destructive' });
    } else {
      toast({ title: 'User invited', description: `@${inviteUsername} can now sign in.` });
      setInviteUsername('');
    }
    setIsInviting(false);
  };

  return (
    <div className="space-y-6">
      <div className="border-2 border-primary p-6">
        <div className="flex items-center gap-4 mb-4">
          {profile?.github_avatar_url ? (
            <img src={profile.github_avatar_url} alt="" className="h-16 w-16 rounded-full" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-mono text-2xl">
              {(profile?.display_name || '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-mono font-bold text-lg">{profile?.display_name}</p>
            <p className="font-mono text-sm text-muted-foreground">@{profile?.github_username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="font-mono text-xs">
            <Check className="h-3 w-3 mr-1" />
            Connected
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">repo</Badge>
          <Badge variant="outline" className="font-mono text-xs">read:user</Badge>
        </div>
        <Button variant="outline" onClick={onSignOut} className="font-mono">
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>

      <div className="border-2 border-primary p-6">
        <h3 className="font-mono font-bold mb-4">
          <UserPlus className="h-4 w-4 inline mr-2" />
          Invite User
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder="GitHub username"
            value={inviteUsername}
            onChange={(e) => setInviteUsername(e.target.value)}
            className="font-mono"
          />
          <Button onClick={handleInvite} disabled={!inviteUsername.trim() || isInviting} className="font-mono">
            {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invite'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Supabase Tab ───

function SupabaseTab({
  profile,
  onUpdateProfile,
}: {
  profile: IdealistProfile | null;
  onUpdateProfile: (updates: Partial<Pick<IdealistProfile, 'supabase_management_token'>>) => Promise<void>;
}) {
  const { toast } = useToast();
  const [token, setToken] = useState(profile?.supabase_management_token || '');
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { links } = useSupabaseProjects(profile?.id);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateProfile({ supabase_management_token: token });
      toast({ title: 'Token saved' });
    } catch {
      toast({ title: 'Failed to save token', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const handleTest = async () => {
    if (!token) return;
    setIsTesting(true);
    setTestStatus('idle');

    try {
      const res = await fetch('https://api.supabase.com/v1/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTestStatus('success');
        toast({ title: 'Connection successful' });
      } else {
        setTestStatus('error');
        toast({ title: 'Connection failed', description: `Status ${res.status}`, variant: 'destructive' });
      }
    } catch {
      setTestStatus('error');
      toast({ title: 'Connection failed', variant: 'destructive' });
    }
    setIsTesting(false);
  };

  return (
    <div className="space-y-6">
      <div className="border-2 border-primary p-6">
        <h3 className="font-mono font-bold mb-4">Management API Token</h3>
        <p className="text-sm text-muted-foreground font-mono mb-4">
          Generate a token at{' '}
          <a
            href="https://supabase.com/dashboard/account/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-foreground"
          >
            supabase.com/dashboard/account/tokens
          </a>
        </p>
        <div className="space-y-3">
          <div className="relative">
            <Input
              type={showToken ? 'text' : 'password'}
              placeholder="sbp_..."
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setTestStatus('idle');
              }}
              className="font-mono pr-10"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving} className="font-mono">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={!token || isTesting} className="font-mono">
              {isTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Test Connection
            </Button>
            {testStatus === 'success' && <Badge className="font-mono"><Check className="h-3 w-3 mr-1" />Connected</Badge>}
            {testStatus === 'error' && <Badge variant="destructive" className="font-mono">Failed</Badge>}
          </div>
        </div>
      </div>

      {links.length > 0 && (
        <div className="border-2 border-primary p-6">
          <h3 className="font-mono font-bold mb-4">Linked Projects</h3>
          <div className="space-y-3">
            {links.map((link) => (
              <div key={link.id} className="flex items-center justify-between border border-muted p-3">
                <div>
                  <p className="font-mono text-sm font-bold">{link.repo_name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {link.supabase_project_ref}
                    {link.auto_detected && <Badge variant="outline" className="ml-2 text-xs">auto-detected</Badge>}
                  </p>
                  {link.last_synced_at && (
                    <p className="font-mono text-xs text-muted-foreground">
                      Last synced: {new Date(link.last_synced_at).toLocaleDateString()} — {link.schema_chunks_count} chunks
                    </p>
                  )}
                </div>
                <Button variant="outline" size="icon" title="Refresh schema">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Repos Tab ───

function ReposTab({ userId }: { userId?: string }) {
  const { repos, isLoading, search, setSearch, error } = useGitHubRepos();
  const { links, addLink, removeLink } = useSupabaseProjects(userId);
  const { toast } = useToast();
  const [linkDialogRepo, setLinkDialogRepo] = useState<string | null>(null);
  const [supabaseRef, setSupabaseRef] = useState('');

  const handleLink = async () => {
    if (!linkDialogRepo || !supabaseRef.trim()) return;
    try {
      await addLink(linkDialogRepo, supabaseRef.trim());
      toast({ title: 'Project linked', description: `${linkDialogRepo} → ${supabaseRef}` });
      setLinkDialogRepo(null);
      setSupabaseRef('');
    } catch {
      toast({ title: 'Failed to link project', variant: 'destructive' });
    }
  };

  const getLinkedProject = (repoName: string) => links.find((l) => l.repo_name === repoName);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search your repositories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="font-mono"
      />

      {error && <p className="text-sm text-destructive font-mono">{error}</p>}

      {isLoading && repos.length === 0 && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="space-y-2">
        {repos.map((repo) => {
          const linked = getLinkedProject(repo.fullName);

          return (
            <div key={repo.fullName} className="border-2 border-primary p-4 flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {repo.isPrivate ? <Lock className="h-3 w-3 text-muted-foreground shrink-0" /> : <Globe className="h-3 w-3 text-muted-foreground shrink-0" />}
                  <span className="font-mono text-sm font-bold truncate">{repo.fullName}</span>
                  {repo.language && <Badge variant="outline" className="font-mono text-xs shrink-0">{repo.language}</Badge>}
                </div>
                {repo.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{repo.description}</p>
                )}
                {linked && (
                  <div className="flex items-center gap-1 mt-1">
                    <Database className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground">
                      Linked to {linked.supabase_project_ref}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {linked ? (
                  <Button variant="ghost" size="icon" onClick={() => removeLink(linked.id)} title="Unlink">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Dialog open={linkDialogRepo === repo.fullName} onOpenChange={(open) => {
                    setLinkDialogRepo(open ? repo.fullName : null);
                    if (!open) setSupabaseRef('');
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="font-mono text-xs">
                        <LinkIcon className="h-3 w-3 mr-1" />
                        Link Supabase
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader>
                        <DialogTitle className="font-mono text-sm">Link Supabase Project</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="font-mono text-xs">Repository</Label>
                          <p className="font-mono text-sm font-bold">{repo.fullName}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="font-mono text-xs">Supabase Project Ref</Label>
                          <Input
                            placeholder="e.g. cbeurhcgvqptclggkbhb"
                            value={supabaseRef}
                            onChange={(e) => setSupabaseRef(e.target.value)}
                            className="font-mono"
                          />
                          <p className="text-xs text-muted-foreground font-mono">
                            Found in your Supabase project URL: https://[ref].supabase.co
                          </p>
                        </div>
                        <Button onClick={handleLink} disabled={!supabaseRef.trim()} className="w-full font-mono">
                          Link Project
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
