# Looking Glass Gate 0 source review

Accessed 2026-09-19 (America/Denver). This is a source and reference review for
Gate 0 only. No upstream application code was executed, changed, published, or
used as the Looking Glass implementation. The two repositories are pinned in
`sources.json`; the checked-out source trees under `research/sources/` are
read-only research inputs.

## What was inspected

The fetched `jedisherpa/interfractal` checkout is exactly revision
`1326cc64223fc167610c2157f2c24fa33a87c93b`, the historical revision supplied by
the experiment prompt. I inspected:

- `src/components/instrument/room-scene.tsx`
- `src/components/instrument/first-page.tsx`
- `src/lib/instrument/cosmology.ts`
- `src/workshop/hopf.ts`
- `src/lib/hopf.ts`

The fetched `jedisherpa/hopf-workshop` checkout is exactly revision
`2967f71aa19117925f55b9349a7bfc0ec8fc8dea` (the fetched HEAD). I inspected:

- `hopf.js`
- `hopf_model.py`
- `visualizer_geometry.js`
- `visualizer.js`
- `abacus_model.js`
- `README.md`
- `INTEGRATION.md`
- `VERIFICATION.md`

The applicable `interfractal/AGENTS.md` was read before source inspection. It is
an upstream app-builder contract. No `AGENTS.md` exists in the Looking Glass
workspace or the fetched Hopf Workshop tree.

## Primary mathematical references

The Dimensions chapters 3–4 page gives two complementary ways to represent a
4D object: a moving 3D section and a 3D shadow/projection whose changes under
4D rotation can reveal structure. It explicitly gives the tesseract counts as
16 vertices, 32 edges, 24 squares, and 8 cubes. It also warns that sections
are difficult to recognize, that shadows give partial information, and that
several methods should be combined. Its stereographic discussion describes
`S^3` as a 3D sphere in 4D, projects all but one point into ordinary 3-space,
and notes that a face through the projection pole appears to explode toward
infinity. These are direct design requirements for separate slice, orthographic
shadow, and stereographic controls; they are not evidence that a 3D display is
the source object.

Niles Johnson’s Hopf page describes the Hopf fibration as circles over points
of `S^2`, with each pair of fibers linked once, fibers over a latitude forming
nested tori, and `S^3` decomposing into two solid tori joined at the equatorial
torus. It specifically calls out the apparent central line as a circle through
infinity in `S^3`. This supports explicit pole/seam handling and a visible
distinction between a finite sampled render and the continuum.

Lyons, *An Elementary Introduction to the Hopf Fibration*, defines a map
`S^3 -> S^2`, shows that the image lies on `S^2`, and gives stereographic
projection from `S^3` minus one chosen point to `R^3`. It states that Hopf fibers
are circles and stereographic projection sends them to circles, except a fiber
through the projection point, which appears as a line. It also derives the
linked-circle picture. The source uses a quaternion-coordinate convention;
Looking Glass should record its own complex-pair sign and coordinate convention
explicitly rather than silently mixing formulas.

Exact URLs and access records are in `sources.json`.

## Source facts and usable implications

| Source fact observed | Interpretation for the Gate 0 companion |
| --- | --- |
| `room-scene.tsx` constructs two clipped copies of a sampled Hopf-fiber family, one above and one below `y=0`; it uses `fibreSafe`, stereographic coordinates, and Catmull–Rom tubes. | A companion can borrow the idea of a readable sampled fiber field, while retaining raw coordinates and a declared clipping/pole policy. The doubled mirrored rendering must not be mistaken for a second mathematical bundle. |
| `room-scene.tsx` has an animated `CameraRig`, a separate `orbit` state, independent object spins, a `FiberFamily`, nested shells, an “ImpossibleCube,” tetrahedral edges, rain, and staged intro bloom. | The existing instrument is a useful visual reference but combines model motion, camera motion, scale, lighting, occlusion, and narrative timing. That coupling is unsuitable for the first fixed calibration unless an isolated mode freezes every confound. |
| `room-scene.tsx` renders an 8-vertex ordinary cube and tetrahedron-like forms with Three.js lines and colored face fills; `SpinOnAxis` updates rotations using frame `dt`. | It demonstrates an approachable scene and visible identity cues. It does not provide the requested full-coordinate `R^4/R^5` wireframe contract, explicit rotation-plane matrices, deterministic simulation time, or separate 3D display camera. |
| `first-page.tsx` provides the Light/Whole entry, Skip intro, Reduce motion, and a gate with stage labels. The screen-reader text says pressing is not a Yes and the picture cannot draw the person looking. | The boundary language and reduced-motion affordance are valuable to preserve. The gate is narrative stage selection, not an experiment control or a shared-reference commitment. |
| `cosmology.ts` labels eight wellness entries as cube entrances and explicitly says they are not worlds; it also defines four world stages and nested shell radii. | This is a good example of separating a count’s local role from the number of worlds. Looking Glass should keep object dimension, participant count, lens count, and observation count in separate fields. |
| `interfractal/src/workshop/hopf.ts` implements normalized complex pairs, `hopf`, common-phase `gauge`, stereographic projection, north/south sections, horizontal latitude transport, holonomy, fiber sampling, and sampled linking number. | The kernel is a useful implementation reference. The exact `hopf` and gauge invariants can seed Gate 2 checks only after the Gate 1 packet is complete and Paul approves Gate 2. The code rejects non-unit input and throws at the stereographic chart pole, which is preferable to silently rescaling or dropping the exceptional state. |
| The same file’s header says its provenance is `hopf-workshop main dd0ab5e…`, but the separately fetched workshop repository is pinned here at `2967f71…`. | Provenance comments inside a source file are historical claims, not the revision actually used in this review. Record both facts and use the pinned checkout/hash in any future implementation. |
| `hopf-workshop/hopf_model.py` is the stated normative Python implementation; `hopf.js` is a browser/Node port. Both state that geometry is a teaching model and does not authorize or replace real identity, safety, or consent. | Preserve this separation. A future candidate attention mapping must be visibly labeled as a proposed interface mapping, with records and history kept outside geometric phase. |
| `hopf-workshop/visualizer_geometry.js` projects a tetrahedron with a yaw/pitch camera, depth sorting, and Canvas 2D. Its header says “Geometry is not permission. People are not fibres.” Beads target sampled stereographic states only when a response is attached to the current proposal version. | This is a viable fallback pattern if WebGL is unavailable: use the same computed points and a declared ordinary camera. Keep semantic records typed and versioned; never let bead placement imply a person is a fiber or that a response grants authority. |
| `hopf-workshop/abacus_model.js` uses an 8-component state, projects it to base/fiber summaries, applies weighted parser/memory/agreement inputs, computes deltas, and blocks actions on missing validated identity, stale authority, or oscillation. | This is a candidate attention model only. It is not evidence that 8 axes or its thresholds are psychologically valid. It should not enter Gate 0’s geometric calibration, and any later use needs a declared record schema, mapping rule, and counterexample. |
| `hopf-workshop/README.md` explicitly distinguishes exact Hopf geometry, a coordination protocol, and a proposed contemplative interpretation; it says the bridge is a design interpretation rather than a psychological law. | This separation matches the Looking Glass prompt’s three claims: mathematical fidelity, information recovery, and human understanding. It supplies useful nonclaims for the charter. |

## Public runtime observation

The live URL `https://interfractal-3.vercel.app` was inspected by direct HTML
fetch on 2026-09-19. The server-rendered entry identifies `Interfractal`, loads
hashed JavaScript/CSS bundles, and exposes a `data-testid="instrument-app"` at
phase `pulse`. The initial accessible text includes “Light,” “Whole,” “Skip
intro,” “Reduce motion,” “This is a place where clarity keeps everything from
being black and white,” and “Pressing does not sign a Yes.” The HTML identifies
the deployment’s assets but does not identify a source commit, so no commit is
inferred from the deployment.

The root orchestrator separately reports a user-visible browser probe: after
skipping the intro, the scene showed dense translucent multicolored geometry;
there was no WebGL-create error in its development logs, only a THREE.Clock
deprecation warning. That runtime observation is kept separate from static
source facts and is not a claim that the public deployment equals revision
`1326cc6…`.

## Gate 0 proposal

Build the first probe as a small isolated companion under the Looking Glass
experiment directory. Keep the existing Interfractal and Hopf Workshop trees
as read-only references and do not extend the narrative scene until a clean
calibration contract exists. The companion is preferable because the existing
scene’s camera, object spins, staged bloom, nested shells, clipping, and
`performance.now()`-driven frame updates make it difficult to attribute a
visible change to one declared source transformation. A small companion can
record the source state, rotation planes and angles, projection, display camera,
backend, viewport, and fixed simulation time in one run record; it can still
reuse the visual lessons (legible fibers, stable selection, reduced motion,
explicit nonclaims) without inheriting semantic coupling.

The Gate 0 probe should be limited to a marked ordinary 3D cube, one separately
controlled ordinary camera movement or model turn, Pause, Reset, and a saved
replay opened through the user-visible preview. It should show the backend
(WebGL or the declared Canvas2D/SVG fallback), keep the camera and model event
streams distinct, and verify that replay does not mutate the saved run or
advance the experiment stage. No 4D/5D or attention claims are needed to pass
Gate 0.

After Paul approves Gate 1, the first fixed model checks use an ordinary 3D
cube and its 2D shadow, separating source rotation from display-camera motion.
Gate 1 does not build a higher-dimensional model. The first Hopf experiment is
Gate 2, requiring its own approval after the Gate 1 packet. Its proposed checks
use normalized complex pairs, verify `h(e^{iγ}z)=h(z)`, select a base point,
vary phase while holding the base fixed, and record the stereographic pole case.
Any candidate shared-reference layer remains a separately labeled mapping over
stable records, with a plain record view and unmapped/ambiguous states.

The later, separately approved Gate 3 introduces `{-1,+1}^4` vertices and edges
between points differing in one coordinate (16 vertices/32 edges), explicit
column-vector coordinate-plane rotations, orthographic projection, and separate
display-camera motion. Gate 4 introduces the solid 4D-ball slice with radius
`sqrt(r²-s²)` at `w=s`, distinct from projected vertices. Gate 5 introduces the
5D hypercube (32 vertices/80 edges) and the two fixed coordinates `w=s,v=t`
needed for a 3D slice of a 5D ball. None of these later gates is executed or
authorized by the present Gate 0 work.

## Gaps and limits

- Text browsing could read the live deployment’s HTML but could not associate
  its hashed bundles with a source revision. The runtime probe is therefore
  evidence about the reachable entry and renderer behavior only.
- The source review did not run upstream tests or app code, per Gate 0 scope.
  Upstream `VERIFICATION.md` reports tests, but that is a source claim, not an
  independent verification in this review.
- The inspected sources do not supply the Looking Glass-required deterministic
  run library, immutable evidence directories, checkpoint hashes, or replay
  from a versioned build snapshot. Those are implementation work for the
  approved stage.
- The reviewed Hopf code samples finite fibers. It cannot establish the full
  continuum visually, and stereographic clipping can hide a fiber near the
  projection pole unless a line/infinity policy is declared.
- The `abacus_model.js` state, thresholds, hashed text projection, and semantic
  level names are design choices. No inspected source establishes their human
  validity, cross-scale recoverability, or improvement in coordination.
- The live observation does not establish mathematical fidelity or information
  recovery. Human understanding requires a later controlled task with
  predictions, counterexamples, and participant-agency safeguards.
