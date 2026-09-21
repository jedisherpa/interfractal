# Gate 11 independent prespec review

**Verdict: PASS for freezing the five reviewed bytes.** This is a model and protocol review, not a build or browser verdict. The independent derivation imports no implementation code and passes 205 of 205 checks over the four source worlds, eight menu subsets, and 32 full receiver-payload projections. Its reproducible script and full certificates are `derive-prespec.py` and `prespec-derivation.json` in this directory.

| Authored input | SHA-256 |
| --- | --- |
| `docs/gate-11/experiment-charter.md` | `52b7c3867661323e3d7def4e16f052d724297ed139e24506aa704771eceb706b` |
| `docs/gate-11/model-contract.md` | `18f613cdd9ea352581fce1a7ee0fcc1425282c650f0c870b9cc000d5955115e8` |
| `docs/gate-11/record-contract.md` | `207f6a04142af991aa3371b5a01ccf0520d167fe30c2320c175a9b655a4a869a` |
| `docs/gate-11/fixture.json` | `ae2cd2c4bac68a05bbf83f6ccd40f7b7ed2fe394b558da6c529a3d39f7da3adc` |
| `docs/gate-11/independent-predictions.json` | `db411186c313d349a73a1c3b6ef7d4e77687e3000097587bb730bdd92defeb22` |

In world order W00, W01, W10, W11, the full-source answers are R_COUNT = yes/yes/yes/yes and R_RELEASE = no/no/no/yes. The base payload is byte-identical across the worlds, including its logical, non-dereferenceable `sourceRef`, so the release conflict is a genuine receiver-payload collision. The three menu bits are calibration=1, authorization=2, paint=4. Only masks 3 and 7 are globally sufficient for R_RELEASE; mask 3 is uniquely subset-minimal and has the two-entry cardinality minimum. The empty mask is already sufficient and minimum for R_COUNT. Paint changes payload bytes without changing any partition. Each of the eight subset certificates matches the author expectation, including answer sets and conflicting world pairs; one negative dependency can settle a *local* no while its one-field subset remains globally insufficient. The count-only shortcut would falsely release W00, W01 and W10.

The pure evaluator boundary is coherent: its declared inputs are only validated receiver ID and projected payload. Full world IDs, source hashes, revision IDs and inspection envelopes stay outside that input. Copied field paths and source bindings were independently checked for every projection. The contracts specify retained parent/sibling revisions, truthful empty and duplicate repairs, diagram/plain information parity, rejected-input behavior, and an atomic render/export snapshot check that directly addresses the prior gate's stale metadata defect. These remain implementation and observation obligations.

The canonical tour specifies seven scheduled events over 24 seconds, seven paused checkpoints, and an explicit automatic `end-of-sequence` stop. The browser recipe designates 18 paused comparisons: seven baseline after the first actual repair path, seven after exploration, two after Reopen saved and two after reload. The first-use UI path is correctly prioritized; baseline is not represented as pre-exposure evidence. The host made the single auditor-requested clerical clarification in record-contract step 6 before this final derivation: the preserved Gate 10 instrument root is where exact paused run/build identity is checked, and its separate `review/results.html` is where the negative-result label is checked. This avoids asking the immutable instrument to display a label it does not contain, without changing the model.

There are no unresolved prespec blockers. No Gate 11 implementation, browser action, human participant or learning outcome was audited here. Candidate packaging, evaluator isolation, the critical actual UI workflow, exact checkpoint/event behavior and post-render metadata must be assessed separately against these frozen bytes.
