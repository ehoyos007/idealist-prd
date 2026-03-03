import { ProjectCard, UserStory } from '@/types/project';

export interface ProjectDbRow {
  id: string;
  project_name: string;
  tagline: string | null;
  tags: string[];
  vision: string | null;
  problem_statement: string | null;
  target_user: string | null;
  user_stories: UserStory[] | null;
  core_features: string | null;
  tech_stack: string | null;
  architecture: string | null;
  success_metrics: string | null;
  risks_and_open_questions: string | null;
  first_sprint_plan: string | null;
  score_complexity: number;
  score_impact: number;
  score_urgency: number;
  score_confidence: number;
  transcript: string | null;
  vision_md: string | null;
  eval_md: string | null;
  vision_transcript: string | null;
  created_at: string;
  updated_at: string;
}

export function dbRowToProjectCard(row: ProjectDbRow): ProjectCard {
  return {
    id: row.id,
    projectName: row.project_name,
    tagline: row.tagline || '',
    tags: row.tags || [],
    vision: row.vision || '',
    problemStatement: row.problem_statement || '',
    targetUser: row.target_user || '',
    userStories: (row.user_stories as UserStory[]) || [],
    coreFeatures: row.core_features || '',
    techStack: row.tech_stack || '',
    architecture: row.architecture || '',
    successMetrics: row.success_metrics || '',
    risksAndOpenQuestions: row.risks_and_open_questions || '',
    firstSprintPlan: row.first_sprint_plan || '',
    scores: {
      complexity: row.score_complexity,
      impact: row.score_impact,
      urgency: row.score_urgency,
      confidence: row.score_confidence,
    },
    transcript: row.transcript || undefined,
    visionMd: row.vision_md || undefined,
    evalMd: row.eval_md || undefined,
    visionTranscript: row.vision_transcript || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function projectCardToDbRow(project: ProjectCard): Omit<ProjectDbRow, 'created_at' | 'updated_at'> {
  return {
    id: project.id,
    project_name: project.projectName,
    tagline: project.tagline,
    tags: project.tags,
    vision: project.vision,
    problem_statement: project.problemStatement,
    target_user: project.targetUser,
    user_stories: project.userStories,
    core_features: project.coreFeatures,
    tech_stack: project.techStack,
    architecture: project.architecture,
    success_metrics: project.successMetrics,
    risks_and_open_questions: project.risksAndOpenQuestions,
    first_sprint_plan: project.firstSprintPlan,
    score_complexity: project.scores.complexity,
    score_impact: project.scores.impact,
    score_urgency: project.scores.urgency,
    score_confidence: project.scores.confidence,
    transcript: project.transcript || null,
    vision_md: project.visionMd || null,
    eval_md: project.evalMd || null,
    vision_transcript: project.visionTranscript || null,
  };
}
