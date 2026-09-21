# Gate 7 source review

Access date: 2026-09-20 (America/Denver). Collector: GPT-5.6 Luna via web search and read-only source inspection.

Gate 7 is the approved, bounded question: can a frozen instrument support interpretation of a small set of unfamiliar geometric and reference/scale cases, including cases where the available view is insufficient? The sources below support evaluation design choices only. They are not evidence that the Looking Glass instrument works, that a viewer will understand it, or that any geometry has social or emergent meaning. No human participants or results are present in this gate.

## Sources and narrow implications

### 1. Separate task/data interpretation from the rendering claim

Tamara Munzner, “A Nested Model for Visualization Design and Validation,” *IEEE Transactions on Visualization and Computer Graphics* 15(6), 921–928 (2009). Primary framework paper; open author page and PDF: [paper page](https://www.cs.ubc.ca/labs/imager/tr/2009/NestedModel/) and [PDF](https://www.cs.ubc.ca/labs/imager/tr/2009/NestedModel/NestedModel.pdf).

Munzner separates four levels: domain task/data characterization, abstract operations/data types, visual encoding/interaction, and implementation. She treats upstream mistakes as threats that cascade into downstream validation. For Gate 7, this supports writing each case in explicit task language, declaring the answer key and permissible “insufficient information” answer before inspection, and reporting case-answer correctness separately from replay/rendering checks. It also supports stating what a case does not test: a correct browser replay cannot establish correct interpretation by a person.

This is methodological guidance from a framework; it contains no evidence about Looking Glass, its cases, or human performance in this project.

### 2. Choose measures from the evaluation question and keep outcomes distinct

Heidi Lam, Enrico Bertini, Petra Isenberg, Catherine Plaisant, and Sheelagh Carpendale, “Seven Guiding Scenarios for Information Visualization Evaluation,” University of Calgary Technical Report 2011-992-04 (2011; later IEEE TVCG version 2012). Primary survey/framework paper based on a coded literature review; open author PDF: [technical report PDF](https://petra.isenberg.cc/publications/papers/Lam_2011_SGS.pdf). The later journal record is [DOI 10.1109/TVCG.2011.279](https://doi.org/10.1109/TVCG.2011.279).

The paper distinguishes evaluation goals such as visual data analysis and reasoning, user performance, user experience, communication, and automated evaluation. It recommends setting the goal first, mapping it to an evaluation scenario, and then choosing measures and analysis. For Gate 7, use a compact outcome ledger: (a) answer-key correctness, including correct rejection of an unsupported conclusion; (b) evidence/recovery completeness; (c) route or interaction observations; and, only if people are later authorized, (d) actual human observations. Do not fold these into one “understanding” score. A frozen case packet can establish answer-key and evidence-accounting behavior of the instrument; it cannot supply human-performance data.

The authors explicitly describe this as guidance for selecting an approach from evaluation goals, not as a result about this instrument.

### 3. Match the information, task demands, and condition while controlling practice/order

Sriram Karthik Badam and Niklas Elmqvist, “Effects of Screen-Responsive Visualization on Data Comprehension,” *Information Visualization* 20(4), 229–244 (2021), [DOI 10.1177/14738716211038614](https://doi.org/10.1177/14738716211038614), with an open publisher page [article](https://journals.sagepub.com/doi/10.1177/14738716211038614).

This is a primary two-study visualization evaluation. The controlled study used matched statement types and data types across interfaces, piloted statement correctness and comprehensibility, trained participants, assigned randomized statement sets, and counterbalanced interface order. It measured correctness, completion time, and replay count. The companion practical study used a different, more open-ended goal rather than pretending that the controlled measures covered it. The authors report that correctness and time can separate, and that a controlled low-level task and a practical high-level task answer different questions.

For a future human extension of Gate 7, keep the underlying case facts, answer rules, item difficulty, and requested response format matched across visual conditions; randomize or counterbalance condition and case order; log practice/tutorial exposure and replay opportunity; and analyze correctness separately from time, interactions, and explanation. For the currently approved instrument-only gate, these are design requirements and audit fields, not measured participant effects. The study’s findings do not transfer automatically to Looking Glass or to unfamiliar geometric cases.

## Gate 7 recommendations

1. Freeze a small case manifest before any interpretation run. Each case should have a stable ID, task wording, source/input IDs, expected answer, acceptable equivalent answers, required evidence, and a keyed `insufficient_information` outcome. Keep the answer key separate from the display and run it through an independent consistency check.

2. Use at least one held-out unfamiliar case per declared task family: a geometric relation/recovery question, a reference/scale question, and a misleading or unsupported relation. Include a case where the correct conclusion is that the supplied view cannot determine the answer. Do not turn a plausible visual cue into a keyed fact unless the source record and rule support it.

3. Score three layers independently: answer-key correctness; recoverability of the source, dependency, reference, and unknown fields used to justify the answer; and the actual interaction/replay trace. A locally correct answer with missing or invented support is a different failure from a wrong answer with complete evidence recovery.

4. Record condition/task information even when no human study occurs: case version, display mode, available controls, starting state, tutorial/practice exposure, order, replay allowance, and any information hidden by the condition. If humans are later authorized, use matched facts and counterbalanced/randomized order, then report any practice/order imbalance rather than treating repeated exposure as neutral.

5. Stop the conclusion at the strongest supported level. A passing frozen run can show that this instrument presents and scores its declared cases consistently, subject to the audit. It cannot show human comprehension, general visualization benefit, transfer beyond the tested cases, social coordination, emergence, or efficacy.

## Source boundary

These sources support evaluation framing and controls for matched tasks, separate outcomes, unfamiliar cases, training exposure, and order effects. They do not validate the Gate 7 case answers, geometric model, reference semantics, UI, or any human or social claim. Gate 7 should therefore end with a bounded instrument conclusion and preserved unresolved cases; any human interpretation study is a separate future authorization.
