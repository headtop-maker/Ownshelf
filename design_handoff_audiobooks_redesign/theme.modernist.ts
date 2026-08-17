/**
 * Дизайн-токены редизайна «Modernist» — готовая замена src/shared/ui/theme.ts.
 * Референс: design_handoff_audiobooks_redesign/README.md → Design Tokens.
 */
import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

export const palette = {
  light: {
    bg: '#FBFAF9',
    surface: '#F2F0EE',
    surfaceAlt: '#EDEBE9',
    text: '#262322',
    textMuted: 'rgba(38,35,34,0.50)',
    subtle: 'rgba(38,35,34,0.42)',
    divider: 'rgba(38,35,34,0.14)',
    hairline: 'rgba(38,35,34,0.09)',
    border: 'rgba(38,35,34,0.18)',
    accent: '#EC3013',
    accentText: '#FBFAF9',
    accentPressed: '#DD2B0F',
    accentOnLightText: '#AE1800',
    accentTint: 'rgba(236,48,19,0.08)',
    danger: '#AE1800',
  },
  dark: {
    bg: '#262322',
    surface: '#302C2B',
    surfaceAlt: '#3A3635',
    text: '#FBFAF9',
    textMuted: 'rgba(251,250,249,0.55)',
    subtle: 'rgba(251,250,249,0.42)',
    divider: 'rgba(251,250,249,0.16)',
    hairline: 'rgba(251,250,249,0.10)',
    border: 'rgba(251,250,249,0.28)',
    accent: '#EC3013',
    accentText: '#FBFAF9',
    accentPressed: '#FF563C',
    accentOnLightText: '#FF563C',
    accentTint: 'rgba(255,86,60,0.12)',
    danger: '#FF563C',
  },
} as const;

export type ThemeColors = { [K in keyof (typeof palette)['light']]: string };

export const spacing = { xs: 4, sm: 6, md: 10, lg: 16, xl: 22, xxl: 32 } as const;

export const radius = { sm: 6, md: 8, cover: 10, tile: 12, sheet: 18, pill: 999 } as const;

/** [fontSize, lineHeight, fontWeight] — межстрочный в px, из README. */
export const type = {
  display: [42, 40, '800'],
  screenTitle: [26, 26, '800'],
  bookTitleLarge: [25, 27, '800'],
  playerTitle: [22, 24, '800'],
  cardTitle: [16, 18, '800'],
  gridTitle: [12, 15, '800'],
  row: [12.5, 17, '600'],
  meta: [11, 15, '400'],
  kicker: [10, 12, '800'],
  navLabel: [9.5, 12, '800'],
  numeric: [10.5, 13, '800'],
} as const;

/** uppercase + tracking для ролей, где это часть стиля. */
export const typeCase = {
  display: { textTransform: 'uppercase', letterSpacing: -0.8 },
  screenTitle: { textTransform: 'uppercase' },
  bookTitleLarge: { textTransform: 'uppercase' },
  playerTitle: { textTransform: 'uppercase' },
  cardTitle: { textTransform: 'uppercase' },
  gridTitle: { textTransform: 'uppercase' },
  kicker: { textTransform: 'uppercase', letterSpacing: 1.2 },
  navLabel: { textTransform: 'uppercase', letterSpacing: 0.95 },
  numeric: { letterSpacing: 0.65 },
} as const;

export const shadow = {
  accentBtn: { shadowColor: '#EC3013', shadowOpacity: 0.28, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  accentPlay: { shadowColor: '#EC3013', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  sheet: { shadowColor: '#262322', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 12 },
} as const;

/** Шрифт: один гротеск с кириллицей, три начертания (expo-font). */
export const fontFamily = {
  400: 'GolosText-Regular',
  600: 'GolosText-SemiBold',
  800: 'GolosText-ExtraBold',
} as const;

export type ThemeName = 'light' | 'dark';
export type Theme = {
  name: ThemeName;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  type: typeof type;
  typeCase: typeof typeCase;
  shadow: typeof shadow;
  fontFamily: typeof fontFamily;
};

export const ThemeNameContext = createContext<ThemeName | null>(null);

function buildTheme(name: ThemeName): Theme {
  return { name, colors: palette[name], spacing, radius, type, typeCase, shadow, fontFamily };
}

export function useTheme(override?: ThemeName): Theme {
  const system = useColorScheme();
  const ctx = useContext(ThemeNameContext);
  const name: ThemeName = override ?? ctx ?? (system === 'dark' ? 'dark' : 'light');
  return buildTheme(name);
}

export function useResolvedThemeName(pref: 'system' | ThemeName): ThemeName {
  const system = useColorScheme();
  if (pref === 'system') return system === 'dark' ? 'dark' : 'light';
  return pref;
}

/**
 * playerTheme.ts больше не нужен как отдельная палитра: плеер — это dark-палитра
 * выше. Оставьте `usePlayerTheme()` как алиас `useTheme('dark').colors`, чтобы
 * не переписывать импорты за раз, и вычищайте по мере рефакторинга экранов.
 */
