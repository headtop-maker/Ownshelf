import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/app-store/types';
import type { Book } from './model';

const selectLibrary = (s: RootState) => s.library;

/** Все книги в порядке добавления (новые сверху). */
export const selectBooks = createSelector(selectLibrary, (lib): Book[] =>
  lib.order.map((id) => lib.books[id]).filter(Boolean),
);

export const selectBookById = (id: string | undefined) => (s: RootState): Book | undefined =>
  id ? s.library.books[id] : undefined;

/** Книги с начатым прослушиванием, для секции «Продолжить слушать» (свежие сверху). */
export const selectInProgress = createSelector(selectBooks, (books): Book[] =>
  books
    .filter((b) => b.progress.updatedAt > 0 && (b.progress.positionSec > 0 || b.progress.chapterIndex > 0))
    .sort((a, b) => b.progress.updatedAt - a.progress.updatedAt),
);
