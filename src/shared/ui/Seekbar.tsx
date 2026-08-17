import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import { useTheme } from './theme';

type Props = {
  /** Текущее значение в секундах. */
  value: number;
  /** Максимум в секундах. */
  duration: number;
  /** Вызывается при завершении перетаскивания/тапа с новой позицией в секундах. */
  onSeek: (seconds: number) => void;
  /** Цвет заполнения/бегунка (по умолчанию accent темы). */
  color?: string;
  /** Цвет незаполненной дорожки (по умолчанию border темы). */
  trackColor?: string;
};

/**
 * Самодельный seek-бар на PanResponder (без внешних зависимостей).
 * Во время перетаскивания показывает локальную позицию, по отпусканию — коммитит через onSeek.
 * PanResponder пересоздаётся при смене width/duration/onSeek и замыкает их по значению (без ref-ов).
 */
export function Seekbar({ value, duration, onSeek, color, trackColor }: Props) {
  const t = useTheme();
  const fillColor = color ?? t.colors.accent;
  const barColor = trackColor ?? t.colors.border;
  const [width, setWidth] = useState(0);
  const [dragFrac, setDragFrac] = useState<number | null>(null);
  // После перемотки держим целевую позицию, пока реальная (value) не догонит — иначе рывок назад.
  const [pending, setPending] = useState<number | null>(null);
  // Абсолютный левый край бара (pageX), фиксируется в момент касания — для плавного расчёта по moveX.
  const barLeft = useRef(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  useEffect(() => {
    if (pending == null || duration <= 0) return;
    // Сброс «прикреплённой» позиции, когда реальная догнала цель (синхронизация с внешним value).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (Math.abs(value - pending * duration) < 2) setPending(null);
  }, [value, pending, duration]);

  const responder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- barLeft читается только в обработчиках жеста
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const w = width || 1;
          // Запоминаем абсолютный левый край бара: pageX касания минус локальная координата в баре.
          barLeft.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
          setDragFrac(Math.max(0, Math.min(1, e.nativeEvent.locationX / w)));
        },
        onPanResponderMove: (_e, g) => {
          const w = width || 1;
          // moveX — абсолютная координата жеста (плавная); locationX при движении на Android скачет
          // (меняется под-вью под пальцем: трек/заливка/бегунок), из-за чего перемотка дёргалась.
          setDragFrac(Math.max(0, Math.min(1, (g.moveX - barLeft.current) / w)));
        },
        onPanResponderRelease: () => {
          setDragFrac((frac) => {
            // Перематываем только когда длительность известна, иначе не сбрасываем в начало.
            if (frac != null && duration > 0) {
              onSeek(frac * duration);
              setPending(frac);
            }
            return null;
          });
        },
        onPanResponderTerminate: () => setDragFrac(null),
      }),
    [width, duration, onSeek],
  );

  const frac =
    dragFrac != null
      ? dragFrac
      : pending != null
        ? pending
        : duration > 0
          ? Math.max(0, Math.min(1, value / duration))
          : 0;
  const filledWidth = width * frac;

  return (
    <View style={styles.hitbox} onLayout={onLayout} {...responder.panHandlers}>
      <View style={[styles.track, { backgroundColor: barColor }]}>
        <View style={[styles.fill, { width: filledWidth, backgroundColor: fillColor }]} />
        {/* Thumb — вертикальный штрих 4×14 (по макету «Modernist»), а не круг. */}
        <View style={[styles.thumb, { left: Math.max(0, filledWidth - 2), backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hitbox: { paddingVertical: 12, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, justifyContent: 'center' },
  fill: { height: 4, borderRadius: 2 },
  thumb: { position: 'absolute', width: 4, height: 14, borderRadius: 1, top: -5 },
});
