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
