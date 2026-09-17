# Build-agent prompt — push and test smooth intro

Copy everything below the line into a repo-capable build agent.

---

You are a build agent for `jedisherpa/interfractal`.

## Goal

Land `feat/smooth-intro` on `main` after tests pass. Do not invent features. Do not add login. Do not add Joe / chase-cam.

## Repo

- Remote: `https://github.com/jedisherpa/interfractal`
- Branch to test: `feat/smooth-intro`
- Production branch: `main`
- Baseline: `6db31466dc6e6eefcbcd5865ae6d4fe72d5c4641` (or current `main` if it moved)

## What this branch must do

1. Other halves of the spinning Hopf bundles render at 25% opacity so the whole loop is visible and one half is quieter. Do not Y-invert the dim half.
2. Nested solids bloom one at a time from the middle (`cube → W4 → W3 → W2 ↑ W1 → C9`): expand past the camera edge, ease back to rest. No snap.
3. Camera zooms out from the center (`7.2 → 34`, ease-out cubic) in one motion and stops. No back-and-forth. No per-beat radius table. No second lerp during intro.
4. Both Hopf bundles keep spinning the whole time, opposite directions.
5. Reduced-motion still skips the intro and lands in the room.

## Commands

```bash
git fetch origin
git checkout feat/smooth-intro
git pull --ff-only origin feat/smooth-intro
npm test
npx tsc --noEmit
```

`npm test` must include `src/lib/instrument/motion.test.ts`. If the script line is missing that file, add it and commit.

## Visual smoke (if preview is up on :8080)

1. Open `/`. First page is Whole / Light. Press is Enter, not Yes.
2. Press the dot, then Whole, to start the intro.
3. Confirm: fibers fill; lower half of each hoop is dimmer, not missing.
4. Confirm: cube, then each shell, grows past the frame and settles. One at a time.
5. Confirm: camera only moves out. It does not dolly in between beats.
6. Skip (`Escape`) still lands in Cloud Nine.

## If tests fail

Fix the failing assertion. Do not weaken `OTHER_HALF_OPACITY === 0.25`. Do not allow `introCameraRadius` to decrease.

## Push

When `npm test` and `tsc --noEmit` pass:

```bash
git checkout main
git pull --ff-only origin main
git merge --ff-only feat/smooth-intro
git push origin main
git push origin feat/smooth-intro
```

If fast-forward is impossible, open a PR from `feat/smooth-intro` into `main` and do not force-push `main`.

Do not deploy to Vercel unless the user explicitly asks in the same turn and the Vercel team scope `jediserpas-projects` is authorized.

## Done when

- `motion.test.ts` is green
- `tsc --noEmit` is clean
- `main` on GitHub contains the motion helpers and the room-scene bloom / dim-half / one-shot camera
- The reply includes the commit SHA and the repo URL
