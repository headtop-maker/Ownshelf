/** Домменная модель книги и главы. Абстрактная глава (uri) — источник может быть файлом папки или m4b (v2). */

export type Chapter = {
  id: string;
  title: string;
  /** Локальный file:// URI (iOS-копия) или content:// (Android SAF). */
  uri: string;
  /** Длительность в секундах; 0 пока не определена (заполняется при первом проигрывании). */
  duration: number;
  index: number;
  /** Позиция прослушивания ВНУТРИ этой главы, сек. 0 = с начала/не начата. */
  positionSec: number;
};

export type BookProgress = {
  /** Последняя активная глава — точка входа «Продолжить» и подсветка карточки. */
  chapterIndex: number;
  /** Зеркало позиции активной главы (для мини-плеера/сикбара). Правда по позиции — Chapter.positionSec. */
  positionSec: number;
  updatedAt: number;
};

/** Позиция внутри главы (защищённое чтение: у старых персистнутых глав поля нет). */
export const chapterPosition = (book: Book, index: number): number =>
  book.chapters[index]?.positionSec ?? 0;

/** Книга начата к прослушиванию (есть прогресс). */
export const isBookStarted = (book: Book): boolean =>
  book.progress.updatedAt > 0 && (book.progress.positionSec > 0 || book.progress.chapterIndex > 0);

/** Прослушано секунд: полные главы до активной + позиция внутри активной. */
export function bookListenedSeconds(book: Book): number {
  const idx = book.progress.chapterIndex;
  let before = 0;
  for (let i = 0; i < idx && i < book.chapters.length; i++) before += book.chapters[i]?.duration ?? 0;
  return before + chapterPosition(book, idx);
}

/** Доля прослушанного [0..1] по всей книге. */
export function bookProgressFraction(book: Book): number {
  if (book.totalDuration <= 0) return 0;
  return Math.max(0, Math.min(1, bookListenedSeconds(book) / book.totalDuration));
}

/** Осталось секунд до конца книги. */
export const bookRemainingSeconds = (book: Book): number =>
  Math.max(0, book.totalDuration - bookListenedSeconds(book));

export type BookSource = 'ios-copy' | 'android-pick' | 'android-saf' | 'android-upload' | 'sandbox-browse';

export type Book = {
  id: string;
  title: string;
  author?: string;
  coverUri?: string;
  chapters: Chapter[];
  /** Сумма длительностей глав в секундах (0 пока не измерено). */
  totalDuration: number;
  source: BookSource;
  createdAt: number;
  progress: BookProgress;
};

export const emptyProgress = (): BookProgress => ({
  chapterIndex: 0,
  positionSec: 0,
  updatedAt: 0,
});
