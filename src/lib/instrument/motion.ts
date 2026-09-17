/** Intro camera + bloom envelopes. One zoom out. One bloom per solid. No bounce. */

import { INTRO_MS, INTRO_ORDER, type IntroBeat } from "./cosmology.ts";

export const INTRO_CAM_START = 7.2;
export const INTRO_CAM_END = 34;
export const OTHER_HALF_OPACITY = 0.25;
export const BLOOM_PEAK_AT = 0.42;
export const CUBE_OVERSHOOT = 2.8;
export const SHELL_OVERSHOOT = 2.4;

let origin = 0;

export function markIntroFrame(now: number) {
  if (origin === 0) origin = now;
}

export function resetIntroClock() {
  origin = 0;
}

export function introOrigin() {
  return origin;
}

export function introElapsed(now: number) {
  if (origin === 0) return 0;
  return Math.max(0, now - origin);
}

export function clamp01(t: number) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function easeOutCubic(t: number) {
  const u = 1 - clamp01(t);
  return 1 - u * u * u;
}

export function easeInOutCubic(t: number) {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

export function introTotalMs() {
  return INTRO_ORDER.reduce((sum, id) => sum + INTRO_MS[id], 0);
}

export function introProgress(elapsed: number) {
  return clamp01(elapsed / introTotalMs());
}

export function beatLocalProgress(elapsed: number, beat: IntroBeat) {
  let acc = 0;
  for (const id of INTRO_ORDER) {
    if (id === beat) return clamp01((elapsed - acc) / INTRO_MS[id]);
    acc += INTRO_MS[id];
  }
  return 1;
}

/** Monotonic. Never decreases. Ease-out so it leaves the center and stops once. */
export function introCameraRadius(progress: number) {
  return INTRO_CAM_START + (INTRO_CAM_END - INTRO_CAM_START) * easeOutCubic(progress);
}

export function introCameraPosition(progress: number): [number, number, number] {
  const r = introCameraRadius(progress);
  const yaw = 0.35;
  const pitch = 0.2;
  const cp = Math.cos(pitch);
  return [Math.sin(yaw) * r * cp, Math.sin(pitch) * r, Math.cos(yaw) * r * cp];
}

/** 0 → overshoot → rest. Peak at BLOOM_PEAK_AT. No second bounce. */
export function bloomScale(t: number, rest: number, overshoot: number) {
  const u = clamp01(t);
  if (u <= 0) return 0;
  if (u >= 1) return rest;
  if (u <= BLOOM_PEAK_AT) {
    return rest * overshoot * easeOutCubic(u / BLOOM_PEAK_AT);
  }
  const v = easeInOutCubic((u - BLOOM_PEAK_AT) / (1 - BLOOM_PEAK_AT));
  return rest * (overshoot + (1 - overshoot) * v);
}

export function bloomState(
  intro: boolean,
  beat: IntroBeat,
  gate: IntroBeat,
): { active: boolean; settled: boolean } {
  if (!intro) return { active: false, settled: true };
  if (beat === "pulse" || gate === "pulse") return { active: false, settled: false };
  const order = INTRO_ORDER;
  const i = order.indexOf(beat);
  const g = order.indexOf(gate);
  if (i < 0 || g < 0) return { active: false, settled: false };
  return { active: beat === gate, settled: i > g };
}
