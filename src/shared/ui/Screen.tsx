import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './theme';

type Props = {
  children: ReactNode;
  edges?: readonly Edge[];
  padded?: boolean;
  style?: ViewStyle;
};

/** Экран с фоном темы и safe-area. */
export function Screen({ children, edges = ['top', 'left', 'right'], padded, style }: Props) {
  const t = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: t.colors.bg }]}>
      <View style={[styles.content, padded && { padding: t.spacing.lg }, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
