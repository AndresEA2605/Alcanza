/**
 * Tokens visuales de la app.
 *
 * La paleta sigue el estilo de iOS: fondos suaves, superficies translúcidas,
 * bordes finos y acentos azules. Todos los textos usan la tipografía del
 * sistema para respetar el tamaño dinámico del teléfono.
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  backgroundAccent: string;
  backgroundAccentTwo: string;
  surface: string;
  surfaceStrong: string;
  glass: string;
  glassBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  inputBackground: string;
  separator: string;
  shadow: string;
  scrim: string;
}

export const palettes: Record<ThemeMode, ThemeColors> = {
  light: {
    background: '#F2F5FA',
    backgroundAccent: 'rgba(10, 108, 255, 0.16)',
    backgroundAccentTwo: 'rgba(27, 158, 99, 0.14)',
    surface: '#FFFFFF',
    surfaceStrong: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.74)',
    glassBorder: 'rgba(255, 255, 255, 0.92)',
    text: '#0B1220',
    textSecondary: '#4A5568',
    textMuted: '#8A94A6',
    accent: '#0A6CFF',
    accentSoft: 'rgba(10, 108, 255, 0.12)',
    onAccent: '#FFFFFF',
    success: '#129C63',
    successSoft: 'rgba(18, 156, 99, 0.14)',
    warning: '#C77700',
    warningSoft: 'rgba(199, 119, 0, 0.14)',
    danger: '#D92D20',
    dangerSoft: 'rgba(217, 45, 32, 0.12)',
    inputBackground: 'rgba(255, 255, 255, 0.88)',
    separator: 'rgba(11, 18, 32, 0.08)',
    shadow: 'rgba(11, 18, 32, 0.18)',
    scrim: 'rgba(11, 18, 32, 0.35)',
  },
  dark: {
    background: '#05070C',
    backgroundAccent: 'rgba(76, 155, 255, 0.22)',
    backgroundAccentTwo: 'rgba(61, 220, 151, 0.16)',
    surface: '#121722',
    surfaceStrong: '#161D2B',
    glass: 'rgba(22, 29, 43, 0.72)',
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    text: '#F7F9FC',
    textSecondary: '#B4BDCC',
    textMuted: '#7C879B',
    accent: '#4C9BFF',
    accentSoft: 'rgba(76, 155, 255, 0.18)',
    onAccent: '#04111F',
    success: '#3DDC97',
    successSoft: 'rgba(61, 220, 151, 0.16)',
    warning: '#FFB340',
    warningSoft: 'rgba(255, 179, 64, 0.16)',
    danger: '#FF6B6B',
    dangerSoft: 'rgba(255, 107, 107, 0.16)',
    inputBackground: 'rgba(255, 255, 255, 0.06)',
    separator: 'rgba(255, 255, 255, 0.1)',
    shadow: 'rgba(0, 0, 0, 0.5)',
    scrim: 'rgba(0, 0, 0, 0.55)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

export const radii = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 56, lineHeight: 60, fontWeight: '700' },
  money: { fontSize: 46, lineHeight: 52, fontWeight: '700' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
} as const;

export const motion = {
  /** Duración del número animado, en milisegundos. */
  numberDuration: 1100,
  entranceDuration: 460,
  stagger: 90,
} as const;
