# Remainder — signed plan

Love is that which enables choice. In this instrument that is not a caption
on the loops. It is a predicate on the scene: while a person is on screen,
the set of acts the field cannot take stays nonempty.

This document is the signed plan for making that predicate visible.
It does not redesign the visualizer. It does not add Joe, a chase-cam,
login, or a permission engine.

## Problem

The drawing code is a split dynamical system:

- periodic drives (fiber spin ±1.55, nest spins, torus ω = 0.32) that do
  not halt unless `reducedMotion`
- a monotone envelope (intro camera 7.2 → 34, bloom 0 → overshoot → rest)
  that runs once
- a typed split (tubes vs cages vs points)
- a plane that does not treat every object the same
- a formation walk that is a line until `hold`, then two human terminals

Most of the motion is a procession. A procession looks like arriving and
is not a decision. The first cell where more than one act is live is
`hold`: stay, Commit → `pattern`, Not a fit → `miss`.

Today those three acts exist in the store (`advanceForm` no-ops at hold
and logs; `tableCommit`; `nameNotFit`) but the chrome does not present
them as co-available doors. Cycle can keep touring worlds while a table
is sitting. The highlighted Hopf pair can ride the same opacity envelope
as weather. A first-time viewer can read the spinning as a verdict.

## Locks

- People stay points. Ready is not Yes. Press is Enter.
- Geometry is not permission. The picture is evidence, not a Yes.
- Both Hopf bundles keep spinning. Opposite Y-spin. Same tube diameter
  (`0.04 / size`). Lower hemisphere: same tubes, same spin, opacity ×
  `OTHER_HALF_OPACITY` (0.25). Do not Y-invert the dim fibers.
- Do not change axis names, hinges, or Abacus table math.
- Do not add Joe, chase-cam, login, or a permission engine.
- Tight top bar. Do not grow a second HUD that fights the viewer.
- Reduced-motion remains a kill switch on every integrator.
- `dt` cap 0.1 stays. No per-frame Zustand writes of clocks.

## Model (what the code is allowed to compute)

Three layers already exist. Name them so the UI cannot mix types.

### F — field

Fibers. Circle action. Invariant of a pair: linking number ±1.
No decisions live here. Opposite ω is disagreement of coordinate, not
unlinking.

### S — cages

Nested solids. The equator *may* apply `(x,y,z) ↦ (x,-y,z)` and
`ω ↦ -ω`. Different type, different operator.

### P — points

`formPoint` returns one triple per index. Count 3–8. Stages:

```
idle ≺ goal ≺ orbit ≺ roles ≺ spokes ≺ lenses ≺ hold
```

`pattern` and `miss` are absorbing and human-named. They are not the
next slide of the walk. `nextFormStage("hold")` already returns `"hold"`.

### C — remainder

The set of acts the field cannot take, given current phase and stage.

```
C ⊂ { skip, steer, stay, commit, miss, reduce-motion }
```

Love, as a predicate: `|C| ≥ 1` whenever points are mounted or a human
can still skip / steer / kill motion.

Definitions that do not rank regimes:

| Word          | Means in this file                                      | Not |
|---------------|---------------------------------------------------------|-----|
| Coherence     | rigid within one type (`r = 1` on a family)             | a Yes |
| Agreement     | shared invariant (link, type, clip plane)               | same ω |
| Disagreement  | opposite sign on a coordinate the invariant does not need | failure |
| Chaos         | type collapse, or emptying C from a clock               | `miss` |

`miss` is a named radial spread. It is a decision outcome. Do not draw
it as fragmentation into tubes.

## Slice 1 — remainder lamp + hold doors

Ship this first. Everything else is polish on top.

### Remainder API

Add `src/lib/instrument/remainder.ts`. Pure functions. No Zustand
writes. No clocks stored in the store every frame.

```ts
export type RemainderAct =
  | "skip"
  | "steer"
  | "stay"
  | "commit"
  | "miss"
  | "reduce-motion";

export type RemainderInput = {
  phase: "pulse" | "gate" | "intro" | "room";
  formStage: FormStage;
  wellOpen: boolean;
  cyclePlaying: boolean;
  reducedMotion: boolean;
};

export function remainderOf(input: RemainderInput): RemainderAct[];
export function remainderOpen(input: RemainderInput): boolean;
```

Rules:

- `reduce-motion` is always in C.
- `skip` is in C during `intro`.
- `steer` is in C during `room` when the well is closed.
- At `formStage === "hold"` and well closed: `stay`, `commit`, `miss`
  are all in C.
- `commit` and `miss` are not in C at `idle`.
- Cycle playing does **not** add an act and does **not** remove
  `commit` / `miss` / `stay`. Cycle is a tour of weather, not a door.

`remainderOpen === remainderOf(input).length >= 1`.

While any person-point is mounted (`formStage !== "idle"` or seats have
been created for a sitting), `remainderOpen` must be true. A test must
fail the branch if a sitting table can produce `remainderOpen === false`.

### Hold doors

When `formStage === "hold"` and the well is closed, the tight top bar
must show three co-equal actions at once:

| Door     | Existing action     | Lands in    | Label on the door |
|----------|---------------------|-------------|-------------------|
| Stay     | `advanceForm` no-op | stays hold  | Stay              |
| Pattern  | `tableCommit`       | `pattern`   | Pattern           |
| Miss     | `nameNotFit`        | `miss`      | Miss              |

None is styled as the primary next frame. The current primary
`advanceForm` button at hold still says “Hold the outside” and only
logs. Relabel the hold cluster so Stay / Pattern / Miss read as a
lattice, not a line.

Do not hide Commit / Not a fit elsewhere in a way that leaves only one
live path. Gold remains a third human act after Commit. Gold is not a
fourth door at hold.

### Remainder lamp

One small indicator in the existing header (`InstrumentHud`), not a new
bar.

- `data-testid="remainder-lamp"`
- `data-open="true"` iff `remainderOpen(...)`
- Visible label, tiny: `Your turn` when open, nothing moral when the
  only remaining acts are skip / steer / still.
- At hold, the label may read `Your turn` and the three doors sit beside
  it.
- Color is on/off, not a health bar. Do not pulse it with fiber ω.

### Cycle

`CycleDriver` / `playCycle` may tour worlds. It must not:

- call `tableCommit` or `nameNotFit`
- advance `formStage`
- style a world arrival as a terminal

When `cyclePlaying` and `formStage === "hold"`, pause is allowed; auto
resolution is not. Button copy stays “Cycle” / “Pause”. Add a title
attribute: `Tour of weather. Not a Yes.`

## Slice 2 — type lock and the link pair

Do after slice 1 is green.

### Highlighted fibers

The two highlighted links on the inner family (`θ = π/3`, `φ = 0` and
`2π/3`) keep constant opacity across the intro envelope and across the
equator. Weather tubes may dim. The link pair does not breathe with
`r_× = |cos(ω t)|`. Lower copies of the pair use
`OTHER_HALF_OPACITY` only, never a second fade.

### Type lock

People are spheres from `formPoint`. Never `TubeGeometry` for a seat.
If a tiny legend is added to the header, three phrases max:

```
loops = weather
dots = people
geometry ≠ permission
```

Hide the legend under `lg:` if the bar overflows. Do not add a fourth
line of theology.

## Tests

Add `src/lib/instrument/remainder.test.ts` and put it on the package
test script next to `motion.test.ts` and `formation.test.ts`.

Must pass:

- `remainderOpen` is true for `{ phase: "intro", formStage: "idle", ... }`
  because skip and reduce-motion are live.
- `remainderOf` at hold includes `stay`, `commit`, and `miss`.
- `remainderOf` at idle does not include `commit` or `miss`.
- `remainderOf` with `cyclePlaying: true` at hold still includes
  `stay`, `commit`, `miss`.
- `nextFormStage("hold") === "hold"` (already true; keep it).
- `OTHER_HALF_OPACITY === 0.25` (already true; keep it).
- People fixtures stay points: `formPoint` returns a triple, never a
  tube parameter list.

## Visual smoke

1. First page is Whole / Light. Press is Enter, not Yes.
2. Intro: both bundles visible from the first fiber frame. Lower half
   dimmer, not missing. Camera only out. One-at-a-time bloom.
3. Room: Cycle tours worlds and does not mint a pattern.
4. Walk the table to hold. Three doors visible together. Lamp
   `data-open="true"`. Clicking Stay leaves stage `hold`. Pattern
   lands in `pattern`. Miss lands in `miss` and caption still says
   miss, not failure.
5. Reduce motion still kills spin.

## Out of scope

- Recoupling the two fiber families with a sine term (no Kuramoto
  overlay in the scene).
- Drawing `r_×` as a third glyph in slice 1.
- Changing Cloud Nine copy.
- Auth, Joe, chase-cam, permission engine, axis/hinge edits.
- Deploy to Vercel unless the user asks in the same turn.
