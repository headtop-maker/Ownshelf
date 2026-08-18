import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useAppSelector } from '@/app-store';
import { selectBookById } from '@/entities/book';
import {
  selectPlaybackBookId,
  selectPlaybackChapterIndex,
  selectPlaybackRate,
  selectPlaybackStatus,
} from '@/entities/playback';
import { selectSettings } from '@/entities/settings';
import { PlaybackProgress, usePlayer } from '@/features/player-controls';
import { useSleepTimer } from '@/features/sleep-timer';
import { SPEED_PRESETS } from '@/shared/config/constants';
import { cycleSpeed } from '@/shared/lib/speed';
import { EqualizerBars, Text, usePlayerTheme } from '@/shared/ui';
import { BookCover } from '@/widgets/book-card';
import { ChaptersSheet } from '@/widgets/chapter-list';
import { PlayerTransport } from './PlayerTransport';

type Props = { onOpenSleep: () => void };

const PAD = 16;
const COVER_H = 230;

/** Плеер «Modernist»: тёмный ground, обложка-полоса, штрих-seekbar, круглая play, нижняя панель. */
export function NowPlaying({ onOpenSleep }: Props) {
  const P = usePlayerTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  // Узкие селекторы вместо `selectPlayback` целиком — позиция тикает раз в секунду и живёт
  // изолированно внутри `PlaybackProgress`, чтобы не ре-рендерить весь экран (обложку, эквалайзер,
  // транспорт, нижнюю панель) каждую секунду.
  const bookId = useAppSelector(selectPlaybackBookId);
  const chapterIndex = useAppSelector(selectPlaybackChapterIndex);
  const status = useAppSelector(selectPlaybackStatus);
  const rate = useAppSelector(selectPlaybackRate);
  const book = useAppSelector(selectBookById(bookId ?? undefined));
  const { skipSeconds } = useAppSelector(selectSettings);
  const player = usePlayer();
  const { sleep } = useSleepTimer();
  const [chaptersOpen, setChaptersOpen] = useState(false);

  const chapter = book?.chapters[chapterIndex];

  if (!book || !chapter) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: P.bg }]}>
        <Text color={P.textMuted}>Ничего не воспроизводится</Text>
      </View>
    );
  }

  const isPlaying = status === 'playing';
  const rateLabel = rate.toFixed(2).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',') + '×';
  const sleepOn = sleep.mode !== 'off';

  return (
    <View style={[styles.root, { backgroundColor: P.bg }]}>
      {/* Шапка: свернуть · файл N из M / книга · закрыть книгу */}
      <View style={[styles.topbar, { paddingHorizontal: PAD }]}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Feather name="chevron-down" size={26} color={P.text} />
        </Pressable>
        <View style={styles.topTitle} pointerEvents="none">
          <Text variant="kicker" color={P.accentLine} numberOfLines={1} style={styles.center}>
            Файл {String(chapterIndex + 1).padStart(2, '0')} из {book.chapters.length}
          </Text>
          <Text variant="meta" color={P.textMuted} numberOfLines={1} style={styles.center}>
            {book.title}
          </Text>
        </View>
        <Pressable
          hitSlop={10}
          style={styles.closeBtn}
          onPress={() => {
            player.closePlayer();
            router.back();
          }}
        >
          <Text variant="navLabel" color={P.text}>
            Закрыть
          </Text>
          <Feather name="x" size={22} color={P.text} />
        </Pressable>
      </View>

      {/* Обложка-полоса на всю ширину, скругление снизу; эквалайзер при игре */}
      <View style={[styles.coverWrap, { width, height: COVER_H }]}>
        <BookCover
          id={book.id}
          title={book.title}
          uri={book.coverUri}
          width={width}
          height={COVER_H}
          radius={0}
          iconSize={72}
        />
        {isPlaying ? (
          <View style={styles.eq}>
            <EqualizerBars color={P.accentLine} height={22} playing bars={4} />
          </View>
        ) : null}
      </View>

      <View style={[styles.body, { paddingHorizontal: PAD }]}>
        <View style={styles.titleBlock}>
          <Text variant="playerTitle" color={P.text} numberOfLines={2}>
            {chapter.title}
          </Text>
          <Text variant="meta" color={P.textMuted} numberOfLines={1}>
            {book.title}
          </Text>
        </View>

        <PlaybackProgress
          fallbackDuration={chapter.duration}
          color={P.accentLine}
          trackColor={P.track}
          textColor={P.text}
          textMutedColor={P.textMuted}
        />

        <PlayerTransport
          isPlaying={isPlaying}
          isFirst={chapterIndex <= 0}
          isLast={chapterIndex >= book.chapters.length - 1}
          accent={P.accent}
          accentText={P.onMint}
          line={P.text}
          border={P.border}
          skipSeconds={skipSeconds}
          onPrev={player.prevChapter}
          onRewind={() => player.seekBy(-skipSeconds)}
          onToggle={player.toggle}
          onForward={() => player.seekBy(skipSeconds)}
          onNext={player.nextChapter}
        />

        <View style={[styles.bottomBar, { borderTopColor: P.divider }]}>
          <Pressable style={styles.bottomBtn} onPress={() => player.setRate(cycleSpeed(rate, SPEED_PRESETS))}>
            <Text variant="navLabel" color={P.text}>
              {rateLabel}
            </Text>
          </Pressable>
          <Pressable style={styles.bottomBtn} onPress={onOpenSleep}>
            <Text variant="navLabel" color={sleepOn ? P.accentLine : P.text}>
              {sleepOn ? 'Таймер вкл' : 'Таймер сна'}
            </Text>
          </Pressable>
          <Pressable style={styles.bottomBtn} onPress={() => setChaptersOpen(true)}>
            <Text variant="navLabel" color={P.text}>
              Файлы
            </Text>
          </Pressable>
        </View>
      </View>

      <ChaptersSheet
        visible={chaptersOpen}
        onClose={() => setChaptersOpen(false)}
        chapters={book.chapters}
        currentIndex={chapterIndex}
        onSelect={player.goToChapter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 12,
    position: 'relative',
  },
  // Абсолютный центр по всей ширине шапки — иначе из-за разной ширины chevron/«Закрыть» заголовок съезжает.
  topTitle: { position: 'absolute', left: 100, right: 100, top: 0, bottom: 0, justifyContent: 'center', gap: 2 },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coverWrap: { overflow: 'hidden', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  eq: { position: 'absolute', right: 16, bottom: 14 },
  body: { flex: 1, paddingTop: 20 },
  titleBlock: { gap: 6 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', borderTopWidth: 1, paddingTop: 16, paddingBottom: 8 },
  bottomBtn: { flex: 1, alignItems: 'flex-start' },
});
