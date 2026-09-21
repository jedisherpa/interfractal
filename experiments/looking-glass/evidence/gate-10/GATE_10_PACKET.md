# Looking Glass — Gate 10 review

**Gate 10 ends with a bounded negative result: the prediction instrument is not ready.** The first software-attempt start was accepted by the server, but the UI discarded its acknowledgement. Answer choices, Commit, Skip and Reveal remained disabled. There were **zero committed answers, zero skips, zero reveals and zero completed cases**. One unanswered server attempt is preserved. Human learning and transfer remain **untested**, with zero human participants.

The exact mathematical fixtures, isolated service checks and answer-free replay have useful separate results. They do not establish a working prediction-before-reveal interface. The initial candidate plus two allowed revisions are exhausted; no fourth candidate or quiet repair is included.

Open the **[preserved paused instrument](http://127.0.0.1:44003/)** or the **[answer-free visual results](http://127.0.0.1:44003/review/results.html)**. This local packet contains mathematical answers below; the public results page does not. The [independent blocker recheck](../../audit/gate-10/candidate-003-browser-blocker-recheck.md) explains the decisive failure. The [final independent browser audit](../../audit/gate-10/browser-final-audit.md) confirms `BLOCKED_PREDICTION_WORKFLOW`; its separate technical replay verdict is `PASS_WITH_EXPORT_VIEWPORT_METADATA_QUALIFICATION`.

| Identity | Value |
| --- | --- |
| Final preserved run / build | `G10-PREDICT-003 / g10-9e34f791d83c1cd7a495` |
| Full source SHA-256 | `9e34f791d83c1cd7a495bec3371470fddebd6ad96205e957dc635d9404dc22f4` |
| Base revision | `9e39c0332d7b34f60a9e779cdbff7fd93e6acee1` |
| Runtime | Node `v24.17.0`, `/opt/homebrew/Cellar/node@24/24.17.0/bin/node` |
| Prespec | Six files independently checked, 98 checks; frozen at `2026-09-20T11:21:03.279381+00:00` before implementation |
| Closed browser core | 22 pinned files, closed at `2026-09-20T12:05:01.050551+00:00` |
| Gate decision | `BOUNDED_NEGATIVE / NOT_READY`; no human-study or Gate 11 execution |

## Watch the preserved result

1. Click **Reopen saved start**, then **Play**. The 20-second scripted tour visits the five task sheets at four-second boundaries, returns to T01 and stops paused at 20. The tour contains no predictions, response commits or target reveals.
2. Inspect the raw support cards, named target query and unmarked alternatives. The fixed worked practice is a separate source and has no assessment response.
3. Read the preserved failure image and ledger below. **Start software prediction** did create a server attempt during the actual trial, but its acknowledgement never attached to the page. This build cannot complete the intended prediction workflow. A new click would create more local software activity, not supply missing evidence for the closed run.
4. Use the six saved checkpoints and historical collection for read-only review. Replay, reopening and reload do not turn source-informed software exposure into a naïve human prediction.

## What failed, and what the audits missed

Before starting the first attempt, the app captures `attached?.attemptId ?? null`, which is `null`. After the server accepts the request, its stale-response guard compares `attached?.attemptId`, which is `undefined`, with the captured `null`. Strict inequality succeeds, so the handler returns before attaching the attempt, setting the answering phase or adding the local ledger row. The UI looks idle and keeps all answer actions disabled. The [independent reproduction](../../audit/gate-10/candidate-003-first-start-blocker-repro.json) executes the exact immutable app with accepted mock service responses and confirms this path separately from the actual browser evidence.

The earlier [pre-browser audit](../../audit/gate-10/candidate-003-audit.md) passed **103 immutable build checks, 572 isolated HTTP/service checks and 12 controlled app checks** within their stated scope. Service probes bypassed the app; the controlled app tests supplied a session and exercised export staleness, provenance and replay transitions. None drove the first-start handler through acknowledgement. Those scoped results remain preserved, but their readiness recommendation is superseded by the actual browser failure. This is an integration coverage gap, not evidence that the blocked controls worked.

The retained [server ledger](browser/session-one-ledger-final.json) has one T01 attempt with `status: answering`, `response:null`, and no commit/reveal references. Its before-practice, after-practice and final exports are byte-identical. Because the attempt never attached to the UI, practice/reopen did not close it; no `/api/close` event exists. It is an **unattached, incomplete attempt**, not an abandoned, skipped, wrong or correct response. Reload removed the document capability; it did not prove abandonment or erase prior exposure. The second document created no service session.

## Expected, observed and unresolved

The following exact answers are local audit material, not public task-page disclosures. All checks are conditional on known formulas, raw exact observations and within-case correspondences. Ordinary drawings alone do not establish source recovery.

| Question | Prespecified expectation | Observed evidence | Interpretation | Unresolved |
| --- | --- | --- | --- | --- |
| T01 · interpolation | From the two source views, `(x,w)=(2,1)`; at the intermediate query, raw xyz is `(2/5,-1,1/2)`. | Independent exact derivation passes. First actual attempt start blocks before any choice or commit. | New source with a practiced intermediate query is a mathematical interpolation case. | No actual wrong-answer retention, commit acknowledgement, target reveal or completed UI case. |
| T02 · unseen setting | At180°, raw xyz is `(3/2,1/4,-1)`. The 0° view alone identifies this particular target. | Exact derivation passes; public sheet appears in the saved tour. | New angle in the same point family; it does not require using both supports. | No completed software prediction or human generalization result. |
| T03 · insufficient setting | Camera-only repeat leaves rank 3; possible target points are `(-2,2/3,-1/3)` and `(2,2/3,-1/3)`. | Independent witness calculation retains both sources; the public supports are preserved. | Camera change cannot supply the hidden coordinate. No true source is secretly selected. | Neither the planned ambiguity response nor its two-output reveal was reached in the browser. |
| T04 · changed ball family | The supports determine `cw=1/2`, `R²=25/16`; target delta 0 gives one point. | Exact parameter/target calculations pass. | Source class and observation operation change from point rotation to ball slicing. | Planned skip/null-grade and rendered point reveal were blocked. |
| T05 · changed family, negative outcome | The supports determine `cw=-1/2`, `R²=1`; target delta `-5/4` means empty. | Exact negative calculation passes. | Empty is distinct from a point; the negative outcome is retained in the oracle. | Planned commit and empty target reveal were blocked. |
| Answer before reveal | Server-acknowledged immutable answer or skip, then a separate deliberate reveal. | Isolated service tests pass; actual UI never exits phase `none` after its accepted start. | Service correctness alone is insufficient for instrument readiness. | Zero browser commits/skips/reveals/repeats; no end-to-end lifecycle claim. |
| Published snapshots and replay | Self-consistent live/paused payloads; six checkpoints and natural 20-second stop. | All 65 semantic and65 ledger hashes verify;16 paused comparisons match; natural tour lasts20.004s with six scheduled events. | The captured snapshot/hash mismatch seen in Gate 9 does not recur in these G10 observations. | Four exported-event views have stale document-height metadata; reset-after-reveal was never tested. |
| Human learning or transfer | Requires separately authorized actual people and first-exposure observations. | Zero participants and zero human outcomes. | **Untested.** All agent work is source-informed software validation. | Practice effects, learning, transfer, usefulness and interface advantage remain open. |

There are five assessment cases and one fixed worked practice, with no training/adaptation by the program. Interpolation, a new same-family angle and a changed point-to-ball task are operational labels. Ball slices are already familiar to this project and its agents. A new source/query pair, new document or first software attempt is not evidence of human first exposure or human transfer.

## Actual evidence and qualifications

The closed core contains **65 complete DOM observations, 49 host semantic actions and six untouched JPEG originals**. Resize/scroll operations are represented in observations and are not all included in the semantic-button count. Its closed service log has six rows: accepted session start and attempt start, followed by four ledger reads. These are two accepted mutations and four reads, not six predictions. Isolated audit/builder API probes use separate logs and are excluded from actual-browser counts.

All 65 semantic payloads and all 65 ledger payloads independently hash to the values published beside them, including 12 active, unpaused tour observations. Every observed target stays withheld. That supports the captured pre-answer surface only: committed-unrevealed, revealed, hidden-result and repeat-review browser states were not reached. Isolated API tests and controlled stale-export tests retain their narrower scope; no complete browser leakage/lifecycle pass is claimed.

All 16 designated paused checkpoint comparisons match: six baseline, six **after blocked review**, two after Reopen saved and two after reload. They are not “after reveals” checks. The actual uninterrupted tour has five replay-origin case selections and one automatic `tour-stop` with `end-of-sequence`, with a measured 20.004-second interval from play to stop. Active scroll/resize observations did not interrupt that tour. Separate controls exercise Play from local review, Pause, Previous/Next, direct checkpoints and Replay from start. The host restored paused 0 at closure.

Four observations—indices 27,36,54 and 61, immediately after event-log exports—publish an old document height while the displayed export text expands the page. Semantic/ledger hashes still match; the metadata issue concerns document dimensions. Do not describe all viewport metadata as fresh. All 65 observed layouts report no horizontal overflow. Both 1280×720 and 960×720 were inspected; card content is 280×200 CSS pixels, with 282×202 border boxes. Lower task controls and export text require vertical scrolling. No OS reduced-motion preference or human readability/comprehension outcome was measured. Console collection is empty.

Event exports contain the events present before their own handler logs the export action. The two final per-document exported lists contain 30 and 22 events; they are prefixes, not exhaustive logs through the last click. The final first-document export omits its own export and subsequent ledger export; the second omits its own export and final reopen. Host actions and DOM observations retain those boundary actions. Earlier/intermediate exports overlap these lists and must not be summed as independent events.

All **1,260 frozen Gate 0–9 entries** verify unchanged. The actual Gate 9 link opens the historical paused `G9-MATCHED-003 / g9-15c3bf973fe0c6cd`. Historical HTTP readiness and byte integrity are separate checks; all prior packets and qualifications remain unchanged.

## Three inspected original captures

These original 1280×720 images contain public supports/alternatives or the failed controls, with no answer revealed. They were inspected directly; hashes and bracketing snapshot revisions are in [screenshots.json](browser/screenshots.json). All six originals, including narrow/active captures, remain preserved.

### Supplied information, target withheld

![Initial supplied cards and unmarked alternatives](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-10/browser/screenshots/initial-cards.jpg)

The raw support cards are legible at this scroll position; the target remains withheld and all alternatives are unmarked. Bracketing snapshot revision 2. SHA-256 `14bb13b781bf3336c835a93bd1e629a4696580084389da278a147cc11ace3d12`.

### Decisive failure after accepted start

![Disabled response controls after the discarded acknowledgement](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-10/browser/screenshots/start-ack-discarded.jpg)

The server has created the first attempt, but the page still disables choices, Commit, Skip and Reveal. Nothing here is a submitted wrong answer or a skip. Bracketing snapshot revision 25. SHA-256 `e1ef644790e01f3dde06d692c72d93e8f2684eccd40dba03cdf0ea8b0f2e463d`.

### Real natural tour end

![Saved tour stopped naturally at twenty seconds](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-10/browser/screenshots/natural-tour-end.jpg)

The page shows 20.000s and `end-of-sequence`, with its scripted demonstration label. Event evidence establishes the uninterrupted stop; this screenshot alone would not distinguish playback from a checkpoint jump. Bracketing revisions 258–259. SHA-256 `9dffeb9e1d72447be0be4a0226545551cf7b4c2aada840f3be30987c9f8c3c9c`.

## Candidate history and review boundary

| Candidate | Preserved build | Outcome |
| --- | --- | --- |
|001|`g10-6a81e6f6965f96cee454`|Builder self-review found scroll/resize publication used the last timer cursor instead of one captured current clock. Preserved; no actual browser acquisition.|
|002|`g10-464bfe21ad6044378996`|Independent pre-browser audit blocked concurrent retry/idempotency, stale answer-bearing exports after restore, API provenance and adjacent play/pause event chains. Passing sequential checks and failing probes remain preserved; no actual browser acquisition.|
|003|`g10-9e34f791d83c1cd7a495`|Those corrections passed scoped checks. Actual browser exposed the discarded first-start acknowledgement. Final bounded negative; prediction workflow not ready.|

The minimal hypothetical correction is to normalize both compared attempt identities consistently and then exercise the complete first-start UI/service path before the remaining response/reveal recipe. It was **not applied**. A new candidate exceeds this gate's frozen initial-plus-two-revision budget and requires a separately authorized continuation. There is no 004 and no changed historical replay.

The [primary-source review](../../research/gate-10/source-review.md) uses original studies of analogical problem solving, comparison and prediction before feedback. It motivates separating new settings from changed tasks and recording predictions before reveals. Those heterogeneous human studies supply no effect estimate for this instrument. The source-informed software checks do not reproduce their human experiments.

Astra (`gpt-6-astra`, xhigh) specified and synthesized; Luna (`gpt-5.6-luna`, high) gathered primary sources; separate Sol (`gpt-5.6-sol`, high) workers implemented and audited. Existing workers were reused when new dispatches hit capacity; rejected dispatches are not claimed as completed work. The host performed supported browser actions and preserved evidence. These are software roles, not participants or human reviewers. See [execution provenance](execution-provenance.json).

## Preserved evidence and restart

| Artifact | SHA-256 |
| --- | --- |
| [Prespec freeze](../../docs/gate-10/PRESPEC_FREEZE.json) | `3dba94a05674bf8760ea036a4115010ae524e2211d7aa7ecf404139dba3f9d56` |
| [Closed browser core](CORE_EVIDENCE_FREEZE.json) | `a8310e939ba5d3020d890613ca305f7b71179b5e7c88a97bc064bd588006fd28` |

[run-evidence.json](run-evidence.json) pins the independent audit components, exact run/source, capture records and recovery collection. This packet describes the closed browser core; later presentation verification and final gate freeze are separate host records. It does not assert that publication, final freeze or worker shutdown has already occurred.

The [eleven-replay collection](replay-collection.json) retains Gate 0–10 identities and restart commands. These are loopback previews on this Mac, not permanent hosted sites. Restart the exact final Gate 10 snapshot with the explicit run argument:

```sh
/opt/homebrew/Cellar/node@24/24.17.0/bin/node /Users/paul/BTC-Learning/experiments/looking-glass/prediction-transfer/builds/g10-9e34f791d83c1cd7a495/server.mjs --run /Users/paul/BTC-Learning/experiments/looking-glass/prediction-transfer/runs/G10-PREDICT-003 --port 44003
```

The explicit `--run` is required: relying on the server default selects the earlier 001 run.

## Next named-gate decision

**Gate 11 — Break a summary by changing its receiver** remains unapproved and unrun. Its proposed scope is a small fictional-record counterexample: summaries that agree for one receiver task but differ for another, inspectable missing dependencies, a minimal provenance-preserving repair and an equivalent plain representation. Any human detection or repair claim would still need separately authorized actual observations.

Gate 10's negative result is retained at the review boundary. Advancing to Gate 11 or authorizing a further Gate 10 repair are separate decisions for Paul; neither is issued by this packet, a replay control or an audit result.
