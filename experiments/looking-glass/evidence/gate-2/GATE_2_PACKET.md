# Looking Glass — Gate 2 review

**The Hopf mathematics, linked selection, reference changes and replay checks passed within the specified cases. Gate 2 is a qualified instrument result:** the plain table overflows the page, and the inspector reported stale viewport dimensions in 5 of 66 observations. These defects remain in the preserved build. No human understanding or benefit was tested. Gate 3 awaits Paul's decision.

Open the **[paused Gate 2 replay](http://127.0.0.1:43995/?run=G2-HOPF-003&build=g2-ccabad12693f86a8)** or the **[visual results page](http://127.0.0.1:43995/evidence/gate-2/results.html)** in the visible Codex in-app browser on this Mac. The local preview is not permanent hosting.

| Reviewed identity | Value |
|---|---|
| Run / build | `G2-HOPF-003` / `g2-ccabad12693f86a8` |
| Full source SHA-256 | `ccabad12693f86a810af614995379506bee2029fabf751e5e5f710f0235a961e` |
| Base revision | Gate 1 commit `b8b354e47477b342726fa14403980e0caea47c0b` |
| Runtime / dependencies | Node `v24.10.0`; built-ins only, no packages, lockfile or external runtime assets |
| Representation | Computed S³ coordinates in R⁴; SVG display of their stereographic R³ images; eight fixed fibers, 128 phase samples each, plus a selected custom fiber |
| Fixed comparison | Camera yaw 30° / pitch 20°, radius-4 clipping, 55 SVG units per R³ unit; verified initial/6 s images both 1280 × 720 |

## Watch this

1. The run opens **paused at 0 s**. Click **Replay from start**, then follow the bright marker for 24 seconds. Its source point travels around the east fiber while the selected globe point stays east. Use **0 s / 6 s / 12 s / 18 s / 24 s** for exact checkpoints. Controls are below the initial scenes and require scrolling at 720-pixel height.
2. Choose **Equator forward**, then **Switch local chart**. The phase changes from 0° to −90°, but the source point stays the same within numerical tolerance. Choose **South pole · infinity case** and phase 90°: the source remains valid while its stereographic image is at infinity. The displayed line has clipped continuation endpoints.
3. Scroll to **Same records, different question**. Click Hall's circular marker. Change the reference from capacity to existing wheelchair access: Hall moves from yes to no because a ramp is required; its capacity and ramp facts remain. **Compare references** retains both accounts. **Show unmapped records** exposes the weather context.
4. **Reset to start** restores the canonical run. The lower **Run Library** reopens this exact build paused and links the preserved Gate 1 and Gate 0 replays. Exploration never rewrites the saved run or approves another gate.

## Expected versus observed

The [six-file prespecification](/Users/paul/BTC-Learning/experiments/looking-glass/docs/gate-2/PRESPEC_FREEZE.json) was frozen at `2026-09-20T01:46:30.247897Z`, before browser trials. It includes the [model contract](/Users/paul/BTC-Learning/experiments/looking-glass/docs/gate-2/model-contract.md), [independent predictions](/Users/paul/BTC-Learning/experiments/looking-glass/docs/gate-2/independent-predictions.json), and fixed fictional records/reference rules. All remain unchanged.

| Question | Expected | Observed | Interpretation / unresolved |
|---|---|---|---|
| **T01–02: Does phase follow the Hopf map?** | Source and base norms 1; every sampled phase maps to its named base; five checkpoint coordinates match within `1e-10` | Independent algebra, all 8 × 128 fixed samples, 8,448 inspected selected-fiber samples, and actual 0/6/12/18/24 s states passed. At 6 s the east projection is approximately `(0, 2.414213562373095, 0)`; 24 s returns numerically | Model fidelity passed for the sampled cases. A base alone cannot recover phase: opposite source points at 0/12 s share it. Finite samples do not draw the continuum |
| **T03: Are selection and custom points linked?** | A globe point identifies its fiber; a rendered fiber identifies its base; custom 30°/60° gives `(√3/4, 3/4, 1/2)` | Actual north-marker and isolated east-fiber hits selected the correct IDs. Latitude/longitude and actual surface-pick inverse agreed with predictions | Bounded functional correspondence passed. Globe picking covers the visible +Y hemisphere; coordinates can select rear points. Overlapping base locations and dense paths remain usability limits |
| **T04–05: Are charts and infinity honest?** | Chart compensation preserves the same source; invalid pole charts unavailable; south image is an unbounded line with a missing projection point | Front north→south→north preserved q/h/P within tolerance; pole controls disabled with explanations; seam checks passed numerically. South phase 90° retained q and h, with unavailable P and broken, clipped line | Boundary cases passed. A chart change is not source motion. No global continuous phase-origin section is claimed; the finite checks do not prove that theorem |
| **T06: Is the camera separate?** | Changing yaw affects display only | Actual yaw 30°→120° preserved source/projection and mapping hashes; restoring 6 s recovered the same browser checkpoint hash | Camera isolation passed; similar pictures alone would not establish it |
| **T07: Can references change without rewriting facts?** | Hall yes→no→yes; Field yes throughout; Studio no→yes→no; weather unmapped | Runtime rules derived the expected assignments. Confirmed Hall-circle selection retained its facts through the round trip; record/history hashes and mathematical state stayed fixed | Functional mapping passed. Categorical positions and marker angles are arbitrary display choices, not semantic fibers, importance or endorsement. Neither question decides full event feasibility |
| **T08: Are unmapped facts and the plain equivalent recoverable?** | All four records, reasons, phases and sources retained; readable equivalent listing | Weather and both reference alternatives were inspected. All plain-table fields existed and were reached by horizontal navigation; document width was 2712 px at a 1280 px viewport | **Mixed:** information retained, readable layout requirement not met. The plain area spans 2666 px and requires horizontal plus vertical navigation; no visual superiority demonstrated |
| **T09: Do controls and replay reproduce states?** | Stable pause, exact step/scrub/clamp, natural end origin, same-browser checkpoint recovery | Pause held at 10925 ms; Step reached 11925 ms; scrub selected 7300 ms; end step clamped. Uninterrupted replay ended paused at 24000 ms with explicit automatic origin. Library/reload opened paused 0; repeated 6 s hash matched exactly | Functional replay and event-origin checks passed. Node-generated and Chromium numerical states differ by tiny floating-point amounts, so their full hashes differ; **no cross-runtime exact hash match is claimed** |
| **T10: Is evidence accurate and preserved?** | Correct viewport metadata, genuine captures, stable canonical files and historical replay | 53 canonical files unchanged; actual Gate 1 Library link opened its retained build paused. All 22 originals bound to actual state. Inspector viewport was stale in 5/66 observations, although independent actual viewport/capture dimensions were retained | **Qualified:** preservation passed; viewport metadata assertion failed. Native capture dimensions also varied. Use the verified 1280 × 720 pair below, not mismatched images as pixel comparisons |

The [independent Sol audit](/Users/paul/BTC-Learning/experiments/looking-glass/audit/gate-2/AUDIT.md) reports **24/24 oracle, 22/22 exact-build, 17/17 route, 21/22 browser assertions, and 4/4 post-browser preservation checks**. The browser assertion failure is stale inspector viewport metadata; these counts do not turn the plain-table defect into a pass. Root operated the browser; the verifier checked the resulting records and originals independently.

The [66 browser observations](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-2/browser-observations.json), [actual control trace](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-2/browser-trace.json), and [52 saved events](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-2/activity-snapshot.jsonl) are separate from generated expected checkpoints. Events comprise 48 `manual-control`, three `programmatic-restore`, and one `automatic-playback` across three sessions. The natural end has reason `end-of-sequence`, resolving Gate 1's logging limitation in the new code only. Actor remains `unspecified-ui`; no human attribution or approval is inferred. The scoped warning/error log was empty. No video was recorded.

## Four inspected originals

**0 s — east fiber selected.** The bright marker is one source point, while the highlighted curve samples its complete fiber. The base remains at east.

![Gate 2 at zero seconds, selected east base and fiber](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-2/captures/S0-fixed-stable.jpg)

**6 s — phase moved, base retained.** The marker is now near the top of the same projected loop. Both images use the verified 1280 × 720 viewport and scroll-zero framing. They are state comparisons, not a pixel-equivalence claim.

![Gate 2 at six seconds, source marker moved along the east fiber](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-2/captures/S1-fixed-comparison.jpg)

**South at phase 90° — the unbounded image.** The selected source point projects to infinity; it is not replaced by a finite marker. Boundary dots mark the visible line's clipping, not source endpoints. The [control/inspector capture](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-2/captures/S3-south-infinity-controls.jpg) records the explicit explanation.

![South fiber displayed as a clipped line through the stereographic infinity case](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-2/captures/S3-south-infinity-top.jpg)

**Existing-access reference — confirmed Hall selection.** Hall is “no” for existing access, and its supplied portable-ramp option remains visible below the loop. Compare the [confirmed capacity view](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-2/captures/S4-hall-selected-confirmed.jpg): the reference changed, not the facts. These semantic originals share a 1280 × 1127 viewport but different scroll positions.

![Confirmed Hall marker under the existing-access reference with retained facts](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-2/captures/S5-hall-access-confirmed.jpg)

**Visible negative evidence:** the [plain-table overflow capture](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-2/captures/plain-source-history-horizontal.jpg) shows the navigation burden required to reach source/history columns; the left-hand record columns are then offscreen. Its [DOM measurements](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-2/plain-equivalent-dom.json) substantiate the width defect. Other originals include [unmapped weather](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-2/captures/S5-unmapped-weather.jpg), [both references](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-2/captures/plain-reference-comparison.jpg), and [reloaded 6 s](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-2/captures/S6-reloaded-six.jpg). The [capture index](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-2/capture-index.json) preserves every untouched original and its state binding.

## Changes and remaining limitations

| Preserved candidate | Outcome |
|---|---|
| `G2-HOPF-001` / `g2-d8107c62a9ca1f71` | Pre-browser review found camera-sign, clipping, pole-status and event-origin defects. Snapshot retained; no actual browser run claimed |
| `G2-HOPF-002` / `g2-e2b00f2824de8711` | Mathematical/fixture checks passed; lacked an explicit current-run Library reopen control. Retained before browser use |
| `G2-HOPF-003` / `g2-ccabad12693f86a8` | Added current-run reopening; first and only browser-tested candidate. Mathematical/functional checks passed with the recorded presentation and metadata defects |

Pre-browser conformance work also added actual selectable categorical loops, runtime rule evaluation, correct SVG screen-to-surface conversion, and a complete plain equivalent. It did not change the frozen source facts, mappings or hypothesis. See [candidate history](/Users/paul/BTC-Learning/experiments/looking-glass/correspondence/FAILED_CANDIDATES.md).

The initial Hall coordinate attempt missed: `selectedRecordId` stayed null. Early images named `S4-capacity-hall` and `S5-access-hall` therefore show reference layouts only. Later real SVG-circle clicks confirmed selection and reversibility; the failure remains in the trace. One untouched native capture, `S0-fixed-comparison.jpg`, is only 818 × 720 despite a 1280 × 720 DOM viewport; its cause is unresolved, and it is excluded from the fixed pair. Viewport height also changed during native operations. These facts and the stale inspector fields are retained in the [host observations](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-2/HOST_OBSERVATIONS.md), not repaired by editing evidence.

Node and browser evaluation have tiny arithmetic differences, including a sampled stereographic denominator differing by about one floating-point unit. Numerical checks use the frozen `1e-10` tolerance. Exact repeatability was demonstrated **within the same browser**: the restored 6 s state hash is `41db1fd5f16c5b6b851af25a376bf0a021719cfa8d40f3e72a2b56da5bc3aa2a`. Neither a chart round trip nor phase 2π versus 0 is required to be byte-identical.

The [initial browser checker output](/Users/paul/BTC-Learning/experiments/looking-glass/audit/gate-2/G2-HOPF-003-browser-audit-initial.json) is preserved. It incorrectly demanded cross-runtime byte equality and global event numbering across separate sessions; the corrected audit checks numeric invariants and per-session event order. A separate early integrity checker misread Gate 0’s manifest schema; the independent report documents its correction without changing historical files.

The mathematical interpretation follows the circle-fiber and stereographic-line results described by [Johnson](https://nilesjohnson.net/hopf.html) and [Lyons](https://nilesjohnson.net/hopf-articles/Lyons_Elem-intro-Hopf-fibration.pdf); local sections and the section/triviality boundary are grounded in [Cohen's notes](https://math.stanford.edu/~ralph/math215b/fiber.pdf). The [source review](/Users/paul/BTC-Learning/experiments/looking-glass/research/gate-2/source-review.md) records convention differences and exact pins. None supports the candidate semantic mapping as a theorem. S³ has three intrinsic dimensions in R⁴; this is not yet a rotating solid 4D object or evidence of physical extra dimensions.

## Recovery and decision

Restart the exact tested snapshot, retaining its neighboring run directories:

```sh
node /Users/paul/BTC-Learning/experiments/looking-glass/correspondence/builds/g2-ccabad12693f86a8/server.mjs
```

Open [the paused replay](http://127.0.0.1:43995/?run=G2-HOPF-003&build=g2-ccabad12693f86a8). Port 43995 must be available; do not restart if the correct server is already running. [Gate 1](http://127.0.0.1:43994/) and [Gate 0](http://127.0.0.1:43991/) remain separate preserved replays. The [implementation README](/Users/paul/BTC-Learning/experiments/looking-glass/correspondence/builds/g2-ccabad12693f86a8/README.md) documents exact serialization, equations and controls.

Actual roles: Astra xhigh specified and synthesized; Luna gathered primary sources; Sol implemented; a separate Sol worker audited. Root coordinated the host, actual browser controls and evidence preservation. No human participant or original four-agent language study was involved.

**Proposed Gate 3: a genuine 4D object and its moving 3D shadow.** Build a 16-vertex/32-edge hypercube, independent x–w source rotation and ordinary camera controls, a pair initially coincident in projection that separates under the known rotation, and a bounded rank/reconstruction check with exact replay. Gate 2's readability and viewport defects remain explicitly open; a revision option would address them before advancing. No Gate 3 work has begun.

This stop follows the supplied [orchestrator prompt §17](/Users/paul/BTC-Learning/experiments/looking-glass/inputs/LOOKING_GLASS_CODEX_ORCHESTRATOR_PROMPT.md): “After presenting the packet, **end your turn and await Paul**.”

**Please watch the Gate 2 replay. Do you approve Gate 3: the 4D object and its moving 3D shadow, want revisions to Gate 2, or want to pause?**
