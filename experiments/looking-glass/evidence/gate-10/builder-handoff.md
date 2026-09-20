# Gate 10 builder handoff

Candidate `G10-PREDICT-001` is retained with source SHA-256 `6a81e6f6965f96cee454a0fe26e9a4130b14ccb0d95a9f123f7fe9b4841e21c4` and build `g10-6a81e6f6965f96cee454`. A post-freeze self-review found that a resize or scroll could publish an active snapshot using the last interval cursor rather than a fresh clock value. It remains unchanged as the first candidate.

Candidate `G10-PREDICT-002` corrects that active snapshot path: every publish while playing advances the single tour clock before cloning semantic/ledger state; stale asynchronous hash completions are discarded. Its source SHA-256 is `464bfe21ad6044378996d53fc89e897a750472019f2f163fc2acd0b78aced158`, build `g10-464bfe21ad6044378996`, and run `G10-PREDICT-002`. It also makes the copied immutable test runnable from its build directory; no private files gained public routes.

Exact runtime: `/opt/homebrew/Cellar/node@24/24.17.0/bin/node`, version `v24.17.0`. Restart:

```sh
cd /Users/paul/BTC-Learning/experiments/looking-glass
/opt/homebrew/Cellar/node@24/24.17.0/bin/node prediction-transfer/builds/g10-464bfe21ad6044378996/server.mjs --run prediction-transfer/runs/G10-PREDICT-002 --port 44003
```

Builder source and immutable candidate002 tests each passed 183 assertions. The exact immutable test command is `/opt/homebrew/Cellar/node@24/24.17.0/bin/node prediction-transfer/builds/g10-464bfe21ad6044378996/test.mjs`. Candidate002 ephemeral HTTP on port44014 returned `200` for `/` and `/run/checkpoints.json`, `404` for direct private key, double-encoded traversal and absent review artifact. A session/start/commit/reveal sequence returned `[201,201,201,201]`; the commit was ungraded and target-free, and the deliberately revealed T02 O1 grade was correct with reveal sequence after commit sequence. Port44014 was stopped. No 44003 server or actual browser collection was started by the builder.

DOM controls: `#play`, `#pause`, `#previous`, `#next`, `#checkpoint`, `#replay`, `#reopen`, `#inspect`, `#case-select`, `#practice-open`, `#practice-close`, `#start`, `#new-attempt`, radio inputs `name="draft"`, `#commit`, `#skip`, `#reveal`, `#hide-result`, `#export-ledger`, `#export-events`, and `#retry`. Published complete JSON is in `#inspector`; actual explicit export text is in `#export-output`. The target status begins at `#target-withheld`. Snapshot JSON contains both payloads, both hashes, `snapshotRevision`, viewport and rendered card rectangles.

Known limit: builder checks cover model/service and HTTP behavior, not actual browser control dispatch, layout capture or independent source/model audit. The saved tour and inspector redact previous target/grade; a local explicit ledger export can include only this software session's deliberately revealed answers and is disabled in saved-tour mode. There are zero participants and no tested human learning or transfer.
