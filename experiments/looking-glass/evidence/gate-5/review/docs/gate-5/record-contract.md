# Gate 5 state, events and preservation

Version `gate-5-record-v1`. The actual user approved Gate 5, “Two additional coordinates in 5D.” Root records the original message and reviewed Gate 4 identity separately. Historical approval language stays unchanged. No record, replay or agent can approve Gate 6.

## Identity and ownership

Astra xhigh owns the four specification files and freeze; Sol owns implementation under `five-dimensional/`; a separate Sol worker audits; root owns actual supported browser use, originals, approval/status and final preservation; Luna owns bounded primary-source gathering. Scope is Gate 5 only, without a human study, deployment, spending or external messages.

Base revision is `231780872da982cb87b54f004c287a078d26839b` on `codex/looking-glass`. Candidates begin `G5-PENTERACT-001` and increment for each preserved revision; builds use `g5-<content-derived-prefix>` backed by full SHA-256 manifests. Root verified local port 43998 free and 556 historical frozen entries unchanged. Preserve all existing Gate 0–4 files, including failures and images. A new candidate never replaces code under an old build/run ID. Maximum budget is the initial candidate and two justified revisions.

Each candidate binds actual base revision/patch, runtime/dependencies or explicit absence, renderer, model/schema/generator versions, seed null, four specification hashes, initial state, planned canonical events, nine checkpoint states/hashes, source manifest, baseline pin/validation, observation matrices/solver outputs and slice cases. Generated fixture data are labeled expected, never observed UI. Record actual roles and settings.

## Required inspectable state

Equivalent field/event names are permitted with their exact mapping documented in `five-dimensional/README.md` before browser collection.

| Boundary | Required data |
|---|---|
| Identity | Gate/run/build/full source SHA-256, model/schema versions, backend, runtime, seed null |
| Source | Ordered 32 full 5D vertices and 80 edges; marked/selected IDs; immutable source fingerprint |
| Rotation | α/β separately, Rxw/Ryv/R and order, canonical/override state; full rotated 5D coordinates |
| Projection | P, raw 3D p for every ID, groups/collapsed edges, projection fingerprint |
| Camera | Yaw/pitch, camera/screen formula, screen centers/depth and declared draw options |
| Comparator | Computed 4D label, 16 vertices/32 edges, Gate 3 source pin, α-only rule with β ignored, coordinates/groups/metrics |
| Observability | Raw observations, known matrices, opaque IDs, rank 3/4/5 modes, nullspace/underdetermined status, recovered coordinates, residuals and separately evaluated truth error |
| Slice | Known s/t, raw radicand, strict kind/radius/center, separate overrides, equal-radius pair/results, full projection reference |
| Tasks | T1/T2 ID and route stage, actual inspect/angle actions, counts separated by action category; raw and 2D metrics with units/rules |
| Clock | Quantized 0..40000 ms, 100 ms quantum, 1000 ms step, checkpoint/mode/playing; separate wall timestamps |
| Environment | Actual viewport/DPR, viewBox/scale/center, fresh bounding rectangles/visibility, scroll position and options |

Every observation refreshes browser measurements; also refresh on resize, scroll, toggle, resolution/DPR changes and initial paint. Reuse Gate 4's robust DPR listener and passive periodic refresh rather than retaining startup DPR. Environment is excluded from deterministic hashes but saved with actual observations. Hidden scenes have truthful visibility and rectangles. Capture index retains actual original dimensions independently; mismatches and failed captures remain disclosed. Page width stays ≤ clientWidth+1 CSS px at tested viewports. Details can use vertical scrolling. Primary playback and rotation controls should be visible near the top; measure actual placement.

## Fingerprints and restoration

Document serialization and algorithms. File identity uses SHA-256; a disclosed live checksum can be used with its collision limitation. Source fingerprint binds immutable ordered geometry/version. Rotation fingerprint binds angles, R and rotated coordinates. Projection fingerprint binds P and raw 3D observations. Comparator fingerprint binds its α-only source/projection; β-only actions leave it unchanged. Slice fingerprint binds source equation, s, t, radicand, kind and radius/center. Camera changes leave these raw fingerprints unchanged.

Checkpoint fingerprint binds simulation time, mode, overrides, raw source/rotation/projection/comparator/slice/observability state, deterministic task state, selected IDs, camera and declared display options. Exclude environment, scroll, wall time, playing flag, event history/counters, focus/hover, session ID and diagnostics. Actual action logs and counters remain historical evidence: do not clear them to fake a restore, and exclude them from the checkpoint hash. Restore all included state, including default selection/task stage, slice (0,0), camera 30°/20° and options. Angle exploration is independent of the saved clock.

Establish all nine baselines in the actual browser. Repeated restore, library reopen and reload compare exactly with the same-browser/build baseline. Node hashes are diagnostics, not cross-runtime exact oracles. Raw numeric comparison uses 1e−10. Equal geometry at different times may have different hashes because time is included.

## Append-only semantic activity

Each consequential event has monotonic seq, sessionId, runId, buildId, type, intended payload, wallTimeUtc, simTimeBeforeMs, simTimeAfterMs, mode, observed state/fingerprints, actor and origin. Actor is `unspecified-ui` unless authenticated. Root's separate trace identifies its automated input; do not attribute it to Paul. Origins are `manual-control`, `automatic-playback` and `programmatic-restore`.

| Event | Required intent and result |
|---|---|
| replay.open | Requested/actual run/build, paused canonical zero, programmatic-restore |
| playback.play | Manual-control; resume or replay-from-start intent and overrides behavior |
| playback.pause | Manual-control or automatic-playback; automatic endpoint reason exactly `end-of-sequence` at 40000 ms |
| playback.step | Requested +1000 ms, actual clamped cursor, paused |
| playback.seek | Requested, clamped and rounded actual time and state |
| checkpoint.restore / experiment.reset | Requested checkpoint/full canonical restore; manual-control when clicked |
| source.rotation.set | Requested α or β and actual pair; other angle/camera/time/slice fixed; paused exploration |
| camera.set | Requested/actual camera; raw state/time/slice unchanged |
| slice.set / slice.preset | Requested s/t, actual pair/kind/radius; hypercube/time/camera unchanged |
| observation.compare | Known view set, actual observations/matrices/rank and recovered or underdetermined result |
| task.reset / task.inspect | Task ID, target 4D/5D, route stage/roster/metrics and real session source-action count |
| display.options.set | Options and refreshed environment metadata |

Controls can share event types if intent and field-level changes remain explicit. Replay must not fabricate task actions. Physical tool calls, successful semantic mutations, scrolls and failed attempts are distinct categories; root retains them in its trace. Event counts are not human timing or efficacy. Reload is independently recorded. Automatic stop and manual Pause remain distinguishable. OS reduced-motion preference is claimed tested only if actually emulated; paused/manual controls are tested regardless.

## Evidence and stop boundary

`PRESPEC_FREEZE.json` binds all four files and baseline pin with actual UTC before any Gate 5 browser trial. Builder and auditor consume the frozen versions. Predictions use independent equations without builder imports/outputs. Material changes to hypothesis, score or scope require versioned review. Ordinary implementation repairs retain the failed candidate and unchanged prespecification.

Root preserves observations, semantic activity, action trace, untouched original images/capture index and failed captures. Each original links to run/build, before/after state, checkpoint/exploration, viewport/DPR/rectangles and time. During playback, bracket capture time with readings rather than invent atomic exactness. Generated/edited illustrations cannot substitute for browser evidence. Inspect images for clipping, labels, overlaps, controls and point/empty meaning separately from numerical tests.

Final packet provides a paused replay/build identity, watch guide, two–four inspected originals including decisive failures, question/expected/observed/interpretation/unresolved table, candidate history, independent audit, source limits and recovery instructions. Freeze actual evidence and verify all 556 prior entries again. Finish stage workers and stop after the Gate 5 packet; root requests the next named stage decision. No Gate 6 research, preparation or implementation while awaiting it.
