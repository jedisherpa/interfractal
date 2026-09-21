# Multi-Agent Fractalwave Loop — Part 1: Architecture

**Status:** Draft — pending Paul Cooper attestation. Not for merge. Do not deploy. Do not push to `main`.

**Document:** Part 1 of 2 (architecture). Part 2 (governance, open questions, status line) is a sibling draft when published.

**Repos:** Looking Glass laboratory (`experiments/looking-glass/`), BTC Constitutional Learning Collective Mode-0 observatory posture, Da Vinci purpose clarification (connection readiness ≠ built; Looking Glass integration not authorized by purpose adoption alone).

**Claims discipline:** This draft describes a *proposed* architecture. It does **not** establish mathematical fidelity, information recovery, or human understanding. Those three claims remain separate and **none are established** by this document.

---

## (1) Purpose

Design a **two-level multi-agent fractalwave loop** that uses Looking Glass as the inspectable instrument / shared-reference surface.

**Fractalwave as architecture (not a proven market ontology):**

- Layers can **cancel**.
- A **superwave** appears when layers **align**.
- The loop is a way to *organize* partial views, objections, and revisions — not a claim that fractalwave theory is empirically validated here.

**Three claims kept separate (none established by this draft):**

| Claim | Meaning in this design | Status |
| --- | --- | --- |
| **Fidelity** | Geometric / model correspondence to declared higher-dimensional or multi-scale structure | **NOT ESTABLISHED** |
| **Recovery** | Information recoverable from projections, slices, or shared records | **NOT ESTABLISHED** |
| **Understanding** | Human or agent comprehension / learning benefit | **NOT ESTABLISHED** |

Looking Glass remains an **instrument and shared-reference surface**. BTC Learning Collective remains the **evidence and learning process** producer. Connection readiness (an independent client replaying a complete research round) is a *goal*, not a built capability authorized by this draft.

---

## (2) Level 1 — Bottom four agents

**Roster:** Four bottom agents. Each holds a **unique partial information set** (exact partition: open — see Part 2 open questions).

**Pipeline (per agent, then as a cohort):**

1. **Gather data** within that agent’s allowed information set.
2. **Interpret through a lens** (agent-local interpretive stance; exact prompts: open).
3. **Navigate Looking Glass blind** — a structured pass in which the agent must:
   - **Articulate** its current shape / claim set;
   - **Hear others** (receive peer articulations without collapsing into them early);
   - **Answer** challenges;
   - **Track objections** explicitly;
   - Continue until a **stable shape** is reached (stability criteria: open / attestation-gated).
4. **Graduate upward** only when all four produce a freeze package.

**Graduate package (pass upward to Level 2):**

For each of the four bottom agents, freeze and pass:

- **Snapshot** of the agent’s worldview / shape;
- **Wave** descriptor for that layer (alignment / cancel contributions as recorded — schema open);
- **Provenance** of all materials used and produced by that agent in the round.

All four freeze packages travel together. Level 1 does not silently drop dissent.

---

## (3) Level 2 — Top four lenses

**Inputs:** All four Level-1 snapshots + full provenance bundles.

**Lenses (four top calls / stances):**

| Lens | Focus |
| --- | --- |
| **A — Frequency alignment** | Where layer oscillations / timings reinforce or cancel |
| **B — Structural ambiguity** | Where projections or records underdetermine the source shape |
| **C — Persuasion risk** | Where a view is compelling but may mislead (see Looking Glass Gate 13 spirit: persuasive-but-wrong) |
| **D — Coordination preservation** | Where joint procedure can proceed without erasing disagreement (see Looking Glass Gate 12 spirit) |

**Pipeline:** Same **blind-then-open** structure as Level 1 (articulate → hear → answer → track objections → stable composite).

**Outputs:**

- Four **composites** (one per lens);
- One **convergence report** (what aligned, what canceled, what remains unresolved).

Exact system prompts and non-prompt differentiation across the four top calls: open (must be specified before implementation — see Part 2).

---

## (4) Blind-then-open (both levels)

**Rule:** Both Level 1 and Level 2 run **blind-then-open**.

- **Blind phase:** Agents / lenses form and record positions before full exposure to peers’ final composites (exact blinding protocol: open).
- **Open phase:** Peers’ articulations and objections become visible; revision is explicit and provenance-linked.

**Intent:** Prevent **false consensus** at both levels.

**Convergence:** Convergence **attests itself** via frozen records and the convergence report — it is not declared by UI gloss, confidence language, or visual coherence. Visual coherence never constitutes approval.

---

## (5) Provenance

**Rule:** Every output is **frozen and hashable**.

- Divergence must be **traceable** to inputs, lens identity, prompt/version, model identity (where used), and prior snapshots.
- Provenance recording mechanics per LLM call are **must-specify-before-implementation** (see Part 2 open question on provenance).

No silent overwrite of prior freezes. Failed or divergent candidates remain inspectable.

---

## (6) Storage — per-agent SQLite and BTC Learning memory

- Each **bottom agent** has its **own SQLite** store for local round state / working memory.
- Use **existing BTC Learning memory infrastructure** for collective / observatory records.
- **Do not overwrite** existing BTC Learning memory schemas or Mode-0 ledger semantics.
- New tables or stores, if later attested, must be **additive** and versioned.

This section is architectural intent only — not a schema migration authorization.

---

## (7) Live visualization goal (not built)

**Goal (aspirational):** A live 3D visualization in which Paul can watch:

- Calls / exchanges among agents;
- Shapes forming and revising;
- Spin / projection motion;
- Forecast **waves** (alignment and cancel) in 3D.

**Status:** **Not built.** This draft does not authorize Looking Glass integration work, connection-readiness implementation, Gate 14 geometry ablations, study execution, public deployment, or merge/deploy.

Related Looking Glass instrument gates (Hopf correspondence, ambiguity, coordination, misleading view, etc.) remain historical / frozen laboratory evidence; they are not promoted to “live viz complete” by this document.

---

## Cross-links

- Looking Glass laboratory README and gate packets under `experiments/looking-glass/`.
- Da Vinci purpose clarification: BTC Learning Collective produces evidence the Looking Glass instrument makes inspectable; connection readiness means an independent test client can consume and replay a complete research round — **not** consented as already built.
- Hosting tension (canonical repo): Interfractal PR #12 (lab import) vs BTC PR #6 (visualizer/workshop host) — open for Paul (Part 2).

---

## Document control

| Field | Value |
| --- | --- |
| Part | 1 — Architecture |
| Attestation | **Pending Paul Cooper** |
| Merge to `main` | **Forbidden** until attestation + explicit merge grant |
| Deploy / public | **Forbidden** by this draft |
| Code changes | **None** authorized by this draft |
| Sibling | Part 2 — Governance, open questions, status (when published) |

*End of Part 1.*


---

# Part 2 — Jev scoring layer, governance, open questions

**Status:** Draft — pending Paul Cooper attestation. Not for merge. Do not deploy. Do not push to `main`.

**Rule:** This Part 2 **appends** to Part 1. It does not revise Part 1 architecture text. Part 1 remains the architecture freeze candidate; Part 2 adds scoring, non-authorization, and open questions.

**Document control:** Same path as Part 1 (`experiments/looking-glass/design/MULTI_AGENT_FRACTALWAVE_LOOP_PART_1_ARCHITECTURE_UNATTESTED.md`). Mirror on Interfractal `codex/import-looking-glass-laboratory` (PR 12 branch).

---

## (A) Jev scoring layer

### What Jev is (for this design)

**Jev** is TypeSafe’s **System One** model — **not** a chat LLM.

- **In:** a `state` (text and/or JSON) plus **typed questions**.
- **Out:** **probabilities** and **confidence** — **no prose**.
- Role in this loop: **scorer / meta-checker**, not narrator, not consensus author.

Primary framing (TypeSafe docs / launch materials, paraphrased for this draft): unstructured or structured state in; typed probabilistic decisions out; no string generation.

### Pricing and capacity (as published; verify before spend)

| Item | Published figure (draft note) |
| --- | --- |
| Input price | About **$42 per billion** input tokens (~$0.042 / MTok) |
| Output | **Free** (not billed) |
| Context | **64k** tokens per request; **32k** for `state` + longest single question |
| Latency | About **70–500 ms** end-to-end (claimed) |
| Input modalities | Text / JSON only — no image/audio/video |
| Tool use | Not an agent tool-loop model; closed Choice/Score/Noul questions composed in **your** code |

**Hard limit for this architecture:** Jev **cannot draft consensus**, cannot write the shared account, and **cannot explain why** (no generative rationale). Explanation and synthesis remain with generative models and/or Paul.

### Twelve Jev scoring calls → synthesizer → final Jev meta-check

| Phase | Calls | State | Role |
| --- | --- | --- | --- |
| Bottom self-scores | **Jev 1–4** | Each bottom agent’s **own** snapshot (+ local provenance as needed) | Score that agent’s freeze package against typed criteria |
| Top lenses | **Jev 5–8** | **All four** bottom snapshots (+ provenance) | Score the cohort through lenses A–D |
| Joint / cohort | **Jev 9–12** | All four snapshots together | Four typed joint facets (agreement, contradiction, cancel-vs-align, residual ambiguity — exact facet labels **open**) |
| Synthesizer | *(not Jev)* | The **twelve** Jev distributions (+ frozen snapshots as context allows) | **Generative** model **proposes** a final question |
| Meta-check | **Final Jev** | Proposed question + supporting distributions/snapshots | Typed check: is this question **worth asking**? |

**Division of labor (non-negotiable in this draft):**

1. **Jev = scorer** (twelve distributions) and **validator** of whether the synthesizer’s question is worth asking.
2. **Synthesizer = question-chooser** (generative; proposes the question; does not silently become the consensus text authority).
3. **Final Jev validates the question** before any further spend on answering it in the loop.

If the meta-check fails confidence or returns “not worth asking,” the loop **stops or escalates** — it does not invent a softer pass.

### Fit to Part 1

- Level 1 / Level 2 **blind-then-open** and freeze packages remain as in Part 1.
- Jev attaches **typed, hashable score records** to those freezes (provenance-linked).
- Live viz (Part 1 §7) remains **not built**; Jev scores do not imply a 3D wave UI.

### Open issues specific to Jev (must resolve before implementation)

1. **Budget:** Do **four snapshots** (plus provenance) fit the **32k** `state` + longest-question budget? If not: filter, summarize under attested rules, or multi-call with explicit join keys — **open**.
2. **Decomposition:** Can open-ended **meaning-making** be decomposed into Choice / Score / Noul **without smuggling the answer into the rubric**? **Open.**
3. **Calibration:** Calibration of Jev on **Looking Glass / fractalwave vocabulary** is **unknown without evaluation**. Do not treat marketing Pareto claims as Looking Glass-domain proof.

---

## (B) Governance — what this document does **not** authorize

This Part 1+2 draft **does not authorize**:

| Item | Status under this draft |
| --- | --- |
| **Gate 14** (geometry ablations / related Looking Glass gate) | **Not authorized** |
| **Study execution** (four-agent or human) | **Not authorized** |
| **Connection readiness** (independent client replaying a full research round) as built or as build mandate | **Not authorized** |
| **Looking Glass integration work** into product / teaching app | **Not authorized** |
| **Public deployment** | **Not authorized** |
| **Merge to `main`** / production promote | **Not authorized** |

**Da Vinci / HUMAN_DECIDED (purpose clarification) — binding reminder for this draft:**

- Purpose clarification **does not authorize Looking Glass integration**.
- **“Treat connection readiness as already built” is not consented.**
- Every material step still requires **separate Paul Cooper attestation** (scope, target, payload, timing, conditions).

No analysis in Part 1 or Part 2 is authorization. Intelligence is not authority.

---

## (C) Open questions for Paul Cooper’s review

| ID | Question | Notes |
| --- | --- | --- |
| **C1** | Exact definition of each **bottom agent’s unique information set** | Partition, overlap rules, forbidden peeks |
| **C2** | Exact **system prompts** for the **four top lenses** (A–D) | Frequency alignment; structural ambiguity; persuasion risk; coordination preservation |
| **C3** | What differs between the four top calls **beyond prompts** so they are not trivial echo | Model, temperature, tool ban, input masking, seed policy, etc. |
| **C4** | **Provenance recording mechanics per LLM call** | **Must-specify-before-implementation** (hash inputs/outputs, model id/version, prompt hash, timestamps, parent freeze ids) |
| **C5** | Is **L2 convergence** a **ninth glass / Jev pass**, or a **simpler threshold aggregation** over existing scores? | Pick one; document failure modes |
| **C6** | **Interfractal PR 12** vs **BTC PR 6** — which repo/branch is **canonical** for visualizer/workshop hosting vs lab archive? | Hosting update previously pointed at BTC; PR 12 is import/archive |

Until C1–C6 are attested, implementation of the multi-agent fractalwave loop (including Jev wiring) remains **blocked**.

---

## (D) Status line

**Draft — pending Paul Cooper attestation. Not for merge.**

| Field | Value |
| --- | --- |
| Parts | 1 Architecture + 2 Jev / governance / opens (this append) |
| Code changes | **None** authorized |
| Attestation | **Pending** |
| Merge / deploy | **Forbidden** until explicit grant |

*End of Part 2.*
