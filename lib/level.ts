export type LevelSignal = "too_easy" | "ok" | "too_hard";

export function clampLevel(n: number): number {
  return Math.max(1, Math.min(6, Math.round(n)));
}

// First session starts one notch below the diagnosed level for an easy win.
export function startingLevel(measured: number): number {
  return clampLevel(measured - 1);
}

// Hidden level drives TTS speed: slow for beginners, near-native at the top.
const SPEED: Record<number, number> = { 1: 0.85, 2: 0.9, 3: 0.95, 4: 1.0, 5: 1.05, 6: 1.1 };
export function levelToSpeed(level?: number | null): number {
  if (!level) return 0.95;
  return SPEED[clampLevel(level)] ?? 0.95;
}

// Gradual: at most ±1 per session so the difficulty never lurches.
export function nudgeLevel(current: number, signal: LevelSignal): number {
  const delta = signal === "too_easy" ? 1 : signal === "too_hard" ? -1 : 0;
  return clampLevel(current + delta);
}
