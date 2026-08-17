import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { bookProgressFraction, bookRemainingSeconds, type Book } from '@/entities/book';
import { formatDurationHuman } from '@/shared/lib/format';
import { ProgressRing, Text, useTheme } from '@/shared/ui';
import { BookCover } from '@/widgets/book-card';

/** Секция «Продолжить»: одна крупная карточка последней книги — обложка, мета, прогресс, play. */
export function ContinueRow({ books, onPressBook }: { books: Book[]; onPressBook: (b: Book) => void }) {
  const { colors: c } = useTheme();
  const book = books[0];
  if (!book) return null;

  const frac = bookProgressFraction(book);
  const percent = Math.round(frac * 100);
  const fileNo = String(book.progress.chapterIndex + 1).padStart(2, '0');
  const remaining = formatDurationHuman(bookRemainingSeconds(book));

  return (
    <View style={[styles.card, { borderColor: c.divider }]}>
      <Pressable style={styles.tap} onPress={() => onPressBook(book)}>
        <BookCover
          id={book.id}
          title={book.title}
          uri={book.coverUri}
          size={76}
          radius={10}
          centerContent={
            <ProgressRing size={48} strokeWidth={3} frac={frac} color="#FBFAF9" trackColor="rgba(251,250,249,0.35)">
              <Ionicons name="play" size={18} color="#FBFAF9" style={styles.ringPlayIcon} />
            </ProgressRing>
          }
        />
        <View style={styles.mid}>
          <Text variant="cardTitle" color={c.text} numberOfLines={2}>
            {book.title}
          </Text>
          <Text variant="meta" color={c.textMuted} numberOfLines={1}>
            Файл {fileNo} из {book.chapters.length} · осталось {remaining}
          </Text>
          <View style={styles.progressRow}>
            <View style={[styles.track, { backgroundColor: c.hairline }]}>
              <View style={[styles.fill, { width: `${percent}%`, backgroundColor: c.accent }]} />
            </View>
            <Text variant="numeric" color={c.text}>
              {percent}%
            </Text>
          </View>
        </View>
      </Pressable>
      <Pressable style={[styles.playBtn, { backgroundColor: c.accent }]} onPress={() => onPressBook(book)}>
        <Ionicons name="play" size={20} color={c.accentText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 12,
    gap: 12,
  },
  tap: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  mid: { flex: 1, gap: 6 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  playBtn: { width: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ringPlayIcon: { marginLeft: 2 },
});
