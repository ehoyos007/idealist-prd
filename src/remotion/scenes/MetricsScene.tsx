import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { getTheme } from '../lib/theme';
import { fontSans, fontMono } from '../lib/fonts';
import { useFadeIn, staggerDelay } from '../lib/animations';
import type { MetricsSceneProps } from '../types';

function parseMetrics(text: string): string[] {
  return text
    .split(/\n/)
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

export const MetricsScene: React.FC<MetricsSceneProps> = ({
  successMetrics,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = getTheme(theme);
  const headerOpacity = useFadeIn(5);
  const metrics = parseMetrics(successMetrics).slice(0, 6);

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
        Success Metrics
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {metrics.map((metric, i) => {
          const delay = staggerDelay(i, 10) + 15;
          const opacity = useFadeIn(delay, 15);
          const barProgress = spring({
            frame: frame - delay,
            fps,
            config: { damping: 20, stiffness: 80, mass: 1 },
          });

          return (
            <div
              key={i}
              style={{ opacity }}
            >
              <div
                style={{
                  fontFamily: fontSans,
                  fontSize: 22,
                  color: colors.foreground,
                  marginBottom: 10,
                }}
              >
                {metric}
              </div>
              <div
                style={{
                  height: 8,
                  backgroundColor: colors.secondary,
                  width: '100%',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${barProgress * 100}%`,
                    backgroundColor: colors.chart[i % colors.chart.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
