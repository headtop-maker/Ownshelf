import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { saveBookCover } from '@/shared/lib/bookStorage';
import type { SheetAction } from '@/shared/ui';

type Options = {
  bookId: string;
  /** Цвет заливки действий «Сделать фото»/«Выбрать из галереи». */
  successColor: string;
};

/**
 * Смена обложки книги: выбор источника (камера/галерея/удаление) + сохранение в песочницу.
 * Вынесено из EditMetaModal в отдельный хук — держит только свой кусок состояния (черновик
 * coverUri, открыт ли шит выбора источника, идёт ли сохранение) и не зависит от формы
 * названия/автора и колбэков родителя. Раньше всё это жило в одном компоненте и на каждый
 * ре-рендер EditMetaModal (например, из-за тикающей позиции воспроизведения у родителя)
 * пересоздавались лишние функции — источник нестабильности для жестов BottomSheet.
 */
export function useBookCoverEditor({ bookId, successColor }: Options) {
  const [coverUri, setCoverUri] = useState<string | undefined>(undefined);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const applyCover = useCallback(
    async (sourceUri: string) => {
      setBusy(true);
      try {
        const saved = await saveBookCover(bookId, sourceUri);
        setCoverUri(saved);
      } catch (e) {
        Alert.alert('Не удалось сохранить обложку', String(e instanceof Error ? e.message : e));
      } finally {
        setBusy(false);
      }
    },
    [bookId],
  );

  const fromLibrary = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Нет доступа', 'Разрешите доступ к галерее в настройках телефона.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) await applyCover(res.assets[0].uri);
  }, [applyCover]);

  const fromCamera = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Нет доступа', 'Разрешите доступ к камере в настройках телефона.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!res.canceled && res.assets[0]) await applyCover(res.assets[0].uri);
  }, [applyCover]);

  // Только локально — реальное удаление файла делает вызывающая сторона в момент сохранения формы,
  // а не тут, иначе «Отмена» после этого тапа не отменяла бы удаление.
  const removeCover = useCallback(() => setCoverUri(undefined), []);

  const actions: SheetAction[] = [
    { label: 'Сделать фото', icon: 'camera-outline', tint: successColor, onPress: () => void fromCamera() },
    { label: 'Выбрать из галереи', icon: 'image-outline', tint: successColor, onPress: () => void fromLibrary() },
    ...(coverUri
      ? [{ label: 'Удалить обложку', icon: 'trash-outline' as const, destructive: true, onPress: removeCover }]
      : []),
  ];

  return {
    coverUri,
    /** Синхронизация черновика с текущей обложкой книги (при открытии формы). */
    setCoverUri,
    sheetOpen,
    setSheetOpen,
    busy,
    actions,
  };
}
