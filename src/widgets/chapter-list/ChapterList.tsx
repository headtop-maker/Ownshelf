import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { Chapter } from '@/entities/book';
import { formatTime } from '@/shared/lib/format';
import { Text, usePlayerTheme } from '@/shared/ui';

type Props = {
  chapters: Chapter[];
  currentIndex: number;
  onSelect: (index: number) => void;
};

/** Виртуализированный список глав (простые строки) — для тёмного шита плеера. */
export function ChapterList({ chapters, currentIndex, onSelect }: Props) {
  const P = usePlayerTheme();
  return (
    <FlatList
      data={chapters}
      keyExtractor={(ch) => ch.id}
      renderItem={({ item: ch }) => {
        const active = ch.index === currentIndex;
        return (
          <Pressable
            onPress={() => onSelect(ch.index)}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: P.divider },
              active && { backgroundColor: P.accent + '22' },
              pressed && !active && { backgroundColor: P.accent + '14' },
            ]}
          >
            <View style={styles.numWrap}>
              {active ? (
                <View style={[styles.marker, { backgroundColor: P.accentLine }]} />
              ) : (
                <Text variant="numeric" color={P.subtle}>
                  {String(ch.index + 1).padStart(2, '0')}
                </Text>
              )}
            </View>
            <Text
              variant="row"
              color={active ? P.accentLine : P.text}
              weight={active ? '800' : '600'}
              numberOfLines={1}
              style={styles.title}
            >
              {ch.title}
            </Text>
            {ch.duration > 0 ? (
              <Text variant="numeric" color={P.subtle}>
                {formatTime(ch.duration)}
              </Text>
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 6, borderBottomWidth: 1 },
  numWrap: { width: 20, alignItems: 'flex-start', justifyContent: 'center' },
  marker: { width: 8, height: 8 },
  title: { flex: 1 },
});
