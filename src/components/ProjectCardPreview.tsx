import { ProjectCard } from '@/types/project';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProjectCardPreviewProps {
  project: ProjectCard;
  onClick?: () => void;
}

export function ProjectCardPreview({ project, onClick }: ProjectCardPreviewProps) {
  const avgScore = Math.round(
    (project.scores.complexity + project.scores.impact + project.scores.urgency + project.scores.confidence) / 4
  );

  const excerpt = project.problemStatement || project.vision;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-2 border-primary"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {project.remixedFromId && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-shrink-0 text-muted-foreground">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-mono text-xs">Remixed from: {project.remixedFromTitle}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <CardTitle className="text-lg font-bold line-clamp-2">{project.projectName}</CardTitle>
          </div>
          <div className="flex-shrink-0 w-10 h-10 border-2 border-primary flex items-center justify-center font-mono font-bold">
            {avgScore}
          </div>
        </div>
        {project.tagline && (
          <p className="text-sm text-muted-foreground">{project.tagline}</p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          {project.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs font-mono">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {excerpt}
        </p>
        <div className="mt-3 flex items-center justify-end text-xs font-mono text-muted-foreground">
          <span>{new Date(project.createdAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
