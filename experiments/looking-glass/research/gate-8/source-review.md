# Gate 8 source review: finite indistinguishable worlds and revealing observations

Accessed 2026-09-20 in America/Denver (2026-09-20T07:49:27Z). Collector: GPT-5.6 Luna via read-only web source inspection. This is a bounded software/mathematical benchmark source pass. It supports the design of finite candidate worlds, finite intervention menus, linear rank/nullspace checks, query selection, and numerical reporting. It is not a human study, a camera-rendering validation, or evidence that a viewer understands or benefits from the instrument. Exact source metadata and URLs are in [`sources.json`](sources.json).

## Source-grounded design implications

### 1. Treat indistinguishability as an observation-map property

R. E. Kalman, “On the General Theory of Control Systems,” *Proceedings of the First IFAC Congress on Automatic Control*, 1960, pp. 481–492. The primary paper is available as a [readable PDF](https://www.control.utoronto.ca/~broucke/ece557f/kalman.pdf) and has the publisher record [DOI 10.1016/S1474-6670(17)70094-8](https://doi.org/10.1016/S1474-6670(17)70094-8).

For a linear state/observation model, stack the rows supplied by the permitted observation sequence into an observation matrix `H_U`. A state difference `Δx` is invisible under menu `U` when `H_U Δx = 0`; the nullspace is the set of perturbations that the supplied observations cannot distinguish. Full column rank is therefore a conditional recovery claim for the declared model and menu, not recovery from an arbitrary image. For a finite candidate family `W`, use the exact forward map directly: candidates `w_i` and `w_k` are equivalent under `U` only when their predicted observation vectors are exactly equal for every permitted intervention. A floating-point tolerance can diagnose near-collisions, but “within tolerance” is generally nontransitive and must not be used to construct equivalence classes. A rank increase after adding an intervention can reveal a continuous direction, while a finite candidate family may become separable even when the full state space remains rank-deficient; report those claims separately.

Applied to Gate 8, the 4D hidden-sign case should preserve the restricted menu and show its nonzero nullspace or an equivalent candidate collision, then add one named intervention whose predicted outputs split the pair. The 5D case should retain the two independent hidden signs and test whether the menu separates all four sign combinations, with the stacked rank and the pairwise finite separation table both recorded. These are model-level statements only.

### 2. Compute rank and nullspace with a declared numerical rule

G. H. Golub and W. Kahan, “Calculating the Singular Values and Pseudo-Inverse of a Matrix,” *Journal of the Society for Industrial and Applied Mathematics Series B: Numerical Analysis* 2(2), 205–224 (1965), [SIAM record and DOI 10.1137/0702016](https://epubs.siam.org/doi/10.1137/0702016). The paper presents a numerically stable SVD route and uses the pseudoinverse for least-squares problems.

For a floating-point implementation, Gate 8 may use the paper’s SVD/pseudoinverse approach as a numerical audit: expose the singular-value spectrum, chosen numerical-rank threshold, nullspace basis, and reconstruction residuals. The quarter-turn benchmark maps can instead be checked with exact rational arithmetic, which should remain the authoritative rank/nullspace and candidate-equality result. Exact symbolic rank and floating-point numerical rank must be labeled separately. A near-zero singular value is not an exact zero: if floating diagnostics are used, choose and freeze absolute/relative thresholds and report sensitivity when a case is close to the threshold. This is especially important for the rounding-collision case: retain raw predicted values, the display quantization/rounding rule, and the displayed values as separate fields. A collision after display rounding is a display-information loss; it must not be silently treated as a raw-model collision.

### 3. Choose a finite query from remaining candidate disagreement

David A. Cohn, Les E. Atlas, and Richard E. Ladner, “Improving Generalization with Active Learning,” *Machine Learning* 15(2), 201–221 (1994), pp. 201–221, [open primary PDF](https://storm.cis.fordham.edu/~gweiss/selected-papers/cohn94.pdf) and [DOI 10.1023/A:1022673506211](https://doi.org/10.1023/A:1022673506211). Their selective-sampling formulation lets the learner query an oracle in a region of uncertainty and update the version space; the paper is an algorithmic active-learning result, not a human-participant result.

For Gate 8, make the candidate family `W` and intervention menu `U` finite and frozen. For each candidate pair, record the set of menu interventions whose predicted outputs differ under the exact forward map, with any tolerance-based near-separation retained as a diagnostic. A query is useful only if it partitions the currently surviving candidates; choose a deterministic tie-break rule such as maximizing the worst-case split or expected remaining-candidate reduction, and log the candidate set before and after the query. If no permitted intervention splits a surviving pair under exact outputs, mark the pair observationally equivalent under the menu and stop rather than selecting a visually suggestive action. An outside-menu intervention can be preserved as a labeled witness that the broader model has a separator, but it cannot change the restricted-menu result.

## Gate 8 fixture requirements

1. Freeze a manifest containing candidate IDs, exact model parameters, allowed interventions, observation coordinates, raw-output precision, display-rounding rule, diagnostic τ for numerical separation, and the expected exact-equality classes before execution. Keep a reference implementation of the forward map separate from the display projection. Do not form equivalence classes from pairwise “within τ” comparisons.

2. For the 4D and 5D cases, report both (a) the rank/nullspace of the stacked linear observation map and (b) finite pairwise candidate separation. Include a negative restricted-menu case and a named revealing intervention. Do not infer a physical extra dimension, human comprehension, or general image reconstruction from a passing check.

3. For shifted balls, enumerate the restricted slice menu. If two candidates have exactly identical permitted outputs for every menu entry under the exact forward map, record them as equivalent under that menu. Preserve near-equality as a diagnostic only. Preserve the labeled outside-menu witness separately and state that it is out of scope for the restricted claim.

4. For the rounding collision, compare raw and displayed outputs independently. Preserve enough digits to reproduce the raw comparison, and state whether the collision is exact, tolerance-level, or introduced only by display rounding.

5. A passing Gate 8 result can establish only that the frozen finite benchmark and declared numerical checks distinguish the specified candidates under the specified interventions. It does not establish arbitrary-image identifiability, camera/rendering validity, human understanding, usefulness, or any social interpretation.

## Source boundary

Kalman supplies the observability/rank/nullspace framing; Golub–Kahan supplies an optional numerical SVD/pseudoinverse audit method when floating arithmetic is used; and Cohn–Atlas–Ladner supplies the query-from-uncertainty design pattern. The exact-rational candidate manifest, diagnostic tolerance policy, display-rounding ledger, pairwise separation table, and outside-menu boundary are application requirements derived for this benchmark. None of the sources validates Looking Glass, its rendering, its candidate worlds, or any human outcome.
