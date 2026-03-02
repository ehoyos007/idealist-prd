import { AbsoluteFill } from 'remotion';
import { getTheme } from '../lib/theme';
import { fontSans, fontMono } from '../lib/fonts';
import { useFadeIn, useScaleSpring } from '../lib/animations';
import type { OutroSceneProps } from '../types';

export const OutroScene: React.FC<OutroSceneProps> = ({
  projectName,
  tagline,
  createdAt,
  theme,
}) => {
  const colors = getTheme(theme);
  const brandOpacity = useFadeIn(5, 25);
  const brandScale = useScaleSpring(5);
  const nameOpacity = useFadeIn(15, 20);
  const taglineOpacity = useFadeIn(25, 20);
  const dateOpacity = useFadeIn(35, 20);

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <div
        style={{
          opacity: brandOpacity,
          transform: `scale(${brandScale})`,
          fontFamily: fontMono,
          fontSize: 16,
          color: colors.mutedForeground,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          marginBottom: 16,
        }}
      >
        Built with Idealist
      </div>
      <div
        style={{
          opacity: nameOpacity,
          fontFamily: fontSans,
          fontSize: 52,
          fontWeight: 700,
          color: colors.foreground,
          textAlign: 'center',
          maxWidth: 1200,
          lineHeight: 1.2,
        }}
      >
        {projectName}
      </div>
      {tagline && (
        <div
          style={{
            opacity: taglineOpacity,
            fontFamily: fontSans,
            fontSize: 26,
            color: colors.mutedForeground,
            textAlign: 'center',
            maxWidth: 1000,
          }}
        >
          {tagline}
        </div>
      )}
      <div
        style={{
          opacity: dateOpacity,
          fontFamily: fontMono,
          fontSize: 14,
          color: colors.mutedForeground,
          marginTop: 24,
        }}
      >
        {formattedDate}
      </div>
    </AbsoluteFill>
  );
};
