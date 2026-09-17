/** Cycle lock. Worlds are W1–W4. Eight wellness are W1 entrances, not worlds. */

export type WorldId = "C9" | "W1" | "W2" | "W3" | "W4";
export type PathwayId = "P0" | "P1" | "P2" | "P3" | "P4";
export type EndingId = PathwayId | "clusterfuck";
export type WellnessId = "E0" | "E1" | "E2" | "E3" | "E4" | "E5" | "E6" | "E7";
export type IntroBeat =
  | "pulse"
  | "fibers"
  | "cube"
  | "L4"
  | "L3"
  | "L2"
  | "L1"
  | "C9";

export const WORLDS: Record<
  WorldId,
  { id: WorldId; label: string; altitude: string; caption: string; vertex: "V0" | "V1" | "V2" | "V3" | null }
> = {
  C9: {
    id: "C9",
    label: "Cloud Nine",
    altitude: "origin",
    caption: "The sky you fall from. Unearned at the start. Earned only on a return fiber.",
    vertex: null,
  },
  W1: {
    id: "W1",
    label: "Self",
    altitude: "garden observatory",
    caption: "Still in the clouds. Reveal beliefs around the eight dimensions. Then keep playing.",
    vertex: "V0",
  },
  W2: {
    id: "W2",
    label: "Tribe",
    altitude: "Cloud Six",
    caption: "Ideas hold shape. You arrive as a Self, among others.",
    vertex: "V1",
  },
  W3: {
    id: "W3",
    label: "World",
    altitude: "Cloud Three",
    caption: "Kept agreements thicken the cloud. Rain hits the ground.",
    vertex: "V2",
  },
  W4: {
    id: "W4",
    label: "Earth",
    altitude: "Transcendent",
    caption: "Love, nature, family, vision, belief, and weather.",
    vertex: "V3",
  },
};

export const WORLD_ORDER: WorldId[] = ["C9", "W1", "W2", "W3", "W4"];

export const WELLNESS: Record<WellnessId, { id: WellnessId; name: string; not: string }> = {
  E0: { id: "E0", name: "Physical", not: "" },
  E1: { id: "E1", name: "Emotional", not: "" },
  E2: { id: "E2", name: "Intellectual", not: "" },
  E3: { id: "E3", name: "Social", not: "not Tribe" },
  E4: { id: "E4", name: "Spiritual", not: "not Earth" },
  E5: { id: "E5", name: "Environmental", not: "not Earth" },
  E6: { id: "E6", name: "Occupational", not: "not World-as-rain" },
  E7: { id: "E7", name: "Financial", not: "not World-as-rain" },
};

export const WELLNESS_IDS: WellnessId[] = ["E0", "E1", "E2", "E3", "E4", "E5", "E6", "E7"];

/** Cube vertices of the Impossible Cube = eight entrances. Not a well. */
export const CUBE_ENTRANCES: Record<WellnessId, readonly [number, number, number]> = {
  E0: [1, 1, 1],
  E1: [1, 1, -1],
  E2: [1, -1, 1],
  E3: [1, -1, -1],
  E4: [-1, 1, 1],
  E5: [-1, 1, -1],
  E6: [-1, -1, 1],
  E7: [-1, -1, -1],
};

export const PATHWAYS: Record<PathwayId, { id: PathwayId; name: string; fiber: string }> = {
  P0: { id: "P0", name: "Vapor", fiber: "thin but coherent return" },
  P1: { id: "P1", name: "Self", fiber: "eight dimensions held as beliefs" },
  P2: { id: "P2", name: "Tribe", fiber: "agreements with others held" },
  P3: { id: "P3", name: "World", fiber: "rain held" },
  P4: { id: "P4", name: "Earth", fiber: "weather, love, nature, family, vision held" },
};

export const OWNER_LINE =
  "This is a place where clarity keeps everything from being black and white.";

/** Four-point Whole gate. Press a point to enter that world; Whole runs the intro cycle. */
export const GATE_STAGES: {
  world: WorldId;
  label: string;
  /** Degrees from east, clockwise. South sits at the bottom. */
  angle: number;
}[] = [
  { world: "W4", label: "Transcendent", angle: -90 },
  { world: "W3", label: "World", angle: 0 },
  { world: "W1", label: "South", angle: 90 },
  { world: "W2", label: "Tribe", angle: 180 },
];

export const ROOM_CAPTION: Record<IntroBeat, string> = {
  pulse: "WHOLE / LIGHT",
  fibers: "Loops filling the field",
  cube: "Two readings",
  L4: "Level 4 — Earth",
  L3: "Level 3 — World",
  L2: "Level 2 — Tribe",
  L1: "Level 1 — Self",
  C9: OWNER_LINE,
};

/** Hole/light field swap. 1400ms ≈ 0.71 Hz. Lock: ≤0.75 Hz, never >3 Hz. */
export const PULSE_MS = 1400;

export const INTRO_MS: Record<Exclude<IntroBeat, "pulse">, number> = {
  fibers: 4000,
  cube: 1600,
  L4: 1800,
  L3: 1800,
  L2: 1800,
  L1: 1800,
  C9: 2400,
};

export const INTRO_ORDER: Exclude<IntroBeat, "pulse">[] = [
  "fibers",
  "cube",
  "L4",
  "L3",
  "L2",
  "L1",
  "C9",
];

export const SHELL_RADIUS: Record<WorldId, number> = {
  W1: 4.2,
  W2: 7.4,
  W3: 10.6,
  W4: 13.8,
  C9: 17.2,
};

export function endingCaption(ending: EndingId, world: WorldId): string {
  if (ending === "clusterfuck" && world === "C9") return "Unearned sky · no fiber yet";
  if (ending === "clusterfuck") return "Ending · Clusterfuck";
  return `Fiber · ${PATHWAYS[ending].name}`;
}
