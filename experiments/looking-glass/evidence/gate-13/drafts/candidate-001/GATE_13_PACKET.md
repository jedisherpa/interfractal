# Looking Glass — Gate 13 review

**Draft synthesis: independent closed-core verdict pending.** The public counterexample has a false headline and a checkable source: bars measured above 70 have a 2:1 length ratio, while the underlying counts are 90:80, or **9/8**. Actual browser controls exposed that mismatch, created a source-linked correction and debrief, and retained the original. The workflow recovered after an unexplained missed transition; that qualification remains part of the result.

“Persuasive” names the proposed challenge, not a measured effect. This is an authored fictional software demonstration with **zero human participants**. No persuasion, susceptibility, confidence calibration, successful debiasing or visual advantage was measured.

Open the [paused instrument](http://127.0.0.1:44006/) or [results page](http://127.0.0.1:44006/review/results.html). The results route is a presentation target pending its separate handoff review. Earlier results remain in the [14-entry replay collection](http://127.0.0.1:44006/review/replay-collection.json).

| Identity | Value |
| --- | --- |
| Run / immutable build | `G13-MISLEAD-001 / g13-daa720242d62cd4c184f` |
| Full source SHA-256 | `daa720242d62cd4c184f2f3687ddc1e8584f6ce2031f40ba119b87efa225f93d` |
| Base revision | `29cd75bc83006b6dee4a8437224bb5f14b3871e4` |
| Runtime | Node `v24.17.0`, `/opt/homebrew/Cellar/node@24/24.17.0/bin/node` |
| Prespec | Five authored files independently checked with 52 checks; nine specification/review artifacts frozen before implementation |
| Closed core | 68 pins; manifest SHA-256 `c281619d92f293e7019c5835ef6df5eb51fe9bfb19b17260dc5140daf9059b35` |

## The exact counterexample and controls

All three cases use the same authored statement: **“B completed twice as many tiles as A.”** These are stipulated counts within fictional test windows, not rates or measured production. Truth is the integer equality `B = 2A`; it remains decidable when a ratio is undefined.

| Case | A / B counts | Original lower bound | Original bar-length ratio | Actual B/A | Statement / correction |
| --- | --- | ---: | --- | --- | --- |
| MISMATCH | 80 / 90 | 70 | 20/10 = 2 | 9/8 | False; zero-baseline correction states 10 more tiles and 9/8 as many |
| TRUE_CONTROL | 40 / 80 | 0 | 2 | 2 | True; no correction record created |
| ZERO_CONTROL | 0 / 10 | 0 | Undefined | Undefined | False because 10 ≠ 2×0; correction states difference10 and undefined multiplicative ratio |

For the 240-unit plotting width, MISMATCH's original SVG widths are80/160; the zero-baseline correction gives192/216. The count labels stay80/90 throughout. TRUE_CONTROL widths are96/192; ZERO_CONTROL widths are0/24, with no invented positive bar for A. Ten valid case/version/representation configurations were checked; this count does not enumerate every possible history or inspection state.

Both visual and plain views expose the same counts, bounds, numeric encoding, source inspection, statement check, correction and history operations. The public fixture and answers are available before checking. There is no secrecy or first-exposure claim. Same-information hashes check the declared data contract; they do not establish equal human effort.

## Watch and inspect

Choose **Reopen saved start**, then **Play**. At4 seconds the source opens; at8 the original statement is checked; at12 the correction/debrief appears; at16 the plain representation appears; at20 the original returns with its correction marker. At24 the display restores and stops automatically. Seven scheduled events were retained; the natural run took24.002 seconds.

For local review, use **Start local review**, **Inspect source evidence**, **Check original statement**, then **Apply correction and debrief**. Compare **Show original** and **Show correction and debrief**, inspect their linked records, and change **Representation**. Select TRUE_CONTROL to inspect an accurate statement, and ZERO_CONTROL for the denominator boundary. The checker always reports the original statement's truth, even while the corrected summary is displayed. Export before reload: local history persists across saved-run reopening but is document memory and does not survive reload.

Restart the exact snapshot with its explicit run:

```sh
/opt/homebrew/Cellar/node@24/24.17.0/bin/node /Users/paul/BTC-Learning/experiments/looking-glass/misleading-view/builds/g13-daa720242d62cd4c184f/server.mjs --run /Users/paul/BTC-Learning/experiments/looking-glass/misleading-view/runs/G13-MISLEAD-001 --port 44006
```

The service binds only to this Mac's loopback address.

## Expected, observed and unresolved

| Expected | Observed | Interpretation | Unresolved / bounded |
| --- | --- | --- | --- |
| False2× statement exposes exact source mismatch | Actual source80/90, ratio9/8 and original length ratio2 | Authored statement and chart encoding are independently distinguishable from source truth | No person was tested for persuasion |
| Correction preserves original/source | Three checks, two corrections and one check reuse; linked original/source/check hashes retained | Versioned correction and debrief work in the recorded path | First original-view transition was missed; cause unknown |
| True and zero controls behave differently | True control has no correction; zero control is false with undefined ratios | Correction is conditional; missing ratio does not make the equality undecidable | Only three finite cases |
| Plain and visual checking access agree | Three actual information-hash pairs; same source and correction controls | Bounded evidence and operation parity | No visual-benefit or equal-effort result |
| Replay and published snapshots recover | Host reports90/90 hashes/layout matches,18 checkpoints and all seven natural scheduled events | Captured data, rendering and replay are consistent | Final independent verdict pending; presentation review separate |

## Browser evidence and the retained anomaly

There are **90 complete observations,71 attempted host actions,70 tool-completed attempts and one tool failure**, plus six untouched original images. Tool completion is not equivalent to effective action. The first **Show original** click (attempt5) returned complete, but observation6 stayed corrected and no version-select event was recorded. The following **Show correction** attempt failed because that button was disabled in the unchanged corrected state. Keyboard Enter on Show original and later clicks then switched versions successfully. The surrounding captures do not establish the first failure's cause; a busy-handler explanation remains unproven. Its original screenshot and both attempts are retained.

Candidate001 is the only implementation candidate; no revision was made. Independent packaged checks passed73/73 and controlled DOM/hash-race checks15/15, but those do not erase the actual interaction anomaly. The first critical workflow was exercised early and completed with that recovery, rather than being described as uninterrupted success.

The first document export contains47 events, three checks, two corrections and one reuse. After reload, the new UUID has no local records. Its natural-tour export has11 events; its later final export has15, including their own export events. Those are nested prefixes from one second document, not independent sessions. The18 checkpoint comparisons are seven after critical first use, seven after exploration, and0/24 after reopen and reload. The host was already source-exposed.

Natural playback was captured near0,4.4013,8.4015,12.4015,16.4015 and20.4021 seconds, then paused24. Each four-second active interval has a snapshot; this still is not continuous visual observation. Lossless text/chunk captures support independent rehashing, including fractional cursors and post-export layout. Explicit1280×720 and960×720 checks were retained; the viewport override was reset to actual1279×904. Lower controls and JSON panels need scrolling. OS reduced-motion behavior was not emulated.

The four originals below were directly inspected for synthesis. The first is an original-view review **after** checking/correction, visibly marked false; it is not a naïve first exposure. See [image brackets and hashes](browser-001/screenshots.json).

![Original retained after correction: false headline,80/90 counts and cropped70 baseline.](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-13/browser-001/screenshots/misleading-original-retained.jpg)

![Corrected view: unchanged80/90 counts, zero baseline and exact9/8 comparison.](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-13/browser-001/screenshots/corrected-count-comparison.jpg)

![Plain correction/debrief with original-check diagnosis and linked source and record hashes.](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-13/browser-001/screenshots/plain-correction-and-debrief.jpg)

![Zero control: false original equality,10-tile difference and explicitly undefined ratios.](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-13/browser-001/screenshots/zero-control-plain-debrief.jpg)

## Sources, provenance and remaining work

The [source review](../../research/gate-13/source-review.md) uses [Pandey et al.2014](https://doi.org/10.1109/TVCG.2014.2346419) and [Wijnker et al.2026](https://doi.org/10.1371/journal.pone.0340100) as empirical context for visual persuasion and correction. Their populations and treatments do not validate this fixture or supply human results here.

Actual roles: GPT-6 Astra xhigh specification/synthesis; GPT-5.6 Luna high sources; GPT-5.6 Sol high implementation; a separate Sol high independent auditor; host-supported browser operation and evidence preservation. These engineering workers are not the research program's four independent participant snapshots. Canonical precomputed records are public and scripted; active masks and event origins distinguish playback from local checks. Local controls likewise do not denote human judgments.

The [frozen program ledger](program-requirements-at-gate13.md) keeps the broader goal incomplete:18-card materials and independently checked withheld key, four-snapshot bench and comparators, integrated plain/visual instrument, applicable human readiness/feasibility/comparison, mechanism and cross-scale/durability work, and final updated ZIP. Gates0–12 remain bounded historical evidence, including Gate10's negative result.

Closed-core audit status and the component manifest will be finalized before synthesis handoff. The results-page browser/route audit, complete gate freeze and Git publication follow separately; none is claimed complete here.

**Approve Gate14 — Geometry ablations?** It remains unapproved and unrun. The separate full-program materials/key review is another dependency, not an implied approval to run the four-snapshot bench or human collection.
