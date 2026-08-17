/** Общие константы плеера и импорта. */

export const SKIP_SECONDS = 30;

export const SPEED_PRESETS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;

export const DEFAULT_RATE = 1.0;

/** Варианты sleep-таймера в минутах; 0 = «до конца главы». */
export const SLEEP_OPTIONS = [5, 10, 15, 30, 45, 60] as const;

/** Как часто (мс) сохраняем позицию воспроизведения в стор. */
export const PROGRESS_SAVE_INTERVAL_MS = 5000;

/** Как часто (мс) плеер шлёт статус (мельче шаг — плавнее прогресс-бар). */
export const PLAYER_UPDATE_INTERVAL_MS = 500;

/** Расширения, считающиеся аудио-файлами при импорте. */
export const AUDIO_EXTENSIONS = [
  'mp3',
  'm4a',
  'm4b',
  'mp4',
  'aac',
  'wav',
  'flac',
  'ogg',
  'opus',
  'aiff',
] as const;

/** Имена файлов-обложек, которые ищем в папке книги. */
export const COVER_FILENAMES = ['cover.jpg', 'cover.jpeg', 'cover.png', 'folder.jpg', 'folder.png'];

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;
