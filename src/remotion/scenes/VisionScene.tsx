import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { getTheme } from '../lib/theme';
import { fontSans, fontMono } from '../lib/fonts';
import { useFadeIn, useTypewriter } from '../lib/animations';
import type { VisionSceneProps } from '../types';

export const VisionScene: React.FC<VisionSceneProps> = ({
  vision,
  problemStatement,
  theme,
}) => {
  const frame = useCurrentFrame();
  const colors = getTheme(theme);

  const visionLabelOpacity = useFadeIn(5);
  const visionText = useTypewriter(vision, 15, 0.8);
  const problemLabelOpacity = useFadeIn(20);
  const problemText = useTypewriter(problemStatement, 30, 0.8);

  const dividerHeight = interpolate(frame, [10, 60], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        display: 'flex',
        flexDirection: 'row',
        padding: 80,
        gap: 0,
      }}
    >
      {/* Vision column */}
      <div style={{ flex: 1, paddingRight: 60 }}>
        <div
          style={{
            opacity: visionLabelOpacity,
            fontFamily: fontMono,
            fontSize: 16,
            color: colors.mutedForeground,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            marginBottom: 24,
          }}
        >
          Vision
        </div>
        <div
          style={{
            fontFamily: fontSans,
            fontSize: 28,
            color: colors.foreground,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {visionText}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          width: 2,
          backgroundColor: colors.border,
          alignSelf: 'stretch',
          opacity: 0.3,
          clipPath: `inset(0 0 ${100 - dividerHeight}% 0)`,
        }}
      />

      {/* Problem column */}
      <div style={{ flex: 1, paddingLeft: 60 }}>
        <div
          style={{
            opacity: problemLabelOpacity,
            fontFamily: fontMono,
            fontSize: 16,
            color: colors.mutedForeground,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            marginBottom: 24,
          }}
        >
          Problem
        </div>
        <div
          style={{
            fontFamily: fontSans,
            fontSize: 28,
            color: colors.foreground,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {problemText}
        </div>
      </div>
    </AbsoluteFill>
  );
};
