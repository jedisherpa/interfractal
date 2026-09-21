# Gate 6 · connected fictional local models

This directory contains the approved Gate 6 instrument. Its Hall and Field contexts, receiver requirements, dependencies, proposed references and summary revisions are AI-authored synthetic derivatives of four unchanged Gate 2 fictional records. The original Gate 2 reference definitions and mapping rows remain available. A relation drawn between cards expresses only its stated type and evidence; placement has no metric, causal or authority meaning. The narrow receiver screens listed venue and required-equipment costs, capacity and explicit obligations. Equipment availability and complete event feasibility remain unknown. There are no participant results or human understanding measurements.

Build after the five-file `docs/gate-6/PRESPEC_FREEZE.json` is present:

```sh
node local-models/test.mjs
node local-models/build.mjs
node local-models/builds/<printed-build-id>/server.mjs
```

Open `http://127.0.0.1:43999/` in a supported browser. The build uses Node.js built-ins and browser HTML/SVG, with no package, lockfile, external asset or random seed. `build.json` records complete SHA-256 for all eleven source files, the frozen Gate 6 prespec SHA-256 and file hashes, the two exact Gate 2 byte pins, Git base/HEAD, Node version and dependency identity. A content-derived `g6-…` ID names each immutable snapshot. `G6-LOCAL-001` is the initial candidate; a changed source requires a new build and new candidate run ID. At most two justified candidate revisions follow, with earlier builds and runs preserved. The built server serves its own copied assets and the matching run, rather than a changing source directory.

## State and controls

`model.mjs` is a pure deterministic model over the four Gate 2 records, two reference tables and Gate 6 derivative fixture. The saved sequence is 0–30 seconds at 100 ms resolution, with a one-second step and checkpoints at 0, 5, 10, 15, 20, 25 and 30 seconds. Canonical 0, 10 and 30 seconds have the same semantic state; time makes their checkpoint hashes distinct. An interval holds its left checkpoint state. The page opens paused at zero and pauses automatically at 30 seconds. Every checkpoint restore or reset clears exploration controls; actual activity history remains append-only.

| Visible control | Canonical state or observed event | Boundary |
|---|---|---|
| Capacity ≥60 / Existing access | `reference.set` | Changes the independent larger reference, outward criterion and mapping fingerprint; local retained references and original mappings stay fixed. |
| ≥60 · ≤8 / ≥70 · ≤8 | `requirement.set` | Selects receiver@1 or derivative receiver@2 and its summary binding; no Gate 2 record or reference changes. |
| Compressed / Repair detail | `summary.set` / `summary.repair` | Selects v1 outward omission or v2/v3 source-backed obligations. v1's receiver result is `insufficient-summary`. |
| Local objects / Plain table | `representation.set` | The same model and operations with different presentation; table entry actions match card actions. |
| Select / Expand on a card or table row | `local.select`, `local.expand`, `local.collapse` | Selection and visibility only; a collapsed local remains recoverable with exact records and history. |
| Inspect selected budget trace | `trace.inspect` | Requires selection and expansion; shows hire, equipment, cost and evidence for that local. |
| Compare reference alternatives | `references.compare` | Shows both complete, differently attributed questions and original mapping rows without inferring consensus. |
| Show relation claims / choose link | `claims.show`, `relation.inspect` | Separates the supported shared-weather source relation from the unsupported Hall→Field transfer claim. |
| Close placement | `layout.set` | Changes layout only; supported links, receiver result and semantic fingerprints stay fixed. |
| Replay, Play/Pause, ±1s, scrub, checkpoint buttons | `playback.*`, `checkpoint.restore` | Run clock and canonical restore. Replay is a real UI action. Natural end uses `playback.pause` with `automatic-playback` origin and `end-of-sequence` reason. |
| Source and inspector disclosures | `display.toggle` | Exposes complete records, mappings, histories, state and per-boundary hashes. |

The app records observed UI events in `runs/<run-id>/activity.jsonl` through the local server. Each has session, sequence, run/build identity, actor `unspecified-ui`, explicit origin, intent payload, before/after times and fingerprints, plus current environment measurements. `events.jsonl` is separately and clearly labeled **planned fixture**, never browser evidence. The exact state inspector supplies the raw semantic and full state alongside fingerprints. Hashes use SHA-256 of UTF-8 `JSON.stringify` on the named boundaries; source records and local manifests additionally retain their original recursively sorted canonical content hashes. Environment, wall clock and activity are excluded from deterministic checkpoints. UI fingerprint comparisons are established in the same browser/build; generated hashes are diagnostics across runtimes.

For the prespecified route N1, restore checkpoint zero, choose a representation, select Field, expand it, inspect its budget trace, then repair summaries. For N2, restore the same baseline, show claims and select the unsupported transfer. Record setup, navigation, correction, scrolling, physical tool calls and failed attempts separately. Expected route counts are three navigation plus one correction for N1, and two navigation for N2, in either mode. Browser observations determine actual counts; the predicted counts are not a human-effort claim.

The run library links to the frozen Gate 2 and Gate 5 replays and exposes the current run, checkpoints, observed activity, evidence and results. To recover this Gate 6 preview after a local server stops, run the **exact** `node local-models/builds/<build-id>/server.mjs` command displayed by the Run Library, then reopen the local URL. Serve the built snapshot for evidence collection. Source files are for development; `builds/` holds immutable executable snapshots and `runs/` holds preserved candidate fixtures and append-only browser activity. Gate 7 is outside this directory's authority.
