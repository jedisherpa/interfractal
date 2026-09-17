/**
 * Carry is phase and constraint, not consent.
 * A new draft does not inherit Yes. Ready never travels.
 */

import type { WorkshopDirector } from "@/workshop/director.ts";
import type { VertexId } from "@/workshop/types.ts";
import type { EndingId, WellnessId, WorldId } from "./cosmology.ts";
import { PATHWAYS, WELLNESS_IDS } from "./cosmology.ts";

export type CarryMark = {
  from: WorldId;
  to: WorldId;
  direction: "down" | "up";
  kind: "constraint" | "challenged" | "held";
  label: string;
};

const VERTEX_WORLD: Record<VertexId, WorldId> = {
  V0: "W1",
  V1: "W2",
  V2: "W3",
  V3: "W4",
};

export function isSettled(director: WorkshopDirector, vertex: VertexId): boolean {
  const ws = director.workshop(vertex);
  const agreement = ws.agreement;
  if (!agreement || agreement.status !== "active") return false;
  const version = agreement.proposal.version;
  if (agreement.evidenceVersion !== version) return false;
  if (agreement.authorityVersion !== version) return false;
  if (agreement.safetyVersion !== version) return false;
  for (const name of agreement.proposal.participants) {
    if (ws.consents[`${version}:${name}`] !== true) return false;
  }
  return true;
}

export function wellnessHeld(aligned: Record<WellnessId, boolean>, holdMs: number) {
  const all = WELLNESS_IDS.every((id) => aligned[id]);
  return all && holdMs >= 8000;
}

export function carryMarks(
  director: WorkshopDirector,
  aligned: Record<WellnessId, boolean>,
  holdMs: number,
): CarryMark[] {
  const marks: CarryMark[] = [];
  const w1 = wellnessHeld(aligned, holdMs);
  const w2 = isSettled(director, "V1");
  const w3 = isSettled(director, "V2");
  const w4 = isSettled(director, "V3");

  if (w1) {
    marks.push({
      from: "W1",
      to: "W2",
      direction: "down",
      kind: "constraint",
      label: "Self beliefs constrain Tribe seats. Seats still unset.",
    });
  }
  if (w2) {
    marks.push({
      from: "W2",
      to: "W3",
      direction: "down",
      kind: "constraint",
      label: "Kept agreements thicken the cloud.",
    });
    marks.push({
      from: "W2",
      to: "W1",
      direction: "up",
      kind: "held",
      label: "Tribe writes back. Beliefs must re-hold.",
    });
  }
  if (w3) {
    marks.push({
      from: "W3",
      to: "W4",
      direction: "down",
      kind: "constraint",
      label: "Rain is evidence Earth can weather.",
    });
    marks.push({
      from: "W3",
      to: "W2",
      direction: "up",
      kind: "held",
      label: "Rain writes back into Tribe.",
    });
  }
  if (w4) {
    marks.push({
      from: "W4",
      to: "C9",
      direction: "up",
      kind: "held",
      label: "Earth weather re-phases the sky.",
    });
  }

  for (const id of ["V0", "V1", "V2", "V3"] as VertexId[]) {
    const ws = director.workshop(id);
    if (ws.agreement?.status === "paused") {
      marks.push({
        from: VERTEX_WORLD[id],
        to: "C9",
        direction: "up",
        kind: "challenged",
        label: "Withdrawal pauses carry. History remains. Consent is not restored.",
      });
    }
  }
  return marks;
}

export function pickEnding(
  director: WorkshopDirector,
  aligned: Record<WellnessId, boolean>,
  holdMs: number,
): EndingId {
  const scores: Record<Exclude<EndingId, "clusterfuck">, number> = {
    P0: 0,
    P1: wellnessHeld(aligned, holdMs) ? 3 : 0,
    P2: isSettled(director, "V1") ? 4 : 0,
    P3: isSettled(director, "V2") ? 5 : 0,
    P4: isSettled(director, "V3") ? 6 : 0,
  };
  const coherent =
    scores.P1 + scores.P2 + scores.P3 + scores.P4 > 0 ||
    director.at("V0").explored ||
    WELLNESS_IDS.some((id) => aligned[id]);
  if (coherent && scores.P1 + scores.P2 + scores.P3 + scores.P4 === 0) scores.P0 = 1;

  const entries = (Object.keys(PATHWAYS) as Array<keyof typeof scores>).map((k) => [k, scores[k]] as const);
  const max = Math.max(...entries.map(([, n]) => n));
  if (max <= 0) return "clusterfuck";
  const winners = entries.filter(([, n]) => n === max);
  if (winners.length !== 1) return "clusterfuck";
  return winners[0]![0];
}

export function rainEligible(director: WorkshopDirector) {
  return director.workshop("V2").history.some((e) => e.kind === "act") && isSettled(director, "V2");
}
