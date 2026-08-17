import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, type PanResponderGestureState, PanResponder, Pressable, StyleSheet } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Контент прокручивается (FlatList и т.п.) — не перехватывать свайп по телу, чтобы не красть скролл.
   *  Закрытие свайпом остаётся по верхней палочке. */
  scrollable?: boolean;
};

const DEFAULT_H = 600;
const GRAB_ZONE = 44; // верхняя полоса «палочки» — тянется сразу по касанию (выше кнопок)

/**
 * Нижний шит: затемнение (fade) + выезд снизу + свайп вниз для закрытия.
 * JS-драйвер (useNativeDriver:false), чтобы перетаскивание пальцем реально двигало панель.
 * Захват свайпа: по всему телу (при явном вертикальном движении) и мгновенно — по верхней полосе-палочке.
 */
export function BottomSheet({ visible, onClose, children, scrollable }: Props) {
  const [mounted, setMounted] = useState(visible);
  const [sheetH, setSheetH] = useState(0);
  const [y] = useState(() => new Animated.Value(0)); // translateY, px: 0 = открыт, sheetH = закрыт
  const hRef = useRef(0);
  const startY = useRef(0);
  // onClose обычно инлайн-колбэк родителя и меняет ссылку на каждый его ре-рендер (например, экран
  // книги ре-рендерится ежесекундно во время воспроизведения из-за тикающей позиции). Держим последний
  // колбэк в ref и НЕ включаем onClose в зависимости жестов ниже — иначе PanResponder пересоздаётся
  // посреди активного тача/свайпа и рвёт его (тап по контенту шита мог закрывать сам шит).
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const h = hRef.current || DEFAULT_H;
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      y.setValue(h);
      Animated.timing(y, { toValue: 0, duration: 240, useNativeDriver: false }).start();
    } else {
      Animated.timing(y, { toValue: h, duration: 200, useNativeDriver: false }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, y]);

  const { body, grab } = useMemo(() => {
    const onGrant = () => {
      y.stopAnimation((v) => {
        startY.current = v;
      });
    };
    const onMove = (_e: unknown, g: PanResponderGestureState) => {
      y.setValue(Math.max(0, startY.current + g.dy));
    };
    const onRelease = (_e: unknown, g: PanResponderGestureState) => {
      const h = hRef.current || DEFAULT_H;
      if (startY.current + g.dy > h * 0.3 || g.vy > 1.1) onCloseRef.current();
      else Animated.spring(y, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start();
    };
    const onTerminate = () => {
      Animated.spring(y, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start();
    };
    const shared = {
      onPanResponderGrant: onGrant,
      onPanResponderMove: onMove,
      onPanResponderRelease: onRelease,
      onPanResponderTerminate: onTerminate,
    };
    return {
      // Тело шита: претендуем на жест только при явном вертикальном свайпе вниз (тапы по кнопкам проходят).
      // Для scrollable-контента НЕ перехватываем в capture-фазе — иначе украли бы скролл списка.
      // eslint-disable-next-line react-hooks/refs
      body: PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dy > 4 && g.dy > Math.abs(g.dx),
        ...(scrollable
          ? {}
          : { onMoveShouldSetPanResponderCapture: (_e: unknown, g: PanResponderGestureState) => g.dy > 8 && g.dy > Math.abs(g.dx) * 1.5 }),
        ...shared,
      }),
      // Полоса-палочка: тянется сразу по касанию (мгновенный захват сверху).
      // eslint-disable-next-line react-hooks/refs
      grab: PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        ...shared,
      }),
    };
    // onClose намеренно не в зависимостях — см. onCloseRef выше.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [y, scrollable]);

  if (!mounted) return null;

  const opacity = y.interpolate({ inputRange: [0, sheetH || DEFAULT_H], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => onCloseRef.current()}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => onCloseRef.current()} />
      </Animated.View>
      <Animated.View
        {...body.panHandlers}
        style={[styles.sheet, { transform: [{ translateY: y }] }]}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          hRef.current = h;
          setSheetH(h);
        }}
      >
        {children}
        {/* Прозрачная зона-захват поверх палочки/заголовка — тянется сразу. Кнопки ниже неё. */}
        <Animated.View {...grab.panHandlers} style={styles.grabZone} pointerEvents="box-only" />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  grabZone: { position: 'absolute', top: 0, left: 0, right: 0, height: GRAB_ZONE },
});
