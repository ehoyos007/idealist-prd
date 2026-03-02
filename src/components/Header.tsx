import { Button } from '@/components/ui/button';
import { Moon, Sun, Lightbulb, Library, ArrowLeft } from 'lucide-react';
import { useTheme } from 'next-themes';

interface HeaderProps {
  currentView: 'home' | 'session' | 'library' | 'project';
  onNavigate: (view: 'home' | 'library') => void;
}

export function Header({ currentView, onNavigate }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="border-b-2 border-primary">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {(currentView === 'session' || currentView === 'project') && (
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
        </div>
      </div>
    </header>
  );
}
