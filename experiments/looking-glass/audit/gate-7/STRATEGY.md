# Gate 7 independent audit strategy

This is an audit plan, not a participant result or a Gate 7 verdict. It follows the frozen Gate 3–6 model contracts and the authorized Gate 7 scope. The auditor does not operate the browser, supply participant answers, or edit the Gate 7 specification.

## Before the prespec freeze

1. Require a small, enumerated set of genuinely unfamiliar task forms, exact prompts, permitted controls/observations, response options including **insufficient information**, scoring rules and a held answer key. The case list, thresholds and analysis categories must be frozen before trials.
2. Check that the participant route does not disclose truth through visible labels, colors, ordered names, filenames, URL/query strings, alt/ARIA text, inspector fields, tooltips, screenshots, network payloads, or bundled client data. A separate auditor/model route may expose truth, but its use cannot count as a visual comprehension response. Masking only the printed answer while shipping full source coordinates or solver output to the participant view is insufficient.
3. For static, prescribed motion and interactive conditions, freeze the same task-relevant underlying source and state, initial framing, render convention and instruction text. List **every** additional angle, slice, reference, expansion or feedback available in each condition. Declare duration, teaching, stopping and replay limits. Any information gain from additional interventions is a measured condition difference, not just an interface effect.
4. Keep attention and plain conditions matched on source records, relevance criteria, derived rules, update history and available actions. A different rule or disclosure depth would confound the display comparison.
5. Use distinct but equivalent forms and counterbalanced condition/order assignments where feasible. Record prior exposure to Gates 3–6 or worked examples and acknowledge any practice or transfer effect. A deterministic fixture alone cannot establish human superiority.

## Independent observability expectations

All ranks below concern **known matrices and matched raw 3D point observations**, not rendered 2D images. Reversing these matrices from screenshots would need further camera, correspondence and measurement assumptions. A viewer may answer a narrower visual question without reconstructing every coordinate.

| Model and observations | Stacked rank | Remaining ambiguity |
|---|---:|---|
| 4D `P R_xw(0)` | 3 | `w` unconstrained; known tesseract site has two `w` candidates. |
| 4D camera changes at the same source angle | ≤3 | Same `w` kernel. |
| 4D `0°` plus known `90°` x–w raw shadows | 4 | Unique point in `R⁴` under known transforms/correspondence. |
| 5D `P R(0,0)` | 3 | `w,v` unconstrained; known penteract site has four candidates. |
| 5D base plus x–w `90°` with β=0 | 4 | `v` unconstrained; two penteract candidates. |
| 5D base plus x–w `90°` plus y–v `90°` | 5 | Unique point in `R⁵` under the same assumptions. |
| Any 5D observations with β=0, including camera changes | ≤4 | `v` remains hidden. |

For a 4D unit ball centered at `w=±0.5`, initial full projection and the `w=0` slice are identical. A **known** `w=+0.5` slice distinguishes the declared pair (unit ball versus singleton). Camera motion of the initial view cannot. A fixed stored 3D movie matches the selected 4D projection sequence; a changed source-angle intervention separates that particular recording, but an adaptive 3D model remains possible.

For the centered 5D unit ball, a known slice plane `(w,v)=(s,t)` has radius `sqrt(1−s²−t²)` when positive, singleton at zero, and empty when negative. Radius alone identifies `s²+t²`, not the signs or individual values. If the task displays `(s,t)`, that metadata resolves the plane label by disclosure rather than visual inference.

Reference/scale questions must be judged against the exact disclosed record set and rule: Gate 6 compact v1 summaries are insufficient to decide the receiver budget, while repaired v2 makes the Hall 6 versus Field 9 token calculation available against 8; raising the receiver minimum from 60 to 70 changes the capacity screen. A participant asked for a dependency hidden by v1 should be allowed to say insufficient. Unknown availability or full event feasibility remains insufficient even after v2.

## Evidence and decision checks

- Run `node audit/gate-7/check-prior-integrity.mjs` before and after Gate 7 work. It is read-only and checks the pinned 872 frozen entries across Gates 0–6.
- Verify the frozen prespec bytes and actual build/run identity; compare answer-key outputs to an independent mathematical oracle that reads the declared case data only after participant-facing material is fixed.
- Inspect root's **actual** browser screenshots, UI state, action trace, event records and case responses for each condition. No generated event or inferred viewer answer counts as an observation. Recheck replay/checkpoint and reload identity within the same browser/build.
- Try leakage paths and negative cases deliberately. Verify that the UI offers and preserves an insufficient response where warranted and does not supply correctness feedback before a response.
- Keep numerical correctness, conditional uniqueness, human observations, navigation/clutter and presentation preference as separate verdicts. If no person participates, report human comprehension as untested. The strongest failure and a next smallest experiment belong in the final packet even if all code checks pass.
