# Gate 11 candidate002 builder handoff

`G11-RECEIVER-002` is the immutable correction, build `g11-7ced826c903d40c5a0dd`, full source SHA-256 `7ced826c903d40c5a0dd6398477debdf65e1ccbd4a9260d4d0fe9556aad1fc70`. Candidate001, its blocked audit, original browser captures and failed controlled-DOM repro are preserved unchanged. The earlier candidate is recorded in `receiver-summary/FAILED_CANDIDATES.md`.

Exact restart:

```sh
cd /Users/paul/BTC-Learning/experiments/looking-glass
/opt/homebrew/Cellar/node@24/24.17.0/bin/node receiver-summary/builds/g11-7ced826c903d40c5a0dd/server.mjs --run receiver-summary/runs/G11-RECEIVER-002 --port 44004
```

Exact runtime is Node `v24.17.0` at `/opt/homebrew/Cellar/node@24/24.17.0/bin/node`. Source and copied immutable test each passed 141 assertions. The nine additional assertions exercise the actual app controller with delayed SHA-256 computation and immediate scroll, resize, inspector toggle, repair and checkpoint changes, plus per-document identity. The formerly failing receiver-change+scroll sequence now publishes `R_RELEASE` after settling. The immutable command is `/opt/homebrew/Cellar/node@24/24.17.0/bin/node receiver-summary/builds/g11-7ced826c903d40c5a0dd/test.mjs`.

The publication fix separates semantic-generation invalidation from committed snapshot revisions. A paused metadata refresh marks an in-flight semantic frame dirty without republishing the previous packet or invalidating the new frame. On commit, the app renders and measures current layout, then performs a metadata refresh if needed. Snapshot revisions remain monotonic. Events and local exports now use a random per-document ID, outside semantic fingerprints, so reloads cannot masquerade as one document.

No actual browser collection or long-lived server was run by the builder for candidate002. Independent re-audit, host browser recovery/reload/natural playback, viewport measurement and historical integrity remain pending. The software benchmark still has zero participants and makes no human detection, repair or visual-advantage claim.
