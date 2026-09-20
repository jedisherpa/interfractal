# Gate 8 independent prespec review

Review of the unfrozen `gate8-charter-v1`, `gate8-model-v1`, `gate8-record-v1`, public fixture and authored prediction file. This is an independent software-model audit, not a browser or participant result. The source fixture is the sole input to `derive.py`; it uses Python `Fraction` and does not import the planned implementation or authored predictions as a calculation oracle. Predictions are compared only after independent derivation.

## Decision before freeze

**Mathematical and finite-certificate content: PASS. Event granularity: one clarification requested before freeze.** All nine within-case pairs, twelve menu subsets, every exact output and all nine checkpoint semantic states agree with the authored predictions. The minor event issue does not change a checkpoint state, but a frozen event contract should say whether the two additions at second 24 are two `add-query` events or one batch event. Prefer two replay-origin `add-query` events at cursor 24 in fixture order. At second 32, prefer a replay-origin `add-query` event followed by automatic `tour-stop` with reason `end-of-sequence`; the paused second-0 state is `initial-state`, not a fabricated user event. This yields an auditable log without implying a human actor. Recheck this review's file hashes if the contracts change.

## Derived results

| Case | Baseline exact conflicting pairs | Additional-query subsets checked | Family-wide exact minimum |
|---|---:|---:|---|
| C01 | 1 | 2 | 1: `xw90` |
| C02 | 6 | 4 | 2: `xw90`,`yv90` |
| C03 | 1 | 4 | none in the restricted menu; W01/W02 survive |
| C04 | 0 | 2 | 0: empty additional set |

For C01, projection maps both sources to `(0,1/2,−1/4)`; `xw90` maps them to x=`+1` and `−1`. For C02, all four project to `(1/2,−1/2,0)`. Each quarter-turn separately leaves two conflicting pairs; together they identify all four members of the finite family. The stacked linear observation matrices have ranks 3 then 4 in the 4D point cases, and 3, 4, 4, 5 for C02 under baseline, either single turn and both turns. These ranks describe known raw coordinate maps; the two-query minimum is a finite-menu property result, not a continuous-rank or global query-optimality theorem.

For C03, projection radius-squared is 1 and the w=0 slice radius-squared is 3/4 for both balls. At w=−2 and +2 the raw derivations are respectively `(−5/4,−21/4)` for W01 and `(−21/4,−5/4)` for W02; both observations at both settings are `empty`. The full menu therefore has a surviving unequal-property pair. The explanatory outside-menu slice w=+1/2 is a boundary `point` of radius-squared 0 for W01 and a `ball` of radius-squared 1 for W02. It is not an allowed additional query. The exact kind distinction between empty, point and ball is material.

For C04, baseline x coordinates differ by `1/500000000000` (=2×10⁻¹²). Raw observations are unequal, while the pair is within the diagnostic 10⁻¹⁰ tolerance and both x labels normalize to `0.00` at two decimals. The independent script explicitly checks negative-zero normalization. The turn yields x=`+1` and `−1` and robustly separates these *paired fixture worlds*. It directly observes `−w`; the property here is δ>0 only because this finite fixture pairs δ's sign with w's sign. A general claim that the turn reveals δ, or that rounded labels establish exact equality, would be false. The exact baseline already determines δ's sign and the minimum added-query count is zero.

Camera yaw is absent from the exact forward map and signature, so −45°, 0° and +45° cannot add raw information. This is a prespec invariant; actual information-hash and browser-state invariance remain to be tested on a build. The information fingerprint must exclude reference-world ID, as the contract says. Two references with identical selected observation bundles must have the same information fingerprint even when the displayed public reference selector differs. Certificate reveal and precision expansion likewise add no new source query.

All nine canonical checkpoint times are exactly 0,4,8,12,16,20,24,28,32 seconds. Independently recomputed compatibility sets and local property flags match the prediction file at each checkpoint. The final state is C04/W01 with `xw90`, paused at cursor 32. Natural playback and event origins remain implementation/browser checks; this review asserts no actual playback occurred.

## Historical integrity and scope

`check-history.py` independently verified all 979 unique frozen entries across Gates 0–7 against each freeze manifest, the live worktree bytes and the Git blob at `cbb32394e741bcaab78a0970a0905236c706d33e`. All eight manifest SHA-256 pins agree with the committed manifests. This is a preservation check, not a replay-availability or browser check. The public benchmark contains 10 declared worlds and no participant record or hidden answer service. Gate 9 remains outside this authorization.

## Reviewed file identities

| File | SHA-256 at review |
|---|---|
| `docs/gate-8/experiment-charter.md` | `57686dc2a3910da91d41742a6ba35fa7c4d344f0d41c838713b41ffc0e364ea1` |
| `docs/gate-8/model-contract.md` | `9add8c0d060cf02ef2be97ab33ac46edc392700601d17173f7f4a170c6edb26f` |
| `docs/gate-8/record-contract.md` | `246b2455175065209958875370bff8be6819277b312e0144d34361a71242713d` |
| `docs/gate-8/fixture.json` | `2ddeb27ae3b47cf139a98868d94c9dccb52a1fc834aee6978a328983cdf7a509` |
| `docs/gate-8/independent-predictions.json` | `2468b3934d36e1a9618f20cdf5ca1286344ea38687f32fc6af3f128f4100a9d6` |

Machine reports: `independent-results.json` and `history-integrity.json`. Commands: `python3 audit/gate-8/derive.py` and `python3 audit/gate-8/check-history.py`. Both pass on the reviewed bytes. No implementation or browser interaction was used in this prespec review.
