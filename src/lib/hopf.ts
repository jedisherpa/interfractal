export const PI = Math.PI;
export const INV_SQRT3 = 1 / Math.sqrt(3);
export const FIBER_SCALE = 0.92;
export const MAX_FIBER_RADIUS = 7.5;
export const SOLID_SCALE = 0.84;

export type Complex = { re: number; im: number };

export function c(re: number, im = 0): Complex {
  return { re, im };
}

export function cmul(a: Complex | number, b: Complex): Complex {
  if (typeof a === "number") return c(a * b.re, a * b.im);
  return c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
}

export function cexp(angle: number): Complex {
  return c(Math.cos(angle), Math.sin(angle));
}

export function abs2(z: Complex) {
  return z.re * z.re + z.im * z.im;
}

export function state(theta: number, phi: number, gamma = 0): [Complex, Complex] {
  return [
    cmul(Math.cos(theta / 2), cexp(gamma)),
    cmul(Math.sin(theta / 2), cexp(gamma - phi)),
  ];
}

export function stereographic(z: [Complex, Complex]): [number, number, number] | null {
  const d = 1 - z[1].im;
  if (Math.abs(d) < 1e-12) return null;
  return [z[0].re / d, z[0].im / d, z[1].re / d];
}

export function fibre(theta: number, phi: number, samples = 160): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < samples; i += 1) {
    const p = stereographic(state(theta, phi, (2 * PI * i) / samples));
    if (p) pts.push([p[0] * FIBER_SCALE, p[1] * FIBER_SCALE, p[2] * FIBER_SCALE]);
  }
  return pts;
}

export function fibreSafe(theta: number, phi: number, samples = 160) {
  const pts = fibre(theta, phi, samples);
  if (pts.length < 8) return null;
  if (pts.some((p) => Math.hypot(p[0], p[1], p[2]) > MAX_FIBER_RADIUS)) return null;
  return pts;
}

export function holonomy(theta: number) {
  return PI * (1 - Math.cos(theta));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpAngle(a: number, b: number, t: number) {
  let d = ((b - a + PI) % (2 * PI)) - PI;
  if (d < -PI) d += 2 * PI;
  return a + d * t;
}

export const TETRA: ReadonlyArray<readonly [number, number, number]> = [
  [INV_SQRT3, INV_SQRT3, INV_SQRT3],
  [INV_SQRT3, -INV_SQRT3, -INV_SQRT3],
  [-INV_SQRT3, INV_SQRT3, -INV_SQRT3],
  [-INV_SQRT3, -INV_SQRT3, INV_SQRT3],
];

export const FACES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2],
  [0, 2, 3],
  [0, 3, 1],
  [1, 3, 2],
];

export function sph(v: readonly number[]) {
  return {
    theta: Math.acos(Math.max(-1, Math.min(1, v[2] ?? 0))),
    phi: Math.atan2(v[1] ?? 0, v[0] ?? 0),
  };
}

export const HOME = TETRA.map(sph);

export function faceCentroid(faceIndex: number): [number, number, number] {
  const face = FACES[faceIndex] ?? FACES[1];
  const a = TETRA[face[0]];
  const b = TETRA[face[1]];
  const cpt = TETRA[face[2]];
  const x = a[0] + b[0] + cpt[0];
  const y = a[1] + b[1] + cpt[1];
  const z = a[2] + b[2] + cpt[2];
  const n = Math.hypot(x, y, z) || 1;
  return [x / n, y / n, z / n];
}

export function faceCentroidSphere(faceIndex: number) {
  return sph(faceCentroid(faceIndex));
}

export const GOAL0 = faceCentroidSphere(1);

export const FACE_META = [
  {
    title: "Generate · possibilities",
    short: "Generate",
    body: "A proposal may be born here. Exploring a route does not commit anyone.",
  },
  {
    title: "Maintain · versioned agreement",
    short: "Maintain",
    body: "The public goal for this version. Beads may gather. Only an explicit commit seals it.",
  },
  {
    title: "Release · withdrawal, repair, retire",
    short: "Release",
    body: "Act, withdraw, repair, retire. Repair does not restore consent. History is not erased.",
  },
  {
    title: "HITL · Art. VI interpretive boundary",
    short: "HITL",
    body: "A human keeps the decision. Topology does not authorize. Agents do not ratify.",
  },
] as const;

export const PEOPLE_SEED = [
  { id: "Maya", color: "#1AD4EA", seat: 0, rest: 0.35 },
  { id: "Finn", color: "#FF7A1A", seat: 1, rest: 1.2 },
  { id: "Bea", color: "#C49214", seat: 2, rest: 2.1 },
  { id: "Sam", color: "#3D7A4A", seat: 3, rest: 4.0 },
] as const;

export const FIELD_COLORS = ["#7EC8F8", "#FF7A1A", "#FFE14D"] as const;

export const SOLIDS = [
  "tetrahedron",
  "octahedron",
  "cube",
  "icosahedron",
  "dodecahedron",
] as const;

export type SolidKind = (typeof SOLIDS)[number];

export type ResponseKind = "unset" | "yes" | "no" | "withdrawn";

export type IntentionCoords = { theta: number; phi: number; gamma: number };

export function intentionTarget(
  person: { seat: number; rest: number; response: ResponseKind; responseVersion: number | null },
  version: number,
  goal: { theta: number; phi: number },
): IntentionCoords {
  const home = HOME[person.seat];
  if (person.response === "yes" && person.responseVersion === version) {
    return { theta: goal.theta, phi: goal.phi, gamma: person.seat * 0.42 };
  }
  if (person.response === "no" && person.responseVersion === version) {
    return { theta: home.theta, phi: home.phi, gamma: Math.PI / 2 };
  }
  if (person.response === "withdrawn") {
    return { theta: home.theta, phi: home.phi, gamma: Math.PI };
  }
  return { theta: home.theta, phi: home.phi, gamma: person.rest };
}

export function beadWorld(theta: number, phi: number, gamma: number): [number, number, number] | null {
  const p = stereographic(state(theta, phi, gamma));
  if (!p) return null;
  return [p[0] * 0.92, p[1] * 0.92, p[2] * 0.92];
}
