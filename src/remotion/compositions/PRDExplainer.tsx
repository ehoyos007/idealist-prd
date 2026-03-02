import { Series } from 'remotion';
import '../lib/fonts';
import { calculateTotalDuration } from '../lib/duration';
import { TitleScene } from '../scenes/TitleScene';
import { ScoreRadarScene } from '../scenes/ScoreRadarScene';
import { VisionScene } from '../scenes/VisionScene';
import { UserStoriesScene } from '../scenes/UserStoriesScene';
import { FeatureScene } from '../scenes/FeatureScene';
import { TechStackScene } from '../scenes/TechStackScene';
import { RoadmapScene } from '../scenes/RoadmapScene';
import { MetricsScene } from '../scenes/MetricsScene';
import { OutroScene } from '../scenes/OutroScene';
import type { PRDExplainerProps } from '../types';

export const PRDExplainer: React.FC<PRDExplainerProps> = ({ project, theme }) => {
  const { sceneDurations } = calculateTotalDuration(project);

  return (
    <Series>
      <Series.Sequence durationInFrames={sceneDurations.title}>
        <TitleScene
          projectName={project.projectName}
          tagline={project.tagline}
          tags={project.tags}
          theme={theme}
        />
      </Series.Sequence>
      <Series.Sequence durationInFrames={sceneDurations.scores}>
        <ScoreRadarScene scores={project.scores} theme={theme} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={sceneDurations.vision}>
        <VisionScene
          vision={project.vision}
          problemStatement={project.problemStatement}
          theme={theme}
        />
      </Series.Sequence>
      <Series.Sequence durationInFrames={sceneDurations.userStories}>
        <UserStoriesScene userStories={project.userStories} theme={theme} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={sceneDurations.features}>
        <FeatureScene coreFeatures={project.coreFeatures} theme={theme} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={sceneDurations.techStack}>
        <TechStackScene
          techStack={project.techStack}
          architecture={project.architecture}
          theme={theme}
        />
      </Series.Sequence>
      <Series.Sequence durationInFrames={sceneDurations.roadmap}>
        <RoadmapScene firstSprintPlan={project.firstSprintPlan} theme={theme} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={sceneDurations.metrics}>
        <MetricsScene successMetrics={project.successMetrics} theme={theme} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={sceneDurations.outro}>
        <OutroScene
          projectName={project.projectName}
          tagline={project.tagline}
          createdAt={project.createdAt}
          theme={theme}
        />
      </Series.Sequence>
    </Series>
  );
};
