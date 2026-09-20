# From Freeze to Fibre: A Doctoral Research Proposal for Multi-Agent Classical Hopf Visualization of Nested Timescales (BTC CLC Case)

---

```
██████████████████████████████████████████████████████████████████████████████
█  STATUS: DRAFT / UNATTESTED — research proposal only                      █
█  Mode: Research only. No git commit, push, merge, deploy, or trading.     █
█  Agents do not ratify. Paul attests. Topology does not authorize.         █
█  Prepared: 2026-09-19 America/Denver (MT / UTC-6)                         █
█  Path: prism-context/btc-learning-collective-walkthrough/                 █
█        DOCTORAL_PROPOSAL_HOPF_COLLECTIVE_BRIDGE_UNATTESTED.md             █
██████████████████████████████████████████████████████████████████████████████
```

**Claim grades used throughout:** `SUPPORTED` | `CONTRADICTED` | `UNKNOWN` | `NOT_TESTED` | `ASSUMED`  
**Ontology banner:** Classical visualization and measurement only. This proposal does **not** claim that BTC markets are quantum fields, holographic vacuum, Planck-scale spin networks, or Hopf-physical objects. Geometry records; humans attest; geometry does not decide trades or Mode.

---

## 1. Abstract

Four agents in a Mode-0 constitutional learning observatory each form a BTC price reading from an **attested market freeze**. This proposal asks whether those readings—and the freeze’s multi-timescale structure—can be mapped onto **classical S³ Hopf fibres** so that relative phase (constructive and destructive interference among nested clocks and among four worldviews) becomes visible in a way flat multi-panel charts do not show.

The case study is the **BTC Constitutional Learning Collective (CLC)**: a single-user measurement instrument with no exchange SDK, no order endpoint, and no wallet. Load-bearing freezes are Coinbase BTC-USD REST L1 plus completed 1-minute candles, content-hashed; trade tape, funding, and open interest are excluded from the load-bearing path and must be labeled `UNKNOWN` when absent (ledger E01; freeze research 2026-09-19).

After two independent blind deliberation rounds and two synthesis passes, the standing Round-2 research design is: (i) a **two-tier Mode-0 fibre pair**—shared candle mid-return bands plus per-seat forecast residual—explicitly labeled incomplete relative to the event-arrival frequency model (E12e); (ii) a **shared, adjacent half-open band lattice** versioned in `fibre-map-vN`; (iii) **dual Self(8)/Tribe(4) charts** rather than ontological 8→4 collapse; (iv) coherence measured by classical **pairwise phase-locking value (PLV)** with surrogate controls, never by linking number, Chern, or holonomy; (v) evaluation in locked lanes **non-financial nested clocks → four-agent presentation → market freeze braid**; (vi) default architecture `shared_base_four_gamma` with optional labeled per-seat home fibres; (vii) workshop motto retained—*Python is normative; HTML is a view; topology does not authorize*.

This document is a **doctoral-style research proposal**: problem, background, questions, hypotheses, methods, capability gaps, risks, deliverables, and open fights Paul must decide. It invents nothing beyond the cited UNATTESTED source corpus. It authorizes no code change, no trading, and no map lock.

---

## 2. Problem / motivation

### 2.1 The measurement problem

Markets are physical processes—neurons, electrons, radio, heat—described at social-psychological levels without a second substance (E12e). Builders naturally reach for **frequency / waveform language**: overlapping modes across timescales and agents. That language is legitimate as **classical signal physics** of chosen observables (Fourier / wavelet / band-limited channels). It is illegitimate as QFT, vacuum spin of the order book, or trader entanglement.

The CLC already freezes a honest but **thin** picture: static L1 top-of-book plus a short completed-candle series. That picture is real—“blue next to yellow” on the child’s page—but it **discards most event-arrival frequency content** (quotes, trades, cancels) that a waveform model would prefer (E01 exclusions; E12e sampling correction). A Hopf fibre painted only from mid-price phase therefore risks visualizing **filter artefacts of a thin snapshot** rather than measured modes—unless observables, band edges, and falsifiers are named first.

### 2.2 The visualization problem

Flat multi-panel charts show levels and returns. They do not, by default, make **relative phase among nested clocks** or **relative phase among four agent readings of one freeze** legible as constructive / destructive interference. The Hopf workshop already draws classical S³ fibres, stereographic views, four tetra seats (Maya / Finn / Bea / Sam), intention beads, and consent protocol chrome—under the motto that topology does not authorize. The CLC already runs Mode-0 rounds that measure a council often **losing to a dumb baseline** and must write that truth in ink. Bridging them without rebuilding either system is attractive; prettier geometry must not erase a losing ledger.

### 2.3 The governance problem

Any bridge that silently remaps features→angles when `features-v5` bumps, that imputes tape the freeze lacks, that treats Garden lore 8→4 as a sampling theorem, or that lets linking/Chern chrome stand in for coherence, converts a teaching instrument into a **mirror that flatters construction**. The research problem is therefore not “can we make pretty fibres?” but: **can we version, falsify, and pedagogically rehearse a classical freeze→fibre map so that interference language earns its keep—or is honestly demoted?**

### 2.4 Loving-parent honesty

Lines may be crooked and still signal. Mid-return bands from attested candles are crooked relative to event-time frequency, but they are a real mark—not nothing. Forecast residuals are finger-paint of four worldviews on one freeze—worth reflecting even when the council loses. Blank spots (arrival intensity without tape) must be named `UNKNOWN`; inventing tape is not love. This proposal names alive marks and mush alike.

---

## 3. Background

### 3.1 BTC CLC Mode-0 freeze (E01 + freeze research)

The Collective is a **single-user constitutional learning observatory** (Mode 0 simulation only): measurement instrument, not a trading system.

**Seven-step round (walkthrough map E01–E07):** (1) freeze a picture of the market; (2) validate / integrity-check; (3) forecast + independent reviews; (4) deterministic decision rules (record or NO_RECORD); (5) settlement against a versioned price rule; (6) append-only tamper-evident chain; (7) Chamber / Highway presentation (watch, not trade).

**Load-bearing freeze contents (`SUPPORTED` by E01 + `BTC_SNAPSHOT_FREEZE_RESEARCH_2026-09-19.md`):**

| Element | Fact |
|---|---|
| Venue | Coinbase BTC-USD REST only (`COINBASE_SPOT_BTC_USD`) |
| L1 | bid / ask / mid in integer cents; spread bps / micro-bps |
| Candles | completed 1-minute bars (granularity 60); ≥8 completed closes; forming bar dropped |
| Pin | engine `nowMs` → `capturedAtMs` (venue book `time` / `sequence` not the freeze clock) |
| Hash | `snapshotHash` binds top-of-book + series + `capturedAtMs`; depth excluded from core hash |
| Features | `FEATURE_SET_VERSION = "features-v5"` after freeze, before forecast |
| Aux (non-load-bearing) | L2 depth imbalance at 5/10/25 bps; Kraken cross-venue dispersion — agreement evidence only |
| Exclusions | no market WebSocket; **no trade tape**; no true event-time OFI; no funding / OI as load-bearing; no multi-venue settlement |

**Code anchors:** `liveMarket.ts` (`fetchLiveSnapshot`), `depthCapture.ts`, `snapshotChecks.ts`, `cycleEngine.ts`, `shared/ledger/features.ts`. Required-path failure abandons the cycle—no silent fixture fallback.

**Claim discipline:** Freeze contents and exclusions — `SUPPORTED`. Completeness as “the market” — `CONTRADICTED` by documented exclusions.

### 3.2 Hopf workshop (E08 context)

Path: `/workspace/roman-bridge-worktrees/hopf-workshop`. Normative math in `hopf_model.py` / `hopf.js` (S³, Hopf map, stereographic projection, fibre sampling); Canvas 2D drawing in `workshop.html` + `visualizer_geometry.js` + `visualizer_ui.js`; optional Three.js Intention Abacus (`abacus_engine.js`); four-seat rehearsal in `weopoly_hopf.py` (Maya / Finn / Bea / Sam); cycle scrub in `cycle.js` (never writes protocol \(z\)).

**Motto (README):** *Python is normative. HTML is a view. Topology does not authorize.*

**E08 exploratory bridge assumptions (ASSUMED until attested):** attested freeze ≈ base-sphere point; multi-timescale structure ≈ fibre / orbit / phase; four agents ↔ four Hopf angles (e.g. price, spread, volume momentum, cross-venue—open); consent protocol rhymes with collective round (**rhyme ≠ authorization**); geometry records oscillating state and replay; it does not decide. No market→Hopf adapter exists today (`SUPPORTED`).

### 3.3 Garden / Interfractal pedagogy (E09 + Round-2 shared context)

**Four explorable scales** (Fractal Block / Interfractal): Observatory Garden (0) → Circuit Forest (1) → Monument Desert (2) → Inner Core (3). Player learns scale by walking nested worlds, not by being told a formula. **Cloud Nine** is earned weather / fifth chamber—**not** `ScaleLayerId = 4`.

**Eight wellness entrances** (Physical, Emotional, Intellectual, Social, Spiritual, Environmental, Occupational, Financial) are dimensions of **one Self**—not four people. **Tribe** seats are Maya / Finn / Bea / Sam. Standing lore lock: do not replace seats with E0–E7; people ≠ fibres; beads are intentions (`DESCENT_COSMOLOGY_PLAN.md`; `visualizer_geometry.js`).

**E12e standing limit:** 8→4 and Cloud Nine are **story geometry**. They do **not** fix the sampling theorem. Use them for teaching coherence and seat discipline; do not treat lore as a substitute for measured bands (`CONTRADICTED` as measurement warrant).

### 3.4 Frequency model and lens ranking (E12e; E12 placeholder)

E12 remains a **placeholder** pending math deep-dive. E12e supplies the standing correction:

1. **Mathematical physics** — best native language for modes, phase, interference, multi-timescale bands.  
2. **Differential geometry** — honest **chosen** embedding of those phases on S³/Hopf.  
3. **Quantum information** — borrowed vocabulary for classical distinguishability / mixedness only; dangerous if literalized as trader entanglement.  
4. **Holographic / Haramein-style** — richest poetry; weakest warrant for market frequencies; lore / world-building only.

**Hard gate (E12e):** for each Hopf fibre, name the **exact observable** and **exact band edges in clock time**, then name a **falsifier** for constructive interference. If the fibre lights whenever bands overlap **by construction**, the picture is a mirror, not a discovered wave.

### 3.5 Deliberation path that produced this proposal

| Phase | Artifact | Role |
|---|---|---|
| Packet | `RESEARCH_PACKET_HOPF_COLLECTIVE_BRIDGE_UNATTESTED.md` | Freeze→Fibre proposal + Q1–Q7 starters |
| Round-1 blind | `blind/Q1.md`…`Q7.md` | Independent answers (no ledger/sibling read) |
| Round-1 synthesis | `DELIBERATION_SYNTHESIS_UNATTESTED.md` | Agreements, divergences D1–D6, unresolved U1–U4 |
| Round-2 context | `ROUND2_SHARED_CONTEXT_FOR_BLIND_AGENTS.md` | Nested scales; worldview agents; non-financial first; loving-parent; Hopf codebase grounding |
| Round-2 blind | `blind2/Q1.md`…`Q7.md` | Independent answers under shared context |
| Round-2 synthesis | `DELIBERATION_SYNTHESIS_ROUND2_UNATTESTED.md` | Shifts, fights P1–P5, workshop capability matrix, converged defaults |

This doctoral proposal **synthesizes** those sources; it does not supersede Paul’s attestation rights over any of them.

---

## 4. Research questions Q1–Q7 (Round-2 stance)

Each paragraph states the question and the **provisional Round-2 stance** (research-design default, not attested lock).

### Q1 — Best observable per Hopf fibre

What classical observable should define each fibre’s phase—trade-arrival intensity, mid-return, depth imbalance, funding, agent forecast residual, or other—given E01 availability and E12e frequency honesty? **Round-2 stance:** adopt a **two-tier Mode-0 pair**—Tier A shared completed-candle **mid-return** bands from the attested freeze series; Tier B per-seat **forecast residual** vs freeze mid—explicitly labeled incomplete relative to E12e; promote **arrival intensity** to Tier A only when attested research-lane tape exists, keeping mid-return as parallel control; reject funding / imputed tape / lore scalars as Mode-0 primaries; never claim mid-return *is* the fundamental market frequency.

### Q2 — Exact band edges in clock time

What shared (or per-agent) clock-time band edges define multi-timescale packing, and how is membership defined so interference is not overlap-by-construction? **Round-2 stance:** bands are **shared** and versioned in `fibre-map-vN`; per-agent private edges forbidden on the load-bearing path (independence lives in phase/worldview); prefer **adjacent half-open partitions** so each completed candle belongs to exactly one band; sub-1m forbidden without research tape; candidate v0 octave-ish nest `{[0,1),[1,4),[4,16),[16,64)}` minutes before pin, with trader `{[0,1),[1,5),[5,15),[15,60)}` as labeled alt branch—Paul still picks default (**P4**).

### Q3 — 8→4 ablation vs dual chart

Does collapsing eight wellness / feature channels to four tetra seats improve legibility without destroying predictive or pedagogical signal? **Round-2 stance:** default to a **layered dual chart**—Self-field (8) recoverable; Tribe (4 seats / worldviews) as default social stage; ablation is an **experiment with dual gates** (pedagogy + predictive), not ontological collapse; never replace Maya/Finn/Bea/Sam with E0–E7; lore supplies naming only (E09); E12e lore≠sampling remains binding.

### Q4 — Falsifier for coherence

What falsifier for “constructive interference” is not “bands overlap by construction”? **Round-2 stance:** primary coherence \(C\) = mean pairwise **PLV** (classical circular resultant family); optional freeze-sparse \(C_{\mathrm{freeze}}\); **ban list**—never use `linkingNumber`, holonomy, Chern, gold tetra, or braid pretty-ness as \(C\); controls: phase shuffle (CTRL-P), band-label shuffle (CTRL-L), seat shuffle (CTRL-S), negative natural-clock pair (CTRL-N); pre-register \(N\), \(\alpha\), window; if \(C_{\mathrm{obs}}\) sits inside the null cloud, the interference claim fails.

### Q5 — Historical braid replay vs flat charts

Can scrubbable Hopf braid over attested past freezes (and rehearsal domains) reveal interference patterns flat multi-panel charts miss, with a defined success metric? **Round-2 stance:** evaluate in three locked lanes—**A** non-financial nested clocks (required first), **B** four-agent presentation-over-time, **C** market freeze braid (deferred); same data into flat twin vs Hopf braid; success = Δ accuracy on relative-phase tasks + \(C\) beats shuffle controls + novelty confound check; fail → demote braid to optional aesthetic; protocol history cursor ≠ market freeze braid; preference Likert cannot override primaries.

### Q6 — Per-agent fibres vs shared fibre

Should fibres be per-agent (four private oscillators) or shared (one market oscillator, four phase offsets)? **Round-2 stance:** default Mode-0 council interference about one freeze to **`shared_base_four_gamma`** (Prototype B); optional **`per_seat_home_fibres`** as labeled mode for worldview pedagogy / Self-layer / ablation—never silent mix; people ≠ fibres; seats ≠ bands; this does **not** silently retire E08’s four-feature→four-angle family—version as separate `fibre-map` families (**P2** open).

### Q7 — Robust feature→fibre angle mapping

What angle-mapping is robust under `features-v5` bumps and freeze-hash discipline—versioned, attested, reversible? **Round-2 stance:** `fibre-map-vN` **triple-binds** `snapshotHash` + `FEATURE_SET_VERSION` (+ optional tape ids) → angles; pure deterministic function; inverse / stereographic distortion notes; bump on any meaning change; old versions readable; Paul attest; Python normative / HTML view; JS↔Python parity tests; non-financial pilot map attested under the same schema before BTC beauty claims; silent HTML remap = protocol violation; consent/holonomy chrome must not ride map versions.

---

## 5. Hypotheses

**H1 (classical embedding).** S³/Hopf fibre coordinates can serve as a *chosen* classical embedding for nested-clock and multi-agent relative phase without implying quantum or holographic market ontology. (`SUPPORTED` as methodological rule in E12e / packet; empirical usefulness `NOT_TESTED`.)

**H2 (two-tier Mode-0 sufficiency).** Under E01 exclusions, the Tier A mid-return + Tier B residual pair carries enough reconstructible phase structure for a freeze-available `fibre-map-vN` prototype that can fail Q4 surrogates honestly—while remaining explicitly incomplete vs event-arrival truth. (`ASSUMED`; Round-2 Q1.)

**H3 (arrival upgrade).** When attested research-lane tape exists, arrival-intensity fibres will outperform mid-return alone on pre-registered spectral / circular-correlation head-to-heads for frequency content—without authorizing Mode≠0. (`ASSUMED`; E12e + Q1 T3; requires Paul’s tape scope **P5**.)

**H4 (partition discipline).** Adjacent half-open shared bands make band-label shuffle a well-defined null; overlapping nested windows without partition membership inflate \(C\) by construction. (`ASSUMED` from E12e hard gate + Round-2 Q2.)

**H5 (dual Self8 / Tribe4).** Keeping Self(8) and Tribe(4) as dual recoverable charts improves pedagogical legibility relative to forced single collapse, and ablation ADOPT requires joint non-inferiority on pedagogy and prediction. (`ASSUMED`; Round-2 Q3; lore-as-measurement `CONTRADICTED` by E12e.)

**H6 (PLV falsifiability).** True relative-phase structure yields \(C_{\mathrm{obs}}\) above CTRL-P and CTRL-L (and hygiene CTRL-N) at pre-registered \(\alpha\); construction artefacts do not. (`ASSUMED` method; Round-2 Q4.)

**H7 (braid earns keep).** Hopf braid beats flat twin on ≥2 pre-registered relative-phase tasks in lanes A→B before lane C is claimed; otherwise braid is aesthetic-only. (`ASSUMED`; Round-2 Q5.)

**H8 (shared carrier default).** For one attested freeze, shared base + four \(\gamma\) yields cleaner interference falsification and better workshop fit than four private market oscillators as load-bearing default. (`ASSUMED`; Round-2 Q6; conflicts with E08 four-feature map remain versioned, not erased—**P2**.)

**H9 (map governance).** Triple-bound append-only `fibre-map-vN` prevents silent meaning change under feature bumps; AngleMapBumpRoundTrip fails on silent id reuse. (`ASSUMED` process hypothesis; Round-2 Q7 ∩ E08 ∩ E01.)

**H10 (non-financial-first nested clocks).** Nested natural clocks (lunar↔day, seasonal↔hourly weather, circadian↔ultradian, tidal↔storm) as analogy fibres **before** BTC binding strengthen scientific honesty: if \(C\) lights equally under shuffled phases on natural clocks, the instrument is broken—saving false BTC “interference.” Natural-clock pass does **not** attest the BTC map. (`ASSUMED` methodological hypothesis; Round-2 shared context C; strengthens discipline, weakens prophetic geometry.)

---

## 6. Methods

Research-described only. No product-repo edits, no trading, no Mode≠0 from this proposal.

### 6.1 Freeze discipline (unchanged load-bearing path)

1. Capture via `fetchLiveSnapshot` (Coinbase L1 + gran=60 candles); pin `capturedAtMs`; `canonicalHash` → `SNAPSHOT_FROZEN`.  
2. `checkSnapshot` → `SNAPSHOT_VALIDATED` / `REJECTED`.  
3. `writeFeatureSet` at `features-v5`.  
4. Do **not** silently invent tape features inside the core hash. Label research-lane tape separately if Paul scopes it (**P5**).

### 6.2 Versioned `fibre-map-vN`

Document for each map version: inputs (freeze fields / feature keys / optional tape ids); band edge list + membership rule; Tier A/B observables; architecture mode flag (`shared_base_four_gamma` | `per_seat_home_fibres` | E08 four-feature family | experimental); forward map to \((\theta,\phi,\gamma)\) / fibre samples; inverse notes; stereographic distortion limits; `map_content_hash`; attestation block. Bind every rendered frame to `(feature_set_id, freeze_hash, angle_map_id)`. Incomparable maps marked `INCOMPARABLE`.

### 6.3 Translator (pure function)

Freeze (+ optional attested tape features) → fibre coordinates. Unit-tested; ledgered inputs/outputs; UNKNOWN badges where data absent; no HTML-side remap. Reuse workshop geometry interface (`fibre(theta, phi, samples)`, explore sliders)—put market meaning **upstream** of those params (Round-2 Q7).

### 6.4 PLV + surrogates (Q4 protocol)

- Compute phase series per band / seat under the locked map.  
- \(C =\) mean pairwise PLV (classical).  
- Surrogates: CTRL-P (phase shuffle), CTRL-L (band-label shuffle), CTRL-S (seat shuffle), CTRL-N (natural-clock negative pair).  
- Conjunction: beat pre-registered nulls; amplitude / band-overlap MSC as **negative control** (should stay high when phase structure is destroyed).  
- Ban topology invariants as \(C\).

### 6.5 Braid vs flat (Q5)

Within-subjects (or automated probe) comparison on identical CSV / freeze corpus: flat multi-panel twin vs Hopf braid scrub. Lanes A→B→C locked. Pre-register tasks T1–T5 class; primary metrics accuracy / time-to-insight / discovery rate; phantom false-alarm non-inferiority; motion/novelty ablation. Demote on failure.

### 6.6 Dual Self8 / Tribe4 (Q3)

Present Tribe(4) as default social stage; keep Self(8) drill-down recoverable. Namespace wellness IDs ≠ agent IDs ≠ `ScaleLayerId`. Ablation arm only under dual gates (legibility↑ ∧ predictive NI ∧ pedagogical NI); residuals diagnostic; viz-off scoring.

### 6.7 Non-financial nested-clock fixtures (H10)

Build attested fixture pack under the **same** `fibre-map` schema (lunar↔day, etc.). Run Q4 CTRL-N and Q5 Lane A before any BTC beauty screenshot. Pass = instrument hygiene; not market ontology.

### 6.8 Ablation / architecture forks

- Octave nest vs trader alt (**P4**)—version separately; edge-scramble falsifier.  
- Shared+γ vs E08 four-feature vs base-\(S^2\) agent grammar (**P2**)—separate map families; Q4/Q6 falsifiers.  
- Mid-return vs arrival head-to-head when tape exists (**P1**).

### 6.9 Non-goals

Live trading; order routing; wallet touch; auto-publish of “signals”; merging Hopf workshop into CLC prod without Paul attest; silent Mode-0 pretence that tape already exists.

---

## 7. Hopf workshop capability vs required extensions

**Motto:** *Python is normative. HTML is a view. Topology does not authorize.* (`hopf-workshop/README.md`)

### 7.1 Can render today (aggregate from Round-2)

| Capability | Files (cited across blind2) |
|---|---|
| Normative S³ state, Hopf map, stereographic, fibre sampling | `hopf_model.py`, `hopf.js` |
| Linking, holonomy, Chern numerical checks (teaching chrome) | same + `workshop.html` |
| θ / φ / γ sliders; explore ≠ protocol consent | `workshop.html` |
| Four-seat rehearsal Maya/Finn/Bea/Sam; PLAY→COORDINATE→ACT; ready ≠ consent | `weopoly_hopf.py` |
| Tetra constitution solid + intention beads (people ≠ fibres) | `visualizer_geometry.js` |
| Protocol history cursor / event replay | `visualizer.js`, `visualizer_ui.js` |
| Cycle layer scrub C9/W1–W4 (never writes protocol \(z\)) | `cycle.js` |
| Abacus 3D: HOME tetra fibres + GOAL; beads with status γ | `abacus_engine.js`, `abacus_model.js` |
| Decorative Clifford-8 sampling (not wellness API) | `workshop.html` |
| JS↔Python parity pattern | `test_parity.py` / `test_parity.js` |
| Versioned proposal/consent/review stamps | `hopf_model.py` |

**Parameters already accepted (reuse):** `theta`, `phi`, `gamma`; `fibre(..., samples)`; participants / PLAYERS; consent / ready / commit / withdraw / repair; proposal version; agreement status; seatIndex; HOME/GOAL; camera yaw/pitch/scale; cycle scrub layer index.

### 7.2 Cannot render today (research gaps)

| Gap | Blocks |
|---|---|
| No freeze / candle / residual / tape ingest | Q1–Q2, Q5–Q7 |
| No `fibre-map-vN` translator or mode flag | All |
| No clock-time band edges / packing UI | Q2 |
| No \(C\) (PLV) readout or surrogate histogram panels | Q4–Q5 |
| No side-by-side flat twin + braid scrub on same index | Q5 |
| No Self(8)/Tribe(4) dual-lens switch as load-bearing map | Q3 |
| No ablation / residual-skill harness | Q3 |
| No nested-clock fixture pack | Q1–Q5 |
| Protocol history ≠ market freeze braid | Q5 |
| Linking/Chern chrome invites misread as “coherence” | Q4 |

### 7.3 Changes needed (research description only — do not implement)

1. Ledgered `fibre-map-vN` (+ optional modes / dual layers).  
2. Pure freeze→angles translator; UNKNOWN badges.  
3. Band-edge captions; braid tape object; flat twin; \(C\) + controls strip.  
4. Non-financial fixture path attested under same schema before BTC.  
5. UI copy: linking ≠ coherence; people ≠ fibres; 8 ≠ 4 seats; topology does not authorize.

Bridge adapters would live **beside** both repos; neither product is rebuilt from this proposal.

---

## 8. Risks / ethics / governance

### 8.1 Scientific risks

1. **Construction artefacts** — shared bandpass + Hilbert → spurious PLV; mandatory IAAFT / shift / CTRL-P/L nulls.  
2. **Sampling honesty gap** — freeze-only fibres look like “waves” while discarding arrival spectrum (E12e ↔ Q1 / **P1**).  
3. **Ontology smuggling** — QI entanglement, Haramein vacuum, AREXA-style indicator stacks silently redefining angles (E11), lore 8→4 as measurement.  
4. **Architecture conflation** — plotting E08 four-angles, Q6-B offsets, and base-\(S^2\) agents in one canvas without map ids (**P2**).  
5. **Sub-minute / intensity hallucination** from candles.  
6. **Ablation cherry-picking** of 8→4 maps.  
7. **HCI confounds** — animation salience, order effects in braid studies.  
8. **Silent remap** under feature bumps.  
9. **UNATTESTED drift** — designed protocols mistaken for completed positive results.  
10. **Workshop chrome misread** — linking/Chern sold as coherence.

### 8.2 Ethics / governance (binding if this proposal is attested as standing research intent)

| Rule | Binding |
|---|---|
| Research only | This proposal does not authorize code change |
| No trading / Mode-0 | Collective remains measurement; visualizer does not place orders |
| No git commit / push / merge / deploy from this draft | Standing posture |
| Topology does not authorize | Hopf workshop + E08 motto |
| Geometry records; does not decide | E08 |
| Agents do not ratify | Prism drafts; **Paul attests** |
| Claim grades | `SUPPORTED` \| `CONTRADICTED` \| `UNKNOWN` \| `NOT_TESTED` \| `ASSUMED` |
| Freeze exclusions | E01: no tape / no WS / no true OFI / no funding·OI load-bearing — mark UNKNOWN, do not impute |
| Frequency correction | E12e: arrivals > price-tone; honor via research upgrade + labels |
| Lore limit | E09 8→4 / Cloud Nine = story geometry; do not fix sampling |
| Map versioning | Feature→angle / fibre-map changes need ledger entry + Paul attest |
| Material Impact | Feature→angle lock, tape ingest design, any deploy — exact Paul attest required |
| Loving-parent honesty | Name alive crooked marks; name mush; do not pretend either is the other |

**Standing honesty:** prettier geometry does not erase a losing ledger. The system currently measures its own council losing to a dumb baseline—and is required to write that truth in ink.

---

## 9. Deliverables + success criteria

### 9.1 Deliverables (research artifacts; attestation-gated before any beauty claim)

| ID | Deliverable | Success criterion |
|---|---|---|
| D1 | This doctoral proposal + standing Round-2 synthesis | Paul attests, amends, or rejects |
| D2 | `fibre-map-v0` document (freeze-available two-tier + chosen band menu) | Triple-bind fields complete; UNKNOWN policy; inverse notes; no silent HTML path |
| D3 | Non-financial nested-clock fixture pack + pilot map | Q4 CTRL-N / Lane A evaluable under same schema |
| D4 | Q4 analysis protocol (PLV + ban list + CTRL-P/L/S/N) | Pre-registered \(N,\alpha\); runnable on fixtures |
| D5 | Q5 eval protocol (lanes A→B→C, flat twin, tasks, δ thresholds) | Pre-registered before looking at results |
| D6 | Dual Self8/Tribe4 presentation spec + Q3 ablation plan | Namespaced IDs; dual gates written |
| D7 | Workshop gap matrix (this §7) maintained | Can/cannot/params/changes stay file-cited |
| D8 | Optional research-lane tape design note | Only if Paul scopes **P5**; still Mode 0; labeled |
| D9 | Head-to-head P1/P2/P4 branch reports | Versioned map families; falsifiers run or marked `NOT_TESTED` |

### 9.2 Global success / fail

**Success (research program):** interference language survives Q4 surrogates on non-financial fixtures; braid beats flat twin on pre-registered Lane A/B tasks; BTC lane C uses only hash-bound freeze features with honest UNKNOWN; maps bump with attestation; no trading path opens.

**Fail / demote:** \(C\) inside null cloud; braid ≤ flat on primaries or worse false-alarm rate; tape imputed; lore treated as sampling theorem; linking used as \(C\); silent remap; any execution endpoint touched → program halt and ledger contradiction entry.

**Non-success that is still valuable:** honest demotion of braid to aesthetic while retaining Mode-0 freeze discipline and workshop teaching geometry.

---

## 10. Open fights Paul must decide

These are **preserved productive disagreements**. Do not collapse them in synthesis; only Paul (or named attested experts) resolves.

### P1 — Mid-return (Mode-0 Tier A) vs event-arrival (E12e)

Round-2 softens into tiers without resolving physics: operational freeze path ≠ frequency-model truth. **Decide:** (a) accept two-tier Mode-0 pair with E12e upgrade path and mandatory incomplete labels; (b) tape research-lane first; (c) mandatory dual-map versioning with UNKNOWN tags on intensity. Resolution aid: run Q1 arrival-vs-mid head-to-head on an attested tape window when available.

### P2 — Architecture family for v1

Three coordinate grammars remain: (i) Round-2 `shared_base_four_gamma`; (ii) E08 four-feature→four-angle (price, spread, volume momentum, cross-venue); (iii) Round-1 leftover market-φ-on-fibre + agents-on-base-\(S^2\). **Decide:** which is default `fibre-map` family for v1; keep others as labeled experimental branches with Q4/Q6 falsifiers. Never blend unlabeled.

### P4 — Band menu default

Octave-ish candle-native nest `{0,1,4,16,64}` (Garden rhyme) vs trader-familiar `{0,1,5,15,60}` (Round-1 familiarity). Both shared + partitioned. **Decide:** attest one default; other exploratory (`fibre-map-v0` vs `v0-alt`). Edge-scramble falsifier decides keep.

### Tape scope (P5 / Round-1 U4)

E01 fence (no tape load-bearing) vs E10/E12e desire for research-lane arrivals (+ funding/OI as *context*, never settlement). Round-2 unanimous: optional, labeled, Mode 0, no execution—still needs Paul’s explicit scope decision.

### Also require Paul attention (from Round-2 list)

- Attest or amend Round-2 synthesis and this proposal as standing records.  
- **P3:** attest dual-chart + lore-as-naming; require Q3 gates before any “8→4 improves teaching” claim.  
- Adopt hardened gates: Q4 PLV+ban-list, Q5 A→B→C, Q7 triple-bind, non-financial pilot before BTC beauty.  
- Who may run falsifiers (Paul only / named experts / draft Prism follow-ups).  
- **No action:** do not merge into BTC repo, hopf-workshop, or product until named path + attest.

---

## 11. References / source file index

### 11.1 Primary corpus (this proposal synthesizes; does not invent beyond)

| Path | Role |
|---|---|
| `prism-context/btc-learning-collective-walkthrough/RESEARCH_PACKET_HOPF_COLLECTIVE_BRIDGE_UNATTESTED.md` | Freeze→Fibre packet + Q1–Q7 starters |
| `prism-context/btc-learning-collective-walkthrough/DELIBERATION_SYNTHESIS_UNATTESTED.md` | Round-1 Phase-2 synthesis |
| `prism-context/btc-learning-collective-walkthrough/DELIBERATION_SYNTHESIS_ROUND2_UNATTESTED.md` | Round-2 Phase-2 synthesis (stance backbone) |
| `prism-context/btc-learning-collective-walkthrough/ANSWER_LEDGER_UNATTESTED.md` | E01, E08, E09, E12 (placeholder), E12e |
| `prism-context/btc-learning-collective-walkthrough/ROUND2_SHARED_CONTEXT_FOR_BLIND_AGENTS.md` | Nested scales; worldview agents; non-financial first; loving-parent; Hopf read list |
| `prism-context/btc-learning-collective-walkthrough/blind2/Q1.md` … `Q7.md` | Round-2 independent blind answers (headers/recommendations skimmed) |
| `prism-context/BTC_SNAPSHOT_FREEZE_RESEARCH_2026-09-19.md` | Step-1 freeze research (code-anchored) |

### 11.2 Related walkthrough artifacts (optional / cited by corpus)

| Path | Role |
|---|---|
| `blind/Q1.md` … `Q7.md` | Round-1 blinds (shift detection in Round-2 synthesis) |
| `E12_THREE_LENSES_HYPERSPHERE_2026-09-19_UNATTESTED.md` | E12 family lens notes |
| `X_SIGNAL_SCAN_2026-09-19_UNATTESTED.md` | E10 discourse source (optional) |
| `README.md` | Walkthrough index |

### 11.3 External repos referenced by ledger / Round-2 (read-only; no edits)

| Path | Role |
|---|---|
| `/workspace/roman-bridge-worktrees/hopf-workshop/` | Classical Hopf visualizer + consent workshop |
| `hopf-workshop/README.md` | Motto: Python normative; HTML view; topology does not authorize |
| `hopf_model.py`, `hopf.js`, `visualizer*.js`, `workshop.html`, `abacus_engine.js`, `cycle.js`, `weopoly_hopf.py` | Capability grounding |
| `/workspace/roman-bridge-worktrees/fractal-block/GAME_DESIGN.md`, `ObservatoryGarden.ts` | Scale pedagogy |
| `/workspace/roman-bridge-worktrees/interfractal/docs/world-bible/04-DIM-GARDEN.md` | Garden room |
| `/workspace/roman-bridge-worktrees/interfractal/docs/architecture/DESCENT_COSMOLOGY_PLAN.md` | Self 8 / Tribe 4 locks |
| BTC CLC product paths named in E01 / freeze research | Freeze implementation anchors (no edits from this proposal) |

### 11.4 Packet-level claims (summary grades)

| Claim | Grade |
|---|---|
| Proposal is visualization + measurement research, not trading | `SUPPORTED` by §8 |
| Freeze is Coinbase L1 + candles hashed; excludes tape/funding/OI as load-bearing | `SUPPORTED` by E01 + freeze research |
| Frequency content ≈ event arrivals more than mid-price tone | `SUPPORTED` by E12e judgment |
| Mode-0 two-tier mid-return + residual is freeze-available prototype pair | `ASSUMED` Round-2; incomplete vs E12e by design |
| Math-physics lens ranks first for interference language | `ASSUMED` / judgment — `NOT_TESTED` as unique optimum |
| QI and holographic lenses are not market ontology | `SUPPORTED` as methodological rule in E12e |
| Bridge mappings are chosen embeddings | `SUPPORTED` by E08 + geometer lens |
| Garden 8→4 / Cloud Nine fix sampling | `CONTRADICTED` by E12e |
| Q1–Q7 Round-2 stances are complete expert locks | `NOT_TESTED` — provisional research design only |
| Braid outperforms flat; PLV beats surrogates on BTC freezes | `NOT_TESTED` |

---

*End of UNATTESTED doctoral research proposal. No git commit or push performed. No trading. No code edits to product repos. Agents do not ratify. Topology does not authorize.*
