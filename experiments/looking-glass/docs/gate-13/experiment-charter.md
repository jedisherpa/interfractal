# Gate 13 — A persuasive but wrong view

Version `gate13-charter-v1`. Actual user approval: **Approve Gate 13: A persuasive but wrong view**. Base revision `29cd75bc83006b6dee4a8437224bb5f14b3871e4`. This is a public authored-counterexample software demonstration; the title does not report measured persuasiveness. Zero human participants, belief responses, confidence scores or susceptibility measurements are authorized by this gate.

The bounded question is whether a polished representation can encode a false comparative statement while the checking evidence remains equally available in a plain representation, and whether an explicit correction preserves the original statement, source and correction provenance. Three fictional count cases suffice. This does not establish that anyone is misled, resists persuasion, learns from a debrief or benefits from graphics.

## Finite design

Every case records completed test tiles for fictional runs A and B in the same stipulated test window. These are counts, not rates or measured production. The candidate statement is always **“B completed twice as many tiles as A.”** Its exact truth condition is `B = 2 × A`.

| Case | A | B | Original axis lower bound | Original bar lengths in count units | Exact statement verdict |
| --- | ---: | ---: | ---: | --- | --- |
| MISMATCH | 80 | 90 | 70 | 10, 20 | False: 90 ≠ 160; B/A = 9/8 |
| TRUE_CONTROL | 40 | 80 | 0 | 40, 80 | True: 80 = 80; B/A = 2 |
| ZERO_CONTROL | 0 | 10 | 0 | 0, 10 | False: 10 ≠ 0; B/A undefined |

MISMATCH is the intended counterexample: bar-length ratio 2 is not count ratio 9/8. The lower bound and count labels must remain legible; no false source values are needed. TRUE_CONTROL prevents treating every polished statement as false. ZERO_CONTROL tests domain handling: the equality is false even though the ratio is undefined. Infinity, zero, a fabricated percentage, and “insufficient evidence” are all wrong answers for this complete count record.

The two representations share the statement, exact source counts, scale, calculation values, inspect/check/correct controls and provenance. The visual view adds a carefully typeset horizontal bar graphic; the plain view gives its exact encoding as a readable table. A common source panel is one identical action away in both before checking or correction. Both initially show a prominent **Public fictional demonstration — authored statements may contain mistakes** notice. All fixture and oracle answers are public; this is not a blinded study or prediction-before-reveal instrument.

Checking the original statement creates a source-bound immutable check record. A false statement enables **Apply correction and debrief**, which creates an immutable correction referencing that check and changes the displayed summary. In MISMATCH the correction uses a zero baseline and the exact 10-tile / 9/8 comparison. In ZERO_CONTROL it reports the 10-tile difference and undefined ratio. TRUE_CONTROL retains its accurate original and creates no correction. Original versions remain inspectable; correction never edits source or original bytes. Reopening a saved tour does not erase local records; reload does, after export and a new document UUID.

## Scope, process and stop

Use new module `misleading-view/`, provisional loopback port 44006. Keep the instrument dependency-free and small: three case reviews, one check per case, at most one correction per false case; no accounts, sessions, mutation APIs, freeform scoring or simulated participants. Preserve Gates 0–12, their qualifications and the unchanged supplied archive. The host reports 1,745 prior frozen entries verified at Gate 13 start.

Independent Sol derives the three claims, rational values, ten valid case/version/representation states and replay expectations before the host freezes these five authored files and review artifacts. Builder starts only after that freeze. Allow candidate 001 and at most two evidence-justified revisions (002/003); preserve every attempted candidate and failed acquisition. Candidate 001 must complete the real source→check→correction/debrief→original-history workflow in both representations early, before extensive presentation work. Separate numeric or controlled-DOM checks cannot replace that browser path.

The 24-second tour opens paused and ends at a real automatic stop. Actual browser controls, hashes, original images and independent review establish only the software result. Preserve failed actions, tool errors, missing active windows, incomplete captures and negative controls. Correctness, information parity, rendered operation and human outcomes are separate claims.

The active full-program v0.3 goal is prospectively in scope, as recorded in [the program ledger](../program-requirements-and-status.md); its 18-card materials, agent bench and human stages remain incomplete. This Gate 13 fixture does not substitute for that corpus. No research-agent bench, enrollment or human study is executed here. At Gate 13 review, distinguish the next proposed Looking Glass **Gate 14 — Geometry ablations** from the separate full-program materials-review dependency. Neither is authorized by a browser action or this charter.
