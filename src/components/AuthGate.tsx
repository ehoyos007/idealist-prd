import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, Github, Loader2, ShieldX } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface AuthGateProps {
  user: User | null;
  isLoading: boolean;
  isAllowed: boolean | null;
  onSignIn: () => void;
  onSignOut: () => void;
  children: ReactNode;
}

export function AuthGate({ user, isLoading, isAllowed, onSignIn, onSignOut, children }: AuthGateProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="border-2 border-primary p-8 max-w-md w-full">
          <div className="flex items-center gap-2 mb-6">
            <Lightbulb className="h-6 w-6" />
            <span className="font-mono font-bold text-xl tracking-tight">IDEALIST</span>
          </div>
          <p className="font-mono text-sm text-muted-foreground mb-8">
            Voice-first PRD generation. Sign in with GitHub to get started.
          </p>
          <Button onClick={onSignIn} className="w-full font-mono">
            <Github className="h-4 w-4 mr-2" />
            Sign in with GitHub
          </Button>
        </div>
      </div>
    );
  }

  // Logged in but not on allowlist
  if (isAllowed === false) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="border-2 border-primary p-8 max-w-md w-full">
          <div className="flex items-center gap-2 mb-6">
            <ShieldX className="h-6 w-6 text-destructive" />
            <span className="font-mono font-bold text-xl tracking-tight">Access Denied</span>
          </div>
          <p className="font-mono text-sm text-muted-foreground mb-4">
            Your GitHub account <span className="font-bold text-foreground">@{user.user_metadata?.user_name}</span> is not on the allowlist.
          </p>
          <p className="font-mono text-xs text-muted-foreground mb-8">
            Ask the project owner to invite you.
          </p>
          <Button onClick={onSignOut} variant="outline" className="w-full font-mono">
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  // Allowed — still checking
  if (isAllowed === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Authenticated and allowed
  return <>{children}</>;
}
