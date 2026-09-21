# Gate 10 — Predict an unseen view and transfer

Version `gate10-prespec-v1`. Authority is Paul's actual message **“Approve Gate 10: Predict an unseen view and transfer.”** This gate builds and checks a small deterministic software instrument. There are **zero human participants, no authorized human execution, and no learning or human-transfer outcome**. Source-informed agent submissions remain software tests. Gates 0–9 and `inputs/` remain immutable; Gate 11 does not begin here.

## Bounded question

Can five unfamiliar source/query combinations preserve a prediction or explicit skip before revealing a separately derived result, including an underdetermined case and a changed mathematical task family? Can the actual UI and service enforce that order without silently giving the answer through an inspector, replay, shared session, or read-only route?

“Unfamiliar” describes the frozen fixture split, not a person's prior knowledge. The fixed worked practice uses a source absent from assessment. Assessment sources and target source/query pairs are absent from practice and the canonical tour contains no worked assessment answer. The formulas, support observations and response alternatives are deliberately public and sufficient for manual derivation where identification is possible. This is not secret mathematics or adversarial exam security.

| Case | Operational category | Public evidence and query | Prespecified result class |
| --- | --- | --- | --- |
| T01 | Interpolation in the original point family | Two raw point views at 0°/90°; predict the intermediate angle used in practice for a different source. | Unique raw xyz. |
| T02 | Unseen setting in the same point family | New source, same two support angles; target 180° has no worked example. | Unique raw xyz. |
| T03 | Insufficient same-family setting | Two camera drawings of the same 0° raw point; hidden w has two declared alternatives; predict 90°. | Two possible outputs; no unique target. |
| T04 | Changed transfer family | Two exact slices of an unknown 4D ball; infer its parameters and predict a new slice. | Boundary point. |
| T05 | Changed transfer family, negative outcome | A different ball's two slices; predict a new slice. | Empty, distinct from a point. |

The transfer family changes both the source class (point to ball) and operation/output (linear rotation/projected coordinates to a quadratic slice and ball/point/empty classification). It is not another source angle or a cosmetic label. Both families still supply their formulas and exact raw observations. This modest operational change establishes a software task distinction only; it does not establish near/far human transfer or isolate learning from formula following. Gate 4/7 already used ball slices, so it is not novel to the project or the agents.

## Freeze, exposure and interpretation

Freeze these six authored files only after separate Sol prespec review: this charter, `model-contract.md`, `record-contract.md`, `fixture.json`, `private-answer-key.json`, and `independent-predictions.json`. The host writes `PRESPEC_FREEZE.json`. The key and predictions are private service/audit inputs. “Independent predictions” means pre-implementation analytic expectations supplied for an auditor to recompute, not already-completed independent validation.

Practice is one fixed, explicitly worked 4D-point example. Its complete answer may be public. It is never scored, assigned an assessment attempt, or included in assessment counts. The planned primary browser order is practice once, close it, then T01→T05. Later practice reopening is a retained review deviation. No timed study, randomization, comparison arm, participant order allocation, retention interval, or training dose is introduced. Nothing is learned by the program between cases.

Every local assessment attempt is `source_informed_software`; `humanEligible` and `firstExposureHumanEligible` are always false. A session's attempt ordinal and prior reveal flag describe software review history only. Seeing task supports in a tour is exposure to those supports. Seeing an earlier explanation may inform later cases. A new attempt, Reopen saved, new tab, or reload does not restore naïve exposure. The service cannot identify a person or establish prior exposure outside its document-scoped session. Report that limitation explicitly instead of calling a session's first attempt a first-exposure human prediction.

The primary mechanics recipe deliberately contains one wrong answer, three correct answers, and one skip. A later correction is a separate review attempt, never replacement of the wrong record. These selections test the instrument, not comprehension. Commit acknowledgement is ungraded; correctness appears only after a separate deliberate reveal. Skip stays null and unscored. No aggregate accuracy percentage, learning curve or transfer score is needed. If counts are reported, report answered/correct/incorrect/skipped/abandoned/repeat separately and retain their provenance.

## Decision criteria and boundaries

Readiness requires independently correct support/target arithmetic and ambiguity witnesses; correct raw-to-diagram rendering; fixed practice/assessment split; server-acknowledged immutable answer-or-skip before reveal; exact case/build/session binding; retained negative and repeated records; withheld privileged answer payload before reveal; deterministic answer-free replay; self-consistent live and paused snapshots; actual browser controls and inspected originals; unchanged historical evidence. A missing check remains pending. A failure prevents an unqualified result; a negative case is an intended result, not a reason to alter the fixture.

G9 had three active-clock state/fingerprint mismatches. G10 must publish each render, inspector and fingerprint from **one captured immutable snapshot**, with no later live-state read while awaiting hashing. Independent rehashing covers every actual DOM snapshot, including active tour observations. Passing only paused checkpoints would leave this requirement unresolved.

Use one initial candidate and at most two justified revisions (`001`–`003`) after prespec review/freeze. Preserve each failed candidate and prepackage audit draft that prompted a revision. Do not tune questions, scoring, labels or boundaries to observed successes. A material contract change needs a separately versioned prespec and review. Stop at a bounded negative/inconclusive packet if the budget is exhausted.

Astra specifies and later synthesizes; Luna supplies a small primary-source review; separate Sol workers implement and audit. The host owns approval/freeze, supported browser operation and originals, status/presentation/Git, and final stop. These are actual software roles, never human validators. Implementation lives in new `prediction-transfer/`, provisionally loopback port 44003, with no new dependency or deployment. The packet separates exact model results, lifecycle/leakage evidence, browser/replay evidence and **human learning/transfer: untested**. Stop before **Gate 11 — Break a summary by changing its receiver**.
