import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export function useFadeIn(startFrame: number, durationFrames = 20): number {
  const frame = useCurrentFrame();
  return interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export function useSlideUp(startFrame: number, distance = 40): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 20, stiffness: 120, mass: 0.8 },
  });
  return interpolate(progress, [0, 1], [distance, 0]);
}

export function staggerDelay(index: number, delayPerItem = 8): number {
  return index * delayPerItem;
}

export function useTypewriter(
  text: string,
  startFrame: number,
  charsPerFrame = 0.6,
): string {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const charCount = Math.min(Math.floor(elapsed * charsPerFrame), text.length);
  return text.slice(0, charCount);
}

export function useScaleSpring(startFrame: number): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 15, stiffness: 150, mass: 0.6 },
  });
}
