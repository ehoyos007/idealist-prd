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

This project uses VISION.md for autonomous decision-making and EVAL.md for periodic evaluation.

### Session Startup

On session start:
1. Read VISION.md
2. Read PROGRESS.md
3. Output one-line confirmation: "Vision loaded: [top 2-3 decision defaults]. [N] open questions."
4. If a vision evolution trigger was hit last session, append: "Vision review suggested."
5. Check TASKS.md or PLAN.md for next steps

### 1. Confidence-Based Decision Making

When you encounter an ambiguous decision:

1. Check VISION.md first — Decision Framework, Constraint Architecture, or Acceptance Criteria.
2. Assess confidence:
   - **High** (VISION.md clearly covers this): Proceed. Note the decision briefly.
   - **Medium** (partially covered, needs inference): Proceed but flag. "Based on VISION.md's preference for [X], I went with [Y]. Adjust?"
   - **Low** (not covered, or significant implications): Stop and ask. Novel decisions -> mention for Open Questions in VISION.md.

### 2. File Routing

- Judgment calls (style, approach, priority, tradeoff) -> **VISION.md**
- Factual info (APIs, formats, stack, business rules) -> **CONTEXT.md**
- Implementation details (module boundaries, specs) -> **PLAN.md**
- Unsure -> VISION.md first, then CONTEXT.md

### 3. Constraint Enforcement

Before completing any task:
1. Verify all Musts are satisfied
2. Verify no Must-Nots are violated
3. Check Escalation Triggers — if any apply, stop and ask
4. For choices between valid approaches, follow stated Preferences

### 4. Vision Evolution Triggers

Prompt to update VISION.md when:
- First major feature ships
- A decision contradicts VISION.md
- A cluster of similar low-confidence questions appears
- Natural milestones (v0.1, MVP, launch)
- User says "this isn't feeling right"

### 5. Context Evolution Triggers

Prompt to update CONTEXT.md when:
- New integrations or dependencies added
- Tech stack changes
- Domain knowledge gaps caused errors
- New reference documents created

### 6. Quality Verification

Before marking significant work complete:
1. Check Acceptance Criteria in VISION.md
2. Verify Musts from Constraint Architecture
Fix failures before presenting. If unfixable, flag specifically which criteria aren't met.

### Precedence

When files disagree: **Live instruction > CLAUDE.md > VISION.md > CONTEXT.md**

Most apparent conflicts between VISION.md and CONTEXT.md are complementary tensions requiring synthesis, not true contradictions. Only true contradictions trigger the precedence hierarchy.

### Session Wrap-Up Addition

Every PROGRESS.md wrap-up includes a Vision Decisions section:
- **[High/Med/Low]:** [Decision] — [VISION.md section referenced]
Or: "None this session."`;
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
