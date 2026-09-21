# BTC-Learning implementation guide — revision 1

All tickets are proposed. No issue, assignment, schedule or execution order has been dispatched. Requirements R1–R16 are the accepted brief's requirement map, summarized in [plan-index-v1.json](plan-index-v1.json). Dependencies are technical prerequisites; account-specific conditions remain explicit. BTC paths refer to the private BTC-Learning repository; Interfractal paths refer to this repository. A path marked proposed does not yet exist as an implementation.

Every ticket inherits the contracts' schema/version rules, server-side permissions, redacted logging and honest incomplete/stale states. Every acceptance check below is NOT_RUN. Unit and contract tests establish software behavior; provider tests establish only their stated environment; actual operations and research-effectiveness claims need separate evidence.

## T01 — Verify the complete Prime capability path

R6–R10, R16. Dependencies: none. Condition: U1, U6.

Produce a capability matrix for the selected Prime account covering portfolio ownership, product/order types, wallets, deposits, signing responsibilities, approvals, internal transfers, Bitcoin withdrawals, status lookup and recovery. Start with the official sources and a paper lost-acknowledgment/partial-fill/transfer walkthrough. Proposed BTC path: `docs/finance/prime-capabilities.md`. No account credentials enter the artifact.

Acceptance: every required capability has a supported route, permission, external identifier and completion/recovery evidence. Record idempotency scope/retention and lookup limitations. An unsupported required route blocks the corresponding dispatch implementation; present the concrete gap before changing provider or scope.

## T02 — Define deployment identity and service isolation

R9, R14, R16. Dependencies: none. Condition: U2.

Trace a real Interfractal session to an account-scoped BTC principal. Observed Interfractal paths: `src/lib/auth/server.ts`, `verify.server.ts`; observed BTC path: `server/_core/trpc.ts`. Proposed: Interfractal `src/lib/laboratory/bridge.server.ts`; BTC `server/laboratory/principal.ts`, separate research and financial process entry points and deployment documentation. Select actual worker host/storage without assuming Vercel preview configuration is production authority.

Acceptance: documented issuer/audience/subject verification, rotation and revocation path; no preview/development identity can dispatch; research and finance have distinct grants and secrets. A deployment restart cannot erase durable jobs or accepted financial intents. Identity failures are explicit and recoverable through sign-in, not role fallback.

## T03 — Acquire and freeze the accepted market grid

R2, R3, R12. Dependencies: none. Condition: U3.

Extend observed BTC `server/collective/liveMarket.ts` and snapshot patterns through proposed `server/research/evidence/`. Preserve provider attribution and raw responses; normalize exact values, timestamp scope, missing bars and incomplete intervals. Two feeds cover the shared subset; supplements rotate through explicit manifests. Add bounded paging, backoff and cancellation for acquisition.

Acceptance: each of the 24 asset/provider/scale combinations reports actual versus requested coverage. A cutoff violation, overlapping page, out-of-order candle or unavailable pair cannot masquerade as complete input. Hashes reconstruct all allocations; no credentialed trading endpoint is involved in research acquisition. Missing data reports include the next useful action.

## T04 — Add versioned research records and an outbox

R1, R5, R11, R12. Dependencies: T02, T03.

Add the proposed research table families from the plan to BTC's observed Drizzle/MySQL environment. Proposed paths: `drizzle/research-schema.ts`, `shared/research/contracts.ts`, `server/research/store.ts`. Define canonical serialization, full request/evidence digests, opaque IDs and referential constraints. Use additive migrations; preserve old study rows and hash-chain bytes.

Acceptance: transactionally save record plus outbox event; reject dangling claims, mixed round versions and duplicate logical jobs. A failed write/restart can resume without fabricated success. Legacy scores retain their units and historical configurations. Publishable and private projection schemas cannot accidentally include each other's fields.

## T05 — Run four durable independent initial accounts

R1, R2, R12, R16. Dependencies: T04.

Replace the new worldview path's all-or-nothing jury reuse with per-agent jobs, leased attempts and a four-account barrier. Reuse observed invocation/provider accounting patterns; proposed BTC paths: `server/research/worker.ts`, `agent-attempts.ts`. Existing `juryRunner.ts` remains the evidence for partial-row retry risk; do not silently change historical study meaning.

Acceptance: terminate a worker between each persistence step; resume only missing logical work, retain charged failed attempts and fence late results. Validate every agent's input against its frozen allocation. Missing agents keep the standard round incomplete. A deadline prevents new calls while eventual receipts remain recorded.

## T06 — Represent worldviews, disagreement and revisions

R1, R11, R15. Dependencies: T04, T05.

Implement observation/interpretation/relationship/uncertainty schemas and immutable parent-linked revisions. Proposed BTC: `shared/research/worldview.ts`, `server/research/comparison.ts`. Record first peer exposure, union evidence and supporting/opposing accounts. Preserve different scopes and unanswered questions instead of forcing consensus.

Acceptance: one round can finish with candidate findings and no prediction. A revision reconstructs its initial account and newly available evidence. Unsupported references are rejected; unsupported claims are visible as such. No record claims to expose hidden model reasoning or treats correlations as established causes.

## T07 — Add the post-freeze Jev adapter

R4, R12, R15. Dependencies: T06. Condition: U7.

Proposed BTC `server/research/jev.ts` and `shared/research/judgment.ts`. Use version-pinned, bounded text/JSON inputs, versioned typed rubrics and explicit insufficient-evidence outcomes. Perform exact numeric/time computations in code. Store request, response, model version, usage and error provenance.

Acceptance: no call compares peer accounts before the barrier; invalid/unknown returned shapes fail visibly; timeout and quota failure preserve initial accounts. An upgrade requires a new evaluated version. Confidence is labeled as a machine judgment statistic, never a trade permission or market-success probability. Research input disclosure follows the configured provider policy.

## T08 — Integrate comparison and measurable round completion

R1, R4, R12, R15. Dependencies: T05, T06, T07. Condition: U3.

Proposed BTC `server/research/round-orchestrator.ts`. Drive evidence → four initial accounts → Jev-assisted comparison → revisions/candidate findings through durable states. Keep five clocks distinct and configure a candidate total reasoning deadline. Record all model/agent costs and failure paths.

Acceptance: a round reports complete only when required outputs and references exist; timeout, stopped, partial and Jev-unavailable remain distinct. A restarted browser cannot restart charged jobs. Compare actual coverage, elapsed time and cost with the adopted run ceiling; report when the candidate ten-minute budget is infeasible.

## T09 — Publish the research-view contract

R5, R11, R14, R16. Dependencies: T02, T04, T06.

Implement BC_RESEARCH_VIEW with pinned generation/cursors and schema negotiation. Reuse observed BTC `shared/ledger/chainExport.ts`, `verifyExport.ts` and documented public read-side behavior for historical records. Proposed BTC `server/research/projections.ts`; Interfractal `src/lib/laboratory/research-client.ts`. Preserve verifier semantics and declared historical faults.

Acceptance: mixed-generation pages, missing sequences, unknown schema and missing claims cannot pass as a complete view. Financial data is absent before export serialization. A verified hash is described with its actual coverage and source limits. Reloads restore a consistent checkpoint or explicitly restart the export.

## T10 — Connect Looking Glass and the plain inspector

R5, R13, R14. Dependencies: T08, T09. Condition: U4.

Use the imported laboratory as a pinned source/reference and add the production adapter separately. Proposed Interfractal `src/routes/laboratory.tsx`, `src/components/laboratory/`, `src/lib/laboratory/view-state.ts`. Preserve the teaching route. Select claims, sources, agent versions and replay steps by contract IDs; camera/layout is display state only.

Acceptance: an actual collective round shows all four initial accounts, allocations, dissent, revisions and Jev labels in both views. Keyboard and reduced-motion use can reach equivalent information. Missing/unsupported records and stale projections remain visible. A mock adapter or standalone historical replay does not complete this ticket.

## T11 — Establish exact financial storage and reservations

R6–R11, R16. Dependencies: T01, T02, T04. Condition: U1.

Proposed BTC `drizzle/finance-schema.ts`, `shared/finance/amount.ts`, `server/finance/journal.ts`, `reservations.ts`. Use separately permissioned financial storage, exact amounts/scale, immutable intents, balanced postings, provider inbox and transactional outbox. Historical research score storage remains separate.

Acceptance: repeated provider events cannot post twice; each asset's journal balances; amount/scale/rounding validation is exact; concurrent intents cannot over-reserve available funds. Restart and transaction failure preserve intent identity. Reconciliation discrepancies block new affected dispatches and never erase original entries; corrections use explicit adjusting entries.

## T12 — Add proposals and exact human authorization

R6, R8–R10, R13. Dependencies: T06, T11. Condition: U5, U6.

Implement BC_RESEARCH_ACTION in proposed BTC `server/finance/intents.ts`, `policy.ts`, `authorizations.ts`. Manual proposals are permitted and labeled; no automated strategy is inferred. Terms include exact account, quantity, destination/network, fee ceiling and expiry. Adopt explicit roles, limits and policies before dispatch activation.

Acceptance: changed terms, stale roles, replayed approval, expired intent or an unapproved destination are rejected at dispatch. A proposal does not submit anything. The authorizer sees the same digest-bound terms enforced by the backend; error recovery preserves the proposal and requires renewed approval only when its material terms change.

## T13 — Integrate Prime order lifecycle

R6, R9, R10, R16. Dependencies: T11, T12. Condition: U1, U6.

Proposed BTC `server/finance/prime/orders.ts`, `submission-worker.ts`. Implement BTC/USD limit order submission, retrieval, fills and cancellation against the documented route. Persist the client order ID and outbound payload before dispatch. Maintain local submission state independently of provider order status and reconciliation.

Acceptance: deterministic and provider-supported checks cover rejection, acknowledgment loss, duplicate worker delivery, partial fill, cancel/fill race and restart. Uncertain submissions retain reservations and trigger lookup/reconciliation; never create a new order ID merely to retry. An API acknowledgment is not a filled order. Record the evidence level actually achieved.

## T14 — Integrate custody and wallet operations

R7, R9, R10, R16. Dependencies: T01, T11, T12. Condition: U1, U6.

Proposed BTC `server/finance/prime/wallets.ts`, `custody.ts`, `wallet-registry.ts`. Implement the selected provider custody arrangement, wallet discovery/provisioning where supported, receiving, balances, signing/approval responsibility and recovery. Network and asset are explicit registry identities. Credentials remain in the financial service's secret store.

Acceptance: permitted users can identify and use the selected wallet, validate receiving details, inspect transactions and recover authorized access through the documented custody process. Another account's wallet cannot be selected by changing an ID. A saved address, credential-vault entry or simulated signature alone does not establish complete custody/wallet handling.

## T15 — Integrate internal and Bitcoin-network transfers

R8–R10, R16. Dependencies: T12, T14. Condition: U1, U6.

Proposed BTC `server/finance/prime/transfers.ts`. Implement supported internal routes and permitted Bitcoin-network withdrawal/receiving paths with stable idempotency identity. Store provider transaction/activity IDs, additional provider approval state, fees and completion evidence. Validate destination type, network and allowlist against authorized terms.

Acceptance: wrong network, changed destination, fee over ceiling, duplicate request, provider approval delay and lost acknowledgment have explicit safe states. Confirmed completion follows provider/network policy, not HTTP success. Recovery checks establish whether an unknown transfer exists before another is sent; no reversal is presumed for completed transfers.

## T16 — Reconcile and present financial outcomes

R6–R10, R13, R14. Dependencies: T10, T13, T14, T15.

Proposed BTC `server/finance/reconcile.ts`, `projections.ts`; Interfractal `src/components/laboratory/action-inspector.tsx`. Implement BC_FINANCIAL_VIEW, periodic full reconciliation and duplicate-safe incremental events. Show partial fills, remaining amounts, fees, pending approvals and discrepancies with freshness timestamps.

Acceptance: provider balances, fills and transfers reconcile with exact journal entries; stale or conflicting evidence is visible and actionable. Sign-out/account change evicts sensitive view state. Plain and visual views agree on terms, state and permissions. Restart and browser disconnect cannot turn unknown into failed or complete.

## T17 — Complete operations, migration and recovery

R9, R11–R14, R16. Dependencies: T08, T10, T16.

Observed BTC paths include `server/mode0.boundary.test.ts`, deployment scripts and historical ledger modules; proposed `docs/laboratory/operations.md` and environment-specific capability checks. Add versioned migrations, dispatch stop controls, separate secrets, redacted telemetry, retention, backup and restore. Keep reconciliation alive while new dispatch is disabled.

Acceptance: restore an isolated copy with dispatch disabled; verify historical hashes/scores, role revocation, secret rotation, redaction, queue recovery and journal reconciliation. Rollback never overwrites confirmed external outcomes. Root app builds and meaningful integration/browser checks pass in both repositories. Accessibility and failure-state checks use the actual integrated path.

## T18 — Establish honest research evaluation and release evidence

R1–R5, R12, R15, R16. Dependencies: T08, T10, T16, T17. Condition: U3, U5, U7.

Proposed BTC `shared/research/evaluation.ts`, `docs/research/evaluation-protocol.md`. Distinguish initial information allocation, model budget, Jev contribution, visualization comprehension and predictive performance. Preserve equal-information, pooled and single-solver comparators; separate exploratory discovery from held-out confirmation.

Acceptance: protocol names its question, cohort, information cutoff, exclusions, metrics and costs before a claimed benefit is measured. Report missing agents and failed rounds; no cherry-picked completion denominator. A release evidence matrix separately reports all four financial capabilities, real Looking Glass integration, deterministic checks, provider checks, live authorized verification and research outcomes. Untested categories stay NOT_RUN.
