import type { RootState } from '@/app-store/types';

export const selectPlayback = (s: RootState) => s.playback;
export const selectSleep = (s: RootState) => s.playback.sleep;
// Узкие примитивные селекторы — каждый meняется независимо и редко (кроме позиции, которая тикает
// раз в секунду). Компоненты, которым не нужна позиция (NowPlaying и т.п.), должны брать поля отсюда
// поштучно, а не через `selectPlayback` целиком — иначе любой тик позиции пересоздаёт весь объект
// среза и ре-рендерит их без причины.
export const selectPlaybackPosition = (s: RootState) => s.playback.positionSec;
export const selectPlaybackDuration = (s: RootState) => s.playback.duration;
export const selectPlaybackBookId = (s: RootState) => s.playback.bookId;
export const selectPlaybackChapterIndex = (s: RootState) => s.playback.chapterIndex;
export const selectPlaybackStatus = (s: RootState) => s.playback.status;
export const selectPlaybackRate = (s: RootState) => s.playback.rate;
