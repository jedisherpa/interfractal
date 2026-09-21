# Looking Glass — Gate 12 review

**Gate 12 passes within its declared software scope.** The actual browser selected simulated joint action P2 while preserving Archive's P3 recommendation and Dispatch's P1 recommendation, their different reference functions, and their source and creation provenance. A joint procedural result did not replace the two local judgments. The independent closed-core verdict is `PASS_DECLARED_SOFTWARE_SCOPE`.

This is a public, fictional, source-informed benchmark. Zero humans participated; zero actions were enacted. Human coordination, consent, learning, fairness and a diagram advantage remain untested. Gate 10's negative result and all earlier gates remain unchanged.

Open the [paused instrument](http://127.0.0.1:44005/) and [visual results](http://127.0.0.1:44005/review/results.html). The results route is the presentation target; its final browser and route audit follows this synthesis. The [13-entry replay collection](replay-collection.json) preserves the earlier gate identities and restart commands.

| Identity | Value |
| --- | --- |
| Completed run / build | `G12-COORD-002 / g12-3c5526361a7cb2cc5c4a` |
| Full source SHA-256 | `3c5526361a7cb2cc5c4afe35c23801f183dacdc2f8ae4653471b202a27a9665c` |
| Base revision | `a7d6d3f686817f4cb9700ed3bf3095845dea3874` |
| Runtime | Node `v24.17.0`, `/opt/homebrew/Cellar/node@24/24.17.0/bin/node` |
| Prespec | Five authored files, independently derived with 67/67 checks; nine specification/review pins frozen before builder dispatch |
| Closed core | 102 files; manifest SHA-256 `cdcbfb68c8fec722a217075d30c14b76e69803e753296fc3bde8a6ea936335f6` |

## Watch or inspect

Choose **Reopen saved start**, then **Play**. The 24-second scripted tour records Archive at 4 seconds and Dispatch at 8, selects P2 at 12, switches to the plain table at 16, and selects the EXTREMES scenario and its P1 tie-break at 20. At 24 it restores the opening display and stops automatically. The eight events have explicit scripted/automatic origins. The actual natural run stopped after 24.002 seconds with `end-of-sequence`; a manually selected final checkpoint is distinct from that observation.

For local review, use **New local branch**, **Record Archive proposal**, then **Evaluate joint procedure** to see missing Dispatch block action. Record Dispatch and reevaluate for P2. Test EXTREMES and NONE under **Scenario**. **Inspect retained outcome** shows the selected immutable record's own context. Choose **DETAIL_CONTROL** under **Next branch assignment** to create the sensitivity branch; the original branch remains unchanged. **Representation** selects diagram or plain table. Export before reload: local branches are document memory; reload starts a new document UUID and empty local history.

Restart the exact tested snapshot, including its explicit run:

```sh
/opt/homebrew/Cellar/node@24/24.17.0/bin/node /Users/paul/BTC-Learning/experiments/looking-glass/coordination/builds/g12-3c5526361a7cb2cc5c4a/server.mjs --run /Users/paul/BTC-Learning/experiments/looking-glass/coordination/runs/G12-COORD-002 --port 44005
```

The service binds only to this Mac's loopback address.

## The finite result

All facts are common and public. The local references apply different objectives to them; there are no private signals.

| Mode | Retained channels | Minutes | Archive detail rank | Dispatch speed rank | Worse rank |
| --- | ---: | ---: | ---: | ---: | ---: |
| P1 | 2 | 1 | 2 | 0 | 2 |
| P2 | 4 | 3 | 1 | 1 | 1 |
| P3 | 6 | 5 | 0 | 2 | 2 |

`R_DETAIL@1` ranks channels descending and recommends P3; `R_SPEED@1` ranks minutes ascending and recommends P1. Rank zero is first. Both rankings always cover all three modes, independently of availability. `MINIMAX_RANK@1` chooses the eligible mode with the smallest worse ordinal rank, then uses fixed P1→P2→P3 order to break ties. This is a stipulated ordinal procedure, with no fairness or utility interpretation.

The complete oracle covers two reference assignments × three eligibility scenarios × four proposal-presence states = **24 contexts**, checked independently in both proposal creation orders. Missing proposals take precedence over no eligibility. With both proposals present, BASE/ALL selects P2, BASE/EXTREMES ties P1 and P3 and selects P1, and BASE/NONE creates no action. Changing only Dispatch's reference to detail in a fresh branch makes both recommendations P3 and selects P3 in ALL and EXTREMES; NONE remains blocked. Separate group/reference records persist even when their modeled first choices match.

| Expected | Observed | Interpretation | Unresolved or bounded |
| --- | --- | --- | --- |
| P2 selection preserves P3/P1 | Actual first-use controls and unchanged proposal content hashes; action `enacted:false` | Procedural selection and local preference remain separate | No human acceptance or enacted export |
| Missing proposal / NONE yields no action; EXTREMES uses declared tie | Actual blocked records and P1 tie outcome retained | Negative cases and dissent survive evaluation | Rule stipulated for this finite menu |
| Changed Dispatch reference yields P3 without rewriting BASE | Fresh branch records Dispatch first; old branch remains P3/P1 | Reference sensitivity and provenance preservation | No belief change or consensus inferred |
| Same information, exact restores and inspectable history | Two diagram/plain hash pairs; 18 checkpoint matches; earlier-record inspection works | Bounded representation and recovery checks pass | No measured visual advantage; scrolling required |
| Replay and snapshot publications agree | 93/93 semantic, information, viewport and scene matches; eight natural scheduled events | Captured states and event boundaries are consistent | Active snapshots omit three tour intervals; presentation handoff pending |

## Actual evidence and retained failures

Candidate 002 has **93 complete observations, 79 successful host actions and five untouched original JPEGs**. The first document's final export contains two local branches, four immutable proposals, five created outcomes and three reused evaluations. The primary recipe expected one reuse; two additional returns to retained NONE and EXTREMES records reused them as well. Source-derived ranks, record hashes, proposal references and creation-event links match all nine local records. The 54-event first-document and 18-event second-document exports each include their own export event and exact included-through sequence. Document UUIDs identify provenance outside semantic hashes.

The 18 paused comparisons comprise seven baseline checkpoints captured **after** first use, seven after exploration, and 0/24 after reopening and reload. They are software recovery observations, not naïve human exposure. Same-cursor event hashes chain across 38 adjacent first-document and five second-document pairs. The final page was reopened paused at zero. The [independent final audit](../../audit/gate-12/final-audit.md) and [verification result](../../audit/gate-12/final-core-verification.json) report 73/73 focused checks, 102/102 core pins and 1,613/1,613 earlier frozen entries unchanged. The independent verifier imports no Gate 12 implementation code.

| Candidate | Evidence | Outcome |
| --- | --- | --- |
| 001 · `g12-0d66d254f275f3663dee` | 43 observations, 31 action attempts (29 completed, two failed), six originals; first critical workflow completed | **Failed.** Retained-record selection left Inspect disabled; registry duplicated L1 and omitted C0; long source hash crossed a card. A separate host locator error was resolved and retained. Numeric/HTTP checks passed 144/144, controlled UI checks 9/11; those did not override the actual failure. |
| 002 · `g12-3c5526361a7cb2cc5c4a` | 93 observations, 79 successful actions, five originals | Corrected selection/enablement, unique registry and wrapping. Independent build checks 148/148 and controlled UI checks 19/19; actual earlier-record inspection and full core audit pass. Model and server bytes match 001. |

Totals are **136 observations, 110 action attempts (108 completed, two failed) and 11 originals**. Both failures are included in candidate 001's count. One justified revision was used; no 003 was needed. The failed candidate remains intact.

These four unchanged originals were directly inspected for synthesis. Observation brackets are in [screenshots.json](browser-002/screenshots.json).

![Original 1280×720 capture: Archive recommends P3, Dispatch P1, and the joint procedure selects P2.](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-12/browser-002/screenshots/P2-with-conflicting-local-recommendations.jpg)

![Original 1279×904 capture: plain typed relations and immutable local proposal history for P2.](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-12/browser-002/screenshots/same-information-plain-P2.jpg)

![Original 960×720 capture: NONE creates no joint action while P3/P1 recommendations remain.](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-12/browser-002/screenshots/no-action-disagreement-preserved-narrow.jpg)

![Original 960×720 capture: the fresh reference-control branch retains separate group cards and selects P3.](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-12/browser-002/screenshots/changed-reference-P3-narrow.jpg)

## Qualifications and source basis

Active DOM captures occurred near 0, 9.522 and 20.242 seconds. There are no separate active captures during 4–8, 12–16 or 16–20 seconds. Event records and paused checkpoints support those boundaries; this is not continuous visual observation. Lossless text/chunk capture preserved all 93 complete snapshots without transport truncation. Initial 1280×720 became the default 1279×904; explicit 1280×720 and 960×720 checks then passed without horizontal overflow, and the override was reset. Lower controls and capped JSON panels require vertical/internal scrolling. Reduced-motion emulation was not tested.

The raw canonical registry preloads public scripted records at paused zero. Selected semantic state, visible cards/history and actual event provenance distinguish these from events performed during playback. It is not a secrecy or temporal withholding mechanism. Local controls and scripted procedural acknowledgements are software records, never evidence of human consent.

The [primary-source review](../../research/gate-12/source-review.md) uses [Star and Griesemer (1989)](https://doi.org/10.1177/030631289019003001) and [Schmidt and Bannon (1992)](https://doi.org/10.1007/BF00752449) as conceptual motivation for preserving local viewpoints and coordination records. [Dahleh et al.](https://doi.org/10.1287/opre.2015.1378) is adjacent formal context about local information and strategic equilibria; this fixture instead has common public facts and different objectives. None validates this instrument's human effects.

Actual routing: GPT-6 Astra xhigh specification/synthesis, GPT-5.6 Luna high sources, GPT-5.6 Sol high implementation, and a separate Sol high independent auditor. The host performed supported browser controls, setup and evidence preservation; no host model switch is claimed. These are software-agent roles.

The [core freeze](CORE_EVIDENCE_FREEZE.json) is closed and independently reviewed. This packet, the results page and [component manifest](run-evidence.json) are the subsequent synthesis layer; final presentation/route audit, complete gate freeze and Git publication remain host work after this handoff.

**Decision requested: approve Gate 13 — A persuasive but wrong view?** Gate 13 is unapproved and unrun. This Gate 12 result does not authorize a human study or repair an earlier gate.
