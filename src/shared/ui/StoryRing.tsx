import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { View } from 'react-native';
import { usePlayerTheme } from './playerTheme';

/** Градиентное кольцо вокруг круглой обложки — как «истории» в Instagram. */
export function StoryRing({ size, children }: { size: number; children: ReactNode }) {
  const P = usePlayerTheme();
  return (
    <LinearGradient
      colors={['#feda75', '#fa7e1e', '#d62976', '#962fbf', '#4f5bd5']}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ backgroundColor: P.bg, borderRadius: size / 2, padding: 2 }}>{children}</View>
    </LinearGradient>
  );
}
