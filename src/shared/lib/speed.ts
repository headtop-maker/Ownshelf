/** Следующая скорость по кругу из списка пресетов. */
export function cycleSpeed(current: number, presets: readonly number[]): number {
  const i = presets.indexOf(current);
  return presets[(i + 1) % presets.length];
}
