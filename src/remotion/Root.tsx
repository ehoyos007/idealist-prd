import { Composition } from 'remotion';
import { PRDExplainer } from './compositions/PRDExplainer';
import { calculateTotalDuration } from './lib/duration';
import { VIDEO_WIDTH, VIDEO_HEIGHT, FPS } from './lib/theme';
import type { ProjectCard } from '@/types/project';

const sampleProject: ProjectCard = {
  id: 'sample-1',
  projectName: 'TaskFlow AI',
  tagline: 'Intelligent task management powered by machine learning',
  tags: ['SaaS', 'AI/ML', 'Productivity'],
  vision:
    'Create the most intuitive task management platform that learns from user behavior to automatically prioritize, schedule, and organize work across teams.',
  problemStatement:
    'Teams spend 30% of their time managing tasks instead of doing them. Existing tools require manual prioritization and scheduling, leading to context switching and missed deadlines.',
  targetUser:
    'Product managers and engineering leads at mid-size tech companies (50-500 employees) who manage cross-functional teams.',
  userStories: [
    {
      persona: 'Product Manager',
      goal: 'see AI-prioritized tasks each morning',
      benefit: 'I can focus on strategic work instead of triaging tickets',
    },
    {
      persona: 'Engineering Lead',
      goal: 'get automated sprint planning suggestions',
      benefit: 'my team delivers more consistently',
    },
    {
      persona: 'Individual Contributor',
      goal: 'have my tasks automatically scheduled around focus time',
      benefit: 'I enter flow state more easily',
    },
  ],
  coreFeatures:
    'AI-powered task prioritization\nSmart sprint planning\nAutomatic scheduling around focus blocks\nCross-team dependency visualization\nNatural language task creation\nPredictive deadline alerts',
  techStack:
    'React, TypeScript, Node.js, PostgreSQL, Redis, OpenAI API, TensorFlow.js, Supabase, Vercel',
  architecture:
    'Serverless API layer on Vercel Edge Functions. PostgreSQL for persistent storage with Redis caching. ML inference via OpenAI for NLP tasks and a lightweight TensorFlow.js model for priority scoring that runs client-side.',
  successMetrics:
    'Reduce task management time by 50%\n80% user retention at 30 days\nNPS score above 60\nAverage 3 AI suggestions accepted per user per day\n<200ms response time for core operations',
  risksAndOpenQuestions:
    'AI accuracy for prioritization may require significant training data. Privacy concerns with analyzing task content. Integration complexity with existing tools (Jira, Linear, Asana).',
  firstSprintPlan:
    'Set up project scaffold with React + TypeScript\nBuild core task CRUD with Supabase\nIntegrate OpenAI for natural language task parsing\nCreate basic priority scoring algorithm\nBuild dashboard with task list and priority view\nDeploy MVP to Vercel',
  scores: { complexity: 7, impact: 9, urgency: 6, confidence: 8 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const RemotionRoot: React.FC = () => {
  const { totalFrames } = calculateTotalDuration(sampleProject);

  return (
    <>
      <Composition
        id="PRDExplainer"
        component={PRDExplainer}
        durationInFrames={totalFrames}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={{
          project: sampleProject,
          theme: 'dark' as const,
        }}
      />
    </>
  );
};
