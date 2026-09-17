/** Group-formation visualizer. People are not fibers. Geometry is not permission.
 *  In the field, a person is a point — one self-lit sphere per agreed person. */

import { EVIDENCE_STAMP, stamp } from "./table.ts";

export type FormStage = "idle" | "goal" | "orbit" | "roles" | "spokes" | "lenses" | "hold" | "pattern" | "miss";

/** Walk only. pattern and miss are human terminals, not the next slide. */
export const FORM_WALK: FormStage[] = ["idle", "goal", "orbit", "roles", "spokes", "lenses", "hold"];
export const FORM_STAGES: FormStage[] = [...FORM_WALK, "pattern", "miss"];

export const FORM_N_MIN = 3;
export const FORM_N_MAX = 8;

export const TORUS_R = 8.5;
export const TORUS_r = 2.15;
/** Outer equatorial radius — on the torus surface, on the horizontal plane. */
export const OUTER_R = TORUS_R + TORUS_r;
export const INSIDE_R = 5.6;
export const OUTSIDE_R = 12.2;
/** Camera cap while forming so the equator reads against the 4× fibers. */
export const FORM_CAMERA_R = 14.5;
/** 0.32 rad/s ≈ 0.05 Hz. Lock: ≤ 0.75 Hz. */
export const ORBIT_OMEGA = 0.32;

export { SEAT_NAMES } from "./table.ts";

/** Seven rainbow hues for filled facets. A color is a view, not a Yes. */
export const RAINBOW = [0xe03c31, 0xf58220, 0xf7d117, 0x2fa84f, 0x1a75cf, 0x3f2c88, 0x8b2fc9] as const;
export const FACE_OPACITY = 0.25;

export function rainbowAt(i: number): number {
  const k = (((Math.imul(i | 0, 17) + 3) % 7) + 7) % 7;
  return RAINBOW[k]!;
}

export const SHAPES: Record<
  number,
  { n: number; polygon: string; polyhedron: string; hint: string }
> = {
  3: { n: 3, polygon: "Triangle", polyhedron: "Tetrahedron", hint: "simple" },
  4: { n: 4, polygon: "Square", polyhedron: "Square pyramid", hint: "focused" },
  5: { n: 5, polygon: "Pentagon", polyhedron: "Pentagonal pyramid", hint: "layered" },
  6: { n: 6, polygon: "Hexagon", polyhedron: "Hexagonal prism", hint: "layered" },
  7: { n: 7, polygon: "Heptagon", polyhedron: "Heptagonal pyramid", hint: "wide" },
  8: { n: 8, polygon: "Octagon", polyhedron: "Octagonal prism", hint: "wide" },
};

export function shapeOf(n: number) {
  return SHAPES[n] ?? SHAPES[3]!;
}

export function nextFormStage(stage: FormStage): FormStage {
  if (stage === "pattern" || stage === "miss" || stage === "hold") return stage;
  const i = FORM_WALK.indexOf(stage);
  if (i < 0) return stage;
  return FORM_WALK[Math.min(i + 1, FORM_WALK.length - 1)] ?? "hold";
}

export function formActionLabel(stage: FormStage): string {
  switch (stage) {
    case "idle":
      return "Set this goal";
    case "goal":
      return "People join";
    case "orbit":
      return "Agree roles";
    case "roles":
      return "Agree how";
    case "spokes":
      return "Step outside";
    case "lenses":
      return "Hold the outside";
    case "hold":
      return "Hold the outside";
    case "pattern":
      return "Reset formation";
    case "miss":
      return "Try again";
  }
}

export function formCaption(stage: FormStage, n: number, goal: string): string {
  const shape = shapeOf(n);
  const g = goal.trim() || "the goal";
  let body = "";
  switch (stage) {
    case "idle":
      body = "Agree on a goal. Anyone can do that as an individual. Ready is not Yes.";
      break;
    case "goal":
      body = `“${g}” prefers a ${shape.polygon.toLowerCase()}. Census does not draw the lodge. Geometry is not permission.`;
      break;
    case "orbit":
      body = `Points who Yes’d “${g}” orbit the torus while roles are discussed. People are not fibers.`;
      break;
    case "roles":
      body = `Preferred ${shape.polygon.toLowerCase()} on the horizontal plane. A gap is a missing Yes, not a dim bead. Ready is not Yes.`;
      break;
    case "spokes":
      body = "Dashed lines are proposed. Solid spokes wait on confirmation. Still not a Yes.";
      break;
    case "lenses":
      body = `Perspective lenses. Stepping outside the torus is a choice to leave shared reality. ${shape.polygon} becomes ${shape.polyhedron.toLowerCase()}. Geometry did not sign.`;
      break;
    case "hold":
      body = "Points orbit outside. Lenses spin. Commit is a human button. Conflict does not grey it.";
      break;
    case "pattern":
      body = "A living pattern on the outer equator after a human Commit. Gold is attestation, not a count. A pattern is not a Yes. Horizontal plane, outside surface.";
      break;
    case "miss":
      body = "The table named a miss, not a failure.";
      break;
  }
  return stamp(body);
}

export { EVIDENCE_STAMP };

/** Point on the torus tube. v = 0 is the outer equator (horizontal plane). */
export function torusPoint(u: number, v: number): [number, number, number] {
  const ring = TORUS_R + TORUS_r * Math.cos(v);
  return [ring * Math.cos(u), TORUS_r * Math.sin(v), ring * Math.sin(u)];
}

export function formPoint(stage: FormStage, i: number, n: number, t: number): [number, number, number] {
  const count = Math.max(1, Math.min(FORM_N_MAX, n));
  const base = (i * Math.PI * 2) / count;
  if (stage === "idle" || stage === "goal") {
    return [0, -8, 0];
  }
  if (stage === "orbit") {
    return torusPoint(t * ORBIT_OMEGA + base, 0.55);
  }
  if (stage === "roles" || stage === "spokes") {
    return [INSIDE_R * Math.cos(base), 0, INSIDE_R * Math.sin(base)];
  }
  if (stage === "miss") {
    const spread = 1 + Math.min(1.4, t * 0.22);
    return [INSIDE_R * spread * Math.cos(base), 0, INSIDE_R * spread * Math.sin(base)];
  }
  if (stage === "pattern") {
    return torusPoint(t * ORBIT_OMEGA + base, 0);
  }
  const u = (stage === "hold" ? t * ORBIT_OMEGA : 0) + base;
  const y = 1.2 * Math.sin(u * 2);
  return [OUTSIDE_R * Math.cos(u), y, OUTSIDE_R * Math.sin(u)];
}

export function lensCorners(i: number, n: number, t: number): [[number, number, number], [number, number, number], [number, number, number]] {
  const count = Math.max(FORM_N_MIN, Math.min(FORM_N_MAX, n));
  const yaw = t * ORBIT_OMEGA * (n > 0 ? 1 : 0) + (i * Math.PI * 2) / count;
  const cx = Math.cos(yaw) * 0.72;
  const cz = Math.sin(yaw) * 0.72;
  const sx = -Math.sin(yaw) * 0.38;
  const sz = Math.cos(yaw) * 0.38;
  return [
    [cx + sx, 0.22, cz + sz],
    [cx - sx, 0.22, cz - sz],
    [cx, -0.32, cz],
  ];
}

export function radiusXZ(p: readonly [number, number, number]) {
  return Math.hypot(p[0], p[2]);
}
