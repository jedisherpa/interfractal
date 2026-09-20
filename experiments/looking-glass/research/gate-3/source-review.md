# Gate 3 source review: genuine 4D object, moving 3D shadow, and bounded observability

Accessed 2026-09-20 (UTC) using the requested Luna primary-source pass. The
review is limited to Gate 3: a genuine 4D hypercube, an independent x–w source
rotation, an ordinary 3D display camera, and a rank/reconstruction check under
known transforms and point correspondences. Exact URLs, UTC timestamps,
section/page pins, support boundaries, and the inaccessible derived chapter-4 URL are
recorded in [`sources.json`](sources.json).

## External source basis

The Dimensions page, titled “Chapters 3 and 4: The fourth dimension,” states
that a 4D point is represented by four coordinates and lists the tesseract as
having 16 vertices and 32 edges (sections 2–3). Its “Seeing in 4 dimensions”
section presents sections and changing shadows as complementary views and says
that turning a 4D object changes its 3D shadow while a single shadow contains
only partial information (section 4). The stereographic section describes
mapping the 3-sphere in 4D to a 3D tangent space and warns that passage through
the projection pole appears unbounded (section 5). This supports the instrument
choice and display caveats. It does not supply the project’s exact matrix
convention, source/display separation, rank result, or any human-use claim.

The supplied prompt linked the combined Chapters 3–4 page above. A separate
chapter-4 URL was derived for a bounded availability check,
`https://www.dimensions-math.org/Dim_CH4_E.htm`, was attempted once and was
inaccessible through the source tool. It is retained as an unavailable flag in
`sources.json`; no claim is inferred from it. The combined chapter page above is
the only Dimensions content used.

ETH Zurich’s Ralf Hiptmair lecture notes provide the least-squares condition
needed for the recovery check. Section 3.1.2, Theorem 3.1.2.1 (PDF p. 9,
printed p. 222) identifies the normal equations `Aᵀ A x = Aᵀ b`. Corollary
3.1.2.13 and Remark 3.1.2.15 (PDF p. 12, printed p. 225) state that for
`m ≥ n`, `N(A)={0}` gives a unique least-squares solution
`(AᵀA)⁻¹Aᵀb`, and that this null-space condition is equivalent to full column
rank `rank(A)=n`. Remark 3.1.2.18 (PDF pp. 13–14, printed pp. 226–227) ties
rank loss to redundant, non-identifiable parameters. This source supports the
conditional linear-algebra interpretation only; it does not support arbitrary
image reconstruction, unknown transforms, unknown correspondences, physical
extra dimensions, or human understanding.

## Gate 3 convention and derivation

Use column vectors `q=(x,y,z,w)ᵀ` and the centered hypercube
`{-1,+1}⁴`. There are `2⁴=16` vertices. Every vertex has four neighbors that
differ in exactly one coordinate; counting each undirected edge twice gives
`16·4/2=32`. This agrees with the Dimensions table. The four-coordinate source
state must remain present in the run record even when two projected points
overlap.

Use the fixed orthographic projection

```text
P = [ I₃  0 ]
p = P R q
```

and keep the display camera separate. A proper 3D display camera `C_k∈SO(3)`
acts after the source projection as camera-space coordinates
`c_k=C_k P R q`. A separate 2D screen map `B` (with declared scale and
translation) produces `screen_k=B c_k`; neither display step alters the source
point, source rotation, or projected world coordinates. Automatic scale changes
are disabled during fixed comparisons.

For the source control, use the declared column-vector x–w rotation

```text
x′ = cos(θ)x − sin(θ)w
w′ = sin(θ)x + cos(θ)w
y′ = y
z′ = z
```

with the corresponding 4×4 orthogonal matrix. It preserves source norms and
all pairwise distances. The source angle, transform order, projection, camera,
and clock are independent recorded state variables. No external source is being
used to claim this particular convention; it is the Gate 3 contract and is
checked directly.

## Observability calculation

For a known point correspondence, each 3D observation is
`p_k=P R_k q`. Stack the observations into `b=Aq`, where

```text
A = [ P R₁
      P R₂
      ... ] .
```

One fixed source view has `A=P`, so `rank(A)=3`; the fourth coordinate is in the
null direction. Camera-space-only views have blocks `C_k P` with `C_k`
invertible, so each camera-space block has rank 3 and still annihilates `w`. If
final screen coordinates are used, the blocks are `B C_k P` and the stack has
rank at most 3; the fixed screen map can lower the per-view rank further. In
either form the camera-only stack cannot recover `w`. This is the fixed-view
negative case: screen movement alone cannot reveal the hidden coordinate.

Adding a known source rotation changes the row space. With the zero-angle view
and `R_xw(π/2)`, the stacked rows include `e_xᵀ,e_yᵀ,e_zᵀ` and `−e_wᵀ`, so the
stack has rank 4. Under the ETH full-column-rank result, the least-squares
solution is unique (up to the declared numerical tolerance), and its residual
`||A q̂−b||₂` is the reconstruction check. The implementation should report
the matrix rank, residual, transform list, and correspondence IDs together.

The pairwise ambiguity demonstration uses
`q_a=(a,b,c,w_a)` and `q_b=(a,b,c,w_b)` with `w_a≠w_b`. At θ=0,
`Pq_a=Pq_b`, so the projected points coincide while IDs and full source
coordinates remain distinct. After the known x–w rotation, their projected x
difference is `−sin(θ)(w_a−w_b)`. At `θ=π/2` they separate without jitter or
decorative displacement. A camera orbit may move both screen locations but
cannot create this hidden-coordinate separation by itself.

## Boundaries to preserve in the Gate 3 packet

The recovery result is conditional numerical identifiability, not recovery from
arbitrary screenshots. It assumes known linear transforms, known point
correspondences, an orthographic projection, and a declared coordinate order.
It does not establish arbitrary 4D shape reconstruction, a unique physical
cause for a visual sequence, or human ability to infer rank or hidden
coordinates. A single projection can demonstrate a real ambiguity even when a
later controlled source rotation resolves the specified pair.

The source set does not validate the shared-reference semantics from Gate 2;
those remain separate and unchanged. Gate 3 also does not introduce the 4D
ball slice or a 5D object. Those are later gates and are outside this source
pass.
