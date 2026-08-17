import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from '@/shared/ui';

type Props = {
  isPlaying: boolean;
  isFirst: boolean;
  isLast: boolean;
  /** Цвет заливки play + акцент. */
  accent: string;
  /** Иконка на play-кнопке. */
  accentText: string;
  /** Цвет линий/иконок на тёмном фоне. */
  line: string;
  /** Цвет контуров боксов ±N. */
  border: string;
  /** Шаг перемотки, сек. */
  skipSeconds: number;
  onPrev: () => void;
  onRewind: () => void;
  onToggle: () => void;
  onForward: () => void;
  onNext: () => void;
};

/** Транспорт плеера: пред. файл · −N · круглая play/pause · +N · след. файл. */
export function PlayerTransport({
  isPlaying,
  isFirst,
  isLast,
  accent,
  accentText,
  line,
  border,
  skipSeconds,
  onPrev,
  onRewind,
  onToggle,
  onForward,
  onNext,
}: Props) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <Pressable onPress={onPrev} disabled={isFirst} hitSlop={8} style={{ opacity: isFirst ? 0.3 : 1 }}>
        <Feather name="skip-back" size={26} color={line} />
      </Pressable>

      <Pressable onPress={onRewind} style={[styles.skipBox, { borderColor: border }]}>
        <Text variant="numeric" color={line}>
          −{skipSeconds}
        </Text>
      </Pressable>

      <Pressable onPress={onToggle} style={[styles.playCircle, { backgroundColor: accent }, t.shadow.accentPlay]}>
        <Feather
          name={isPlaying ? 'pause' : 'play'}
          size={32}
          color={accentText}
          style={isPlaying ? undefined : styles.playNudge}
        />
      </Pressable>

      <Pressable onPress={onForward} style={[styles.skipBox, { borderColor: border }]}>
        <Text variant="numeric" color={line}>
          +{skipSeconds}
        </Text>
      </Pressable>

      <Pressable onPress={onNext} disabled={isLast} hitSlop={8} style={{ opacity: isLast ? 0.3 : 1 }}>
        <Feather name="skip-forward" size={26} color={line} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 16 },
  skipBox: { minWidth: 48, height: 40, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  playCircle: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  playNudge: { marginLeft: 3 },
});
