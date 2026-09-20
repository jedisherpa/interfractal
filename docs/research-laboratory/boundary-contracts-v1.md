# Proposed boundary contracts — version 1

These are design contracts, not implemented API schemas. The coordinator checked producer and consumer responsibilities together; independent paired reviews are NOT_RUN. All fields below are required unless called optional. IDs are opaque strings. Time values are UTC instants; precision and canonicalization must be specified in T04. Additive schema changes require explicit version negotiation; unsupported major versions fail visibly.

## BC_RESEARCH_VIEW — research service ↔ Interfractal inspector

**Envelope:** `schemaVersion`, `projectionId`, `sourceRepository`, `sourceRevision`, `studyId`, `roundId`, `configVersion`, `checkpoint`, `generatedAt`, `visibility`, `status`, `limitations`, `evidenceManifest`, `allocations`, `worldviews`, `comparisons`, `jevJudgments`. A checkpoint binds head hash, event count and the export generation. Pagination is fixed to that generation, with an opaque cursor and an explicit complete flag. Reconnecting clients either resume the same generation or restart; they cannot stitch two generations into one apparently complete round.

**Claims:** `claimId`, `worldviewVersionId`, `kind`, `text`, `scope`, `evidenceRefs`, `relationRefs`, `uncertainty`. Scope names assets, candle intervals, history and cutoff. Revisions preserve their parent and reason. Failed agents are status records, never fabricated worldviews. The standard initial barrier needs all four valid initial accounts before the comparison begins.

**Consumer selection:** `(roundId, worldviewVersionId, claimId, replayCursor)` selects the same fact in both views. Layout/camera state is local display data and never part of financial authority. The plain view exposes every substantive field and error the visual view can expose.

**Producer obligation:** validate references and allowed evidence before publishing; provide immutable bytes/hash and source context; redact at projection construction. **Consumer obligation:** validate schema, paging and reference resolution; recompute applicable integrity checks; display missing, stale, unsupported and historically disclosed faults distinctly. Hash consistency does not authenticate the source or establish market truth.

**Failure checks, proposed:** missing page, duplicate page, mixed generation, unknown schema, absent agent, missing claim target, stale result and differing replay selections must remain visible. Existing chain metadata outside its hash coverage cannot be presented as cryptographically verified. New protected envelope metadata needs its own explicitly defined coverage.

## BC_RESEARCH_ACTION — research/proposal service ↔ financial service

**Proposal:** `proposalId`, `origin` (`research` or `manual`), `creatorPrincipal`, `createdAt`, `researchRefs`, `rationale`, `requestedOperation`, `status`. Each research reference binds a specific version/hash. Research-origin proposals need references; manual proposals explicitly record that origin. Narrative text is untrusted display data. It supplies neither permissions nor executable provider fields.

**Intent:** `intentId`, `proposalId`, `accountId`, `sourceWalletId`, `operation`, `assetId`, `networkId`, `quantity`, `feeCeiling`, `expiresAt`, `policyVersion`, `intentDigest`, plus typed operation fields. Orders require product, side, type, exact limit price and time-in-force; transfers require a separately validated destination registry ID and resolved destination terms. A required field that is unknown prevents authorization, not an arbitrary default.

**Authorization:** `authorizationId`, `principalId`, `accountRoleVersion`, `intentDigest`, `policyVersion`, `authorizedAt`, `expiresAt`, `revocationState`, and the real authentication/step-up evidence reference. The server chooses and verifies these values; it never accepts a browser assertion of a role as evidence. Local approval and provider-required approval are different records.

**Dispatch:** durable outbox operation ID, stable provider client/idempotency ID, exact outbound payload digest, reserved amounts and fence generation. Persist before network I/O. Recheck current account authority, limits, policy and expiry while acquiring the reservation and dispatch right. Record the boundary after which revocation can stop future work but cannot promise to undo an already-sent request. Reconcile uncertain sends before any new submission; no newly generated ID on a blind retry.

**Producer obligation:** create proposals without credentials or hidden side effects. **Financial-service obligation:** convert validated proposals into explicit terms, obtain human authorization, enforce independent permissions and preserve exact outcomes. Text, four-agent agreement, Jev results and a research-run permission cannot approve an action.

**Failure checks, proposed:** changed quantity/destination/fee/policy after authorization, expired or replayed approval, revoked role, concurrent overspend, duplicate proposal, lost acknowledgment and stale worker result must not create unauthorized or duplicate actions. A proposal may be declined while the research round still completes.

## BC_FINANCIAL_VIEW — financial service ↔ authenticated Interfractal bridge/view

**Projection:** `schemaVersion`, `principalScope`, `accountAlias`, `projectionId`, `intentId`, `intentDigest`, `authorizedTerms`, `localAuthorizationState`, `providerApprovalState`, `submissionState`, `providerLifecycle`, `rawStatusCode`, `filledQuantity`, `remainingQuantity`, `feeRecords`, `externalReferences`, `observedAt`, `reconciliationState`, `reconciliationCheckpoint`, `allowedActions`, `limitations`. Account-specific fields are filtered server-side. Exact quantities serialize as decimal strings with asset/scale; research score fields have a separate type and label.

**Bridge identity:** a verified production session maps by issuer/subject to a backend principal. The server credential binds issuer, audience, subject, expiry and request context. Backend roles and current policy determine allowed actions. The bridge does not sign provider requests. Secrets, recovery material and raw provider responses are absent from browser bundles, public exports and model inputs.

**Action command:** `intentId`, `intentDigest`, `commandId`, expected revision and an explicit command type. Backend authorization and optimistic concurrency are authoritative. A stale revision returns a conflict and refreshed terms; it does not silently approve new terms. Retry of a browser command reuses its ID. Approval errors preserve form context and explain the actual state.

**Producer obligation:** publish attributable, fresh-or-stale states and only permitted data; continue reconciliation after disconnects. **Consumer obligation:** show submission uncertainty, pending provider approval, partial fill, cancel requested and reconciliation discrepancies plainly. Do not collapse them into success/failure or an animated completion state. Validate the origin of provider approval links against configured Prime hosts before rendering them.

**Failure checks, proposed:** anonymous request, development identity, another account's ID, expired bridge token, revoked role, cached privileged projection, cross-origin mutation, browser refresh, disconnect during submit, delayed provider event and reordered updates. Sensitive projections use private/no-store transport and must be evicted from local view state on sign-out or account change. Visual and plain views apply identical permission and freshness rules.
