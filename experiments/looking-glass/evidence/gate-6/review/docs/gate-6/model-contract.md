# Gate 6 model and semantic contract

Version `gate-6-model-v1`. Read `fixture.json` and `independent-predictions.json` as the exact data and independent oracle. All new contexts, requirements, dependencies, claims, proposals and summary histories are Gate 6 synthetic derivatives. None is an added historical fact, real participant action, or revision to Gate 2.

## Immutable input and reference identity

The source fixture is `docs/gate-2/fictional-records.json`; its four complete records and content hashes are retained. Source facts, provenance and history are accessible from either representation. `docs/gate-2/reference-mappings.json` supplies the exact two reference definitions and original mapping rule. Reference identity is the tuple `(id,version,mappingVersion)` plus its complete wording, scope, author and criteria; neither a display label nor an unversioned question is sufficient. Freeze both files' byte SHA-256 and each record's existing canonical content SHA-256. Recompute each record hash using its declared recursively sorted compact JSON, excluding only `contentSha256`.

`R_CAPACITY_60@1`: venue capacity≥60 gives yes; lower gives no. `R_EXISTING_ACCESS@1`: already accessible gives yes; explicitly requiring a ramp gives no. Weather/context is unmapped in both. These are partial criteria, and they remain fixed at every receiver requirement version. Retain exact reasons, provenance and source identities. Summary repair cannot promote a partial mapping answer into complete feasibility.

Each local manifest names its selected venue and weather-context, its own retained local reference, both alternative reference IDs and an AI-authored creation history. The two local contexts overlap on weather-context by exact `(recordId,contentSha256)`. That shared identity justifies a typed `shares-source` relation; it says nothing about communication or causal influence. The complete four-record repository and both mapping tables remain recoverable, including Studio and the intentionally unmapped weather record.

The larger-view reference is independent of the retained local reference. It computes outward criterion content from the chosen venue under the selected Gate 2 rule. Toggling larger reference changes relevance, answer and explanation only. Expand/collapse changes visibility only. The local manifest, its reference choice, evidence pointers and history remain identical. Display slots, graph positions, lines, adjacency and any loop-like ornaments are arbitrary diagram choices, without metric or topological semantics.

## Local dependencies and narrow receiver

The Hall dependency record cites `venue-hall.facts.requiredAccessEquipment` and records portable ramp, cost2. The Field generator cites `venue-field.facts.requiredPowerEquipment`, cost3. Its shelter cites the Field shelter requirement/cost and `weather-context.facts.rainCertain`, cost3. Requirement kinds are access, power and rain shelter. An equipment obligation is not evidence that equipment is obtainable, booked, funded or installed; all availability fields are `unknown-not-supplied`.

The new synthetic receiver requires capacity≥c, existing or required added access provision, supplied or required added power provision, required rain shelter when rain is certain, and listed venue-plus-required-equipment total≤b. It asks which candidates satisfy this **numeric screen with explicit obligations**, not whether the event is feasible. Receiver@1 has c60,b8; Receiver@2 changes only c to70. These requirements are derived for this gate and do not modify the source task.

For source venue v and source weather w:

`equipment(v,w) = requiredAccessEquipment if present + requiredPowerEquipment if present + shelterCostTokens if shelterRequiredInRain && w.rainCertain`.

`cost(v,w) = v.hireTokens + sum(equipment.costTokens)`.

`capacityPass = v.capacityHouseholds >= receiver.minimumCapacityHouseholds`.

`budgetPass = cost <= receiver.maximumVenueEquipmentCostTokens`.

`numericScreenPass = capacityPass && budgetPass` with explicit dependencies and availability caveat. Hall: equipment[ramp2], total6; Field: [generator3,shelter3], total9. Under receiver@1, Hall passes both numeric constraints and Field fails budget. Under receiver@2, Hall fails capacity and Field still fails budget. A capacity-only summary cannot answer the receiving task.

## Explicit outward projection and repair

The v1 outward payload has local ID/label, selected reference identity, selected venue identity/provenance, criterion answer, a generic criterion reason, summary rule/version and the literal declaration that dependency detail is omitted. The generic reason is “Selected venue satisfies the stated criterion” or “Selected venue does not satisfy the stated criterion”; a source pointer identifies the criterion evidence without copying its numeric value or equipment details. The full original mapping reasons remain in the recoverable mapping table. The two capacity summaries therefore have identical criterion content, with different local/source identities. A pointer to the recoverable local manifest is allowed. **The v1 payload must not contain numeric capacity, a precomputed receiving decision, total, hidden numeric-pass flag, or dependency list.** Receiver status is `insufficient-summary`; omitted values are absent or explicitly null/omitted, never zero/false. Visible wording follows the active larger reference; it must not say “capacity” under the access question.

The receiver evaluator is given the **declared outward payload**, not the full local model, source repository or an oracle answer. It first checks for candidateCapacityHouseholds, venueEquipmentCostTokens and complete requiredEquipment/evidence. Missing any returns `insufficient-summary` plus the missing-field list. It may not infer a total from equal outward wording. The whole instrument can expand to a richer local view; the insufficiency claim concerns v1 alone.

Repair v2 adds those fields, source-backed obligation details, the active receiver ID/version and its capacity/budget evaluation. It retains the criterion answer for the selected view reference, plus the availability caveat and narrow scope. Both representations apply the same repair function. Thus one universal summary is not presumed sufficient: v1 serves the partial reference while v2 additionally serves this receiver. A later receiver may require further detail.

Receiver@2 selects new summary revisions v3, retaining v1 and v2 as inspectable immutable prior versions. Each revision records local ID, revision/previous ID, synthetic author, operation, trigger reference/version, changed fields and source IDs/pointers. The trigger is the derivative requirement change; no source record revision is invented. Hall capacity pass true→false and Field true→true are both reevaluations. Field's unaffected capacity classification does not remove its trace. Studio and weather are not changed-capacity targets. Current view reference remains `R_CAPACITY_60@1`: Hall's view answer stays yes while its separate 70-household receiving predicate fails. The inspector must name both criteria clearly.

Revisions are declared fixture states selected by canonical playback or explicit exploration controls. Their author is `Gate 6 synthetic fixture editor; AI-authored simulation`, with no claim that Paul performed or accepted them. Actual control events separately identify their real actor category and trigger. Deterministic summary-history data never stand in for an actual browser event log.

## Typed connections, disagreement and unsupported claim

Supported local connections consist of one `shares-source` edge with Hall/Field endpoints citing their identical weather-context reference, and three `requires-equipment` edges from the relevant local to its requirement record with explicit evidence pointers. These relation types are distinct from Hopf fiber linking. Supported dependency traversal never uses unverified claims.

Retain two synthetic reference proposals: capacity-oriented and existing-access-oriented. Display both complete reference definitions and their mapping rows, their fixture author and their affected distinctions. Show local reference choices alongside them. Changing the active larger-view reference does not accept either proposal for other contexts, resolve disagreement, or average the alternatives.

The deliberate claim `G6-CLAIM-TRANSFER` asserts Hall→Field `transfers-resource`, with no supporting source IDs or evidence pointers. Status is `unsupported`; it is excluded from the supported graph and from summary/receiver computation. If drawn, use a visibly distinct dashed claim and label. Selecting it in either representation exposes the empty evidence and declared non-inference. A separate Close placement exploration changes only layout; no relation, record, reference or result changes. The supported shared-source edge remains visible and distinguishable from this claim.

## Representation parity and invariants

The typed diagram and plain table/graph consume the same semantic state and outward payload objects. They expose the same source facts, evidence pointers, local expansion, reference alternatives, relation inspection, repair and requirement-change operations. Geometry may change arrangement; it cannot receive extra substantive information or a different correction rule. The selected-local inspector may be shared. Preserve the full summary objects in the inspectable state so an auditor can compare both modes structurally.

Separate fingerprints for source records, local manifests, supported relations, current reference mapping, active summary projection, complete summary history and receiver evaluation. Reference changes preserve source/local/relation/history identities; expansion and display/layout changes preserve all semantic fingerprints; repair changes outward projection/evaluation only; requirement changes alter receiver bindings/summary revisions while original facts and both original reference tables stay fixed. Reverse receiver selection or canonical restore reselects preserved prior states rather than erasing history.

Use exact integer/string comparisons for fixture decisions. File identity uses SHA-256. If live fingerprints use a different algorithm, disclose the algorithm and collision limitation. No numerical tolerance is needed to decide these integers or source identities. The claim is reproducibility within the tested browser/build, not pixel equality or proof of semantic completeness.
