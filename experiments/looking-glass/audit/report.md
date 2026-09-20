# Gate 0 independent audit

**Finding.** The final ordinary-cube probe passes the bounded Gate 0 model, replay, local routing, and observed browser checks below. This is an independent software-agent audit, not a human comprehension study or approval for Gate 1. The tested final run is `G0-CUBE-005`, build `g0-d85237ad31362768`, aggregate source SHA-256 `d85237ad313627683bce5fed50977060b2c61c9e8626a5056bff74b0efcce567`, parent repository base `3f1b1d028947fcc2fb207e41780f1a2b714705b0`. The snapshot uses Node built-ins only and an SVG renderer; it has no lockfile or external assets. `PROJECT_STATUS.json` still shows Gate 0 current and Gate 1 unapproved.

## Independently derived expectation

The charter declares the column-vector display camera `Rx(20°) Ry(yaw)` on the fixed source vertex `v111=(1,1,1)`. For yaw `a`, the yawed vertex is `(cos(a)+sin(a), 1, cos(a)-sin(a))`; pitch then acts on its y and z coordinates. Screen-model coordinates are `(camera x, −camera y)`. These constants were derived from the charter without importing probe math as an oracle. Tolerance: absolute `1e−10` per coordinate.

| Simulation time | Yaw | Expected camera x | Expected camera y | Expected camera z |
|---:|---:|---:|---:|---:|
| 0 ms | 30° | 1.3660254037844386 | 0.8145045597227190 | 0.6859715142820884 |
| 10,000 ms | 45° | 1.4142135623730950 | 0.9396926207859084 | 0.3420201433256688 |
| 20,000 ms | 60° | 1.3660254037844388 | 1.0648806818490980 | −0.0019312276307507 |

## Executed checks

`node audit/check-gate0.mjs G0-CUBE-005` passed before and after browser use. It independently enumerates the eight `{-1,+1}³` vertices and twelve one-bit edges; verifies the saved cube identity; evaluates all eight camera and orthographic screen coordinates at 0, 10, and 20 seconds; and checks the constants above, checkpoint/initial/event SHA-256 values, each frozen source file, and the aggregate build ID. Canonical run/checkpoint/initial/event hashes after UI use matched the pre-browser audit: respectively `6191a6acd6fd6297b117a82a6735e1a6916bd1d7cbcd4e5608480c0029c6fd7c`, `792b9383fb5c5a28cbcce0aab98b5c2e51c099ba76ae5c2e4f2b828971e9b330`, `2d2e0219a313c625486c62a2cebc760de38168fd8c4b1cc9c913565fbe26da19`, and `971fe23488d2d64621bfdccb09bdd83119c49c0522bf79020941e5512e9cb504`. The frozen snapshot's own `test.mjs` passed from its build directory. These are artifact and numeric checks, not substitute browser observations.

`node audit/check-routes.mjs G0-CUBE-005` passed against the frozen server at the live local port. It loaded the exact saved run/build and fixed assets, checked `no-store` on stable routes, rejected unknown or project-external routes with 404, rejected `POST /api/run` and `/api/checkpoints` with 404, rejected encoded evidence-path traversal with 403 and malformed encoding with 400, and found canonical run bytes unchanged. This local HTTP check did not POST to `/api/activity` or operate the browser.

`node audit/check-browser-observations.mjs G0-CUBE-005` passed on the root operator's recorded browser states. After removing only UI-only `runId`, `buildId`, and playback fields, the captured S0/S1/S2/S3 states match the preserved 0/10/20-second checkpoint states and exact hashes. Original and reopened midpoint states match exactly at the same recorded viewport. Paused state stayed unchanged for more than one wall-clock second; keyboard Step reached 1,000 ms; Look around reached 120° in separately labeled exploration mode and reset to saved 30°; the Run Library and reload opened paused at zero; the natural 20-second playback ended paused. These are checks on root's browser records; I did not drive the UI or independently attest the operator's capture mechanism.

## Original image inspection

I opened the untouched `G0-CUBE-005` S0-initial, S1-midpoint, S2-final, and S3-replay-midpoint PNGs plus the 120° exploration capture. The cube is rendered, the eight vertex IDs remain visible, `v111` has a non-color halo/size cue and label, and none of the tested frames materially clips the cube. S1 and S3 both show the same 45° scene; their capture dimensions are both 998×904, and their different PNG hashes reflect visible UI/focus differences, not a changed cube arrangement. The 120° capture visibly reports the requested angle and shows a different projected arrangement. These observations support legibility at the tested viewport and replay's visual consistency; they do not demonstrate a participant's understanding or exact cross-device pixel identity.

## Preserved failure and limits

The pre-browser `G0-CUBE-002` candidate had long-lived caching at a stable URL, weak activity-error handling/identity, and malformed-path handling; these were corrected in `G0-CUBE-003`. Its frozen self-test could not locate the run and was repaired in `G0-CUBE-004`. The root browser then exposed a real `G0-CUBE-004` Look around defect: dragging toward 120° set exploration mode but left yaw at 60° because the input handler rendered before reading the slider's new value. The failed screenshot and observations remain preserved. `G0-CUBE-005` captures the requested value before rendering; source diff shows only this behavior fix and the new run ID, and the 120° browser retest passed. No later gate was run.

The app's own activity log uses actor `unspecified-ui`; the separate root browser-observation records identify `browser-automation`. This leaves the in-app actor category less specific than the record contract, though it does not falsely claim a human action. The run manifest's `G0-charter-v1` spelling differs from the charter heading `gate-0-charter-v1`; the documentation records the alias without modifying the immutable run. The audit did not evaluate other devices, assistive technology, participant comprehension, 4D/5D geometry, Hopf behavior, or shared-meaning claims.
