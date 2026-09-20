# Gate 4 mathematical model

Version `gate-4-model-v1`. These definitions and predictions precede browser trials. Gate 4 is **slices, projections and ambiguity**. Gate 5, a 5D model, participant testing, publishing and external messages are outside the authorized scope.

## Analytic source, slice and projection

Coordinates are column vectors `q=(x,y,z,w)^T`. The source family is the solid unit 4D ball

```text
B_c = {q: x²+y²+z²+(w-c)² ≤ 1}.
source center C_c=(0,0,0,c), radius R=1.
P=[[1,0,0,0],[0,1,0,0],[0,0,1,0]].
```

Stable source IDs are `ball-center` for c=0, `ball-plus` for c=+0.5 and `ball-minus` for c=−0.5. The primary slice experiment uses `ball-center`, with no source rotation. Its full projection is always the unit solid 3D ball `P(B_0)={p:||p||²≤1}`, independent of the slice parameter. The projection of every unrotated B_c is the same ball: for each projected p with ||p||≤1, choose w=c; points outside cannot have a preimage.

Intersect B_c with the known hyperplane `w=s`, then identify that hyperplane with ordinary `(x,y,z)` coordinates. Define `d=s-c`, `u=1-d²` **before display rounding**:

| Exact computed condition | Kind | Mathematical slice | Recorded radius |
|---|---|---|---|
| u>0 | `solid` | Solid 3D ball centered at (0,0,0), radius sqrt(u) | Positive sqrt(u) |
| u===0 | `point` | Singleton {(0,0,0)} | 0 |
| u<0 | `empty` | Empty set; no point or sphere | null |

The implementation uses these strict floating-number branches with no epsilon band. The declared numeric comparison tolerance is not a classification tolerance. Exact preset boundaries s=±1 for c=0, and s=+0.5 for c=−0.5, are exactly representable. Near-boundary probes s=±(1−10⁻⁶) and s=±(1+10⁻⁶) must retain solid/empty status respectively; rounding the visible radius must never turn a solid into a point. Retain full raw s,d,u,radius values. Invalid/nonfinite inputs must reject, not silently produce an ordinary object.

For `solid`, the renderer draws sampled ordinary sphere boundary curves and may use restrained fill/depth cues; these represent the boundary of the calculated solid, not a sampled 4D boundary used as a substitute for a cross-section. A `point` has one location glyph with an explicit “point / radius 0” label; its fixed pixel size is a locator symbol, not a finite-radius ball. An `empty` slice draws no slice geometry or locator and states “empty / no points”. Coordinate axes are display furniture and cannot be mistaken for slice geometry. Preserve the kind even where the radius is too small to resolve on screen.

The 4D solid has dimension four and its boundary S³ has dimension three. A nondegenerate slice is a 3D solid whose displayed sphere boundary has dimension two. The full projection is a 3D solid; the monitor is two-dimensional. A point is dimension zero. These objects and dimensions must not be conflated.

## Canonical 40-second saved sequence

The run opens paused at t=0. Simulation time is a multiple of 100 ms in [0,40000]. Define `h(t)=t/20000` up to 20000 ms, and `(40000-t)/20000` thereafter. The primary slice is

```text
s(t)=1.25*h(t),  c=0,  source rotation=identity.
```

The projection reference remains centered at zero with radius one. Exact checkpoints are:

| Time ms | s | Slice kind | Radius | Projection radius |
|---|---:|---|---:|---:|
| 0 | 0 | solid (center) | 1 | 1 |
| 8000 | 0.5 | solid (interior) | sqrt(3)/2 | 1 |
| 16000 | 1 | point (boundary) | 0 | 1 |
| 20000 | 1.25 | empty | null | 1 |
| 24000 | 1 | point (return boundary) | 0 | 1 |
| 32000 | 0.5 | solid (return interior) | sqrt(3)/2 | 1 |
| 40000 | 0 | solid (center) | 1 | 1 |

Playback evaluates this known path, not an accumulated integration. Step advances 1000 ms with endpoint clamping. Seek clamps requested time to [0,40000] and rounds to the nearest 100 ms (`100*Math.round(clamped/100)`). Wall time schedules samples but is not an additional source coordinate. Positive-radius near-boundary samples, the zero-radius boundary and the empty interval occur in the same sequence. For genuinely visible boundary events, a skipped callback may skip a 100 ms frame; checkpoint inspection separately establishes exact boundary rendering. Any skipped sample must not be described as observed live.

Move the slice overrides s, pauses and labels exploration at the existing clock. It does not rewrite the source or projection. Ordinary camera controls affect only display. Restoring a checkpoint resets the full canonical state, including camera, slice override, movie-angle override, ambiguity plane and display options.

## Declared ambiguity class

The ambiguity candidates are exactly `{B_+0.5,B_-0.5}`, both with known radius one and centers constrained to the w axis. The initial available observations are the unrotated raw full projection and the raw slice at known s=0. Both candidates have the same full projected ball and the same initial slice radius `sqrt(3)/2`. Moving the ordinary display camera cannot distinguish either observation because their entire raw 3D sets are equal.

The prespecified intervention is to request a slice at known `s=+0.5` while retaining the two source definitions. Candidate plus then has d=0,u=1 and a unit solid ball; candidate minus has d=1,u=0 and a point. The observations distinguish the two members of this declared class. Preserve the input candidate definitions, known plane, predicted kinds/radii and comparison result in an inspectable table. This is an explicit forward comparison; no hidden source lookup is presented as inverse reconstruction. Candidate labels are model identities, not a blinded human task.

The paired negative intervention uses ordinary yaw 30°→120° at s=0, retaining pitch 20°. It changes display orientation but leaves the equal raw observations equal. Return s to zero and camera to the canonical values to reproduce the initial ambiguity. This does not claim uniqueness among arbitrary shapes, unknown radii, unknown interventions, other center directions or arbitrary screenshot interpretations.

## A stored 3D movie as an explicit counterexample

A separately labeled card uses `ball-plus` and the only source rotation

```text
R_xw(theta) = [[cos(theta),0,0,-sin(theta)],
               [0,1,0,0], [0,0,1,0],
               [sin(theta),0,0,cos(theta)]].
theta(t)=(pi/2)*h(t).
R is applied to source q first, P second, ordinary camera last.
rotated center = (-0.5*sin(theta),0,0,0.5*cos(theta)).
raw 3D projected ball center = (-0.5*sin(theta),0,0), radius=1.
```

Rotation preserves the unit radius. Projection of this rotated isotropic 4D ball is precisely the unit 3D ball at the projected center. The shifted center makes the prescribed movie nonconstant. The primary slice source remains unrotated B_0: this movie card is a separate source/experiment with its own angle, and must never imply that rotation drives the primary slice radius. The cards share only the recorded playback cursor and display convention.

Before browser trials, save an inspectable **standalone 3D trace** with exactly 401 ordered frames `k=0..400`, `timeMs=100*k`, `center=[-0.5*sin(theta(timeMs)),0,0]`, `radius=1`. The stored-frame reader receives only this trace and the quantized clock, reads the exact indexed frame, and performs no 4D calculation. The trace schema consists of 3D center/radius/time data and provenance, not hidden 4D coordinates. Freeze its SHA-256 in the build/run manifest. The model-driven panel independently evaluates the source equations. Compare every trace frame to the analytic projection, preserving maximum center/radius discrepancy and frame count; absolute error must be ≤1e−10. These are samples at a declared 10 Hz model clock, not a claim of continuous equality between unrecorded times.

Both paths use identical ordinary cameras, viewBox and scale, so the same 3D data can also reproduce any common ordinary camera intervention. Their screen agreement is a rendered consequence; browser world pixels are **not** the raw 3D numerical observation. Numerical trace agreement plus honest screen inspection supports a selected-movie counterexample without pretending image-based inference was performed.

At t=20000 ms, the prescribed angle is +90° and both centers are (−0.5,0,0). Hold the clock and camera fixed, then set the model's source angle to **−90°**. Its projected center becomes (+0.5,0,0); the stored frame remains (−0.5,0,0). Their raw 3D center distance is one and each radius remains one. The canonical camera maps their centers to an x-screen difference `80*cos(30°)` and a y-screen difference `80*sin(20°)*sin(30°)`, up to sign convention given below. Preserve these solver inputs and results. Restoring the 20 s checkpoint must restore the movie agreement.

This intervention rejects **only this fixed prerecorded trace as a responsive model of the changed control**. An adaptive 3D model could implement the same response; neither this test nor movie appearance proves a uniquely 4D physical cause. The stored trace is an explicit alternative representation with a known limitation, not evidence of a human being fooled or understanding the source.

## Display and numerical comparison

Canonical ordinary camera: yaw 30°, pitch 20°, orthographic. For a raw 3D p, let

```text
a=cos(yaw)*px-sin(yaw)*pz
b=sin(yaw)*px+cos(yaw)*pz
vertical=cos(pitch)*py-sin(pitch)*b
depth=sin(pitch)*py+cos(pitch)*b
screen=(320+80*a,210-80*vertical)
```

Each scene has viewBox `0 0 640 420`, center(320,210), scale 80 SVG units per model unit. Responsive CSS may resize the complete scene; measure its actual rectangle. No geometry-dependent auto-fit, automatic camera motion, perspective division or decorative jitter is permitted. Camera changes preserve source definitions, slice results and raw projection/trace coordinates. Record the exact sampling/rendering rule separately from the analytic set. All full-radius/center positions fit this viewBox under the declared controls; record actual clipping rather than silently dropping samples.

Absolute numeric tolerance is 1e−10 for coordinate/radius/screen-model checks and trace equality, with the strict classification rule above. Preserve raw floats and separately label rounded text. Same-browser/build repeated checkpoint fingerprints must match exactly; cross-runtime trigonometric ULP differences within tolerance are permitted. Mathematical fidelity, bounded candidate distinguishability and human comprehension remain separate conclusions.
