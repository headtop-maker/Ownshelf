import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/app-store';
import {
  bookProgressFraction,
  bookRemainingSeconds,
  chapterPosition,
  removeBook,
  resetBookProgress,
  selectBookById,
} from '@/entities/book';
import { selectPlayback } from '@/entities/playback';
import { deleteBookFiles } from '@/features/import-book';
import { EditMetaModal } from '@/features/edit-book-meta';
import { usePlayer } from '@/features/player-controls';
import { formatDurationHuman, formatTime } from '@/shared/lib/format';
import { ActionSheet, Button, type SheetAction, Text, useTheme } from '@/shared/ui';
import { BookCover } from '@/widgets/book-card';
import { ChapterRow } from '@/widgets/chapter-list';
import { PLAYER_BAR_RESERVED, PlayerBar } from '@/widgets/player-bar';

const PAD = 16;

/** Экран книги «Modernist»: hero-обложка, мета, кнопки, прогресс, список файлов. */
export function BookDetailsPage() {
  const { colors: c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const { id } = useLocalSearchParams<{ id: string }>();
  const book = useAppSelector(selectBookById(id));
  const pb = useAppSelector(selectPlayback);
  const player = usePlayer();
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Стабильная ссылка на колбэк: страница ре-рендерится ежесекундно при активном плеере
  // (тикает pb.positionSec), а инлайн-`() => setEditing(false)` пересоздавался бы на каждый такой
  // ре-рендер и мог рвать активные жесты внутри BottomSheet/ActionSheet модалки редактирования.
  const closeEditing = useCallback(() => setEditing(false), []);

  if (!book) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
        <Text color={c.textMuted} style={{ padding: 16 }}>
          Книга не найдена
        </Text>
      </SafeAreaView>
    );
  }

  const isCurrent = pb.bookId === book.id;
  const started = book.progress.updatedAt > 0;
  const lastIndex = book.progress.chapterIndex;
  const resumeSec = isCurrent ? pb.positionSec : chapterPosition(book, lastIndex);
  const percent = Math.round(bookProgressFraction(book) * 100);

  const playChapter = (index: number) => {
    if (isCurrent) {
      if (index !== pb.chapterIndex) player.goToChapter(index);
    } else {
      player.openBook(book, { resume: true, startChapter: index });
    }
    router.push('/player');
  };

  const listenFromStart = () => {
    dispatch(resetBookProgress(book.id));
    player.openBook(book, { resume: false });
    router.push('/player');
  };

  const confirmDelete = () => {
    Alert.alert('Удалить книгу?', 'Файлы книги и прогресс будут удалены.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await deleteBookFiles(book.id);
          dispatch(removeBook(book.id));
          router.back();
        },
      },
    ]);
  };

  const menuActions: SheetAction[] = [
    { label: 'Редактировать', icon: 'create-outline', tint: c.info, onPress: () => setEditing(true) },
    { label: 'Слушать сначала', icon: 'refresh-outline', tint: c.success, onPress: listenFromStart },
    { label: 'Удалить книгу', icon: 'trash-outline', destructive: true, onPress: confirmDelete },
  ];

  const heroW = width - PAD * 2;

  const header = (
    <View style={styles.headerBlock}>
      <BookCover
        id={book.id}
        title={book.title}
        uri={book.coverUri}
        width={heroW}
        height={176}
        radius={10}
        iconSize={64}
      />
      <Text variant="bookTitleLarge" color={c.text} style={styles.title}>
        {book.title}
      </Text>
      <Text variant="meta" color={c.textMuted} style={styles.meta}>
        {book.chapters.length} файлов · {formatDurationHuman(book.totalDuration)}
        {book.author ? ` · ${book.author}` : ''}
      </Text>

      <View style={styles.btnRow}>
        <Button
          title={started ? `Продолжить ${formatTime(resumeSec)}` : 'Слушать'}
          align="left"
          onPress={() => playChapter(started ? lastIndex : 0)}
          style={styles.btnGrow}
        />
        {started ? <Button title="Сначала" variant="secondary" onPress={listenFromStart} /> : null}
      </View>

      {started ? (
        <View style={styles.progressBlock}>
          <View style={[styles.track, { backgroundColor: c.hairline }]}>
            <View style={[styles.fill, { width: `${percent}%`, backgroundColor: c.accent }]} />
          </View>
          <Text variant="numeric" color={c.text} style={styles.progressText}>
            {percent}% · осталось {formatDurationHuman(bookRemainingSeconds(book))}
          </Text>
        </View>
      ) : null}

      <Text variant="kicker" color={c.accent} style={styles.filesKicker}>
        Файлы · {book.chapters.length}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top', 'left', 'right']}>
      <View style={styles.topbar}>
        <Pressable hitSlop={12} onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={20} color={c.text} />
          <Text variant="cardTitle" color={c.text}>
            Библиотека
          </Text>
        </Pressable>
        <Pressable hitSlop={10} onPress={() => setMenuOpen(true)}>
          <Feather name="more-vertical" size={22} color={c.text} />
        </Pressable>
      </View>
      <View style={[styles.divider, { backgroundColor: c.divider }]} />

      <FlatList
        data={book.chapters}
        keyExtractor={(ch) => ch.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + (pb.bookId !== null && pb.status !== 'idle' ? PLAYER_BAR_RESERVED : 24) },
        ]}
        ListHeaderComponent={header}
        renderItem={({ item: ch }) => {
          const focusedIndex = isCurrent ? pb.chapterIndex : started ? lastIndex : -1;
          const savedSec = chapterPosition(book, ch.index);
          return (
            <ChapterRow
              chapter={ch}
              book={book}
              current={ch.index === focusedIndex}
              playing={isCurrent && pb.chapterIndex === ch.index && pb.status === 'playing'}
              positionSec={savedSec > 0 ? savedSec : undefined}
              onPress={() => playChapter(ch.index)}
            />
          );
        }}
      />

      <PlayerBar />
      <EditMetaModal book={book} visible={editing} onClose={closeEditing} />
      <ActionSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={book.title} actions={menuActions} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  divider: { height: 1, marginHorizontal: PAD },
  listContent: { paddingHorizontal: PAD, paddingTop: 14 },
  headerBlock: { marginBottom: 6 },
  title: { marginTop: 14 },
  meta: { marginTop: 6 },
  btnRow: { flexDirection: 'row', gap: 6, marginTop: 14 },
  btnGrow: { flex: 1 },
  progressBlock: { marginTop: 12, gap: 6 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  progressText: {},
  filesKicker: { marginTop: 20, marginBottom: 2 },
});
