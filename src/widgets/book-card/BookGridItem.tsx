import { Feather } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { bookProgressFraction, isBookStarted, type Book } from '@/entities/book';
import { EditMetaModal } from '@/features/edit-book-meta';
import { Text, useTheme } from '@/shared/ui';
import { BookCover } from './BookCover';

/**
 * Ячейка сетки библиотеки «Modernist»: обложка (или иконка мелодии) с полосой прогресса + название + мета.
 * Карандаш в углу открывает редактирование названия/обложки напрямую — книги с одним файлом открываются
 * сразу в плеере и иначе к этому экрану было не добраться.
 */
export function BookGridItem({ book, width, onPress }: { book: Book; width: number; onPress: () => void }) {
  const { colors: c } = useTheme();
  const started = isBookStarted(book);
  const meta = book.author?.trim() || `${book.chapters.length} файлов`;
  const [editing, setEditing] = useState(false);
  // Стабильная ссылка — см. тот же комментарий в BookDetailsPage.tsx.
  const closeEditing = useCallback(() => setEditing(false), []);

  return (
    <Pressable style={{ width }} onPress={onPress}>
      <View>
        <BookCover
          id={book.id}
          title={book.title}
          uri={book.coverUri}
          size={width}
          radius={10}
          progress={started ? bookProgressFraction(book) : 0}
          accent={c.accent}
        />
        <Pressable hitSlop={8} onPress={() => setEditing(true)} style={styles.editBadge}>
          <Feather name="edit-2" size={13} color="#FBFAF9" />
        </Pressable>
      </View>
      <Text variant="gridTitle" color={c.text} numberOfLines={2} style={styles.title}>
        {book.title}
      </Text>
      <Text variant="meta" color={c.textMuted} numberOfLines={1}>
        {meta}
      </Text>

      <EditMetaModal book={book} visible={editing} onClose={closeEditing} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 6 },
  editBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(38,35,34,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
