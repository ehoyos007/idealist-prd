import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { Header } from '@/components/Header';
import { HomeView } from '@/components/HomeView';
import { SessionView } from '@/components/SessionView';
import { LibraryView } from '@/components/LibraryView';
import { ProjectDetailView } from '@/components/ProjectDetailView';
import { AuthGate } from '@/components/AuthGate';
import { useAuth } from '@/hooks/useAuth';
import { useProjectsStorage } from '@/hooks/useProjectsStorage';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { SettingsView } from '@/components/SettingsView';
import { ProjectCard } from '@/types/project';

type View = 'home' | 'session' | 'library' | 'project' | 'settings';

const Index = () => {
  const { user, profile, isLoading, isAllowed, signInWithGitHub, signOut, updateProfile } = useAuth();
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [remixProjectId, setRemixProjectId] = useState<string | null>(null);
  const [resumeSessionId, setResumeSessionId] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<'prd' | 'vision'>('prd');
  const [visionTargetProjectId, setVisionTargetProjectId] = useState<string | null>(null);
  const { projects, saveProject, saveDraftProject, deleteProject, getProject } = useProjectsStorage(user?.id);
  const { pausedSessions, fetchPausedSessions, deleteSession } = useSessionPersistence(user?.id);

  const handleStartSession = () => {
    setRemixProjectId(null);
    setResumeSessionId(null);
    setSessionMode('prd');
    setVisionTargetProjectId(null);
    setCurrentView('session');
  };

  const handleSessionComplete = (project: ProjectCard) => {
    saveProject(project);
    setRemixProjectId(null);
    setResumeSessionId(null);
    setSessionMode('prd');
    setVisionTargetProjectId(null);
    setSelectedProjectId(project.id);
    setCurrentView('project');
  };

  const handleSessionCancel = () => {
    setRemixProjectId(null);
    setResumeSessionId(null);
    setSessionMode('prd');
    setVisionTargetProjectId(null);
    setCurrentView('home');
  };

  const handleDraftSaved = (projectId: string) => {
    setRemixProjectId(null);
    setResumeSessionId(null);
    setSessionMode('prd');
    setVisionTargetProjectId(null);
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
    setSessionMode('prd');
    setVisionTargetProjectId(null);
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
    setSessionMode('prd');
    setVisionTargetProjectId(null);
    fetchPausedSessions();
    setCurrentView('library');
  };

  const handleStartVisionSession = (projectId: string) => {
    setVisionTargetProjectId(projectId);
    setSessionMode('vision');
    setRemixProjectId(null);
    setResumeSessionId(null);
    setCurrentView('session');
  };

  const handleVisionComplete = (visionMd: string, evalMd: string, visionTranscript: string) => {
    if (visionTargetProjectId) {
      const project = getProject(visionTargetProjectId);
      if (project) {
        const updatedProject: ProjectCard = {
          ...project,
          visionMd,
          evalMd,
          visionTranscript,
          updatedAt: new Date().toISOString(),
        };
        saveProject(updatedProject);
      }
      setSelectedProjectId(visionTargetProjectId);
    }
    setSessionMode('prd');
    setVisionTargetProjectId(null);
    setCurrentView('project');
  };

  const handleNavigate = (view: 'home' | 'library' | 'settings') => {
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
  const visionTargetProject = visionTargetProjectId ? getProject(visionTargetProjectId) : undefined;

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthGate
        user={user}
        isLoading={isLoading}
        isAllowed={isAllowed}
        onSignIn={signInWithGitHub}
        onSignOut={signOut}
      >
        <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden w-full">
          <Header
            currentView={currentView}
            onNavigate={handleNavigate}
            user={profile ? {
              avatarUrl: profile.github_avatar_url || undefined,
              displayName: profile.display_name || undefined,
              githubUsername: profile.github_username,
            } : undefined}
            onSignOut={signOut}
          />

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
                sessionMode={sessionMode}
                visionTargetProject={visionTargetProject}
                onVisionComplete={handleVisionComplete}
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
                onStartVisionSession={() => handleStartVisionSession(selectedProject.id)}
              />
            )}

            {currentView === 'settings' && (
              <SettingsView
                profile={profile}
                onUpdateProfile={updateProfile}
                onSignOut={signOut}
              />
            )}
          </main>
        </div>
      </AuthGate>
    </ThemeProvider>
  );
};

export default Index;
