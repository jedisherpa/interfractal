# Gate 1 state, event, and preservation contract

Version: `gate-1-record-contract-v1`. Read with `experiment-charter.md`. This adds Gate1 records without rewriting Gate0 artifacts.

## Ownership and immutable identity

| Paths | Owner / role |
|---|---|
| `docs/gate-1/` | GPT-6 Astra xhigh: pre-browser specification, independent analytic predictions, later synthesis |
| `calibration/` | GPT-5.6 Sol: Gate1 implementation, generated fixture/run data and runnable snapshots |
| `audit/gate-1/` | Separate GPT-5.6 Sol: independently derived checks and evidence-backed audit |
| `evidence/gate-1/`, project status/README, approval files, Git and host/browser operations | Root coordinator |
| Existing `probe/`, `docs/` Gate0 files, `evidence/gate-0/`, `inputs/` | Preserved historical/input bytes; no Gate1 writes |

Candidates use `G1-CUBE-001`, then monotonically increasing run IDs; builds use `g1-<content-derived identity>`. Record the full SHA-256 source manifest, not only the display prefix. A build ID covers all executable source/assets and recovery code. Runs identify exactly one runnable snapshot and preserve their deterministic initial state, sequence, checkpoints and results. No dependencies/assets may remain unpinned; explicitly declare when there are no external packages or assets.

The generated canonical fixture is a planned deterministic input until actual UI execution is recorded separately. Manifest statuses must not invent browser observations. Preserve failed candidates and record why they were replaced. A changed source file produces a new snapshot/run; never call a replay through changed code historical evidence.

Serve Gate1 on local port43993 from the tested immutable snapshot. Gate0 stays at port43991 using `g0-d85237ad31362768`. The Run Library must expose the current Gate1 replay and the historical Gate0 entry, with actual build/run IDs and access to results/screenshots. Exact route and restart command belong in the implementation README and final packet.

## State boundaries

| State | Required fields / meaning |
|---|---|
| Model/source | Gate1, 3D ordinary wire cube, generator/version, seed:null, stable IDs, `originalSource` xyz, original edges |
| Source transform | Plane x–z, column-vector sign convention, theta radians, transform order (one rotation), `rotatedSource` xyz |
| Mathematical shadow | P selecting x′,y′; exact `shadow` xy; grouped site IDs and collapsed/coincident edge membership with tolerance1e-10 |
| Ordinary display camera | yaw/pitch radians, explicit orthographic formulas, camera-space xyz, screen-model xy; never used to compute the mathematical shadow |
| Pane/display mapping | fixed viewBox, scale and center; screen coordinates and SVG coordinates distinguishable; actual viewport/DPR, backend, clipping/depth styling |
| Canonical simulation | t integer ms in[0,40000], deterministic angle schedule, checkpoints0/10000/20000/30000/40000, step1000 |
| Mutable playback/exploration | play/pause, cursor, camera/source overrides, selected IDs, session ID, wall-clock scheduling; clearly separate from immutable sequence |

Keep `originalSource`, `rotatedSource`, `shadow`, camera-space and display/screen values separate in model state/inspector. Equivalent implementation names must be documented before browser collection. Two separate fingerprints are required:

- A **geometry fingerprint** includes IDs, original and rotated source coordinates, source angle/transform, projection, shadow and edge identities. It excludes simulation time, camera, viewport, selection, wall time, playback and event bookkeeping. Camera-only intervention must leave it unchanged. t0 and t40000 should share geometry, although their simulation times differ.
- A **checkpoint state fingerprint** includes simulation time, geometry and declared camera/render state. It excludes wall time, playing/paused, focus and activity length. Restoring the same checkpoint from the same preserved build must reproduce this fingerprint exactly. t0 versus t40000 are compared as geometry, not expected to have identical full-state fingerprints.

Use a documented deterministic serializer. Record raw numeric values with tolerance assertions, and SHA-256 for evidence/build files. If an internal state checksum differs from SHA-256, name its algorithm explicitly. Do not snap observed coordinates to expected predictions to conceal error. Coincidence grouping tolerance can be documented separately from exact checkpoint serialization.

## Semantic event contract

Every meaningful UI operation records ordered sequence, session ID, immutable run/build, event type, intended payload, wall timestamp, simulation time before/after, exploration/recorded mode, and observed state/fingerprints. Actor is `unspecified-ui` unless authenticated; root can separately attribute its own control trace to `browser-automation`. No browser event is a human approval.

| Semantic event | Intended payload / observed result |
|---|---|
| `replay.open` | Requested saved run/build; observed paused t0 and actual identity |
| `playback.play` | Start/resume saved sequence; observed playing and advancing deterministic cursor |
| `playback.pause` | Requested pause; observed stable cursor and coordinates |
| `playback.step` | deltaMs1000; observed old+1000 clamped to40000 |
| `playback.seek` | Requested scrub time; observed clamped integer time/state |
| `checkpoint.restore` | Checkpoint/time; observed canonical camera/source state and matching fingerprint |
| `source.rotation.set` | Requested theta; observed exploration, changed source rotation/shadow, camera unchanged |
| `camera.set` | Requested yaw; observed exploration, changed source-view camera/screen, geometry/shadow unchanged |
| `calibration.reset` | Return to saved start; observed paused t0, canonical source/camera restored |
| `selection.set` | Stable source vertex/edge ID(s); observed identity/inspector change only |

Exact event names may differ if a mapping is recorded before browser testing. A reload can be evidenced by external browser trace plus new replay.open event; do not invent an in-app reload event. Automatic playback events are identified as such. The browser control trace complements the in-app log; neither should claim events the other never recorded.

## Evidence and freeze

Root preserves actual control observations, before/after hashes, runtime/viewport, captures, console observations with their actual scope, and independent audit. Capture index entries bind untouched originals to run/build/time/source/camera. An append-only activity/evidence directory may grow without changing the saved canonical input. Keep the canonical initial-state/events/checkpoints files byte-identical during replay/exploration/reload.

The final freeze identifies charter/predictions/contract hashes, exact candidate source/build/run hashes, raw observations, images, independent audit and packet. Record actual UTC freeze times; a checksum establishes identity, not correctness. Stage status is Gate1 awaiting Paul's Gate2 decision after completion; only an actual new user message can approve Gate2. Root retains exact recovery instructions and the last successful replay if the host later stops.
