import { Button } from '@/components/ui/button';
import { Moon, Sun, Lightbulb, Library, ArrowLeft, Settings, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  currentView: 'home' | 'session' | 'library' | 'project' | 'settings';
  onNavigate: (view: 'home' | 'library' | 'settings') => void;
  user?: {
    avatarUrl?: string;
    displayName?: string;
    githubUsername?: string;
  } | null;
  onSignOut?: () => void;
}

export function Header({ currentView, onNavigate, user, onSignOut }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="border-b-2 border-primary">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {(currentView === 'session' || currentView === 'project' || currentView === 'settings') && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate(currentView === 'project' ? 'library' : 'home')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Lightbulb className="h-6 w-6" />
            <span className="font-mono font-bold text-xl tracking-tight">IDEALIST</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={currentView === 'library' ? 'default' : 'ghost'}
            onClick={() => onNavigate('library')}
            className="font-mono"
          >
            <Library className="h-4 w-4 mr-2" />
            Library
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full overflow-hidden">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName || 'User'}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-mono text-sm">
                      {(user.displayName || '?')[0].toUpperCase()}
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="font-mono">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  @{user.githubUsername}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigate('settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
