# Gate 1 ordinary cube calibration

`G1-CUBE-003` is a 40-second deterministic source turn. It opens paused at 0 seconds with a fixed 30° yaw and 20° pitch display camera. The left pane is a view of the rotating 3D cube; the right pane is its camera-independent 2D shadow. `v110` and `v111` are two source corners initially merged in shadow. Source turn and Look around are separately labeled explorations; checkpoint restore or Reset returns to the saved run.

Build the candidate before browser inspection:

```sh
node experiments/looking-glass/calibration/build.mjs
node experiments/looking-glass/calibration/test.mjs
```

The build command prints the content-addressed snapshot path. Start the server from that `builds/g1-*/server.mjs` snapshot, then open `http://127.0.0.1:43994/`. The prespecified port 43993 was occupied by an unrelated local service, so this candidate uses 43994; the deviation is recorded with Gate 1 evidence. It binds only to this Mac and exits if the port is unavailable. The Gate 0 historical replay remains `http://127.0.0.1:43991/` from its separate frozen build. The server uses Node built-ins only, with no lockfile, packages, or external assets.

The canonical deterministic fixture is in `runs/G1-CUBE-003/`; its `events.jsonl` entries are labeled `planned-fixture`, not browser observations. Actual UI operations append to separate `activity.jsonl` with `kind:observed-ui`, session ID, actor category `unspecified-ui`, wall timestamp, intended action, before/observed state, and two SHA-256 fingerprints. Root's external browser trace can attribute its own actions to automation. `geometrySha256` excludes time, camera, and UI metadata; `stateSha256` covers the complete model state at an exact simulation time, including display camera and pane mapping. JSON.stringify is the deterministic serializer. A SHA-256 source manifest pins every executable file. Overlap grouping uses Euclidean tolerance `1e-10` only to group coincident projected sites/segments; raw model coordinates are not rounded or snapped.

The evidence index, when present, is `../evidence/gate-1/run-evidence.json`, served at `/api/evidence`; original captures and results are served under `/evidence/gate-1/`. The Run Library link to Gate 0 targets its preserved local port. Opening or controlling either replay is evidence review, not stage approval.
