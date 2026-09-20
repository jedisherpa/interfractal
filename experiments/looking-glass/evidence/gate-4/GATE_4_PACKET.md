# Looking Glass — Gate 4 review

**Gate 4 is a qualified instrument result: the analytic slice, bounded ambiguity, stored 3D counterexample and saved replay checks pass after one preserved metadata correction.**

The analytic slice changes from a solid ball to one point and then to an empty set while the full projection remains a unit ball. A known slice distinguishes the two declared hidden-center candidates. A saved 3D trace reproduces the prescribed projection movie, so movie appearance alone does not identify a higher-dimensional origin. Human understanding was not tested.

Open the **[paused Gate 4 replay](http://127.0.0.1:43997/)** or the **[visual results](http://127.0.0.1:43997/evidence/gate-4/results.html)** in the visible Codex browser on this Mac. This is a local preview, not permanent hosting.

| Replay identity | Value |
|---|---|
| Run / build | `G4-SLICES-002` / `g4-38777d5882ef08a6` |
| Full source SHA-256 | `38777d5882ef08a63abf15da00d664e3c2036826029c4ba2cea5ab7c8640ff14` |
| Stored 3D trace SHA-256 | `98eb91dd0b4deb5e91ff4adae91e083773d9ac7f9a07be8951a77145c9f33139` |
| Base revision | Gate 3 commit `144abb15c3252f0ef6a2dbd2d3c45333ecf6aaef` |
| Runtime / renderer | Node `v24.17.0`, built-ins and SVG; no packages, lockfile or external assets |
| Primary model | `x²+y²+z²+w²≤1`, slice `w=s`; fixed projection `P(x,y,z,w)=(x,y,z)` |
| Fixed view | Yaw 30° / pitch 20°, scale 80 SVG units per model unit, viewBox 640×420; no automatic rescaling |
| Saved sequence | 40 seconds, `s:0→1.25→0`; 100 ms model samples; exact 0/8/16/20/24/32/40 s checkpoints; opens paused |

## Watch this

1. At **0 s**, the slice and projection are both unit balls. Click **Replay from start** below the scenes. The slice shrinks, disappears and returns while the full projection stays the same size. The playback controls require scrolling at 1280×720.
2. Use **16 s** to inspect **one location**, a point with radius zero. Use **20 s** to inspect **EMPTY · NO POINTS**. The point marker is a locator symbol; the empty slice has no object marker. **8 s** shows the interior radius `√3/2`.
3. Scroll to **Two source balls, one initial view**. **Initial slice w=0** is the same for centers `w=+0.5` and `w=−0.5`. **Known slice w=+0.5** gives a unit ball for the first and one point for the second. An ordinary camera change cannot resolve the initial equality.
4. In **A stored 3D animation makes the same movie**, both paths agree on the saved sequence. At 20 s click **At 20s: set known source turn to −90°**. The analytic center becomes `(+0.5,0,0)` while the fixed recording remains at `(−0.5,0,0)`. **Return to saved turn** restores agreement. This rejects that fixed recording under the changed control; an adaptive 3D model could still agree.

## Expected and observed

The [four-file prespecification](http://127.0.0.1:43997/evidence/gate-4/review/PRESPEC_FREEZE.json) was frozen at `2026-09-20T03:23:06.699443Z`, before browser trials. The [charter](http://127.0.0.1:43997/evidence/gate-4/review/EXPERIMENT_CHARTER.md), [independent audit](http://127.0.0.1:43997/evidence/gate-4/review/AUDIT.md) and [primary-source review](http://127.0.0.1:43997/evidence/gate-4/review/SOURCE_REVIEW.md) preserve their different roles: predictions, implementation/evidence verification and mathematical source support.

| Question | Expected | Observed | Interpretation | Unresolved / limits |
|---|---|---|---|---|
| T01–02: Is the slice faithful and separate from projection? | Radius `√(1−s²)` inside; one point at `|s|=1`; empty outside. Full projection stays radius 1. | Independent oracle covers 11 analytic cases and seven checkpoints; exact-model audit covers 33 source/plane cases plus nine rejected nonfinite inputs. Actual positive/negative slice controls and all seven checkpoints agree with the equations. | Supports this analytic closed-ball slice and its strict classification. The sphere curves depict the solid slice's boundary. | Numerical tolerance is `1e−10`; classification has no epsilon band and occurs before rounding. A tiny positive radius can be visually unresolved while remaining labeled solid. |
| T03–04: What does the known slice add? | The pair `c∈{−0.5,+0.5}` has identical projection and `s=0` slice. At `s=+0.5`, plus is a unit ball and minus a point. | Actual initial, camera-yaw 120°, known-plane and return controls produce the prescribed equality/distinction; source definitions remain fixed. | The known slice distinguishes the two members of this declared candidate class. | This is forward comparison with known candidates/plane, not arbitrary shape reconstruction or a blinded viewer task. |
| T05–06: Can a 3D recording reproduce the movie? | All 401 frames match at 100 ms intervals. At 20 s, changing only the model's source angle to −90° creates raw center distance 1. | The independently checked immutable 3D-only trace has maximum frame error 0. Actual common-camera comparison agrees; the held-out control gives `(+0.5,0,0)` versus `(−0.5,0,0)`, then restores agreement. | The selected movie has an explicit 3D representation. The held-out intervention rejects this fixed, unresponsive trace. | Equality is for the declared 10 Hz samples. Adaptive 3D alternatives remain possible. Raw 3D coordinates were inspected; pixels were not inverted into source coordinates. |
| T07: Is playback and recovery reproducible? | Stable pause; 1000 ms step; seek rounding/clamping; active empty and return intervals; exact checkpoint restores and automatic end. | Actual 8050→8100 ms seek, endpoint clamps, pause/step and all seven repeated checkpoint hashes agree. Uninterrupted replay includes active empty at 22500–22600 ms and return at 32000–32100 ms, then pauses at 40000 ms with `automatic-playback` / `end-of-sequence`. Run Library reopen and reload restore the same-browser hashes exactly. | Known motion and exact manual boundary checkpoints are distinct, complementary observations. | A 100 ms point frame was not claimed caught during live playback. Exact recovery is within the same browser/build; it is not cross-device pixel identity. |
| T08–09: Are metadata, artifacts and history reliable? | Fresh viewport/DPR/scene measurements; bounded page width; exact preserved source/trace and earlier gates. | Candidate 001 failed initial DPR freshness. All 90 final observations have fresh metadata and bounded page width across 1280×720, 1280×900 and 960×720. All 415 prior frozen entries remain unchanged. | The failure remains preserved alongside the corrected candidate. | The inspector requires deep vertical scrolling. Paused/manual controls were exercised; no OS reduced-motion emulation, human learning or video result is claimed. |

The final independent audit passes **7/7 browser state/image checks, 7/7 activity/restoration checks, 8/8 build checks and 11/11 read-only route checks**. The closed core contains **90 final-candidate observations, 57 saved UI events across three sessions and 14 final originals**; both candidates total 128 observations and 21 originals. All capture dimensions match their recorded viewport conditions. The [core closure](http://127.0.0.1:43997/evidence/gate-4/core-evidence-closure.json) binds the actual records, and all 27 listed files/images passed byte integrity.

The 3D-only trace reader, source/build identities, invalid inputs and isolation of camera, primary slice, movie angle and inspector state are independently checked. The recorded browser console is empty. Model inputs, computed raw sets, display camera and simulation time remain separate records.

## Four original captures

These are unmodified originals, inspected during synthesis and linked to before/after states in the [capture index](http://127.0.0.1:43997/evidence/gate-4/capture-index.json). The final point and empty comparisons use the same actual 1280×720 viewport, camera, scale and scene framing. The ambiguity view is a separately recorded scroll position.

### 16 s — a point is one location

![Final candidate at 16 seconds: one labeled location in the slice and a full unit-ball projection](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-4/screenshots/002-C1-point-16s.jpg)

`G4-SLICES-002`, `s=1`, radius 0. The fixed-size locator marks a singleton; it is not a positive-radius ball.

### 20 s — the slice is empty

![Final candidate at 20 seconds: EMPTY NO POINTS in the slice, while the projection remains a full unit ball](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-4/screenshots/002-C2-empty-20s.jpg)

`G4-SLICES-002`, `s=1.25`, radius `null`. The slice object is absent; axes remain as display guides. The full projection is unchanged.

### A known slice distinguishes the declared pair

![Final candidate ambiguity comparison: the known w equals positive one-half plane produces a unit ball for ball-plus and one point for ball-minus](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-4/screenshots/002-C3-ambiguity-known-plane.jpg)

The initial slice radii are both `√3/2`. With the same known plane `w=+0.5`, the paired outputs become radius 1 versus one point. This is a distinction inside the stated two-candidate class.

### Preserved failure — candidate 001 startup metadata

![Preserved first-candidate center view from the initial DPR metadata failure](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-4/screenshots/001-C0-center-0s.jpg)

The image preserves the failed trial's visual context; the failure itself is numerical metadata. Its bracketing observations 2–3, and initial observation 1, record **inspector DPR 2 versus actual browser DPR 1**. The [preserved outcome](http://127.0.0.1:43997/evidence/gate-4/candidates/G4-SLICES-001/outcome.json) and [raw candidate observations](http://127.0.0.1:43997/evidence/gate-4/candidates/G4-SLICES-001/browser-observations.json) retain the mismatch.

Additional originals: [final center](http://127.0.0.1:43997/evidence/gate-4/screenshots/002-C0-center-0s.jpg), [held-out movie disagreement](http://127.0.0.1:43997/evidence/gate-4/screenshots/002-heldout-movie.jpg), [active shrinking slice](http://127.0.0.1:43997/evidence/gate-4/screenshots/002-active-interior-library-replay.jpg), [active empty interval](http://127.0.0.1:43997/evidence/gate-4/screenshots/002-active-empty.jpg), [active return](http://127.0.0.1:43997/evidence/gate-4/screenshots/002-active-return.jpg), [common-camera movie comparison](http://127.0.0.1:43997/evidence/gate-4/screenshots/002-movie-common-camera.jpg), and [fresh scrolled inspector](http://127.0.0.1:43997/evidence/gate-4/screenshots/002-inspector-fresh-scrolled.jpg). The first uninterrupted replay has active empty and return captures bracketed at 22500–22600 and 32000–32100 ms. A second uninterrupted Run Library replay supplies the clearer shrinking-slice original at 8600–8700 ms and an active empty observation at 21300 ms; its next observation was already the natural 40000 ms end, not an observed return. These are separately identified trials; an atomic capture timestamp is not invented.

## Changes and preserved failure

- **Candidate 001 / `g4-1a289997d9829f9c`:** its initial inspector retained DPR 2 after the actual browser reported DPR 1. Later explicit rendering refreshed it, but startup freshness failed. The bounded run stopped before the full playback trial; its 38 observations, seven original images, actual events, source and canonical replay remain preserved.
- **Candidate 002 / `g4-38777d5882ef08a6`:** adds a resolution-query listener, a first-paint refresh window and passive 250 ms environment remeasurement. The new run ID and documentation/tests changed accordingly. The frozen mathematics, scoring, renderer geometry, seven checkpoints and 3D trace bytes remained unchanged.

This used one correction within the allowed initial-plus-two-revisions budget. Missed helper/locator attempts are retained in the first candidate's outcome; they were not counted as successful controls. All 415 frozen entries from Gates 0–3 remain unchanged. The actual Gate 3 library link opened the correct paused `G3-TESSERACT-003 / g3-6c31bc16aeca4460`, verified through DOM/accessibility and exact served run bytes. One native new-tab screenshot attempt failed; the [historical review](http://127.0.0.1:43997/evidence/gate-4/history-browser-review.json) preserves that limitation and no historical screenshot is claimed.

## Limits, provenance and recovery

The 4D solid, its 3D slice, its 3D full projection, the 2D spherical boundary of each nondegenerate 3D slice and its drawn guide curves, and the final 2D screen are different objects. The drawn curves are one-dimensional. Actual world pixels are not raw numerical 3D observations. These checks establish only the declared equations, two-candidate distinction and replay behavior. They do not establish human comprehension, arbitrary image reconstruction, visual superiority over a plain table, or a physical fourth dimension. Source review supports definitions; it does not validate implementation or learning.

Actual worker routing is recorded in [execution provenance](http://127.0.0.1:43997/evidence/gate-4/execution-provenance.json): Astra xhigh for specification/synthesis, Luna high for primary-source gathering, Sol high for implementation and a separate Sol high worker for independent verification. Root performed supported browser actions and evidence preservation. These are software-agent roles, not human expert or participant reviews.

Inspect the [raw browser observations](http://127.0.0.1:43997/evidence/gate-4/browser-observations.json), [action trace](http://127.0.0.1:43997/evidence/gate-4/browser-action-trace.json), [immutable 3D trace](http://127.0.0.1:43997/runs/G4-SLICES-002/movie-3d.json) and [saved checkpoints](http://127.0.0.1:43997/runs/G4-SLICES-002/checkpoints.json). Planned fixtures and actual observations are explicitly separate.

If the preview stops, restart this exact tested snapshot:

```sh
node /Users/paul/BTC-Learning/experiments/looking-glass/slices/builds/g4-38777d5882ef08a6/server.mjs
```

Then reopen [the paused local replay](http://127.0.0.1:43997/). The local service is not guaranteed to persist indefinitely; its tested source, canonical states and numeric trace are preserved.

## Next named decision

**Gate 5: two additional coordinates in 5D** is not approved or started. Its proposed deliverables are a 32-vertex/80-edge 5D hypercube with independent x–w and y–v rotations, conditional rank-five coordinate recovery with an unresolved-v counterexample, and analytic 3D ball slices under two independent constraints. Preserve this Gate 4 replay.

Please review **G4-SLICES-002**. Do you approve **Gate 5**, want revisions to **Gate 4**, or want to pause? Replay controls and this static results page cannot grant approval.
