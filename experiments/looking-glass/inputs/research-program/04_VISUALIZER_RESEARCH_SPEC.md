# Visualizer research specification

**Current framing, v0.3:** [Shared-meaning amendment](07_SHARED_MEANING_AMENDMENT.md) is the new starting point for future work. The additions are a planning revision and have not received the independent review recorded for v0.2; earlier reports and results remain historical evidence.

The amendment adds a proposed language view and snapshot provenance fields. Interfractal was subsequently observed with a WebGL rendering limitation and inspected at a pinned source commit; that limited observation does not verify full deployed behavior or deployment/source identity. The older source-audit statement below refers to the v0.2 baseline.

Status: implementation brief v0.2 after challenge review. No production repository changes were made in this research pass. Existing source was inspected at pinned revisions; neither deployment correspondence nor runtime behavior was tested.

## Purpose and boundary

The visualizer should help people inspect how distinct contributions become useful together, how that capability changes, who may speak or act for it, and what another group can rely on. It must also reveal when the evidence does **not** support a coherent outward claim. An attractive shape is a candidate representation, never its own evidence of agreement, competence, authority or consciousness.

The user's sketches remain productive design hypotheses. A polygon can depict a relational snapshot; a trajectory can depict changing participation around a reference; a point can be a compact interface to a group at another scale. These are different representations of specified relations. Their sequence does not establish a natural law of social dimensional ascent.

## Source-grounded starting point

| Component and pinned revision | Available foundation | Required research adaptation |
|---|---|---|
| Hopf Workshop, `2967f71aa19117925f55b9349a7bfc0ec8fc8dea` | Agreement/version history, inspectors, projections and geometry | Separate the mathematical toy, permission policies and measured observations; arbitrary rosters; stable IDs; inspectable mappings |
| LensForge, `2035a0a7bd96f930e8cb6ea61068bd202c2b08b1` | Two response rounds, assigned lenses, synthesis and feed | Include traceable round-two inputs; label generated endorsers as model attribution; distinct human attestations |
| WeOpoly, `756fe8fbd032816c2fa18138e1e8ad36e9557cc2` | Needs, resources, commitments, dependencies and repair | Treat four distinct people/four slots as a playtest rule; preserve capacity/effort distinction |

Evidence and exact links: `reviews/R1_VISUALIZER_ENGINEERING.md`; 16 source snapshots and their hashes: `evidence/engineering/MANIFEST.json`. Findings apply to these inspected paths and revisions. They are not claims about all branches or deployed applications.

Three corrections precede research use. First, the inspected LensForge synthesis path uses round-one formatted responses while the feed also exposes round two. Record actual synthesis inputs and repair this path before studying synthesis of revisions. Second, model-generated names in `endorsers` are not human attestations. Third, the abacus's text/identity hash projections and chosen weights do not measure emotion or semantic conflict. Keep those outputs in a clearly separate synthetic demonstration or remove them from the research condition. A disclaimer alone does not fix a misleading interactive display.

## One evidence record, several views

| View | Research question it supports | Required inspection |
|---|---|---|
| Plain workspace B | What was said, proposed, done or changed? | Exact statements, versions, typed relationship lists, timeline, source links, corrections and attestation controls |
| Relationship view in C | Which contributions depend on, support or challenge others? | Edge type, direction where meaningful, source and missing information; network/matrix toggle |
| Temporal view in C | Does coordination persist and recover? | Event order, changes, failed handoffs, outcomes, revision and repair |
| Outward collective interface | What can another group rely on? | Capability claim, evidence, dependencies, resource bounds, representative mandate, exceptions and drill-down |
| Reference/influence/authority layers | What is shared, whose contribution matters, and who can decide? | Separate reference objects, observed or reported uptake, and explicit scoped authority records |
| Optional geometric laboratory | Does a particular mapping improve a particular inference? | Mapping version, axes, information loss, projection/camera, uncertainty and comparison to plain evidence |

The initial comparison is B versus B with coordinated visual views available (C). Both expose the same substantive information and operations. C may change navigation and attention; the first study estimates its practical incremental effect. A tightly matched rendering-only study is a different, later experiment. Do not equate fewer clicks with better collective capability.

## Geometry contract

Every visible property needs an operational meaning or a visible declaration that it is layout only.

| Element | Permissible initial meaning | Unsupported inference to prevent |
|---|---|---|
| Point | Participant, statement, state or compact group interface, with type shown | An indivisible self or erased internal diversity |
| Edge | A specified reported/observed relation with provenance | Universal affinity from proximity |
| Joint relation | A documented dependency among three or more parts | Every subset must have the same relation |
| Center | A named question, purpose, artifact or declared reference | The leader, the mean opinion or legitimate authority by default |
| Distance | A declared metric on particular inputs, or layout spacing | Psychological distance from a hash or arbitrary placement |
| Loop/spiral | Recorded recurrence or a declared illustrative motion | Capability or durable stability from animation alone |
| Sphere | A layout surface or measured normalized orientation/state space, explicitly distinguished | A necessary stage in group development |
| Torus | Two separately motivated cyclic coordinates, or labeled analogy | A sphere produced by rotating a flat group; proof of social coherence |
| Polyhedron | A chosen layout or specified adjacency/incidence structure, with face meanings declared | Participant count determining governance or human dimensionality |
| Color, size and opacity | Explicit, redundant encodings with text alternatives | Worth, authority, truth or missing-as-zero |

A mathematical circle, sphere and torus have distinct structures. The Hopf map from the 3-sphere to the 2-sphere has circle fibers; that fact does not identify a social system with those spaces. A tetrahedron is a polyhedron; a square is a polygon, and a cube is a polyhedron. A cuboctahedron has square and triangular faces. Use whichever analogy serves a defined inspection task; change it when the task/evidence warrants, recording the reason. Do not make geometry the gatekeeper of legitimate participation.

Two toroidal phase coordinates can be coupled; “separately motivated” does not mean statistically independent. Phase locking may restrict the observed trajectory to a circle. Faces must say whether they are layout surfaces, joint interactions or mathematical cells. Three pairwise edges do not establish a joint interaction, and not every hypergraph has the intended polyhedral realization. Preserve these choices in projection metadata and inspectors.

## Canonical data contract

Use stable opaque IDs rather than names parsed from prose. Append revisions so earlier interpretations remain inspectable subject to retention and access rules. The following is a design contract, not a delivered database implementation.

| Record | Minimum content |
|---|---|
| Event envelope | ID, schema version, session, actor ID/type, event type, occurrence/recording times, causal parents, idempotency key, source, access scope, evidence status |
| Human statement | Exact text, author, language, context, statement ID/version, reply target, optional chosen lens/version, superseded statement |
| Model artifact | Artifact/version, exact included input versions, excluded input/reasons, model/prompt/config identifiers, raw output, parsed claims, sources, parse/uncertainty status |
| Human attestation | Human actor, exact target ID/version/hash, purpose and stance, conditions, scope, effective/expiry times, withdrawal/supersession |
| Coordination/outcome | Work owner/acceptance, claimed capacity, dependencies, effort/resources, action, result, observer/source, unresolved contradiction |
| Collective interface | Membership revision, outward offer/version, mandate, underlying records, limits, exceptions, receiving-group feedback |
| Projection | Mapping/version, source event boundary, inputs/axes, method, weights, normalization, missing-data rule, seed, layout/camera, known loss |

“Represents my position,” “support trying,” and “commit my resources” are different attestation purposes. Model artifacts cannot write human attestations. Unknown, withheld, not asked, disputed, declined and withdrawn are distinct states. A replay is read-only. Corrections must propagate to derived displays without silently rewriting the historical record. Deletion policies may remove protected content while preserving an appropriately scoped tombstone; append-only is not a promise to retain private data forever.

Group summaries are purpose-bound, lossy interfaces. Retain pointers to the relevant internal dependencies and differences; never imply that the original state can be reconstructed from a many-to-one summary alone. Private sources may require authorized inspection or a withheld-source marker rather than public disclosure.

## Minimum implementation slice and order

1. **Canonical event fixture and reducer.** Import synthetic four-person traces including a second-round correction, a changed task constraint, a stale endorsement and an outward request. Define independently inspectable expected states.
2. **Plain workspace.** Readable records, source/version links, correction, human attestation and task response. This is both a usable instrument and the B condition.
3. **Relationship view and timeline.** Read the identical reduced evidence. Add selectable typed relations and changes without inferred feelings or an overall coherence score.
4. **Collective interface.** One outward offer with scope, dependencies, mandate, exception pointers and a receiving group's revision request. Preserve inward and outward change paths.
5. **Instrumentation and replay.** Save versioned exports, missing/error events, retrieval actions and task answers. Interaction logs are behavior observations, not measures of consciousness.
6. **Optional geometry.** Add only after its mapping can be explained and the same questions remain answerable in the plain baseline. Record any extra training/navigation cost.

No live model is needed for this slice. Fixed, labeled synthetic model outputs let a researcher reproduce a mistaken attribution. Later live-model runs must preserve actual input/output manifests and model/config versions. Use adapters rather than merging the three repositories' distinct policies into a single hidden convergence rule.

## Acceptance corpus

| Case | Required result |
|---|---|
| Decisive round-two correction | Input manifest and displayed synthesis sources expose the correction and its relation to the earlier statement |
| Model names an endorser | Display remains an attributed interpretation; no human endorsement or action right is created |
| New proposal version | Old endorsements remain historical; validity is checked against explicit scope/version policy |
| Missing, private, dissenting or withdrawn contribution | Distinct status; none becomes consent, a zero vector or an invisible participant |
| Outside-scope representative | Outward action reports the scope failure regardless of centrality |
| Changed resources | Capability/feasibility is recomputed from the changed evidence, separately from mandate |
| Same summary, different dependency | Inspector identifies what the compact view omitted and when reliance would differ |
| Camera rotation, layout or participant relabeling | Evidence, rights, task scores and substantive source-based claims do not change |
| Opposed factions versus common moderate position | Same centroid does not hide different distributions |
| Source correction | Derivations identify the affected source/version and stale interpretations |
| Overlapping group membership | A person may participate in several groups without duplicate authority or resource commitments |
| 3/4/5/12 rosters | No silent seat collisions, fixed-quarter aggregation or first-four-only logic in the research read model |
| History and accessible fallback | Replay cannot authorize current action; essential evidence/operations are available by keyboard and readable text |

Pass criteria: zero unresolved consequential source, attribution, version or rendering-permission failures in this bounded corpus; source parity across B/C; inspectable plotted meanings; independent review of expected answers. This is a bounded software gate. Human comprehension and practical effectiveness need the later studies.

Record three different acceptance statuses: computational correctness, adequacy of task semantics, and human comprehension/usefulness. A reproducible hash can pass the first while failing the others. Planned fictional erroneous suggestions belong outside the accurate canonical event record; they must not create live human attestations or permissions.

Delivered now: source snapshots, findings, specification, synthetic lantern task and exhaustive answer-key check. Not delivered: adapters/reducer, B/C research application, full corpus execution, runtime audit or human results. The implementation team can begin the ordered slice from this specification after the synthesis review; human enrollment waits for the actual instrument and study-readiness gates.
