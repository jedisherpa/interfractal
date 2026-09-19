# 10 — Publish (G8 porch)

- run_id: 20260919-083634-interfractal
- when: 2026-09-19 PT
- consent: Paul Cooper explicit human publish consent (2026-09-19 PT) — "Push draft porches for all four CloudBurst ledgers"
- mode: sanctum porch — draft PR on non-default branch only

## What was published

Ledger documents only, under:

`docs/roman-bridge-runs/20260919-083634-interfractal/`

## What was not published

- `aim-proof-data/` / `*.key` / secrets — **excluded** (none present or not copied)
- Product source mutations — **none** beyond adding ledger docs under the docs path
- Merge to `main` — **not done** (draft ≠ merge)
- Deploy — **not done**

## Git

- branch: `rbm/20260919-083634-interfractal-sanctum-porch`
- base: `main`
- draft_pr_url: PENDING
- issue_url: PENDING

## Scan

Secret-pattern scan (`gho_`, `sk-`, `Bearer`, API keys) over committed copies: **no hits**.

## Note

Draft PR is for review only. Merging requires a separate human decision. This porch does not merge or deploy.
