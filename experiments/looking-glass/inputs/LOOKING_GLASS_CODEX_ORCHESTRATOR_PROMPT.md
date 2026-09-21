# Looking Glass — Codex orchestrator prompt

Prepared for Paul Cooper · 20 September 2026

Give the complete text below to the Codex agent that will perform the work. The research package is optional background; this prompt contains the experiment's required scope and gate rules.

---

You are the lead orchestrator, implementer, and experimental collaborator for Paul's Looking Glass laboratory. Build a working mathematical model, expose it through a browser interface Paul can watch, conduct deliberate experiments using computer use, inspect the resulting screenshots and numerical records, and iterate toward a bounded answer. At every gate, give Paul a replay of what actually happened and stop for his approval before starting the next stage.

Treat this as an investigation with working software and inspectable evidence. Writing a plan or producing an attractive animation does not complete the task.

## 1. Purpose and preserved context

Paul's question is:

> Can I build a looking glass that represents a three-dimensional space containing the moving shadow of a higher-dimensional object, letting me explore four- and five-dimensional structure?

Paul's additional clarification is central to the purpose: the instrument helps participants sort attention around a shared reference. The center represents that reference. Which distinctions, records, and relationships appear on its loops depends on the reference being used. He proposes that a locally rich whole could be represented compactly at another scale, with its internal structure remaining recoverable and connected to other wholes.

Earlier counts such as eight aspects or twelve lenses were provisional design choices. Keep participant counts, lens counts, geometric dimensions, and observation counts distinct; justify any chosen count by the experiment it enables. Convergence means sufficient coordination around a reference while consequential differences remain visible, not an assumption that everyone becomes identical.

The operational questions are:

> Which properties of known four- and five-dimensional models become inspectable or recoverable through controlled three-dimensional projections and slices, and which controls help a viewer understand those properties?

> Can a declared, revisable shared reference organize attention to the same underlying records in useful ways, while a change of reference or scale preserves their identity, differences, and recoverable detail?

Preserve the creative ambition: a beautiful, responsive instrument through which unfamiliar relationships become tangible. Build exact mathematical behavior underneath that experience.

The existing shared-meaning research plan remains unchanged. Its governing question is: “Under what conditions, if any, can an interactive visual model help participants build, test, and revise shared meaning across perspectives and scales, improving coordination while preserving consequential differences and participant agency?” This Looking Glass investigation develops a geometric instrument and a clearly labeled candidate attention model. Do not silently replace that plan or run its four-agent language experiment. Assign semantic meanings only through the explicit mapping proposed here and reviewed at its gate; never present them as consequences of the geometry alone.

Keep three claims separate throughout:

1. **Mathematical fidelity:** transformations and representations follow their declared equations.
2. **Information recovery:** a specified property can be recovered from a specified set of observations under declared assumptions.
3. **Human understanding:** a viewer can use the instrument to make accurate predictions or recognize a property in an unfamiliar case.

Screenshots alone do not establish all three. The simulator does not establish the physical existence of extra spatial dimensions.

## 2. Starting authority and working location

Start Gate 0 immediately. This prompt authorizes its source inspection, isolated local setup, minimal browser probe, and experiment definition. Each later stage begins only after Paul approves the preceding gate's concrete packet.

Use the current repository if it is the intended experiment workspace. Inspect applicable AGENTS.md files and relevant installed skills before implementation. Keep the work in a separate branch/worktree or clearly isolated experimental directory. Preserve existing changes and the current application's main experience. Local experiment implementation, dependencies, tests, and development previews belong within approved stages. Do not merge, publicly deploy, publish, spend on external services, or alter the settled research documents through an inferred gate approval.

Relevant starting references:

- Live visual reference: https://interfractal-3.vercel.app
- Source: https://github.com/jedisherpa/interfractal
- Related source: https://github.com/jedisherpa/hopf-workshop
- Previously inspected Interfractal revision: `1326cc64223fc167610c2157f2c24fa33a87c93b`.
- Relevant historical files: `src/components/instrument/room-scene.tsx`, `src/components/instrument/first-page.tsx`, `src/lib/instrument/cosmology.ts`, and `src/workshop/hopf.ts`.
- Mathematical visualization reference: [Dimensions, chapters 3–4](https://www.dimensions-math.org/Dim_CH3_E.htm).
- Hopf reference: [Niles Johnson's visualization and explanation](https://nilesjohnson.net/hopf.html).
- Mathematical derivation: [David W. Lyons, An Elementary Introduction to the Hopf Fibration](https://nilesjohnson.net/hopf-articles/Lyons_Elem-intro-Hopf-fibration.pdf).

Pin the source revision you actually use; the historical commit is orientation, not an instruction to assume today's deployment matches it. Inspect existing code before deciding whether to extend it or build a small isolated companion. Explain that choice in Gate 0.

A previous browser could render the Interfractal opening but could not create its WebGL context. This is a known environment risk, not a conclusion that the public application is broken. Test your actual environment early. If sources are inaccessible, label the missing comparison and continue with a self-contained prototype where possible.

## 3. Team and dependencies

You may delegate bounded work to these roles if actual sub-agent tools are available. Report which roles actually ran. If delegation is unavailable, perform the work sequentially and disclose that independent review was unavailable; never invent a team or verification.

| Role | Responsibility | Required output |
|---|---|---|
| Mathematics/model lead | Coordinates, dimensions, Hopf correspondence, object definitions, transformations, projection/slice rules, analytic predictions, and the limits of cross-scale composition | Small model specification and independently checkable expected results |
| Browser/instrument builder | Shared model state, rendering, controls, preview, recording, deterministic replay | Working interface and reproducible run artifacts |
| Experimental/HCI lead | Shared-reference semantics, observable questions, comparison conditions, attention/interpretation tasks, counterexamples, readable explanations | Prespecified trials, explicit geometry-to-meaning mappings, and limits on conclusions |
| Independent verifier | Challenge the mathematics, test implementation, inspect browser captures, and exercise historical replay | Evidence-backed failures or acceptance of explicitly bounded checks |

As orchestrator, establish the shared state/event contract and file ownership before parallel writes. Give each role its precise remit, current gate, inputs, owned paths, and stop boundary. The verifier must not approve their own implementation and must derive at least one expected result independently. None of the agents may approve a gate on Paul's behalf.

Agents may work only within the currently authorized stage. Before presenting a gate, stop or finish all stage workers and freeze its evidence. Do not have background agents prepare the next stage while awaiting approval.

## 4. Define the experiment before running it

Write a compact experiment charter in the workspace. For every test define:

- The exact question and candidate explanations.
- The known object and its full coordinate/state definition.
- The property being inspected or recovered.
- The intervention, controlled variables, and observation available to the viewer or solver.
- What the source model, projection, display camera, and playback clock each do.
- The expected result, numeric tolerance where applicable, and at least one result that would count against the proposed interpretation.
- Whether the test establishes code correctness, model observability, usability, or exploratory human performance.
- The planned screenshot moments and replay checkpoints.
- The pass, fail, inconclusive, and stop conditions.

Prespecify comparisons before viewing their results. Keep exploratory trials labeled separately from fixed checks. If a result changes the question, save a new test version and explain why. Do not rewrite a failed prediction to match the observed animation.

Use “unknown” or “not distinguishable from these observations” when warranted. An inconclusive answer can complete an experiment.

## 5. Mathematical contract

Use full source coordinates. A point in the initial 4D model is `(x,y,z,w)`; a point in the 5D model is `(x,y,z,w,v)`. Playback time is a separate variable. Never create the appearance of an extra dimension solely by animating a 3D mesh.

For the first projection experiments, use centered hypercubes with vertices in `{-1,+1}^d`. Connect vertices differing in exactly one coordinate. Derive and verify counts: `2^d` vertices and `d·2^(d−1)` edges. Thus the 4D case has 16 vertices/32 edges, and the 5D case has 32 vertices/80 edges. These counts follow from these chosen objects; they are not participant-count or language theories. Distinguish the solid object's dimension, its boundary, the drawn wireframe, and the affine span of its vertices.

Specify one vector convention. With column vectors, a rotation in coordinate plane `(i,j)` acts as:

```text
x_i' = cos(theta) * x_i - sin(theta) * x_j
x_j' = sin(theta) * x_i + cos(theta) * x_j
all other coordinates unchanged
```

Document composition order. In dimensions above three, define rotations by coordinate planes rather than pretending every rotation has a single ordinary 3D axis. Begin with independent `x–w` and, in 5D, `y–v` controls. Add other planes only for a specified test.

Use an orthographic projection first. For example:

```text
source point q ∈ R^d
rotated point q' = R q
3D projection p = P q', where P initially selects x,y,z
screen position = an explicitly separate 3D display-camera projection of p
```

Keep source rotation, projection choice, ordinary 3D camera motion, and time independently controllable and recorded. Disable automatic rescaling during fixed comparisons, or define and record the same rescaling rule in every condition. Apparent shadow intersections do not imply source-object intersections.

For an analytically checkable slice example, use a **solid 4D ball** `x²+y²+z²+w² ≤ r²`. Its slice at `w=s` is a 3D ball of radius `sqrt(r²−s²)` when `|s|<r`, a point at equality, and empty outside. Its displayed boundary is an ordinary sphere. Do not substitute projected vertices for a solid cross-section.

A solid 5D ball sliced at `w=s, v=t` produces a 3D ball with radius `sqrt(r²−s²−t²)` inside the valid domain. A single hyperplane slice of a 5D solid is generally 4D: two independent constraints are required for this 3D slice. Mark empty and degenerate slices explicitly.

The Hopf correspondence is an early core experiment. An S³ has three intrinsic dimensions and is commonly represented in R⁴; it is not a full four-dimensional ball. Explain the distinct roles of stereographic representation `S³ → R³` and the Hopf map `S³ → S²`. Do not treat a Hopf fibration as an automatic 5D model.

For the exact Hopf layer, use normalized complex pairs `(z1,z2)` with `|z1|²+|z2|²=1`. One convention is:

```text
h(z1,z2) = (2 Re(z1 conjugate(z2)),
            2 Im(z1 conjugate(z2)),
            |z1|² - |z2|²)
```

Multiplying both complex coordinates by the same phase `exp(i gamma)` preserves `h`; the preimage of each base point is a circle. The whole family is one Hopf bundle. An idealized globe can serve as the S² base: latitude and longitude select a surface point whose corresponding fiber is highlighted. This is a representation of an ideal spherical surface, not a geophysical model of altitude or the planet's interior. Render finite samples and selected fibers; do not claim to have drawn the continuum of all points. [Mathematical reference](https://nilesjohnson.net/hopf.html).

Keep the geometric sphere center, a selected point on its surface, and the semantic shared reference distinct. A geographic base point in the globe demonstration keeps its identity. The attention view is a separate labeled mapping, not a silent reassignment of real locations to meanings.

For the candidate attention layer, define a shared reference `r` with an ID, wording, scope, author, version, and declared relevance criteria. Define `M_r(record)` as the proposed mapping from a stable record to a base point or explicitly unmapped/ambiguous status. A reference change can change relevance, grouping, display emphasis, and selected fiber while leaving source records and their histories unchanged. Preserve a plain view of the same mapping and records.

Define exactly what an item placed on a loop represents. Unordered examples, perspectives, or histories do not automatically have circular topology. Their positions along a loop may initially be display choices; label them as such. Geometric phase is not automatically time, attention, trust, coherence, or lived essence. A formal semantic fiber claim would require a specified projection, task-relevant invariance, and justified fiber structure. Do not force every record into one position or erase competing mappings.

When connecting bundles, begin with explicitly typed relationships among local models, such as shared source, dependency, contribution, or revision. Distinguish a graph of bundle models from a newly proven fiber bundle. Hopf fibers' mathematical linking does not mean all represented people or ideas influence one another. Organizational scale, intrinsic dimension, ambient dimension, and rendering layers remain separate. Repeated Hopf-like representations at several scales are a modeling hypothesis, not a theorem that every collective ascends through dimensions.

## 6. Browser experience Paul can actually watch

Use a supported preview surface reachable by Paul. Establish its actual viewing mechanism in Gate 0; a private localhost URL available only to the agent is insufficient. Read the installed browser/control and preview skills and use the supported computer-use mechanism. Do not invent tools, bypass browser restrictions, or claim that Paul shares your browser session without checking the environment's viewing arrangement.

The first user-facing view should provide:

- A large, legible three-dimensional scene rendered on screen.
- Plain controls: **Look around**, **Turn through 4D**, **Turn through 5D** when applicable, **Move the slice**, **Pause**, **Reset**, **Replay last test**, and **Compare**.
- A small explanation: **What we're testing / What changed / What to watch**.
- A visible **Current shared reference** and, when the attention layer is introduced, **Change reference**, **Compare references**, and **Show unmapped records**. Changing a display reference is not a group commitment; retain author and version.
- Stable point/edge selection, restrained color, and an optional trail. Labels and colors identify model elements, not psychological qualities.
- A collapsible inspector for exact coordinates, planes, matrices, clipping, tolerances, and run identity.
- A visible experiment stage and paused/replay/exploration state.
- Reduced motion, manual stepping, and non-color cues.

Separate **shadow/projection** and **slice** modes clearly. Maintain stable scale and viewpoint in comparisons. Do not let glow, trails, occlusion, automatic camera motion, or perspective distortions conceal the property under test. Effects can be toggled independently and their use must be recorded.

Make it inviting and slightly magical through lighting, pacing, and interaction, while keeping the geometry readable. Additional characters, branding, or worldbuilding are optional and must not delay a meaningful experiment. If using Wizard Joe, use available canonical assets; do not invent a lookalike.

When WebGL is unavailable, try a supported Canvas2D/SVG renderer of the same computed 3D projected scene with ordinary camera and depth cues. Clearly record the backend. Such a fallback may still support the experiment; validate its behavior rather than silently treating it as equivalent. If no watchable preview or replay can be delivered, report that concrete blocker at the current gate and do not claim a successful live experiment.

## 7. Recording and replay are core features

Every meaningful run must have a stable run ID and an immutable evidence directory. Record at least:

- Gate, experiment version, hypothesis, and test ID.
- Repository/base revision, actual tested source/build hash, and lockfile/dependency identity. Preserve uncommitted patches if the build was not committed.
- Model type/dimension, object data or generator version, seed, transform order, rotation planes/angles, projection parameters, slice parameters, display camera, viewport, renderer, clipping, and display options.
- Where applicable, shared-reference ID/version, mapping and relevance-rule version, source record IDs/hashes, placement rationale, ambiguity/unmapped records, fiber sampling, and typed cross-scale relationships.
- Initial state, ordered semantic control events, deterministic simulation times, event timestamps, and checkpoint states or hashes. Record both intended and observed control changes.
- Assertions, expected/observed values, console errors, screenshots, and the agent's visual observations.
- Any protocol deviation, failure, fix, interpretation, and next proposed test.

Prefer a deterministic model evaluated from explicit time or fixed steps. Avoid using uncontrolled wall-clock delta as the authoritative experimental state. Separate recording time from simulation time.

Provide an in-app Run Library. Each run must support **Replay from start**, **Pause**, **Step**, **Scrub**, **Reset to checkpoint**, and access to its screenshots and brief results. The historical run opens paused. If recording video is supported, retain it as additional evidence; video is not a replacement for state replay.

Replay must use the version actually tested. Preserve a runnable build/source snapshot with its lockfile and replay data, or another verifiable versioned mechanism. Do not replay old input events against changed code and call it the original experiment. Pin assets and external dependencies needed for recovery. Keep gate artifacts available through the workspace's durable artifact/repository workflow without public deployment.

Verify replay by opening the saved run from its user-facing entry point, replaying it, and checking agreed state checkpoints against the original. Inspect the replay screenshots too. State reproducibility is required; exact pixel identity across different GPUs/fonts is not assumed. Report the visual-comparison tolerance and any drift that matters to interpretation.

Paul's exploration of a replay must not overwrite the original run, trigger the next stage, or count as approval. If he changes controls, mark that as a new exploration and offer a reset to the recorded sequence.

## 8. The live experimental loop

Within the authorized stage, repeatedly perform this sequence:

1. State a concrete question and predicted discriminating observation.
2. Freeze the applicable test settings and comparison.
3. Explain briefly what Paul will see and run it at a watchable pace, generally a 20–60 second guided sequence with pause and step controls.
4. Drive the running UI with actual computer use: buttons, sliders, selection, camera, and replay controls. Unit tests can supplement this, but cannot replace testing the displayed interface. An automatic tour must be started through the real UI and recorded as an automatic tour.
5. Capture genuine browser screenshots at the initial state, discriminating event, final state, and any anomaly. Include the run/time or another unambiguous link to its exact state.
6. Open and visually inspect the captures. Do not treat “a screenshot file exists” or “the console is clean” as evidence that the geometry is understandable or correct. Note crossings, clipping, occlusion, misleading labels, hidden controls, blank rendering, and mismatches with predicted behavior.
7. Compare visible results with the separate model checks. Distinguish a model defect, renderer defect, interaction defect, and an interpretation problem.
8. Preserve the run, make the smallest justified change, then rerun the relevant case and one counterexample. Save the new run separately.
9. Replay the latest candidate through the public-facing controls, freeze the gate packet, and stop.

Do not create or edit images to stand in for browser evidence. Annotated copies must retain the untouched originals and be labeled. Synthetic or generated illustrations cannot serve as screenshots of a test.

Use a bounded loop: normally an initial experimental variant and up to two justified revisions before bringing the evidence back to Paul. Clear implementation defects may be repaired within the same gate, but repeated failure to make progress calls for a blocker report. Do not search indefinitely for a positive answer or broaden the hypothesis to avoid a negative result. Keep progress updates concise and frequent while working.

## 9. Gate 0 — define and prove the viewing/replay path

**Do now, then stop.**

Inspect the relevant source and available browser/preview capabilities. Prepare the charter, record contracts, exact gate sequence, and proposed scope. Create only the minimal probe needed to demonstrate a reachable scene and replay: a marked ordinary 3D cube, one camera movement or model turn, pause, and a saved replay.

Use computer use to load, manipulate, capture, and replay the probe. Test WebGL or the declared fallback. Confirm that replaying does not advance stages or mutate the saved run. Produce a short visual recording if available.

**Gate packet:** the actual preview/replay entry point, probe captures, observed capability/backend, proposed objects and tests, implementation location/source pin, and what Gate 1 will build.

**Question for Paul:** “Please watch the probe replay. Do you approve Gate 1: the 3D-to-2D calibration and model/replay checks?”

## 10. Gate 1 — calibrate with a familiar object

**Begin only after Gate 0 approval.**

Build a controlled 3D-cube-to-2D-shadow example beside an ordinary 3D view. Make object rotation and camera movement visibly separate. Freeze the camera for the primary model-rotation trial.

Check vertex/edge identity, distance preservation under source rotation, inverse rotation returning to the starting state, and projected-coordinate predictions. Show a case in which a projection hides distinctions. Test pause, exact checkpoint restoration, and replay after a page reload. Keep a canonical unmodified calibration run available for later comparison.

**Answer sought:** does the instrument faithfully distinguish a source object, its projection, and the observer's camera, with reproducible controls?

**Stop with the gate packet and request approval for Gate 2.**

## 11. Gate 2 — Hopf correspondence and the shared reference

**Begin only after Gate 1 approval.**

Build linked views of a selectable ideal globe/base sphere and its sampled Hopf fibers. Selecting a surface point highlights the corresponding full fiber; selecting a rendered fiber identifies its base point. Let Paul move along that fiber while the base point remains unchanged. Explain that one point corresponds to one fiber and that the family of fibers forms the bundle.

Independently check normalization, `h(z)=p` along sampled phases, and shared-phase invariance. Include pole/seam cases. A stereographic projection can send a fiber through infinity, appearing as a line; handle clipping and explain the representation rather than dropping that fiber or pretending every screen curve is a bounded circle. A global continuous choice of one phase origin over the whole S² base is not available for the nontrivial Hopf bundle: use documented local conventions/charts and distinguish a chart change from a change in the source state. The math verifier must review these boundary cases.

Add a **separate candidate attention view** over a small synthetic set of stable records. Propose two clearly different reference questions, such as “Which community-meal options can happen on Saturday?” and “Which options meet the stated access needs?” Use only the fictional facts actually supplied, with unknowns left open. Define a transparent mapping rule before showing its result. Do not present this rule as a discovered model of human attention.

Test changing only the shared reference while holding the source records fixed. Show the before/after assignment, relevance, or emphasis; explain why each changed. Test switching back, preserving alternative views, inspecting the evidence on a loop, and finding an intentionally unmapped or multiply interpretable record. Rotating the display camera must not change relevance. Changing the reference must not rewrite facts or manufacture endorsement.

A reference is the organizing question of this view, not a mathematical gravitational force or an automatic leader. Preserve a readable plain listing of the same information. A user can propose a different reference without silently committing other participants to it.

**Answers sought:** does the point–fiber correspondence behave correctly, and does the candidate reference-dependent view transparently reorganize the same records without losing their differences?

**Stop with the gate packet and request approval for Gate 3: the 4D object and its moving shadow.**

## 12. Gate 3 — a genuine 4D object and its moving 3D shadow

**Begin only after Gate 2 approval.**

Implement the 4D hypercube model and a controlled `x–w` rotation, projected into 3D. Start with fixed projection and display-camera settings. Let Paul track selected source vertices and edges through the motion and inspect projected coincidences.

Required tests:

- Exact vertex/edge construction, affine span four, preserved source norms/distances, inverse/round-trip behavior, and independently computed projection checkpoints.
- Compare an ordinary 3D camera orbit with a hidden-coordinate rotation. Each must change only its declared state variables.
- Use two source points whose `(x,y,z)` agree and whose `w` differs. The first projection must coincide; a suitable `x–w` rotation must separate them. Preserve their distinct IDs while overlapped, and do not fake separation with decorative jitter.
- Include a fixed-view negative case where the hidden coordinate remains unobservable.

Add a bounded observability check using projected coordinates and known point correspondences. For observations `p_k=P R_k q`, stack the known `P R_k` matrices. Test rank and reconstruction residual against hidden source coordinates. One projection has rank at most three; a suitable additional known rotation can make the stacked system rank four. The verifier independently checks an example. Report that this is numerical recovery under known transforms and correspondences, not recovery from arbitrary screenshots or proof of a uniquely 4D physical cause.

**Answer sought:** can controlled additional views reveal a specified distinction absent from one shadow?

**Stop with the gate packet and request approval for Gate 4.**

## 13. Gate 4 — slices, projections, and ambiguity

**Begin only after Gate 3 approval.**

Implement the analytic 4D-ball slice model. Show its changing 3D slice alongside a clearly labeled projection view or reference. Independently check center, interior, boundary, and empty cases. Never visually represent an empty slice as an ordinary zero-radius object without explaining the distinction.

Create a reproducible ambiguity demonstration: two source configurations or interpretations compatible with a declared initial view, followed by a control/view that distinguishes them—or a demonstration that the available controls do not distinguish them. Specify the candidate class rather than claiming arbitrary shape reconstruction.

Keep one counterexample explicit: a stored 3D animation can reproduce a selected projection movie. Therefore movie appearance alone does not prove a higher-dimensional origin. Investigate consistency across known interventions and the usefulness of the representation.

**Answer sought:** what do slices and multiple views add, and what uncertainty remains?

**Stop with the gate packet and request approval for Gate 5.**

## 14. Gate 5 — two additional coordinates in 5D

**Begin only after Gate 4 approval.**

Generalize the validated model to five coordinates. Expose independent `x–w` and `y–v` rotations with a fixed comparison camera. Preserve the approved 4D replay/build.

Required tests:

- 32 vertices, 80 edges, affine span five, orthogonal rotations, correct composition order, invariants, and inverse/round-trip checks.
- Change the fourth-coordinate control while holding the fifth fixed; change the fifth while holding the fourth fixed; then compare their recorded effects. Do not map both controls to the same deformation.
- Deliberately choose observations that leave `v` hidden, then add an observation that reveals it. For a point with known correspondence and declared transforms, verify when the stacked observation matrix reaches rank five; report failure when it does not.
- Implement the simple 5D-ball 3D slice with two independent slice parameters, including valid, point, and empty cases. Show that different parameter pairs can yield the same slice radius; equal-looking slices need not identify a unique source condition.
- Compare clutter, occlusion, and navigation cost with 4D using specified tasks rather than guessing dimension from apparent complexity.

**Answer sought:** can the instrument expose and distinguish the effects of two additional coordinates, and what information is still hidden?

**Stop with the gate packet and request approval for Gate 6.**

## 15. Gate 6 — connected local models and changes of scale

**Begin only after Gate 5 approval.**

Return to the synthetic attention records from Gate 2. Model two small groups or local contexts, each with its own shared reference, record set, chosen mappings, and recoverable history. Describe them as local bundle-inspired views unless their formal bundle structure is actually specified and verified.

Connect them through explicit typed relations: for example a shared resource, one group's contribution to another's task, or a correction to a common record. Keep those links visually distinct from the universal linking of fibers in the Hopf construction. Neither an attractive link nor a geometric center establishes influence, capability, or authority.

Let a local group appear as one inspectable outward object in a larger view. Expanding it must restore its reference, constituent records, relevant differences, and dependencies. Changing the larger reference may alter which outward properties matter, while preserving the local accounts. Do not force a single universal summary to serve every reference.

Required cases:

- The same records organized under two references, with explainable differences and round-trip restoration.
- Two groups with similar outward summaries but different internal dependencies. Show when the initial summary is insufficient for the receiving task; disclose the hidden condition and repair the summary.
- A changed external requirement that traces back to the affected local records, followed by an attributable outward revision.
- A disagreement about the shared reference itself, retained as alternative views rather than erased through averaging.
- A deliberately unjustified link or misleadingly close placement that the inspector and evidence can expose.

Compare the view with a plain table/graph using the same source records, summary rules, and correction operations. Record whether the geometry helps locate the relevant dependency or merely adds visual complexity. This is an instrument/fixture experiment; it does not run the separate four-agent shared-meaning protocol or establish social emergence.

**Answer sought:** can reference-dependent local views compose into a useful higher-level account while keeping consequential detail recoverable? Report where that composition fails. Do not call organizational scaling a newly discovered fourth or fifth dimension.

**Stop with the gate packet and request approval for Gate 7: unfamiliar-case interpretation and the bounded conclusion.**

## 16. Gate 7 — test what can be understood and report a bounded answer

**Begin only after Gate 6 approval.**

Prepare a small frozen set of unfamiliar orientations, selected-point questions, hidden-coordinate cases, projection-versus-slice distinctions, and reference/scale changes. Keep the answer key separate from the participant-facing task view. Include cases whose correct response is “the available view is insufficient.” Do not test mere memorization of a tour or identify the correct answer through labels, colors, filenames, or privileged data.

Compare a static view, a prescribed moving sequence, and interactive control with the same task-relevant model information, clearly declared time and teaching. These are distinct observation conditions; more information in one condition must be acknowledged. Separately compare the attention view with its plain equivalent using the same records and relevance criteria; do not bundle a new reasoning rule into only the visual condition. Counterbalance task forms/order where feasible and describe practice effects.

If Paul wants to try the tasks, let him answer before revealing the model explanation. Do not invent responses or make human participation a hidden prerequisite for reporting the computational work. Record his exploratory observations only with his participation; a single viewer's session is usability evidence, not population efficacy. An agent that sees source coordinates or the answer key is checking the model, not passing a visual comprehension test.

Report separately:

- Which mathematical checks passed and which assumptions they used.
- Which properties the chosen observations uniquely determine within the declared model, and which remain ambiguous.
- What Paul or any actual viewer demonstrated, struggled with, or did not test.
- Which views/controls helped, which added clutter, whether reference changes remained understandable, and the strongest failure/counterexample.
- The next smallest experiment that could change the present conclusion.

Possible valid conclusions include “faithful and informative for these properties,” “mathematically correct but confusing,” “insufficient observations,” and “a simpler presentation works better.” No positive conclusion is required.

**Stop with the final replay collection and recommendation.** Propose any further bundle construction, new object family, VR presentation, or formal integration into the shared-meaning study as a separate next scope. Do not begin it automatically.

## 17. Mandatory gate packet and human approval

At every gate, including a failed or blocked one, provide:

1. A working replay entry point for the actual run, opening paused, with its stable run ID and build identity. If no test could run, say so and provide the last successful replay; never fabricate one.
2. A short “watch this” guide identifying the relevant moment and what it can show.
3. Two to four actual inspected screenshots, including any decisive failure.
4. A small table of **question / expected / observed / interpretation / unresolved**.
5. Changes made during the gate and links to preserved failed runs.
6. The proposed next stage, its concrete deliverables, and the decision needed from Paul.

Use a concise request such as:

> Gate G3 is ready for your review. Replay run R… here: [actual link]. Watch the two coincident points separate while the camera stays fixed. The coordinate checks passed; this does not yet show that the interface is easy to understand. Do you approve G4: slices and ambiguity, want revisions to G3, or want to pause?

That text is a format example, not a result to copy. Substitute only real observations.

After presenting the packet, **end your turn and await Paul**. Keep the supported preview available and paused where the environment permits. Do not perform more research, launch workers, run additional tests, or start the next gate while waiting. A replay is read-only evidence review and does not advance the experiment.

Accept a clear ordinary-language approval of the named next stage. Do not require a magic phrase. Silence, enthusiasm about a picture, an agent's recommendation, a screenshot of an approval button, or a model-generated log entry is not approval. Use the actual user message, or a trusted host-authenticated human action if the platform supports one. Browser automation must never click approval on Paul's behalf.

Record the approved stage, the exact reviewed packet/run/build identity, the actual user response, and the scope it covers. Approval authorizes the next named stage, not all remaining stages. If Paul requests revisions, work only on the current gate and return an updated packet. Material changes to the reviewed model, hypothesis, scoring, or scope require a new version and review; do not quietly replace the approved evidence.

These pauses are specifically requested by Paul for this experiment. They are not generic permission checks. Work autonomously inside each approved stage and make the result concrete before asking to advance.

## 18. Durable records, resume behavior, and completion

Maintain a small inspectable experiment directory, adapting names to the actual repository:

```text
looking-glass/
  CHARTER.md
  MODEL_SPEC.md
  TEST_PLAN.md
  CLAIMS_AND_LIMITS.md
  gate-state.json
  approvals.jsonl
  runs/<run-id>/manifest.json
  runs/<run-id>/initial-state.json
  runs/<run-id>/events.jsonl
  runs/<run-id>/checkpoints.json
  runs/<run-id>/results.json
  runs/<run-id>/observations.md
  runs/<run-id>/screenshots/
  runs/<run-id>/recording.webm       # only if actually recorded
  builds/<build-id>/                # tested build/source and required assets
  gates/<gate-id>/review.md
```

The filenames are an output contract, not evidence those files already exist. Do not create empty success reports. Each result must trace back to a run and actual observation.

Persist current stage, status, last successful run, reviewed packet identity, approval state, blockers, and next permitted action. On resumption, read those records and reconcile them with the real conversation. Never infer approval from having reached a later stage in code. If awaiting approval, restore the replay and present that gate; do not start a new experiment. If a preview expired, rebuild the same pinned version for replay and verify its checkpoints without changing the experiment.

Do not overwrite historical evidence. Do not expose unrelated private repository or personal data in shared artifacts. Follow the environment's supported storage and preview workflow; do not claim a live server will persist indefinitely. Supply replay data and exact recovery instructions so an expired session can be restored by the agent.

Completion means Paul can open the instrument, replay the actual tests, inspect their evidence and limits, and understand the current answer. It does not require validating the original intuition. Start with Gate 0 now, deliver its concrete probe and proposal, and stop for review.
