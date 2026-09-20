# Verification record

Run date: 14 September 2026. Model: Hopf Workshop v0.1.

## Executable checks

`python3 -m unittest -v` completed successfully: **58 tests passed** (42 Hopf kernel + 16 WeOpoly-sequencing rehearsal). Same-version safety withdrawal now stops `act()`; a later draft’s review stamps do not invalidate a live agreement.

The suite contains 13 geometry tests, 14 protocol tests, and 13 public-API/error-path tests. Two geometry tests each use 1,000 deterministically seeded sampled states: one for norm/projection invariance and one for a nonconstant gauge-invariant suggestion rule. Sampling checks the implementation; it is not an exhaustive proof.

`node test_hopf.js` completed successfully: **30 tests passed**. This is a JavaScript port of the same geometry and protocol, used by `workshop.html`.

`python3 feature_walk.py` completed successfully: **19/19 advertised features passed**.

A stdlib line tracer over `hopf_model.py` during the unit tests reported **90.5%** executable-line coverage. Remaining missed lines are the `if __name__ == "__main__"` demonstration block.

The demonstration `python3 hopf_model.py` produced:

| Check | Observed value |
|---|---:|
| Curvature integral divided by 2π, chosen sign convention | −1.0000000257020942 |
| Horizontal-lift phase after one latitude loop at θ = 60° | 89.99999999999997° |
| Gauss linking estimate for two distinct fibres, 240 samples each | 1.00013286301794 |
| Commitment with confidence 1.0 but missing authorization/consent | False |
| Commitment with explicit, version-matched checks and consent | True |
| Simulated action after withdrawal | False |
| Unresolved consequences remain recorded after withdrawal | True |
| History events retained after the demo walk | 11 |

Headless Chrome (`playwright-core`, system Chrome channel) exercised `workshop.html` at desktop 1280×900 and mobile 390×844: **15/15 UI checks passed**.

- Title, motto, suggestion, and Hopf coordinates render
- Changing φ can change the geometric suggestion
- Certainty without checks cannot commit
- Review + consent + commit allows simulated action
- A new proposal does not stop acting on the live agreement
- Withdrawal pauses action and keeps history
- Repair then release retires the agreement
- Linking recompute is numerically near one
- Canvas paints the stereographic fibres
- Reframe / geometric suggestion remain unauthorized
- Empty repair is recorded instead of throwing
- Proposal text is shown as text, not HTML
- Cardboard-dragon demo walks commit, act, and withdrawal

The README supplies exact algebraic derivations for the norm, common-phase invariance, torus level sets, hemisphere lifts, chart transition, and latitude holonomy. Numerical checks supplement those derivations.

## Explicit nonclaims

- Not a demonstration that a human mind or a governance system is homeomorphic to S³.
- Not evidence that a rosette depicts an actual physical energy field.
- Not production authentication, adversarial security, concurrency control, or signed audit storage.
- Not a real-world safety inspection or a criterion for overriding consent.
- Not an empirical validation that the geometric metaphor improves learning.
- Not a theorem that topology guarantees ethics, safety, liveness, or human participation.

The Python files remain the reusable, dependency-free reference implementation. `workshop.html` is a teaching view over the same model.
