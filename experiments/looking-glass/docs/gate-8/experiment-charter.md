# Gate 8 — Indistinguishable worlds and revealing observations

Version `gate8-charter-v1`. **Independently reviewed prespec with the requested event-granularity clarification incorporated; ready for host freeze, not yet frozen.** The reviewer must confirm the clarified contract and its updated hashes before the host freezes the files. Implementation begins only after that host freeze. This gate continues the completed Gates 0–7 without modifying their models, runs or evidence.

## Question and boundary

For each **declared finite candidate family**, which candidates have exactly equal baseline observations while disagreeing on a stated property? Can an admissible observation distinguish them? If so, what smallest subset of the finite query menu suffices to determine that property for every member of that family? If not, exhibit an unresolved pair that survives the entire menu. Separately show why changing an ordinary display camera adds no raw source observation and why equal rounded labels are weaker than equal raw observations.

This is a transparent software benchmark and review instrument. All candidate worlds, properties, baseline queries and admissible interventions are public. It has no concealed actual world, participant answers, scoring, recruitment or response dataset. A public reference-world selection determines which observations the compatibility calculation matches; it is not a guess-the-hidden-world task. An optional **Show finite certificate** control deliberately expands explanatory enumeration derived from the same public data. Local independent predictions are audit material, not a secret human test key. Human-participant count is zero.

The four cases are the complete benchmark. Do not add a question library, learning conditions, adaptive learner, study enrollment or package dependency. Use built-in Node and HTML/SVG in `ambiguity/`, provisionally at loopback port 44001 if available. Evidence concerns exact rational coordinate/radius-squared records and their known forward model. A rendered two-dimensional image alone is not the observation used by the solver.

## Declared cases

| Case | Public family and property | Baseline | Admissible additional queries | Expected bounded distinction |
|---|---|---|---|---|
| `G8-C01` Hidden sign | Two 4D points `(0,1/2,-1/4,w)`, `w=−1,+1`; property `w>0`. | Drop w. | Known x–w quarter-turn then drop w. | One exact collision with different property values; one revealing query. |
| `G8-C02` Two hidden signs | Four 5D points `(1/2,−1/2,0,w,v)`, `w,v∈{−1,+1}`; property the ordered pair of signs `(w,v)`. | Drop w and v. | Separate x–w quarter-turn, or separate y–v quarter-turn, each applied to the original source. | Six conflicting pairs initially. Each single query leaves two unresolved pairs; both queries determine the property. No combined-turn query is in this menu. |
| `G8-C03` Restricted slice menu | Two closed 4D unit balls centered at `(0,0,0,c)`, `c=−1/2,+1/2`; property `c>0`. | Full xyz projection and slice at w=0. | Slice at w=−2 or w=+2. | Baseline and all allowed queries agree; both extra slices are empty. The explicitly **outside-menu** slice w=+1/2 would separate them, so the certificate is not a universal impossibility claim. |
| `G8-C04` Rounded-label trap | Two 4D points `(δ,0,0,w)`, paired `(δ,w)=(−10⁻¹²,−1),(+10⁻¹²,+1)`; property `δ>0`. | Drop w. | Known x–w quarter-turn then drop w. | Baseline raw values already differ exactly, but differ by only 2×10⁻¹², are within the diagnostic 10⁻¹⁰ tolerance, and have the same two-decimal labels. The additional query separates them robustly. |

Candidate IDs are opaque stable IDs within the public fixture; all displayed source coordinates are explicit. The actual answer claims are deterministic consequences of this declared family. Selecting a family, narrowing its menu or changing its observation precision changes the inference problem and must never be described as inference about all possible worlds.

## Required results

1. Enumerate all nine within-case unordered candidate pairs and their property agreement, baseline exact agreement, numeric-nearness diagnostic and rounded-label agreement. Exact baseline collision counts by case are 1, 6, 1, 0; eight of nine pairs are exact baseline collisions with different property values.
2. Enumerate every subset of each additional-query menu, including the empty subset: 2, 4, 4 and 2 subsets respectively. A subset is property-determining iff every pair with unequal property answers differs in at least one baseline or selected query observation. Report all cardinality-minimal valid subsets, or `none-in-menu` and a surviving witness. Never imply global query optimality or an adaptive-policy optimum.
3. Independently verify all exact forward outputs, camera-only invariance, point/empty/ball distinctions, the outside-menu witness and the rounding trap. Numerical approximations and drawings must be checked separately from exact decisions.
4. Show these cases intelligibly through actual browser controls, with raw exact records accessible and a concise explanation of what is being compared. Preserve a deterministic paused canonical tour and repeatable same-browser checkpoints, with exploration separate from it.

The hypotheses may fail as implementation checks. A wrong formula, invalid separator, unsupported minimality statement or conflation of raw and displayed equality blocks a positive benchmark conclusion. Interface/capture failures must remain recorded even when fixed. Browser success alone does not establish comprehension or preference.

## Review and stop

An independent Sol reviewer must review this charter, the model/record contracts, fixture and independently prepared predictions before freeze. That review is not satisfied by the author's self-check. The host writes the freeze manifest only after resolving material issues. The builder then implements against those frozen hashes; no specification change is silently backdated.

At most candidates `G8-AMBIGUITY-001` through `003` are allowed: the first plus two justified corrections. Preserve failed candidates and their exact bytes/evidence. A material model or scope change returns to explicit prespec review. The final independent audit must distinguish finite-model results, UI checks, replay recovery and historical preservation; report unrun checks honestly.

The packet contains the actual paused run/build, short watch guide, two to four inspected original captures, expected/observed/interpretation/unresolved table, all candidates, exact restart command and the next proposed Gate 9 scope. Historical integrity is checked against all 979 frozen entries through Gate 7. Stop current-stage workers, freeze this gate and return for Paul's next named-gate decision. Do not execute Gate 9 or a human session.
