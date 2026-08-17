import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch } from '@/app-store';
import { updateBookMeta, type Book } from '@/entities/book';
import { pruneBookCovers } from '@/shared/lib/bookStorage';
import { ActionSheet, BottomSheet, Button, familyForWeight, Text, useTheme } from '@/shared/ui';
import { useBookCoverEditor } from './useBookCoverEditor';

type Props = {
  book: Book;
  visible: boolean;
  onClose: () => void;
};

/** Ручная правка названия, автора и обложки книги (фото из галереи или с камеры). */
export function EditMetaModal({ book, visible, onClose }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author ?? '');
  const cover = useBookCoverEditor({ bookId: book.id, successColor: t.colors.success });

  // Модалка не размонтируется между открытиями (живёт внутри карточки) — без этого при повторном
  // открытии показывались бы поля из предыдущей сессии редактирования, а не текущие данные книги.
  useEffect(() => {
    if (!visible) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- синхронизация формы с book при каждом открытии немонтируемой модалки
    setTitle(book.title);
    setAuthor(book.author ?? '');
    cover.setCoverUri(book.coverUri);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cover.setCoverUri стабилен (useState-сеттер), не нужен в зависимостях
  }, [visible, book]);

  const save = () => {
    // saveBookCover() пишет новый файл сразу при выборе фото, но старый не трогает (см. её комментарий) —
    // подчищаем всё лишнее (старую обложку при замене, любой файл при «Удалить обложку») только тут,
    // по подтверждению формы, оставляя единственным файлом тот, что реально попадёт в Redux.
    pruneBookCovers(book.id, cover.coverUri);
    dispatch(
      updateBookMeta({ id: book.id, title: title.trim() || book.title, author: author.trim(), coverUri: cover.coverUri }),
    );
    onClose();
  };

  // Отмена/свайв-закрытие/тап по фону — черновик не сохраняем. Но camera/gallery-пик уже мог успеть
  // записать новый файл обложки на диск (saveBookCover) — подчищаем его здесь, оставляя нетронутой
  // оригинальную обложку книги, иначе на диске оставался бы осиротевший файл.
  const handleClose = () => {
    pruneBookCovers(book.id, book.coverUri);
    onClose();
  };

  const inputStyle = {
    backgroundColor: t.colors.surface,
    color: t.colors.text,
    borderColor: t.colors.divider,
    borderRadius: t.radius.sm,
    fontFamily: familyForWeight('400'),
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={handleClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: t.colors.bg, paddingBottom: insets.bottom + 16, borderTopLeftRadius: t.radius.sheet, borderTopRightRadius: t.radius.sheet },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: t.colors.divider }]} />
            <Text variant="cardTitle" color={t.colors.text}>
              Редактировать
            </Text>

            <Pressable
              onPress={() => cover.setSheetOpen(true)}
              disabled={cover.busy}
              style={[styles.coverBox, { backgroundColor: t.colors.surface, borderColor: t.colors.divider }]}
            >
              {cover.coverUri ? (
                <Image source={{ uri: cover.coverUri }} style={styles.coverImg} contentFit="cover" />
              ) : (
                <Feather name="image" size={40} color={t.colors.subtle} />
              )}
              <View style={[styles.coverBadge, { backgroundColor: t.colors.accent, borderColor: t.colors.bg }]}>
                <Feather name="camera" size={18} color={t.colors.accentText} />
              </View>
            </Pressable>

            <View style={{ gap: 6 }}>
              <Text variant="kicker" color={t.colors.accent}>
                Название
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Название"
                placeholderTextColor={t.colors.textMuted}
                style={[styles.input, inputStyle]}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text variant="kicker" color={t.colors.accent}>
                Автор
              </Text>
              <TextInput
                value={author}
                onChangeText={setAuthor}
                placeholder="Автор"
                placeholderTextColor={t.colors.textMuted}
                style={[styles.input, inputStyle]}
              />
            </View>
            <View style={styles.actions}>
              <Button title="Отмена" variant="secondary" onPress={handleClose} style={{ flex: 1 }} />
              <Button title="Сохранить" onPress={save} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>

      <ActionSheet
        visible={cover.sheetOpen}
        onClose={() => cover.setSheetOpen(false)}
        title="Обложка книги"
        actions={cover.actions}
        cancelColor={t.colors.danger}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: 20, paddingTop: 8, gap: 16 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 4 },
  input: { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  coverBox: {
    width: 140,
    height: 140,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    overflow: 'visible',
  },
  coverImg: { width: '100%', height: '100%', borderRadius: 15 },
  coverBadge: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
