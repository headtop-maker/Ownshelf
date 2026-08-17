# Архитектура приложения «Аудиокниги»

Офлайн-плеер аудиокниг из локальных файлов пользователя. Без бэкенда, без аккаунтов.
Прогресс, настройки и библиотека хранятся на устройстве (redux-persist → AsyncStorage).

**Стек:** Expo SDK 57 · React Native 0.86 · React 19 · expo-router · Redux Toolkit + redux-persist · expo-audio.
**Архитектура:** Feature-Sliced Design (FSD). Слои снизу вверх: `shared → entities → features → widgets → pages → app`.
Импорт разрешён только вниз по слоям (page может тянуть widget/feature/entity/shared; shared не тянет ничего из проекта).

> ⚠️ **Нужен dev build** (`npx expo run:ios` / `run:android`), не Expo Go — expo-audio требует нативные
> config-плагины для фона/локскрина. Node должен быть 20.19+/22.13+/24.3+ (не 23).

---

## Карта каталога `src/`

### `app/` — роуты expo-router (тонкие)
Файловая маршрутизация. Каждый роут — 3 строки: импортирует страницу из `pages/` и ре-экспортит.
- `_layout.tsx` — **корень приложения**: `<Provider>` (Redux) → `<PersistGate>` → `<SafeAreaProvider>` →
  `ThemeModeProvider` → `PlayerProvider` → `<Stack>`. Здесь же на маунте: настройка аудио-сессии
  (`audioService.configureSession()`) и `resetTransient()` (сброс транзиентного состояния после регидратации).
- `index.tsx` → LibraryPage · `book/[id].tsx` → BookDetailsPage · `player.tsx` → PlayerPage (модалка) · `settings.tsx` → SettingsPage.

### `app-store/` — конфигурация Redux (низкий слой, без UI)
- `store.ts` — `configureStore` + `persistReducer`. **persistConfig**: whitelist `library/playback/settings`,
  storage = AsyncStorage. Игнор несериализуемых экшенов redux-persist в serializableCheck.
- `hooks.ts` — типизированные `useAppDispatch` / `useAppSelector` / `useAppStore`.
- `types.ts` — `RootState`, `AppDispatch`.
- `index.ts` — публичный API слоя.

### `entities/` — доменные сущности (модель + Redux-слайс + селекторы)
- **`book/`**
  - `model.ts` — типы `Book`, `Chapter`, `BookProgress`, `BookSource`
    (`'ios-copy' | 'android-saf' | 'android-upload' | 'sandbox-browse'`; нигде не участвует в switch/условиях —
    просто метка источника, новый вариант добавлять безопасно).
    Глава абстрактна (`uri`), источник может быть файлом или (в v2) главой m4b.
    **Позиция — per-file**: правда — `Chapter.positionSec` (где остановились внутри файла); `Book.progress.chapterIndex` —
    последний открытый файл (для «Продолжить»/подсветки), `Book.progress.positionSec` — зеркало активной главы.
    Хелперы: `chapterPosition(book, index)` (защищённое чтение позиции файла), `isBookStarted(book)`,
    `bookListenedSeconds(book)`, `bookProgressFraction(book)`, `bookRemainingSeconds(book)` — вся арифметика
    прогресса книги в одном месте, экраны сами не считают.
  - `librarySlice.ts` — состояние `{ books: Record<id,Book>, order: id[] }`. Экшены: `addBook`, `removeBook`,
    `updateBookMeta`, `updateProgress` (пишет позицию **в саму главу**), `resetBookProgress` (обнулить все файлы —
    «Слушать сначала»), `setChapterDuration` (фиксирует измеренную длительность главы).
  - `selectors.ts` — `selectBookById(id)`, `selectInProgress` (для «Продолжить слушать»).
- **`playback/`** — состояние **текущей сессии** плеера (одна на приложение)
  - `playbackSlice.ts` — `{ bookId, chapterIndex, positionSec, duration, rate, status, sleep }`.
    Экшены: `startSession`, `setStatus`, `setPosition`, `setChapterIndex`, `setRate`, `setSleep`, `clearSleep`,
    `clearSession` (полное закрытие → `status:'idle'`), `resetTransient` (обнуляет `status`/`sleep` после старта — они не должны «оживать» из persist).
  - `selectors.ts` — `selectPlayback`, `selectSleep`.
- **`settings/`**
  - `settingsSlice.ts` — `{ defaultRate, skipSeconds, defaultSleepMinutes, theme, autoResume }`.
  - `index.ts` — экспорт + `selectSettings`.

### `features/` — пользовательские сценарии (логика + при необходимости UI сценария)
- **`import-book/`**
  - `lib/buildBook.ts` — **чистая сборка `Book`** из набора файлов: сортировка глав (натуральная), обложка из
    image-файла, при `copyToSandbox` — копирование в `documentDirectory/books/<id>/` (новый FS API `File/Directory/Paths`).
    `deleteBookFiles(id)` — удаление папки книги.
  - `hooks/useImportBook.ts` — хук с двумя сценариями: `importFiles()` (`File.pickFileAsync` из `expo-file-system`,
    мультивыбор; на iOS — копия в песочницу, на Android — только путь, `copyToSandbox: false`, `source:
    'android-pick'`, доступ держится persistable URI permission, которую пикер берёт сам) и `importFolder()`
    (Android SAF `Directory.pickDirectoryAsync`, без копии). Диспатчит `addBook`. **Не** `expo-document-picker` —
    он на Android не берёт persistable-разрешение, см. «Жёсткие правила» в AGENTS.md.
  - `lib/sandboxFs.ts` / `hooks/useSandboxBrowser.ts` / `SandboxBrowserSheet.tsx` — браузер файлов **песочницы
    приложения**: третий источник импорта, для файлов, уже лежащих в `documentDirectory` (например, залитых
    вручную через adb), а не выбранных через системный пикер. `listSandboxDir(dir, knownBookIds)` отдаёт
    подпапки/файлы одного уровня, **скрывая** подпапки, чьё имя совпадает с id уже существующей книги (не
    даём случайно нырнуть внутрь уже организованной книги). `useSandboxBrowser` копит выбор файлов **между**
    подпапками (`Map<uri, SourceAsset>`) и на «Добавить» зовёт тот же `buildBook({ copyToSandbox: true,
    source: 'sandbox-browse' })`, что и обычный импорт — никакой отдельной сборочной логики.
- **`player-controls/`**
  - `PlayerProvider.tsx` — **МОЗГ плеера**. Единственная подписка на статус `audioService`. Отвечает за:
    открытие книги (`openBook`, применяет `defaultRate` для новой книги, `autoResume` для начатой),
    play/pause/toggle, seek, переключение глав, `setRate`; в подписке на статус — обновление позиции/длительности,
    троттлинг сохранения прогресса (5с), авто-переход в конце главы, срабатывание sleep-таймера.
    Наружу отдаёт контекст `usePlayer()` с действиями.
- **`sleep-timer/`**
  - `hooks/useSleepTimer.ts` — установка таймера (`setMinutes` / `setEndOfChapter` / `cancel`). Само выключение делает PlayerProvider.
  - `SleepModal.tsx` — UI выбора таймера (тёмный, поверх плеера).
- **`edit-book-meta/`**
  - `EditMetaModal.tsx` — правка названия/автора **и обложки** (фото с камеры / из галереи / удалить,
    через `expo-image-picker` + `ActionSheet`). Обложка копируется в песочницу через `shared/lib/bookStorage.ts`,
    сохраняется только по «Сохранить» (`dispatch(updateBookMeta({..., coverUri}))`). Открывается из ••• на
    карточке книги **и** напрямую с карандаша на ячейке сетки библиотеки (см. `BookGridItem`) — нужно для книг
    из одного файла, которые из библиотеки открываются сразу в плеере, минуя `BookDetailsPage`.
- **`pc-upload/`** — приём книг с ПК по Wi-Fi (Android-only). См. подробный разбор в разделе
  [«Загрузка с ПК»](#pc-upload) ниже.
  - `hooks/usePcUpload.ts` — хук: старт/стоп нативного сервера на mount/unmount, подписка на его события,
    прогон готовых сабмитов через `buildBook()`/`addBook()` (тот же путь, что и обычный импорт).
  - `PcUploadSheet.tsx` — полноэкранная модалка: IP/PIN/QR, живой лог принятых книг, блокировка без Wi-Fi.

### `widgets/` — самостоятельные UI-блоки, собранные из entities/features
- `book-card/` — `BookCover.tsx` (единый рендер обложки: `Image`, либо градиент-плейсхолдер с иконкой
  мелодии **по центру** — `centerContent` можно переопределить, так `ContinueRow` рисует вместо неё
  `ProgressRing` с play-иконкой), `BookGridItem.tsx` (ячейка сетки: обложка + карандаш-бейдж в углу, который
  открывает `EditMetaModal` напрямую, минуя `BookDetailsPage`).
- `chapter-list/` — `ChapterList.tsx` (FlatList глав, тёмный — для шита плеера), `ChapterRow.tsx` (строка файла
  на светлой карточке книги: где остановились/подсветка последнего открытого), `ChaptersSheet.tsx` (нижний шит
  глав на общем `BottomSheet`, тёмный — часть плеера).
- `continue-row/` — секция «Продолжить»: одна крупная карточка последней активной книги (обложка, мета, полоса
  прогресса, play-кнопка).
- `now-playing/` — `NowPlaying.tsx` (**полный экран, всегда тёмный**: обложка-полоса, штрих-seekbar, транспорт,
  скорость, sleep) + `PlayerTransport.tsx`.
- `player-bar/PlayerBar.tsx` — глобальный мини-плеер снизу, тёмный (плавающая карточка с тенью; крутящийся аватар,
  play/pause в кольце прогресса, next только если есть след. файл; свайп вбок — закрыть). Виден при активной сессии, тап → `/player`.

### `pages/` — экраны (композиция виджетов, привязка к роуту)
- `library/LibraryPage.tsx` — библиотека: шапка, поиск, сегменты-фильтры, секция «Продолжить», сетка книг
  **2 колонки** (`COLUMNS`), сортировка по алфавиту, шит «Добавить книгу» (файлы/папка/**файлы в песочнице**/
  **с ПК** — см. ниже), мини-плеер.
- `book-details/BookDetailsPage.tsx` — детали книги: hero-обложка/мета, «Слушать/Продолжить», главы, удаление, правка.
- `player/PlayerPage.tsx` — обёртка над `NowPlaying` + `SleepModal`.
- `settings/SettingsPage.tsx` — скорость по умолчанию, шаг перемотки, sleep по умолчанию, тема, autoResume,
  строка-переход «Хранилище» (сводка N книг · размер) → `router.push('/storage')`.
- `settings-storage/StorageSettingsPage.tsx` (роут `/storage`) — точечная очистка: список книг с размером
  на диске (`bookDirSize`), множественный выбор (`Checkbox`), удаление выбранных (`deleteBookFiles` +
  `removeBook` на каждую); если среди удаляемых — текущая играющая книга, сперва `player.closePlayer()`.

### `shared/` — переиспользуемое, без знания о домене
- **`config/constants.ts`** — `SKIP_SECONDS`, `SPEED_PRESETS`, `SLEEP_OPTIONS`, `PROGRESS_SAVE_INTERVAL_MS`,
  `AUDIO_EXTENSIONS` (включает `mp4`), `COVER_FILENAMES` и т.п.
- **`lib/audioService.ts`** — **синглтон-обёртка над expo-audio**. Держит ОДИН `AudioPlayer`, транслирует статус
  подписчикам, управляет локскрином (`setActiveForLockScreen`), настраивает сессию (`doNotMix` + фон).
  Не знает про Redux — вся доменная логика в PlayerProvider.
- **`lib/files.ts`** — `extname`, `basenameNoExt`, `isAudioFile`, `isImageFile`, `compareNatural` (натуральная сортировка).
- **`lib/format.ts`** — `formatTime` (m:ss / h:mm:ss), `formatDurationHuman`, `formatBytes` (128 КБ/1.2 МБ/3.4 ГБ).
- **`lib/bookStorage.ts`** — единственное место, которое знает путь `documentDirectory/books/<id>/` в песочнице:
  `booksDir()`, `bookDir(id)`, `saveBookCover(id, sourceUri)` (копирует+заменяет `cover.*`), `deleteBookCover(id)`,
  `bookDirSize(id)` (байты, через нативный `Directory.size`). `lib/buildBook.ts` (импорт) и `EditMetaModal` (обложка)
  используют один и тот же хелпер — не заводить второй.
- **`lib/coverGradient.ts`** — детерминированный градиент по id книги (для обложек без картинки).
- **`ui/`** — UI-кит на голом `StyleSheet` (без Tamagui/NativeWind), дизайн-система **«Modernist»**:
  `theme.ts` (палитра light/dark + `type`/`typeCase`/`shadow`/`fontFamily`, `useTheme`, `familyForWeight`),
  `playerTheme.ts` (`usePlayerTheme()` — **фиксированная тёмная** палитра, не зависит от темы приложения — плеер
  и мини-плеер всегда тёмные), `ThemeModeProvider.tsx`, `Text` (варианты типошкалы + автоматический выбор
  семейства Golos Text по весу), `Button`, `Seekbar` (PanResponder, штрих-thumb), `ProgressRing`/`EqualizerBars`/`StoryRing`
  (react-native-svg), `BottomSheet` (свайп-вниз на `PanResponder`, без нативных зависимостей) + `ActionSheet`
  (`SheetAction.tint` — сплошная насыщенная заливка действия + белый текст/иконка вместо лёгкого tint-фона;
  `cancelColor` красит «Отмена» так же), `SearchBar`, `Screen`, `Checkbox` (квадрат, заливка при выборе).

### `modules/` — локальные нативные Expo Modules (вне `src/`, вне FSD-слоёв)
- **`pc-upload-server/`** — единственный нативный модуль проекта. Kotlin, **только Android**
  (`expo-module.config.json: { "platforms": ["android"] }` — на iOS/web не линкуется вообще, ничего делать не нужно).
  Подробный разбор — раздел [«Загрузка с ПК»](#pc-upload) ниже.

---

<a id="pc-upload"></a>
## Загрузка с ПК (`pc-upload`) — разбор фичи

**Идея:** телефон поднимает локальный HTTP-сервер на время, пока открыт экран «Загрузка с ПК»; с ПК (или другого
телефона) в браузере открывается отданная сервером страница, оттуда перетаскиваются файлы — они летят по Wi-Fi
напрямую в песочницу приложения, и в приложении тут же появляется книга. Без интернета, без облака, без установки
чего-либо на ПК — просто браузер.

### Разделение ответственности
Модуль **не знает про книги**. Он только: (1) поднимает/останавливает сервер, (2) отдаёт HTML-страницу,
(3) проверяет PIN, (4) стримит входящие файлы на диск, (5) сообщает JS о готовых сабмитах через события.
Вся доменная логика — сборка `Book` из файлов — остаётся в JS и **переиспользует существующий `buildBook()`**
(тот же путь, что у `importFiles`/`importFolder`), а не дублируется в Kotlin. Это то же разделение, что и
`audioService.ts` / `PlayerProvider` — нативный/сервисный слой не знает про домен.

### Файлы
```
modules/pc-upload-server/
  package.json                    — name/main/types (см. «грабли автолинковки» в AGENTS.md)
  expo-module.config.json         — { platforms: ["android"] }
  index.ts                        — барел (default export модуля + типы)
  src/
    PcUploadServerModule.ts       — declare class ... extends NativeModule, requireNativeModule('PcUploadServer')
    PcUploadServerModule.web.ts   — no-op заглушка (модуль всё равно не вызывается вне Android)
    PcUploadServer.types.ts       — StartResult, SubmitDoneEvent, ReceivedFile и т.п.
  android/
    build.gradle                  — + implementation 'org.nanohttpd:nanohttpd:2.3.1'
    src/main/
      AndroidManifest.xml         — uses-permission ACCESS_WIFI_STATE/ACCESS_NETWORK_STATE/INTERNET
      assets/pc_upload.html       — статическая веб-страница (см. ниже)
      java/expo/modules/pcuploadserver/PcUploadServerModule.kt

src/features/pc-upload/
  hooks/usePcUpload.ts            — хук: старт/стоп на mount/unmount, подписка на события, buildBook()/addBook()
  PcUploadSheet.tsx                — полноэкранная модалка: IP/PIN/QR, живой лог, блокировка без Wi-Fi
```

### Kotlin (`PcUploadServerModule.kt`)
- `AsyncFunction("startAsync")` — проверяет Wi-Fi (`ConnectivityManager.hasTransport(TRANSPORT_WIFI)`), находит
  локальный IPv4 (перебор `NetworkInterface`, интерфейсы `wlan*`/`ap*` в приоритете), генерирует 4-значный PIN,
  поднимает `UploadHttpServer` (наследник `NanoHTTPD`, `inner class` — читает `pin`/`token`/staging-папку
  напрямую у модуля) на предпочтительном порту `8787` с фолбэком на случайный свободный при занятости. Бросает
  `NoWifiException` (`CodedException("ERR_NO_WIFI", ...)`), если Wi-Fi нет — JS это ловит и показывает
  «Подключите Wi-Fi» вместо адреса.
- `AsyncFunction("stopAsync")` — останавливает сервер, чистит staging-папку (`cacheDir/pc-upload/`).
- `Events("onSubmitStarted", "onSubmitDone", "onError")` — `sendEvent(...)` из воркер-потока NanoHTTPD.
- Эндпоинты (`serve(session)`):
  - `GET /` — отдаёт `assets/pc_upload.html` (`context.assets.open(...)`, `newChunkedResponse`).
  - `POST /api/login` — `pin` в form-urlencoded теле → сверка с текущим PIN → выдаёт `token` (UUID),
    единственный валидный токен хранится в памяти модуля (сбрасывается на каждый `startAsync`).
  - `POST /api/upload` — multipart. `session.parseBody(filesMap)` (блокирует поток до полного приёма — NanoHTTPD
    сам пишет части во временные файлы). Проверка `token` → каждый файл переносится в
    `cacheDir/pc-upload/<submitId>/` → событие `onSubmitDone` со списком `{uri, name}` + `kind`
    (`'folder' | 'files'`) + `title` (имя папки, если было).
  - **Кириллица в именах (`decodeText()`)**: NanoHTTPD 2.3.1 без явного `charset` в `Content-Type`
    (браузеры его не шлют) декодирует заголовки/значения multipart-частей как US-ASCII — не-ASCII байты
    необратимо превращаются в `?` ещё при разборе тела запроса, `session.parms[field]`/`filename=` для
    таких имён восстановить нельзя. Поэтому `title` и оригинальные имена файлов клиент шлёт
    `encodeURIComponent`-ом отдельными ASCII-safe полями (`name0`, `name1`, ... для файлов), сервер их
    `URLDecoder.decode(..., "UTF-8")`-ит обратно (`decodeText()`).
- **Безопасность:** обычный HTTP без TLS — осознанно (локальная сеть + PIN-гейт, сложность самоподписанных
  сертификатов не оправдана для LAN-передачи файлов). PIN разовый на сессию сервера, токен выдаётся один раз
  за открытие страницы и переиспользуется для всех сабмитов, пока сервер жив.

### Веб-страница (`assets/pc_upload.html`)
Ванильный HTML/CSS/JS (без сборки, без зависимостей) — экономнее, чем городить отдельный веб-бандл.
Логика: если в URL есть `?pin=XXXX` (из QR — он кодирует `http://ip:port/?pin=XXXX`), логинится автоматически;
иначе — форма PIN. После логина — два таба: «Папка» (`<input webkitdirectory>`, вся структура = одна книга) и
«Файлы» (`multiple`, россыпь = тоже одна книга, без попытки угадать разбиение на несколько). Сабмит — `XMLHttpRequest`
`multipart/form-data` на `/api/upload` (поля `file0`, `file1`, ... + percent-encoded `name0`, `name1`, ...
и `title` — см. «Кириллица в именах» выше), после успеха форма сбрасывается **без перезагрузки страницы** —
с одной открытой вкладки можно закинуть несколько книг подряд.

### JS-сторона
`usePcUpload()` — на маунте (то есть пока открыт `PcUploadSheet`) стартует сервер, слушает `onSubmitDone`:
для каждого сабмита вычисляет пропущенные файлы (`!isAudioFile && !isImageFile`, например неподдерживаемое
расширение) и вызывает `buildBook({ assets: event.files, title: event.title || undefined, copyToSandbox: true,
source: 'android-upload' })` → `dispatch(addBook(book))`. На unmount — `stopAsync()`. Пропущенные файлы не роняют
весь сабмит (если хоть один аудиофайл распознан) — показываются отдельной строкой в логе экрана.

### Точка входа в UI
Кнопка «Загрузить с ПК» — в шите «Добавить книгу» на `LibraryPage`, видна только при `Platform.OS === 'android'`
(и в коде, и через `expo-module.config.json` — модуль физически не линкуется на iOS).

---

## Потоки данных (ключевые сценарии)

**Импорт →** `useImportBook.importFiles()` → `buildBook()` (на iOS копирует файлы в песочницу, на Android
держит только путь), собирает `Book` → `dispatch(addBook)` → persist → книга в библиотеке.

**Воспроизведение →** страница вызывает `usePlayer().openBook(book, { resume?, startChapter? })` → `startSession` +
`audioService.load(uri)` + `play()`. Далее `audioService` шлёт `playbackStatusUpdate` (~2×/сек) →
**единственный** listener в `PlayerProvider` → `setPosition`, троттлингом `updateProgress`, в конце главы — авто-переход
(позиция дослушанного файла обнуляется). Видимость медиа-уведомления — отдельным эффектом по `status`.

**Сохранение позиции (per-file) →** только через `PlayerProvider.saveProgress()` → `updateProgress` пишет позицию
**в саму главу** (`Chapter.positionSec`) → persist. Пишется троттлингом (5с), на паузу, перед переключением файла,
на конец главы, при закрытии/размонтировании. Прыжки между файлами не затирают чужой прогресс.

**Тема →** `settings.theme` → `ThemeModeProvider` кладёт разрешённое имя в `ThemeNameContext` → `useTheme()` во всех компонентах.

---

## Инварианты (не сломать)

- **Позиция — per-file.** Правда по позиции внутри файла — `Chapter.positionSec`; `Book.progress.chapterIndex` —
  последний открытый файл. Не дублировать позицию как единую точку на книгу.
- **Единственный listener статуса** — в `PlayerProvider`. Не подписываться на `audioService.onStatus` из компонентов.
  `audioService.release()` НЕ очищает `listeners` (это подписка PlayerProvider, живёт всё приложение) — иначе после
  «Закрыть» перестанут приходить обновления позиции/длительности.
- **Медиа-уведомление видно при активной сессии** (играет ИЛИ на паузе). Убирается только полным закрытием
  (`clearSession` → `status:'idle'`); пауза его не прячет. Кнопку паузы в уведомлении не трогаем (нужен foreground-плеер).
- **`audioService` не знает про Redux.** Доменная логика — только в PlayerProvider.
- **iOS: файлы обязательно копировать в песочницу** (`copyToSandbox: true`), иначе security-scoped URI протухнут.
  Android — наоборот, копия не нужна (`copyToSandbox: false` и в `importFiles`, и в `importFolder`): доступ держит
  persistable URI permission, которую `File.pickFileAsync`/`Directory.pickDirectoryAsync` берут сами.
- **Локскрин требует `interruptionMode: 'doNotMix'`** — уже выставлено в `configureSession()`.
- `resetTransient()` обязан вызываться на старте, иначе `status: 'playing'` «оживёт» из persist без реального звука.
- **`modules/pc-upload-server` не знает про Redux/книги** — только байты + события. Сборка `Book` — исключительно
  через `buildBook()` в JS (`features/pc-upload/hooks/usePcUpload.ts`), как и у обычного импорта.
- **Плеер (`NowPlaying`/`PlayerBar`/шиты плеера) всегда тёмный** — `usePlayerTheme()`, не `useTheme()`. Светлые
  экраны (библиотека, карточка книги, настройки) — наоборот, только `useTheme()`.
- Пути к файлам книги в песочнице — только через `shared/lib/bookStorage.ts`, не создавать параллельный
  `new Directory(Paths.document, 'books')` в другом месте.

### Осознанные исключения из строгой слоистости

Слои строго `shared → entities → features → widgets → pages → app`, импорт только вниз, через баррель
(`index.ts`) слайса. Ниже — три места, где это выглядит как нарушение, но им не является; не «чинить»
их, следующий аудит должен видеть, что это осознанные решения:

- **`widget` импортирует другой `widget`** (`widgets/continue-row`, `widgets/now-playing`, `widgets/player-bar`
  импортируют `@/widgets/book-card`, `@/widgets/chapter-list`) — переиспользование готового композита
  (обложка, список глав), а не слоистое нарушение; импорт всегда через баррель, никогда напрямую во
  внутренний файл.
- **`feature` импортирует другую `feature`** (`features/pc-upload/hooks/usePcUpload.ts` переиспользует `buildBook`
  из `@/features/import-book`, см. [«Загрузка с ПК»](#pc-upload)) — сознательно, чтобы не дублировать сборку
  `Book` в двух местах.
- **`entities` ↔ `app-store` — типовая (не рантайм) циклическая зависимость**: `app-store/store.ts` импортирует
  редьюсеры из `entities/*`, а `entities/book/selectors.ts`/`entities/playback/selectors.ts` импортируют
  `type { RootState } from '@/app-store/types'` через `import type` — стирается при компиляции, рантайм-цикла
  нет. Стандартный паттерн Redux Toolkit (селекторы типизируются по стору, стор собирается из слайсов сущностей).

---

## Что вне MVP (v2)

Внутренние главы m4b (парсинг атомов), ID3-парсинг тегов и встроенных обложек, закладки с заметками, онбординг,
отдельный экран поиска, share-extension импорт, импорт по URL, синхронизация между устройствами, загрузка
с ПК на iOS (нативный модуль — Android-only).

## Проверка

`npx tsc --noEmit -p tsconfig.json` · `npx expo lint` · `npx expo export --platform ios` (проверка бандла).
После изменений в `modules/` (нативный код, `AndroidManifest.xml`, зависимости Gradle) — обязателен
`npx expo prebuild --platform android --clean` и полный `npx expo run:android`, JS-only reload не подхватит.
