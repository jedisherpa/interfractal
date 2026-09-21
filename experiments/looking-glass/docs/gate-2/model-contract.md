# Gate 2 model contract

Version `gate-2-model-v1`. This specifies a mathematical Hopf correspondence and a separate, explicitly authored candidate reference mapping. It does not execute the archive's language study, reconstruct arbitrary objects, or begin Gate 3.

## Source, base, and representation

Use real coordinates `q=(a,b,c,d)` for the complex pair `z1=a+ib, z2=c+id`, with `a²+b²+c²+d²=1`. S³ has intrinsic dimension three and sits in R⁴; it is not a solid four-dimensional ball. The base is an ideal S² with `p=(X,Y,Z)`, norm one. It is an ideal spherical surface, not the Earth interior or a geographic model.

The exact map is

```
h(q) = (2(ac+bd), 2(bc-ad), a²+b²-c²-d²).
```

Its output is not the 3D display projection. The identity `(2|z1||z2|)²+(|z1|²-|z2|²)²=1` proves its base norm. Multiplication of both complex coordinates by `exp(i gamma)` cancels in `z1*conj(z2)` and leaves the base unchanged. Distinct phases are distinct source points except modulo 2π; this many-to-one map cannot recover phase from a base point.

Use the eight stable bases in `independent-predictions.json`: cardinal north/south/east/west/front/back and seam-plus/seam-minus. The seam samples have `X=-sqrt(1-epsilon²), Y=±epsilon, Z=0`, epsilon `1e-6`. Each displayed full fiber has 128 unique samples `gamma_j=2πj/128`, j=0..127, around the full circle; closing its polyline does not add a 129th source sample. The interface says these are eight fixed sampled fibers, plus the selected custom fiber when a custom point is chosen; they are not the continuum of all fibers. Base selection and picking a rendered fiber must share the same stable base/fiber ID. A base's mathematical identity is independent of any reference change.

## Local charts and phase

For `Z != -1`, the north chart section is

```
sN(p) = (sqrt((1+Z)/2), (X-iY)/sqrt(2(1+Z))).
```

For `Z != +1`, the south chart section is

```
sS(p) = ((X+iY)/sqrt(2(1-Z)), sqrt((1-Z)/2)).
```

A source point is `exp(i gammaN)*sN(p)` or `exp(i gammaS)*sS(p)`. On the overlap, let `lambda=atan2(Y,X)`. Since `sS=exp(i lambda)*sN`, a north→south chart change must set `gammaS=gammaN-lambda`; reverse sets `gammaN=gammaS+lambda`. It changes coordinates of the same source point, not its source state. The front base gives the nontrivial concrete test: north phase 0 and south phase−π/2 both yield `q=(1/sqrt2,0,0,-1/sqrt2)`. The raw section alone would change the point, so compensation is essential.

Treat a chart with `1±Z <= 1e-12` as unavailable. Disable an unavailable chart control with an explicit pole-specific explanation; the model rejects an explicit invalid chart request and preserves prior UI state. A disabled control need not generate a fabricated rejected-click event. Base selection uses the canonical north chart except at south, where it uses south. Selecting a different base resets its selected phase to0 and is a source-selection intervention. Switching chart for the same selected point preserves source coordinates within `1e-10`. Fixed full-fiber sample grids always use their canonical sampling charts; selected-point chart changes do not resample the background fibers.

No single global continuous section exists for this Hopf bundle. Along the equator the transition function has winding one; phase functions that extend continuously over both hemispherical disks cannot cancel that winding. Our two chart formulas and seam checks illustrate the coordinate limitation; finite numerical samples do not prove the topological theorem. Do not call a selected chart origin a preferred physical phase, time, attention or psychological property.

## Stereographic representation and clipping

Project from `Q=(0,0,0,1)` using

```
P(q) = (a,b,c)/(1-d).
```

This maps S³ minus Q into R³. It is distinct from `h:S³→S²`. Keep all q and h values in source data even when P is undefined or clipped. A denominator `<=1e-12` is treated as unavailable for numerical rendering and explicitly flagged; do not serialize Infinity/NaN as a finite point. The exact south sample j32 has q=Q and projection status `at-infinity`.

At north the projected fiber is `(cos gamma,sin gamma,0)`. At south it is `(0,0,cos gamma/(1-sin gamma))`, the unbounded z-axis together with the omitted projection point. Clip to the declared R³ ball `||P||<=4`, including segment intersections with its boundary; draw continuation indicators and a text explanation. Break the path at an unavailable projection sample and at any interval containing the projection pole. Never connect across infinity, silently drop the whole fiber, close its visible endpoints, clamp an outside marker to an invented finite source position, or present the south fiber as a bounded closed circle. A selected unavailable/clipped marker gets a status label rather than a fabricated dot. Clipping is a display rule, not removal of a source point.

All finite adjacent samples may form segment approximations. A renderer can use equivalent analytic clipping for the south line but must identify it explicitly. In either case preserve the 128 source samples, singular index, finite projected coordinates, clipping status, and rendered path breaks in the inspector/audit data.

## Ordinary display camera and clock

The R³ display is an ordinary orthographic camera, initially yaw30° and pitch 20°. Column-vector convention: first rotate around y,

```
x1=cos(yaw)*x - sin(yaw)*z; y1=y; z1=sin(yaw)*x+cos(yaw)*z;
Xc=x1; Yc=cos(pitch)*y1-sin(pitch)*z1; Zc=sin(pitch)*y1+cos(pitch)*z1.
```

SVG fiber-scene viewBox640×420: `(u,v)=(320+55*Xc, 210-55*Yc)`. The base globe is a separately fixed front view, not this movable camera: `(u,v)=(320+148*X,210-148*Z)` in viewBox640×420, looking from +Y. Its circular rim has radius151 as decoration; mathematical picking uses radius148. Front/back base points can overlap in this projection; named controls retain both identities without geometric jitter. Neither scene auto-rescales. Yaw is the tested look-around control; pitch remains20° during fixed comparisons. Near/far styling, labels, non-color selection and clipping are recorded display choices. Camera changes must preserve q, h, P and all reference assignments.

The canonical 24-second replay selects east, north chart, with common source phase `gamma(t)=2π*t/24000`, integer t in `[0,24000]`; all other mathematical source data, projection parameters, camera and initial reference remain fixed. Phase0→2π traverses one fiber and preserves the base. Step is1000ms; exact checkpoints are0/6000/12000/18000/24000ms. A wall-clock scheduler updates an integer simulation cursor; explicit simulation time is authoritative. Pause freezes that cursor. At end, pause has automatic-playback origin. Phase is a source coordinate; playback time merely controls it in this deliberately chosen trajectory.

A custom latitude/longitude control uses `p=(cos(lat)cos(lon), cos(lat)sin(lon), sin(lat))`. An actual click inside the mathematical front disk uses `X=(u−320)/148, Z=−(v−210)/148, Y=+sqrt(1−X²−Z²)`; reject outside-disk clicks. It selects a custom full 128-sample fiber in addition to the eight fixed fibers, canonical chart north except the south pole, phase 0. This is the visible +Y hemisphere only; latitude/longitude controls can select the rear. Custom selection never mutates the eight fixed bases. The fixed globe and R³ fiber camera remain separate display transforms.

The independent analytic checkpoint table and tolerances are in `independent-predictions.json`. Trigonometric results at 2π may differ from0 by roundoff: numeric round trips are compared within 1e-10, not required to share exact hashes. Do not snap results to predictions to hide errors. Reopening the exact same checkpoint in the same build must reproduce its deterministic state hash exactly.

## Candidate reference view

`fictional-records.json` extracts four immutable records from the supplied initial repair-event facts in `R1_STUDY_DESIGN.md`: Hall, Field, Studio and weather/task context. Source provenance, source-document hash, per-record content hash and extraction history remain visible and immutable. It invents no people, responses, endorsements or human observations. Later source-task updates are not executed here.

`reference-mappings.json` freezes two reference definitions with ID, wording, scope, author, version and relevance criterion. `R_CAPACITY_60` asks which venues hold at least 60 households; `R_EXISTING_ACCESS` asks which already have wheelchair access without added equipment. These are partial criteria, not full feasibility, cost optimization, group approval or a theory of human attention.

For both references, yes maps to east and no to west; those are arbitrary categorical positions. Hall/Field/Studio phases0/π/2/π are arbitrary display slots, not importance, history, coherence or trust. A marker on a semantic loop represents one stable record assigned by the declared rule, not a claim that the records themselves have circular topology. Weather context is intentionally unmapped in both views, visible through Show unmapped and the plain equivalent. Missing values, if ever added in a new version, must remain unknown rather than being assigned by inference.

Expected answers: capacity Hall yes, Field yes, Studio no; existing access Hall no, Field yes, Studio yes. Weather unmapped throughout. Hall's lack of existing access does not erase its supplied ramp option. Changing reference only changes assignments/reasons/view emphasis. It must preserve records, their source/history hashes, the exact mathematical globe, camera, both alternative reference definitions and both assignment views. Switching back recovers the initial mapping exactly. Compare references and the plain list expose the same record IDs, full facts, assignment, rationale, phase disclaimer, unmapped status and source evidence. The semantic shared reference is wording and scope; it is neither the sphere's geometric center nor a selected mathematical base point.

## Mathematical source basis

The algebra and numerical expectations above are direct derivations under this declared convention. [Niles Johnson](https://nilesjohnson.net/hopf.html) and [David W. Lyons](https://nilesjohnson.net/hopf-articles/Lyons_Elem-intro-Hopf-fibration.pdf) support the circle-fiber and stereographic-line interpretation. [Ralph Cohen’s topology notes](https://math.stanford.edu/~ralph/math215b/fiber.pdf) support local trivializations and the section/triviality boundary; the winding argument above states the additional nontriviality reasoning. Luna’s bounded source review and exact access/page pins are retained in `research/gate-2/`. Their conventions must be converted before comparing raw components; none of these sources establishes the candidate semantic mapping.
