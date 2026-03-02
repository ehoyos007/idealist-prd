import { Button } from '@/components/ui/button';
import { Mic, Sparkles } from 'lucide-react';

interface HomeViewProps {
  onStartSession: () => void;
  projectCount: number;
}

export function HomeView({ onStartSession, projectCount }: HomeViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-x-hidden">
      <div className="text-center max-w-2xl mx-auto px-2 break-words">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
          Turn ideas into
          <br />
          <span className="inline-flex items-center gap-2">
            actionable project plans
            <Sparkles className="h-8 w-8 md:h-12 md:w-12" />
          </span>
        </h1>

        <p className="text-lg text-muted-foreground mb-12 font-mono">
          Speak your raw product ideas. Brainstorm with AI.
          <br />
          Get structured PRDs ready to build from.
        </p>

        <Button
          size="lg"
          onClick={onStartSession}
          className="h-16 sm:h-20 px-6 sm:px-12 text-lg sm:text-xl font-mono shadow-md hover:shadow-lg transition-shadow"
        >
          <Mic className="h-6 w-6 mr-3" />
          Start Project Session
        </Button>

        <p className="mt-8 text-sm text-muted-foreground font-mono">
          {projectCount > 0
            ? `${projectCount} project${projectCount === 1 ? '' : 's'} in your library`
            : 'No projects yet — start your first session!'
          }
        </p>
      </div>

      {/* Feature highlights */}
      <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl w-full px-2">
        <div className="border-2 border-primary p-6">
          <div className="font-mono text-sm uppercase tracking-wider text-muted-foreground mb-2">01</div>
          <h3 className="font-bold text-lg mb-2">Brainstorm Freely</h3>
          <p className="text-sm text-muted-foreground">
            Talk about your product idea naturally. AI asks targeted questions to flesh out your PRD.
          </p>
        </div>
        <div className="border-2 border-primary p-6">
          <div className="font-mono text-sm uppercase tracking-wider text-muted-foreground mb-2">02</div>
          <h3 className="font-bold text-lg mb-2">Get a PRD</h3>
          <p className="text-sm text-muted-foreground">
            Your conversation becomes a structured project card with features, architecture, and a sprint plan.
          </p>
        </div>
        <div className="border-2 border-primary p-6">
          <div className="font-mono text-sm uppercase tracking-wider text-muted-foreground mb-2">03</div>
          <h3 className="font-bold text-lg mb-2">Start Building</h3>
          <p className="text-sm text-muted-foreground">
            Download a project starter kit with CONTEXT.md, TASKS.md, PLAN.md, and CLAUDE.md — ready to code.
          </p>
        </div>
      </div>
    </div>
  );
}
