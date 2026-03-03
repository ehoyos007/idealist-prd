import { ProjectCard } from '@/types/project';
import { ProjectCardFull } from './ProjectCardFull';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProjectDetailViewProps {
  project: ProjectCard;
  onSave: (project: ProjectCard) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  onRemix?: () => void;
  onStartVisionSession?: () => void;
}

export function ProjectDetailView({ project, onSave, onDelete, onBack, onRemix, onStartVisionSession }: ProjectDetailViewProps) {
  const isMobile = useIsMobile();

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8">
      {/* Hide duplicate back button on mobile - header already has one */}
      {!isMobile && (
        <div className="mb-4">
          <Button variant="ghost" onClick={onBack} className="font-mono">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </div>
      )}
      <div className="flex-1 border-2 border-primary p-3 md:p-6 overflow-hidden">
        <ProjectCardFull
          project={project}
          onSave={onSave}
          onDelete={onDelete}
          onBack={onBack}
          onRemix={onRemix}
          onStartVisionSession={onStartVisionSession}
        />
      </div>
    </div>
  );
}
