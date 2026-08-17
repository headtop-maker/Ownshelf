import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { coverGradient } from '@/shared/lib/coverGradient';

type Props = {
  /** id книги — для стабильного градиента, когда нет обложки. */
  id: string;
  title: string;
  uri?: string;
  /** Квадрат: задать size. Прямоугольник: задать width/height (перекрывают size). */
  size?: number;
  width?: number;
  height?: number;
  radius: number;
  /** Явный размер иконки-заглушки (иначе — авто от размера обложки). */
  iconSize?: number;
  /** Заменяет дефолтную иконку-заглушку (ноту) произвольным центральным контентом. */
  centerContent?: ReactNode;
  /** Доля прослушанного [0..1]; если > 0 — рисуем полосу прогресса снизу обложки. */
  progress?: number;
  /** Цвет заполнения полосы прогресса. */
  accent?: string;
};

/** Обложка книги: картинка, либо детерминированный градиент с иконкой мелодии по центру; опц. полоса прогресса снизу. */
export function BookCover({
  id,
  uri,
  size,
  width,
  height,
  radius,
  iconSize,
  centerContent,
  progress = 0,
  accent = '#EC3013',
}: Props) {
  const w = width ?? size ?? 0;
  const h = height ?? size ?? 0;
  const bar =
    progress > 0 ? (
      <View style={[styles.progressTrack, { width: w * progress, backgroundColor: accent }]} />
    ) : null;

  if (uri) {
    return (
      <View style={[{ width: w, height: h, borderRadius: radius, overflow: 'hidden' }, styles.center]}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        {centerContent}
        {progress > 0 ? <View style={styles.trackBg} /> : null}
        {bar}
      </View>
    );
  }

  const g = coverGradient(id);
  // Без обложки — заглушка «это просто аудио»: иконка мелодии по центру градиента.
  const auto = Math.max(20, Math.min(64, Math.round(Math.min(w, h) * 0.36)));
  return (
    <LinearGradient
      colors={g.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ width: w, height: h, borderRadius: radius, overflow: 'hidden' }, styles.center]}
    >
      {centerContent ?? <Ionicons name="musical-notes" size={iconSize ?? auto} color="rgba(251,250,249,0.92)" />}
      {progress > 0 ? <View style={styles.trackBg} /> : null}
      {bar}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  trackBg: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, backgroundColor: 'rgba(0,0,0,0.25)' },
  progressTrack: { position: 'absolute', left: 0, bottom: 0, height: 4 },
});
