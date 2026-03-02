import type { ProjectCard } from '@/types/project';
import { FPS } from './theme';

export interface SceneDurations {
  title: number;
  scores: number;
  vision: number;
  userStories: number;
  features: number;
  techStack: number;
  roadmap: number;
  metrics: number;
  outro: number;
}

function textDuration(text: string): number {
  const charsPerSecond = 12;
  const minSeconds = 4;
  const maxSeconds = 12;
  const seconds = Math.max(minSeconds, Math.ceil(text.length / charsPerSecond));
  return Math.min(seconds, maxSeconds) * FPS;
}

export function calculateTotalDuration(project: ProjectCard): {
  sceneDurations: SceneDurations;
  totalFrames: number;
} {
  const sceneDurations: SceneDurations = {
    title: 4 * FPS,
    scores: 5 * FPS,
    vision: textDuration(project.vision + project.problemStatement),
    userStories: Math.max(4 * FPS, project.userStories.length * 3 * FPS),
    features: textDuration(project.coreFeatures),
    techStack: textDuration(project.techStack + project.architecture),
    roadmap: textDuration(project.firstSprintPlan),
    metrics: textDuration(project.successMetrics),
    outro: 3 * FPS,
  };

  const totalFrames = Object.values(sceneDurations).reduce((a, b) => a + b, 0);

  return { sceneDurations, totalFrames };
}
