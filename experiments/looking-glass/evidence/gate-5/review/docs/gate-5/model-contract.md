# Gate 5 mathematical model

Version `gate-5-model-v1`. Prespecified before browser trials. Scope is the approved **two additional coordinates in 5D**. No Gate 6 work follows from this contract.

## Source and transformations

The solid is `[-1,1]^5`; its boundary is four-dimensional and the drawn edges form a one-dimensional skeleton. Its 32 vertices have affine span five. Column-vector coordinates are `q=(x,y,z,w,v)^T`. Ordered stable IDs `vabcde` encode coordinates `(2a-1,2b-1,2c-1,2d-1,2e-1)` in that order. Connect exactly the unordered pairs at Hamming distance one, using IDs `e-<lexicographically first>-<second>`. There are 32 vertices, degree five and 80 edges. Each squared norm is five; a pair differing in h coordinates has squared distance 4h. Relative to v00000, the five single-bit-flip differences form `2I_5`, determinant 32, proving span five.

Mark A=v00000, B=v00010, C=v00001 and D=v00011. They share x=y=z=−1; B changes w, C changes v, D changes both. The default selected ID is A. Preserve all identities while overlapped; the recovery solver treats IDs only as opaque correspondence keys.

Use rotations of determinant +1 with the following affected coordinate pairs; all other coordinates are fixed:

```text
Rxw(α): x′=cos(α)x−sin(α)w; w′=sin(α)x+cos(α)w.
Ryv(β): y′=cos(β)y−sin(β)v; v′=sin(β)y+cos(β)v.
R(α,β)=Ryv(β) Rxw(α), so Rxw acts first on column vectors.
P=[[1,0,0,0,0],[0,1,0,0,0],[0,0,1,0,0]].
p=P R q=(cos(α)x−sin(α)w, cos(β)y−sin(β)v, z).
```

The two rotations act in disjoint planes and **commute**. Verify the declared composition and its equality with the reversed product; do not pretend these controls distinguish multiplication order. `R^T R=I`, determinant one, and `R^-1=Rxw(−α) Ryv(−β)` preserve every source norm and pair distance. Finite audit grid: each angle in `{−60°,0°,30°,45°,90°}`, all 25 ordered pairs, all 32 vertices and all 496 unordered vertex pairs. Verify both individual controls, composition, inverse/round trip, full matrix orthogonality and distances, rather than only example-point motion. Invalid nonfinite inputs reject.

Changing α with β fixed changes only rotated x,w; changing β with α fixed changes only rotated y,v. Raw projection changes in x or y respectively; z stays fixed. A–B projected distance is `2|sin α|`; A–C distance is `2|sin β|`. Their source distances remain two. Rotation changes a genuine five-coordinate source before projection; time is separate.

## Saved 40-second path and display

The run opens paused at t=0. Quantized integer simulation time is in [0,40000] ms with quantum 100 ms. Angles in degrees are:

| Interval ms | α | β |
|---|---:|---:|
| 0..10000 | 90t/10000 | 0 |
| 10000..20000 | 90 | 90(t−10000)/10000 |
| 20000..30000 | 90(30000−t)/10000 | 90 |
| 30000..40000 | 0 | 90(40000−t)/10000 |

Exact checkpoints are 0/5000/10000/15000/20000/25000/30000/35000/40000 ms. Step adds 1000 ms, clamped at 40000. Seek is `100*Math.round(clamp(requestedMs,0,40000)/100)`. Evaluate state directly from time, never accumulated frame rotation. Manual angle, camera, slice and task controls pause and label exploration at the existing cursor. Replay from start and full checkpoint restoration clear overrides and restore all canonical options. A slice is a separate analytic object; its canonical plane is always (s,t)=(0,0), unaffected by hypercube playback. Do not imply that hypercube rotation drives its radius.

Apply an ordinary 3D camera to raw p only:

```text
a=cos(yaw)*px−sin(yaw)*pz
b=sin(yaw)*px+cos(yaw)*pz
vertical=cos(pitch)*py−sin(pitch)*b
depth=sin(pitch)*py+cos(pitch)*b
screen=(320+80*a,210−80*vertical)
```

Canonical yaw=30°, pitch=20°, orthographic, SVG viewBox 0 0 640 420, center (320,210), scale 80 SVG units/model unit. The same settings and actual scene size govern the 4D comparison. Responsive CSS can scale the whole viewBox; record actual rectangles. No auto-fit, perspective, automatic camera motion or offset geometry/jitter. Labels may be offset but must disclose the associated source ID. Camera changes leave raw source, rotated source and projected coordinates unchanged. Raw 3D p and 2D screen pixels are different observations.

## Conditional reconstruction and its negative cases

Candidate class is unknown `q∈R^5`, supplied stable point correspondences and known linear transforms. One base observation O0=P R(0,0)q=(x,y,z) has rank three and kernel span{e_w,e_v}. Adding only known x–w observations, specifically Ow=P R(90°,0)q=(−w,y,z), gives stacked rank four and kernel span{e_v}. Any collection with β=0 leaves v hidden. Within this hypercube, two v choices remain for each recovered x,y,z,w. Ordinary camera changes of those same raw observations cannot add v sensitivity; orthographic screen observations have no stronger rank claim.

Add Ov=P R(0,90°)q=(x,−v,z). The stacked exact matrix is:

```text
A=[1 0 0  0  0; 0 1 0 0 0; 0 0 1 0 0;
   0 0 0 −1  0; 0 1 0 0 0; 0 0 1 0 0;
   1 0 0  0  0; 0 0 0 0 −1; 0 0 1 0 0].
A^T A=diag(2,2,3,1,1), rank five.
```

Its singular values are sqrt(3),sqrt(2),sqrt(2),1,1. A valid direct reconstruction is x=O0.x, y=O0.y, z=O0.z, w=−Ow.x, v=−Ov.y; a generic full-rank solve with actual floating matrices is preferred. Rank tolerance is 1e−10. Save raw 3D observations, known matrices, opaque correspondence keys, rank, nullspace/underdetermined verdicts, recovered coordinates and maximum forward residual. The solver receives only observations/matrices/keys and cannot access source arrays, decode IDs, call fixture generators or look up truth. A separate evaluator compares truth after solving, recording maximum source-coordinate error ≤1e−10 and forward residual ≤1e−10 across 32 vertices. Independently exercise opaque ID `probe` with q=(0.2,−0.4,0.6,−0.8,1.1) and the same matrices. Rank-deficient modes return `underdetermined`; a chosen minimum-norm completion is not unique recovery. UI must display both rank-four failure and rank-five success with their actual inputs/results.

These are raw-coordinate numerical observations under known transforms/correspondences, not inversion of screenshots, unknown-transform inference, arbitrary source uniqueness, a human comprehension result or a uniquely 5D physical cause.

## Two-constraint 5D-ball slice

Separately define the closed unit solid `B5={q:x²+y²+z²+w²+v²≤1}`. Its slice at **known** w=s,v=t is identified with xyz and has radicand `u=1−s²−t²`, evaluated before display rounding. Strict branches are u>0: solid 3D ball, radius sqrt(u), center (0,0,0); u===0: singleton point, radius zero; u<0: empty, radius and center null. No epsilon band classifies slices. The numerical tolerance is not a branch tolerance. Nonfinite inputs reject. The full xyz projection remains the unit 3D ball independently of (s,t).

Cases include (0,0),(.5,0),(0,.5),(.5,.5),(1,0),(0,1),(1.25,0),(0,1.25),(1,1),(-.5,0),(0,-.5), and each axis at ±(1−10⁻⁶), ±(1+10⁻⁶) with the other coordinate zero. Point presets use exactly representable boundaries. The distinct pairs (.5,0) and (0,.5) have identical slice sets and radius sqrt(3)/2. This is equal-looking-output ambiguity over source plane conditions; their **recorded known coordinates** distinguish which condition was requested. Radius alone determines s²+t², not signed s and t. No arbitrary-source uniqueness follows.

Actual UI isolation starts (0,0), changes s=.5 with t=0, then t=.5 with s=.5; radii become sqrt(3)/2 then sqrt(1/2). Return and compare the equal-radius presets. A point uses a fixed pixel locator and explicit singleton/radius-zero label; empty draws no slice geometry/locator and says no points. Sphere boundary curves depict the computed solid slice, not a sampled substitute for a cross-section. Preserve raw small positive radii even when visually unresolved.

## Frozen 4D baseline and finite comparison tasks

Use a **separately labeled computed 4D comparator**, not a new version of the saved replay: q4=(x,y,z,w), 16 vertices/32 edges, embedded as (x,y,z,w,0), projected with Rxw(α) only. β is always ignored by this comparator, even while 5D changes. Validate IDs, edges and raw projected coordinates at α=0°,30°,45°,90° against the untouched saved Gate 3 module `hypercube/builds/g3-6c31bc16aeca4460/model.mjs`; bind its SHA-256 in the freeze. The historical Gate 3 and Gate 4 builds remain available separately. Comparator marked IDs are A4=v0000, B4=v0001, matching the 5D A/B x,y,z,w coordinates; Gate 3's original marked-pair choice is not rewritten.

At fixed yaw30°/pitch20°, equal scene rectangles, scale, glyph radius 4 SVG units and label/depth options, measure:

- Structural clutter: total vertex/edge records, nonzero projected edge records and collapsed edge count. This is geometric workload, not perceived difficulty. Collapse means raw endpoint distance≤1e−10.
- Raw 3D coincidences: group positions by coordinatewise tolerance 1e−10; deterministic lexicographic first-representative assignment. Retain all group member IDs and multiplicities.
- Exact 2D coincidences: the same grouping rule on screen centers, reporting n−group-count as coincident-marker excess. These differ conceptually from raw 3D groups.
- Marker-collision proxy: unordered pairs whose 2D center distance is **strictly <8 SVG units**, for declared radius 4 markers; report pair count and pair IDs. This is a footprint-overlap proxy, not perceived occlusion, hit success, line crossings or pixel-based measurement. Do not call it exact hidden-point count.
- Navigation: actual recorded task-reset/select, source-angle, inspector access and camera actions, separately from fixture-derived theoretical steps. Count successful semantic source-control mutations on the prescribed route; retain failed attempts and root's real input trace separately. No assumed or generated control events count as browser evidence.

T1, **inspect a coincident site**: start α=β=0, reset camera/options, inspect the marked A site in each comparator through an actual UI control, and report the full roster. A4 site contains two IDs; A site contains four. Record actual inspection controls and any scrolling/failure needed to reach them. T1 does not ask a blinded viewer to guess dimension.

T2, **separate the marked identities**: reset α=β=0; issue an actual α=45° control while β stays zero, inspect both views, then an actual β=45° control while α stays45°, inspect again. The prescribed 4D A4/B4 target becomes distinct after one source-angle action; the 5D quartet target after two. This is a route-specific control burden with different target cardinalities, not an optimal-cost or equal-difficulty human comparison. The first 5D action leaves A/C and B/D coincident; the second separates the quartet. At those three states, total raw unique sites 4D/5D are 8/8,12/12,12/18; collapsed edges are 8/32,0/16,0/0. Thus global ambiguity remains even when the marked task succeeds. At generic α=β=30°, the 5D model has 32 distinct raw sites; the comparator has 16. This generic case is a finite model check, not required to replace the declared UI task.

Record proxy counts rather than predicting that every complexity metric increases. Actual control costs and screenshots at the three task states are required; generated counts alone do not establish a UI comparison. Browser layout trials use 1280×720 and 960×720, with 1280×900 permitted for detail captures. Primary playback and angle controls should be visible near the top; scrolled details are captured separately. No human usability, learning or superiority claim is supported.

Absolute numerical tolerance is 1e−10; retain unsnapped raw floats and label rounded display values. Same-browser/build checkpoint fingerprints repeat exactly; cross-runtime trigonometric roundoff within tolerance is allowed. Mathematical fidelity, conditional information recovery, instrumental comparison and human understanding remain separate conclusions.
