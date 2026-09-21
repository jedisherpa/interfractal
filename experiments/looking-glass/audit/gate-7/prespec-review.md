# Gate 7 independent prespec review

**Verdict: ready for the prespec freeze, for the exact six files hashed below.** This is a specification review, not an implementation, browser, or human-comprehension result. Changes to any listed byte invalidate this verdict until reviewed again.

| File | SHA-256 |
|---|---|
| `docs/gate-7/experiment-charter.md` | `689226183f6467c0424541082f6638e000a8c5fb38ef3ebdf9f3eefe7f2c6656` |
| `docs/gate-7/model-contract.md` | `543675f0e58f1534315bae7155d0502e2d472cc6659afd566612eead7c3aff80` |
| `docs/gate-7/record-contract.md` | `cb8f3a1f2ecbc2544a7b7b98b7989a2a1d1c116f6385730858287838bb9b14f3` |
| `docs/gate-7/task-fixture.json` | `4e34224c64247b7cdf3edecd116fc84416d6ffc84781505804bf01ecd3db0f43` |
| `docs/gate-7/private-answer-key.json` | `c8b790346bf1f328f47a65575ac050c753cbd200839307fe645e5c408bb0f951` |
| `docs/gate-7/independent-predictions.json` | `8d1fb15c98bc2a9ee1f85e3b33de0b68acbcef6561dda1b4f4f75e1459c9bac4` |

## Reviewed checks

- Eight tasks and eight separate key entries exist. Option IDs are task-local; each keyed choice exists in its task. Participant-facing point identities are explicitly local to each case. Q03 and Q04 now use distinct points and source coordinates; Q07 and Q08 use distinct fictional contexts.
- Recomputed Q01 projections from the key's independent source points at 30°, 120°, 210°; the stacked raw-observation matrix has rank 4 and recovers `w=−0.8`. Q02's two distinct 4D source witnesses reproduce its one unchanged raw observation under all display cameras, so its answer is insufficient.
- Recomputed all Q03/Q04 point frames under the declared x–w and y–v rotations. Q03's positive and negative `v` witnesses produce the same supplied frames with β=0 and stacked rank 4. Q04's distinct source gives `v=−0.4`, with stacked rank 5. These are claims about matched raw xyz data under known transforms, not inversion of SVG images.
- Q05 now shows slices at `s=0.3,0.9,1.5` (ball, smaller ball, point) and asks about **unshown** `s=1.8`; the formula gives negative radicand and an empty slice while full projection stays radius 1.2. Q06's three private signed-plane witnesses all yield radius 0.6 and are absent from the public task data.
- Q07 supplies capacity headlines but no cost records, so opposite budget outcomes remain compatible. Q08's record arrays are equal across all three reference/receiver frames; Cedar costs 5, Quay costs 7, and only Quay meets the revised capacity≥70/cost≤8 numeric screen. The same Q07 or Q08 frame must be used in attention and plain modes.
- Public fixture field names and values contain no answer-key choice, recovered source coordinate, rank, private derivation, or actual signed Q06 setting. Candidate option labels are possible answers, not source disclosure. The only answer/explanation path specified is a separate receipt-gated POST reveal after submit or skip; its correctness remains an implementation and HTTP audit item.
- Static, prescribed, and interactive conditions use the same finite frame bytes but different simultaneous/serial/selective access. The charter acknowledges teaching, order and practice limitations; no human result or layout advantage is asserted. The canonical 48-second tour has zero responses and is labeled software demonstration.
- `node audit/gate-7/check-prior-integrity.mjs` passes all 872 pinned Gate 0–6 frozen entries (61+95+120+139+141+112+204).

## Required later audit boundaries

Inspect the exact build and actual browser/API evidence for hidden answer data in DOM, attributes, JavaScript, network responses, filenames, URLs, alt/ARIA text and inspectors. Verify an unrevealed Q05 task never renders its held-out answer; both attention/plain modes receive identical frame objects and no computed answer badge; receipt gating, skip semantics, reset/reload and saved checkpoints work. The host alone records genuine browser actions and images. Source-informed software submissions do not establish participant comprehension; no human participation is planned in this gate.
