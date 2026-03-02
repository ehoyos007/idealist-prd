import type { ProjectCard, Scores, UserStory } from '@/types/project';

export interface SceneBaseProps {
  theme: 'light' | 'dark';
}

export interface TitleSceneProps extends SceneBaseProps {
  projectName: string;
  tagline: string;
  tags: string[];
}

export interface ScoreRadarSceneProps extends SceneBaseProps {
  scores: Scores;
}

export interface VisionSceneProps extends SceneBaseProps {
  vision: string;
  problemStatement: string;
}

export interface UserStoriesSceneProps extends SceneBaseProps {
  userStories: UserStory[];
}

export interface FeatureSceneProps extends SceneBaseProps {
  coreFeatures: string;
}

export interface TechStackSceneProps extends SceneBaseProps {
  techStack: string;
  architecture: string;
}

export interface RoadmapSceneProps extends SceneBaseProps {
  firstSprintPlan: string;
}

export interface MetricsSceneProps extends SceneBaseProps {
  successMetrics: string;
}

export interface OutroSceneProps extends SceneBaseProps {
  projectName: string;
  tagline: string;
  createdAt: string;
}

export interface PRDExplainerProps {
  project: ProjectCard;
  theme: 'light' | 'dark';
}
