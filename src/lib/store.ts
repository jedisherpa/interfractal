import { create } from "zustand";
import {
  FACE_META,
  GOAL0,
  PEOPLE_SEED,
  SOLIDS,
  type ResponseKind,
  type SolidKind,
} from "@/lib/hopf";

export type Person = {
  id: string;
  color: string;
  seat: number;
  rest: number;
  response: ResponseKind;
  responseVersion: number | null;
};

export type AgreementStatus = null | "active" | "paused" | "retired";

type ProtocolState = {
  version: number;
  proposal: string;
  agreement: AgreementStatus;
  reviews: boolean;
  repairOpen: boolean;
  spinning: boolean;
  solid: SolidKind;
  selectedFacet: number;
  selectedPerson: string | null;
  caption: string;
  goal: { theta: number; phi: number };
  people: Person[];
};

type ProtocolActions = {
  answer: (id: string, kind: "yes" | "no" | "withdraw") => void;
  recordReviews: () => void;
  propose: () => void;
  commit: () => void;
  act: () => void;
  reset: () => void;
  toggleSpin: () => void;
  cycleSolid: () => void;
  selectFacet: (index: number) => void;
  selectPerson: (id: string | null) => void;
};

const INITIAL_CAPTION =
  "No agreement yet. Four worldviews can share a goal without becoming the same person.";

function seedPeople(): Person[] {
  return PEOPLE_SEED.map((p) => ({
    id: p.id,
    color: p.color,
    seat: p.seat,
    rest: p.rest,
    response: "unset" as const,
    responseVersion: null,
  }));
}

function initialState(): ProtocolState {
  return {
    version: 1,
    proposal: "Carry the cardboard dragon over the bridge",
    agreement: null,
    reviews: false,
    repairOpen: false,
    spinning: true,
    solid: "tetrahedron",
    selectedFacet: 1,
    selectedPerson: null,
    caption: INITIAL_CAPTION,
    goal: { ...GOAL0 },
    people: seedPeople(),
  };
}

export function commitBlockers(
  s: Pick<ProtocolState, "reviews" | "people" | "repairOpen" | "agreement" | "version">,
) {
  const reasons: string[] = [];
  if (!s.reviews) reasons.push("bounded reviews not recorded for this version");
  if (s.people.some((p) => !(p.response === "yes" && p.responseVersion === s.version))) {
    reasons.push("explicit current-version consent missing");
  }
  if (s.repairOpen) reasons.push("previous consequences need an agreed response");
  if (s.agreement === "active") reasons.push("active agreement already sealed");
  return reasons;
}

export function actionBlockers(s: Pick<ProtocolState, "agreement" | "people">) {
  if (s.agreement !== "active") return ["No valid, current, active agreement"];
  if (s.people.some((p) => p.response !== "yes")) return ["No valid, current, active agreement"];
  return [];
}

export const useProtocol = create<ProtocolState & ProtocolActions>((set, get) => ({
  ...initialState(),
  answer: (id, kind) => {
    const s = get();
    const person = s.people.find((p) => p.id === id);
    if (!person) return;
    if (kind === "withdraw") {
      if (s.agreement !== "active") return;
      set({
        people: s.people.map((p) =>
          p.id === id ? { ...p, response: "withdrawn", responseVersion: s.version } : p,
        ),
        agreement: "paused",
        repairOpen: true,
        caption: `${id} stopped taking part in v${s.version}. The hoop remains. Consent is not inferred back.`,
      });
      return;
    }
    set({
      people: s.people.map((p) =>
        p.id === id ? { ...p, response: kind, responseVersion: s.version } : p,
      ),
      caption:
        kind === "yes"
          ? `${id} placed a Yes on v${s.version}. The bead can approach the shared goal. That is not yet an agreement.`
          : `${id} recorded No on v${s.version}. A No is a complete answer, not a defect.`,
    });
  },
  recordReviews: () =>
    set({
      reviews: true,
      caption: "Reviews recorded for this version. Reviews are not consent.",
    }),
  propose: () => {
    const s = get();
    const version = s.version + 1;
    const proposal =
      version % 2 === 0
        ? "Carry the dragon through the checked orchard route"
        : "Carry the cardboard dragon over the bridge";
    if (s.agreement === "active") {
      set({
        version,
        proposal,
        reviews: false,
        caption: `v${version} is a new draft. The previous agreement remains until it is resolved. Old Yes marks do not move.`,
      });
      return;
    }
    set({
      version,
      proposal,
      reviews: false,
      people: s.people.map((p) => ({ ...p, response: "unset", responseVersion: null })),
      caption: `New draft v${version}. Beads stay on home hoops until someone answers this version.`,
    });
  },
  commit: () => {
    const s = get();
    const reasons = commitBlockers(s);
    if (reasons.length) {
      set({ caption: `Commit blocked: ${reasons[0]}` });
      return;
    }
    set({
      agreement: "active",
      caption:
        "Agreement sealed for this version. The solid is gold because a command succeeded, not because the loops looked pretty.",
    });
  },
  act: () => {
    const s = get();
    const reasons = actionBlockers(s);
    if (reasons.length) {
      set({ caption: `Act blocked: ${reasons[0]}` });
      return;
    }
    set({ caption: `Simulated action on v${s.version}: ${s.proposal}` });
  },
  reset: () =>
    set({
      ...initialState(),
      caption: "Fresh attempt. History of a real workshop would remain; this practice table resets.",
    }),
  toggleSpin: () => set((s) => ({ spinning: !s.spinning })),
  cycleSolid: () =>
    set((s) => {
      const next = SOLIDS[(SOLIDS.indexOf(s.solid) + 1) % SOLIDS.length];
      return {
        solid: next,
        caption: `Constitutional chart: ${next}. Same Hopf field. A different lattice is not a different authority.`,
      };
    }),
  selectFacet: (index) => {
    const facet = FACE_META[index] ?? FACE_META[0];
    set({
      selectedFacet: index,
      caption: `Facet ${index + 1}: ${facet.title}`,
    });
  },
  selectPerson: (id) => set({ selectedPerson: id }),
}));
