export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const FPS = 30;

export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  mutedForeground: string;
  border: string;
  chart: [string, string, string, string];
}

const lightTheme: ThemeColors = {
  background: 'hsl(0, 0%, 100%)',
  foreground: 'hsl(0, 0%, 0%)',
  primary: 'hsl(0, 0%, 0%)',
  primaryForeground: 'hsl(0, 0%, 100%)',
  secondary: 'hsl(0, 0%, 96%)',
  mutedForeground: 'hsl(0, 0%, 45%)',
  border: 'hsl(0, 0%, 0%)',
  chart: [
    'hsl(12, 76%, 61%)',
    'hsl(173, 58%, 39%)',
    'hsl(197, 37%, 24%)',
    'hsl(43, 74%, 66%)',
  ],
};

const darkTheme: ThemeColors = {
  background: 'hsl(0, 0%, 0%)',
  foreground: 'hsl(0, 0%, 100%)',
  primary: 'hsl(0, 0%, 100%)',
  primaryForeground: 'hsl(0, 0%, 0%)',
  secondary: 'hsl(0, 0%, 15%)',
  mutedForeground: 'hsl(0, 0%, 65%)',
  border: 'hsl(0, 0%, 100%)',
  chart: [
    'hsl(220, 70%, 50%)',
    'hsl(160, 60%, 45%)',
    'hsl(30, 80%, 55%)',
    'hsl(280, 65%, 60%)',
  ],
};

export const THEME: Record<string, ThemeColors> = {
  light: lightTheme,
  dark: darkTheme,
};

export function getTheme(theme: 'light' | 'dark'): ThemeColors {
  return THEME[theme];
}
