# Gate 2 source review: Hopf correspondence and shared-reference limits

Accessed 2026-09-19 (America/Denver) using the requested Luna primary-source
pass. Scope is Gate 2 only. The review inspected the two named mathematical
sources, one university-hosted topology reference needed for the section
claim, and the already pinned Hopf Workshop/Interfractal snapshots. No live
application deployment is treated as equivalent to a pinned checkout.

## Sources and pinned material

The named sources are Niles Johnson's visualization and David W. Lyons's
mathematical exposition. Johnson describes the Hopf fibration as circles over
points of `S²`, calls out linked fibers and the two-solid-tori decomposition,
and explains why the exceptional stereographic image looks like a central
line: the circle closes through the point at infinity. Lyons gives a
quaternion-coordinate Hopf map `S³ → S²`, identifies each inverse image as a
circle, and derives stereographic projection from `S³` with one point removed
to `R³`. His stereographic result is that a fiber is a circle except when it
contains the projection point, when its image is a line. See the exact URLs,
access dates, and page/line pins in `sources.json`.

For the local-chart and section boundary, Ralph Cohen's Stanford notes define
the Hopf map as a principal `S¹` fibration, give trivializations over the two
hemispheres, and prove that a principal bundle has a section exactly when it is
trivial. This is the additional source required to support the no-global-
section statement; it is not used to add any semantic claim.

The reusable code convention is pinned at `hopf-workshop@2967f71aa19117925f55b9349a7bfc0ec8fc8dea`
(`hopf_model.py`, `hopf.js`) and `interfractal@1326cc64223fc167610c2157f2c24fa33a87c93b`
(`src/workshop/hopf.ts`). Those snapshots reject non-unit inputs, use a
common-phase gauge, expose north/south sections, and reject the stereographic
chart pole instead of silently rescaling or dropping it. The snapshots are
implementation references only; they do not identify today's deployment.

## Convention to carry into Gate 2

Use the explicit complex-pair convention

```text
z = (z₁,z₂) ∈ C²,       |z₁|² + |z₂|² = 1
h(z) = (2 Re(z₁ conj(z₂)),
        2 Im(z₁ conj(z₂)),
        |z₁|² − |z₂|²).
```

The output lies on `S²` because, writing `a=|z₁|²` and `b=|z₂|²`, its squared
norm is `4ab+(a−b)²=(a+b)²=1`. A shared phase multiplies both coordinates by
`e^{iγ}`; the product `z₁ conj(z₂)` and both squared magnitudes are unchanged.
Therefore `h(e^{iγ}z)=h(z)`, and the common-phase orbit is the fiber over the
same base point. This is the exact invariant the implementation should check,
with normalization checked separately. A shared-phase change moves the selected
source point in `S³` along its fiber while leaving its Hopf base fixed. It must
not be presented as a change of record, consent, authority, or fact.

Lyons uses a quaternion real-coordinate ordering/sign convention rather than
this complex-pair display convention. Both describe the Hopf fibration, but a
Gate 2 run must record its own coordinate order, sign, projection pole, and
orientation. Never compare raw components from the two formulas without the
conversion.

## Local sections, transition, and the global boundary

With `c=cos(θ/2)` and `s=sin(θ/2)`, the pinned code's two representatives are

```text
s_N(θ,φ) = (c, s e^(−iφ))
s_S(θ,φ) = (c e^(iφ), s).
```

On their overlap they have the same base point and
`s_S(θ,φ)=e^(iφ)s_N(θ,φ)`. The north representative is well behaved at the
north pole but its `φ` dependence makes it fail at the south pole; the south
representative has the opposite behavior. The transition `e^(iφ)` winds once
around the fiber circle as the equator is traversed. The two section values
are different representatives. To express the same source point in the other
chart, compensate the local phase: `gamma_S = gamma_N - phi`, so that
`exp(i gamma_S) s_S = exp(i gamma_N) s_N`. This compensated chart change
preserves the source point; an uncompensated shared-phase action moves it.

Cohen's notes establish the relevant bundle facts: the Hopf map is a principal
`S¹` fibration, the upper/lower hemisphere charts are locally trivial, and a
global section would trivialize the principal bundle. The Hopf bundle is not
trivial: a trivialization would identify its total space `S³` with
`S² × S¹`, but these spaces have different first homology (`H₁(S³)=0` versus
`H₁(S²×S¹)=Z`). Thus no global continuous choice of one phase origin exists.
The local sections and their winding transition are the implementation-facing
version of this obstruction. A discontinuous selector or a finite sampled
lookup is not a continuous global section and should be labeled accordingly.

## Stereographic pole and finite rendering

For the pinned complex-pair real ordering
`(Re z₁, Im z₁, Re z₂, Im z₂)`, the selected stereographic chart is

```text
s(z) = (Re z₁, Im z₁, Re z₂) / (1 − Im z₂).
```

Its excluded point is `(0,0,0,1)`. A fiber through that point is a line in the
finite `R³` chart, with its two ends joining through infinity in `S³`; every
other fiber is a circle. Lyons's PDF uses a different real-coordinate ordering
and projects from `(1,0,0,0)`, so the apparent axis and denominator differ
after conversion. The run record must name the chosen pole and denominator.

The renderer must keep the exceptional fiber visible as an explicitly labeled
line/infinity case or show the clipped portions and explain the clipping. A
routine that drops a pole sample, rejects a whole fiber because one point is
large, or draws only a bounded segment can be useful as a display policy but
cannot be reported as the full fiber. Finite phase samples are samples of a
continuum, not a proof that every fiber or every point was drawn. Sampling
count, clipping threshold, omitted samples, and chart-switch policy belong in
the run record. Camera motion changes screen placement only; it does not
change normalization, `h`, fiber identity, or the candidate record mapping.

## Candidate shared-reference view

The source review supports a separate, explicitly proposed mapping over stable
fictional records. Keep record IDs, source facts, histories, unknowns, and
ambiguity outside the Hopf coordinates. A reference object should carry an ID,
wording, scope, author, version, and relevance rule. Changing only that
reference may alter emphasis, grouping, or selected base point while keeping
the source records and histories byte-for-byte unchanged. Include a plain list
of the same records, preserve alternative views, and retain an intentionally
unmapped or multiply interpretable record.

Loop order is a display choice unless a circular topology has been justified
for that record type. Geometric linking, center placement, or common phase
does not establish influence, agreement, authority, trust, attention, or a
human essence. The mapping is a candidate interface rule to test, not a
consequence of Hopf geometry and not evidence about people.

## Gate2 source-grounded checks and limits

| Check | Expected source-grounded behavior | Limit |
|---|---|---|
| Normalization | Reject or flag non-unit `z`; `h(z)` has unit norm for accepted inputs. | Floating-point tolerance is an implementation choice. |
| Shared phase | Vary `γ` over a fiber while `h` and base identity remain fixed. | Invariance does not mean all state changes are irrelevant. |
| Local charts | North/south sections agree on the base and differ by `e^(iφ)` on overlap. | No single continuous phase origin covers all of `S²`. |
| Pole fiber | The selected pole fiber is represented as a line through infinity in the stereographic chart. | A clipped finite canvas cannot show infinity or the continuum. |
| Fiber samples | Selected finite phase samples map back to the same base within tolerance. | Samples do not exhaust `S³` or all fibers. |
| Reference switch | Same stable records and histories remain inspectable under two declared rules. | A visual rearrangement does not validate a psychology or governance claim. |
| Camera control | Camera-only motion leaves geometry and record semantics unchanged. | Screen-space overlap remains a display ambiguity. |

These constraints are sufficient for the Gate2 source review. They do not
establish a human-use effect, a real-world collective topology, or a Gate3
four-dimensional-object result.

Editorial provenance: root clarified the distinction between source phase
motion and compensated chart coordinates after the bounded Luna source pass.
