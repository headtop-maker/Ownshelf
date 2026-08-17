import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/app-store';
import { removeBook, selectBooks, type Book } from '@/entities/book';
import { selectPlayback } from '@/entities/playback';
import { deleteBookFiles } from '@/features/import-book';
import { usePlayer } from '@/features/player-controls';
import { bookDirSize } from '@/shared/lib/bookStorage';
import { formatBytes } from '@/shared/lib/format';
import { Button, Checkbox, Text, useTheme } from '@/shared/ui';
import { BookCover } from '@/widgets/book-card';

const PAD = 16;
const THUMB = 44;

type Row = { book: Book; size: number };

/** Управление хранилищем: список книг с их весом на диске, точечное удаление для освобождения места. */
export function StorageSettingsPage() {
  const { colors: c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const books = useAppSelector(selectBooks);
  const pb = useAppSelector(selectPlayback);
  const player = usePlayer();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows: Row[] = useMemo(() => books.map((book) => ({ book, size: bookDirSize(book.id) })), [books]);
  const totalSize = useMemo(() => rows.reduce((sum, r) => sum + r.size, 0), [rows]);
  const selectedSize = useMemo(
    () => rows.filter((r) => selected.has(r.book.id)).reduce((sum, r) => sum + r.size, 0),
    [rows, selected],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmDelete = () => {
    const n = selected.size;
    if (n === 0) return;
    Alert.alert(
      `Удалить ${n} ${n === 1 ? 'книгу' : 'книги'}?`,
      `Освободится ${formatBytes(selectedSize)}. Файлы и прогресс будут удалены.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            const ids = [...selected];
            if (pb.bookId && ids.includes(pb.bookId)) player.closePlayer();
            for (const id of ids) {
              await deleteBookFiles(id);
              dispatch(removeBook(id));
            }
            setSelected(new Set());
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={20} color={c.text} />
          <Text variant="cardTitle" color={c.text}>
            Хранилище
          </Text>
        </Pressable>
      </View>
      <View style={[styles.divider, { backgroundColor: c.divider }]} />

      <Text variant="kicker" color={c.accent} style={styles.summary}>
        {books.length} {books.length === 1 ? 'книга' : 'книг'} · {formatBytes(totalSize)}
      </Text>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="hard-drive" size={40} color={c.subtle} />
          <Text variant="row" color={c.subtle}>
            Пока нет книг в библиотеке.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.book.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: selected.size > 0 ? insets.bottom + 96 : insets.bottom + 16 },
          ]}
          renderItem={({ item }) => (
            <Pressable onPress={() => toggle(item.book.id)} style={[styles.row, { borderBottomColor: c.hairline }]}>
              <BookCover id={item.book.id} title={item.book.title} uri={item.book.coverUri} size={THUMB} radius={8} />
              <View style={{ flex: 1 }}>
                <Text variant="row" color={c.text} weight="600" numberOfLines={1}>
                  {item.book.title}
                </Text>
                <Text variant="meta" color={c.textMuted}>
                  {formatBytes(item.size)}
                </Text>
              </View>
              <Checkbox checked={selected.has(item.book.id)} onToggle={() => toggle(item.book.id)} color={c.danger} />
            </Pressable>
          )}
        />
      )}

      {selected.size > 0 ? (
        <View style={[styles.footer, { borderTopColor: c.divider, paddingBottom: insets.bottom + PAD }]}>
          <Button
            title={`Удалить (${selected.size}) · освободить ${formatBytes(selectedSize)}`}
            variant="danger"
            onPress={confirmDelete}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  divider: { height: 1, marginHorizontal: PAD },
  summary: { paddingHorizontal: PAD, paddingTop: 14, paddingBottom: 4 },
  list: { paddingHorizontal: PAD, paddingTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  footer: { padding: PAD, borderTopWidth: 1 },
});
