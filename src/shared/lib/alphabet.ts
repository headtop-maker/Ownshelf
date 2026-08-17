/** Утилиты алфавитной группировки (для секций библиотеки). */

/** Буква-секция для строки: первая буква в верхнем регистре; цифра/символ/пусто → '#'. Ё → Е. */
export function sectionLetter(s: string): string {
  const ch = (s ?? '').trim().charAt(0);
  if (!ch) return '#';
  const up = ch.toLocaleUpperCase('ru');
  if (up === 'Ё') return 'Е';
  return /[A-ZА-Я]/.test(up) ? up : '#';
}

/** Сравнение названий по алфавиту (кириллица+латиница, регистронезависимо). */
export function compareTitles(a: string, b: string): number {
  return (a ?? '').localeCompare(b ?? '', 'ru', { sensitivity: 'base' });
}

/** Нарезка массива на ряды по `size` элементов (для эмуляции сетки в SectionList). */
export function chunkPairs<T>(arr: T[], size = 2): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += size) rows.push(arr.slice(i, i + size));
  return rows;
}
