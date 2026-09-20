# Gate 3 mathematical model

Version `gate-3-model-v1`. These are predictions and definitions, frozen before actual browser trials. Gate 3 is the approved 4D object and moving 3D shadow; slices, 5D, a human study and public deployment are outside this gate.

## Object, dimension and identity

The solid tesseract is `[-1,1]^4`, intrinsically four-dimensional. Its boundary has dimension three; its drawn edges form a one-dimensional skeleton. Its 16 vertices have affine span four. These statements describe different objects; a wireframe is not itself a four-dimensional solid, and its 2D screen image is not the mathematical 3D projection.

Coordinates are column vectors `q=(x,y,z,w)^T`. Vertex `vabcd` has coordinates `(2a-1,2b-1,2c-1,2d-1)` for bits `a,b,c,d∈{0,1}`. IDs are stable and ordered lexicographically. Connect exactly those unordered pairs with Hamming distance one; order endpoints lexicographically and name the edge `e-<first>-<second>`. There are `2^4=16` vertices, degree four, and `16·4/2=32` unique edges. Each vertex has squared norm four. Squared distance between vertices differing in h coordinates is `4h`; each edge length is two. Relative to `v0000`, the differences to `v1000,v0100,v0010,v0001` are the columns of `2I_4`, with determinant 16, proving affine span four.

Mark **A = v1110 = (1,1,1,-1)** and **B = v1111 = (1,1,1,1)**, plus their edge `e-v1110-v1111`. The canonical selected vertex is A and the canonical selected edge is the marked edge; both A and B remain marked. Keep both IDs while their projection overlaps. Source IDs are never renamed by motion, depth order or selection. The recovery routine must treat every ID solely as an opaque correspondence key; the binary naming convention must not be decoded to supply coordinates to that routine.

## Source rotation, shadow and screen

The only source rotation is in the x–w coordinate plane:

```text
R_xw(theta) = [[ c,0,0,-s],
               [ 0,1,0, 0],
               [ 0,0,1, 0],
               [ s,0,0, c]],   c=cos(theta), s=sin(theta)
q' = R_xw(theta) q
P = [[1,0,0,0],[0,1,0,0],[0,0,1,0]]
p = P q' = (c*x-s*w, y, z)
```

There is no second source rotation or composition ambiguity: source `R` is applied first, then `P`, then the ordinary display camera. `R^T R=I`, `det R=1`, and `R(-theta)R(theta)=I`; all 120 unordered source-pair distances and all 16 norms are preserved. Projection can reduce distances and collapse edges without causing a source-object intersection.

Canonical display yaw is 30°, pitch 20°, using radians in computation. For `p=(px,py,pz)`:

```text
a = cos(yaw)*px - sin(yaw)*pz
b = sin(yaw)*px + cos(yaw)*pz
vertical = cos(pitch)*py - sin(pitch)*b
depth = sin(pitch)*py + cos(pitch)*b
screen = (320 + 80*a, 210 - 80*vertical)
```

The SVG viewBox is `0 0 640 420`; the scale is 80 SVG units per projected-space unit and the center is `(320,210)`. A responsive CSS display can scale the whole viewBox; record its actual bounding rectangle. There is no geometry-dependent auto-fit, automatic camera orbit or perspective division. Depth cues and draw order are display choices only. The complete projected object fits this viewBox for the declared x–w trajectory. The actual renderer/backend, camera, scene dimensions and options must be recorded. Both canonical comparison captures use the same actual viewport and scene rectangle. Ordinary camera changes preserve every `q`, `q'` and `p`.

The mathematical shadow `p` has three coordinates. The screen has two. Numerical observability below uses **raw 3D p**, not screen pixels, silhouettes, camera depth cues or knowledge of the stored source object.

## Clock and five exact checkpoints

Integer simulation time `t∈[0,32000]` milliseconds is separate from geometry. The saved path is:

```text
theta(t) = pi*t/32000                 if 0 <= t <= 16000
theta(t) = pi*(32000-t)/32000         if 16000 < t <= 32000
```

Thus 0/8000/16000/24000/32000 ms give 0°/45°/90°/45°/0°. The run opens paused at zero; Step adds 1000 ms with clamping. Replay uses explicit integer simulation time; a wall-clock scheduler is not an additional source coordinate. Manual source-angle or camera controls create labeled exploration, pause at the existing simulation cursor and store overrides separately. Reset and checkpoint controls clear overrides and restore full canonical state. Source angle can therefore be manipulated independently of playback time; camera, source rotation and time remain separately recorded.

| Time | A rotated q′ | B rotated q′ | Projected pair distance |
|---|---|---|---|
| 0 s | `(1,1,1,-1)` | `(1,1,1,1)` | 0 |
| 8 s | `(√2,1,1,0)` | `(0,1,1,√2)` | √2 |
| 16 s | `(1,1,1,1)` | `(-1,1,1,1)` | 2 |
| 24 s | `(√2,1,1,0)` | `(0,1,1,√2)` | √2 |
| 32 s | `(1,1,1,-1)` | `(1,1,1,1)` | 0 |

In general `p_A-p_B=(2 sin(theta),0,0)`, so the projected pair distance is `2|sin(theta)|` while its source distance remains two. At 0° the w-parallel edges collapse; at 90° the x-parallel edges collapse. All 32 source edge records remain inspectable, including zero-length projected edges. At 0°/90° there are eight distinct projected vertex locations with multiplicity two. At 45° there are twelve locations: four multiplicity-two groups and eight singles. Do not add jitter or artificially shorten/lengthen zero-length edges. At a coincident marker, expose both identities or disclose the hit ambiguity; distinct offset labels are permitted, offset geometry is not.

Numeric comparisons use absolute tolerance `1e-10`. Values displayed as exact radicals or zero in the table are mathematical expectations; retain unsnapped floating values in evidence. Cross-runtime trigonometric roundoff is not an error if within tolerance. Same-input restoration inside the same browser/build must reproduce its checkpoint fingerprint exactly. Checkpoints at different simulation times need not share fingerprints even where geometry agrees.

## What one shadow cannot determine

For an unknown point in the declared candidate class `q∈R^4`, the fixed zero-angle observation is `p=Pq`. Its matrix has rank three and kernel `span{(0,0,0,1)}`. Every `(px,py,pz,w)` with arbitrary real w gives the same p. If the candidate class is restricted to this known hypercube's vertices, a compatible p at zero has two candidates, w=−1 and w=+1. The marked pair is an exact witness, not a failure of the instrument.

Keeping theta zero and changing ordinary cameras cannot add sensitivity to w. For invertible camera matrices `C_k`, the stacked matrices `C_k P` still have rank three and the same kernel. For actual orthographic screens the matrices are `S C_k P`, with `S` dropping camera depth, and their stack has rank at most three. Multiple known cameras might recover the projected 3D point; they cannot recover w. A single rotated shadow at 90° also has rank three, with x hidden instead. Do not label any one view as full 4D recovery.

## Recovery from two declared observations

For each matched point ID collect only `(id,p_0,P R(0))` and `(id,p_90,P R(pi/2))`. Stack their rows:

```text
A = [P R(0); P R(pi/2)]
  = [[1,0,0, 0],[0,1,0,0],[0,0,1,0],
     [0,0,0,-1],[0,1,0,0],[0,0,1,0]]      (exact mathematical values)
A^T A = diag(1,2,2,1)
rank(A)=4; singular values = sqrt(2),sqrt(2),1,1
```

The complete source point is uniquely recoverable in `R^4` under these assumptions: `x=p_0.x`, `y=p_0.y`, `z=p_0.z`, `w=−p_90.x`. Generic least squares is also valid and should retain the actual floating matrix. The implementation solver receives only observations, declared matrices and opaque IDs, with rank tolerance `1e-10`; it has no source array, fixture generator, ID decoding, hidden-coordinate accessor or lookup available as an input. A separate evaluator compares reconstructed q to hidden truth **after** solving. Preserve both maximum source-coordinate error and maximum forward residual `|A q_hat-b|`, each expected ≤`1e-10` across all 16 vertices. Source agreement alone is insufficient if truth leaked into the solve.

A fixed-view solver returns `underdetermined`, rank three and a nullspace direction; it must not present a chosen minimum-norm solution (w=0) as a unique recovery. Camera-only observations retain that verdict. Incorrect, absent or contradictory correspondences and unknown transformations are outside the positive recovery claim; this experiment does not recover geometry from arbitrary screenshots. Numerical recovery assumes the declared linear model and does not establish a uniquely 4D physical cause or human understanding.

The equations and checkpoint predictions are direct derivations under this contract. Luna's bounded [primary-source review](../../research/gate-3/source-review.md) records the supporting [Dimensions exposition](https://www.dimensions-math.org/Dim_CH3_E.htm) and [ETH least-squares notes](https://people.math.ethz.ch/~grsam/NumMeth/Parts/NCSEFL_handout_chapter_3.pdf), with exact support limits and access pins. Those sources do not validate this implementation, source-coordinate recovery from images or human comprehension.
