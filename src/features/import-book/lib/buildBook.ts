import * as Crypto from 'expo-crypto';
import { Directory, File } from 'expo-file-system';
import type { Book, BookSource, Chapter } from '@/entities/book';
import { emptyProgress } from '@/entities/book';
import { booksDir } from '@/shared/lib/bookStorage';
import { basenameNoExt, compareNatural, isAudioFile, isImageFile } from '@/shared/lib/files';

export type SourceAsset = { uri: string; name: string };

export type BuildBookParams = {
  /** Все выбранные файлы (аудио + возможная обложка). */
  assets: SourceAsset[];
  /** Явное название книги (иначе выводится из имени первого файла). */
  title?: string;
  author?: string;
  /** true → копируем в песочницу (iOS); false → оставляем исходные URI (Android SAF). */
  copyToSandbox: boolean;
  source: BookSource;
};

/**
 * Собирает Book из набора файлов. Аудио становятся главами (натуральная сортировка по имени),
 * первый найденный image — обложкой. При copyToSandbox файлы копируются в
 * documentDirectory/books/<id>/ для надёжного офлайн-доступа (iOS).
 */
export async function buildBook(params: BuildBookParams): Promise<Book> {
  const { assets, copyToSandbox, source } = params;
  const id = Crypto.randomUUID();

  const audioAssets = assets
    .filter((a) => isAudioFile(a.name || a.uri))
    .sort((a, b) => compareNatural(a.name || a.uri, b.name || b.uri));
  if (audioAssets.length === 0) {
    throw new Error('Не найдено ни одного аудиофайла');
  }
  const coverAsset = assets.find((a) => isImageFile(a.name || a.uri));

  let bookDir: Directory | null = null;
  if (copyToSandbox) {
    const root = booksDir();
    if (!root.exists) root.create({ intermediates: true });
    bookDir = new Directory(root, id);
    bookDir.create({ intermediates: true });
  }

  const persistAsset = async (asset: SourceAsset): Promise<string> => {
    if (!copyToSandbox || !bookDir) return asset.uri;
    const src = new File(asset.uri);
    const dest = new File(bookDir, safeName(asset.name || src.name || 'file'));
    await src.copy(dest);
    return dest.uri;
  };

  const chapters: Chapter[] = [];
  for (let i = 0; i < audioAssets.length; i++) {
    const a = audioAssets[i];
    const uri = await persistAsset(a);
    chapters.push({
      id: `${id}:${i}`,
      title: basenameNoExt(a.name || a.uri),
      uri,
      duration: 0,
      index: i,
      positionSec: 0,
    });
  }

  const coverUri = coverAsset ? await persistAsset(coverAsset) : undefined;

  const title = params.title?.trim() || basenameNoExt(audioAssets[0].name || audioAssets[0].uri);

  return {
    id,
    title,
    author: params.author?.trim() || undefined,
    coverUri,
    chapters,
    totalDuration: 0,
    source,
    createdAt: Date.now(),
    progress: emptyProgress(),
  };
}

/** Удалить файлы книги из песочницы (при удалении книги). */
export async function deleteBookFiles(id: string): Promise<void> {
  const dir = new Directory(booksDir(), id);
  if (dir.exists) dir.delete();
}

function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_').slice(0, 120);
}
