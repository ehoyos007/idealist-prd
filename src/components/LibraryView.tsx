import { useState, useMemo } from 'react';
import { ProjectCard } from '@/types/project';
import { SavedSession } from '@/hooks/useSessionPersistence';
import { ProjectCardPreview } from './ProjectCardPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, List, Search, Play, Trash2, Clock, MessageSquare, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LibraryViewProps {
  projects: ProjectCard[];
  onSelectProject: (id: string) => void;
  pausedSessions?: SavedSession[];
  onResumeDraft?: (sessionId: string) => void;
  onDeleteDraft?: (sessionId: string) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function DraftCard({
  session,
  onResume,
  onDelete,
}: {
  session: SavedSession;
  onResume: () => void;
  onDelete: () => void;
}) {
  const messageCount = session.messages.filter((m) => m.role !== 'context').length;
  const wordCount = session.transcript?.split(/\s+/).length || 0;
  const remixName = session.metadata?.remixSourceName as string | undefined;
  const isVisionDraft = session.metadata?.sessionMode === 'vision';
  const visionProjectName = session.metadata?.visionTargetProjectName as string | undefined;

  return (
    <div className={cn(
      "border-2 border-dashed p-4 flex flex-col gap-3",
      isVisionDraft ? "border-violet-500/50" : "border-primary/50"
    )}>
      <div className="flex items-center gap-2">
        {isVisionDraft ? (
          <Badge variant="secondary" className="font-mono text-xs bg-violet-500/10 text-violet-400 border-violet-500/30">
            <Eye className="h-3 w-3 mr-1" />
            Vision
          </Badge>
        ) : (
          <Badge variant="secondary" className="font-mono text-xs">
            Draft
          </Badge>
        )}
        {isVisionDraft && visionProjectName && (
          <span className="text-xs text-muted-foreground font-mono truncate">
            for {visionProjectName}
          </span>
        )}
        {!isVisionDraft && remixName && (
          <span className="text-xs text-muted-foreground font-mono truncate">
            Remix of {remixName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {messageCount} messages
        </span>
        <span>{wordCount} words</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeAgo(session.pausedAt || session.updatedAt)}
        </span>
      </div>

      {/* Preview of last message */}
      {session.messages.length > 0 && (
        <p className="text-sm text-foreground/70 line-clamp-2">
          {session.messages.filter((m) => m.role !== 'context').slice(-1)[0]?.content}
        </p>
      )}

      <div className="flex gap-2 mt-1">
        <Button onClick={onResume} size="sm" className="font-mono text-xs">
          <Play className="h-3 w-3 mr-1" />
          Resume
        </Button>
        <Button onClick={onDelete} size="sm" variant="ghost" className="font-mono text-xs text-muted-foreground">
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
}

export function LibraryView({
  projects,
  onSelectProject,
  pausedSessions = [],
  onResumeDraft,
  onDeleteDraft,
}: LibraryViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;

    const query = searchQuery.toLowerCase();
    return projects.filter(project =>
      project.projectName.toLowerCase().includes(query) ||
      project.tagline.toLowerCase().includes(query) ||
      project.tags.some(tag => tag.toLowerCase().includes(query)) ||
      project.problemStatement.toLowerCase().includes(query) ||
      project.targetUser.toLowerCase().includes(query) ||
      project.techStack.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  if (projects.length === 0 && pausedSessions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Your library is empty</h2>
          <p className="text-muted-foreground font-mono">
            Start a session to create your first project card.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8">
      {/* Draft Sessions */}
      {pausedSessions.length > 0 && (
        <div className="mb-8">
          <h3 className="font-mono text-sm uppercase tracking-wider text-muted-foreground mb-4">
            Draft Sessions ({pausedSessions.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pausedSessions.map((session) => (
              <DraftCard
                key={session.id}
                session={session}
                onResume={() => onResumeDraft?.(session.id)}
                onDelete={() => onDeleteDraft?.(session.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 font-mono"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 font-mono text-sm text-muted-foreground">
        {filteredProjects.length} project{filteredProjects.length === 1 ? '' : 's'}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Projects grid/list */}
      {filteredProjects.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground font-mono">No projects match your search.</p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'flex flex-col gap-4'
        }>
          {filteredProjects.map(project => (
            <ProjectCardPreview
              key={project.id}
              project={project}
              onClick={() => onSelectProject(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
