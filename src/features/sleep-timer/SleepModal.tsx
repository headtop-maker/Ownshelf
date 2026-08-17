import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SLEEP_OPTIONS } from '@/shared/config/constants';
import { Text, usePlayerTheme } from '@/shared/ui';
import { useSleepTimer } from './hooks/useSleepTimer';

type Props = { visible: boolean; onClose: () => void };

/** Шит таймера сна (тёмный, поверх плеера): решётка пресетов, «До конца файла» акцентом. */
export function SleepModal({ visible, onClose }: Props) {
  const P = usePlayerTheme();
  const insets = useSafeAreaInsets();
  const { sleep, setMinutes, setEndOfChapter, cancel } = useSleepTimer();

  const pick = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: P.bg, paddingBottom: insets.bottom + 16 }]}
          onPress={() => {}}
        >
          <Text variant="cardTitle" color={P.accentLine}>
            Таймер сна
          </Text>
          <View style={[styles.grid, { backgroundColor: P.divider }]}>
            {SLEEP_OPTIONS.map((m) => (
              <Pressable
                key={m}
                onPress={() => pick(() => setMinutes(m))}
                style={[styles.cell, { backgroundColor: P.bg }]}
              >
                <Text variant="row" color={P.text} weight="800">
                  {m} мин
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => pick(setEndOfChapter)}
              style={[styles.cell, styles.wide, { backgroundColor: P.accent }]}
            >
              <Text variant="row" color={P.onMint} weight="800">
                До конца файла
              </Text>
            </Pressable>
          </View>
          {sleep.mode !== 'off' ? (
            <Pressable onPress={() => pick(cancel)} style={[styles.disable, { borderColor: P.border }]}>
              <Text variant="navLabel" color={P.text}>
                Выключить таймер
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(38,35,34,0.55)' },
  sheet: { padding: 16, gap: 14, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  // Зазор 1px «решёткой»: фон контейнера = divider, ячейки перекрывают его, оставляя тонкие линии.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 1, borderRadius: 10, overflow: 'hidden' },
  cell: { flexGrow: 1, flexBasis: '32%', paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  wide: { flexBasis: '100%' },
  disable: { borderWidth: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
});
