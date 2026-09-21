# Materials-v1 independent blind derivation

**Status: BLIND, UNCOMPARED.** I used only the five public frozen design files and their [source/task freeze](../design/SOURCE_TASK_FREEZE.json), plus the prior independent checklist and original protocol. The exact input and output hashes are in [blind-input-manifest-001.json](blind-input-manifest-001.json). I did not open the author key, author expected answers, scoring output, solver, builder examples, or other new design plans. Root must freeze this derivation before any comparison. This is an engineering audit, not one of the four proposed research-agent snapshots or a human study.

The complete [blind key](blind-key-001.json) contains 32 packet-specific responses (D01–D08 × four packets), ten union responses (D01–D10), and six withheld tasks across seven contexts. Every atom has its status or value, exact supplied claim/rule IDs, and a named missing dependency where unknown. The [read-only deriver](derive-blind-key-001.mjs) rechecks each frozen input hash before evaluating; it imports no author solver. The source is fictional, cutoff tick 10. R01–R03 keep unseen claims unknown, explicit supersession exact, and unsuperseded contrary evidence conflicted; R04–R07 separate mental-state, attestation, commitment, capacity, demand and inspection; R08 selects only supported-ready plans; R09 deduplicates lineages; R10 applies the same rules to independent transfer worlds.

## Four initial six-card scopes

Codes in the tables: **S** supported, **R** refuted, **C** conflicted, **U** unknown. An unknown does not mean false. The two shared anchors `C01`/`C02` are each one source despite appearing in every packet. A1 receives `C03`–`C06`; A2 `C07`–`C10`; A3 `C11`–`C14`; A4 `C15`–`C18`.

| Task | A1 | A2 | A3 | A4 | Union | Evidence and reasoning |
| --- | --- | --- | --- | --- | --- | --- |
| D01 active demand/version | 8/v1 | 8/v1 | 8/v1 | 10/v2 | 10/v2 | `F-C02-1` supplies 8; `F-C17-1` explicitly supersedes it only where C17 is visible. |
| D02 press/cart/varnish | 6/–/– | –/2/– | –/–/0 | –/–/– | 6/2/0 | `F-C03-1`, `F-C07-1`, `F-C12-1`. The zero in `F-C12-1` supersedes historical `F-C11-1`=1; missing capacities remain null/unknown. |
| D03 Ara understands/endorses/press6 P12 | S/R/S | U/U/U | U/U/U | U/U/U | S/R/S | `F-C04-1` understanding, `F-C04-2` explicit non-endorsement, `F-C04-3` exact press commitment. The three relations remain distinct. |
| D03 Bea endorses/cart2 P12 | U/U | S/S | U/U | U/U | S/S | `F-C08-2` endorsement, `F-C08-3` exact cart commitment. |
| D04 Ara explores/understands/press5 P10 | S/S/U | U/U/U | U/U/U | U/U/U | S/S/U | `F-C05-1` explores and `F-C06-1` understands. Neither entails a press grant; no such claim is supplied. |
| D04 Bea cart1/Cy varnish1 P10 | U/U | R/U | U/S | U/U | R/S | `F-C10-1` explicitly refuses Bea's exact cart request. `F-C13-1` and `F-C14-1` are one positive Cy grant lineage, not two units. |
| D05 model attributes Ara endorsement / Ara actually endorses P12 | U/R | U/U | U/U | S/U | S/R | `F-C16-1` is only a model attribution; `F-C04-2` is the actual stipulated negative endorsement. R04 forbids promotion. |
| D05 Dev may describe / commit | U/U | U/U | U/U | S/R | S/R | Complete mandate `F-C15-1` contains describe only; no inferred resource-binding power. |
| D06 P10 inspection | U | U | U | C | C | `F-C18-1` pass and `F-C18-2` fail concern the same plan/version/scope and neither supersedes the other. |
| D08 choice/output/cost | none/–/– | none/–/– | none/–/– | none/–/– | P12/12/7 | Only the union has all P12 capacity and exact grants (`F-C03-1`, `F-C07-1`, `F-C04-3`, `F-C08-3`) with demand10 (`F-C17-1`). R08 does not upgrade a merely possible partial-packet plan to supported-ready. |

### D07 component and readiness statuses

| Plan/component | A1 | A2 | A3 | A4 | Union |
| --- | --- | --- | --- | --- | --- |
| P8 physical | U | U | U | U | S |
| P8 demand | S | S | S | R | R |
| P8 commitment | U | U | U | U | S |
| P8 inspection | S | S | S | S | S |
| P8 readiness | U | U | U | R | R |
| P12 physical | U | U | U | U | S |
| P12 demand | S | S | S | S | S |
| P12 commitment | U | U | U | U | S |
| P12 inspection | S | S | S | S | S |
| P12 readiness | U | U | U | U | S |
| P10 physical | U | U | R | U | R |
| P10 demand | S | S | S | S | S |
| P10 commitment | U | R | U | U | R |
| P10 inspection | U | U | U | C | C |
| P10 readiness | U | R | R | R | R |

The P8 demand reversal uses `F-C17-1`: output 8 fails demand 10. P10 physical failure uses active varnish 0 from `F-C12-1`; its original 1 is historical. P10 commitment failure in A2/union uses `F-C10-1`. A4's conflicting inspection `F-C18-1`/`F-C18-2` makes P10 readiness **refuted**, rather than conflicted, because all other required components are unknown there: an AND cannot have positive support when any input lacks it, while the inspection supplies negative support (R02). In the union, physical and commitment also refute P10. Component statuses are retained even when overall readiness is refuted.

Union-only D09: Cy's P10 varnish lineage count is **1**, maximum quantity **1**. `F-C13-1` and `F-C14-1` have the same `K-CY-P10` lineage; both source references remain visible. D10: C06/C13 share the surface “Ready.” yet `F-C06-1` is `understands(ARA,P10@1)` and `F-C13-1` is `resource_commitment(CY,P10@1,varnish,1)`; answer **same_surface_different_relation**. C13/C14 use different surfaces but the same directed commitment roles, quantity and lineage; answer **different_surface_same_relation**. Surface alone never licenses transfer.

## Withheld transfer contexts

Each context is independent under R10; its facts do not amend the development world. The displayed “Ready.” maps to the context's explicit `surfaceBindingClaimId`.

| Task/context | Physical | Demand | Commitment | Inspection | Readiness | Choice | LIN endorsement v1 | Bound utterance | Decisive IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W01 | S | S | S | S | S | Q7 | R | commitment | `W01-F1/F2` capacity, `F3` demand, `F6/F7` grants, `F5` non-endorsement; surface binds `F7`. Understanding `F4` and endorsement `F5` do not cancel grant `F7`. |
| W02 | S | S | U | S | U | none_supported | R | understands | `W02-F1/F2/F3` support physical/demand, `F6` grants NOA; LIN's exact grant is absent. `F4` binds the utterance to understanding; `F5` refutes endorsement. |
| W03 | S | S | U | S | U | none_supported | R | commitment | `W03-F6/F7` bind grants to Q7 **v1**; catalog Q7 is **v2**, so those grants do not satisfy it. `F5` still refutes the separately requested version-1 endorsement; surface binds `F7`. |
| W04 | S | R | S | S | R | none_supported | R | commitment | `W04-F8` demand8 supersedes `F3` demand7; Q7 outputs7. Grants `F6/F7` are still valid; surface binds `F7`. |
| W05 | S | S | C | S | C | none_supported | R | commitment | `W05-F7` affirms and `F8` denies the exact LIN grant, neither superseded. NOA `F6` supports its grant. R02/R05 preserve both; conflicted readiness is ineligible. |

For W06, the identical surface “X can supply 6. Y can supply 6.” omits the physical dependency. Each individual plan outputs 6 against demand12, so its demand/readiness is refuted in both contexts. Empty bundle has physical/commitment/inspection supported by vacuous AND but output0 fails demand12. Both exact plan grants are positive. Bundles add output and cost, while resource requirements sum by *resource ID*.

| W06 context/bundle | Physical | Demand | Commitment | Inspection | Readiness | Output/cost |
| --- | --- | --- | --- | --- | --- | --- |
| SHARED empty | S | R | S | S | R | 0/0 |
| SHARED X | S | R | S | S | R | 6/2 |
| SHARED Y | S | R | S | S | R | 6/3 |
| SHARED X+Y | R | S | S | S | R | 12/5 |
| SPLIT empty | S | R | S | S | R | 0/0 |
| SPLIT X | S | R | S | S | R | 6/2 |
| SPLIT Y | S | R | S | S | R | 6/3 |
| SPLIT X+Y | S | S | S | S | S | 12/5 |

`W06-SHARED-CAP-bay` supplies only one bay unit against combined two; **none_supported**. `W06-SPLIT-CAP-bayX` and `W06-SPLIT-CAP-bayY` each supply one distinct resource; **[X,Y]** is supported-ready at cost5. `W06-*-D` establishes demand12, and the plan-specific `K-X/K-Y` claims establish commitments. This is a difference in dependency structure, not wording.

## Consequential ambiguities and limits preserved for comparison

1. An unknown aggregate can contain known subcomponents. The public task's provenance rule requires an unknown atom's top-level evidence `[]` plus named missing dependencies; the detailed component atoms retain partial known sources. The author key should not penalize correct component citations or equate unknown with refuted.
2. W03 deliberately asks for **LIN endorsement at version 1** while evaluating Q7 catalog **version 2**. The former is refuted by `W03-F5`; the latter's grant is unknown because only version-1 commitments are supplied. Collapsing these versions would be a scoring error.
3. W05's opposing exact grants have no supersession. Both must remain visible; a positive grant cannot silently override a refusal. Readiness is conflicted, not action eligible.
4. C13/C14 represent one grant lineage but two source references; the distinct-lineage count and source-reference count answer different questions.
5. W06 separate positive conditional plan grants do not create simultaneous physical capacity. The shared-bay and split-bay worlds have the same outward summary but different bundle verdicts.
6. A1–A4 all answer `none_supported` for D08 because missing relevant evidence is not positive readiness. That answer does **not** assert physical impossibility of every plan.

I have not judged author-key agreement, packet prompt quality, comparator design, or software implementation. Those are later review phases after root freezes this blind result.
