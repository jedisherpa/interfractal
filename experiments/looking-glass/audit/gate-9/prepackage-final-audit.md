# Gate 9 final independent prepackage audit

**PASS: package the reviewed mutable source as `G9-MATCHED-003` without functional changes.** This pass applies only to the exact nine-file [review-3 snapshot](../../evidence/gate-9/prepackage-drafts/review-3/SNAPSHOT.json). The [machine-readable audit](prepackage-final-audit.json) records every SHA-256 and byte count. Candidate 003 did not exist when these checks ran. Implementation packaging, HTTP checks, actual browser controls, images, and the full historical archive check are still pending.

| Reviewed source | SHA-256 |
|---|---|
| `core.mjs` | `381c36bb50b5cc44ba45161ad0b34e92bb0c80602af479fd905b58205432d83f` |
| `engine.mjs` | `8c029cbfe25cc5ca70e4c10b6337f87af61aa964d881b3b3533ef80e35d3a92e` |
| `app.mjs` | `c6c401ccee576aaeba40746638c80c2e121f971bacbed4e831ec915b274a2cfc` |
| `test.mjs` | `aa7242a6acc2cebc73ae77a05c8897c3330654ab5fd91427e919008a9b6a26c6` |

The prior [first blocked audit](prepackage-audit.md) and [second blocked audit](prepackage-correction-audit.md) remain unchanged as failure history. I reran the original reproduction into [new output](prepackage-final-original-repro.json): all nine exact trace routes, context/trace/information hashes, duplicate and insufficient cases, actual accepted choice-event references, parent trace identity, completed endpoint equality, state-replacement fingerprints, invalid query and direct jump rejection, immutable old registry, tour interruption, and manual completion now pass. The builder's expanded model test independently reports nine routes, 12 canonical events, and 10 checkpoints passed.

The [eight-state lifecycle matrix](prepackage-final-matrix.json) covers choose draft/complete and watch/static ready/running/complete. Malformed/off-menu choices and invalid condition selections are rejected with unchanged semantic state in all eight states. Crucially, invalid conditions now invoke the local clock-stop callback zero times. Practice opening during either local or saved-tour watch/static presentation stops the owning clock, pauses the presentation, logs `presentation-pause` then `practice-open`, and marks `manual-review`.

The [final edge test](prepackage-final-edge.json) evaluates the actual app export-clearing predicates. A locally chosen T01 complete export followed by canonical T01 checkpoint 4 has the same condition and trace hash but a different selected entry and provenance; both current predicates invalidate the old export. The current `exportRoute()` then returns the canonical envelope. On unfinished watch, the app clears old route/event output, disables event-log export, masks unacquired choice IDs and registry labels, and exposes only acquired observations in its inspector. Restored choice references resolve to the canonical scripted run's choice-event IDs and sequences; they are explicitly reference-only and are not presented as current-session actions.

The frozen pre-spec SHA-256 remains `f91788e4ae31949bec265582afe4e879f9fafb4e05eb8cdb3c9c2c9cacc881cd`. Its five file hashes, all review-3 source/snapshot hashes, and the twelve-file manifests for immutable candidates 001 and 002 matched. The server allowlist, build packaging code, exact renderer core, and CSS did not change in this correction. No human participant or human-performance claim follows from this software pass.
