import { Directory, File } from 'expo-file-system';
import { compareNatural, isAudioFile, isImageFile } from '@/shared/lib/files';

export type SandboxListing = {
  folders: Directory[];
  files: File[];
};

/**
 * Содержимое одного уровня песочницы: подпапки (кроме уже организованных книг — `knownBookIds`,
 * чтобы не пускать пользователя «внутрь» уже импортированной книги и не плодить дубликаты) и
 * файлы, похожие на аудио/обложку. Прочие файлы (мусор, служебные) отфильтрованы — их всё равно
 * нельзя выбрать для сборки книги.
 */
export function listSandboxDir(dir: Directory, knownBookIds: ReadonlySet<string>): SandboxListing {
  const entries = dir.list();
  const folders: Directory[] = [];
  const files: File[] = [];
  for (const entry of entries) {
    if (entry instanceof Directory) {
      if (!knownBookIds.has(entry.name)) folders.push(entry);
    } else if (entry instanceof File) {
      if (isAudioFile(entry.name) || isImageFile(entry.name)) files.push(entry);
    }
  }
  folders.sort((a, b) => compareNatural(a.name, b.name));
  files.sort((a, b) => compareNatural(a.name, b.name));
  return { folders, files };
}
