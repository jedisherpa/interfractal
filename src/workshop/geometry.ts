/**
 * Layer A Hopf helpers + Layer B Fuller tetra / VE + well offsets.
 * DEC-VP-01 locked. Dual-use cube is forbidden.
 */

import { hopf, PI, type HopfZ } from "./hopf.ts";
import type { ScaleLayerId, VertexId } from "./types.ts";

export const INV_SQRT3 = 1 / Math.sqrt(3);
export const PHI = (1 + Math.sqrt(5)) / 2;
export const CHILD_SCALE = 1 / PHI;
export const FIELD_K = "K = Q(√2, √3, √5)";
export const DELTA_K = 3_317_760_000;
export const COVOLUME = 57_600;

/** Regular tetrahedron on the unit circumsphere. DEC-VP-01. */
export const TETRA: Record<VertexId, readonly [number, number, number]> = {
  V0: [INV_SQRT3, INV_SQRT3, INV_SQRT3],
  V1: [INV_SQRT3, -INV_SQRT3, -INV_SQRT3],
  V2: [-INV_SQRT3, INV_SQRT3, -INV_SQRT3],
  V3: [-INV_SQRT3, -INV_SQRT3, INV_SQRT3],
};

export const TETRA_EDGES: [VertexId, VertexId][] = [
  ["V0", "V1"],
  ["V0", "V2"],
  ["V0", "V3"],
  ["V1", "V2"],
  ["V1", "V3"],
  ["V2", "V3"],
];

export function childTetra(vertex: VertexId, scale = CHILD_SCALE) {
  const c = TETRA[vertex];
  return (["V0", "V1", "V2", "V3"] as VertexId[]).map((id) => {
    const v = TETRA[id];
    return [c[0] + v[0] * scale, c[1] + v[1] * scale, c[2] + v[2] * scale] as const;
  });
}

/** Vector Equilibrium / cuboctahedron: 12-around-1. Honest Fuller name. */
export const CUBOCTA: readonly (readonly [number, number, number])[] = [
  [1, 1, 0],
  [1, -1, 0],
  [-1, 1, 0],
  [-1, -1, 0],
  [1, 0, 1],
  [1, 0, -1],
  [-1, 0, 1],
  [-1, 0, -1],
  [0, 1, 1],
  [0, 1, -1],
  [0, -1, 1],
  [0, -1, -1],
];

export type GateDef = {
  id: string;
  dir: "shrink" | "grow";
  from: ScaleLayerId;
  to: ScaleLayerId;
  position: { x: number; y: number; z: number };
  radius: number;
  label: string;
};

export const GATES: GateDef[] = [
  {
    id: "garden_to_forest",
    dir: "shrink",
    from: 0,
    to: 1,
    position: { x: 0, y: 6, z: 0 },
    radius: 5,
    label: "Enter the Impossible Cube",
  },
  {
    id: "forest_to_garden",
    dir: "grow",
    from: 1,
    to: 0,
    position: { x: 0, y: 14, z: 58 },
    radius: 4,
    label: "Grow to Observatory Garden",
  },
  {
    id: "forest_to_desert",
    dir: "shrink",
    from: 1,
    to: 2,
    position: { x: 0, y: 6, z: -20 },
    radius: 4.5,
    label: "Enter the Seed Core",
  },
  {
    id: "desert_to_forest",
    dir: "grow",
    from: 2,
    to: 1,
    position: { x: 0, y: 12, z: 72 },
    radius: 4,
    label: "Grow to Circuit Forest",
  },
  {
    id: "desert_to_core",
    dir: "shrink",
    from: 2,
    to: 3,
    position: { x: 0, y: 18, z: 0 },
    radius: 4,
    label: "Enter the Aperture",
  },
  {
    id: "core_to_desert",
    dir: "grow",
    from: 3,
    to: 2,
    position: { x: 0, y: 10, z: 42 },
    radius: 4,
    label: "Grow to Monument Desert",
  },
];

export type WellDef = {
  id: string;
  vertex: VertexId;
  layer: ScaleLayerId;
  mark: string;
  position: { x: number; y: number; z: number };
  radius: number;
};

export const WELLS: WellDef[] = [
  {
    id: "decision_well_V0",
    vertex: "V0",
    layer: 0,
    mark: "well_garden",
    position: { x: 16, y: 3.2, z: 8 },
    radius: 3.5,
  },
  {
    id: "decision_well_V1",
    vertex: "V1",
    layer: 1,
    mark: "well_forest",
    position: { x: 16, y: 4, z: 8 },
    radius: 3.5,
  },
  {
    id: "decision_well_V2",
    vertex: "V2",
    layer: 2,
    mark: "well_desert",
    position: { x: 18, y: 6, z: 16 },
    radius: 3.5,
  },
  {
    id: "decision_well_V3",
    vertex: "V3",
    layer: 3,
    mark: "well_core",
    position: { x: 14, y: 6, z: 16 },
    radius: 3.5,
  },
];

export function dist(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** ||W - G|| >= rW + rG + 2 */
export function wellClearsGates(well: WellDef) {
  return GATES.filter((g) => g.from === well.layer).every(
    (g) => dist(well.position, g.position) >= well.radius + g.radius + 2,
  );
}

export function wellForLayer(layer: ScaleLayerId) {
  return WELLS.find((w) => w.layer === layer)!;
}

export function gatesForLayer(layer: ScaleLayerId) {
  return GATES.filter((g) => g.from === layer);
}

export function sphericalFromVec(v: readonly number[]) {
  return {
    theta: Math.acos(Math.max(-1, Math.min(1, v[2] ?? 0))),
    phi: Math.atan2(v[1] ?? 0, v[0] ?? 0),
  };
}

export function protocolBase(z: HopfZ) {
  const n = hopf(z);
  const theta = Math.acos(Math.max(-1, Math.min(1, n[2])));
  const phi = Math.atan2(n[1], n[0]);
  return { theta, phi, n };
}

export function integerIdentity() {
  return `${DELTA_K.toLocaleString("en-US")} = 2^16 · 3^4 · 5^4; √ = ${COVOLUME.toLocaleString("en-US")}`;
}

export const SPAWNS: Record<ScaleLayerId, { x: number; y: number; z: number; yaw: number }> = {
  0: { x: 0, y: 8, z: 28, yaw: 0 },
  1: { x: 0, y: 10, z: 36, yaw: 0 },
  2: { x: 0, y: 12, z: 40, yaw: 0 },
  3: { x: 0, y: 10, z: 32, yaw: 0 },
};

export const LAYER_PALETTES = {
  0: {
    sky: "#c9dceb",
    fog: "#d7e6f2",
    ground: "#cfc6b0",
    emissive: "#2ee6d6",
    accent: "#c8b48a",
    name: "Observatory Garden",
  },
  1: {
    sky: "#1a1024",
    fog: "#2a1638",
    ground: "#14101c",
    emissive: "#2ee6d6",
    accent: "#c45aa0",
    name: "Circuit Forest",
  },
  2: {
    sky: "#e4c89a",
    fog: "#d9b27a",
    ground: "#c4a06a",
    emissive: "#f5c542",
    accent: "#b45a28",
    name: "Monument Desert",
  },
  3: {
    sky: "#07060c",
    fog: "#120814",
    ground: "#0c0a12",
    emissive: "#3c9cff",
    accent: "#e11d48",
    name: "Inner Core",
  },
} as const;

export const CHEEGER_CAPTION = "Cheeger's inequality (spectral geometry check): λ₁ ≥ h²/4";

export { PI };
