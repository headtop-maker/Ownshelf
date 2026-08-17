import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_RATE } from '@/shared/config/constants';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused';

export type SleepMode = 'off' | 'minutes' | 'endOfChapter';

export type PlaybackState = {
  /** Книга текущей сессии (или последняя открытая — для мини-плеера). */
  bookId: string | null;
  chapterIndex: number;
  positionSec: number;
  /** Длительность текущей главы, для UI. */
  duration: number;
  rate: number;
  status: PlaybackStatus;
  sleep: { mode: SleepMode; endsAt: number | null };
};

const initialState: PlaybackState = {
  bookId: null,
  chapterIndex: 0,
  positionSec: 0,
  duration: 0,
  rate: DEFAULT_RATE,
  status: 'idle',
  sleep: { mode: 'off', endsAt: null },
};

const playbackSlice = createSlice({
  name: 'playback',
  initialState,
  reducers: {
    startSession(
      state,
      action: PayloadAction<{ bookId: string; chapterIndex: number; positionSec: number }>,
    ) {
      state.bookId = action.payload.bookId;
      state.chapterIndex = action.payload.chapterIndex;
      state.positionSec = action.payload.positionSec;
      state.status = 'loading';
    },
    setStatus(state, action: PayloadAction<PlaybackStatus>) {
      state.status = action.payload;
    },
    setPosition(state, action: PayloadAction<{ positionSec: number; duration?: number }>) {
      state.positionSec = action.payload.positionSec;
      if (action.payload.duration !== undefined && action.payload.duration > 0) {
        state.duration = action.payload.duration;
      }
    },
    setChapterIndex(state, action: PayloadAction<number>) {
      state.chapterIndex = action.payload;
      state.positionSec = 0;
    },
    setRate(state, action: PayloadAction<number>) {
      state.rate = action.payload;
    },
    setSleep(state, action: PayloadAction<{ mode: SleepMode; endsAt: number | null }>) {
      state.sleep = action.payload;
    },
    clearSleep(state) {
      state.sleep = { mode: 'off', endsAt: null };
    },
    /** Полностью закрыть сессию: убрать текущую книгу (мини-плеер/уведомление исчезают). Скорость сохраняем. */
    clearSession(state) {
      state.bookId = null;
      state.chapterIndex = 0;
      state.positionSec = 0;
      state.duration = 0;
      state.status = 'idle';
      state.sleep = { mode: 'off', endsAt: null };
    },
    /** Сброс транзиентного состояния после регидратации из persist. */
    resetTransient(state) {
      state.status = 'idle';
      state.sleep = { mode: 'off', endsAt: null };
    },
  },
});

export const {
  startSession,
  setStatus,
  setPosition,
  setChapterIndex,
  setRate,
  setSleep,
  clearSleep,
  clearSession,
  resetTransient,
} = playbackSlice.actions;

export const playbackReducer = playbackSlice.reducer;
