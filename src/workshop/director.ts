/**
 * Host-owned director. Four Workshop instances, one per Values Prism vertex.
 * The renderer consumes DecisionFrame + TetraOverlay. It does not mutate Workshop.
 */

import { hopf, PI, state, Workshop, type HopfZ } from "./hopf.ts";
import { TETRA_EDGES } from "./geometry.ts";
import { projectParade } from "./view.ts";
import type {
  DecisionFrame,
  DisplayZ,
  ScaleLayerId,
  TetraOverlay,
  VertexId,
  WellPose,
} from "./types.ts";
import { LAYER_VERTEX, VERTEX_IDS, VERTEX_META } from "./types.ts";

export type VertexState = {
  workshop: Workshop;
  display: DisplayZ;
  explored: boolean;
  readyIds: string[];
  previewFrom: { vertex: VertexId; version: number } | null;
};

function initialDisplay(): DisplayZ {
  return { theta: 1.05, phi: 0.4, gamma: 0 };
}

export class WorkshopDirector {
  readonly vertices: Record<VertexId, VertexState>;
  revision = 0;

  constructor() {
    this.vertices = {
      V0: {
        workshop: new Workshop(),
        display: initialDisplay(),
        explored: false,
        readyIds: [],
        previewFrom: null,
      },
      V1: {
        workshop: new Workshop(),
        display: initialDisplay(),
        explored: false,
        readyIds: [],
        previewFrom: null,
      },
      V2: {
        workshop: new Workshop(),
        display: initialDisplay(),
        explored: false,
        readyIds: [],
        previewFrom: null,
      },
      V3: {
        workshop: new Workshop(),
        display: initialDisplay(),
        explored: false,
        readyIds: [],
        previewFrom: null,
      },
    };
  }

  reset() {
    for (const id of VERTEX_IDS) {
      this.vertices[id] = {
        workshop: new Workshop(),
        display: initialDisplay(),
        explored: false,
        readyIds: [],
        previewFrom: null,
      };
    }
    this.revision += 1;
  }

  at(vertex: VertexId) {
    return this.vertices[vertex];
  }

  workshop(vertex: VertexId) {
    return this.vertices[vertex].workshop;
  }

  setDisplay(vertex: VertexId, display: Partial<DisplayZ>) {
    const slot = this.vertices[vertex];
    slot.display = { ...slot.display, ...display };
    this.revision += 1;
  }

  explore(vertex: VertexId) {
    const slot = this.vertices[vertex];
    slot.workshop.explore(slot.display.theta, slot.display.phi, slot.display.gamma);
    slot.explored = true;
    this.revision += 1;
  }

  reframe(vertex: VertexId, angle: number) {
    this.vertices[vertex].workshop.reframe(angle);
    this.revision += 1;
  }

  propose(vertex: VertexId, description: string) {
    this.vertices[vertex].workshop.propose(description);
    this.vertices[vertex].readyIds = [];
    this.revision += 1;
  }

  proposeSuggestion(vertex: VertexId) {
    const slot = this.vertices[vertex];
    if (!slot.explored) return false;
    slot.workshop.proposeSuggestion();
    slot.readyIds = [];
    this.revision += 1;
    return true;
  }

  setReady(vertex: VertexId, name: string, ready: boolean) {
    const slot = this.vertices[vertex];
    if (!slot.workshop.proposal.participants.includes(name)) return;
    const set = new Set(slot.readyIds);
    if (ready) set.add(name);
    else set.delete(name);
    slot.readyIds = [...set];
    this.revision += 1;
  }

  consent(vertex: VertexId, name: string, answer: boolean) {
    this.vertices[vertex].workshop.consent(name, answer);
    this.revision += 1;
  }

  withdraw(vertex: VertexId, name: string) {
    this.vertices[vertex].workshop.withdraw(name);
    this.revision += 1;
  }

  review(vertex: VertexId) {
    this.vertices[vertex].workshop.review({ evidence: true, authorized: true, safe: true });
    this.revision += 1;
  }

  commit(vertex: VertexId) {
    const ok = this.vertices[vertex].workshop.commit();
    this.revision += 1;
    return ok;
  }

  act(vertex: VertexId) {
    const ok = this.vertices[vertex].workshop.act();
    this.revision += 1;
    return ok;
  }

  repair(vertex: VertexId, response: string) {
    this.vertices[vertex].workshop.resolveRepair(response);
    this.revision += 1;
  }

  release(vertex: VertexId, reason: string) {
    const ok = this.vertices[vertex].workshop.release(reason);
    this.revision += 1;
    return ok;
  }

  holonomy(vertex: VertexId) {
    const slot = this.vertices[vertex];
    const { theta } = this.protocolSpherical(vertex);
    slot.workshop.holonomy(theta);
    this.revision += 1;
  }

  /**
   * Copy-preview across a tetra edge: propose at destination.
   * Destination consents stay unset. Yes is not inherited.
   */
  copyPreview(from: VertexId, to: VertexId) {
    const src = this.vertices[from].workshop;
    const dest = this.vertices[to];
    const description = `${src.proposal.description} [copy-preview from ${from} v${src.proposal.version}]`;
    dest.workshop.propose(description);
    dest.readyIds = [];
    dest.previewFrom = { vertex: from, version: src.proposal.version };
    this.revision += 1;
  }

  protocolSpherical(vertex: VertexId) {
    const n = hopf(this.vertices[vertex].workshop.z);
    return {
      theta: Math.acos(Math.max(-1, Math.min(1, n[2]))),
      phi: Math.atan2(n[1], n[0]),
      n,
    };
  }

  displayMatchesProtocol(vertex: VertexId) {
    const slot = this.vertices[vertex];
    if (!slot.explored) return false;
    const proto = hopf(slot.workshop.z);
    const disp = hopf(state(slot.display.theta, slot.display.phi, slot.display.gamma));
    return Math.hypot(proto[0] - disp[0], proto[1] - disp[1], proto[2] - disp[2]) < 1e-6;
  }

  localAlignment(vertex: VertexId) {
    const a = this.vertices[vertex].workshop.agreement;
    return Boolean(a && a.status === "active");
  }

  tetraAlignment() {
    return VERTEX_IDS.every((id) => this.localAlignment(id));
  }

  cloudNine(coreUnlocked: boolean) {
    return coreUnlocked && this.tetraAlignment();
  }

  frame(vertex: VertexId): DecisionFrame {
    const slot = this.vertices[vertex];
    const proto = this.protocolSpherical(vertex);
    const exploration = slot.explored
      ? {
          id: "exploration",
          description: `protocol z at θ=${proto.theta.toFixed(3)}, φ=${proto.phi.toFixed(3)}`,
        }
      : {
          id: "exploration",
          description: "Display z is display-only until Explore copies it into protocol z",
        };
    return projectParade(slot.workshop, {
      vertex,
      scopeId: "rehearsal",
      readyIds: slot.readyIds,
      exploration,
      snapshotId: `${vertex}:${slot.workshop.history.length}:${slot.readyIds.join(",")}`,
    });
  }

  overlay(vertex: VertexId, coreUnlocked: boolean, wellOpen: boolean): TetraOverlay {
    const local = this.localAlignment(vertex);
    const cloud = this.cloudNine(coreUnlocked);
    const edges = TETRA_EDGES.map(([from, to]) => {
      const fromA = this.vertices[from].workshop.agreement;
      const toA = this.vertices[to].workshop.agreement;
      const fromPaused = fromA?.status === "paused";
      const toPaused = toA?.status === "paused";
      const fromLocked = fromA?.status === "active";
      const toLocked = toA?.status === "active";
      let kind: TetraOverlay["edges"][number]["kind"] = "empty";
      let previewVersion: number | null = null;
      if (fromPaused || toPaused) kind = "dashed-withdrawn";
      else if (fromLocked && toLocked) kind = "locked";
      else if (this.vertices[to].previewFrom?.vertex === from || this.vertices[from].previewFrom?.vertex === to) {
        kind = "preview";
        previewVersion =
          this.vertices[to].previewFrom?.version ?? this.vertices[from].previewFrom?.version ?? null;
      }
      return { from, to, kind, previewVersion };
    });
    return {
      localAlignment: local,
      cloudNine: cloud,
      edges,
      wellPose: this.wellPose(vertex, wellOpen, local, cloud),
    };
  }

  wellPose(vertex: VertexId, wellOpen: boolean, local: boolean, cloud: boolean): WellPose {
    if (cloud) return "cloud-nine";
    if (local) return "lattice";
    const slot = this.vertices[vertex];
    const reviews = slot.workshop.evidenceVersion === slot.workshop.proposal.version;
    if (wellOpen && reviews) return "hourglass";
    if (wellOpen && slot.explored) return "torus";
    return "disc";
  }

  displayZ(vertex: VertexId): HopfZ {
    const d = this.vertices[vertex].display;
    return state(d.theta, d.phi, d.gamma);
  }
}

export function layerOf(layer: ScaleLayerId): VertexId {
  return LAYER_VERTEX[layer];
}

export { PI };
