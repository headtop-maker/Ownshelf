import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from '@/app-store';
import { selectBookById } from '@/entities/book';
import { selectPlayback } from '@/entities/playback';
import { usePlayer } from '@/features/player-controls';
import { formatTime } from '@/shared/lib/format';
import { ProgressRing, Text, usePlayerTheme } from '@/shared/ui';
import { BookCover } from '@/widgets/book-card';

const DISMISS_THRESHOLD = 100;
const COVER = 48;

/** Высота, которую плавающий мини-плеер занимает над safe-area — списки резервируют её снизу. */
export const PLAYER_BAR_RESERVED = 90;

/**
 * Крутящийся аватар. Вынесен в memo-компонент: мини-плеер ре-рендерится каждые 500 мс
 * (тикает позиция), а перерисовка вью с запущенной нативной loop-анимацией сбивает её.
 * Пропсы не меняются при обновлении позиции → анимация крутится непрерывно.
 */
const SpinningCover = memo(function SpinningCover({
  id,
  title,
  uri,
  playing,
}: {
  id: string;
  title: string;
  uri?: string;
  playing: boolean;
}) {
  const [spin] = useState(() => new Animated.Value(0));
  const rotate = useMemo(() => spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }), [spin]);
  useEffect(() => {
    if (!playing) return;
    const anim = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true }),
    );
    anim.start();
    return () => anim.stop();
  }, [playing, spin]);
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <BookCover id={id} title={title} uri={uri} size={COVER} radius={COVER / 2} />
    </Animated.View>
  );
});

/** Мини-плеер: крутящийся круглый кавер, play/pause в кольце прогресса, next. Свайп вбок — закрыть. */
export function PlayerBar() {
  const P = usePlayerTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const player = usePlayer();
  const pb = useAppSelector(selectPlayback);
  const book = useAppSelector(selectBookById(pb.bookId ?? undefined));

  const [translateX] = useState(() => new Animated.Value(0));

  // На случай если предыдущая сессия закрылась свайпом (translateX уехал за экран) — сбросить
  // при старте новой, иначе бар после переоткрытия книги останется невидимым (тот же компонент
  // не размонтируется между сессиями, стейт translateX переживает закрытие).
  const wasIdle = useRef(true);
  useEffect(() => {
    const isIdle = pb.status === 'idle';
    if (wasIdle.current && !isIdle) translateX.setValue(0);
    wasIdle.current = isIdle;
  }, [pb.status, translateX]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_e, g) => translateX.setValue(g.dx),
        onPanResponderRelease: (_e, g) => {
          if (Math.abs(g.dx) > DISMISS_THRESHOLD) {
            const dir = g.dx > 0 ? 1 : -1;
            // Закрываем сразу, не дожидаясь колбэка анимации: колбэк .start() после жеста
            // не всегда доезжает (баг — аудио оставалось играть, хотя бар уезжал за экран).
            // Анимация ниже — чисто визуальная, для плавного ухода бара.
            player.closePlayer();
            Animated.timing(translateX, { toValue: dir * width, duration: 180, useNativeDriver: true }).start();
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        },
      }),
    [translateX, width, player],
  );

  // Стабильный узел интерполяции: пересоздание на каждый рендер отвязывало бы нативную анимацию.
  const opacity = useMemo(
    () => translateX.interpolate({ inputRange: [-width, 0, width], outputRange: [0.15, 1, 0.15] }),
    [translateX, width],
  );

  if (!book || pb.status === 'idle') return null;

  const chapter = book.chapters[pb.chapterIndex];
  const total = pb.duration || chapter?.duration || 0;
  const frac = total > 0 ? pb.positionSec / total : 0;
  const hasNext = pb.chapterIndex < book.chapters.length - 1;

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[styles.outer, { marginBottom: insets.bottom + 10, opacity, transform: [{ translateX }] }]}
    >
      <View style={[styles.card, { backgroundColor: P.bg }]}>
        <Pressable style={styles.row} onPress={() => router.push('/player')}>
        <SpinningCover id={book.id} title={book.title} uri={book.coverUri} playing={pb.status === 'playing'} />

        <View style={styles.meta}>
          <Text variant="gridTitle" color={P.text} numberOfLines={1}>
            {book.title}
          </Text>
          <Text variant="meta" color={P.textMuted} numberOfLines={1}>
            {(chapter?.title ?? '') + ' · ' + formatTime(pb.positionSec)}
          </Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation?.();
              player.toggle();
            }}
          >
            <ProgressRing size={40} strokeWidth={3} frac={frac} color={P.accent} trackColor={P.track}>
              <Feather name={pb.status === 'playing' ? 'pause' : 'play'} size={18} color={P.text} />
            </ProgressRing>
          </Pressable>
          {hasNext ? (
            <Pressable
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation?.();
                player.nextChapter();
              }}
              style={styles.nextBtn}
            >
              <Feather name="skip-forward" size={22} color={P.text} />
            </Pressable>
          ) : null}
        </View>
      </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Внешний слой — только тень (iOS: shadow*, без overflow). Клипа тут нет, чтобы тень не срезалась.
  // Плавает поверх контента (absolute) — под плеером виден список, а не белый фон страницы.
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    marginHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  // Внутренний слой — скругление + клип контента + elevation (Android). overflow:hidden чистит «рваные» углы.
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 12 },
  meta: { flex: 1, gap: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextBtn: { paddingHorizontal: 4 },
});
