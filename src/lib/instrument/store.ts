import { create } from "zustand";
import { WorkshopDirector } from "@/workshop/director.ts";
import type { DecisionFrame, InspectSelection, TetraOverlay, VertexId } from "@/workshop/types.ts";
import { LAYER_VERTEX } from "@/workshop/types.ts";
import { carryMarks, pickEnding, rainEligible, wellnessHeld } from "./carry.ts";
import {
  INTRO_MS,
  INTRO_ORDER,
  WELLNESS_IDS,
  WORLD_ORDER,
  WORLDS,
  type IntroBeat,
  type WellnessId,
  type WorldId,
} from "./cosmology.ts";
import {
  FORM_N_MAX,
  FORM_N_MIN,
  formActionLabel,
  formCaption,
  nextFormStage,
  type FormStage,
} from "./formation.ts";
import {
  confirmedCount,
  findContradictions,
  commuteClean,
  goldAllowed,
  makeSeats,
  recordForStage,
  withRecord,
  yesCount,
  type TableLevel,
  type TableSeat,
} from "./table.ts";
import { orbit, resetOrbit } from "./orbit.ts";

export const director = new WorkshopDirector();

export type AppPhase = "pulse" | "gate" | "intro" | "room";

type PulseFrame = "hole" | "light";

type InstrumentState = {
  phase: AppPhase;
  pulse: PulseFrame;
  beat: IntroBeat;
  world: WorldId;
  wellOpen: boolean;
  cyclePlaying: boolean;
  cycleHead: number;
  reducedMotion: boolean;
  webglFailed: boolean;
  mathLens: boolean;
  selection: InspectSelection;
  aligned: Record<WellnessId, boolean>;
  allAlignedSince: number | null;
  tick: number;
  log: string[];
  entered: boolean;
  formStage: FormStage;
  formN: number;
  formGoal: string;
  seats: TableSeat[];
  committed: boolean;
  notFit: boolean;
  viewLevel: TableLevel;
  freezeUntil: number;
  ringing: boolean;
  weatherMoving: boolean;
};

type Actions = {
  pressEnter: () => void;
  enterWhole: () => void;
  enterStage: (world: WorldId) => void;
  skipIntro: () => void;
  tickPulse: () => void;
  advanceIntro: (now: number) => void;
  setWorld: (w: WorldId) => void;
  focusWorld: (w: WorldId) => void;
  openWell: () => void;
  closeWell: () => void;
  toggleWellness: (id: WellnessId) => void;
  playCycle: () => void;
  pauseCycle: () => void;
  stepCycle: (dir: 1 | -1) => void;
  setReducedMotion: (v: boolean) => void;
  setWebglFailed: (v: boolean) => void;
  setMathLens: (v: boolean) => void;
  setSelection: (s: InspectSelection) => void;
  command: (fn: () => void | boolean, note?: string) => void;
  bump: () => void;
  setFormGoal: (goal: string) => void;
  setFormN: (n: number) => void;
  toggleSeatYes: (index: number) => void;
  confirmGoal: () => void;
  advanceForm: () => void;
  tableCommit: () => void;
  nameNotFit: () => void;
  setViewLevel: (level: TableLevel) => void;
  crankMood: (index: number, delta?: number) => void;
  noteRing: (marks: number) => void;
  resetForm: () => void;
};

const emptyAligned = (): Record<WellnessId, boolean> =>
  Object.fromEntries(WELLNESS_IDS.map((id) => [id, false])) as Record<WellnessId, boolean>;

function prefersReduce() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

const initial: InstrumentState = {
  phase: "pulse",
  pulse: "hole",
  beat: "pulse",
  world: "C9",
  wellOpen: false,
  cyclePlaying: false,
  cycleHead: 0,
  reducedMotion: prefersReduce(),
  webglFailed: false,
  mathLens: false,
  selection: { type: "overview", id: "overview" },
  aligned: emptyAligned(),
  allAlignedSince: null,
  tick: 0,
  log: ["[ENTER] Whole / Light. Press the dot. That is Enter, not Yes."],
  entered: false,
  formStage: "idle",
  formN: 4,
  formGoal: "",
  seats: makeSeats(4),
  committed: false,
  notFit: false,
  viewLevel: "self",
  freezeUntil: 0,
  ringing: false,
  weatherMoving: false,
};

function pushLog(log: string[], line: string) {
  return [...log.slice(-28), line];
}

let introStartedAt = 0;

function radiusFor(world: WorldId) {
  return world === "C9" ? 34 : world === "W4" ? 28 : world === "W3" ? 22 : world === "W2" ? 16 : 12;
}

function landInRoom(
  set: (p: Partial<InstrumentState>) => void,
  reducedMotion: boolean,
  log: string[],
  world: WorldId = "C9",
) {
  director.reset();
  resetOrbit(radiusFor(world));
  introStartedAt = 0;
  const line =
    world === "C9"
      ? "[CLOUD NINE] Beginning. Clarity keeps everything from being black and white."
      : `[ENTER] ${WORLDS[world].label}. Began at this stage. Press was not a Yes.`;
  set({
    phase: "room",
    beat: "C9",
    world,
    wellOpen: false,
    cyclePlaying: false,
    cycleHead: 0,
    reducedMotion,
    formStage: "idle",
    formN: 4,
    seats: makeSeats(4),
    committed: false,
    notFit: false,
    viewLevel: "self",
    freezeUntil: 0,
    ringing: false,
    weatherMoving: false,
    log: pushLog(log, line),
  });
}

function startIntro(set: (p: Partial<InstrumentState>) => void, log: string[]) {
  introStartedAt = performance.now();
  set({
    phase: "intro",
    beat: "fibers",
    entered: true,
    log: pushLog(log, "[WHOLE] Full cycle. Fibres fill the field. Press did not sign a Yes."),
  });
}

export const useInstrument = create<InstrumentState & Actions>((set, get) => ({
  ...initial,
  pressEnter: () => {
    const s = get();
    if (s.phase === "gate") {
      get().enterWhole();
      return;
    }
    if (s.phase !== "pulse") return;
    set({
      phase: "gate",
      entered: true,
      tick: s.tick + 1,
      log: pushLog(s.log, "[GATE] Four points and Whole. A point is a stage. Whole is the cycle. Not a Yes."),
    });
  },
  enterWhole: () => {
    const s = get();
    if (s.phase !== "gate" && s.phase !== "pulse") return;
    if (s.reducedMotion) {
      landInRoom(set, true, s.log);
      set({ entered: true, tick: s.tick + 1 });
      return;
    }
    startIntro(set, s.log);
  },
  enterStage: (world) => {
    const s = get();
    if (s.phase !== "gate" && s.phase !== "pulse") return;
    landInRoom(set, s.reducedMotion, s.log, world);
    set({ entered: true, tick: s.tick + 1 });
  },
  skipIntro: () => {
    const s = get();
    landInRoom(set, s.reducedMotion, s.log);
    set({ entered: true, tick: s.tick + 1 });
  },
  tickPulse: () => {
    const s = get();
    if (s.phase !== "pulse" || s.reducedMotion) return;
    set({ pulse: s.pulse === "hole" ? "light" : "hole" });
  },
  advanceIntro: (now: number) => {
    const s = get();
    if (s.phase !== "intro") return;
    if (s.reducedMotion) {
      landInRoom(set, true, s.log);
      return;
    }
    const elapsed = now - introStartedAt;
    let acc = 0;
    let beat: IntroBeat = "fibers";
    let done = true;
    for (const id of INTRO_ORDER) {
      acc += INTRO_MS[id];
      beat = id;
      if (elapsed < acc) {
        done = false;
        break;
      }
    }
    if (done && beat === "C9") {
      landInRoom(set, false, s.log);
      return;
    }
    if (beat !== s.beat) set({ beat, tick: s.tick + 1 });
  },
  setWorld: (world) => {
    const s = get();
    if (s.phase !== "room") return;
    orbit.radius = radiusFor(world);
    set({
      world,
      cyclePlaying: false,
      wellOpen: false,
      log: pushLog(s.log, `[FOCUS] ${world}. Camera did not Explore.`),
    });
  },
  focusWorld: (world) => {
    orbit.radius = radiusFor(world);
    set({ world, wellOpen: false });
  },
  openWell: () => {
    const s = get();
    if (s.world === "C9") {
      set({ log: pushLog(s.log, "[WELL] Cloud Nine has no seats. Open Self to practice.") });
      return;
    }
    set((st) => ({
      wellOpen: true,
      selection: { type: "overview", id: "overview" },
      log: pushLog(st.log, `[WELL] Opened ${st.world}. Ready is not Yes.`),
    }));
  },
  closeWell: () =>
    set((st) => ({ wellOpen: false, log: pushLog(st.log, "[WELL] Closed. Geometry did not sign.") })),
  toggleWellness: (id) => {
    const s = get();
    const next = { ...s.aligned, [id]: !s.aligned[id] };
    const all = WELLNESS_IDS.every((k) => next[k]);
    set({
      aligned: next,
      allAlignedSince: all ? s.allAlignedSince ?? Date.now() : null,
      tick: s.tick + 1,
      log: pushLog(s.log, next[id] ? `[ENTRANCE] ${id} revealed as belief. Not a Yes.` : `[ENTRANCE] ${id} released.`),
    });
  },
  playCycle: () => set({ cyclePlaying: true, cycleHead: 0, wellOpen: false, world: "C9" }),
  pauseCycle: () => set({ cyclePlaying: false }),
  stepCycle: (dir) => {
    const s = get();
    const next = Math.max(0, Math.min(WORLD_ORDER.length, s.cycleHead + dir));
    const world = WORLD_ORDER[Math.min(next, WORLD_ORDER.length - 1)] ?? "C9";
    orbit.radius = radiusFor(world);
    set({
      cyclePlaying: false,
      cycleHead: next,
      world,
      wellOpen: false,
    });
  },
  setReducedMotion: (v) => set({ reducedMotion: v }),
  setWebglFailed: (v) => set({ webglFailed: v }),
  setMathLens: (v) => set({ mathLens: v }),
  setSelection: (selection) => set({ selection }),
  setFormGoal: (formGoal) => set({ formGoal }),
  setFormN: (n) => {
    const formN = Math.max(FORM_N_MIN, Math.min(FORM_N_MAX, Math.round(n)));
    const s = get();
    const seats = makeSeats(formN, s.seats);
    if (s.formStage === "idle" || s.formStage === "goal") {
      set({ formN, seats, tick: s.tick + 1 });
      return;
    }
    set({
      formN,
      seats,
      tick: s.tick + 1,
      log: pushLog(s.log, `[FORM] Preferred lodge ${formN}. Census does not draw it. Geometry is not permission.`),
    });
  },
  toggleSeatYes: (index) => {
    const s = get();
    if (s.formStage === "idle" || s.formStage === "miss") return;
    const seats = s.seats.map((seat, i) => (i === index ? { ...seat, yesOnGoal: !seat.yesOnGoal } : seat));
    const who = seats[index];
    set({
      seats,
      tick: s.tick + 1,
      log: pushLog(
        s.log,
        who
          ? `[TABLE] ${who.name} ${who.yesOnGoal ? "Yes on the goal (individual). Not Table Commit." : "released the goal."}`
          : s.log[s.log.length - 1] ?? "",
      ),
    });
  },
  confirmGoal: () => {
    const s = get();
    const goal = s.formGoal.trim();
    if (!goal) {
      set({ log: pushLog(s.log, "[FORM] Name a goal first. Anyone can, as an individual.") });
      return;
    }
    set({
      formStage: "goal",
      formGoal: goal,
      committed: false,
      notFit: false,
      tick: s.tick + 1,
      log: pushLog(s.log, `[FORM] Goal held: ${goal}. Shape is a view, not a Yes. ${formCaption("goal", s.formN, goal)}`),
    });
  },
  advanceForm: () => {
    const s = get();
    if (s.formStage === "idle") {
      get().confirmGoal();
      return;
    }
    if (s.formStage === "pattern") {
      get().resetForm();
      return;
    }
    if (s.formStage === "miss") {
      set({
        formStage: "orbit",
        notFit: false,
        committed: false,
        tick: s.tick + 1,
        log: pushLog(s.log, `[TABLE] Fresh attempt around “${s.formGoal}”. Orbit. Not a Yes.`),
      });
      return;
    }
    if (s.formStage === "goal" && yesCount(s.seats) < 1) {
      set({ log: pushLog(s.log, "[TABLE] A point appears only when someone Yes’s the goal. Census does not draw the lodge.") });
      return;
    }
    if (s.formStage === "hold") {
      set({
        log: pushLog(s.log, "[TABLE] Hold. Pattern waits on human Commit. Conflict does not grey it."),
      });
      return;
    }
    const formStage = nextFormStage(s.formStage);
    const axis = recordForStage(formStage);
    const seats = axis === null ? s.seats : withRecord(s.seats, axis);
    set({
      formStage,
      seats,
      tick: s.tick + 1,
      log: pushLog(s.log, `[FORM] ${formActionLabel(s.formStage)}. ${formCaption(formStage, s.formN, s.formGoal)}`),
    });
  },
  tableCommit: () => {
    const s = get();
    if (!s.formGoal.trim()) {
      set({ log: pushLog(s.log, "[TABLE] Commit noted. No goal. The equator stays empty. This picture is evidence. It is not a Yes.") });
      return;
    }
    if (s.notFit) {
      set({
        committed: true,
        tick: s.tick + 1,
        log: pushLog(s.log, "[TABLE] Commit is still a human button. The table already named a miss. No gold."),
      });
      return;
    }
    const canPattern = s.formStage === "hold" || s.formStage === "lenses" || s.formStage === "pattern";
    set({
      committed: true,
      formStage: canPattern ? "pattern" : s.formStage,
      tick: s.tick + 1,
      log: pushLog(
        s.log,
        canPattern
          ? `[TABLE] Commit. Gold may follow attestation. ${formCaption("pattern", s.formN, s.formGoal)}`
          : "[TABLE] Commit recorded. Outer equator waits until the walk is outside. This picture is evidence. It is not a Yes.",
      ),
    });
  },
  nameNotFit: () => {
    const s = get();
    if (s.formStage === "idle") {
      set({ log: pushLog(s.log, "[TABLE] Name a goal before naming a miss.") });
      return;
    }
    set({
      formStage: "miss",
      notFit: true,
      committed: false,
      tick: s.tick + 1,
      log: pushLog(s.log, `[TABLE] Not-a-fit. ${formCaption("miss", s.formN, s.formGoal)}`),
    });
  },
  setViewLevel: (viewLevel) => set({ viewLevel, tick: get().tick + 1 }),
  crankMood: (index, delta = 0.35) => {
    const s = get();
    const seats = s.seats.map((seat, i) => (i === index ? {
      ...seat,
      mood: Math.max(0, Math.min(1.4, seat.mood + delta)),
      levels: {
        ...seat.levels,
        self: {
          ...seat.levels.self,
          fiber: {
            hoop: Math.max(0, Math.min(1.4, seat.mood + delta)),
            bob: Math.max(0, Math.min(1.4, seat.mood + delta)) * 0.8,
            urgency: Math.max(0, Math.min(1.4, seat.mood + delta)),
          },
        },
      },
    } : seat));
    set({
      seats,
      weatherMoving: true,
      tick: s.tick + 1,
      log: pushLog(s.log, `[TABLE] Fiber weather on ${seats[index]?.name ?? "seat"}. Weather is moving; the plan is not.`),
    });
  },
  noteRing: (marks) => {
    const s = get();
    const now = Date.now();
    if (s.freezeUntil > now) return;
    if (marks > 4) return;
    set({
      ringing: true,
      freezeUntil: now + 800,
      tick: s.tick + 1,
      log: pushLog(s.log, "[TABLE] the pointer is ringing — ask, don’t act. Tools stay human. No gold."),
    });
  },
  resetForm: () =>
    set((s) => ({
      formStage: "idle",
      committed: false,
      notFit: false,
      ringing: false,
      weatherMoving: false,
      freezeUntil: 0,
      seats: s.seats.map((seat) => ({ ...seat, yesOnGoal: false, howConfirmed: false, records: [] })),
      tick: s.tick + 1,
      log: pushLog(s.log, "[FORM] Reset. Goal remains. Consents were never in the shape."),
    })),
  command: (fn, note) => {
    fn();
    set((s) => ({
      tick: s.tick + 1,
      log: note ? pushLog(s.log, note) : s.log,
    }));
  },
  bump: () => set((s) => ({ tick: s.tick + 1 })),
}));

export function currentVertex(): VertexId {
  const w = useInstrument.getState().world;
  if (w === "C9") return "V0";
  return LAYER_VERTEX[w === "W1" ? 0 : w === "W2" ? 1 : w === "W3" ? 2 : 3];
}

export function currentFrame(): DecisionFrame {
  return director.frame(currentVertex());
}

export function currentOverlay(): TetraOverlay {
  const ending = currentEnding();
  return director.overlay(
    currentVertex(),
    ending !== "clusterfuck" && ending !== "P0",
    useInstrument.getState().wellOpen,
  );
}

export function holdMs() {
  const since = useInstrument.getState().allAlignedSince;
  return since ? Date.now() - since : 0;
}

export function currentEnding() {
  const s = useInstrument.getState();
  return pickEnding(director, s.aligned, holdMs());
}

export function currentCarry() {
  const s = useInstrument.getState();
  return carryMarks(director, s.aligned, holdMs());
}

export function currentRain() {
  return rainEligible(director);
}

export function selfHeld() {
  const s = useInstrument.getState();
  return wellnessHeld(s.aligned, holdMs());
}

export function installQaHooks() {
  if (typeof window === "undefined") return;
  window.__controlsTest = {
    getYaw: () => orbit.yaw,
    getSpeed: () => orbit.speed(),
    setKeys: (codes: string[]) => orbit.setKeys(codes),
    tick: (ms: number) => {
      const steps = Math.max(1, Math.ceil(ms / 16));
      for (let i = 0; i < steps; i += 1) orbit.step(1 / 60);
    },
  };
  window.__instrument = {
    director,
    getPhase: () => useInstrument.getState().phase,
    getBeat: () => useInstrument.getState().beat,
    getWorld: () => useInstrument.getState().world,
    press: () => useInstrument.getState().pressEnter(),
    skip: () => useInstrument.getState().skipIntro(),
    enterWhole: () => useInstrument.getState().enterWhole(),
    enterStage: (w: WorldId) => useInstrument.getState().enterStage(w),
    setWorld: (w: WorldId) => useInstrument.getState().setWorld(w),
    openWell: () => useInstrument.getState().openWell(),
    closeWell: () => useInstrument.getState().closeWell(),
    playCycle: () => useInstrument.getState().playCycle(),
    getFrame: () => currentFrame(),
    getEnding: () => currentEnding(),
    enteredExplore: () => director.at("V0").explored,
    getForm: () => {
      const s = useInstrument.getState();
      const marks = findContradictions(s.seats);
      return {
        stage: s.formStage,
        n: s.formN,
        goal: s.formGoal,
        yes: s.seats.map((seat) => seat.yesOnGoal),
        committed: s.committed,
        notFit: s.notFit,
        viewLevel: s.viewLevel,
        confirmedCount: confirmedCount(s.seats),
        commute: commuteClean(s.seats),
        gold: goldAllowed(s.seats, s.committed),
        ringing: s.ringing,
        weather: s.weatherMoving,
        contradiction: marks[0]?.caption ?? null,
      };
    },
    setFormGoal: (g: string) => useInstrument.getState().setFormGoal(g),
    setFormN: (n: number) => useInstrument.getState().setFormN(n),
    confirmGoal: () => useInstrument.getState().confirmGoal(),
    advanceForm: () => useInstrument.getState().advanceForm(),
    toggleSeatYes: (i: number) => useInstrument.getState().toggleSeatYes(i),
    tableCommit: () => useInstrument.getState().tableCommit(),
    nameNotFit: () => useInstrument.getState().nameNotFit(),
    crankMood: (i: number) => useInstrument.getState().crankMood(i),
    noteRing: (n: number) => useInstrument.getState().noteRing(n),
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
    __instrument?: {
      director: WorkshopDirector;
      getPhase: () => AppPhase;
      getBeat: () => IntroBeat;
      getWorld: () => WorldId;
      press: () => void;
      skip: () => void;
      enterWhole: () => void;
      enterStage: (w: WorldId) => void;
      setWorld: (w: WorldId) => void;
      openWell: () => void;
      closeWell: () => void;
      playCycle: () => void;
      getFrame: () => DecisionFrame;
      getEnding: () => ReturnType<typeof pickEnding>;
      enteredExplore: () => boolean;
      getForm: () => {
        stage: FormStage;
        n: number;
        goal: string;
        yes: boolean[];
        committed: boolean;
        notFit: boolean;
        viewLevel: TableLevel;
        confirmedCount: number;
        commute: boolean;
        gold: boolean;
        ringing: boolean;
        weather: boolean;
        contradiction: string | null;
      };
      setFormGoal: (g: string) => void;
      setFormN: (n: number) => void;
      confirmGoal: () => void;
      advanceForm: () => void;
      toggleSeatYes: (i: number) => void;
      tableCommit: () => void;
      nameNotFit: () => void;
      crankMood: (i: number) => void;
      noteRing: (n: number) => void;
    };
  }
}
