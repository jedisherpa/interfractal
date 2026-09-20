# First session materials — synthetic calibration form A

Status: source/semantic calibration materials v0.2 after review; human administration depends on the pilot readiness gate. No participant results exist.

## Purpose and scope

This task exercises information integration, feasible planning, response to a changed dependency, scoped representation at the next scale, and separation of physical feasibility from authority to act. It is deliberately small enough to have a complete answer key. It is not a validated psychological scale, difficulty-equated task bank or demonstration of collective advantage.

Print or render the common brief and four role cards from lantern_task.json. The investigator retains state fields and the answer key. In a distributed-information task, each participant initially receives only their own role card plus common brief. In a representation-comprehension task, everyone receives the full public event record. These are different tasks; do not compare their scores as if information access were equal.

## Participant introduction

You will work on a fictional festival coordination task. We are evaluating how the information is presented and how people use it. We are not scoring your worth, personality, openness, or agreement with the researcher. You may disagree with a proposed interpretation, ask for a correction, pause, or leave. Some example suggestions deliberately contain mistakes. They are separate from the source record; only the facts and decisions identified in the task determine the answer. The characters' decisions are fictional, not commitments by you. Please avoid including private real-life details.

The actual study consent and data information sheet must specify the approved study owner, recording, retention, withdrawal handling, compensation if any, and contact details before use. Do not infer these from this package.

## Facilitator procedure for calibration

1. Explain the selected interface using the same words and training time across matched conditions. Do not praise the geometric condition or describe it as more advanced.
2. Present S1. Ask: “Identify **all** physically feasible route/frame/battery plans. For the current v1 proposal separately state whether it is physically feasible, authorized under the fictional rule, and ready to act. Give reasons.” Record the answer before feedback.
3. Present the verified closure event S2. Ask for all remaining physically feasible plans, then the current v1 proposal's physical feasibility, authorization and readiness. Ask what must change before the festival organizer can rely on delivery. Closure does not itself revoke the existing mandate/endorsements.
4. Present S3. Ask for the same three judgments about v2, what remains missing and whose response matters. Do not describe a missing response as disagreement.
5. Present S4. Ask for the same judgments, what changed and why readiness differs from S3.
6. In a separate card labeled “Suggested interpretation to check,” show: “D approved the bridge plan before S4.” Ask participants to check it against the intact source record and record a correction to the suggestion. Never insert the false claim into canonical evidence, create an endorsement, or attribute it to a real participant.
7. Ask a transfer question in a different surface story: a food team has the same outward promise but one kitchen permission applies to yesterday's plan. Which detail must an organizer inspect? Transfer materials need independent review and difficulty calibration before comparative study use.
8. End with a short interview about confusing terms, missing information, and effort. Feedback belongs after recorded probes.

For a human comparison, this single sequence cannot be reused unchanged across interfaces and counted as independent evidence. Develop parallel forms and freeze a counterbalancing or between-group allocation plan first.

S1–S4 form a dependent teaching/calibration sequence. Improvement within it is not independent evidence of an interface effect. Before P2 freeze exact event-card wording, who sees each fact, answer points, time limits and feedback timing; create participant forms from the JSON's event facts without its investigator-only expected fields. The transfer question is a cued comprehension probe, not yet evidence of spontaneous analogical transfer. A real attribution or permission defect follows the protocol's stop/repair rule and may not be reclassified afterward as an intended probe.

## Exact answer key

| State | All physically feasible plans | Current proposal: physical / authorized / ready | Explanation |
|---|---|---|---|
| S1 | compact + long battery via orchard or bridge | Yes / Yes / Yes | v1 orchard plan has matching endorsements and mandate; bridge is feasible but outside that plan/mandate |
| S2 | compact + long battery via bridge only | No / Yes / No | Closure makes v1 physically impossible without revoking its recorded authorization |
| S3 | compact + long battery via bridge only | Yes / No / No | D's v1 endorsement does not endorse v2 |
| S4 | compact + long battery via bridge only | Yes / Yes / Yes | D's explicit v2 endorsement completes this task's stated rule |

The large frame fails orchard timing (25+30 > 50 minutes) and bridge width (1.6 > 1.2 m). The short battery fails 60-minute runtime. These constraints make all 8 candidate plans exhaustively scoreable at each state.

## Probe rubric (calibration only; not yet a frozen primary measure)

Score each prespecified proposition as correct, incorrect, or missing using the answer key. Preserve item-level results.

- P1: identifies both physically feasible initial plans.
- P2: distinguishes the presently authorized v1 plan from the other physically feasible plan.
- P3: identifies the feasible alternative after closure.
- P4: identifies that the old plan cannot proceed after closure despite its retained authorization; the obstacle is physical feasibility.
- P5: identifies D's current-version response as missing at S3.
- P6: explains S4 readiness by the new response, not changed geometry or increased confidence.
- P7: correctly rejects the false attribution to D and traces the source.
- P8: names the omitted version/permission detail in the transfer example.

These probes mix constructs intentionally for calibration and must not be collapsed into an unvalidated overall “coherence score.” A methods reviewer will freeze the primary endpoint and relevant item set before human data collection. Time, physical plan quality, correction success, and false-authority errors remain separate outcomes.

Response-form template at each state: (a) list all physically feasible plans; (b) name current proposal/version; (c) physically feasible? yes/no/insufficient information, source and reason; (d) authorized under the stipulated rule? yes/no/insufficient information, source and reason; (e) ready? yes/no/insufficient information, required change. Preserve uncertainty answers and explanations. P5 accepts “D has no recorded v2 response” without inferring opposition. P6 requires the new D/v2 event rather than a layout change. P7 requires rejection plus the earlier v1/current-v2 source distinction. P8 requires checking permission's exact target/version; merely saying “ask someone” is incomplete. Independent item review must ratify these examples before human scoring.

## Synthetic check

Run `python3 studies/verify_fixture.py` from the package root. It enumerates 32 specified plan-state combinations and checks physical feasibility, authorization and readiness for four proposals. S3/S4 give an exact readiness-insufficiency counterexample for the route/count summary, not a dynamics or closure result. The additional `capability_summary_counterexample.json` checks four world/request combinations: equal two-kit offers conceal one versus two exclusive batteries, so only one can serve two simultaneous requests. An enriched resource-bound summary distinguishes them within the stated domain. A competent individual with the record can solve that case; no group advantage is stipulated. These checks validate the declared synthetic keys, not either application or human behavior.
