import { create } from "zustand";
import { WorkshopDirector } from "@/workshop/director.ts";
import type {
  DecisionFrame,
  InspectSelection,
  ScaleLayerId,
  TetraOverlay,
  VertexId,
} from "@/workshop/types.ts";
import { LAYER_VERTEX } from "@/workshop/types.ts";
import { flight } from "@/lib/game/runtime.ts";

export const director = new WorkshopDirector();

export type GamePhase = "title" | "playing";

type GameState = {
  phase: GamePhase;
  wellOpen: boolean;
  mathLens: boolean;
  reducedMotion: boolean;
  webglFailed: boolean;
  layer: ScaleLayerId;
  unlocked: ScaleLayerId[];
  selection: InspectSelection;
  tick: number;
  log: string[];
};

type GameActions = {
  start: () => void;
  openWell: () => void;
  closeWell: () => void;
  interact: () => void;
  travel: (to: ScaleLayerId, dir: "shrink" | "grow") => boolean;
  bump: () => void;
  setReducedMotion: (v: boolean) => void;
  setMathLens: (v: boolean) => void;
  setWebglFailed: (v: boolean) => void;
  setSelection: (s: InspectSelection) => void;
  command: (fn: () => void | boolean, note?: string) => void;
};

const initial: GameState = {
  phase: "title",
  wellOpen: false,
  mathLens: false,
  reducedMotion:
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  webglFailed: false,
  layer: 0,
  unlocked: [0],
  selection: { type: "overview", id: "overview" },
  tick: 0,
  log: ["[SYSTEM] Hopf Decision Wells · teaching model v0.2"],
};

function pushLog(log: string[], line: string) {
  return [...log.slice(-24), line];
}

export const useGame = create<GameState & GameActions>((set, get) => ({
  ...initial,
  start: () => {
    director.reset();
    flight.spawn(0);
    flight.unlocked = [0];
    flight.damped = false;
    installQaHooks();
    set({
      ...initial,
      phase: "playing",
      reducedMotion: get().reducedMotion,
      log: ["[SYSTEM] Observatory Garden. Gold ring is the cube gate. Cyan plinth is the well."],
    });
  },
  openWell: () => {
    flight.damped = true;
    set((s) => ({
      wellOpen: true,
      selection: { type: "overview", id: "overview" },
      log: pushLog(s.log, `[WELL] Opened ${LAYER_VERTEX[s.layer]}. Ready is not Yes.`),
    }));
  },
  closeWell: () => {
    flight.damped = false;
    set((s) => ({ wellOpen: false, log: pushLog(s.log, "[WELL] Closed. Geometry did not sign.") }));
  },
  interact: () => {
    const s = get();
    const near = flight.nearby;
    if (s.wellOpen) {
      get().closeWell();
      return;
    }
    if (!near) return;
    if (near.kind === "decision_well") {
      get().openWell();
      return;
    }
    get().travel(near.to, near.dir);
  },
  travel: (to, dir) => {
    const s = get();
    if (s.wellOpen) return false;
    if (dir === "grow" && !s.unlocked.includes(to)) return false;
    const unlocked = s.unlocked.includes(to) ? s.unlocked : [...s.unlocked, to];
    flight.spawn(to);
    flight.unlocked = unlocked;
    set({
      layer: to,
      unlocked,
      wellOpen: false,
      log: pushLog(s.log, `[SCALE] ${dir} → layer ${to}. ScaleSystem moved. Workshop did not.`),
    });
    return true;
  },
  bump: () => set((s) => ({ tick: s.tick + 1 })),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  setMathLens: (v) => set({ mathLens: v }),
  setWebglFailed: (v) => set({ webglFailed: v }),
  setSelection: (selection) => set({ selection }),
  command: (fn, note) => {
    fn();
    set((s) => ({
      tick: s.tick + 1,
      log: note ? pushLog(s.log, note) : s.log,
    }));
  },
}));

export function currentVertex(): VertexId {
  return LAYER_VERTEX[useGame.getState().layer];
}

export function currentFrame(): DecisionFrame {
  return director.frame(LAYER_VERTEX[useGame.getState().layer]);
}

export function currentOverlay(): TetraOverlay {
  const s = useGame.getState();
  return director.overlay(LAYER_VERTEX[s.layer], s.unlocked.includes(3), s.wellOpen);
}

export function installQaHooks() {
  if (typeof window === "undefined") return;
  window.__controlsTest = {
    getYaw: () => flight.yaw,
    getSpeed: () => flight.speed(),
    setKeys: (codes: string[]) => flight.setKeys(codes),
    tick: (ms: number) => {
      const steps = Math.max(1, Math.ceil(ms / 16));
      for (let i = 0; i < steps; i += 1) flight.step(1 / 60);
    },
  };
  window.__hopfWells = {
    wellCount: 4,
    director,
    flight,
    getFrame: () => currentFrame(),
    getOverlay: () => currentOverlay(),
    openWell: () => useGame.getState().openWell(),
    closeWell: () => useGame.getState().closeWell(),
    teleportToWell: () => {
      flight.teleportToWell();
      useGame.getState().bump();
    },
    teleportToGate: () => {
      flight.teleportToGate();
      useGame.getState().bump();
    },
    start: () => useGame.getState().start(),
    travel: (to: 0 | 1 | 2 | 3, dir: "shrink" | "grow" = "shrink") => {
      useGame.getState().travel(to, dir);
    },
  };
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys: (codes: string[]) => void;
      tick?: (ms: number) => void;
    };
    __hopfWells?: {
      wellCount: number;
      director: WorkshopDirector;
      flight: typeof flight;
      getFrame: () => DecisionFrame;
      getOverlay: () => TetraOverlay;
      openWell: () => void;
      closeWell: () => void;
      teleportToWell: () => void;
      teleportToGate: () => void;
      start: () => void;
      travel: (to: 0 | 1 | 2 | 3, dir?: "shrink" | "grow") => void;
    };
  }
}
