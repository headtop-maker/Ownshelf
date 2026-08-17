import { Pressable, StyleSheet, View } from 'react-native';
import type { Book, Chapter } from '@/entities/book';
import { formatTime } from '@/shared/lib/format';
import { EqualizerBars, Text, useTheme } from '@/shared/ui';

type Props = {
  chapter: Chapter;
  book: Book;
  /** Файл сейчас проигрывается. */
  playing: boolean;
  /** Последний открытый / активный файл — выделяем строку. */
  current: boolean;
  /** Где остановились в этом файле, сек (>0). */
  positionSec?: number;
  onPress: () => void;
};

/** Строка файла-главы «Modernist»: номер/маркер · название · статус/время справа. */
export function ChapterRow({ chapter, book, playing, current, positionSec, onPress }: Props) {
  const { colors: c } = useTheme();
  const stopped = positionSec != null && positionSec > 0;
  const done = !stopped && chapter.index < book.progress.chapterIndex;

  const right = playing ? (
    <EqualizerBars color={c.accent} height={16} playing />
  ) : current && stopped ? (
    <Text variant="numeric" color={c.accent}>
      {formatTime(positionSec)} / {chapter.duration > 0 ? formatTime(chapter.duration) : '—'}
    </Text>
  ) : done ? (
    <Text variant="meta" color={c.subtle}>
      Прослушано
    </Text>
  ) : chapter.duration > 0 ? (
    <Text variant="numeric" color={c.subtle}>
      {formatTime(chapter.duration)}
    </Text>
  ) : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: c.hairline },
        current && { backgroundColor: c.accentTint },
        pressed && !current && { backgroundColor: c.accentTint },
      ]}
    >
      <View style={styles.numWrap}>
        {current ? (
          <View style={[styles.marker, { backgroundColor: c.accent }]} />
        ) : (
          <Text variant="numeric" color={c.subtle}>
            {String(chapter.index + 1).padStart(2, '0')}
          </Text>
        )}
      </View>
      <Text
        variant="row"
        color={current ? c.accentOnLightText : c.text}
        weight={current ? '800' : '600'}
        numberOfLines={1}
        style={styles.title}
      >
        {chapter.title}
      </Text>
      <View style={styles.right}>{right}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1 },
  numWrap: { width: 18, alignItems: 'flex-start', justifyContent: 'center' },
  marker: { width: 8, height: 8 },
  title: { flex: 1 },
  right: { minWidth: 40, alignItems: 'flex-end' },
});
