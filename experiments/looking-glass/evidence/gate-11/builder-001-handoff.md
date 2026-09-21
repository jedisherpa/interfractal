# Gate 11 candidate001 builder handoff

Frozen candidate `G11-RECEIVER-001`, build `g11-4a38606632d77897a06e`, full source SHA-256 `4a38606632d77897a06e1d261a2251e3965e048d7d13e451be738d15d5b21ddf`. Exact Node executable `/opt/homebrew/Cellar/node@24/24.17.0/bin/node`, version `v24.17.0`. The prior Gate0–10 files and prespec/audit files were not edited by the builder.

Exact restart (the explicit `--run` is required):

```sh
cd /Users/paul/BTC-Learning/experiments/looking-glass
/opt/homebrew/Cellar/node@24/24.17.0/bin/node receiver-summary/builds/g11-4a38606632d77897a06e/server.mjs --run receiver-summary/runs/G11-RECEIVER-001 --port 44004
```

Source and copied immutable tests each passed 132 assertions. They cover the pure receiver's strict schema, statuses and input isolation; all eight repair subsets across four worlds; full-source answers; collisions, source hashes, immutable revision variants; seven checkpoints; diagram/plain information parity; and a controlled-DOM first-use receiver→witness→two-field repair→plain→export path. Test command: `/opt/homebrew/Cellar/node@24/24.17.0/bin/node receiver-summary/builds/g11-4a38606632d77897a06e/test.mjs`. A short isolated HTTP probe returned `[200,200,200,404,404,404]` for `/`, `/receiver.mjs`, `/run/checkpoints.json`, undeclared docs, double-encoded traversal and absent review results, respectively; POST `/` returned405. Its temporary port44024 was closed. Port44004 was not started by the builder.

Critical visible selectors: `#receiver` (choose `R_RELEASE` immediately), `#world`, `#witness-open`, `#witness-pair`, `#source-open`, `#repair-checkboxes` (checkbox values `calibration`, `authorization`, `paint`), `#apply`, `#representation` (diagram/plain), `#revision`, `#certificate-open`, `#export`, `#export-output`, `#inspector`, and `#inspector-details`. Tour controls are `#play`, `#pause`, `#previous`, `#next`, `#checkpoint`, `#replay`, `#reopen`. The published inspector JSON contains complete `semanticPayload`/`semanticFingerprint`, `informationPayload`/`informationHash`, payload hash and measured viewport/scene.

Important limits: these are builder software checks, not the independent implementation audit or actual browser acquisition. Actual first-use controls, legibility, natural 24-second stop, metadata measurements after export/scroll, and historical integrity remain for the host and separate auditor. All four worlds and answers are public; no participants or human detection, repair, learning or diagram-advantage result is claimed.
