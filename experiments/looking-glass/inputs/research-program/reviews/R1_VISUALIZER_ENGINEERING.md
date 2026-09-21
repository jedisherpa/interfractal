# R1 — Visualizer HCI and software/evidence engineering

**Date:** 2026-09-19. **Status:** independent AI-generated analysis; no external expert endorsement. **Remit:** make participants’ relationships, changes, coordinated capabilities, and outward commitments inspectable without confusing a rendering with evidence.

This pass read the shared brief and pinned repository sources. It did not read other R1 memos, execute applications or tests, inspect deployed behavior, recruit people, or change repositories. Full source snapshots with Git blob identifiers are retained in `evidence/engineering/MANIFEST.json`; review was selective, not a security audit.

## Seven findings

**1. FACT — useful implementation pieces already exist, but they are different models.** Hopf Workshop supplies mathematical functions, a bounded agreement simulation, pure visualizer projections, inspectors, history selection, and separate 2D-overlay/3D-rendering assets. `projectParade` exposes proposal version, active agreement, individual responses, reviews, consequences, events, and source revision; UI code supplies selectable participant/event buttons and preserves focus [S1–S3]. This is a credible starting point for inspectable state. LensForge supplies authored responses, cross-response assignments, model synthesis, and a combined feed [S4–S5]. WeOpoly supplies allocations, commitments, needs matching, advice, decisions, dependencies, outcomes, and repair [S7].

Reuse these ideas through explicit adapters. Do not call them one interchangeable “convergence engine.” Hopf’s permission simulation, LensForge’s interpretive synthesis, and WeOpoly’s task rules answer different questions. The study instrument must include coordination and outcome evidence alongside agreement; otherwise the research quietly becomes only an approval-interface evaluation.

**2. FACT — the round-two omission is verified at source level.** At LensForge commit `2035a0a7bd96f930e8cb6ea61068bd202c2b08b1`, `deliberation_next` fetches round one and constructs `formattedResponses` from those records. Both structured clash and synthesis receive that array. Separately, `buildDeliberationFeed` fetches and returns both rounds [S4]. Thus the inspected synthesis path does not consume round-two responses, although the feed exposes them. This is not a demonstrated production incident or a claim about every possible route.

Round-two assignment asks people to respond to another participant’s strongest point and disagreement while maintaining their lens. Excluding those responses can exclude exactly the revision or coordination that the research seeks. First proof obligation: instrument the actual synthesis input manifest and show that every included/excluded statement is traceable. A synthetic fixture should contain a decisive round-two correction; the expected result is that the correction is available to synthesis and distinguishable from the earlier position, not a predetermined model conclusion.

**3. FACT — “endorsers” are currently a generated field in the inspected synthesis path.** LensForge’s model-facing schema includes an optional array of endorsers; the prompt requests endorsing avatars. The provided `ResponseEntry` contains avatar name, epistemology, and content, without statement IDs or explicit endorsement events [S5]. An avatar named by a model is therefore an attribution hypothesis, not a human attestation. This does not establish that every other application surface lacks endorsement.

A research adapter should preserve the original artifact while labeling these names “model-attributed alignment.” Human endorsement must be a separate act targeting exact wording and purpose. “This summary represents my position,” “I support trying this,” and “I can commit these resources” require different records. A person can accurately endorse a description of a disagreement without endorsing either proposed action.

**4. FACT — the abacus contains synthetic embeddings with psychologically suggestive labels.** In Hopf Workshop’s `abacus_model.js`, `hashedProjection` maps low-byte character values into eight bins with alternating signs. `memoryContribution` projects text into fields including emotional state. `projectPersonLevel` combines hashes of participant ID, level, and proposal with chosen effects for response status, “heat,” reviews, and holonomy. Thresholds subsequently produce named conflict statements [S6]. These are deterministic generative display rules, not semantic embeddings trained against participant meaning and not measurements of feelings or observed disagreement.

Keep the existing working toy as a labeled generative sketch. For research, either omit those inferred attributes or expose them in a separate “derived display” layer with inputs, mapping version, parameters, and correction/dispute controls. Never silently populate self-report fields from them. The document’s discussion of an embedding-similarity gate does not validate these hashes or identify it with the Hopf map [S8]. Mapping validity is unresolved.

**5. FACT / USER INTENT — current cardinalities constrain some implementations, not the theory.** The overlay assigns home positions by seat index modulo four. The abacus checks the first four marks, aggregates participant vectors using fixed weight 0.25, and uses a minimum of three current-version Yes responses plus no live No for its commit rule [S3,S6]. The Python Workshop instead checks all named participants. These are distinct prototype policies. WeOpoly’s pinned `goalStatus` requires four occupied slots, four distinct people, and matched needs; its own comment labels this a playtest rule [S7].

Retain four as one illustrative condition. Compare 3, 4, 5, and 12, with arbitrary roster support in the canonical model. Retain eight aspects and twelve prescribed lenses as versioned candidate vocabularies; neither defines the person or a universal ontology. LensForge’s pack contains twelve lenses in four families, and its assignment functions draw from that finite pack. WeOpoly explicitly supports self-authored lenses and multiple lenses per person. These framing conditions must be distinguishable rather than normalized away.

**6. DESIGN — offer coordinated views over one evidence record.** The minimum view set is below. Geometry is optional; legibility and recoverability are mandatory.

| View | What it makes inspectable |
|---|---|
| Plain baseline | Participant, exact statement/version, response target, proposed work, evidence, uncertainty, explicit endorsement, and pending correction in readable rows/cards. |
| Internal relationships | Typed, selectable links for task dependence, advice, support, reported affinity, and competing interpretations. Network/matrix toggle; missing relationships stay unknown. |
| Temporal trajectory | Event order, proposal diffs, attribution changes, commitments, outcomes, repair, and persistence across episodes. Time is not a spatial or organizational “level.” |
| Next-scale interface | A collective’s outward offer, scope, representative, resource limits, dependencies, revision rule, and evidence for its capability; drill down to internal differences and dissent. |
| Reference / influence / authority | Separate layers for a shared question/document, reported or observed uptake, and recognized decision rights. A centered reference object carries no implied leadership. |

Influence should initially mean an observable sequence or participant-attributed effect, with provenance, not causal power inferred from centrality. Authority records name who granted what scope, to whom, for which version and period; legitimate leadership can be displayed. Neither centralized nor distributed arrangements receive an automatic quality bonus.

**7. HYPOTHESIS — geometry may aid understanding, but it can also manufacture apparent convergence.** The strongest counterexample is a capable complementary team whose members retain incompatible theories yet coordinate reliable handoffs. Their points may be distant while their joint performance is strong. Conversely, identical positions and unanimous endorsements can coexist with missing skills, broken dependencies, or unperformed work. No center, cluster, closed shape, or smooth orbit separates these cases by itself.

Build counterexamples into the demonstration: (a) two opposite factions average to the same center as a uniformly moderate group; (b) a highly connected adviser has no delegated authority, while an off-center steward has a narrow valid mandate; (c) identical outward promises hide different internal obligations; (d) rotating a camera causes visual overlap without changing evidence; (e) changing a participant identifier changes the current hash-derived coordinates despite unchanged contribution. Show the evidence panel beside each picture. A warning sentence alone is insufficient if the visual still teaches the wrong relation.

## Canonical record and minimal vertical slice

**DESIGN — append-only research events, typed claims, replaceable projections.** Use stable opaque IDs, not display names parsed from prose. This improves on the existing visualizer’s extraction of withdrawal actors and versions from event detail [S2].

| Record | Required fields |
|---|---|
| Event envelope | `event_id, schema_version, session_id, actor_id, actor_kind, event_type, occurred_at, recorded_at, causal_parents, idempotency_key`; source, visibility, and evidence status. |
| Human statement | Verbatim text, author, language, statement ID/version, context/question, response target, optional chosen lens ID/version, superseded statement; author correction is a new event. |
| Model artifact | Artifact ID/version, exact input statement versions, excluded inputs/reasons, prompt/model/configuration identifiers, raw output, derived claims, source links, parse status, uncertainty status. |
| Human attestation | Human actor, exact target ID/version/hash, stance, attestation purpose, conditions, scope, effective/expiry times, withdrawal/supersession reference. Agents cannot originate human attestations. |
| Coordination/outcome | Work owner and acceptance, capability claim, dependency, resources/effort, action, observed or self-reported outcome, evidence source, observer, unresolved contradiction. |
| Collective interface | Group membership revision, outward expression version, representative mandate, internal statement references, exceptions, resource bounds, recipient feedback. |
| Projection specification | Projection ID/version, source event boundary, axes and meanings, mapping method, normalization, missing-data rule, weights, seed, layout/camera, known information loss. |

Store statements, model interpretations, human attestations, and projections separately. “Unknown,” “not asked,” “disputed,” and “withdrawn” must not collapse into zero or No. Preserve earlier versions while showing which are current. A replay is read-only. Private content may require scoped access or a visible withheld-source marker; “recoverable differences” does not mean unrestricted disclosure. Projection histories need not be identical to event histories.

The smallest useful vertical slice is one bounded coordination episode: three to five self-authored participants state a situation; each responds to another statement; a draft synthesis cites both rounds; each person corrects their representation and records any endorsement; the group describes one shared outward offer and distinct work responsibilities; a receiving group returns one constraint; the originating group revises its offer and records the resulting internal change. End with a claimed or observed outcome, not merely a closed polygon.

Use a static imported or synthetic event fixture first. Implement a deterministic reducer and one read model feeding the plain baseline, 2D relationship view, and timeline. Add a collapsible outward-interface card and optional existing geometry adapter after those work. No live LLM is required to prove provenance preservation; fixed, visibly synthetic model outputs make omission and mistaken-attribution cases reproducible. Later model runs must save their actual input/output manifests.

Instrument view selection, evidence drill-down, corrected attribution, version confusion, mistaken authority inference, missing-difference retrieval, and task answers. These interaction logs are study observations, not measures of consciousness or emergent capability.

## First study, prerequisites, and gates

**DESIGN — begin with representational falsification, then comprehension.** First create a counterexample corpus with expected answers and source event traces. Replay each fixture in every view; verify identical substantive information, intact minority statements, exact-version attestations, and unchanged permissions under layout changes. Include 3/4/5/12-person fixtures, missing data, conflicting testimony, withdrawal, new proposal versions, and externally prompted revision. This is an engineering check, not empirical validation.

Next prepare, without launching recruitment, a counterbalanced comparison of the plain baseline and 2D view; add optional 3D as a separate condition only when its interaction and information costs can be controlled. Ask users to identify the current proposal, explain the disagreement, find the dependency blocking action, distinguish influence from authority, reconstruct a revision, and say what an outward promise actually commits. Measure correctness, time, explanation quality, and unsupported inferences. Accessibility and reading burden are part of usability, not afterthoughts.

Advance only when the instrument preserves provenance and every plotted property has an inspectable meaning. Stop or redesign if a display creates repeated false agreement/authority inferences, omits round-two corrections, hides internal differences, or gives geometry users different evidence from baseline users. Predeclare the minimum accuracy and improvement criteria before a participant study; do not choose them after seeing results.

A later capability study needs repeated joint tasks, a credible individual or nominal-group comparison, outcome evidence, and persistence/repair under changed conditions. Successful comprehension would justify further study of the visualizer, not prove collective emergence. Prerequisites include a frozen research question, task/outcome definitions, governance and access rules, independent scoring, and review of the actual instrument. No study has been run here.

## Source register and remaining uncertainty

All sources below were successfully fetched through the GitHub connector on 2026-09-19. All findings are static-source findings; deployment correspondence, runtime reachability, authentication guarantees, and current branch changes remain unverified.

- **S1:** [Hopf mathematical/protocol model](https://github.com/jedisherpa/hopf-workshop/blob/2967f71aa19117925f55b9349a7bfc0ec8fc8dea/hopf_model.py), functions `hopf`, `apply`, `Workshop.blockers`; exact geometry separated from simulated permission.
- **S2:** [Visualizer projection](https://github.com/jedisherpa/hopf-workshop/blob/2967f71aa19117925f55b9349a7bfc0ec8fc8dea/visualizer.js), lines 15–65, 159–239; [UI](https://github.com/jedisherpa/hopf-workshop/blob/2967f71aa19117925f55b9349a7bfc0ec8fc8dea/visualizer_ui.js), participant/event selection and history controls.
- **S3:** [Geometry overlay](https://github.com/jedisherpa/hopf-workshop/blob/2967f71aa19117925f55b9349a7bfc0ec8fc8dea/visualizer_geometry.js), lines 109–149; [3D renderer](https://github.com/jedisherpa/hopf-workshop/blob/2967f71aa19117925f55b9349a7bfc0ec8fc8dea/abacus_engine.js), imports and seat geometry.
- **S4:** [Orchestration](https://github.com/jedisherpa/lensforge-app/blob/2035a0a7bd96f930e8cb6ea61068bd202c2b08b1/engine/src/game/orchestrationService.ts), lines 214–228, 270–274, 315–322, 388–404; [round-two assignment](https://github.com/jedisherpa/lensforge-app/blob/2035a0a7bd96f930e8cb6ea61068bd202c2b08b1/engine/src/game/round2Assignment.ts).
- **S5:** [LLM service](https://github.com/jedisherpa/lensforge-app/blob/2035a0a7bd96f930e8cb6ea61068bd202c2b08b1/engine/src/llm/service.ts), lines 12–39 and 362–438; [lens pack](https://github.com/jedisherpa/lensforge-app/blob/2035a0a7bd96f930e8cb6ea61068bd202c2b08b1/lens-packs/hands-of-the-void.json), declared taxonomy.
- **S6:** [Abacus model](https://github.com/jedisherpa/hopf-workshop/blob/2967f71aa19117925f55b9349a7bfc0ec8fc8dea/abacus_model.js), blob `889cc7aa517cc02e4be0efc84827cb79b765dd4b`: lines 88–98 hash; 234–249 memory/emotion; 520–528 labels; 636–701 four-point/projection/aggregation; 733–790 conflict; 855–899 eight vocabulary and three-Yes policy.
- **S7:** [WeOpoly domain](https://github.com/jedisherpa/weopoly/blob/756fe8fbd032816c2fa18138e1e8ad36e9557cc2/lib/domain.ts), lines 35–43 capacity versus effort, 89–117 needs/coherence; [game rules](https://github.com/jedisherpa/weopoly/blob/756fe8fbd032816c2fa18138e1e8ad36e9557cc2/docs/GAME_RULES.md). Branch `grok/weopoly-learning-community-v1` resolved to this commit during review.
- **S8:** [Intention Abacus design](https://github.com/jedisherpa/hopf-workshop/blob/2967f71aa19117925f55b9349a7bfc0ec8fc8dea/docs/INTENTION_ABACUS.md), lines 132, 163–206, 300–327; design intentions and analogy limits, not implementation or empirical validation.

Open questions include what participants themselves want spatial distance to mean, whether a group’s outward capability can be described without hiding dependencies, which disagreements matter to performance, and whether the optional geometry improves inference enough to justify navigation cost. These require participant interpretation and measured tasks; source inspection cannot settle them.

