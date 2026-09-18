# Build-agent prompt — remainder / hold doors

Paste everything under the rule below. Do not redesign the visualizer.

---

You are a build-and-verify agent. Do not redesign the visualizer. Do not add Joe, chase-cam, login, or a permission engine.

Repo: https://github.com/jedisherpa/interfractal

Branch: feat/remainder

Spec: docs/REMAINDER.md.
Signed motion already on main: src/lib/instrument/motion.ts, docs/SMOOTH_DISPLAY.md.
Formation walk already stops at hold: src/lib/instrument/formation.ts (`nextFormStage("hold") === "hold"`).
Store already has the three human maps: `advanceForm` no-ops at hold, `tableCommit` → pattern from hold/lenses, `nameNotFit` → miss.
HUD: src/components/instrument/hud.tsx, src/components/instrument/formation-panel.tsx.
Room: src/components/instrument/room-scene.tsx.

Locks:
- people = points
- Ready ≠ Yes
- Press = Enter
- geometry ≠ permission
- picture is evidence, not a Yes
- both bundles keep spinning, opposite directions, same tube diameter
- lower fibers: clip, no Y-invert, opacity × OTHER_HALF_OPACITY (0.25)
- do not change axis names, hinges, or Abacus table behavior
- tight top bar; do not fight the viewer for space
- no second HUD
- do not write clocks into zustand every frame

## Work

1. Branch from current main.

```
git fetch origin
git checkout main
git pull --ff-only origin main
git checkout -B feat/remainder
```

2. Add src/lib/instrument/remainder.ts as specified in docs/REMAINDER.md.

   `remainderOf({ phase, formStage, wellOpen, cyclePlaying, reducedMotion })`
   returns the live RemainderAct list.
   `remainderOpen` is `remainderOf(...).length >= 1`.

   Rules from the spec. Cycle playing must not remove stay/commit/miss.

3. Add src/lib/instrument/remainder.test.ts. Hook it in package.json next to
   motion.test.ts and formation.test.ts.

4. Wire the lamp into InstrumentHud header. Tight. One chip.

   - data-testid="remainder-lamp"
   - data-open="true" | "false"
   - visible text "Your turn" only when open and (formStage is hold, or phase is intro, or phase is room)
   - do not pulse with fiber spin
   - do not add a second bar

5. At formStage === "hold" and !wellOpen, present three co-equal doors in
   FormationPanel (same header row, not a modal):

   - Stay → advanceForm (already a no-op that logs). Label: Stay.
     data-testid="hold-stay"
   - Pattern → tableCommit. Label: Pattern.
     data-testid="hold-pattern"
   - Miss → nameNotFit. Label: Miss.
     data-testid="hold-miss"

   None of the three uses variant="primary" alone. If one must keep the
   existing primary class for contrast, give all three the same visual
   weight. Hide or relabel the old "Hold the outside" advance button
   while stage is hold so it does not look like the next slide.

   Gold stays a later act. Do not promote Gold to a fourth hold door.

6. Cycle / Pause title attribute: "Tour of weather. Not a Yes."
   CycleDriver must not call tableCommit, nameNotFit, or advanceForm.

7. Slice 2 only if slice 1 tests are green and the bar still fits:

   - Highlighted inner-family pair keeps constant opacity (full above,
     × 0.25 below). Do not fade them with the intro fill envelope.
   - Optional legend, lg+ only: "loops = weather · dots = people · geometry ≠ permission"

8. Do not Y-invert dim fibers. Do not rebuild TubeGeometry in useFrame.
   Do not turn a seat into a tube.

## Verify

```
npm test
npx tsc --noEmit
```

npm test must pass existing instrument tests plus:

- remainderOpen intro+idle === true
- remainderOf hold includes stay, commit, miss
- remainderOf idle excludes commit and miss
- remainderOf hold + cyclePlaying still includes stay, commit, miss
- nextFormStage("hold") === "hold"
- OTHER_HALF_OPACITY === 0.25

Visual smoke on :8080:

1. /  first page Light / Whole. Press is Enter, not Yes.
2. Whole intro: both bundles from the first fiber frame. Lower half dimmer,
   not missing. Camera only out.
3. Skip still lands in Cloud Nine.
4. Room: Cycle does not mint pattern or miss.
5. Sit a table to hold (goal → Yes on a seat → advance through the walk).
   Three doors visible. Lamp data-open="true".
   Stay leaves hold. Pattern lands in pattern. Miss lands in miss.
   Caption for miss still says miss, not failure.

If radius shrank during intro, fail the branch (motion.ts already forbids it).

## After green

```
git add src/lib/instrument/remainder.ts src/lib/instrument/remainder.test.ts \
        src/components/instrument/hud.tsx src/components/instrument/formation-panel.tsx \
        src/components/instrument/room-scene.tsx package.json docs/REMAINDER.md \
        docs/BUILD_AGENT_REMAINDER.md
git commit -m "feat: remainder lamp and three doors at hold"
git push -u origin feat/remainder
```

Open a PR into main. Do not force-push main.
Do not merge unless tests and smoke pass.
Do not deploy to Vercel unless the user asks in the same turn.

If Vercel is requested later: production branch main, project the user
already imported (interfractal-3.vercel.app). Do not invent a team scope.

Reply with: branch name, commit SHA, PR URL, test summary, and whether
the three doors were visible at hold.

Done when feat/remainder is on GitHub, tests are green, and the reply
includes that SHA.
