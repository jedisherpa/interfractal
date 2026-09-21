# Gate 2 correspondence instrument

This isolated local instrument implements the approved Hopf `S³→S²` correspondence and a separately labeled candidate attention mapping over four supplied fictional repair-event records. It does not implement Gate 3, the original four-agent study, or a formal semantic fiber bundle.

## Exact candidate and recovery

The active candidate is `G2-HOPF-003` on `127.0.0.1:43995`. Run its immutable snapshot, not the mutable source directory:

```sh
node /Users/paul/BTC-Learning/experiments/looking-glass/correspondence/builds/BUILD_ID/server.mjs
```

Replace `BUILD_ID` with the tested build ID from `runs/G2-HOPF-003/run.json`. The server uses only Node.js builtins, requires no installed package or external asset, serves snapshot assets with `no-store`, and reads the preserved run at `/api/run`. The source build command is `node correspondence/build.mjs`; it will refuse to overwrite an existing run with a changed build. `G2-HOPF-001` and `G2-HOPF-002` are preserved pre-browser candidates; see `FAILED_CANDIDATES.md`. The Library's Open current run link reloads the exact served snapshot paused at zero; the query carries the run/build identity for review.

The six-file Gate 2 prespecification was frozen at `2026-09-20T01:46:30.247897+00:00` in `docs/gate-2/PRESPEC_FREEZE.json` (SHA-256 `9edccd502697e829aac92c90a09c3e42838ba26748e888181b4dd94c35977a12`). Its file hashes are verified by the build and copied into `build.json`/`run.json`:

| Prespecified file | SHA-256 |
|---|---|
| `experiment-charter.md` | `84973cde2d9f27d30abb1ec25e7ab14e495a1774356d260bfe98777bb7c6b4f2` |
| `model-contract.md` | `e9aeaecadd27ab404efb36bac8d989fed9c95daf59ed02e9260bdf1ddcbd3e07` |
| `record-contract.md` | `f9a08dc83a55011bee057d927cd0f8e76ff60f6a39d65731230c1490d26d47eb` |
| `fictional-records.json` | `c58b2e2fe35a1bbc8995978a2efe59073c29f8cb14b445bb6b45716e4a606c36` |
| `reference-mappings.json` | `45d519af661c38b46d73bad00c179491e4c2be7ce13648a45f8e80d8c81a50d8` |
| `independent-predictions.json` | `888d718a94ca66b6980da693bb3c5277ea28a3d4040b735ec8b6df616fd9a200` |

The last two JSON files used by the browser are byte-identical copies in the runnable build. The independent predictions are not imported by the application.

## Model and display

`model.mjs` uses `q=(a,b,c,d)=(Re z1, Im z1, Re z2, Im z2)`, `h=(2(ac+bd),2(bc−ad),a²+b²−c²−d²)`, and stereographic `P=(a,b,c)/(1−d)`. Eight fixed base points each have 128 unique phase samples. The selected custom point has one additional 128-sample fiber. All full-fiber samples use the fixed canonical north chart except the south pole, which uses the south chart. Changing the selected local chart compensates phase and leaves the physical source point numerically unchanged within tolerance.

The R³ scene uses an orthographic camera: `Xc=cos(yaw)x−sin(yaw)z`, `z1=sin(yaw)x+cos(yaw)z`, `Yc=cos(pitch)y−sin(pitch)z1`, then SVG `(u,v)=(320+55Xc,210−55Yc)` in a `640×420` viewBox. Canonical yaw is 30°, pitch 20°. Finite stereographic segments are clipped against the R³ ball of radius 4. The excluded projection pole and infinity path breaks are retained in the source/inspector; boundary dots mark a clipped selected curve. A separate screen viewport may cut a 2D view; fixed fibers were checked against this `640×420` viewBox and the inspector reports the rendering policy.

The base globe is a separate fixed +Y orthographic view: `(u,v)=(320+148X,210−148Z)`. A surface click converts client coordinates through the SVG inverse screen matrix, then sets `Y=+sqrt(1−X²−Z²)` for a click inside the mathematical disk. Latitude/longitude controls can select rear points. Clicking a named marker or a rendered fiber selects the same stable base ID.

The attention mapping is derived at runtime from frozen source facts in `mapping.mjs`; the prespecified assignment table is only a test oracle. Yes/east and no/west are arbitrary categorical positions. The separate semantic SVG loops use `x=160+66cos(displayPhaseRad), y=110−66sin(displayPhaseRad)` in a `320×220` viewBox. These marker angles are display slots, not mathematical phase, time, agreement or a claim that records have circular topology. The plain table exposes the same records, facts, hashes, source/history, assignments, phase disclaimer and reasons. Weather context has no point and remains visible off-loop and in the plain table. Neither partial question decides full event feasibility.

## Replay, hashes and events

The canonical run opens paused at `t=0`, phase `2πt/24000`, with checkpoints at `0/6000/12000/18000/24000` ms. Reopening and restoring the same checkpoint in the same build reproduces its exact state hash. The run fixture and checkpoint files are generated, not actual browser observations. Later UI activity is appended only to `activity.jsonl` and does not rewrite canonical files.

SHA-256 fingerprints use UTF-8 `JSON.stringify` with deterministic insertion order and no tolerance rounding. `stateSha256` hashes the declared model/camera/reference/records with display visibility excluded; `modelSha256` hashes the full model; `geometrySha256` hashes source/base/fiber/projection data with camera and semantic reference excluded; `mappingSha256` hashes the reference definition and ordered assignments bound to record hashes; `recordsSha256` hashes full immutable records and histories. Per-record `contentSha256` values use the fixture's recursively sorted-key canonicalization as recorded in that fixture. The build manifest SHA-256 is over each source filename, NUL byte, file bytes, NUL byte in the listed order.

Each semantic UI event has an intended payload captured before redraw, before/observed summaries and hashes, wall time, run/build, sequence, session ID, actor `unspecified-ui`, and explicit origin. `manual-control` means a UI action, `automatic-playback` means the natural end pause with reason `end-of-sequence`, and `programmatic-restore` means initial load. App events are equivalent to prespecified names as follows: `base.select`, `base.surface.select`, `base.coordinate.set`, `fiber.select`, `fiber.phase.set`, `chart.switch`, `camera.set`, `attention.reference.change`, `attention.record.inspect`, `attention.compare.set`, `attention.unmapped.set`, `playback.play`, `playback.pause`, `playback.step`, `playback.seek`, `checkpoint.restore`, `correspondence.reset`, and `replay.open`. A UI actor is never inferred to be a human participant. Recorded animation frames are omitted; exact time is derived from the deterministic cursor.

The independent Node check is `node correspondence/builds/BUILD_ID/test.mjs`. It checks normalization, Hopf images, shared phase, chart transition, pole/infinity, seam, camera convention, clipping, custom latitude/longitude, source record hashes and both derived mapping tables. Actual browser controls and images are separate evidence collected after the prespecification freeze.
