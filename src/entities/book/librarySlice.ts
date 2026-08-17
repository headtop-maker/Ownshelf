import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Book, BookProgress } from './model';

export type LibraryState = {
  books: Record<string, Book>;
  /** Порядок книг в библиотеке (id), новые сверху. */
  order: string[];
};

const initialState: LibraryState = {
  books: {},
  order: [],
};

const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {
    addBook(state, action: PayloadAction<Book>) {
      const book = action.payload;
      state.books[book.id] = book;
      if (!state.order.includes(book.id)) state.order.unshift(book.id);
    },
    removeBook(state, action: PayloadAction<string>) {
      delete state.books[action.payload];
      state.order = state.order.filter((id) => id !== action.payload);
    },
    updateBookMeta(
      state,
      action: PayloadAction<{ id: string; title?: string; author?: string; coverUri?: string }>,
    ) {
      const book = state.books[action.payload.id];
      if (!book) return;
      if (action.payload.title !== undefined) book.title = action.payload.title;
      if (action.payload.author !== undefined) book.author = action.payload.author;
      if (action.payload.coverUri !== undefined) book.coverUri = action.payload.coverUri;
    },
    /** Сохранить позицию прослушивания: активная глава + её позиция (правда по позиции — в главе). */
    updateProgress(
      state,
      action: PayloadAction<{ id: string } & Partial<BookProgress>>,
    ) {
      const book = state.books[action.payload.id];
      if (!book) return;
      const { chapterIndex, positionSec } = action.payload;
      if (chapterIndex !== undefined) book.progress.chapterIndex = chapterIndex;
      if (positionSec !== undefined) book.progress.positionSec = positionSec;
      // Пишем позицию в саму главу — чтобы прыжки между файлами не стирали чужой прогресс.
      const idx = chapterIndex ?? book.progress.chapterIndex;
      const ch = book.chapters[idx];
      if (ch && positionSec !== undefined) ch.positionSec = positionSec;
      book.progress.updatedAt = Date.now();
    },
    /** Слушать сначала: обнулить позицию всех глав и указатель на первую. */
    resetBookProgress(state, action: PayloadAction<string>) {
      const book = state.books[action.payload];
      if (!book) return;
      book.chapters.forEach((c) => {
        c.positionSec = 0;
      });
      book.progress = { chapterIndex: 0, positionSec: 0, updatedAt: Date.now() };
    },
    /** Проставить измеренные длительности глав (после первой загрузки в плеер). */
    setChapterDuration(
      state,
      action: PayloadAction<{ id: string; chapterIndex: number; duration: number }>,
    ) {
      const book = state.books[action.payload.id];
      const ch = book?.chapters[action.payload.chapterIndex];
      if (!book || !ch || ch.duration === action.payload.duration) return;
      ch.duration = action.payload.duration;
      book.totalDuration = book.chapters.reduce((sum, c) => sum + c.duration, 0);
    },
  },
});

export const {
  addBook,
  removeBook,
  updateBookMeta,
  updateProgress,
  resetBookProgress,
  setChapterDuration,
} = librarySlice.actions;

export const libraryReducer = librarySlice.reducer;
