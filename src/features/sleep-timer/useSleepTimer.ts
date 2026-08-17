import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app-store';
import { clearSleep, selectSleep, setSleep } from '@/entities/playback';

/** Управление sleep-таймером. Само выключение выполняет PlayerProvider по тикам статуса. */
export function useSleepTimer() {
  const dispatch = useAppDispatch();
  const sleep = useAppSelector(selectSleep);

  const setMinutes = useCallback(
    (minutes: number) => {
      dispatch(setSleep({ mode: 'minutes', endsAt: Date.now() + minutes * 60_000 }));
    },
    [dispatch],
  );

  const setEndOfChapter = useCallback(() => {
    dispatch(setSleep({ mode: 'endOfChapter', endsAt: null }));
  }, [dispatch]);

  const cancel = useCallback(() => {
    dispatch(clearSleep());
  }, [dispatch]);

  return { sleep, setMinutes, setEndOfChapter, cancel };
}
