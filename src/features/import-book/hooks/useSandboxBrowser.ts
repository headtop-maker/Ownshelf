import { Directory, Paths } from 'expo-file-system';
import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/app-store';
import { addBook, selectBooks } from '@/entities/book';
import { buildBook, type SourceAsset } from '../lib/buildBook';
import { listSandboxDir, type SandboxListing } from '../lib/sandboxFs';

/**
 * Браузер файлов песочницы приложения: навигация по папкам + накопление выбора аудио/картинок
 * из разных подпапок в один набор → сборка книги через тот же `buildBook`, что и обычный импорт.
 */
export function useSandboxBrowser() {
  const dispatch = useAppDispatch();
  const books = useAppSelector(selectBooks);
  const knownBookIds = useMemo(() => new Set(books.map((b) => b.id)), [books]);

  const [stack, setStack] = useState<Directory[]>(() => [Paths.document]);
  const [selected, setSelected] = useState<Map<string, SourceAsset>>(new Map());
  const [busy, setBusy] = useState(false);

  const current = stack[stack.length - 1];
  const listing: SandboxListing = useMemo(() => listSandboxDir(current, knownBookIds), [current, knownBookIds]);

  const enter = useCallback((dir: Directory) => {
    setStack((s) => [...s, dir]);
  }, []);

  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  const toggle = useCallback((uri: string, name: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(uri)) next.delete(uri);
      else next.set(uri, { uri, name });
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setStack([Paths.document]);
    setSelected(new Map());
  }, []);

  const submit = useCallback(async () => {
    if (selected.size === 0) return null;
    setBusy(true);
    try {
      const book = await buildBook({
        assets: [...selected.values()],
        copyToSandbox: true,
        source: 'sandbox-browse',
      });
      dispatch(addBook(book));
      setSelected(new Map());
      return book;
    } catch (e) {
      Alert.alert('Не удалось собрать книгу', String(e instanceof Error ? e.message : e));
      return null;
    } finally {
      setBusy(false);
    }
  }, [dispatch, selected]);

  return {
    breadcrumb: stack.map((d) => (d.uri === Paths.document.uri ? 'Песочница' : d.name)),
    canGoBack: stack.length > 1,
    folders: listing.folders,
    files: listing.files,
    selected,
    enter,
    back,
    toggle,
    reset,
    submit,
    busy,
  };
}
