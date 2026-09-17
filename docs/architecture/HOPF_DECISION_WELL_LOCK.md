# Hopf Decision Well — architecture lock

**Host:** this App Builder preview (TanStack Start + React 19 + Three.js / R3F).
**Protocol:** vendored Hopf Workshop v0.2 from `jedisherpa/hopf-workshop`.
**Date:** 2026-09-16

Planned cosmology (not in this lock): [`DESCENT_COSMOLOGY_PLAN.md`](./DESCENT_COSMOLOGY_PLAN.md).

Until those decisions are taken: Cloud Nine stays a Garden presentation, not an opening fall and not a fifth shrink-layer. Playable plan-names are W1 Self, W2 Tribe / Cloud Six, W3 World / Cloud Three, W4 Transcendent / Earth. Eight are **entrances**, not GMD chambers. Do not add `ScaleLayerId = 4` or eight GMD interiors.

## Baselines inspected

| System | SHA | Notes |
|---|---|---|
| hopf-workshop `main` | `dd0ab5ea42e34fb53ebee461f7fc6831d6415205` | current at activation |
| hopf.js blob | `c36df81e8421c07e3e89bce3d9c59e75b6d74698` | vendored into `src/workshop/hopf.ts` |
| visualizer.js | `ef2bfd6b0a497971eb312558f235906f8e5208cb` | parade/inspect port in `src/workshop/view.ts` |
| fractal-block `main` | `043e614959f916fe7273e66ba1b3fa7011b8de57` | coordinates, gates, DEC-GATE-01 copied; Babylon 8 engine **not** transplanted |

## Renderer boundary

| Authority | Owner | May do | Must not |
|---|---|---|---|
| Practice agreement | `WorkshopDirector` → `Workshop` | explore, propose, consent, commit, withdraw, act, repair, release | travel between scales |
| Scale travel | `useGame.travel` + `FlightRuntime` | shrink/grow through existing gates | write consent |
| Presentation | `WellRig` / `WorldScene` | consume `DecisionFrame` + `TetraOverlay` | mutate Workshop during render |

## Seat / vertex transforms (DEC-VP-01)

```
V0 Self / Garden   = ( 1,  1,  1)/√3
V1 Forest          = ( 1, -1, -1)/√3
V2 Tribe / Desert  = (-1,  1, -1)/√3
V3 World / Core    = (-1, -1,  1)/√3
```

Child tetra at a vertex: center `Vi`, scale `1/φ`.

## Well coordinates actually shipped

| id | vertex | layer | position | radius |
|---|---|---|---|---|
| decision_well_V0 | V0 | 0 | (16, 3.2, 8) | 3.5 |
| decision_well_V1 | V1 | 1 | (16, 4, 8) | 3.5 |
| decision_well_V2 | V2 | 2 | (18, 6, 16) | 3.5 |
| decision_well_V3 | V3 | 3 | (14, 6, 16) | 3.5 |

Garden cube gate remains `(0, 6, 0)` r=5. Dual-use cube is forbidden. Distance invariant: `||W−G|| ≥ rW + rG + 2`.

## Camera contract

First-person flight. Yaw 0 faces world −Z. **A increases yaw (nose left). D decreases yaw (nose right).** W moves along heading. Space rises. Mouse-drag looks. Well-open damps flight. F opens well or uses a gate; Esc/F closes the well.

## Persistence

DEC-SAVE-01: workshop state is **session-only**. `SAVE_VERSION` is not bumped. Puzzle flags are not reused.

## Fallback

If the WebGL path fails, the inspect HUD remains HTML and still issues Workshop commands. 2D fallback of the inspect HUD is the same panel.

## Event idempotency

`Visualizer.sameFacts` exists. React re-renders on `tick` after commands, not on every RAF except nearby-prompt changes.

## Budgets

Shared fibre lines (≤4), cubocta as 12 small spheres, one well rig per visible layer. Previous layer unmounts on travel.

## Limitations vs Inner Fractal production

This run is a playable Decision Well instrument inside the App Builder host. It does **not** replace `jedisherpa/fractal-block` Babylon 8 combat, pylon puzzles, glyph sockets, or Iris victory. Those remain on fractal-block `main`. No push, PR, or deploy to that repository was authorized.
