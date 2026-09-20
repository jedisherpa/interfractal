# Gate 9 independent pre-spec review

**PASS for pre-build freeze.** I found no blocking inconsistency in the five Gate 9 prespec files. This is a review of the specification and author predictions, not an implementation or browser result. I recomputed the exact model with Python `Fraction`, enumerated all nine ordered two-choice sequences, and hashed independently canonicalized JSON. The repeatable calculation is in [`derive-prespec.py`](derive-prespec.py); machine-readable results are in [`prespec-review.json`](prespec-review.json). It imports no Gate 9 implementation code.

## Exact model and practice

The new fixture's four worlds match Gate 8 C02 byte-for-value; the declared source fixture SHA-256 is `2ddeb27ae3b47cf139a98868d94c9dccb52a1fc834aee6978a328983cdf7a509`. With `(x,y,z,w,v)` and the declared original-source formulas, the twelve records are:

| World | `project` | `xw90` | `yv90` |
|---|---|---|---|
| W01 | `(1/2,-1/2,0)` | `(1,-1/2,0)` | `(1/2,1,0)` |
| W02 reference | `(1/2,-1/2,0)` | `(1,-1/2,0)` | `(1/2,-1,0)` |
| W03 | `(1/2,-1/2,0)` | `(-1,-1/2,0)` | `(1/2,1,0)` |
| W04 | `(1/2,-1/2,0)` | `(-1,-1/2,0)` | `(1/2,-1,0)` |

The separate 4D practice source `(0,1/2,0,2)` projects to `(0,1/2,0)`, repeats identically, and gives `(-2,1/2,0)` under its x–w quarter-turn. It gives no benchmark-reference observation. The identical practice card, no scoring, and logged rereading rule are explicit.

## Exhaustive choice result

Each row starts with baseline `project`; columns show the two accepted choices. The compatible worlds use only the selected exact query records, even though the public context displays the source table. Every accepted pair has three occurrence cards, including duplicates.

| Choices | Unique queries including baseline | Compatible worlds | Property determined |
|---|---|---|---|
| project → project | project | W01, W02, W03, W04 | no |
| project → xw90 | project, xw90 | W01, W02 | no |
| project → yv90 | project, yv90 | W02, W04 | no |
| xw90 → project | project, xw90 | W01, W02 | no |
| xw90 → xw90 | project, xw90 | W01, W02 | no |
| xw90 → yv90 | project, xw90, yv90 | W02 | yes |
| yv90 → project | project, yv90 | W02, W04 | no |
| yv90 → xw90 | project, xw90, yv90 | W02 | yes |
| yv90 → yv90 | project, yv90 | W02, W04 | no |

All nine author-supplied occurrence arrays, unique query lists, survivors, property values, prefix hashes, trace hashes, and information hashes agree with independent derivation. The four recipes therefore have endpoint compatible counts 1, 1, 2, and 4. T01 and T02 have different ordered `traceHash` values but the same `informationHash`; T03 retains its second xw card without narrowing W01/W02; T04 retains three baseline cards and all four worlds. A third query cannot lawfully repair T03 or T04 because the two-choice budget already sealed the trace.

## Trace and timing contract

The context hash recomputes to `955b6737367a925b3ba8587ec00d3d5ad90253107958fc241cb5a834da3e9da9`. The hash schemas correctly distinguish ordered occurrences from deduplicated information. The watch and static specifications consume the sealed choice occurrences in order; they have no independent query recipe. At a completed route, retaining all three acquired indices makes its acquired-information hash equal the trace's information hash. At local zero, static already has all three cards while watch has only the baseline, so an intermediate parity claim would be invalid. The summary visibility rule prevents a running watch from showing a computed result derived from future occurrences, subject to the expressly public source table.

The ten independently reconstructed checkpoint records at `0, 2, 4, 6, 8, 10, 12, 14, 20, 24` seconds match the author predictions, including phase, local cursor, visible/acquired indices, prefix information hashes, endpoint eligibility, and the distinction between a running paused checkpoint and a completed route. The fixture schedules twelve semantic events after initialization, counting the separate choice and seal at second 4 and separate select and play events at seconds 6 and 14. The record contract requires same-boundary fingerprint chains, explicit natural versus manual completion reasons, one clock owner, and state-preserving rejection of invalid choices. These are testable implementation obligations, not observed behavior yet.

The fixed practice, exact two-choice stopping, four-recipe software order, six-second watch and sheet conventions, repeat handling, and manual-review labels are specified. Chooser dwell time is intentionally variable. The browser protocol is bounded and calls for actual control-generated T01–T04 traces, completed endpoint exports, 24 paused checkpoint observations, four inspected original captures, narrow-layout checks, rejection attempts, and historical integrity. It correctly distinguishes a disabled UI control from an API rejection event, and requires preserving anomalies rather than treating absent browser evidence as a pass.

## Scope of this pass

The mathematical and prespec predictions pass. Actual trace derivation, event chains, browser rendering, control behavior, layout and readability, served-file isolation, checkpoint recovery, and the 1,081-entry historical integrity check remain for the immutable candidate audit. The publicly disclosed reference makes compatibility a selected-evidence calculation; it is not a concealed-answer task. No human participant, attention, memory, learning, agency, or display advantage has been measured or authorized here.
