import { type ReactNode } from 'react';
import { ThemeNameContext, useResolvedThemeName, type ThemeName } from './theme';

/** Прокидывает разрешённое имя темы в контекст. `pref` приходит из настроек (app-слой). */
export function ThemeModeProvider({
  pref,
  children,
}: {
  pref: 'system' | ThemeName;
  children: ReactNode;
}) {
  const name = useResolvedThemeName(pref);
  return <ThemeNameContext.Provider value={name}>{children}</ThemeNameContext.Provider>;
}
