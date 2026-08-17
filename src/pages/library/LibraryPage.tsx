import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, SectionList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from '@/app-store';
import { isBookStarted, selectInProgress, type Book } from '@/entities/book';
import { LIBRARY_FILTERS, useLibraryFilter } from '@/features/library-filter';
import { SandboxBrowserSheet, useImportBook } from '@/features/import-book';
import { PcUploadSheet } from '@/features/pc-upload';
import { usePlayer } from '@/features/player-controls';
import { ActionSheet, type SheetAction, SearchBar, Text, useTheme } from '@/shared/ui';
import { BookGridItem } from '@/widgets/book-card';
import { ContinueRow } from '@/widgets/continue-row';
import { PLAYER_BAR_RESERVED, PlayerBar } from '@/widgets/player-bar';

const PAD = 16;
const GAP = 10;
const COLUMNS = 2;

/** Главная (библиотека) «Modernist»: шапка, поиск, сегменты, «Продолжить», сетка книг. */
export function LibraryPage() {
  const { colors: c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { books, sections, query, setQuery, filter, setFilter, sort, setSort } = useLibraryFilter(COLUMNS);
  const inProgress = useAppSelector(selectInProgress);
  const hasPlayer = useAppSelector((s) => s.playback.bookId !== null && s.playback.status !== 'idle');
  const { importFiles, importFolder, busy } = useImportBook();
  const player = usePlayer();
  const [addOpen, setAddOpen] = useState(false);
  const [pcUploadOpen, setPcUploadOpen] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);

  const counts = useMemo(() => {
    const reading = books.filter(isBookStarted).length;
    return { all: books.length, reading, new: books.length - reading };
  }, [books]);

  // Одна глава (один файл) → сразу в плеер; иначе — экран книги со списком глав.
  const openBook = (b: Book) => {
    if (b.chapters.length === 1) {
      player.openBook(b, { resume: true });
      router.push('/player');
    } else {
      router.push({ pathname: '/book/[id]', params: { id: b.id } });
    }
  };
  const cardW = (width - PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  // Цвет группирует источник: success — с устройства, info — по сети с ПК (токены темы).
  const addActions: SheetAction[] = [
    { label: 'Выбрать файлы', icon: 'document-text-outline', tint: c.success, onPress: () => void importFiles() },
    { label: 'Выбрать папку', icon: 'folder-outline', tint: c.success, onPress: () => void importFolder() },
    // Файлы, уже лежащие в песочнице приложения (например, залитые вручную) — та же группа «локальный источник».
    { label: 'Файлы в песочнице', icon: 'archive-outline', tint: c.success, onPress: () => setSandboxOpen(true) },
    // Локальный HTTP-сервер приёма — реализован только нативным Android-модулем.
    ...(Platform.OS === 'android'
      ? [{ label: 'Загрузить с ПК', icon: 'wifi-outline' as const, tint: c.info, onPress: () => setPcUploadOpen(true) }]
      : []),
  ];

  const listHeader = (
    <View style={styles.listHeader}>
      {inProgress.length > 0 ? (
        <View style={styles.section}>
          <Text variant="kicker" color={c.accent}>
            Продолжить
          </Text>
          <ContinueRow books={inProgress} onPressBook={openBook} />
        </View>
      ) : null}
      <View style={styles.gridTitleRow}>
        <Text variant="kicker" color={c.accent}>
          Библиотека · {counts.all}
        </Text>
        <Pressable hitSlop={8} onPress={() => setSort(sort === 'alpha' ? 'recent' : 'alpha')} style={styles.sortBtn}>
          <Ionicons name="swap-vertical" size={14} color={sort === 'alpha' ? c.accent : c.subtle} />
          <Text variant="navLabel" color={sort === 'alpha' ? c.accent : c.subtle}>
            А–Я
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top', 'left', 'right']}>
      {/* Шапка */}
      <View style={styles.header}>
        <Text variant="cardTitle" color={c.text}>
          Мои книги
        </Text>
        <View style={styles.headerActions}>
          <IconBtn icon="plus" color={c.text} border={c.divider} onPress={() => setAddOpen(true)} disabled={busy} />
          <IconBtn icon="settings" color={c.text} border={c.divider} onPress={() => router.push('/settings')} />
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: c.divider }]} />

      <View style={styles.searchWrap}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Поиск по названию или файлу" />
      </View>

      <View style={styles.filters}>
        {LIBRARY_FILTERS.map((f) => {
          const on = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.seg,
                on ? { backgroundColor: c.accent } : { borderWidth: 1, borderColor: c.divider },
              ]}
            >
              <Text variant="navLabel" color={on ? c.accentText : c.textMuted}>
                {f.label} · {counts[f.key]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {books.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="book-open" size={48} color={c.subtle} />
          <Text variant="cardTitle" color={c.textMuted} style={styles.center}>
            Пока пусто
          </Text>
          <Text variant="row" color={c.subtle} style={styles.center}>
            Нажмите «+», чтобы добавить аудиофайлы или папку с книгой.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(row, i) => row[0]?.id ?? String(i)}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + (hasPlayer ? PLAYER_BAR_RESERVED : 24) },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <Text variant="row" color={c.subtle} style={{ marginTop: 8 }}>
              Ничего не найдено
            </Text>
          }
          renderSectionHeader={({ section }) =>
            section.title ? (
              <Text variant="kicker" color={c.subtle} style={[styles.sectionHeader, { backgroundColor: c.bg }]}>
                {section.title}
              </Text>
            ) : null
          }
          renderItem={({ item: row }) => (
            <View style={[styles.row, { gap: GAP, marginBottom: GAP }]}>
              {row.map((b) => (
                <BookGridItem key={b.id} book={b} width={cardW} onPress={() => openBook(b)} />
              ))}
            </View>
          )}
        />
      )}

      <PlayerBar />
      <ActionSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        title="Добавить книгу"
        actions={addActions}
        cancelColor={c.accent}
      />
      {Platform.OS === 'android' ? (
        <PcUploadSheet visible={pcUploadOpen} onClose={() => setPcUploadOpen(false)} />
      ) : null}
      <SandboxBrowserSheet visible={sandboxOpen} onClose={() => setSandboxOpen(false)} />
    </SafeAreaView>
  );
}

/** Квадратная icon-кнопка 32×32 с контуром 1px (шапка библиотеки). */
function IconBtn({
  icon,
  color,
  border,
  onPress,
  disabled,
}: {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  border: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      hitSlop={10}
      onPress={onPress}
      disabled={disabled}
      style={[styles.iconBtn, { borderColor: border, opacity: disabled ? 0.5 : 1 }]}
    >
      <Feather name={icon} size={18} color={color} />
    </Pressable>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, marginHorizontal: PAD },
  searchWrap: { marginHorizontal: PAD, marginTop: 14 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: PAD, marginTop: 12, marginBottom: 8 },
  seg: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6 },
  listContent: { paddingHorizontal: PAD, paddingTop: 8 },
  listHeader: { gap: 14 },
  section: { gap: 10, marginTop: 4 },
  gridTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 10 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionHeader: { paddingTop: 12, paddingBottom: 6 },
  row: { flexDirection: 'row' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  center: { textAlign: 'center' },
});
