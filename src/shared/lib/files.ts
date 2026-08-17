import { AUDIO_EXTENSIONS, IMAGE_EXTENSIONS } from '@/shared/config/constants';

/** Расширение файла в нижнем регистре без точки; '' если нет. */
export function extname(nameOrUri: string): string {
  const clean = nameOrUri.split('?')[0].split('#')[0];
  const base = clean.split('/').pop() ?? clean;
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
}

/** Имя файла без расширения из пути/URI. */
export function basenameNoExt(nameOrUri: string): string {
  const clean = nameOrUri.split('?')[0].split('#')[0];
  const base = decodeURIComponent(clean.split('/').pop() ?? clean);
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(0, dot) : base;
}

export function isAudioFile(nameOrUri: string): boolean {
  return (AUDIO_EXTENSIONS as readonly string[]).includes(extname(nameOrUri));
}

export function isImageFile(nameOrUri: string): boolean {
  return (IMAGE_EXTENSIONS as readonly string[]).includes(extname(nameOrUri));
}

/**
 * Натуральная сортировка имён файлов, чтобы "chapter2" шёл перед "chapter10".
 * Используется для упорядочивания глав книги.
 */
export function compareNatural(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}
