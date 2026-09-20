# Gate 0 cube viewing probe

Run `G0-CUBE-005` uses the frozen source snapshot `builds/g0-d85237ad31362768/`. Launch it from the repository root:

```sh
node experiments/looking-glass/probe/builds/g0-d85237ad31362768/server.mjs
```

Open `http://127.0.0.1:43991/` in a supported browser surface. The server binds only to `127.0.0.1` and exits if port `43991` is unavailable. The historical run opens paused at time zero. Use **Replay from start**, **Pause**, **Step +1s**, the time slider, and checkpoint buttons to examine it. **Look around** is a separate exploration view; replay restores the original saved path.

To verify the saved model and build:

```sh
node experiments/looking-glass/probe/test.mjs
```

The build script hashes source bytes and creates an immutable copy before any meaningful browser test. It will not overwrite a run if its source hash changes. Dependencies are Node built-ins only, with no lockfile or external assets. `G0-CUBE-001` was frozen before an automated file-hash check found a build-manifest defect. `G0-CUBE-002` passed the automated checks but independent review found cache and activity-log issues before any browser capture. `G0-CUBE-003` passed its checks but the frozen test script could not locate run data when executed from its snapshot. These three are pre-browser candidates. `G0-CUBE-004` was browser tested and revealed that Look around could reset its own slider value before applying the requested yaw. Its saved run and browser evidence remain preserved.

Saved data is in `runs/G0-CUBE-005/`: `run.json`, `initial-state.json`, `events.jsonl`, and `checkpoints.json`. The server serves these through read-only `/api/run`, `/api/events`, and `/api/checkpoints` routes. Browser actions append to the separate `activity.jsonl` through `/api/activity`. Each entry has a session ID, actor category, sequence number, semantic event type, intended change, before/observed state and simulation time, UTC wall timestamp, run ID, and build ID. The activity log does not modify the saved run. The gate evidence index is `../evidence/gate-0/run-evidence.json`, exposed at `/api/evidence`; its screenshot links may use `/evidence/gate-0/<filename>`.

The renderer is SVG 2D computed from a 3D cube and an ordinary display camera. The inspector reports whether a WebGL context can be created in the actual browser; WebGL is never used to render this probe. The source cube has eight stable vertices and twelve stable edges. Source coordinates stay fixed. Camera yaw moves from 30° to 60° over 20 seconds at fixed pitch 20°, orthographic scale 138 SVG px/unit, with no automatic scaling. State checkpoints at 0, 10, and 20 seconds can be recomputed from `model.mjs`.

This probe is limited to Gate 0. It does not evaluate 4D or 5D structures or human interpretation. Browser captures and visual review are separate required evidence.
