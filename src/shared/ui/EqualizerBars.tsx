import { useEffect, useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

type Props = {
  color: string;
  /** Высота эквалайзера в px. */
  height?: number;
  /** Анимировать (играет) или показать статично (пауза). */
  playing?: boolean;
  bars?: number;
};

/** Разный стартовый профиль высот, чтобы полосы не были одинаковыми в статике. */
const STATIC_HEIGHTS = [0.5, 0.9, 0.35, 0.7, 0.55];

/** Анимированная «звуковая волна» — индикатор играющей дорожки (как эквалайзер). */
export function EqualizerBars({ color, height = 18, playing = true, bars = 4 }: Props) {
  // Разные стартовые значения → полосы разной высоты и десинхронизированы.
  const values = useMemo(
    () => Array.from({ length: bars }, (_, i) => new Animated.Value(STATIC_HEIGHTS[i % STATIC_HEIGHTS.length])),
    [bars],
  );

  useEffect(() => {
    if (!playing) {
      values.forEach((v, i) => v.stopAnimation(() => v.setValue(STATIC_HEIGHTS[i % STATIC_HEIGHTS.length])));
      return;
    }
    const anims = values.map((v, i) => {
      const dur = 300 + i * 110;
      return Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: dur, useNativeDriver: false }),
          Animated.timing(v, { toValue: 0.25, duration: dur, useNativeDriver: false }),
        ]),
      );
    });
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [playing, values]);

  return (
    <View style={[styles.row, { height }]}>
      {values.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            backgroundColor: color,
            height: v.interpolate({ inputRange: [0, 1], outputRange: [height * 0.22, height] }),
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
});
