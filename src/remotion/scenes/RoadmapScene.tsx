import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { getTheme } from '../lib/theme';
import { fontSans, fontMono } from '../lib/fonts';
import { useFadeIn, useSlideUp, staggerDelay, useScaleSpring } from '../lib/animations';
import type { RoadmapSceneProps } from '../types';

function parseSprintItems(text: string): string[] {
  return text
    .split(/\n/)
    .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(Boolean);
}

export const RoadmapScene: React.FC<RoadmapSceneProps> = ({
  firstSprintPlan,
  theme,
}) => {
  const frame = useCurrentFrame();
  const colors = getTheme(theme);
  const headerOpacity = useFadeIn(5);
  const items = parseSprintItems(firstSprintPlan).slice(0, 6);

  const timelineX = 200;
  const startY = 180;
  const spacing = 120;

  const lineProgress = interpolate(
    frame,
    [15, 15 + items.length * 12],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

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
        Sprint 1 Plan
      </div>

      <svg
        width={1760}
        height={items.length * spacing + 60}
        style={{ position: 'absolute', left: 80, top: 140 }}
      >
        {/* Timeline line */}
        <line
          x1={timelineX}
          y1={startY}
          x2={timelineX}
          y2={startY + (items.length - 1) * spacing}
          stroke={colors.border}
          strokeWidth={2}
          opacity={0.3}
          strokeDasharray={`${(items.length - 1) * spacing}`}
          strokeDashoffset={`${(items.length - 1) * spacing * (1 - lineProgress)}`}
        />
      </svg>

      {/* Items */}
      {items.map((item, i) => {
        const delay = staggerDelay(i, 12) + 20;
        const opacity = useFadeIn(delay, 15);
        const y = useSlideUp(delay, 30);
        const nodeScale = useScaleSpring(delay);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 80,
              top: 140 + startY + i * spacing - 20,
              display: 'flex',
              alignItems: 'center',
              gap: 32,
              opacity,
              transform: `translateY(${y}px)`,
            }}
          >
            <div
              style={{
                width: timelineX * 2,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  backgroundColor: colors.chart[i % colors.chart.length],
                  transform: `scale(${nodeScale})`,
                }}
              />
            </div>
            <div
              style={{
                fontFamily: fontSans,
                fontSize: 24,
                color: colors.foreground,
                lineHeight: 1.4,
                maxWidth: 1200,
              }}
            >
              {item}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
