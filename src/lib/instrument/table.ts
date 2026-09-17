/** Table layer of the teaching instrument. Evidence, not a Yes.
 *  Field (Hopf, nested worlds) is a different picture.
 *  Four cubes, four eights. The 8 names are octants of 3 hinges. */

export const EVIDENCE_STAMP = "This picture is evidence. It is not a Yes.";

export const TABLE_LEVELS = ["self", "tribe", "world", "transcendent"] as const;
export type TableLevel = (typeof TABLE_LEVELS)[number];

export type Hinge = { plus: string; minus: string };

/** Three hinges per cube. Vertex i = sign-triple of AXIS_CORNERS[i]. */
export const CUBE_HINGES: Record<TableLevel, readonly [Hinge, Hinge, Hinge]> = {
  self: [
    { plus: "organism", minus: "situation" },
    { plus: "lived", minus: "system" },
    { plus: "solitary", minus: "relational" },
  ],
  tribe: [
    { plus: "porous", minus: "sealed" },
    { plus: "person", minus: "office" },
    { plus: "continue", minus: "rupture" },
  ],
  world: [
    { plus: "matter", minus: "promise" },
    { plus: "practice", minus: "plant" },
    { plus: "capacity", minus: "exhaust" },
  ],
  transcendent: [
    { plus: "end", minus: "means" },
    { plus: "opening", minus: "closing" },
    { plus: "tend", minus: "command" },
  ],
};

/**
 * Octants, same order as AXIS_CORNERS:
 * +++ ++- +-+ +-- -++ -+- --+ ---
 */
export const CUBE_CORNERS: Record<TableLevel, readonly string[]> = {
  self: [
    "physical",
    "emotional",
    "intellectual",
    "spiritual",
    "environmental",
    "social",
    "financial",
    "occupational",
  ],
  tribe: [
    "hospitality",
    "membership",
    "ritual",
    "succession",
    "secrecy",
    "conflict",
    "role",
    "repair",
  ],
  world: [
    "craft",
    "waste",
    "infrastructure",
    "surplus",
    "market",
    "reputation",
    "law",
    "ground-repair",
  ],
  transcendent: [
    "purpose",
    "scope",
    "timing",
    "completion",
    "care",
    "resources",
    "risk",
    "authority",
  ],
};

/** Vow names in the approved listing order. Octant order lives on CUBE_CORNERS.transcendent. */
export const TABLE_AXES = [
  "purpose",
  "scope",
  "timing",
  "resources",
  "risk",
  "care",
  "authority",
  "completion",
] as const;
export type TableAxis = (typeof TABLE_AXES)[number];

export function cornerName(level: TableLevel, i: number): string {
  return CUBE_CORNERS[level][i] ?? `octant-${i}`;
}

export const OCTANT_COUNT = 8;


/** Default four. Extras join; they do not pre-draw a lodge. */
export const SEAT_NAMES = ["Maya", "Finn", "Bea", "Sam", "Kai", "Noor", "Remy", "Ade"] as const;
export type SeatName = (typeof SEAT_NAMES)[number];

/** Identity on the plane. Not a grant. */
export const SEAT_COLORS = [0xc9d4c8, 0x8aa0ae, 0xe8d5a3, 0xb7c4b0, 0xd7ddd6, 0x9a8f7a, 0xa3b8c4, 0xc2b8a8] as const;

export const GOLD = 0xc4a35a;
export const ICE = 0xd7e4ea;

export const TRAIL_LEN = 40;
export const TRAIL_DECAY = 0.82;
export const RING_EPS = 0.06;
export const RING_WINDOW = 4;
export const FREEZE_MS = 800;

/** Cube corners for the eight named axes. Not the wellness cube. */
export const AXIS_CORNERS: readonly (readonly [number, number, number])[] = [
  [1, 1, 1],
  [1, 1, -1],
  [1, -1, 1],
  [1, -1, -1],
  [-1, 1, 1],
  [-1, 1, -1],
  [-1, -1, 1],
  [-1, -1, -1],
];

export const LEVEL_SCALE: Record<TableLevel, number> = {
  self: 1.15,
  tribe: 1.85,
  world: 2.55,
  transcendent: 3.35,
};

export type Corner = {
  lean: number;
  magnitude: number;
};

export type SeatLevel = {
  corners: Corner[];
  fiber: { hoop: number; bob: number; urgency: number };
  base: { heading: number; readiness: number; risk: number };
};

export type TableSeat = {
  name: SeatName;
  yesOnGoal: boolean;
  howConfirmed: boolean;
  records: number[];
  mood: number;
  strength: number;
  levels: Record<TableLevel, SeatLevel>;
};

export type Contradiction = {
  kind: "cross-level" | "vow-vs-vow";
  seatA: string;
  seatB: string;
  levelA: TableLevel;
  levelB: TableLevel;
  octant: number;
  caption: string;
};

export type ChamberKind = "none" | "tetra" | "octa" | "icosa";

function emptyCorners(): Corner[] {
  return Array.from({ length: OCTANT_COUNT }, () => ({ lean: 0, magnitude: 0.4 }));
}

function emptyLevel(): SeatLevel {
  return {
    corners: emptyCorners(),
    fiber: { hoop: 0, bob: 0, urgency: 0 },
    base: { heading: 0, readiness: 0.4, risk: 0 },
  };
}

function emptyLevels(): Record<TableLevel, SeatLevel> {
  return {
    self: emptyLevel(),
    tribe: emptyLevel(),
    world: emptyLevel(),
    transcendent: emptyLevel(),
  };
}

export function makeSeats(n: number, prev?: readonly TableSeat[]): TableSeat[] {
  const count = Math.max(1, Math.min(SEAT_NAMES.length, Math.round(n)));
  return Array.from({ length: count }, (_, i) => {
    const prior = prev?.[i];
    if (prior) {
      return {
        ...prior,
        name: SEAT_NAMES[i]!,
      };
    }
    const levels = emptyLevels();
    if (SEAT_NAMES[i] === "Maya") {
      levels.self.corners[5] = { lean: 0.85, magnitude: 1.25 };
      levels.tribe.corners[5] = { lean: -0.8, magnitude: 1.1 };
    }
    if (SEAT_NAMES[i] === "Finn") {
      levels.transcendent.corners[0] = { lean: 0.7, magnitude: 0.9 };
    }
    if (SEAT_NAMES[i] === "Bea") {
      levels.transcendent.corners[0] = { lean: -0.65, magnitude: 0.85 };
    }
    return {
      name: SEAT_NAMES[i]!,
      yesOnGoal: false,
      howConfirmed: false,
      records: [],
      mood: 0.12,
      strength: 0.55,
      levels,
    };
  });
}

export function yesCount(seats: readonly TableSeat[]): number {
  return seats.reduce((k, s) => k + (s.yesOnGoal ? 1 : 0), 0);
}

export function yesMask(seats: readonly TableSeat[]): boolean[] {
  return seats.map((s) => s.yesOnGoal);
}

/** Edge i→i+1 of the preferred lodge exists only when both seats Yes. Gap otherwise. */
export function lodgeEdge(yes: readonly boolean[], i: number): boolean {
  const n = yes.length;
  if (n < 2) return false;
  return Boolean(yes[i] && yes[(i + 1) % n]);
}

export function stamp(body: string): string {
  const t = body.trim();
  return t.includes(EVIDENCE_STAMP) ? t : `${t} ${EVIDENCE_STAMP}`;
}

export function preClipMagnitude(seat: TableSeat, level: TableLevel): number {
  const corners = seat.levels[level].corners;
  let sum = 0;
  for (const c of corners) sum += c.magnitude * c.magnitude;
  return Math.min(2.2, Math.sqrt(sum));
}

/** Heading after L2 clip — dominant lean on the level. Weather does not write this. */
export function clipHeading(seat: TableSeat, level: TableLevel): number {
  const corners = seat.levels[level].corners;
  let ax = 0;
  let az = 0;
  for (let i = 0; i < corners.length; i += 1) {
    const c = AXIS_CORNERS[i]!;
    const w = corners[i]!.lean;
    ax += c[0] * w;
    az += c[2] * w;
  }
  return Math.atan2(az, ax);
}

export function fiberOffset(mood: number, i: number, t: number): [number, number, number] {
  const a = t * 1.45 + i * 1.7;
  const r = 0.18 + Math.max(0, mood) * 0.62;
  return [r * Math.cos(a), Math.max(0, mood) * 0.48 * Math.sin(a * 1.35), r * Math.sin(a)];
}

export function recordForStage(stage: string): number | null {
  if (stage === "spokes") return 0;
  if (stage === "lenses") return 1;
  if (stage === "hold") return 2;
  return null;
}

export function withRecord(seats: readonly TableSeat[], axis: number): TableSeat[] {
  return seats.map((s) => {
    if (!s.yesOnGoal || s.records.includes(axis)) return s;
    return { ...s, howConfirmed: true, records: [...s.records, axis] };
  });
}

export function confirmedCount(seats: readonly TableSeat[]): number {
  return seats.reduce((n, s) => n + (s.yesOnGoal ? s.records.length : 0), 0);
}

export function findContradictions(seats: readonly TableSeat[]): Contradiction[] {
  const out: Contradiction[] = [];
  for (const s of seats) {
    if (!s.yesOnGoal) continue;
    for (let a = 0; a < OCTANT_COUNT; a += 1) {
      for (let i = 0; i < TABLE_LEVELS.length; i += 1) {
        for (let j = i + 1; j < TABLE_LEVELS.length; j += 1) {
          const li = TABLE_LEVELS[i]!;
          const lj = TABLE_LEVELS[j]!;
          const ca = s.levels[li].corners[a]!.lean;
          const cb = s.levels[lj].corners[a]!.lean;
          if (ca * cb < 0 && Math.abs(ca) > 0.25 && Math.abs(cb) > 0.25) {
            const pronoun = s.name === "Finn" || s.name === "Sam" ? "his" : "her";
            out.push({
              kind: "cross-level",
              seatA: s.name,
              seatB: s.name,
              levelA: li,
              levelB: lj,
              octant: a,
              caption: `${s.name}’s ${li} ${cornerName(li, a)} fights ${pronoun} ${lj} ${cornerName(lj, a)}.`,
            });
          }
        }
      }
    }
  }
  for (let a = 0; a < OCTANT_COUNT; a += 1) {
    const holders = seats.filter((s) => s.yesOnGoal && s.records.includes(a));
    for (let i = 0; i < holders.length; i += 1) {
      for (let j = i + 1; j < holders.length; j += 1) {
        const ca = holders[i]!.levels.transcendent.corners[a]!.lean;
        const cb = holders[j]!.levels.transcendent.corners[a]!.lean;
        if (ca * cb < 0 && Math.abs(ca) > 0.25 && Math.abs(cb) > 0.25) {
          out.push({
            kind: "vow-vs-vow",
            seatA: holders[i]!.name,
            seatB: holders[j]!.name,
            levelA: "transcendent",
            levelB: "transcendent",
            octant: a,
            caption: `${holders[i]!.name} and ${holders[j]!.name} contradict on ${cornerName("transcendent", a)}. Both pearls stay.`,
          });
        }
      }
    }
  }
  return out;
}

export function commuteClean(seats: readonly TableSeat[]): boolean {
  return findContradictions(seats).length === 0;
}

export function chamberKind(count: number): ChamberKind {
  if (count >= 12) return "icosa";
  if (count >= 8) return "octa";
  if (count >= 6) return "tetra";
  return "none";
}

export function starTetraEligible(seats: readonly TableSeat[]): boolean {
  return yesCount(seats) >= 4 && commuteClean(seats);
}

export function chamberFills(seats: readonly TableSeat[], kind: ChamberKind): boolean {
  return kind !== "none" && kind !== "icosa" && commuteClean(seats);
}

/** Gold is a third human act. It does not require commute and does not claim it. */
export function goldShown(goldAttested: boolean, notFit: boolean): boolean {
  return goldAttested && !notFit;
}

export function goldAllowed(seats: readonly TableSeat[], committed: boolean, goldAttested = false): boolean {
  void seats;
  void committed;
  return goldAttested;
}

export function poseOf(stage: string): "in" | "out" | "tube" | "none" {
  if (stage === "orbit") return "tube";
  if (stage === "roles" || stage === "spokes" || stage === "miss") return "in";
  if (stage === "lenses" || stage === "hold" || stage === "pattern") return "out";
  return "none";
}

export function shouldRing(prevPose: string, nextPose: string, trailMarks: number): boolean {
  if (prevPose === nextPose || prevPose === "none" || nextPose === "none") return false;
  return trailMarks <= RING_WINDOW;
}

export function crankedMood(seat: TableSeat, delta: number): TableSeat {
  const mood = Math.max(0, Math.min(1.4, seat.mood + delta));
  return {
    ...seat,
    mood,
    levels: {
      ...seat.levels,
      self: {
        ...seat.levels.self,
        fiber: { hoop: mood, bob: mood * 0.8, urgency: mood },
      },
    },
  };
}

export function revealCaption(opts: {
  ringing: boolean;
  weather: boolean;
  contradiction: Contradiction | null;
  confirmedCount: number;
  commute: boolean;
  committed: boolean;
  goldAttested?: boolean;
}): string | null {
  if (opts.ringing) return stamp("the pointer is ringing — ask, don’t act.");
  if (opts.weather) return stamp("weather is moving; the plan is not.");
  if (opts.contradiction) return stamp(opts.contradiction.caption);
  if (!opts.commute && opts.confirmedCount >= 6) {
    return stamp("the count rose; the vows do not commute.");
  }
  if (opts.committed && !opts.commute && !opts.goldAttested) {
    return stamp("Commit stands. Gold is a third act. It will not claim the vows commute.");
  }
  if (opts.goldAttested && !opts.commute) {
    return stamp("Gold is a human act. It does not claim the vows commute.");
  }
  if (opts.goldAttested) {
    return stamp("Gold attested. The picture is still not a Yes.");
  }
  return null;
}

export const FORBIDDEN_COPY = [
  "quantum coherence",
  "hilbert",
  "entanglement",
  "hopf proves",
  "the icosahedron means we agree",
  "twelve lenses fill",
  "cdiss approved",
  "aligned",
];

export function copyIsClean(text: string): boolean {
  const t = text.toLowerCase();
  return FORBIDDEN_COPY.every((w) => !t.includes(w));
}
