import { useState, useMemo } from 'react';
import { ProjectCard } from '@/types/project';
import { ProjectCardPreview } from './ProjectCardPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutGrid, List, Search } from 'lucide-react';

interface LibraryViewProps {
  projects: ProjectCard[];
  onSelectProject: (id: string) => void;
}

export function LibraryView({ projects, onSelectProject }: LibraryViewProps) {
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

  if (projects.length === 0) {
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
