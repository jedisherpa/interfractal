# Gate 2 state, event and preservation contract

Version `gate-2-record-contract-v1`; read with `model-contract.md` and the charter. Gate 0/Gate 1 frozen inputs/builds/evidence are unchanged.

## Ownership and identity

Astra xhigh owns new `docs/gate-2/` prespecification and later synthesis. Sol builder owns `correspondence/`; a separate Sol verifier owns `audit/gate-2/`. Root owns actual browser control/evidence, stage status, approvals and host preservation. Luna owns Gate 2 primary-source gathering under `research/gate-2/`. Stage workers stop after their Gate 2 assignments; no Gate 3 work is authorized.

Candidates use `G2-HOPF-001` and monotonically increasing IDs; builds use `g2-<content-derived identity>` plus a full SHA-256 source manifest. Include executable source/assets, runtime, source revision, dependency/lockfile identity, all six prespecification file hashes, fixture/source-document hashes, initial state, canonical events/checkpoints and generated diagnostics. Declare no external dependencies/assets if true. Preserve each failed candidate with reason, and use a new run/build when code changes. Planned generated sequence is not actual browser evidence. Host local port43995 is reserved for this stage; do not modify earlier replay ports/builds.

The Run Library exposes the current candidate and frozen Gate 0/Gate 1 entries with actual run/build identity, links to results/captures and exact recovery instructions. Opening a historical run is paused and read-only with respect to its canonical files. Exploration writes only a separate append-only session log.

## Exact observable state boundaries

Required concepts can have equivalent names if the implementation README records the mapping before browser collection:

| State | Required fields |
|---|---|
| Identity | gate2, experiment/model/schema versions, run/build/full source hash, seed null, renderer, dependency identity |
| Mathematical source | S³ complex-coordinate convention; eight fixed base IDs/xyz plus optional custom base/latitude/longitude and actual surface-pick coordinates; canonical chart per fiber;128 sample IDs/phases/q/h; selected base/fiber ID, selected chart/phase/q/h |
| Representation | projection pole Q, denominator threshold, projected R³ or explicit null/status, clip radius 4, path-break/clip statuses; source coordinates retained |
| Display | camera yaw/pitch, explicit formula, viewport/DPR/viewBoxes/scales, backend, labels/depth/continuation options, camera-space and screen positions |
| Clock | integer simulation time0..24000, canonical trajectory, playing/paused, step 1000, checkpoint identity; wall timestamp separate |
| Candidate reference | current reference ID/version/wording/scope/author/criterion; rule version; full record IDs/content hashes/source provenance/history; assignments, reasons, statuses, arbitrary phase slots; preserved alternative views; selected record ID; compare/unmapped/plain-list visibility |
| Exploration | sessionID, recorded/exploration mode, explicit overrides; checkpoints clear overrides and restore canonical state |

No field in browser state confers authority or approval. No human attribution is inferred from a click. Full source and projection data must be inspectable even when the selected marker is unavailable on screen.

Define three deterministic fingerprints and document the serializer/hash algorithm. SHA-256 is mandatory for preserved file/build identity; an explicitly named deterministic internal checksum is acceptable for live state:

- **Mathematical fingerprint:** stable bases/sample IDs/q/h/P/clipping, selected base and selected physical q/h/P. Excludes camera, semantic reference, wall time, playback flags, UI visibility. Shared-phase motion changes selected q and P, while a separate base fingerprint remains unchanged. Camera or semantic-reference interventions must not alter the mathematical fingerprint. Chart compensation may cause1e-16-level selected-q roundoff; use numeric comparisons for that intervention rather than demanding exact fingerprint identity.
- **Mapping fingerprint:** reference ID/version, rule version and complete ordered assignment rows bound to immutable record IDs/content hashes. Excludes mathematical phase/selection, camera, time, UI visibility and activity log. Camera changes preserve it; switching reference changes it; switch-back restores it exactly. A separate **records fingerprint** covers complete immutable record payload/history, unchanged for every intervention.
- **Checkpoint fingerprint:** deterministic simulation time plus declared mathematical/representation/camera and canonical reference state. Excludes wall timestamps, play/pause, focus, selection styling and activity length. Restore/reload at the same time in the same build must match exactly. Chart/pole/reference exploratory states have separate evidence snapshots, not retroactively added canonical checkpoints.

Record raw numeric fields as well as fingerprints. No tolerance-based rounding may conceal implementation errors. Floating invariants use absolute 1e-10; chart/projection unavailable threshold 1e-12. Exact restoration concerns same-input reproducibility, not cross-device pixel identity. Visual acceptance requires legible identities, nonblank scenes, correctly broken infinity paths and no material clipping of the declared visible geometry; pixel equality is not required.

## Semantic event envelope

Every meaningful UI event includes ordered sequence, sessionID, run/build, event type, intended payload, wall timestamp, simulation time before/after, recorded/exploration mode, observed state/fingerprints, `actor`, and **`origin`**. App actor is `unspecified-ui` unless authenticated; root's independent trace may attribute its own actions to browser automation.

`origin` is an explicit enum:

- `manual-control`: an actual click, selection, slider, key, or other UI input, including computer-use input. This means a control operation, not a verified human actor.
- `automatic-playback`: the app's trajectory advancement or end-of-replay stop, without a new control input.
- `programmatic-restore`: initial paused load or deterministic recovery initiated by the app. A manually clicked checkpoint or Reset still has manual-control origin; its payload records the restore operation.

This repairs Gate 1's event-origin limitation only in the new Gate 2 code. Do not rewrite old logs. A replay-start click has manual-control origin; its later end pause has automatic-playback origin and reason `end-of-sequence`. Do not log every animation frame if this is impractical; advancement may be represented by an observed playback state plus exact deterministic time. Always log consequential start/pause/end/seek/selection/reference/chart operations.

| Event | Intended payload and observed requirement |
|---|---|
| `replay.open` | requested run/build; observed actual identity, paused 0, programmatic-restore |
| `playback.play` | start/resume or replay-from-start; observed playing canonical trajectory; manual-control |
| `playback.pause` | pause; stable cursor; origin manual-control, or automatic-playback with end reason |
| `playback.step` | delta1000; clamped old+1000; remains paused |
| `playback.seek` | requested integer time; observed clamp and exact state |
| `checkpoint.restore` / `experiment.reset` | checkpoint/time or0; clear exploration, restore full canonical state and expected fingerprint |
| `base.select` | stable selected base ID; corresponding full fiber highlighted and inspector updated |
| `base.surface.select` / `base.latlon.set` | actual SVG pick or requested latitude/longitude, visible hemisphere rule, normalized custom base and its complete sampled fiber |
| `fiber.select` | rendered fiber hit plus stable ID; corresponding base selected; no surrogate list-only demonstration |
| `phase.set` | gamma; exploration selected source q changes, h fixed; base identity unchanged |
| `chart.set` | requested chart; observed compensated phase and same q/h within tolerance, or explicit unavailable disabled control/model rejection with unchanged prior state |
| `camera.set` | requested yaw; exploration camera/screen changes; q/h/P and mapping unchanged |
| `reference.set` | requested reference; changed assignment/reasons only, record hashes and math/camera stable |
| `record.select` | stable record ID from loop or plain list; exact facts/provenance/reason visible |
| `references.compare` | preserved alternatives shown simultaneously, no destructive rewrite |
| `unmapped.show` / `plain.show` | reveal equivalent factual records/statuses, no mapping change |

Equivalent event names must be documented before actual trials. Browser reload is an external trace plus a new open event, not an invented app event. Record intended and observed states; errors/rejections must not be silently counted as success.

## Evidence and freeze

The pre-browser freeze hashes the charter, model, record contract, fictional fixture, reference rules and independent predictions with actual UTC time. No actual UI trial may precede it. The final gate freeze additionally binds tested run/build/canonical files, raw browser observations/events, untouched images, capture index, console scope, independent audit and the review packet. Actual observations are separate from generated expected data.

Each capture index entry includes run/build, simulation time, base/chart/phase, camera, current reference, selected record and state fingerprint as applicable. Keep original images; annotations are separate labeled derivatives. Preserve failures and changed protocol versions. Canonical input/build/prespec files must hash-identically after controls, reload and historical replay checks. The app's activity log may grow separately.

Completion is bounded mathematical/model-functional evidence and an inspectable candidate mapping. Human understanding remains untested unless Paul actually participates. Freeze Gate 2, stop workers, show its concrete packet and request Gate 3 approval; never interpret replay activity as approval.
