import PcUploadServerModule, { type StartResult, type SubmitDoneEvent } from '@modules/pc-upload-server';
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch } from '@/app-store';
import { addBook } from '@/entities/book';
import { buildBook } from '@/features/import-book';
import { isAudioFile, isImageFile } from '@/shared/lib/files';

export type PcUploadPhase = 'idle' | 'starting' | 'running' | 'no-wifi' | 'error';

export type ReceivedEntry = {
  id: string;
  title: string;
  chapters: number;
  at: number;
  /** Имена файлов из этого сабмита, которые не распознаны как аудио/обложка и не попали в книгу. */
  skipped: string[];
};

/**
 * Приём книг с ПК: поднимает локальный HTTP-сервер (PcUploadServerModule, Android-only) на время
 * жизни хука, слушает готовые сабмиты и прогоняет их через существующий buildBook()/addBook() —
 * модуль сам не знает про книги, только пишет байты и сообщает список файлов.
 */
export function usePcUpload() {
  const dispatch = useAppDispatch();
  const [phase, setPhase] = useState<PcUploadPhase>('idle');
  const [connection, setConnection] = useState<StartResult | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [received, setReceived] = useState<ReceivedEntry[]>([]);
  const startedRef = useRef(false);

  const handleSubmitDone = useCallback(
    async (event: SubmitDoneEvent) => {
      setTransferring(false);
      const skipped = event.files.filter((f) => !isAudioFile(f.name) && !isImageFile(f.name)).map((f) => f.name);
      try {
        const book = await buildBook({
          assets: event.files,
          title: event.title || undefined,
          copyToSandbox: true,
          source: 'android-upload',
        });
        dispatch(addBook(book));
        setReceived((prev) => [
          { id: Crypto.randomUUID(), title: book.title, chapters: book.chapters.length, at: Date.now(), skipped },
          ...prev,
        ]);
      } catch (e) {
        // buildBook кидает, когда среди файлов сабмита не нашлось ни одного аудио — самый частый
        // случай: формат не в AUDIO_EXTENSIONS. Называем файлы явно, а не молча теряем сабмит.
        const base = e instanceof Error ? e.message : String(e);
        setErrorMessage(skipped.length ? `${base}: ${skipped.join(', ')}` : base);
      }
    },
    [dispatch],
  );

  useEffect(() => {
    const subs = [
      PcUploadServerModule.addListener('onSubmitStarted', () => setTransferring(true)),
      PcUploadServerModule.addListener('onSubmitDone', (e) => void handleSubmitDone(e)),
      PcUploadServerModule.addListener('onError', (e) => {
        setTransferring(false);
        setErrorMessage(e.message);
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [handleSubmitDone]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setPhase('starting');
    PcUploadServerModule.startAsync()
      .then((res) => {
        setConnection(res);
        setPhase('running');
      })
      .catch((e) => {
        const code = (e as { code?: string })?.code;
        if (code === 'ERR_NO_WIFI') setPhase('no-wifi');
        else {
          setPhase('error');
          setErrorMessage(e instanceof Error ? e.message : String(e));
        }
      });

    return () => {
      startedRef.current = false;
      void PcUploadServerModule.stopAsync();
    };
  }, []);

  return { phase, connection, transferring, errorMessage, received };
}
