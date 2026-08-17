# Проект: Ownshelf (Expo 57)

Офлайн-плеер аудиокниг из локальных файлов. Без бэкенда и аккаунтов. Всё хранится на устройстве.

## Первым делом
- **Карта кода и ответственность файлов → [ARCHITECTURE.md](ARCHITECTURE.md).** Читай его перед любыми правками.
- Expo сильно менялся: сверяйся с версионной докой https://docs.expo.dev/versions/v57.0.0/ перед написанием кода.

## Стек и архитектура
- Expo SDK 57 · RN 0.86 · React 19 · expo-router · Redux Toolkit + redux-persist (AsyncStorage) · expo-audio · expo-image-picker.
- **Feature-Sliced Design**: `shared → entities → features → widgets → pages → app`. Импорт только вниз по слоям.
- UI — голый `StyleSheet` + токены темы в `shared/ui` (без Tamagui/NativeWind), система «Modernist» (см. ниже). Иконки — `@expo/vector-icons` (Feather/Ionicons).
- Один локальный нативный **Expo Module** (`modules/pc-upload-server`, Kotlin, только Android) — HTTP-сервер приёма файлов с ПК. См. «Загрузка с ПК» в ARCHITECTURE.md.

## Дизайн-система «Modernist»
- Светлый ground `#FBFAF9`, единственный акцент `#EC3013`, гротеск **Golos Text** (`@expo-google-fonts/golos-text`, грузится в `app/_layout.tsx`). Токены — `shared/ui/theme.ts` (`type`/`typeCase`/`shadow`/`fontFamily`).
- **Плеер и мини-плеер — всегда тёмные**, независимо от темы приложения: `usePlayerTheme()` — фиксированная тёмная палитра, не связана с `useTheme()`. Светлые экраны — только на `useTheme()`.
- Сетка библиотеки — **2 колонки** (`COLUMNS` в `LibraryPage.tsx`) — не менять без явного запроса, уже обсуждалось дважды.
- Обложка без картинки — градиент по id + иконка мелодии **по центру** (не буква — заменено полностью, см. `BookCover.tsx`).
- Bottom sheet-кнопки (`ActionSheet`/`SheetAction`) — сплошная насыщенная заливка цветом (`tint`), белый текст/иконка (`P.accentText`), не лёгкий tint-фон. `cancelColor` красит саму «Отмена» так же (заливка+белый), если передан.

## Жёсткие правила (см. «Инварианты» в ARCHITECTURE.md)
- **Позиция — per-file**: правда по позиции внутри файла — `Chapter.positionSec`; `Book.progress.chapterIndex` — последний открытый файл (для «Продолжить»/подсветки). Единственный listener статуса аудио — в `PlayerProvider`.
- `shared/lib/audioService.ts` не знает про Redux; доменная логика — только в `features/player-controls/PlayerProvider.tsx`.
- Медиа-уведомление видно при **активной сессии** (играет ИЛИ на паузе); убирается только полным закрытием (`clearSession` → `status:'idle'`). Пауза его НЕ прячет. `audioService.release()` НЕ трогает `listeners` (подписка PlayerProvider живёт всё приложение).
- iOS: импортируемые файлы **копировать в песочницу** (URI протухают). Android: одиночные файлы, выбранные
  через системный пикер (`useImportBook.importFiles`, `File.pickFileAsync` из `expo-file-system`), в
  песочницу **не копируются** — храним только `content://`-путь на телефоне (как и папки через SAF,
  `Directory.pickDirectoryAsync`); `copyToSandbox` там всегда `false`. Долгоживущий доступ к этому URI
  обеспечивает не runtime-permission, а persistable URI permission — `File.pickFileAsync`/
  `Directory.pickDirectoryAsync` берут его сами на нативной стороне (`takePersistableUriPermission`),
  поэтому **обычный `expo-document-picker` для аудио/файлов не годится** (не берёт persistable-разрешение
  → URI может протухнуть после перезапуска приложения) — используется только `expo-file-system`-пикер.
  Локскрин требует `interruptionMode: 'doNotMix'`.
- `resetTransient()` вызывать на старте (в `app/_layout.tsx`), иначе `status:'playing'` оживёт из persist.
- **`modules/pc-upload-server`** — «глупый приёмник»: только пишет байты и шлёт события в JS. Сборка книги
  (`buildBook`/`addBook`) остаётся в JS (`features/pc-upload/usePcUpload.ts`) — не дублировать в Kotlin.
- `BookSource` — `'ios-copy' | 'android-pick' | 'android-saf' | 'android-upload' | 'sandbox-browse'`; нигде не
  участвует в switch/условиях по коду, добавлять новые варианты безопасно.
- Экран с фиксированной нижней панелью (кнопка/футер вне скролла) — `SafeAreaView` в проекте почти везде
  `edges={['top','left','right']}` (без `'bottom'`, чтобы не задваивать отступ с мини-плеером/скроллом), поэтому
  такой панели **обязательно** вручную добавлять `insets.bottom` (`useSafeAreaInsets()`) в её `paddingBottom` —
  иначе на устройствах с жестовой навигацией кнопка проваливается под системную панель и не нажимается
  (грабли, найдены на `StorageSettingsPage`).

## Запуск и проверка
- **Только dev build**: `npx expo run:ios` / `npx expo run:android` (не Expo Go — нужны нативные плагины expo-audio).
- Node 20.19+/22.13+/24.3+ (не 23 — RN 0.86 его не поддерживает). Строго обязательно и для сборки, и для
  `npx create-expo-module` (скаффолдинг локальных модулей) — на Node 23 гладко падает.
- Проверка без устройства: `npx tsc --noEmit -p tsconfig.json` · `npx expo lint` · `npx expo export --platform ios`.
- **ESLint намеренно закреплён на 8.57 + legacy `.eslintrc.js`** (`extends: 'expo'`), НЕ обновлять до 9/flat config:
  встроенный ESLint-плагин IntelliJ падает на ESLint 9 (удалённая опция `reportUnusedDisableDirectives`).
- FS: используется **новый** API `expo-file-system` (`File`/`Directory`/`Paths`). SAF (Android папки) — через `Directory.pickDirectoryAsync`.
- Пути книг в песочнице — только через `shared/lib/bookStorage.ts` (`booksDir`/`bookDir`/`saveBookCover`/`deleteBookCover`),
  не заводить второй `new Directory(Paths.document, 'books')` в другом файле.

## Локальные Expo Modules (грабли, см. `modules/pc-upload-server`)
- Модуль из `create-expo-module --local` **не создаёт `package.json`** — без него `expo-modules-autolinking` его
  не видит. Добавить `package.json` (name/main/types) вручную + прописать в корневом `package.json`
  `"<name>": "file:./modules/<name>"` + `npm install` (создаст симлинк в `node_modules`) — только тогда
  автолинковка находит модуль при `expo prebuild`.
- Манифест модуля (`android/src/main/AndroidManifest.xml`) — если добавляешь `<uses-permission android:name=...>`,
  **обязателен** `xmlns:android="http://schemas.android.com/apk/res/android"` в корневом теге, иначе манифест не
  парсится на сборке (`ManifestMerger2$MergeFailureException`), хотя `expo prebuild` при этом молча проходит —
  ошибка вылезает только на реальной сборке (`processDebugManifest`), не на prebuild.
- `android/` и `ios/` — disposable (`.gitignore`), правки руками там теряются на следующий `expo prebuild --clean`.
- **NanoHTTPD 2.3.1 (`pc-upload-server`) декодирует multipart-заголовки/значения как US-ASCII**, если браузер не
  прислал явный `charset` в `Content-Type` (а он не присылает) — кириллица в `filename=`/текстовых полях
  необратимо превращается в `?` ещё при разборе тела запроса, восстановить потом нельзя. Обход: имена файлов и
  `title` шлём с клиента (`pc_upload.html`) через `encodeURIComponent` отдельными ASCII-safe полями,
  на сервере (`PcUploadServerModule.kt`) декодируем `URLDecoder.decode(..., "UTF-8")` (`decodeText()`) — не
  полагаться на `session.parms[field]`/`filename=` для не-ASCII текста.
- `.expo/dev/logs/start.log` — фактический лог Metro/бандлинга (JSONL), не stdout процесса `expo start`.

## Вне MVP (v2)
Главы внутри m4b, ID3-теги/встроенные обложки, закладки, онбординг, отдельный экран поиска, share-extension,
импорт по URL, синхронизация, загрузка с ПК на iOS (модуль — только Android).
