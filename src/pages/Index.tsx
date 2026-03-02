import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { Header } from '@/components/Header';
import { HomeView } from '@/components/HomeView';
import { SessionView } from '@/components/SessionView';
import { LibraryView } from '@/components/LibraryView';
import { ProjectDetailView } from '@/components/ProjectDetailView';
import { useProjectsStorage } from '@/hooks/useProjectsStorage';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { ProjectCard } from '@/types/project';

type View = 'home' | 'session' | 'library' | 'project';

const Index = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [remixProjectId, setRemixProjectId] = useState<string | null>(null);
  const [resumeSessionId, setResumeSessionId] = useState<string | null>(null);
  const { projects, saveProject, saveDraftProject, deleteProject, getProject } = useProjectsStorage();
  const { pausedSessions, fetchPausedSessions, deleteSession } = useSessionPersistence();

  const handleStartSession = () => {
    setRemixProjectId(null);
    setResumeSessionId(null);
    setCurrentView('session');
  };

  const handleSessionComplete = (project: ProjectCard) => {
    saveProject(project);
    setRemixProjectId(null);
    setResumeSessionId(null);
    setSelectedProjectId(project.id);
    setCurrentView('project');
  };

  const handleSessionCancel = () => {
    setRemixProjectId(null);
    setResumeSessionId(null);
    setCurrentView('home');
  };

  const handleDraftSaved = (projectId: string) => {
    setRemixProjectId(null);
    setResumeSessionId(null);
    setSelectedProjectId(projectId);
    setCurrentView('project');
  };

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setCurrentView('project');
  };

  const handleRemixProject = (id: string) => {
    setRemixProjectId(id);
    setResumeSessionId(null);
    setCurrentView('session');
  };

  const handleResumeDraft = (sessionId: string) => {
    setResumeSessionId(sessionId);
    setRemixProjectId(null);
    setCurrentView('session');
  };

  const handleDeleteDraft = async (sessionId: string) => {
    await deleteSession(sessionId);
  };

  const handleSessionPause = () => {
    setResumeSessionId(null);
    setRemixProjectId(null);
    fetchPausedSessions();
    setCurrentView('library');
  };

  const handleNavigate = (view: 'home' | 'library') => {
    setCurrentView(view);
    if (view === 'home') {
      setSelectedProjectId(null);
    }
    if (view === 'library') {
      fetchPausedSessions();
    }
  };

  const selectedProject = selectedProjectId ? getProject(selectedProjectId) : null;
  const remixProject = remixProjectId ? getProject(remixProjectId) : undefined;

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden w-full">
        <Header currentView={currentView} onNavigate={handleNavigate} />

        <main className="flex-1 flex flex-col">
          {currentView === 'home' && (
            <HomeView
              onStartSession={handleStartSession}
              projectCount={projects.length}
            />
          )}

          {currentView === 'session' && (
            <SessionView
              onComplete={handleSessionComplete}
              onCancel={handleSessionCancel}
              onDraftSaved={handleDraftSaved}
              saveDraftProject={saveDraftProject}
              remixProject={remixProject}
              resumeSessionId={resumeSessionId}
              onPause={handleSessionPause}
            />
          )}

          {currentView === 'library' && (
            <LibraryView
              projects={projects}
              onSelectProject={handleSelectProject}
              pausedSessions={pausedSessions}
              onResumeDraft={handleResumeDraft}
              onDeleteDraft={handleDeleteDraft}
            />
          )}

          {currentView === 'project' && selectedProject && (
            <ProjectDetailView
              project={selectedProject}
              onSave={saveProject}
              onDelete={deleteProject}
              onBack={() => setCurrentView('library')}
              onRemix={() => handleRemixProject(selectedProject.id)}
            />
          )}
        </main>
      </div>
    </ThemeProvider>
  );
};

export default Index;
