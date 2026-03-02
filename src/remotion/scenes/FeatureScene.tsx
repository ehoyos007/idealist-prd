import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { getTheme } from '../lib/theme';
import { fontSans, fontMono } from '../lib/fonts';
import { useFadeIn, useSlideUp, staggerDelay } from '../lib/animations';
import type { FeatureSceneProps } from '../types';
import { stripMarkdown } from '../lib/text';

function parseFeatures(text: string): string[] {
  return stripMarkdown(text)
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export const FeatureScene: React.FC<FeatureSceneProps> = ({
  coreFeatures,
  theme,
}) => {
  const frame = useCurrentFrame();
  const colors = getTheme(theme);
  const headerOpacity = useFadeIn(5);
  const features = parseFeatures(coreFeatures).slice(0, 8);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        padding: 80,
      }}
    >
      <div
        style={{
          opacity: headerOpacity,
          fontFamily: fontMono,
          fontSize: 18,
          color: colors.mutedForeground,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          marginBottom: 48,
        }}
      >
        Core Features
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {features.map((feature, i) => {
          const delay = staggerDelay(i, 10) + 20;
          const opacity = useFadeIn(delay, 15);
          const y = useSlideUp(delay, 30);

          const checkProgress = interpolate(
            frame,
            [delay + 10, delay + 25],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          );

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `translateY(${y}px)`,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
              }}
            >
              <svg width={32} height={32} viewBox="0 0 32 32">
                <rect
                  x={2}
                  y={2}
                  width={28}
                  height={28}
                  fill="none"
                  stroke={colors.border}
                  strokeWidth={2}
                />
                <path
                  d="M 8 16 L 14 22 L 24 10"
                  fill="none"
                  stroke={colors.chart[i % colors.chart.length]}
                  strokeWidth={3}
                  strokeLinecap="square"
                  strokeDasharray={30}
                  strokeDashoffset={30 * (1 - checkProgress)}
                />
              </svg>
              <div
                style={{
                  fontFamily: fontSans,
                  fontSize: 26,
                  color: colors.foreground,
                  lineHeight: 1.4,
                }}
              >
                {feature}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
