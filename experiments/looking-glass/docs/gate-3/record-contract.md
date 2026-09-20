# Gate 3 state, events and preservation

Version `gate-3-record-v1`. Read with the mathematical contract and charter. Files under earlier Gate 0, Gate 1 and Gate 2 freezes remain immutable, including their known failures and qualifications.

## Ownership and identity

Astra xhigh owns new `docs/gate-3/` specifications and later evidence synthesis. Sol builder owns `hypercube/`; a separate Sol verifier owns `audit/gate-3/`. Root owns browser actions, actual evidence, host preservation, status and approval records. Luna owns bounded primary-source review under `research/gate-3/`. No worker starts Gate 4.

Use `G3-TESSERACT-001` and monotonically increasing candidate IDs. Build identity is `g3-<content-derived-id>`, backed by a full SHA-256 source manifest. Each candidate records actual base revision/uncommitted-source identity, runtime, dependencies and lockfile or explicit absence, renderer, model/generator/schema versions, seed null, all four prespecification hashes, canonical source/build files, initial state, events and five checkpoints. Any changed code gets a new preserved candidate and build; never relabel failed bytes as successful. Generated planned replay/checkpoint data are not actual browser observations. The local preview port is 43996, confirmed free by root before implementation.

The Run Library exposes current and historical run/build identities, paused opening, Replay from start, Pause, Step, Scrub, Reset to checkpoint, results and captures. Links to earlier gates use their actual tested builds and existing ports. App activity belongs in a separate append-only exploration/session record and cannot rewrite canonical replay data or approve a stage.

## Required observable fields

Equivalent implementation names are acceptable if their mapping is documented in `hypercube/README.md` before browser collection.

| Boundary | Required state |
|---|---|
| Identity | gate 3, experiment/model/schema/generator versions, run/build/full source SHA-256, runtime/dependency identity, renderer, seed null |
| Source | ordered 16 IDs/full q values; ordered 32 edge IDs/endpoints; marked A/B and edge IDs; selected point/edge IDs; solid/boundary/skeleton/affine-span distinctions |
| Transform | column convention, x–w plane, theta, full R, fixed P, composition order, all q′ and raw 3D p values |
| Projection status | coincident ID groups, projected edge lengths and collapsed status; source records retained; no jitter; no clipping expected for fixed canonical view |
| Display | yaw/pitch, camera and screen formula, viewBox/scale/center, per-point camera/screen positions or selected equivalents, renderer and labels/depth/trail/reduced-motion options |
| Environment | freshly measured viewport CSS width/height, DPR and actual scene bounding rectangle at every snapshot; event or responsive resize refresh must update inspector values |
| Clock | integer time 0..32000 ms, canonical angle path, play/pause, 1000 ms step, checkpoint identity; separate wall timestamp |
| Exploration | session ID, canonical/exploration mode, explicit source/camera overrides; restoring a checkpoint clears overrides and restores canonical selection/options |
| Observability | chosen observation times/angles, opaque matched IDs, observed p, known matrices, rank/tolerance/nullspace/status, solver-only inputs, reconstructed q, post-solve truth comparison, residuals; fixed/camera-only negative condition |

The viewport values must be measured from current browser state, not cached initialization values. The independent capture index additionally records actual original-image dimensions. If either disagrees, preserve and report the mismatch; do not silently replace it with a guess. Inspector JSON and tables must wrap or scroll in a bounded panel without widening the entire page.

## Deterministic state and numeric comparisons

Document the exact serializer, field inclusion and hash algorithm. Preserved source/file identity uses SHA-256. Live deterministic fingerprints may use an explicitly named checksum.

- **Source fingerprint:** immutable ordered IDs, full source q and all edge endpoints; unchanged under every intervention.
- **Projection fingerprint:** theta, R/P, ordered q′/p plus coincidence/collapsed-edge status. It changes with source rotation and is invariant under camera, selection and clock-only changes at identical angle.
- **Checkpoint fingerprint:** integer simulation time, source/projection state, camera, canonical selected point/edge IDs and declared display options. Exclude environment viewport/DPR/scene rectangle, wall timestamps, activity length, focus, transient highlight, play/pause and recovery diagnostics. Environment is still recorded beside every fingerprint.

Compare all numeric model/reconstruction values with absolute `1e-10`, preserving raw values. Fixed comparisons require matching actual viewport/scene rectangle/scale/camera. Exact restoration comparisons use the same browser, same build, same checkpoint. Node-generated fingerprints are supporting diagnostics and cannot be used as the exact browser-hash oracle because trig results may differ by tiny ULP amounts. Capture a browser checkpoint baseline first, then compare actual restores/reload against that baseline. Visual acceptance concerns legibility and faithful geometry; exact cross-device pixels are not required.

## Event envelope

Every consequential event records ordered `seq`, `sessionId`, `runId`, `buildId`, `type`, intended `payload`, `wallTimeUtc`, `simTimeBeforeMs`, `simTimeAfterMs`, canonical/exploration `mode`, observed state/fingerprints, `actor`, and **`origin`**. App actor is `unspecified-ui` unless authenticated; root's independent trace may identify its own computer-use actions.

Origins are `manual-control` for actual UI input (including computer use), `automatic-playback` for automatic progression/end stop, and `programmatic-restore` for initial paused load or app-driven deterministic restoration. Manual-control is not a human-attribution claim. A clicked Reset/checkpoint remains manual-control; payload records restoration. A playback-start click is manual-control; its later end pause is automatic-playback with reason `end-of-sequence`. Sampling every frame is optional; consequential events and observed deterministic times are mandatory.

| Event | Intended payload and observed behavior |
|---|---|
| `replay.open` | Requested and actual run/build; paused canonical zero; programmatic-restore |
| `playback.play` | Resume or replay-from-start; explicit canonical trajectory; manual-control |
| `playback.pause` | Stable cursor; manual-control or automatic-playback plus end reason |
| `playback.step` | +1000 ms, clamped to32000, paused; manual-control |
| `playback.seek` | Requested integer time and observed clamping/exact state |
| `checkpoint.restore` / `experiment.reset` | Time/checkpoint or zero; clear overrides; restore full canonical state |
| `source.rotation.set` | Requested x–w angle; exploration override, same camera/time/source IDs, paused |
| `camera.set` | Requested ordinary yaw/pitch; exploration override, unchanged q/q′/p/theta/time, paused |
| `vertex.select` / `edge.select` | Stable ID, selection method and ambiguous-hit candidates if relevant; exact source and projected data shown |
| `observability.compare` | Fixed view, camera-only or known0+90 condition; actual solver inputs/status/rank/results |
| `display.options.set` | Labels/depth/trails/reduced-motion/inspector changes and recorded options |

Equivalent event names may be documented before trials. Reload itself is an independent browser-trace action followed by a fresh app open event. Intended actions that miss, are unavailable or reject must be retained and cannot be counted as successful controls.

## Evidence, freeze and boundary

`docs/gate-3/PRESPEC_FREEZE.json` binds these four files with real UTC timestamp and SHA-256 hashes: `experiment-charter.md`, `model-contract.md`, `record-contract.md`, `independent-predictions.json`. Freeze before actual browser trials; do not change the frozen files to match later results. A material changed question requires an additional version and deviation record.

Actual evidence is stored separately under `evidence/gate-3/`: original screenshots, capture index, observed state/event extracts, visual notes, actual control trace, console-error scope, results and final review packet. Every capture identifies run/build/time/angle/camera/selected IDs/options/checkpoint fingerprint, fresh actual viewport/DPR/scene rectangle, original-image dimensions and capture timestamp. Generated expected data and actual observations remain labeled separately.

The final freeze also binds all tested source/build/canonical replay files, independent audit, preserved failures, actual browser evidence and review packet. Hash historical Gate 0/1/2 artifacts before/after. Open at least the Gate 2 historical entry through the visible Run Library and inspect its run/build identity. Earlier limitations remain part of their historical interpretation. All workers finish after Gate 3 evidence; the final concrete packet requests Gate 4 approval and the turn ends. No replay activity grants that approval.
