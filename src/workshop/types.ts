export type VertexId = "V0" | "V1" | "V2" | "V3";
export type ScaleLayerId = 0 | 1 | 2 | 3;
export type Response = "unset" | "yes" | "no" | "withdrawn";
export type WellPose = "disc" | "torus" | "hourglass" | "lattice" | "cloud-nine";
export type EdgeKind = "empty" | "preview" | "locked" | "dashed-withdrawn";

export const VERTEX_IDS: VertexId[] = ["V0", "V1", "V2", "V3"];

export const VERTEX_META: Record<
  VertexId,
  {
    layer: ScaleLayerId;
    prism: string;
    world: string;
    mode: string;
    mark: string;
  }
> = {
  V0: {
    layer: 0,
    prism: "Self",
    world: "Garden observatory",
    mode: "GENERATE",
    mark: "well_self",
  },
  V1: {
    layer: 1,
    prism: "Tribe",
    world: "Cloud Six",
    mode: "KEEP PROMISE",
    mark: "well_tribe",
  },
  V2: {
    layer: 2,
    prism: "World",
    world: "Cloud Three",
    mode: "ACT / RAIN",
    mark: "well_world",
  },
  V3: {
    layer: 3,
    prism: "Earth",
    world: "Transcendent",
    mode: "WEATHER",
    mark: "well_earth",
  },
};

export const LAYER_VERTEX: Record<ScaleLayerId, VertexId> = {
  0: "V0",
  1: "V1",
  2: "V2",
  3: "V3",
};

export type ParticipantView = {
  id: string;
  name: string;
  response: Response;
  responseVersion: number | null;
  earlier: { version: number; answer: Response }[];
  ready: boolean | null;
};

export type ReviewView = {
  id: string;
  kind: string;
  label: string;
  recorded: boolean;
  version: number | null;
};

export type ActionView = {
  id: string;
  label: string;
  available: boolean;
  reasons: string[];
  agreementVersion?: number | null;
  wording?: string | null;
};

export type EventView = {
  id: string;
  index: number;
  kind: string;
  proposalVersion: number;
  agreementVersion: number | null;
  detail: string;
};

export type ConsequenceView = {
  id: string;
  state: "needed" | "recorded";
  label: string;
  sourceAction: string | null;
};

export type DecisionFrame = {
  vertex: VertexId;
  layer: ScaleLayerId;
  scopeId: "parade" | "rehearsal";
  sourceRevision: number;
  snapshotId: string;
  timeContext: { kind: "current" } | { kind: "history"; index: number };
  proposal: { id: string; version: number; description: string } | null;
  agreement: {
    id: string;
    status: "active" | "paused" | "retired";
    version: number;
    description: string;
  } | null;
  participants: ParticipantView[];
  recordedReviews: ReviewView[];
  actionAvailability: ActionView[];
  needed: string[];
  nextStep: string;
  events: EventView[];
  consequences: ConsequenceView[];
  exploration: { id: string; description: string } | null;
  round: { phase: string; round: number; lastReturn?: { round: number; applied: boolean } } | null;
  dataHealth: "ok" | "stale" | "unknown";
};

export type TetraEdge = {
  from: VertexId;
  to: VertexId;
  kind: EdgeKind;
  previewVersion: number | null;
};

export type TetraOverlay = {
  localAlignment: boolean;
  cloudNine: boolean;
  edges: TetraEdge[];
  wellPose: WellPose;
};

export type DisplayZ = { theta: number; phi: number; gamma: number };

export type InspectSelection = {
  type:
    | "overview"
    | "exploration"
    | "proposal"
    | "agreement"
    | "person"
    | "review"
    | "consequence"
    | "event";
  id: string;
  name?: string;
};
