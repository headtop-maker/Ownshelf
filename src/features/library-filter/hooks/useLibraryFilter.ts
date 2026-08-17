import { useMemo, useState } from 'react';
import { useAppSelector } from '@/app-store';
import { selectBooks, type Book } from '@/entities/book';
import { chunkPairs, compareTitles, sectionLetter } from '@/shared/lib/alphabet';

export type LibraryFilter = 'all' | 'reading' | 'new';
export type LibrarySort = 'recent' | 'alpha';

/** Секция библиотеки: буква + ряды книг (по 2 — эмуляция сетки в SectionList). */
export type LibrarySection = { title: string; data: Book[][] };

export const LIBRARY_FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'reading', label: 'Читаю' },
  { key: 'new', label: 'Новые' },
];

/** Состояние поиска/фильтра/сортировки библиотеки + готовые секции. `columns` — число колонок сетки. */
export function useLibraryFilter(columns = 3) {
  const books = useAppSelector(selectBooks);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [sort, setSort] = useState<LibrarySort>('recent');

  const filtered = useMemo<Book[]>(() => {
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      const started = b.progress.updatedAt > 0;
      if (filter === 'reading' && !started) return false;
      if (filter === 'new' && started) return false;
      if (!q) return true;
      return b.title.toLowerCase().includes(q) || (b.author ?? '').toLowerCase().includes(q);
    });
  }, [books, query, filter]);

  const sections = useMemo<LibrarySection[]>(() => {
    if (sort === 'recent') {
      return filtered.length ? [{ title: '', data: chunkPairs(filtered, columns) }] : [];
    }
    // По алфавиту: сортируем названия, группируем по первой букве.
    const sorted = [...filtered].sort((a, b) => compareTitles(a.title, b.title));
    const groups = new Map<string, Book[]>();
    for (const b of sorted) {
      const key = sectionLetter(b.title);
      const arr = groups.get(key);
      if (arr) arr.push(b);
      else groups.set(key, [b]);
    }
    const keys = [...groups.keys()].sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b, 'ru');
    });
    return keys.map((k) => ({ title: k, data: chunkPairs(groups.get(k)!, columns) }));
  }, [filtered, sort, columns]);

  return { books, filtered, sections, query, setQuery, filter, setFilter, sort, setSort };
}
