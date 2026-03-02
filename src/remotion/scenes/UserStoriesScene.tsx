import { AbsoluteFill } from 'remotion';
import { getTheme } from '../lib/theme';
import { fontSans, fontMono } from '../lib/fonts';
import { useFadeIn, useSlideUp, staggerDelay, useScaleSpring } from '../lib/animations';
import type { UserStoriesSceneProps } from '../types';

export const UserStoriesScene: React.FC<UserStoriesSceneProps> = ({
  userStories,
  theme,
}) => {
  const colors = getTheme(theme);
  const headerOpacity = useFadeIn(5);
  const displayStories = userStories.slice(0, 3);

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
        User Stories
      </div>
      <div
        style={{
          display: 'flex',
          gap: 32,
          flex: 1,
          alignItems: 'stretch',
        }}
      >
        {displayStories.map((story, i) => {
          const delay = staggerDelay(i, 15) + 20;
          const cardOpacity = useFadeIn(delay, 20);
          const cardY = useSlideUp(delay, 60);
          const scale = useScaleSpring(delay);

          return (
            <div
              key={i}
              style={{
                flex: 1,
                opacity: cardOpacity,
                transform: `translateY(${cardY}px) scale(${scale})`,
                border: `2px solid ${colors.border}`,
                padding: 40,
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: fontMono,
                    fontSize: 12,
                    color: colors.mutedForeground,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 8,
                  }}
                >
                  As a
                </div>
                <div
                  style={{
                    fontFamily: fontSans,
                    fontSize: 22,
                    fontWeight: 600,
                    color: colors.foreground,
                    lineHeight: 1.4,
                  }}
                >
                  {story.persona}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: fontMono,
                    fontSize: 12,
                    color: colors.mutedForeground,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 8,
                  }}
                >
                  I want to
                </div>
                <div
                  style={{
                    fontFamily: fontSans,
                    fontSize: 20,
                    color: colors.foreground,
                    lineHeight: 1.4,
                  }}
                >
                  {story.goal}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: fontMono,
                    fontSize: 12,
                    color: colors.mutedForeground,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 8,
                  }}
                >
                  So that
                </div>
                <div
                  style={{
                    fontFamily: fontSans,
                    fontSize: 20,
                    color: colors.chart[i % colors.chart.length],
                    lineHeight: 1.4,
                  }}
                >
                  {story.benefit}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
