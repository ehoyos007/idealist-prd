import { Player } from '@remotion/player';
import { PRDExplainer } from './compositions/PRDExplainer';
import { calculateTotalDuration } from './lib/duration';
import { VIDEO_WIDTH, VIDEO_HEIGHT, FPS } from './lib/theme';
import type { ProjectCard } from '@/types/project';

interface VideoPreviewWrapperProps {
  project: ProjectCard;
  theme: 'light' | 'dark';
}

export default function VideoPreviewWrapper({ project, theme }: VideoPreviewWrapperProps) {
  const { totalFrames } = calculateTotalDuration(project);
  const durationSeconds = (totalFrames / FPS).toFixed(1);

  return (
    <div>
      <div
        style={{
          border: '2px solid',
          borderColor: 'inherit',
          overflow: 'hidden',
        }}
      >
        <Player
          component={PRDExplainer}
          inputProps={{ project, theme }}
          durationInFrames={totalFrames}
          compositionWidth={VIDEO_WIDTH}
          compositionHeight={VIDEO_HEIGHT}
          fps={FPS}
          style={{ width: '100%' }}
          controls
          autoPlay={false}
        />
      </div>
      <p
        style={{
          marginTop: 8,
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          opacity: 0.5,
        }}
      >
        {durationSeconds}s preview at {FPS}fps
      </p>
    </div>
  );
}
