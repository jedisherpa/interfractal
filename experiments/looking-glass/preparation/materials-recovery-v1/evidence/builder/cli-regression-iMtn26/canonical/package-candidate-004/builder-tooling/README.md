# Materials package tooling

Dependency-free Node 24 tools for the preparation-only materials packet. These commands do not call a model, recruit anyone, collect a research snapshot, or approve Gate 14.

From the repository root:

```sh
/opt/homebrew/Cellar/node@24/24.17.0/bin/node experiments/looking-glass/preparation/materials-v1/tooling/schema-validator.test.mjs
/opt/homebrew/Cellar/node@24/24.17.0/bin/node experiments/looking-glass/preparation/materials-v1/tooling/build-package.test.mjs
/opt/homebrew/Cellar/node@24/24.17.0/bin/node experiments/looking-glass/preparation/materials-v1/tooling/build-package.mjs build
/opt/homebrew/Cellar/node@24/24.17.0/bin/node experiments/looking-glass/preparation/materials-v1/tooling/build-package.mjs verify
```

`build` now targets `package-candidate-003` and refuses to overwrite it. Candidates 001 and 002 and their evidence remain unchanged. `verify` reconstructs expected output in memory from the authored design files and compares every saved byte, SHA-256 hash, size and path. If source changes, create a separately named candidate rather than replacing an accepted packet. A failed partial build remains on disk with a `.building-<pid>` suffix for inspection.

Each candidate also copies the exact generator, validator, tests, synthetic fixtures and this README under `builder-tooling/`; its root manifest pins those bytes. Reproduction requires restoring those bytes beside the pinned `design/` inputs in a clean staging directory before running the copied tooling. The copied script is evidence of the build source and is not invoked from inside the candidate directory.

The research-team bundle contains all authored design materials, including the researcher-only answer key. Each initial participant bundle is made by explicit card-ID and public-field allowlists and contains that packet's six cards, common public rules/entities/plans, one allocation, the snapshot schema, public instructions, only development tasks marked for initial access, the verbatim authored initial prompt **template**, and proposed settings derived from `execution-plan.json`. Runtime identity and actual model/version must be resolved and pinned at a future authorized launch before the final prompt can be rendered. The withheld transfer file is in a separate phase-bound directory. The generator's content checks concern saved bundles only. A future research launch must supply each bundle in a fresh context with tools disabled or an actually restricted runner; same-workspace agents can otherwise read peer files.

To inspect the generated researcher overview locally after a successful build:

```sh
/opt/homebrew/Cellar/node@24/24.17.0/bin/node experiments/looking-glass/preparation/materials-v1/tooling/preview.mjs 44009
```

The preview binds to `127.0.0.1`, serves only the generated HTML at `/` and `/index.html`, and exposes no answer-key or filesystem route. It is a read-only materials review, not a participant instrument or evidence of human understanding.

`snapshot-contract.mjs` requires a trusted host context that pins snapshot/model identity, phase, card allocation and input/settings hashes. Initial records must use their authored six-card packet and D01–D08; union, revised and interactive-final records must use all eighteen cards and D01–D10. A pool is a deterministic comparator artifact, not a research snapshot. This validator checks schema shape, exact scope, ID uniqueness, source-reference reachability, four-valued evidence/status consistency, and whether a proposed supported action cites supported D07 components. It does **not** score whether a well-formed task answer is numerically correct or whether its cited sources fully prove it. The separately frozen answer key and scorer handle that; future launch infrastructure must retain raw invalid output and report validation failure rather than erase it.

For literal `understands`, `endorses`, `resource_commitment` and `model_attributes_endorsement` interpretations, each asserted polarity requires a matching supplied claim with the same predicate, directed roles, Boolean value and appropriate source kind. Public rules may supplement that claim but cannot replace it. A model inference does not create an actor or model-artifact attestation. The exact quantity in a literal commitment interpretation is the recorded quantity; R05's grant-at-least-request inference belongs to derived task/readiness scoring. This guard does not prove that all citations in a broader derived answer are sufficient.
