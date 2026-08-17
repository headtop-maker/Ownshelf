import { Directory, File } from 'expo-file-system';
import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { addBook } from '@/entities/book';
import { useAppDispatch } from '@/app-store';
import { isAudioFile } from '@/shared/lib/files';
import { buildBook, type SourceAsset } from '../lib/buildBook';

/**
 * Импорт книги.
 * - importFiles(): мультивыбор аудиофайлов (+ обложка) через системный пикер (`File.pickFileAsync` —
 *   на Android сам берёт persistable URI permission на выбранные файлы, см. Directory.pickDirectoryAsync
 *   в importFolder). На iOS копируем в песочницу (URI временный/протухает).
 * - importFolder(): выбор папки (Android SAF), содержимое становится книгой без копирования.
 */
export function useImportBook() {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);

  const importFiles = useCallback(async () => {
    try {
      const res = await File.pickFileAsync({
        // 'video/mp4' — Android часто отдаёт .mp4 этим MIME даже когда внутри только аудиодорожка.
        mimeTypes: ['audio/*', 'video/mp4', 'image/*'],
        multipleFiles: true,
      });
      if (res.canceled || !res.result || res.result.length === 0) return null;

      const assets: SourceAsset[] = res.result.map((f) => ({ uri: f.uri, name: f.name }));
      setBusy(true);
      // На iOS URI временный → копируем в песочницу. На Android держим только путь к файлу на
      // телефоне без копирования — доступ уже закреплён persistable-разрешением из пикера выше.
      const book = await buildBook({
        assets,
        copyToSandbox: Platform.OS !== 'android',
        source: Platform.OS === 'android' ? 'android-pick' : 'ios-copy',
      });
      dispatch(addBook(book));
      return book;
    } catch (e) {
      Alert.alert('Ошибка импорта', String(e instanceof Error ? e.message : e));
      return null;
    } finally {
      setBusy(false);
    }
  }, [dispatch]);

  const importFolder = useCallback(async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Только Android', 'Импорт папки доступен на Android. На iOS выберите файлы.');
      return null;
    }
    try {
      // Новый expo-file-system: системный выбор папки. На Android вернётся content:// с постоянным доступом.
      const dir = await Directory.pickDirectoryAsync();
      // list() возвращает File и Directory; подпапки отсеются фильтром по расширению.
      const assets: SourceAsset[] = dir
        .list()
        .map((e) => ({ uri: e.uri, name: e.name }))
        .filter((a) => isAudioFile(a.name) || /\.(jpe?g|png|webp)$/i.test(a.name));

      if (assets.filter((a) => isAudioFile(a.name)).length === 0) {
        Alert.alert('Пустая папка', 'В выбранной папке нет аудиофайлов.');
        return null;
      }
      setBusy(true);
      const book = await buildBook({
        assets,
        title: dir.name,
        copyToSandbox: false, // Android SAF даёт постоянный доступ — копия не нужна
        source: 'android-saf',
      });
      dispatch(addBook(book));
      return book;
    } catch (e) {
      // Directory.pickDirectoryAsync() (в отличие от File.pickFileAsync) не возвращает
      // { canceled: true } — при отмене пикера пользователем реджектит промис с ERR_PICKER_CANCELLED
      // (см. expo-file-system/android PickerCancelledException). Это не ошибка — молча выходим.
      if ((e as { code?: string } | null)?.code !== 'ERR_PICKER_CANCELLED') {
        Alert.alert('Ошибка импорта папки', String(e instanceof Error ? e.message : e));
      }
      return null;
    } finally {
      setBusy(false);
    }
  }, [dispatch]);

  return { importFiles, importFolder, busy };
}
