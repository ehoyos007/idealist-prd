import { AbsoluteFill } from 'remotion';
import { getTheme } from '../lib/theme';
import { fontSans, fontMono } from '../lib/fonts';
import { useFadeIn, useSlideUp, staggerDelay } from '../lib/animations';
import type { TitleSceneProps } from '../types';

export const TitleScene: React.FC<TitleSceneProps> = ({
  projectName,
  tagline,
  tags,
  theme,
}) => {
  const colors = getTheme(theme);
  const nameOpacity = useFadeIn(10);
  const nameY = useSlideUp(10);
  const taglineOpacity = useFadeIn(25);
  const taglineY = useSlideUp(25);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 80,
      }}
    >
      <div
        style={{
          opacity: nameOpacity,
          transform: `translateY(${nameY}px)`,
          fontSize: 72,
          fontWeight: 700,
          fontFamily: fontSans,
          color: colors.foreground,
          textAlign: 'center',
          lineHeight: 1.1,
          maxWidth: 1400,
        }}
      >
        {projectName}
      </div>
      {tagline && (
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            fontSize: 32,
            fontWeight: 400,
            fontFamily: fontSans,
            color: colors.mutedForeground,
            textAlign: 'center',
            marginTop: 24,
            maxWidth: 1200,
          }}
        >
          {tagline}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginTop: 40,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {tags.map((tag, i) => {
          const delay = staggerDelay(i, 6) + 40;
          const opacity = useFadeIn(delay, 15);
          const y = useSlideUp(delay, 20);
          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `translateY(${y}px)`,
                padding: '8px 20px',
                border: `2px solid ${colors.border}`,
                fontFamily: fontMono,
                fontSize: 16,
                color: colors.foreground,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {tag}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
