import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from './BottomSheet';
import { Text } from './Text';
import { useTheme } from './theme';

export type SheetAction = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  /** Явный цвет иконки/текста/подложки действия (перекрывает accent/danger по умолчанию). */
  tint?: string;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: SheetAction[];
  /** Цвет текста кнопки «Отмена» (по умолчанию — приглушённый). */
  cancelColor?: string;
};

/** Нижний шит-меню действий: ручка, заголовок, карточка кнопок с разделителями, отдельная «Отмена». */
export function ActionSheet({ visible, onClose, title, actions, cancelColor }: Props) {
  const t = useTheme();
  const P = t.colors;
  const insets = useSafeAreaInsets();

  const run = (a: SheetAction) => {
    onClose();
    a.onPress();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View
        style={[
          styles.sheet,
          { backgroundColor: P.bg, paddingBottom: insets.bottom + 10, borderTopLeftRadius: t.radius.sheet, borderTopRightRadius: t.radius.sheet },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: P.divider }]} />
        {title ? (
          <Text variant="cardTitle" color={P.subtle} numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        ) : null}

        <View style={styles.group}>
          {actions.map((a, i) => {
            const fill = a.tint ?? (a.destructive ? P.danger : P.accent);
            return (
              <Pressable
                key={i}
                onPress={() => run(a)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: fill, opacity: pressed ? 0.85 : 1, borderRadius: t.radius.sm },
                ]}
              >
                {a.icon ? <Ionicons name={a.icon} size={20} color={P.accentText} style={styles.cardIcon} /> : null}
                <Text variant="cardTitle" color={P.accentText}>
                  {a.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.cancel,
            { borderRadius: t.radius.sm },
            cancelColor
              ? { backgroundColor: cancelColor, opacity: pressed ? 0.85 : 1 }
              : { backgroundColor: pressed ? P.surfaceAlt : P.surface },
          ]}
        >
          <Text variant="cardTitle" color={cancelColor ? P.accentText : P.textMuted}>
            Отмена
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingTop: 8, paddingHorizontal: 12 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  title: { textAlign: 'left', letterSpacing: 0.5, marginBottom: 10, paddingHorizontal: 6 },
  group: { gap: 10 },
  card: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  cardIcon: { marginRight: 10 },
  cancel: { marginTop: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
});
