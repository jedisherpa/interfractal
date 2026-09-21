# Gate 4 source review: 4D-ball slices, orthographic projection, and ambiguity

Accessed 2026-09-20 (UTC) using the requested GPT-5.6 Luna primary-source pass. Scope is Gate 4 only: the solid 4D ball slice, its ordinary 3D orthographic image, the center/interior/boundary/empty cases, and a bounded representation-ambiguity construction. No Gate 5 work, implementation, UI testing, human study, or external communication was performed.

## Source basis

Princeton's Sanjeev Arora lecture note defines the unit n-ball by `sum_i x_i^2 <= 1` and gives the 4D hyperplane example `x_1 = 1/2`: the slice is a 3-ball of radius `sqrt(1 - 1/2^2)`; it also states that every parallel slice is a ball (Lecture 11, PDF p. 1, lines 40–53 in the fetched text). This is the direct primary source for the dimension drop and square-root radius law. Scaling the same equation from unit radius to `R`, and replacing the fixed coordinate by `w=s`, gives the Gate 4 formula below.

The University of Toronto analysis notes distinguish an open ball (`< r`), a sphere (`= r`), and a closed ball (`<= r`) (section “Basic terminology and notation,” lines 17–22). Their “Interior, boundary, and closure” section defines interior by containing a neighborhood, boundary by every neighborhood meeting both a set and its complement (lines 28–38), and works out that the boundary of an open ball is the radius-`r` sphere (lines 56–71). These definitions support the UI distinction between a nondegenerate solid slice, its spherical boundary, a boundary-touching singleton, and an empty slice.

The sources support the mathematical definitions and slice example. They do not claim a particular browser implementation, establish human understanding, prove arbitrary shape reconstruction, or establish a physical fourth dimension.

## 4D solid-ball slice derivation

Use the closed solid ball

```text
B⁴_R = {(x,y,z,w) : x² + y² + z² + w² <= R²}.
```

The hyperplane slice at `w=s` is obtained by substitution:

```text
B⁴_R ∩ {w=s}
  = {(x,y,z,s) : x² + y² + z² <= R² − s²}.
```

Therefore, for `|s| < R`, the slice is a 3D solid ball with center `(0,0,0,s)` in the slice hyperplane and radius `ρ(s)=sqrt(R²−s²)`. The center slice `s=0` has radius `R`; an interior off-center slice `0<|s|<R` has a strictly smaller positive radius. The boundary of each such solid slice is the ordinary 2-sphere `x²+y²+z²=R²−s²` in that hyperplane. This is a cross-section of a solid 4D ball, not a set of projected hypercube vertices.

At `|s|=R`, the inequality forces `x=y=z=0`, so the intersection is the singleton `(0,0,0,s)`. It is degenerate and must be labeled as a point rather than drawn as an ordinary sphere or as a zero-radius filled ball. At `|s|>R`, `R²−s²<0`, so no real `(x,y,z)` satisfies the inequality and the slice is empty. The center/interior/boundary labels here describe the slice parameter's position relative to the valid interval `[-R,R]`; they should not be confused with the topological boundary of the 4D ball.

The corresponding 4D boundary sphere `S³_R={(x,y,z,w):x²+y²+z²+w²=R²}` has the same radius formula for `|s|<R`, but its slice is only the 2-sphere boundary. At `|s|=R` its intersection is again a singleton, and outside the interval it is empty. Keeping `B⁴_R` and `S³_R` separate prevents a boundary render from being reported as the full solid slice.

## Orthographic projection derivation

For the fixed coordinate projection `P(x,y,z,w)=(x,y,z)`, the image of the centered solid ball is exactly the 3D ball of radius `R`:

```text
P(B⁴_R) = {(x,y,z) : x²+y²+z² <= R²} = B³_R.
```

The inclusion `P(B⁴_R) ⊆ B³_R` follows from dropping the nonnegative `w²` term. For the reverse inclusion, any `(x,y,z)` with norm at most `R` lifts to `(x,y,z,0)` in `B⁴_R`. Thus an orthographic 4D-to-3D projection of a centered ball has center `(0,0,0)` and radius `R`; it does not shrink with the omitted coordinate. A prior orthogonal source rotation maps the centered ball to itself, so the same radius result holds after that rotation. A separate 3D orthographic display camera can rotate the displayed coordinates without changing this world-space radius (apart from an explicitly recorded display scale).

This is a direct set-theoretic derivation from the Princeton ball equation, not an external claim that a rendered image alone identifies the source.

## Reproducible ambiguity construction

Let a declared first view be a prescribed 3D movie `m(t)` with stable frame times and coordinates. One compatible representation is a stored 3D animation whose state at time `t` is exactly `m(t)`; its keyframes and interpolation can be saved without any fourth coordinate. Another compatible representation is a 4D source state `q(t)` and projection `P R(t) q(t)` that equals the same `m(t)`. The first construction is a deliberate 3D replay of the output, while the second is a higher-dimensional generator. Both are observationally compatible with the declared movie.

This is a constructive counterexample derived in this review, not a quote or claim from either source. It establishes that movie appearance alone does not prove a higher-dimensional origin. The candidate class is bounded to stored 3D frame sequences (or equivalent 3D trajectories) that reproduce the chosen movie; it does not assert that every arbitrary shape or movie has a unique or finite representation. A known intervention can distinguish models only when the intervention is independently recorded and the competing representations are required to answer it consistently. A 3D replay can be scripted to match the tested movie, so replay agreement by itself is still not evidence of dimension.

## Gate 4 source-grounded checks and limits

| Check | Expected result | Basis and limit |
|---|---|---|
| Center slice | At `s=0`, a 3-ball of radius `R`; its boundary is an ordinary 2-sphere. | Direct substitution in the ball equation; Princeton supports the unit-radius slice law. |
| Interior slice | For `0<|s|<R`, a nonempty 3-ball of radius `sqrt(R²−s²)`. | Direct scaling/substitution; valid only for the declared centered Euclidean ball. |
| Boundary parameter | At `|s|=R`, exactly one point. | Inequality forces all remaining coordinates to zero; label as degenerate singleton. |
| Outside parameter | For `|s|>R`, empty. | The residual radius-squared is negative; do not render an unlabeled zero-size object. |
| Boundary versus solid | `B⁴_R` uses `<=`; `S³_R` uses `=` and gives only the 2-sphere boundary in an interior slice. | Toronto definitions separate ball and sphere; a boundary render is not the solid volume. |
| Orthographic image | `P(B⁴_R)=B³_R`, radius `R`, with a centered lift proving surjectivity. | Direct derivation; source equation supplies the set being projected. It is not a claim about perspective or automatic rescaling. |
| Movie ambiguity | A stored 3D animation can reproduce a selected 3D projection movie. | Constructive derived counterexample; does not rule out distinguishing models with independent interventions or source metadata. |

These checks establish mathematical fidelity and a bounded observability warning. They do not establish human understanding, arbitrary 4D reconstruction, or physical extra dimensions. A Gate 4 instrument should show the solid slice and its boundary distinctly, mark singleton and empty states explicitly, keep projection and slice modes separate, and preserve the declared candidate class in the ambiguity test.
