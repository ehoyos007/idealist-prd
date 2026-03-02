import JSZip from 'jszip';
import { ProjectCard } from '@/types/project';

function toCheckboxList(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      if (/^[-*]\s*\[[ x]\]/.test(line)) return line;
      if (/^[-*]\s+/.test(line)) return `- [ ] ${line.replace(/^[-*]\s+/, '')}`;
      if (/^\d+\.\s+/.test(line)) return `- [ ] ${line.replace(/^\d+\.\s+/, '')}`;
      return `- [ ] ${line}`;
    })
    .join('\n');
}

function buildContextMd(project: ProjectCard, date: string): string {
  return `# ${project.projectName} - Project Context

> ${project.tagline}

## Vision
${project.vision}

## Problem Statement
${project.problemStatement}

## Target User
${project.targetUser}

## Success Metrics
${project.successMetrics}

## Tags
${project.tags.join(', ')}

---
*Generated with Idealist on ${date}*
`;
}

function buildTasksMd(project: ProjectCard, date: string): string {
  const sprintTasks = toCheckboxList(project.firstSprintPlan);
  const featureTasks = toCheckboxList(project.coreFeatures);
  const storyItems = project.userStories
    .map((s) => `- [ ] As a ${s.persona}, I want to ${s.goal}, so that ${s.benefit}`)
    .join('\n');

  return `# ${project.projectName} - Tasks

## Sprint 1 (Current)
${sprintTasks}

## Backlog (Core Features)
${featureTasks}

## User Stories
${storyItems}

---
*Generated with Idealist on ${date}*
`;
}

function buildPlanMd(project: ProjectCard, date: string): string {
  const storyBlocks = project.userStories
    .map(
      (s) =>
        `### As a ${s.persona}\n- **Goal:** ${s.goal}\n- **Benefit:** ${s.benefit}`
    )
    .join('\n\n');

  return `# ${project.projectName} - Implementation Plan

> ${project.tagline}

## Architecture
${project.architecture}

## Tech Stack
${project.techStack}

## Core Features
${project.coreFeatures}

## User Stories
${storyBlocks}

## Risks & Open Questions
${project.risksAndOpenQuestions}

## Scores
| Metric | Score |
|--------|-------|
| Complexity | ${project.scores.complexity}/10 |
| Impact | ${project.scores.impact}/10 |
| Urgency | ${project.scores.urgency}/10 |
| Confidence | ${project.scores.confidence}/10 |

---
*Generated with Idealist on ${date}*
`;
}

function buildClaudeMd(project: ProjectCard, date: string): string {
  return `# ${project.projectName}

> ${project.tagline}

## Tech Stack
${project.techStack}

## Architecture
${project.architecture}

## Key Conventions
- Follow the architecture described above
- Prioritize the features and tasks outlined in TASKS.md
- Reference CONTEXT.md for domain knowledge and user context
- Reference PLAN.md for implementation details

---
*Generated with Idealist on ${date}*
`;
}

export async function generateProjectZip(project: ProjectCard): Promise<void> {
  const zip = new JSZip();
  const folderName = project.projectName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  const date = new Date().toLocaleDateString();

  const folder = zip.folder(folderName)!;
  folder.file('CONTEXT.md', buildContextMd(project, date));
  folder.file('TASKS.md', buildTasksMd(project, date));
  folder.file('PLAN.md', buildPlanMd(project, date));
  folder.file('CLAUDE.md', buildClaudeMd(project, date));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folderName}-starter-kit.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
