# R1 — Mathematical modeling and dynamical systems

**Remit.** Specify testable models of differentiated collective capability, multiscale participation, and useful geometric representation. This is an independent AI research analysis, not expert endorsement or human attestation. The frozen shared brief and the supplied collective-capability draft govern interpretation. No empirical study or repository execution was performed.

## 1. [USER INTENT → DESIGN] Model coordination around tasks, without making agreement the target

Paul’s “convergence” is the formation of a usable capability while differences persist. The minimum model should therefore contain a task, heterogeneous contributions, interactions, actions, and feedback. It need not contain a sphere or a scalar “coherence score.”

Use discrete event time and a controlled stochastic system:

\[
X_{t+1}\sim P_\theta(\cdot\mid X_t,u_t),\qquad o_t=O(X_t).
\]

Here \(t\) counts recorded events; \(u_t\) is an external request or perturbation; \(X_t\) contains task-relevant participant reports, resource availability, action assignments, unresolved constraints, communication structure, and current rules; \(o_t\) contains observed outputs. \(\theta\) denotes fitted behavioral parameters, not a hidden essence of the group. The Markov assumption is provisional: retain relevant history or use a history-dependent model if the recorded state does not predict adequately.

| Variable | Measurement and distinction |
|---|---|
| \(n\) | Number of participants; separate from number of roles or lenses |
| \(d\) | Number of specified task variables per participant; units and coding rules declared individually |
| \(A_{ij,t}\) | Directed communication opportunity or observed message relation; choose one definition |
| \(H_t\) | Recorded group interactions, represented as sets of participants |
| \(F_{ij,t}\) | Self-reported affinity; not inferred from geometry or message frequency |
| \(I_{ij,t}\) | Estimated influence on a specified response; observational association unless intervention identifies causation |
| \(R_t\) | Recognized decision rights, scope, and expiry; separate from influence |
| \(Q_t,C_t,T_t\) | Task quality, resource cost, and completion time |
| \(D_t\) | Differences in explicitly comparable judgments; retain original contributions alongside this summary |

“Individual coherence” can initially mean reliable fulfillment and revision of a particular interface—for example, accurately declaring capacity and updating it when circumstances change. It is relational and task-specific. No psychological unity scale is required, and participation may improve this reliability.

**Falsifiable claim:** a specified coordination procedure improves held-out task performance or recovery while preserving the recoverability of substantive differences. Compare against the best individual, pooled independent work, and an ordinary coordinated group, with information, time, and resource accounting explicit. Exceeding an isolated person’s information access is a capability gain, but does not by itself establish a distinctive mechanism.

## 2. [FACT → HYPOTHESIS] A group becomes a useful unit when its compressed description predicts its interaction with other units

State-space compression provides a relevant formal precedent: select a high-level description for specified observables, prediction accuracy, and computational cost. Its authors explicitly make the costs problem-dependent. This supports asking which description works, rather than choosing an organizational scale from appearance. It does not establish collective personhood. [Wolpert et al., §§2, 5–7](https://arxiv.org/pdf/1409.7403).

Our proposed group interface is \(Y_g=\pi_g(X_g)\): a versioned record of available capabilities, deliverables, constraints, response latency, uncertainty, and unresolved dependencies. An exact controlled coarse model requires that whenever \(\pi_g(x)=\pi_g(x')\),

\[
P(\pi_g(X_{t+1})=y'\mid x,u)
=P(\pi_g(X_{t+1})=y'\mid x',u)
\]

for all admissible external inputs \(u\) and macro outcomes \(y'\). This condition ensures that omitted internal differences do not change the next macrostate distribution. Empirically, seek an approximate version over a declared task and intervention range; do not demand universality.

For example, “capacity: five tasks” is an inadequate interface if the five tasks all depend on one unavailable specialist. Adding a dependency flag may repair it. Compare a compact interface against both a naive average and the full internal record, evaluating held-out prediction error, communication burden, and worst-case failure on important constraints.

**Falsifiable claim:** the augmented interface predicts response to new external requests within a preregistered error tolerance at lower coordination cost. Repeated failures caused by hidden internal differences reject that compression, not the entire multiscale ambition. Recursive grouping advances only where this test works. Groups can overlap; a strict tree must not be assumed when people contribute to several groups.

## 3. [FACT → DESIGN] Stability, synchronization, and useful coordination are different observables

Arenas and colleagues show that transient synchronization in a specified oscillator model can reveal network community scales. Their phases have defined dynamics; their result is not evidence that opinions must synchronize or that every group develops through those scales. [Arenas et al., equations 1–3](https://arxiv.org/pdf/cond-mat/0511730).

For actual periodic behavior, a synchronization statistic such as \(r=|n^{-1}\sum_i e^{i\phi_i}|\) is meaningful when \(\phi_i\) is measured cycle phase. It is inappropriate to label arbitrary text embeddings “phases” without a measurement model. Two alternating workers can produce steady output with low instantaneous phase alignment. Conversely, synchronized repetition of a wrong instruction can score highly while failing the task.

Define a viable capability region \(K\) by explicit performance and constraint thresholds. Measure dwell time in \(K\), recovery time after specified shocks, failure probability, and switching between effective role arrangements. A stable equilibrium is one special possibility; a functioning workflow can instead be periodic or continually adapting. In finite observations, call a state **operationally metastable** only under a declared residence-time and transition criterion. Long residence alone might reflect inertia or coercion.

Coordination dynamics offers useful mechanisms and experimentally anchored examples of switching patterns, but motor-coordination evidence does not transfer automatically to institutions. [Haken, Kelso and Bunz](https://link.springer.com/article/10.1007/BF00336922). The research opportunity is to test whether correction channels and role substitution increase recovery without destroying dependable commitments. Stewardship becomes observable maintenance work: detecting degradation, repairing dependencies, preserving memory, and arranging succession.

## 4. [FACT → DESIGN] Hypergraphs can represent genuinely joint work; a polyhedron does not establish it

A graph records pairwise relations. A hyperedge can record one interaction involving three or more participants without asserting that all subsets interacted separately. An abstract simplicial complex is closed under taking subsets; a filled triangle therefore includes its three edges. Use that stronger structure only when the interpretation warrants it. Three pairwise meetings and one joint meeting can have the same projected graph while carrying different information.

Higher-order contagion models show that group terms can change the dynamics, including producing bistability under specified assumptions. They motivate testing higher-order effects; contagion is not a proxy for collaborative competence. [Iacopini et al.](https://arxiv.org/pdf/1810.07031).

Fit a pairwise model first, then test whether recorded joint interactions improve held-out prediction beyond pairwise exposure, shared context, and extra communication time. A third participant may supply a missing constraint only in a joint discussion; alternatively, the apparent triple effect may simply reflect more minutes spent together. This distinguishes a substantive mechanism from a denser picture.

An \((n-1)\)-simplex has \(n\) affinely independent vertices. That is a definition, not a law that \(n\) people possess \(n-1\) psychological dimensions. Five participants do not require four-dimensional display space. Drawing participants at polyhedron vertices assigns a layout; its edges acquire operational meaning only through an explicit mapping to relationships.

## 5. [FACT → DESIGN] The geometric vocabulary can become a disciplined family of views

| Representation | Legitimate candidate meaning | What must be established |
|---|---|---|
| Point | One currently selected state or compressed group interface | Its coordinates, version, and expandable internal record |
| Network/polyhedron | Relations or a spatial layout of participants/contributions | What each edge, face, distance, and center encodes |
| Loop, \(S^1\) | A cycle phase or closed trajectory | Actual recurrence and the meaning of identifying its endpoints |
| Sphere, \(S^2\) | A normalized direction with two intrinsic degrees of freedom | Measured variables, normalization, and whether opposite directions differ |
| Torus, \(T^2=S^1\times S^1\) | Two independent cyclic coordinates | Evidence that each coordinate is periodic and their combination requires two degrees of freedom |
| Hopf map, \(S^3\to S^2\) | A precise quotient with circle fibers | A defined state space and an empirically defensible equivalence relation |

A sphere surface and torus surface are both intrinsically two-dimensional; neither signifies a higher organizational level. Display dimension, intrinsic state dimension, hierarchy depth, elapsed time, and visual detail are separate quantities. A feedback diagram drawn as a loop does not prove that observed trajectories are closed.

For the standard complex-coordinate Hopf map,

\[
h(z_1,z_2)=(2\Re(z_1\bar z_2),2\Im(z_1\bar z_2),|z_1|^2-|z_2|^2),
\quad |z_1|^2+|z_2|^2=1,
\]

common phase multiplication leaves the image unchanged. The domain has three intrinsic dimensions; the base has two; fibers are circles. The total space is not globally the product \(S^2\times S^1\). Lyons supplies an accessible mathematical derivation, including fibers and stereographic projection. [Lyons, pp. 2, 10–13](https://nilesjohnson.net/hopf-articles/Lyons_Elem-intro-Hopf-fibration.pdf).

**Proof obligation:** specify what real-world differences may legitimately be quotiented out, then prove that the selected observables are invariant. A permission change or substantive objection cannot be declared an irrelevant phase because the picture looks coherent. A many-to-one map alone cannot recover the original internal state; retain a residual record and provenance. This gives geometry useful work: showing shared expression, hidden alternatives, and the cost of changing the representation.

## 6. [FACT / UNRESOLVED] Geometry cannot identify legitimate authority or a privileged group size

The strongest counterexample is constructive. Place the same participants at the same coordinates, with identical communication, observed actions, and task performance. In institution A, a central participant holds an explicit, revocable mandate. In institution B, nobody authorized that person to bind others. Every geometric statistic and observed performance score can be identical while recognized authority differs. Therefore neither authority nor its legitimacy is identifiable from those variables alone. Add the governing agreement and its history as independent evidence.

Likewise, a central node can be a reference document, facilitator, bottleneck, or leader. Centrality does not decide which. Study leadership as several separable functions: proposing direction, influencing uptake, maintaining coordination, deciding within a mandate, and representing the group outwardly. These can coincide or be distributed.

Retain **3, 4, and 5** as small comparison sizes and **12** as a larger stress case, following Paul’s correction. None is a ceiling or a predicted transition. Retain **eight aspects** and **twelve lenses** only as versioned candidate schemes pending comparison with self-authored contributions and alternative framings. Permit multiple lenses per person and contributions outside every preset lens. The mathematical program removes their status as fixed assumptions; it does not silently replace their content. Sample size for eventual human inference remains unresolved and needs a variance/power argument, not a polyhedron.

## 7. [HYPOTHESIS → DESIGN] First executable program and meaningful gates

Start with a finite, fully specified coordination benchmark: participants hold different constraints for a small resource-allocation task; some solutions require complementary resources, and later messages change availability. The environment checks feasibility, quality, and cost. Simulated policies should include independent pooling, centralized coordination, distributed coordination, and a revisable group interface. Centralized coordination is a substantive comparator, not a presumed failure case.

1. **Specification gate.** Define state variables, task scoring, information access, communication budgets, mandates, and perturbations before fitting. Enumerate a tiny instance. Advance when two independent implementations could agree on its transition and scoring rules. Stop if “coherence” remains the only success criterion.
2. **Capability gate.** Compare policies on held-out instances and shocks; report quality, cost, constraint violations, recovery time, and missing contributions separately. Advance a mechanism only if its gain survives matched-resource comparisons. Simulated gains establish model behavior, not human effectiveness.
3. **Compression gate.** Exhibit two microstates with one macrostate and test the closure condition above. Repair the summary when predictions diverge. Advance a group-as-unit representation only within its demonstrated input range; retain uncertainty when evidence is thin.
4. **Interaction gate.** Add joint interactions only when they explain failures of the pairwise model or improve held-out prediction after accounting for model complexity. Otherwise keep the simpler operational graph and retain joint meeting records for future analysis.
5. **Representation gate.** Hold protocol and underlying data fixed while comparing a plain interface with geometric views. A future human study should measure retrieval of disagreement, understanding of commitments, and transfer to an unfamiliar task. Geometry advances if it improves a prespecified outcome without materially degrading the others. No recruitment is authorized by this memo.

Before empirical work, choose decision-relevant tolerances and minimum worthwhile effects with Paul; the current evidence cannot supply universal percentages. Preserve failures as counterexamples in the visualizer: identical outward summaries with different dependencies; synchronized failure; useful alternating coordination; and lawful versus unmandated central action. These make the ambition inspectable rather than merely attractive.

## Source status and open questions

All linked sources were accessed on **2026-09-19**. Wolpert, Arenas, Iacopini, and Lyons were available as full-text PDFs; the findings above rely on inspected relevant passages. Wolpert is an arXiv theoretical report. Arenas and Iacopini are author manuscripts of published primary modeling research. Lyons is mathematical exposition. Haken–Kelso–Bunz was accessible at publisher abstract/metadata level; no full-text verification is claimed. None directly validates Paul’s institutional framework. The supplied draft was read through its local text extraction, especially its temporal framework, Hopf construction, proposed studies, and elementary counterexample.

Unresolved questions include which tasks require durable group identity, whether individuals can maintain several compatible group interfaces, how goals themselves become revisable state variables, and what measurement captures influence without confusing it with affinity or authority. The first decisive result should be a demonstrated capability mechanism plus a tested compression boundary—not a claim that every collective has one topology.
