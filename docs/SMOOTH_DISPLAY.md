# Smooth display — signed plan

Specialists: graphic design (Harper), latency (Benjamin), smoothness (Lucas). Grok signed the spec.

## Problem

The intro camera jumped per beat (`34 → 26 → 30 → 26 → 22 → 20 → 34`). That is the back-and-forth. Cube scale snapped `2.6 ↔ 1.05`. Shells popped in. The inverted equatorial copy hid the other half of each Hopf loop.

## Locks

- People stay points. Ready is not Yes. Press is Enter.
- Both Hopf bundles keep spinning the whole intro. Opposite spin. Same tube diameter.
- Reduced-motion skips bloom and lands in the room.
- Do not write intro progress into Zustand every frame.

## Hopf other half

Fiber families live *outside* `EquatorialHalf`. No Y-invert on the fibers — invert would break the loop.

Two un-mirrored clip copies of the same tubes:

- `y ≥ 0`: current opacity
- `y ≤ 0`: that opacity × `OTHER_HALF_OPACITY` (`0.25`)

Whole loops stay readable. The lower half is quieter.

## Bloom

One solid at a time, from the middle:

`cube → W4 → W3 → W2 → W1 → C9`

Envelope: scale `0` → overshoot → rest.

- Peak at `t = 0.42` (ease-out)
- Settle `0.42 → 1` (ease-in-out) to rest
- Cube overshoot `2.8×`, shells `2.4×` so they cross FOV 58 at start radius 7.2
- No second bounce. Prior solids stay at rest.
- Keep meshes mounted; drive `group.scale`. Remount is a hitch.

## Camera

One zoom out from the center:

`r = lerp(7.2, 34, easeOutCubic(introProgress))`

Drive `camera.position` from that curve during intro. No second lerp. No per-beat radius table. It leaves the center and stops once.

## Latency

- `applyClip` once on mount, not every frame.
- No `TubeGeometry` rebuild.
- Do not assign `mat.opacity` when the value did not change.
- `dt` cap `0.1` stays.

## Tests

`src/lib/instrument/motion.test.ts` — monotonic camera, bloom peak then settle, dim half `0.25`.
