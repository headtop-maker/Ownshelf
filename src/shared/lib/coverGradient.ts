/**
 * Детерминированный градиент обложки по id книги — когда своей картинки нет.
 * Один и тот же id всегда даёт один и тот же цвет (стабильно между запусками).
 */

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

export type CoverGradient = {
  /** Два цвета для самой обложки (насыщенные). */
  colors: readonly [string, string];
  /** Полупрозрачный верхний «подсвет» для фона экрана плеера. */
  washTop: string;
  /** Плотный цвет того же тона (для мелких элементов). */
  solid: string;
};

export function coverGradient(id: string): CoverGradient {
  const hue = hashId(id) % 360;
  const hue2 = (hue + 45) % 360;
  return {
    colors: [`hsl(${hue}, 58%, 42%)`, `hsl(${hue2}, 62%, 26%)`],
    washTop: `hsla(${hue}, 60%, 45%, 0.28)`,
    solid: `hsl(${hue}, 55%, 40%)`,
  };
}
