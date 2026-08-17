import {
  type AudioMetadata,
  type AudioPlayer,
  type AudioStatus,
  createAudioPlayer,
  setAudioModeAsync,
} from 'expo-audio';
import { PLAYER_UPDATE_INTERVAL_MS } from '@/shared/config/constants';

type StatusListener = (status: AudioStatus) => void;

/**
 * Тонкий синглтон над expo-audio: держит один AudioPlayer, транслирует статус подписчикам,
 * управляет локскрином. Вся доменная логика (переходы глав, сохранение прогресса) — в контроллере выше.
 */
class AudioService {
  private player: AudioPlayer | null = null;
  private sub: { remove: () => void } | null = null;
  private listeners = new Set<StatusListener>();
  private currentUri: string | null = null;
  private lockScreenActive = false;

  /** Настройка аудио-сессии: фон + доступ к локскрину (doNotMix — обязательное условие локскрина). */
  async configureSession(): Promise<void> {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
  }

  /** Загрузить главу (uri). Пересоздаёт плеер только если сменился источник. */
  load(uri: string, opts: { rate?: number; positionSec?: number }): void {
    if (this.currentUri !== uri) {
      this.teardownPlayer();
      this.player = createAudioPlayer({ uri }, { updateInterval: PLAYER_UPDATE_INTERVAL_MS });
      this.currentUri = uri;
      this.sub = this.player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        this.listeners.forEach((l) => l(status));
      });
    }
    if (opts.rate != null) this.player!.setPlaybackRate(opts.rate);
    if (opts.positionSec != null && opts.positionSec > 0) {
      void this.player!.seekTo(opts.positionSec);
    }
  }

  play(): void {
    this.player?.play();
  }

  pause(): void {
    this.player?.pause();
  }

  async seekTo(seconds: number): Promise<void> {
    await this.player?.seekTo(Math.max(0, seconds));
  }

  async seekBy(delta: number): Promise<void> {
    if (!this.player) return;
    const target = Math.max(0, Math.min(this.player.currentTime + delta, this.player.duration || Infinity));
    await this.player.seekTo(target);
  }

  setRate(rate: number): void {
    this.player?.setPlaybackRate(rate);
  }

  get currentTime(): number {
    return this.player?.currentTime ?? 0;
  }

  get duration(): number {
    return this.player?.duration ?? 0;
  }

  get isLoaded(): boolean {
    return this.player?.isLoaded ?? false;
  }

  get playing(): boolean {
    return this.player?.playing ?? false;
  }

  updateLockScreen(active: boolean, metadata?: AudioMetadata): void {
    if (!this.player) return;
    this.lockScreenActive = active;
    this.player.setActiveForLockScreen(active, metadata, {
      showSeekForward: true,
      showSeekBackward: true,
    });
  }

  onStatus(listener: StatusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private teardownPlayer(): void {
    this.sub?.remove();
    this.sub = null;
    if (this.player) {
      try {
        this.player.pause();
        this.player.release();
      } catch {
        // плеер мог быть уже освобождён
      }
    }
    this.player = null;
    this.currentUri = null;
  }

  /**
   * Освободить плеер (например, при «Закрыть»). НЕ трогаем listeners — это подписка PlayerProvider,
   * заводится один раз при монтировании; её очистка убила бы обновления статуса до перезапуска приложения.
   */
  release(): void {
    this.teardownPlayer();
    this.lockScreenActive = false;
  }
}

export const audioService = new AudioService();
