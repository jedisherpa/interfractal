/** Choice remainder. The field cannot take these acts. Love is |C| ≥ 1. */

import { formPoint, type FormStage } from "./formation.ts";

export type RemainderAct = "skip" | "steer" | "stay" | "commit" | "miss" | "reduce-motion";

export type RemainderInput = {
  phase: "pulse" | "gate" | "intro" | "room";
  formStage: FormStage;
  wellOpen: boolean;
  cyclePlaying: boolean;
  reducedMotion: boolean;
};

export function remainderOf(input: RemainderInput): RemainderAct[] {
  const acts: RemainderAct[] = ["reduce-motion"];
  if (input.phase === "intro") acts.push("skip");
  if (input.phase === "room" && !input.wellOpen) acts.push("steer");
  if (input.formStage === "hold" && !input.wellOpen) {
    acts.push("stay", "commit", "miss");
  }
  void input.cyclePlaying;
  void input.reducedMotion;
  return acts;
}

export function remainderOpen(input: RemainderInput): boolean {
  return remainderOf(input).length >= 1;
}

/** People are points: one triple per index. Never a tube. */
export function personPoint(stage: FormStage, i: number, n: number, t: number) {
  return formPoint(stage, i, n, t);
}
