import type { AudioMetadata, AudioStatus } from 'expo-audio';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useAppDispatch, useAppSelector, useAppStore } from '@/app-store';
import {
  type Book,
  type Chapter,
  chapterPosition,
  setChapterDuration,
  updateProgress,
} from '@/entities/book';
import {
  clearSession,
  clearSleep,
  resetTransient,
  setChapterIndex,
  setPosition,
  setRate as setRateAction,
  setStatus,
  startSession,
} from '@/entities/playback';
import { PROGRESS_SAVE_INTERVAL_MS } from '@/shared/config/constants';
import { audioService } from '@/shared/lib/audioService';

type PlayerActions = {
  /** Открыть книгу и начать воспроизведение. resume — с сохранённой позиции; startChapter — открыть конкретную главу (с её позиции). */
  openBook: (book: Book, opts?: { resume?: boolean; startChapter?: number }) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seekTo: (seconds: number) => void;
  seekBy: (delta: number) => void;
  goToChapter: (index: number) => void;
  nextChapter: () => void;
  prevChapter: () => void;
  setRate: (rate: number) => void;
  /** Полностью закрыть текущую книгу (сессия завершается, прогресс сохраняется). */
  closePlayer: () => void;
};

/** Метаданные для системного медиа-уведомления/локскрина. */
function buildNowPlayingMeta(book: Book, chapter: Chapter): AudioMetadata {
  return {
    title: book.title,
    artist: book.author ?? undefined,
    albumTitle: chapter.title,
    artworkUrl: book.coverUri ?? undefined,
  };
}

const PlayerContext = createContext<PlayerActions | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const lastSaveAt = useRef(0);

  const getBook = useCallback(
    (id: string | null): Book | undefined =>
      id ? store.getState().library.books[id] : undefined,
    [store],
  );

  /** Сохранить прогресс книги (позиция + глава). */
  const saveProgress = useCallback(() => {
    const pb = store.getState().playback;
    if (!pb.bookId) return;
    dispatch(
      updateProgress({
        id: pb.bookId,
        chapterIndex: pb.chapterIndex,
        positionSec: Math.floor(pb.positionSec),
      }),
    );
    lastSaveAt.current = Date.now();
  }, [dispatch, store]);

  const loadChapter = useCallback(
    (book: Book, index: number, positionSec: number, autoplay: boolean) => {
      const chapter = book.chapters[index];
      if (!chapter) return;
      const rate = store.getState().playback.rate;
      audioService.load(chapter.uri, { rate, positionSec });
      // Видимость медиа-уведомления управляется эффектом по playback.status (см. ниже).
      if (autoplay) {
        audioService.play();
        dispatch(setStatus('playing'));
      }
    },
    [dispatch, store],
  );

  const openBook = useCallback(
    (book: Book, opts?: { resume?: boolean; startChapter?: number }) => {
      const state = store.getState();
      const resume = (opts?.resume ?? true) && state.settings.autoResume;
      // startChapter приоритетнее: открыть конкретный файл; иначе — последняя активная глава.
      const index = opts?.startChapter ?? (resume ? book.progress.chapterIndex : 0);
      // Позиция — из самой главы (per-file). resume:false стартует главу с нуля.
      const pos = resume ? chapterPosition(book, index) : 0;
      // Свежая книга стартует со скоростью по умолчанию из настроек; начатая — сохраняет прошлую.
      if (book.progress.updatedAt === 0) {
        dispatch(setRateAction(state.settings.defaultRate));
      }
      dispatch(startSession({ bookId: book.id, chapterIndex: index, positionSec: pos }));
      dispatch(updateProgress({ id: book.id, chapterIndex: index, positionSec: pos }));
      loadChapter(book, index, pos, true);
    },
    [dispatch, loadChapter, store],
  );

  const play = useCallback(() => {
    audioService.play();
    dispatch(setStatus('playing'));
  }, [dispatch]);

  const pause = useCallback(() => {
    audioService.pause();
    dispatch(setStatus('paused'));
    saveProgress();
  }, [dispatch, saveProgress]);

  const toggle = useCallback(() => {
    const status = store.getState().playback.status;
    if (status === 'playing') pause();
    else play();
  }, [pause, play, store]);

  const seekTo = useCallback((seconds: number) => {
    void audioService.seekTo(seconds);
  }, []);

  const seekBy = useCallback((delta: number) => {
    void audioService.seekBy(delta);
  }, []);

  const goToChapter = useCallback(
    (index: number) => {
      const pb = store.getState().playback;
      const book = getBook(pb.bookId);
      if (!book || index < 0 || index >= book.chapters.length) return;
      if (index === pb.chapterIndex) return;
      // Сохранить позицию покидаемой главы перед переключением (per-file, без потери секунд).
      saveProgress();
      // Резюмируем позицию выбранной главы (per-file), а не с нуля.
      const pos = chapterPosition(book, index);
      dispatch(setChapterIndex(index));
      dispatch(updateProgress({ id: book.id, chapterIndex: index, positionSec: pos }));
      loadChapter(book, index, pos, true);
    },
    [dispatch, getBook, loadChapter, saveProgress, store],
  );

  const nextChapter = useCallback(() => {
    const pb = store.getState().playback;
    goToChapter(pb.chapterIndex + 1);
  }, [goToChapter, store]);

  const prevChapter = useCallback(() => {
    const pb = store.getState().playback;
    goToChapter(pb.chapterIndex - 1);
  }, [goToChapter, store]);

  const setRate = useCallback(
    (rate: number) => {
      audioService.setRate(rate);
      dispatch(setRateAction(rate));
    },
    [dispatch],
  );

  /** Полностью закрыть книгу: сохранить позицию, убрать уведомление, освободить аудио, очистить сессию. */
  const closePlayer = useCallback(() => {
    saveProgress();
    audioService.updateLockScreen(false);
    audioService.release();
    dispatch(clearSession());
  }, [dispatch, saveProgress]);

  // Видимость системного медиа-уведомления = есть активная сессия (играет ИЛИ на паузе).
  // Убирается только при полном закрытии (кнопка «Закрыть» → status:'idle'). Пауза его НЕ прячет.
  // Реактивно к статусу/книге/главе (позицию НЕ выбираем, чтобы не ререндерить каждую секунду).
  const status = useAppSelector((s) => s.playback.status);
  const currentBookId = useAppSelector((s) => s.playback.bookId);
  const currentChapterIndex = useAppSelector((s) => s.playback.chapterIndex);
  useEffect(() => {
    const book = getBook(currentBookId);
    const chapter = book?.chapters[currentChapterIndex];
    if (status !== 'idle' && book && chapter) {
      audioService.updateLockScreen(true, buildNowPlayingMeta(book, chapter));
    } else {
      audioService.updateLockScreen(false);
    }
  }, [status, currentBookId, currentChapterIndex, getBook]);

  // Инициализация при старте: настроить аудио-сессию, сбросить транзиентное состояние и
  // восстановить последнюю книгу на паузе. Это чинит холодный старт (после полного закрытия):
  // UI снова связан с книгой, а loadChapter → setActiveForLockScreen перехватывает медиа-сессию.
  useEffect(() => {
    void audioService.configureSession();
    dispatch(resetTransient());
    const pb = store.getState().playback;
    const book = getBook(pb.bookId);
    const chapter = book?.chapters[pb.chapterIndex];
    if (book && chapter) {
      if (audioService.isLoaded) {
        // Процесс выжил (foreground-service удержал JS) — синхронизировать реальный статус.
        dispatch(setStatus(audioService.playing ? 'playing' : 'paused'));
      } else {
        // Холодный старт — подгрузить главу на паузе, чтобы UI и медиа-сессия восстановились.
        loadChapter(book, pb.chapterIndex, pb.positionSec, false);
        dispatch(setStatus('paused'));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Единственная подписка на статус плеера: позиция, длительность, авто-переход, sleep-таймер.
  useEffect(() => {
    const unsub = audioService.onStatus((status: AudioStatus) => {
      const state = store.getState();
      const pb = state.playback;
      const book = getBook(pb.bookId);
      if (!book) return;

      dispatch(setPosition({ positionSec: status.currentTime, duration: status.duration }));

      // Зафиксировать измеренную длительность главы один раз.
      const ch = book.chapters[pb.chapterIndex];
      if (ch && ch.duration === 0 && status.duration > 0) {
        dispatch(setChapterDuration({ id: book.id, chapterIndex: pb.chapterIndex, duration: status.duration }));
      }

      // Троттлинг сохранения прогресса.
      if (status.playing && Date.now() - lastSaveAt.current >= PROGRESS_SAVE_INTERVAL_MS) {
        saveProgress();
      }

      // Sleep-таймер по времени.
      const sleep = pb.sleep;
      if (sleep.mode === 'minutes' && sleep.endsAt != null && Date.now() >= sleep.endsAt) {
        pause();
        dispatch(clearSleep());
        return;
      }

      // Конец главы: авто-переход или остановка (в т.ч. режим sleep «до конца главы»).
      if (status.didJustFinish) {
        // Глава прослушана до конца — обнулить её позицию (повторный вход с начала).
        dispatch(updateProgress({ id: book.id, chapterIndex: pb.chapterIndex, positionSec: 0 }));
        if (sleep.mode === 'endOfChapter') {
          dispatch(clearSleep());
          dispatch(setStatus('paused'));
          return;
        }
        if (pb.chapterIndex + 1 < book.chapters.length) {
          const nextIndex = pb.chapterIndex + 1;
          const nextPos = chapterPosition(book, nextIndex);
          dispatch(setChapterIndex(nextIndex));
          dispatch(updateProgress({ id: book.id, chapterIndex: nextIndex, positionSec: nextPos }));
          loadChapter(book, nextIndex, nextPos, true);
        } else {
          dispatch(setStatus('paused'));
        }
      }
    });
    return unsub;
  }, [dispatch, getBook, loadChapter, pause, saveProgress, store]);

  // Сохранить прогресс при выходе.
  useEffect(() => () => saveProgress(), [saveProgress]);

  const actions = useMemo<PlayerActions>(
    () => ({
      openBook,
      play,
      pause,
      toggle,
      seekTo,
      seekBy,
      goToChapter,
      nextChapter,
      prevChapter,
      setRate,
      closePlayer,
    }),
    [openBook, play, pause, toggle, seekTo, seekBy, goToChapter, nextChapter, prevChapter, setRate, closePlayer],
  );

  return <PlayerContext.Provider value={actions}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerActions {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
