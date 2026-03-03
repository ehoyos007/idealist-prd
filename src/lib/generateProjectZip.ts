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
  let content = `# ${project.projectName}

> ${project.tagline}

## Tech Stack
${project.techStack}

## Architecture
${project.architecture}

## Key Conventions
- Follow the architecture described above
- Prioritize the features and tasks outlined in TASKS.md
- Reference CONTEXT.md for domain knowledge and user context
- Reference PLAN.md for implementation details`;

  if (project.visionMd) {
    content += `
- Reference VISION.md for decision frameworks and constraints
- Reference EVAL.md for evaluation process and acceptance criteria

## Vision-Guided Development

### Confidence Tiers
- **High confidence**: Proceed without asking. Matches established patterns, clear requirements.
- **Medium confidence**: Proceed but flag. Note deviation in commit message or comment.
- **Low confidence**: Stop and ask. Ambiguous requirements, architectural decisions, constraint conflicts.

### Constraint Enforcement
Before implementing any feature or making a change:
1. Check VISION.md constraints (musts and must-nots)
2. Verify alignment with the decision framework
3. Confirm acceptance criteria are met before marking done

### Precedence Hierarchy
1. VISION.md constraints (highest priority)
2. CLAUDE.md conventions
3. PLAN.md implementation details
4. TASKS.md task descriptions
5. CONTEXT.md background (lowest priority)

### Session Wrap-Up Format
When ending a session, update PROGRESS.md with:
- What was completed
- Decisions made and their rationale (referencing VISION.md)
- Any constraint conflicts encountered
- What to tackle next`;
  }

  content += `

---
*Generated with Idealist on ${date}*
`;
  return content;
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

  if (project.visionMd) {
    folder.file('VISION.md', project.visionMd);
  }
  if (project.evalMd) {
    folder.file('EVAL.md', project.evalMd);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folderName}-starter-kit.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
