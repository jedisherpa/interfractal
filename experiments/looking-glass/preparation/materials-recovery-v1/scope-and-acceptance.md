# Materials recovery v1 — scope and acceptance

This is the bounded packaging correction authorized in [authority.json](authority.json). It addresses the documented materials-v1 recovery defect: macOS `/var/...` and Node's canonical `/private/var/...` identified the same entry script, but a string comparison skipped the CLI body and returned exit 0 with no output or package. The preserved canonical invocation regenerated candidate 003 correctly. Neither a new approval nor a research-stage advance follows from this correction.

The previous materials delivery at commit `5249115f8f7fd1a39f03e792f933ffaa1a36ef4a` is completed progress. Human materials approval remains pending. The larger preparation-only goal retains all its requirements; this small fix does not replace transfer/scoring/runner preparation, the equivalent instrument, human plans/readiness or the final preparation ZIP. Dependent preparation stays behind the existing materials-review boundary. Both studies remain deferred; Gate 14 remains separate and unapproved.

## Change boundary and invariants

Change only packaging CLI entry detection, command-result verification, related regression evidence, candidate identity/manifests and recovery instructions. Preserve every materials-v1 file and earlier gate artifact. Work in this new revision, without overwriting accepted or failed candidates.

Compare the new candidate directly against `materials-v1/package-candidate-003`: every byte under `research-team/design/`, `participants/` and `transfer-phase-bound/` must match. This includes design, author key, allocation, development/withheld tasks, schemas, prompt templates, proposed settings and participant manifests. No semantic correction or research parameter change is authorized. New tooling and its enclosing manifests may differ; preview content may change only its candidate identity. Record an explicit changed-path inventory and explain every difference. The previous 292-atom key reconciliation is carried forward only because these inputs remain identical; no new research outcome is implied.

## Required independent acceptance evidence

| Check | Required outcome and evidence |
| --- | --- |
| Real direct entry | In a fresh empty staging directory copied from the new packaged tooling and design, build and verify actually execute through canonical absolute paths. Retain commands, runtime version, stdout/stderr, exit status, output inventory and manifest digest. |
| Symlink direct entry | Repeat through a noncanonical symlink path to the same script, including a directory symlink reproducing the original path-identity mismatch. Use a separate fresh destination so an existing package cannot disguise a no-op. The generated package must equal the canonical build byte-for-byte. Declare tested OS/runtime/path forms; do not claim all-platform compatibility. |
| Import has no CLI side effects | Import the module without running its CLI through real and symlink module paths. It must not build, launch verification, print success, exit the host process or create output. The importing program continues normally; compare destination inventory before/after. Exported functions remain usable explicitly. |
| Errors cannot become success | An invalid mode, absent required input, verification of missing/corrupt output and an attempted overwrite return nonzero with useful diagnostics. The overwrite refusal leaves the original inventory and hashes unchanged. Run destructive/corruption probes only in disposable copies. |
| Child exit 0 is insufficient | Exercise the result checker with a deliberately simulated successful exit that emits no success output and creates no package; reject it. Also reject a success-like message with missing or corrupt output. Acceptance requires the expected command result **and** actual complete inventory/manifest/hash verification, never exit status or stdout alone. |
| Exact recovery artifact | Canonical and symlink runs produce the declared new manifest and every expected file, with no undeclared extra or missing output. Verify hashes from actual bytes independently of the child process's claim. A no-op or mismatch must make the supervising command/check fail, not merely log a warning. |
| Historical and material integrity | Rehash frozen prior artifacts and the unchanged material subsets above. Retain failed attempts and negative probes separately. Run the existing bounded package/validator regressions to show this entry correction did not alter their behavior. |

An import returning normally is intentionally a no-op and is not a failure. A requested direct CLI build/verify that silently does nothing is a failure. Keep these two contracts distinct. Assertions should establish effects and bytes, rather than merely whether a particular implementation helper was called.

## Minimal preview check

This correction does not add interface behavior. First prove the preview differs from candidate 003 only in its declared identity, and retain the existing exact-route/private-route denial checks. Then use the supported browser against the new candidate: observe its identity and preparation disclosure; keyboard-open C04, mouse-close it and reload. Verify each intended state, capture the actual viewport and console, and retain two original images (overview and opened C04) for direct inspection. Serialize all eighteen source records for exact comparison with the unchanged world, while explicitly distinguishing that DOM comparison from the one visually opened disclosure. No new visual benefit, comprehensive accessibility or participant-isolation claim follows.

## Disposition

Independent Sol review must inspect the exact packaged candidate, actual recovery outputs, negative tests, invariant comparison and bounded browser evidence before accepting this correction. A pass means the declared recovery defect and false-success check are corrected on the tested paths/runtime. It does not approve the materials for dependent use, complete the wider preparation goal, establish actual research-runner isolation or authorize any model/human research collection. No code implementation, data collection or change to frozen materials is performed by this specification.
