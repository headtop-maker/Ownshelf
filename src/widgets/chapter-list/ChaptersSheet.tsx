import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Chapter } from '@/entities/book';
import { BottomSheet, Text, usePlayerTheme } from '@/shared/ui';
import { ChapterList } from './ChapterList';

type Props = {
  visible: boolean;
  onClose: () => void;
  chapters: Chapter[];
  currentIndex: number;
  onSelect: (index: number) => void;
};

/** Нижний шит со списком глав (виртуализированный) — как меню добавления книги: слайд снизу, палочка, свайп-закрытие. */
export function ChaptersSheet({ visible, onClose, chapters, currentIndex, onSelect }: Props) {
  const P = usePlayerTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <BottomSheet visible={visible} onClose={onClose} scrollable>
      <View style={[styles.sheet, { backgroundColor: P.bg, paddingBottom: insets.bottom + 12, maxHeight: height * 0.7 }]}>
        <View style={[styles.handle, { backgroundColor: P.track }]} />
        <Text variant="cardTitle" color={P.text} style={styles.title}>
          Файлы
        </Text>
        <ChapterList
          chapters={chapters}
          currentIndex={currentIndex}
          onSelect={(index) => {
            onSelect(index);
            onClose();
          }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingTop: 8, paddingHorizontal: 12, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  title: { marginBottom: 8, paddingHorizontal: 6 },
});
