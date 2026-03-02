import { useState, lazy, Suspense } from 'react';
import { ProjectCard } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Pencil, Save, X, Copy, Download, FileText, Film, Trash2, MoreVertical, Sparkles, Files, FolderArchive, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { generatePdf } from '@/lib/generatePdf';
import { generateProjectZip } from '@/lib/generateProjectZip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProjectDocuments } from '@/hooks/useProjectDocuments';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const VideoPreview = lazy(() => import('@/remotion/VideoPreviewWrapper'));

interface ProjectCardFullProps {
  project: ProjectCard;
  onSave: (project: ProjectCard) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  onRemix?: () => void;
}

export function ProjectCardFull({ project, onSave, onDelete, onBack, onRemix }: ProjectCardFullProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState<ProjectCard>(project);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();
  const { theme: appTheme } = useTheme();
  const isMobile = useIsMobile();
  const { documents, isLoading: documentsLoading } = useProjectDocuments(project.id);

  const handleSave = () => {
    onSave(editedProject);
    setIsEditing(false);
    toast({ title: "Project saved", description: "Your changes have been saved." });
  };

  const handleCancel = () => {
    setEditedProject(project);
    setIsEditing(false);
  };

  const isDraft = project.projectName === 'Generating...' && !!project.transcript;

  const handleRetryGeneration = async () => {
    if (!project.transcript) return;
    setIsRetrying(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('synthesize-project', {
        body: { transcript: project.transcript }
      });

      if (invokeError) throw new Error(invokeError.message);
      if (!data?.projectCard) throw new Error('No project card generated');

      const updatedProject: ProjectCard = {
        ...data.projectCard,
        id: project.id,
        transcript: project.transcript,
        remixedFromId: project.remixedFromId,
        remixedFromTitle: project.remixedFromTitle,
        createdAt: project.createdAt,
        updatedAt: new Date().toISOString()
      };

      onSave(updatedProject);
      setEditedProject(updatedProject);
      toast({ title: "Project card generated!", description: "Your conversation has been synthesized into a structured PRD." });
    } catch (err) {
      console.error('Retry generation failed:', err);
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Failed to generate project card. Try again later.",
        variant: "destructive"
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this project?')) {
      onDelete(project.id);
      onBack();
      toast({ title: "Project deleted", description: "The project has been removed." });
    }
    setIsActionsOpen(false);
  };

  const copyToClipboard = () => {
    const markdown = generateMarkdown(editedProject);
    navigator.clipboard.writeText(markdown);
    toast({ title: "Copied!", description: "Project card copied to clipboard as Markdown." });
    setIsActionsOpen(false);
  };

  const downloadMarkdown = () => {
    const markdown = generateMarkdown(editedProject);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editedProject.projectName.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Markdown file downloaded." });
    setIsActionsOpen(false);
  };

  const downloadPdf = () => {
    generatePdf(editedProject as any);
    toast({ title: "PDF Downloaded!", description: "Professional PDF exported successfully." });
    setIsActionsOpen(false);
  };

  const downloadZip = async () => {
    await generateProjectZip(editedProject);
    toast({ title: "Project Kit Downloaded!", description: "ZIP archive exported successfully." });
    setIsActionsOpen(false);
  };

  const generateMarkdown = (p: ProjectCard) => {
    let md = `# ${p.projectName}

**Tagline:** ${p.tagline}

**Tags:** ${p.tags.join(', ')}

## Scores
- Complexity: ${p.scores.complexity}/10
- Impact: ${p.scores.impact}/10
- Urgency: ${p.scores.urgency}/10
- Confidence: ${p.scores.confidence}/10

## Vision
${p.vision}

## Problem Statement
${p.problemStatement}

## Target User
${p.targetUser}

## User Stories
`;

    p.userStories.forEach((story, i) => {
      md += `### Story ${i + 1}
- **Persona:** ${story.persona}
- **Goal:** ${story.goal}
- **Benefit:** ${story.benefit}

`;
    });

    md += `## Core Features
${p.coreFeatures}

## Tech Stack
${p.techStack}

## Architecture
${p.architecture}

## Success Metrics
${p.successMetrics}

## Risks & Open Questions
${p.risksAndOpenQuestions}

## First Sprint Plan
${p.firstSprintPlan}

---
*Generated with Idealist Voice AI on ${new Date(p.createdAt).toLocaleDateString()}*
`;
    return md;
  };

  const ScoreBox = ({ label, value, field }: { label: string; value: number; field: keyof typeof project.scores }) => (
    <div className="border-2 border-primary p-3 text-center">
      <div className="text-2xl font-mono font-bold">{isEditing ? (
        <Input
          type="number"
          min={1}
          max={10}
          value={editedProject.scores[field]}
          onChange={(e) => setEditedProject({
            ...editedProject,
            scores: { ...editedProject.scores, [field]: parseInt(e.target.value) || 0 }
          })}
          className="w-16 text-center font-mono font-bold text-2xl h-auto p-0 border-0"
        />
      ) : value}</div>
      <div className="text-xs font-mono uppercase text-muted-foreground">{label}</div>
    </div>
  );

  const Section = ({ title, content, field }: { title: string; content: string; field: keyof ProjectCard }) => (
    <div className="mb-6">
      <h3 className="font-mono text-sm uppercase tracking-wider text-muted-foreground mb-2">{title}</h3>
      {isEditing ? (
        <Textarea
          value={editedProject[field] as string}
          onChange={(e) => setEditedProject({ ...editedProject, [field]: e.target.value })}
          className="min-h-[100px] font-sans"
        />
      ) : (
        <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words">{content}</p>
      )}
    </div>
  );

  const updateUserStory = (index: number, field: keyof typeof project.userStories[0], value: string) => {
    const updatedStories = [...editedProject.userStories];
    updatedStories[index] = { ...updatedStories[index], [field]: value };
    setEditedProject({ ...editedProject, userStories: updatedStories });
  };

  const ActionButtons = () => (
    <>
      {onRemix && (
        <Button variant="outline" size="icon" onClick={onRemix} title="Remix this project">
          <Sparkles className="h-4 w-4" />
        </Button>
      )}
      <Button variant="outline" size="icon" onClick={() => setIsEditing(true)} title="Edit">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={copyToClipboard} title="Copy as Markdown">
        <Copy className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={downloadMarkdown} title="Download Markdown">
        <Download className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={downloadPdf} title="Download PDF">
        <FileText className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={downloadZip} title="Download Project Kit (.zip)">
        <FolderArchive className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={handleDelete} title="Delete">
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  );

  const MobileActionsSheet = () => (
    <Sheet open={isActionsOpen} onOpenChange={setIsActionsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader>
          <SheetTitle className="font-mono">Actions</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-2 py-4">
          {onRemix && (
            <Button variant="outline" className="w-full justify-start" onClick={() => { onRemix(); setIsActionsOpen(false); }}>
              <Sparkles className="h-4 w-4 mr-3" />
              Remix Project
            </Button>
          )}
          <Button variant="outline" className="w-full justify-start" onClick={() => { setIsEditing(true); setIsActionsOpen(false); }}>
            <Pencil className="h-4 w-4 mr-3" />
            Edit Project
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-3" />
            Copy as Markdown
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={downloadMarkdown}>
            <Download className="h-4 w-4 mr-3" />
            Download Markdown
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={downloadPdf}>
            <FileText className="h-4 w-4 mr-3" />
            Download PDF
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={downloadZip}>
            <FolderArchive className="h-4 w-4 mr-3" />
            Download Project Kit
          </Button>
          <Button variant="destructive" className="w-full justify-start" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-3" />
            Delete Project
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Draft banner */}
      {isDraft && (
        <div className="mb-4 border-2 border-yellow-500/50 bg-yellow-500/10 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-sm font-bold">Draft — Generation incomplete</p>
            <p className="text-sm text-muted-foreground">Your transcript was saved. Retry to generate the full project card.</p>
          </div>
          <Button onClick={handleRetryGeneration} disabled={isRetrying} className="font-mono flex-shrink-0">
            {isRetrying ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" />Retry Generation</>
            )}
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <>
              <Input
                value={editedProject.projectName}
                onChange={(e) => setEditedProject({ ...editedProject, projectName: e.target.value })}
                className="text-xl md:text-2xl font-bold h-auto py-2 mb-2"
                placeholder="Project Name"
              />
              <Input
                value={editedProject.tagline}
                onChange={(e) => setEditedProject({ ...editedProject, tagline: e.target.value })}
                className="text-sm text-muted-foreground h-auto py-1"
                placeholder="Tagline"
              />
            </>
          ) : (
            <>
              <h1 className="text-xl md:text-2xl font-bold truncate">{editedProject.projectName}</h1>
              {editedProject.tagline && (
                <p className="text-sm text-muted-foreground mt-1">{editedProject.tagline}</p>
              )}
            </>
          )}
          <div className="flex flex-wrap gap-1 mt-2">
            {editedProject.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="font-mono text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {isEditing ? (
            <>
              <Button variant="outline" size="icon" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="icon" onClick={handleSave}>
                <Save className="h-4 w-4" />
              </Button>
            </>
          ) : (
            isMobile ? <MobileActionsSheet /> : <ActionButtons />
          )}
        </div>
      </div>

      {/* Scores - responsive 2x2 on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6">
        <ScoreBox label="Complexity" value={editedProject.scores.complexity} field="complexity" />
        <ScoreBox label="Impact" value={editedProject.scores.impact} field="impact" />
        <ScoreBox label="Urgency" value={editedProject.scores.urgency} field="urgency" />
        <ScoreBox label="Confidence" value={editedProject.scores.confidence} field="confidence" />
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="document" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mb-4 w-fit">
          <TabsTrigger value="document" className="font-mono text-xs uppercase tracking-wider">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Document
          </TabsTrigger>
          <TabsTrigger value="video" className="font-mono text-xs uppercase tracking-wider">
            <Film className="h-3.5 w-3.5 mr-1.5" />
            Video Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="document" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <Section title="Vision" content={editedProject.vision} field="vision" />
            <Section title="Problem Statement" content={editedProject.problemStatement} field="problemStatement" />
            <Section title="Target User" content={editedProject.targetUser} field="targetUser" />

            {/* User Stories */}
            <div className="mb-6">
              <h3 className="font-mono text-sm uppercase tracking-wider text-muted-foreground mb-2">User Stories</h3>
              <div className="grid grid-cols-1 gap-4">
                {editedProject.userStories.map((story, index) => (
                  <div key={index} className="border-2 border-primary p-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs font-mono uppercase text-muted-foreground mb-1">Persona</div>
                          <Input
                            value={story.persona}
                            onChange={(e) => updateUserStory(index, 'persona', e.target.value)}
                            className="h-auto py-1"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-mono uppercase text-muted-foreground mb-1">Goal</div>
                          <Input
                            value={story.goal}
                            onChange={(e) => updateUserStory(index, 'goal', e.target.value)}
                            className="h-auto py-1"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-mono uppercase text-muted-foreground mb-1">Benefit</div>
                          <Input
                            value={story.benefit}
                            onChange={(e) => updateUserStory(index, 'benefit', e.target.value)}
                            className="h-auto py-1"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-mono uppercase text-muted-foreground">As a </span>
                          <span className="font-medium">{story.persona}</span>
                        </div>
                        <div>
                          <span className="text-xs font-mono uppercase text-muted-foreground">I want to </span>
                          <span className="font-medium">{story.goal}</span>
                        </div>
                        <div>
                          <span className="text-xs font-mono uppercase text-muted-foreground">So that </span>
                          <span className="font-medium">{story.benefit}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Section title="Core Features" content={editedProject.coreFeatures} field="coreFeatures" />
            <Section title="Tech Stack" content={editedProject.techStack} field="techStack" />
            <Section title="Architecture" content={editedProject.architecture} field="architecture" />
            <Section title="Success Metrics" content={editedProject.successMetrics} field="successMetrics" />
            <Section title="Risks & Open Questions" content={editedProject.risksAndOpenQuestions} field="risksAndOpenQuestions" />
            <Section title="First Sprint Plan" content={editedProject.firstSprintPlan} field="firstSprintPlan" />

            {/* Attached Documents */}
            {documents.length > 0 && (
              <div className="mb-6">
                <h3 className="font-mono text-sm uppercase tracking-wider text-muted-foreground mb-2">
                  <Files className="h-4 w-4 inline mr-2" />
                  Attached Documents ({documents.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border-2 border-primary p-3 flex items-center gap-3">
                      <FileText className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{doc.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.chunkCount} indexed sections
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editedProject.transcript && (
              <div className="mb-6">
                <h3 className="font-mono text-sm uppercase tracking-wider text-muted-foreground mb-2">Conversation Transcript</h3>
                <div className="border-2 border-primary p-4 bg-secondary max-h-48 overflow-y-auto overflow-x-hidden">
                  <pre className="text-sm font-mono whitespace-pre-wrap break-words text-muted-foreground">{editedProject.transcript}</pre>
                </div>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="video" className="flex-1 mt-0">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64 border-2 border-primary">
                <p className="font-mono text-sm text-muted-foreground">Loading video preview...</p>
              </div>
            }
          >
            <VideoPreview
              project={editedProject}
              theme={(appTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark'}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
