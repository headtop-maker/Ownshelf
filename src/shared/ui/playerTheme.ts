import { palette } from './theme';

/**
 * Плеер и мини-плеер в редизайне «Modernist» всегда тёмные, независимо от темы приложения.
 * `usePlayerTheme()` — фиксированная тёмная палитра. Legacy-ключи (mint/onMint/thumb/track/radius)
 * оставлены для совместимости; вычищаются по мере миграции экранов на `useTheme('dark')`.
 */
export type PlayerPalette = {
  bg: string;
  accent: string;
  /** Акцент для линий/текста на тёмном (светлее заливки). */
  accentLine: string;
  mint: string;
  text: string;
  textMuted: string;
  subtle: string;
  divider: string;
  border: string;
  track: string;
  thumb: string;
  onMint: string;
  danger: string;
  radius: number;
};

const d = palette.dark;

const dark: PlayerPalette = {
  bg: d.bg,
  accent: d.accent,
  accentLine: '#FF563C',
  mint: d.accent,
  text: d.text,
  textMuted: d.textMuted,
  subtle: d.subtle,
  divider: d.divider,
  border: d.border,
  track: 'rgba(251,250,249,0.22)',
  thumb: d.surface,
  onMint: d.accentText,
  danger: d.danger,
  radius: 8,
};

/** Тёмная палитра плеера (фиксированная). */
export function usePlayerTheme(): PlayerPalette {
  return dark;
}

export type PlayerTheme = PlayerPalette;
