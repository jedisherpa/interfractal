# Looking Glass experiment charter

Version: `gate-0-charter-v1` · Scope: Gate 0 only · Owner: Paul Cooper

This is a prespecification, not a results report. Freeze its bytes and SHA-256 before the fixed browser checks. Record actual outcomes separately in the Gate 0 packet. Implementation repairs may occur within Gate 0, with failed runs retained and any changed test definition versioned before the replacement run.

## Purpose and claims

The eventual investigation asks which properties of known four- and five-dimensional objects become inspectable or recoverable through controlled three-dimensional projections and slices, and whether a declared, revisable reference can transparently organize the same stable records across views and scales.

Gate 0 asks only: **Can Paul open a marked ordinary three-dimensional cube, watch one controlled camera movement, and inspect a saved replay that opens paused and preserves its original state and stage?** A legible working probe is evidence for a viewing/replay path. It is not evidence of higher-dimensional information recovery, human understanding, a topology of meaning, or physical extra dimensions.

Keep mathematical fidelity, information recovery under stated observations, and human understanding separate. The shared-meaning program and proposed four-agent language study remain unchanged and unexecuted here. See [scope and authority](scope-and-authority.md) and the [gate sequence](gate-sequence.md).

## Frozen probe definition

- Object: ordinary cube with source vertices `q=(x,y,z)`, each coordinate in `{-1,+1}`. IDs are `v000` through `v111`, where bits in `xyz` order select `−1/+1`. Edges join vertices differing in one bit: eight stable vertex IDs and twelve stable unordered edge pairs. Counts belong to this chosen cube, not participant or lens counts.
- Dimension: source coordinates and affine span are three-dimensional; the drawn wireframe consists of edges. The source geometry never rotates, deforms, or changes during the canonical run.
- Model-to-scene projection: identity, `p=q`. This gate has no independent shadow/slice experiment. An ordinary display camera maps the computed three-dimensional scene onto the two-dimensional screen.
- Camera: column vectors; `c=Rx(pitch) Ry(yaw) p`, so yaw is applied first. `Ry(a)(x,y,z)=(cos(a)x+sin(a)z, y, −sin(a)x+cos(a)z)` and `Rx(b)(x,y,z)=(x,cos(b)y−sin(b)z,sin(b)y+cos(b)z)`.
- Canonical movement: `pitch=π/9`; `yaw(t)=π/6+(π/6)t/20000` for `0≤t≤20000` milliseconds. Display projection is orthographic: screen-model coordinates `(c_x,−c_y)`. Fixed scale and screen center translate these to pixels. Record the actual scale, viewport, and center; no fit-to-content rescaling during the sequence.
- Clock: simulation time is explicit and deterministic. Manual Step advances exactly 1,000 ms, clamped to 20,000 ms. Checkpoints are 0, 10,000, and 20,000 ms. A playback scheduler can select the current simulation time; camera state is evaluated directly from that time, never by accumulating frame-dependent rotation deltas.
- Backend: declared Canvas2D or SVG fallback, with no external dependency required. Record the backend actually used. This experiment need not prove WebGL support or claim equivalence with a WebGL renderer.
- Display: stable point labels, a selected point or other non-color identity cue, visible stage/run/build/time/status, readable controls, no glow, trails, decorative jitter, perspective distortion, or automatic source motion. Depth cues must be documented and must not change coordinates.
- Reference label: “Can this ordinary cube be viewed and replayed faithfully?” is the current task question. It is not an attention mapping, group commitment, or geometric force.
- Initial historical replay: paused at `t=0`. Opening, replaying, stepping, scrubbing, or exploring cannot authorize Gate 1. Live camera exploration is labeled separately and can reset to the saved sequence.

## Independently derived checkpoint expectations

For `v111=(1,1,1)`, applying yaw gives `(cos(a)+sin(a),1,cos(a)−sin(a))`. Applying the fixed pitch gives the following camera coordinates. The expectations were calculated directly from those equations, independently of the probe implementation. Numeric checks use absolute tolerance `1e−10` per coordinate; serialized numeric equivalence may use the same tolerance when exact float bytes are not specified. Canonical state hashes must match exactly under one serialization/build.

| Time (ms) | Yaw (radians) | Expected camera x | Expected camera y | Expected camera z |
|---:|---:|---:|---:|---:|
| 0 | 0.5235987755982988 | 1.3660254037844386 | 0.8145045597227190 | 0.6859715142820884 |
| 10,000 | 0.7853981633974483 | 1.4142135623730950 | 0.9396926207859084 | 0.3420201433256688 |
| 20,000 | 1.0471975511965976 | 1.3660254037844388 | 1.0648806818490980 | −0.0019312276307507 |

The screen-model y-coordinate is the negative of the camera y-coordinate. Pixel comparison tolerates ordinary font/rasterization differences; it must show the same labeled geometry at the same checkpoint without material clipping, blank rendering, or a misplaced selected point. Do not claim exact cross-browser pixel identity.

## Fixed checks

All checks use the cube, equations, fixed renderer settings, and one versioned run above. The source model remains fixed; only the declared display-camera state or playback cursor may change. The observation available to the investigator includes the actual UI, inspector coordinates, semantic control log, checkpoint states/hashes, and original browser captures. An investigator with access to coordinates is checking the instrument, not taking a blinded comprehension test.

### G0-P01 — Reachable scene and declared backend

**Question and alternatives:** Does the supported viewing surface load a visible cube for Paul? Alternatives include a working local preview, an agent-only endpoint, a blank/error renderer, or a mislabeled backend.

**Intervention and controls:** Open the actual preview/run entry point through the host-supported browser. Hold the source, camera at `t=0`, paused clock, build, scale, and viewport fixed. Record the browser surface, URL, backend, viewport, and exact run/build identity.

**Expected and adverse result:** The saved run opens paused; the cube, labels, controls, and stage are visible, and the host supports showing that local browser surface to Paul. A blank scene, inaccessible entry point, unexpected autoplay, clipping that hides the object, or unverified viewing arrangement counts against the proposed working path.

**Classification and captures:** Capability/UI correctness, not human usability efficacy. Capture `S0-initial` at `t=0`; inspect the actual image. The capture must identify its run and state.

**Decision:** Pass only when actual browser loading and the supported user-facing arrangement are evidenced. Fail for visible rendering/control defects. Inconclusive if the scene loads for the agent but user-facing reachability cannot be established. Stop progression if no watchable scene/replay can be delivered; report the concrete blocker.

### G0-P02 — One camera change and fixed cube identity

**Question and alternatives:** Does the displayed movement follow the declared camera path while the ordinary source cube remains fixed? Alternatives include source deformation, changed scale, mislabeled vertex identity, or incorrect camera computation.

**Intervention and controls:** Start the saved sequence through the real UI, pause/scrub to 10,000 ms and 20,000 ms, and inspect `v111`. Hold source coordinates, edge set, source-to-scene identity projection, pitch, scale, effects, and build fixed. Compare the numerical camera values with the independent table above.

**Expected and adverse result:** The same eight vertex IDs and twelve edges persist, all source coordinates remain unchanged, yaw takes the declared checkpoint values, and `v111` agrees within `1e−10`. A different source coordinate, missing edge/ID, scale drift, or discrepancy above tolerance counts against fidelity. Perspective-driven apparent changes are excluded by orthographic display.

**Classification and captures:** Narrow code/rendering correctness. Capture `S1-midpoint` at 10,000 ms and `S2-final` at 20,000 ms, visibly paused for inspection. The discriminating observation is a changed projected arrangement with stable source records. Crossings/occlusion can be ordinary projection effects and must be described without claiming source intersections.

**Decision:** Pass the numeric portion only from actual tested output; pass the visible portion only after inspecting captures. Fail when either declared behavior is contradicted. Inconclusive if coordinates or rendered state cannot be linked to the run. Stop and preserve the failed run before fixing a substantive mismatch.

### G0-P03 — Pause, step, seek, and restore

**Question and alternatives:** Do the controls select deterministic states, or does uncontrolled clock motion/incorrect UI state change the replay?

**Intervention and controls:** Use UI controls to start playback and Pause; compare two readings while paused separated by at least one second of wall time. Restore checkpoint zero, Step once, Scrub to 10,000 ms, and Reset to checkpoint zero. Keep source/build/projection/camera formula unchanged; record intended control values and observed states separately.

**Expected and adverse result:** Paused simulation time and camera coordinates stay unchanged; Step yields exactly 1,000 ms; Scrub selects exactly 10,000 ms; checkpoint restoration returns the canonical `t=0` state/hash. Pause lag, a moving state while paused, an incorrect time, or a coordinate/hash discrepancy is an adverse result. Wall timestamps need not match across sessions.

**Classification and captures:** Playback/interaction correctness. Reuse `S1-midpoint` only if it belongs to the same fixed run and actual control sequence; capture any decisive anomaly separately. Log all control observations even when no extra image is required.

**Decision:** Pass all declared state checks; fail a contradicted transition. Inconclusive when the UI provides no inspectable state. Stop to preserve and repair a faulty essential control before calling the replay path complete.

### G0-P04 — Saved historical replay and reload

**Question and alternatives:** Does the saved run reproduce its checkpoints with the tested build after reload, or is replay merely a new animation evaluated by changed code?

**Intervention and controls:** Open the Run Library entry or saved replay link afresh; verify paused `t=0`, then replay/seek through all three checkpoints. Reload the page, repeat a checkpoint restore, and compare canonical states/hashes against the original. Keep build identity, run data, source, camera formula, and scale fixed; record any viewport difference.

**Expected and adverse result:** The preserved build/run opens paused, produces matching checkpoint states, and links to actual screenshots/results. A missing run, autoplay on historical opening, mismatching build, changed checkpoint, or undocumented replay-data substitution counts against reproducibility.

**Classification and captures:** Replay reproducibility. Capture `S3-replay` at the 10,000 ms checkpoint after reopening; visually compare with `S1-midpoint`. No exact pixel-identity claim is required, but state identity and absence of material visual drift are required.

**Decision:** Pass only on an actual fresh UI replay and matching states; fail a divergence. Inconclusive if the preserved build or original state is missing. Stop and report inability to recover historical evidence rather than regenerating a success record.

### G0-P05 — Evidence immutability, exploration, and gate boundary

**Question and alternatives:** Can controls or camera exploration silently alter the saved run or advance stages? Alternatives are read-only review, mutable history, or an unintended approval/stage side effect.

**Intervention and controls:** Hash the canonical saved run/build evidence, record stage/approval status, then open/replay/seek, use Look around, and reset to the recorded sequence. Re-hash the same artifacts and re-read stage/approval status. Keep file list/hash convention fixed. New UI review logs, screenshots, and explicit result records may be saved outside the canonical immutable run; they must not overwrite its inputs.

**Expected and adverse result:** Canonical saved bytes remain unchanged; stage remains Gate 0 with no Gate 1 approval; camera exploration is labeled as exploration and reset restores saved state. Changed canonical bytes, an approval generated by automation, a next-stage action, or exploration falsely presented as the original is adverse.

**Classification and captures:** Evidence integrity and interaction correctness. The event log and pre/post file hashes are the decisive evidence; capture any wrong stage or unlabeled exploration. A screen image alone cannot prove immutability.

**Decision:** Pass only with before/after verification. Fail on any unauthorized stage mutation or evidence overwrite. Inconclusive if the baseline hash is absent. Stop immediately on a stage boundary violation and preserve the evidence.

### G0-P06 — Inspectable control and visual limits

**Question and alternatives:** Is the cube/replay inspectable with visible text and manual controls, or do presentation choices hide essential state?

**Intervention and controls:** Inspect all four actual captures, exercise keyboard-accessible controls where supported, check stable labels/non-color cues, and verify manual stepping and a reduced-motion path. Hold the same cube and build; record the viewport and actual tested interaction modality. No participant response is manufactured.

**Expected and adverse result:** No blank scene or materially hidden controls; labels/run/state are readable at the tested viewport; movement can be paused and stepped without mandatory autoplay. Obscured identity, unreachable controls, unintended effects, or confusing status are adverse. Individual labels may overlap briefly in projection; record the consequence and provide inspector access rather than jittering the geometry.

**Classification and captures:** Investigator visual inspection and limited usability observation, not a human-study outcome. Use `S0`–`S3` and annotate observations in prose while preserving original captures.

**Decision:** Pass only the interactions actually exercised. Fail a material obstruction to the replay task. Mark untested accessibility/browser conditions as untested, not passed. Inconclusive for subjective understanding without a participating viewer. Stop for a blocker report if no usable review path can be made within the bounded repair loop.

## Execution and stop rule

Root freezes this charter before fixed browser tests, records the actual preview/build/run, and uses computer use for load, control, capture, and replay. Unit/model checks supplement that UI evidence. Two to four inspected original captures enter the concise packet; keep any decisive failure as well. A short video is supplementary only if genuinely recorded by a supported mechanism.

Normally allow an initial variant and up to two justified revisions. Preserve failures, identify a defect as model/renderer/interaction/interpretation, make the smallest warranted repair, and rerun the affected check plus the relevant counterexample. Do not redefine a prediction after seeing a failure. A documented inconclusive or blocked outcome can complete Gate 0 review.

Before presentation, stop stage workers and freeze evidence. Provide the actual replay link opening paused, “watch this” moments, captures, expected/observed/interpretation/unresolved table, changes and failed-run links, and the concrete Gate 1 proposal. Then ask Paul: **“Please watch the probe replay. Do you approve Gate 1: the 3D-to-2D calibration and model/replay checks?”** End work at that boundary. Replay review does not authorize advancement.
