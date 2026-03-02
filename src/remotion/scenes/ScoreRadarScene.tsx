import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { getTheme } from '../lib/theme';
import { fontSans, fontMono } from '../lib/fonts';
import { useFadeIn } from '../lib/animations';
import type { ScoreRadarSceneProps } from '../types';

const AXES = ['complexity', 'impact', 'urgency', 'confidence'] as const;
const LABELS = ['Complexity', 'Impact', 'Urgency', 'Confidence'];

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

export const ScoreRadarScene: React.FC<ScoreRadarSceneProps> = ({
  scores,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = getTheme(theme);

  const headerOpacity = useFadeIn(5);
  const chartScale = spring({
    frame: frame - 15,
    fps,
    config: { damping: 18, stiffness: 100, mass: 0.8 },
  });

  const cx = 960;
  const cy = 560;
  const maxR = 280;

  const values = AXES.map((axis) => scores[axis] / 10);

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  const dataPoints = values.map((v, i) => {
    const angle = (360 / 4) * i;
    const r = v * maxR * chartScale;
    return polarToCartesian(cx, cy, r, angle);
  });

  const dataPath =
    dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') + ' Z';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 60,
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
          marginTop: 40,
        }}
      >
        Project Scores
      </div>

      <svg
        width={1920}
        height={900}
        viewBox="0 0 1920 1080"
        style={{ position: 'absolute', top: 80 }}
      >
        {/* Grid rings */}
        {gridLevels.map((level) => {
          const points = [0, 1, 2, 3].map((i) => {
            const angle = (360 / 4) * i;
            return polarToCartesian(cx, cy, maxR * level, angle);
          });
          const path =
            points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') + ' Z';
          return (
            <path
              key={level}
              d={path}
              fill="none"
              stroke={colors.mutedForeground}
              strokeWidth={1}
              opacity={0.2}
            />
          );
        })}

        {/* Axis lines */}
        {[0, 1, 2, 3].map((i) => {
          const angle = (360 / 4) * i;
          const [ex, ey] = polarToCartesian(cx, cy, maxR, angle);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={ex}
              y2={ey}
              stroke={colors.mutedForeground}
              strokeWidth={1}
              opacity={0.3}
            />
          );
        })}

        {/* Data polygon */}
        <path
          d={dataPath}
          fill={colors.chart[0]}
          fillOpacity={0.2}
          stroke={colors.chart[0]}
          strokeWidth={3}
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={6}
            fill={colors.chart[i]}
            stroke={colors.background}
            strokeWidth={2}
          />
        ))}

        {/* Labels */}
        {LABELS.map((label, i) => {
          const angle = (360 / 4) * i;
          const [lx, ly] = polarToCartesian(cx, cy, maxR + 50, angle);
          const labelOpacity = interpolate(frame, [30 + i * 5, 40 + i * 5], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <g key={i}>
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily={fontMono}
                fontSize={16}
                fill={colors.foreground}
                opacity={labelOpacity}
              >
                {label}
              </text>
              <text
                x={lx}
                y={ly + 24}
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily={fontSans}
                fontSize={28}
                fontWeight={700}
                fill={colors.chart[i]}
                opacity={labelOpacity}
              >
                {scores[AXES[i]]}/10
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
