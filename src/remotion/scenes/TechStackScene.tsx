import { AbsoluteFill } from 'remotion';
import { getTheme } from '../lib/theme';
import { fontSans, fontMono } from '../lib/fonts';
import { useFadeIn, useScaleSpring, staggerDelay } from '../lib/animations';
import type { TechStackSceneProps } from '../types';
import { stripMarkdown } from '../lib/text';

function parseTechItems(text: string): string[] {
  return stripMarkdown(text)
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export const TechStackScene: React.FC<TechStackSceneProps> = ({
  techStack,
  architecture,
  theme,
}) => {
  const colors = getTheme(theme);
  const headerOpacity = useFadeIn(5);
  const archLabelOpacity = useFadeIn(20);
  const archTextOpacity = useFadeIn(30);
  const techItems = parseTechItems(techStack).slice(0, 12);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        display: 'flex',
        flexDirection: 'row',
        padding: 80,
        gap: 60,
      }}
    >
      {/* Tech stack pills */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            opacity: headerOpacity,
            fontFamily: fontMono,
            fontSize: 18,
            color: colors.mutedForeground,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            marginBottom: 36,
          }}
        >
          Tech Stack
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          {techItems.map((item, i) => {
            const delay = staggerDelay(i, 6) + 15;
            const scale = useScaleSpring(delay);
            const opacity = useFadeIn(delay, 12);

            return (
              <div
                key={i}
                style={{
                  opacity,
                  transform: `scale(${scale})`,
                  padding: '12px 24px',
                  border: `2px solid ${colors.border}`,
                  backgroundColor: colors.secondary,
                  fontFamily: fontMono,
                  fontSize: 18,
                  color: colors.foreground,
                }}
              >
                {item}
              </div>
            );
          })}
        </div>
      </div>

      {/* Architecture */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            opacity: archLabelOpacity,
            fontFamily: fontMono,
            fontSize: 18,
            color: colors.mutedForeground,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            marginBottom: 36,
          }}
        >
          Architecture
        </div>
        <div
          style={{
            opacity: archTextOpacity,
            fontFamily: fontSans,
            fontSize: 24,
            color: colors.foreground,
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
          }}
        >
          {stripMarkdown(architecture)}
        </div>
      </div>
    </AbsoluteFill>
  );
};
