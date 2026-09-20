# Gate 10 independent prespec review

**PASS for the six authored prespec files only.** I independently derived the practice, every supplied support, all five target results, the point-observation ranks, the two-source ambiguity witness, and both ball reconstructions using exact rational arithmetic. The author-supplied prediction file is consistent with those derivations; it is an oracle checked here, not the source of the result. The reproducible script [`derive-prespec.py`](derive-prespec.py) made 98 checks with no errors. [`prespec-review.json`](prespec-review.json) records all six reviewed file hashes and the derived values. These local audit files contain answer details and must remain outside public review routes.

## Exact case results

The fixed worked P00 source `(1,0,0,-1)` gives identical raw `a0` and `a90` supports `(1,0,0)`, yet the different source transforms identify both `x` and `w`; its worked `am` result is `(7/5,0,0)`. It has no assessment response controls and does not share an assessment source or target source/query pair.

| Case | Independent derivation from supplied supports | Intended option |
| --- | --- | --- |
| T01 | `a0` gives `x=2`; `a90` gives `w=1`; rank 4. The intermediate query gives `(3/5)2−(4/5)1=2/5`, hence `(2/5,-1,1/2)`. | O2 |
| T02 | `x=-3/2`, `w=1/2`; rank 4. At `a180`, `x'=3/2`, yielding `(3/2,1/4,-1)`. The first `a0` support alone identifies this particular target, as the key explicitly says. | O1 |
| T03 | Both raw supports are `a0=(1/3,2/3,-1/3)`; only display yaw changes 0°→45°. Rank is 3 with an unobserved `w` direction. Witnesses `w=-2` and `w=2` give target set `{(-2,2/3,-1/3),(2,2/3,-1/3)}` at `a90`; neither source is designated true. | O4 |
| T04 | The slices at `-1/4` and `1/2` solve to `cw=1/2`, `R²=25/16`. At `7/4`, `delta=0`: one point at the origin, radius squared 0. | O3 |
| T05 | The slices at `-1/2` and `1/2` solve to `cw=-1/2`, `R²=1`. At `1`, `delta=-5/4`: empty, with null radius and radius squared. | O4 |

The independently constructed query matrices match the declared `a0`, `am`, `a90`, and `a180` rows. The T01/T02 paired supports have rank 4; repeating T03's `a0` raw query under a different camera has rank 3 and cannot identify `w`. Each task has exactly one intended alternative under its declared result semantics. No assessment target equals the worked practice target. The transfer cases genuinely change source class, operation and output schema; this remains an operational software distinction, not evidence of human transfer. T02 is an unseen setting, even though that target is computable from its first support alone.

## Frozen behavior and exposure boundary

The public fixture gives formulas, supports, neutral response hypotheses, and T03's two possible `w` values. Those permit manual deduction but carry no correct-option label, solved source, target record, grade or explanation for an assessment task. The private key and author predictions are separate nonserved inputs. The model contract explicitly requires sanitized public `/build.json` without private paths, hashes, lengths or contents; an immutable candidate and actual HTTP bytes must later prove this. Before reveal, the service must acknowledge and lock an answer or null skip without grade, target or correctness signal. A separate valid reveal request returns the case result. Retry, wrong credentials, cross-session isolation, repeated attempts, abandoned drafts and redacted export all remain implementation and browser audit obligations.

The prescribed primary software recipe is **one wrong, three correct, one skip**: T01 O1 wrong; T02 O1, T03 O4 and T05 O4 correct; T04 skip with null grade. A later T01 O2 correction must be a new ordinal with `priorReveal=true`, retaining the first wrong answer. These are expected mechanics checks, not observed responses or an accuracy estimate.

The canonical 20-second tour has six paused checkpoints `(0,4,8,12,16,20)` and six scheduled events: case selections T02/T03/T04/T05/T01 followed by an automatic `end-of-sequence` stop at 20. It contains no assessment answer, receipt, practice opening or reveal. The contract explicitly addresses Gate 9's live-clock defect by requiring one immutable captured semantic/ledger payload, viewport and snapshot revision for each rendered frame, with hashes computed from those same clones. Independent rehashing of *every* actual browser snapshot, including active fractional clocks, remains a required future check; paused checkpoints alone will not satisfy it.

This prespec passes for a bounded software instrument with zero human participants. It does not certify any implementation, build route, private-data exclusion in served bytes, browser control, screenshot, actual attempt, checkpoint recovery, or human learning/transfer outcome. Freeze the reviewed six file hashes before implementation. Keep Gate 0–9 artifacts unchanged and Gate 11 unapproved.
