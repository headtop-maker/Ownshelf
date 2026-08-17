import { StyleSheet, View } from 'react-native';
import { useAppSelector } from '@/app-store';
import { selectPlaybackDuration, selectPlaybackPosition } from '@/entities/playback';
import { formatTime } from '@/shared/lib/format';
import { Seekbar, Text } from '@/shared/ui';
import { usePlayer } from './PlayerProvider';

type Props = {
  /** Длительность главы из книги — фолбэк, пока `pb.duration` ещё не подтянулась после старта сессии. */
  fallbackDuration: number;
  color: string;
  trackColor: string;
  textColor: string;
  textMutedColor: string;
};

/**
 * Позиция плеера: штрих-seekbar + метки времени. Читает `positionSec`/`duration` из Redux САМ,
 * отдельным узкими селекторами — тикает каждую секунду только этот компонент, а не весь `NowPlaying`
 * (обложка/эквалайзер/транспорт/нижняя панель не связаны с позицией и не должны ре-рендериться из-за неё).
 */
export function PlaybackProgress({ fallbackDuration, color, trackColor, textColor, textMutedColor }: Props) {
  const player = usePlayer();
  const positionSec = useAppSelector(selectPlaybackPosition);
  const durationRaw = useAppSelector(selectPlaybackDuration);
  const duration = durationRaw || fallbackDuration;
  const remaining = Math.max(0, duration - positionSec);

  return (
    <View style={styles.timeBlock}>
      <Seekbar value={positionSec} duration={duration} onSeek={player.seekTo} color={color} trackColor={trackColor} />
      <View style={styles.times}>
        <Text variant="numeric" color={textColor}>
          {formatTime(positionSec)}
        </Text>
        <Text variant="numeric" color={textMutedColor}>
          −{formatTime(remaining)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timeBlock: { marginTop: 22 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -2 },
});
