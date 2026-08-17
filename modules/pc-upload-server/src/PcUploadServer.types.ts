/** Один принятый файл: file:// URI во временной staging-папке песочницы + исходное имя. */
export type ReceivedFile = { uri: string; name: string };

/** Результат запуска сервера. */
export type StartResult = {
  /** Локальный IPv4 адрес устройства в текущей Wi-Fi сети. */
  ip: string;
  port: number;
  /** 4-значный PIN, показывается на экране и вводится на странице ПК. */
  pin: string;
};

export type SubmitStartedEvent = { submitId: string };

export type SubmitDoneEvent = {
  submitId: string;
  /** 'folder' — вся структура = одна книга; 'files' — россыпь = одна книга. */
  kind: 'folder' | 'files';
  /** Название папки (для kind==='folder'); пусто — JS выведет название из первого файла. */
  title: string;
  files: ReceivedFile[];
};

export type ServerErrorEvent = { message: string };

export type PcUploadServerModuleEvents = {
  onSubmitStarted: (event: SubmitStartedEvent) => void;
  onSubmitDone: (event: SubmitDoneEvent) => void;
  onError: (event: ServerErrorEvent) => void;
};
