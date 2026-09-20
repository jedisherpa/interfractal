# Gate 11 — Break a summary by changing its receiver

Version `gate11-prespec-v1`. Actual authority is Paul's message **“Gate 11: Break a summary by changing its receiver.”** Base revision is `a35be1ccb61c802a8bd7282903a9665b2c7d1863`. Gates 0–10 and inputs remain immutable. Gate 10's negative result is not reopened or repaired. Gate 12 is unapproved.

## Question and smallest useful family

Can one outward summary answer a receiver's count question yet fail after the receiver also requires two source-backed dependencies? Can a sound evaluator report that insufficiency, expose a concrete collision, and repair the summary with a minimum set of fields from a frozen menu while retaining source provenance and prior revisions?

Use four new fictional scanner-lot worlds. Every lot contains four field scanners and has the same amber paint. Worlds independently vary whether calibration is current/expired and custody authorization is approved/pending. These are alternative synthetic worlds, not changes to real records or revisions of the old Gate 6 venues. The initial summary carries the lot identity/type/count and identical logical provenance references, omitting dependency statuses.

Receiver `R_COUNT` asks whether the lot contains at least four scanners. Receiver `R_RELEASE` asks whether that count condition holds **and** calibration is current **and** custody authorization is approved. All four initial summaries collide and answer the first question yes; full-source answers to the second are no/no/no/yes. Reusing the old count answer as a release decision makes three false positives. The correct partial evaluator reports insufficiency until the supplied payload logically determines the new answer.

The repair menu has exactly three entries: the source-backed calibration dependency, the source-backed authorization dependency, and irrelevant paint color. Exhaust all eight subsets. The unique globally sufficient subset-minimal repair is `{calibration, authorization}`, also cardinality-minimal with two menu entries. Adding paint preserves sufficiency but is not minimal; paint alone and the empty repair do not help. Minimality is only over this declared menu and four-world family. It is not minimal byte length, universal semantic completeness, or a claim that no alternative encoding exists; a precomputed receiver decision is deliberately outside the menu.

Local determination and global sufficiency differ. A supplied expired calibration or pending authorization already determines **no**, even if the other field is absent. A supplied positive status alone leaves the remaining positive/negative alternatives unresolved. Do not implement “every missing field implies insufficient.” The finite certificates check every colliding pair; the runtime evaluator sees only the declared summary payload and receiver rule, never the selected world's full facts or ID.

## Public benchmark and comparison boundary

All worlds, formulas, counterexamples and answers are public. There are no hidden keys, participant responses, session capabilities, commit/reveal APIs or privacy claims. A full-source inspection panel is expressly separate from the payload supplied to the receiver. Inspection must not add a field, improve the receiver result or covertly dereference a logical source pointer on its behalf.

The typed diagram and plain table consume exactly the same facts, payloads, receiver definitions, certificates, revision records and actions. Layout adds no evidence. The diagram shows a lot summary connected to its active receiver and any supplied dependencies; links mean declared source dependency, not metric distance, causality, authority or a new dimension. The plain view exposes the same typed relations and provenance. No visual advantage, human detection/repair ability, learning or coordination claim is authorized. **Zero human participants; all actions are source-informed software checks.**

Freeze five files after independent Sol review: this charter, `model-contract.md`, `record-contract.md`, `fixture.json` and `independent-predictions.json`. The host creates the separate freeze manifest before implementation. Predictions are pre-implementation expectations for independent recomputation, not completed audit evidence. Luna's small primary-source review may be linked separately without changing this finite model.

## Execution and stop rule

Use new `receiver-summary/`, provisionally loopback port44004, built-in Node/HTML/SVG and no added dependencies. Runs are `G11-RECEIVER-001` through at most003. Preserve the initial candidate, both permitted revisions, failed checks and original captures. A material model/menu/receiver change needs a versioned prespec and review; never change the oracle to rescue a result.

Gate 10's missed first-start acknowledgement makes **actual first-use receiver-change → insufficiency → witness inspection → repair → reevaluation** the first browser acquisition on each candidate, before presentation polishing or spending revisions on secondary display issues. Arithmetic and isolated controls cannot substitute for this path. A failure is retained immediately; later steps are not claimed complete. A negative result is acceptable at the bounded limit.

Readiness requires exact full-source/partial answers and all subset certificates; evaluator input isolation; immutable source/history and trustworthy repair provenance; diagram/plain information parity; the real first-use workflow; an actual natural replay stop; independently consistent snapshot hashes and measured layout after exports; and historical integrity. Distinguish computational, actual UI and human outcomes. The host reported 1,437 frozen Gate0–10 entries at the start; verify and report the actual count rather than assuming a later total.

Astra specifies/synthesizes; Luna gathers sources; separate Sol workers build and audit; the host operates the supported browser, preserves originals, manages freeze/status/Git and closes the gate. Stop at **Gate 12 — Coordinate without erasing disagreement**, with no next-stage execution or further Gate 10 repair implied.
