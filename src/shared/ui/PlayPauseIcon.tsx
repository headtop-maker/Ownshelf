import { View } from 'react-native';

type Props = {
  playing: boolean;
  color: string;
  /** Базовый размер иконки в px. */
  size?: number;
};

/**
 * Иконка play/pause, нарисованная геометрией (без unicode-глифов).
 * На Android символы ⏸/▶ превращаются в цветные emoji и выглядят несогласованно — поэтому рисуем сами.
 */
export function PlayPauseIcon({ playing, color, size = 24 }: Props) {
  if (playing) {
    const barW = Math.round(size * 0.24);
    const barH = Math.round(size * 0.92);
    const bar = { width: barW, height: barH, backgroundColor: color, borderRadius: 2 };
    return (
      <View style={{ flexDirection: 'row', gap: Math.round(size * 0.2) }}>
        <View style={bar} />
        <View style={bar} />
      </View>
    );
  }
  // Треугольник «play» через границы.
  const half = Math.round(size * 0.46);
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderTopWidth: half,
        borderBottomWidth: half,
        borderLeftWidth: Math.round(size * 0.78),
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: color,
        marginLeft: Math.round(size * 0.16),
      }}
    />
  );
}
