# Gate 10 candidate003 builder handoff

The final permitted candidate is `G10-PREDICT-003`, build `g10-9e34f791d83c1cd7a495`, full source SHA-256 `9e34f791d83c1cd7a495bec3371470fddebd6ad96205e957dc635d9404dc22f4`. Immutable candidates001 and002, the candidate002 blocked audit, and its repro logs are unchanged.

Candidate003 reserves start and commit request IDs with their canonical payloads before awaited logging. Identical overlapping requests join the first result; conflicting reuse returns409 without an extra attempt or commit. A ledger export response is bound to its starting epoch, mode and session; restored canonical state cannot receive a late answer-bearing export. UI API acknowledgements and rejections now have source-informed API actor/provenance. Play-from-local and boundary-Pause capture event fingerprints after the preceding restoration/clock transitions.

Exact restart, with the required explicit run path:

```sh
cd /Users/paul/BTC-Learning/experiments/looking-glass
/opt/homebrew/Cellar/node@24/24.17.0/bin/node prediction-transfer/builds/g10-9e34f791d83c1cd7a495/server.mjs --run prediction-transfer/runs/G10-PREDICT-003 --port 44003
```

Exact Node is `/opt/homebrew/Cellar/node@24/24.17.0/bin/node`, `v24.17.0`. Source and copied immutable test each passed 206 assertions. The test includes a controlled minimal-DOM clock harness for Play-from-local, boundary-Pause and API event provenance, plus a deferred `/api/export` response delivered after Reopen saved. Its command is `/opt/homebrew/Cellar/node@24/24.17.0/bin/node prediction-transfer/builds/g10-9e34f791d83c1cd7a495/test.mjs`.

The formerly failing direct overlap assertions passed in the immutable test. The separately isolated HTTP overlap probe passed on port44027: identical starts returned201/200 with one attempt, conflicting starts201/409, identical commits201/200 with one receipt and one accepted commit. See `builder-003-http-probe.json`, `builder-003-http-probe.mjs` and redacted `builder-003-api-actions.jsonl` in this directory. The probe supplied an isolated log path, so it did not touch the future host browser log. Its server was closed. Port44003 was not started by the builder.

Remaining limits: these are builder software checks, not an independent audit or actual browser observation. The blocked candidate002 findings need independent candidate003 recheck before browser evidence. There are zero participants and no human learning or transfer claim.
