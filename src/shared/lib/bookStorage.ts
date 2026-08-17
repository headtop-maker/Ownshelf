import { Directory, File, Paths } from 'expo-file-system';
import { extname } from './files';

/** Корневая папка всех книг в песочнице приложения. */
export const booksDir = (): Directory => new Directory(Paths.document, 'books');

/** Папка конкретной книги в песочнице (создаётся при необходимости). */
export function bookDir(id: string): Directory {
  const root = booksDir();
  if (!root.exists) root.create({ intermediates: true });
  const dir = new Directory(root, id);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/**
 * Копирует картинку (из галереи/камеры) в песочницу книги как обложку — старый файл НЕ трогает
 * (его удаление откладывается до подтверждения формы, см. `pruneBookCovers`: иначе «Отмена» после
 * выбора нового фото уже необратимо потеряла бы старую обложку). Имя файла включает временную метку
 * (`cover-<ts>.<ext>`), а не фиксированное `cover.<ext>` — иначе Image/expo-image кэширует по URI, и
 * после замены на новую обложку с тем же путём компонент продолжает показывать старую картинку из
 * кэша, хотя байты на диске уже другие. Возвращает file:// URI новой обложки.
 */
export async function saveBookCover(id: string, sourceUri: string): Promise<string> {
  const dir = bookDir(id);
  const dest = new File(dir, `cover-${Date.now()}.${extname(sourceUri) || 'jpg'}`);
  const src = new File(sourceUri);
  await src.copy(dest);
  return dest.uri;
}

/** Удалить файл(ы) обложки книги (не трогая главы). */
export function deleteBookCover(id: string): void {
  pruneBookCovers(id);
}

/**
 * Удалить все файлы обложки книги в её папке, КРОМЕ файла с URI `keepUri` (если он задан).
 * Вызывается в момент подтверждения/отмены формы редактирования — а не сразу при выборе нового
 * фото (`saveBookCover`), чтобы «Отмена» после смены обложки не оставляла Redux ссылкой на уже
 * удалённый файл (см. EditMetaModal.save/handleClose).
 */
export function pruneBookCovers(id: string, keepUri?: string): void {
  const dir = bookDir(id);
  for (const entry of dir.list()) {
    if (entry.name.startsWith('cover') && entry.uri !== keepUri) entry.delete();
  }
}

/** Размер папки книги на диске в байтах (0, если папки нет/не удалось посчитать). */
export function bookDirSize(id: string): number {
  return new Directory(booksDir(), id).size ?? 0;
}
