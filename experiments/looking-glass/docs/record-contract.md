# Looking Glass state and record contract

Version: `gate-0-record-contract-v1` · Scope: ordinary cube probe and its evidence

This contract distinguishes the immutable experimental record from a mutable playback cursor and an optional new exploration. Exact field names may be mapped by the implementation before the fixed run; the Gate 0 packet must document that mapping and the actual files. A source/build pin and checksum establish identity, not mathematical correctness.

## Ownership and paths

| Path under `experiments/looking-glass/` | Owner in this Gate 0 team | Contents |
|---|---|---|
| `inputs/` | Root, preserved copies | User-supplied prompt and research package; do not rewrite |
| `docs/` | Astra orchestrator/synthesis | Charter, record contract, gate sequence, scope/authority |
| `research/` | Luna source gathering | Primary-source notes, URLs, access limits, actual revision pins |
| `probe/` | Sol implementation | Dependency-free probe, static server, runnable versioned build/source snapshots, canonical run fixtures, checks |
| `evidence/gate-0/` | Root | Browser captures, control observations, before/after evidence hashes, independent audit, frozen packet |
| Root `README` and durable gate/status files | Root | Entry point, recovery instructions, stage/approval state, freeze index |

The separate Sol verifier must not approve their own implementation. They inspect the pinned candidate and derive at least one expected result independently. Only Paul authorizes the next gate. Root resolves any proposed cross-owner edit before it occurs.

## Model and state

The exact model, camera equations, IDs, duration, and checkpoints are in the [charter](experiment-charter.md). Separate these records:

1. **Source definition:** cube generator/version, full `xyz` coordinates, edge IDs, dimension 3; no randomness (`seed: null`). Source transformation is identity and source-to-scene projection is identity.
2. **Canonical experimental state:** model identity, simulation time, camera yaw/pitch and projection/scale, clipping policy, display options, selected stable ID, relevant renderer configuration. Gate 0 has no slice, higher-dimensional rotation, semantic map, or sampled Hopf fiber; mark such fields `not applicable` or omit with that explicit schema meaning.
3. **Playback session:** paused/playing status, wall-clock scheduler information, current cursor, browser viewport, current control operation. Playback status does not alter cube coordinates at a fixed time.
4. **Exploration session:** camera changes made outside the canonical sequence. Give this a separate session ID/status. Never replace the historical initial state, events, or checkpoints.

Treat source coordinates, projected scene coordinates, camera-space coordinates, screen-model coordinates, and pixel coordinates as distinct. Store viewport, scale, and center so a pixel discrepancy can be separated from a source/camera discrepancy. A resized viewport may move screen center or change a declared responsive layout; it must not be reported as the same pixel condition without recording it.

## Run manifest: required information

| Group | Required contents |
|---|---|
| Identity | Stable `runId`; Gate 0; experiment/test/schema versions; hypothesis/question; creation time in UTC; status such as fixture/candidate/tested/frozen |
| Provenance | Repository base SHA; exact tested source/build ID and SHA-256 manifest; source snapshot; dirty patch if needed; runtime/version; dependency/lockfile identity or explicit no-dependency declaration |
| Source | Cube generator version; all coordinates/IDs and edges or lossless deterministic generator; dimension; seed; source transform order |
| Representation | Identity source-to-scene projection; orthographic camera formulas; yaw/pitch schedule and units; scale/center; backend; depth cues; viewport; clipping; display options |
| Sequence | Initial state; duration/step; ordered canonical sequence/events; deterministic simulation times; checkpoints with states and/or canonical hashes |
| Observation | Actual UI-control session log with intended/observed states; numeric assertions with expected/actual/tolerance; captured console errors or explicit scope of console observation; screenshots and investigator observations |
| Review | Protocol deviations; failures/fixes; independent audit identity/remit; unresolved claims; frozen packet checksum and exact reviewed run/build IDs |

Do not label a generated fixture as an observed browser run. A deterministic fixture can be the immutable input to a tested run; the actual control session, captures, and results must establish execution. Do not invent timestamps, actor identities, console checks, video, or approvals.

## Semantic events and observations

The UI records meanings, not only mouse coordinates. Required event meanings are:

| Event | Intended payload | Observed confirmation |
|---|---|---|
| `replay.open` | Saved run/build ID | Paused `t=0`, actual run/build/state identity |
| `playback.play` | Start/resume current saved cursor | Playing status, simulation time and subsequent state |
| `playback.pause` | Pause current cursor | Stable paused time and camera state |
| `playback.step` | `deltaMs:1000` | New time is clamped old time + 1000; evaluated state |
| `playback.seek` | Target simulation time from Scrub | Actual clamped time and evaluated state |
| `checkpoint.restore` | Named checkpoint/time | State/hash equal to canonical checkpoint |
| `camera.set` | Yaw/pitch requested by Look around | Exploration status and changed camera; source unchanged |
| `probe.reset` | Return to saved start/sequence | Paused saved state; exploration discarded as cursor state only |

Equivalent names are acceptable when documented before collection. Each logged operation includes an ordered sequence number, event kind, intended payload, wall timestamp, simulation time before/after, observed state or state hash, actor category (`browser-automation`, `human`, `automatic-playback`, or `unspecified-ui`), session ID, and referenced immutable run/build. Use `unspecified-ui` when the app cannot authenticate the actor. Root may attribute a known test session to `browser-automation` through its external computer-use trace; subsequent browsing remains unspecified without evidence. Browser automation cannot label itself human.

When a UI action is automated, the browser action trace and its observed state can complement the in-app log; do not claim an in-app event was recorded if only an external trace exists. An automatic tour must be started through the real UI and identified as such. Separate recording time from simulation time. Do not insert approval/stage-advance events into this control contract.

## Checkpoints, hashes, and replay

- Canonical checkpoints are at 0, 10,000, and 20,000 ms. Their state excludes wall time, event-history length, transient focus/hover, playing/paused flag, and other UI-only bookkeeping. It includes every variable affecting experimental geometry or declared rendering semantics.
- Define one canonical serialization (for example stable sorted object keys and fixed representation of all recorded numbers) and hash its UTF-8 bytes with SHA-256. Record the exact serializer/version. If the implementation uses a different documented checksum for state, retain it as a state check and still use SHA-256 for evidence/build identity.
- Numeric comparisons use `1e−10` absolute coordinate tolerance; the same preserved build/serializer should reproduce exact checkpoint hashes. Record raw observed values rather than only booleans.
- Snapshot the actual runnable source/build and required assets. A dependency-free build explicitly records that no lockfile/external packages are required; it does not invent a lockfile.
- Historical replay must resolve to the preserved build, not a mutable current source directory. Run data must identify that build. Serve the local snapshot read-only. Reopening begins paused, and the Run Library offers Replay from start, Pause, Step, Scrub, and Reset to checkpoint.
- Preserve old candidate/failed run directories. A repair receives a new build ID and a new observed run ID. Never replay old events through changed code and call that the original result.
- Compare pre/post canonical artifact hashes around replay and exploration. Append new review evidence elsewhere; do not update a frozen run's bytes merely to record that it was viewed.

## Screenshots and other evidence

Capture genuine browser images at initial, midpoint, final, and replay midpoint. Filenames or an adjacent index bind each original to `runId`, `buildId`, simulation time, checkpoint, viewport, and capture wall time. The reviewer must open/inspect images and describe blank rendering, crossings, occlusion, clipping, labels, hidden controls, or relevant drift. Screenshot existence alone is insufficient.

Keep originals untouched. Any annotated copy is separately labeled. A video is optional supplementary evidence only when actually recorded. Coordinate assertions and state hashes carry numerical claims; captures carry the limited visual observations they actually show. A screenshot cannot prove file immutability, human comprehension, source dimension, or next-stage approval.

## Durable stage and approval state

Persist `currentGate:0`, stage status, last successful observed run/build (or null), current packet identity, blockers, next permitted action, and approval state. Before review, status is in progress or blocked; after the packet freezes it is awaiting Paul’s Gate 1 decision. No script, worker, replay event, or browser automation can grant that decision.

When Paul actually responds, root records the exact user response, source of the response, reviewed packet/run/build IDs, named approved next gate, and scope. Silence and picture enthusiasm are not approval. On resume, reconcile stored state with the real conversation. Reopen the same preserved replay if waiting; do not start a later gate. A localhost preview has no promised indefinite lifetime, so the root README must give the exact restart command and saved-run URL.
