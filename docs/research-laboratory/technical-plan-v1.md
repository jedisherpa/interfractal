# BTC-Learning technical plan — revision 1

Review draft, 20 September 2026. This is the coordinator's proposed implementation plan, based on the accepted DaVinci brief and its four completed reviews. It is not an accepted implementation order or a completed Brunelleschi specialist-review packet. No new specialist team was commissioned. Product acceptance checks below are proposed and have not been run.

## 1. Recommended shape

Keep BTC-Learning's existing backend and historical research application. Add a durable worldview pipeline, a separate financial service and worker, and a versioned connection to Interfractal's laboratory view. Interfractal remains the home of the public teaching experience and the imported Looking Glass source. Its future authenticated laboratory route presents permitted research and financial records through a small server-side bridge.

This avoids simultaneously moving databases, replacing both routers and inventing the research system. BTC currently uses Express, tRPC, Drizzle and MySQL; Interfractal uses TanStack Start, Nitro and an existing authentication/Postgres setup. Neither database becomes an implicit replica of the other. BTC owns research and financial operational records; Interfractal owns its application session and display state. Use separately permissioned financial storage and processes so research workers cannot submit financial actions.

```mermaid
flowchart LR
  Feeds[Two market feeds] --> Evidence[Frozen evidence and allocations]
  Evidence --> Four[Four saved initial worldviews]
  Four --> Compare[Jev judgments and collective comparison]
  Compare --> Research[Versioned research records]
  Research --> Bridge[Authenticated server bridge]
  Bridge --> Views[Interfractal: Looking Glass and plain inspector]
  Views --> Proposal[Action proposal and human authorization]
  Proposal --> Finance[Financial service and durable outbox]
  Finance --> Prime[Coinbase Prime]
  Prime --> Reconcile[Reconciliation and exact journal]
  Reconcile --> Bridge
```

The strongest objection is operational complexity: a second service boundary can lose identity, freshness or transaction status while a polished view looks complete. The response is to define and test those boundaries explicitly, starting with the account and recovery assumptions most likely to invalidate the approach. A second objection survives every engineering check: correlated agents and a common judge may add cost without improving research. That needs separate evaluation.

## 2. Scope already accepted

The intended build includes all of these capabilities:

- Four evidence-linked initial worldviews, followed by comparison, attributable revisions and retained dissent.
- Two separately attributed common market feeds with visible, rotating per-agent supplements; identical information remains a comparator.
- BTC, ETH and SOL at 1-minute/6-hour, 5-minute/2-day, hourly/28-day and daily/180-day candle/history pairs. The model supports broader scope through explicit configurations.
- Jev after all four initial accounts have been saved; Looking Glass and plain inspection of the same records.
- Coinbase Prime order placement, custody, wallet handling and transfers. Human authorization is the initial financial policy.

The financial implementation must complete all four capabilities. The research-only milestone below is an intermediate milestone, not the finished product. The research question may be pattern discovery; this plan does not invent a prediction target, trading strategy, capital limit or forecast horizon.

## 3. Evidence and reuse

The accepted brief is D6-v2, SHA-256 `2157990df5f56c75ed53b6d76bba5dc4c6163c724d3a09e4e3e91f983a4013c0`, adopted through the user's acceptance of its four choices. Its inherited application snapshot is BTC commit `ffe390e2dbdf48a74be4a8d41df79bcad12972e4`. A focused Git comparison with import commit `caa52b02bf7695ee10cd0890a6fd8b1b57af3c7a` found no changed tracked paths outside `experiments/looking-glass/`. Uncommitted concurrent laboratory work is excluded. Interfractal's application baseline is `1326cc64223fc167610c2157f2c24fa33a87c93b`; PR #12 adds the laboratory snapshot and these documents.

| Observed component | Planning implication | Evidence grade |
| --- | --- | --- |
| BTC `server/collective/liveMarket.ts`, `providerInvoke.ts`, `vault.ts`, `drizzle/schema.ts` | Reuse acquisition, invocation, encrypted provider-secret and schema patterns; extend their contracts deliberately. | SUPPORTED: source read. No current deployment claim. |
| BTC `shared/ledger/mode.ts` and `server/mode0.boundary.test.ts` enforce simulation-only capabilities. | Add an explicit financial service boundary and revise tests by environment. Preserve historical Mode 0 behavior. | SUPPORTED: source. |
| BTC `juryRunner.ts` refuses a cycle once any jury row exists. | Use per-agent durable attempts and a barrier; a partial-write crash could otherwise prevent completion. | SUPPORTED observation; retry consequence is an inference, NOT_TESTED. |
| BTC authenticated `operatorProcedure` differs from owner checks. | Research operation permissions must not grant portfolio approval or submission authority. | SUPPORTED: router and tRPC middleware. |
| BTC `scoreBps` and settlement records describe research scores; some views dollar-format them. | Preserve original score math and correct displayed units; add a separate financial journal. | SUPPORTED: settlement, CycleDetail and ReviewColumn. |
| BTC `docs/CUEBLOCK_READ_SIDE_INTEGRATION.md` defines a paginated public chain export and browser verifier. | Reuse the read-side seam for historical research. Add explicit versioning and private projections for new records. | SUPPORTED: documented source contract; live endpoint not tested here. |
| Interfractal `src/lib/auth/verify.server.ts` has a development-user fallback in one configuration. | New financial access requires a real verified production identity and backend account mapping; never infer permission from a development ID. | SUPPORTED: source; deployment configuration UNKNOWN. |
| Imported Looking Glass contains instruments, replay and parity patterns, plus preserved failed workflows. | Select an adapter against pinned records; prove the integrated experience. A source import alone does not satisfy integration. | SUPPORTED: imported records. Research benefit NOT_TESTED. |

Pinned source locations are in the [source register](planning-sources.md). Source inspection is selective, not a claim that every archived file was semantically reviewed.

## 4. Research data and durable execution

Create new versioned research tables alongside the existing study tables. Do not reinterpret historical cycles as worldview rounds. Proposed families are `research_rounds`, `evidence_objects`, `evidence_allocations`, `agent_attempts`, `worldview_versions`, `claims`, `claim_edges`, `jev_judgments`, `comparison_versions` and `research_outbox`.

An evidence object records provider, endpoint/product, asset and quote asset, interval, requested window, actual coverage, observation cutoff, acquisition time, normalization version, raw-content hash and omissions. Preserve raw provider strings and raw responses in bounded encrypted object storage; normalized values have explicit units. Close candles at or before the cutoff, deduplicate by provider/product/interval/open time, and keep gaps, conflicts and unfinished bars visible. Do not fill missing market history with invented candles.

Recommend Coinbase Exchange and Kraken public candles as the two initial research providers, subject to actual pair availability. These feeds are separate from the Prime execution account. The accepted grid contains 360, 576, 672 and 180 bars per asset/provider before gaps: 10,728 bars across three assets and two providers. This is arithmetic, not a measured input or latency budget. Coinbase's 300-candle request limit requires paging; Kraken's recent-history limit prevents arbitrary old backfill. Persist acquisition over time and identify unsupported historical ranges. [Coinbase candles](https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles), [Kraken OHLC](https://docs.kraken.com/api-reference/market-data/get-ohlc-data).

An allocation manifest binds each agent to exact evidence object hashes, shared subsets, supplement subsets and the rotation seed/configuration. Both feeds contribute to the shared evidence. A supplement changes declared evidence access, not provider count. Freeze all allocation manifests before invocation. Record the union of information made available later during comparison separately.

Each worldview is an immutable version containing observations, interpretations, relationships, uncertainties, alternatives and possible next questions. Claims carry stable IDs, evidence references, asset/time scope and type. A relationship names its meaning, including support, contradiction, correlation or a proposed causal explanation. A generated explanation is an inspectable account, not a recovered trace of hidden model reasoning.

Use an outbox and leased jobs in the existing database environment. An attempt key binds round, agent, phase and attempt number; the logical job has a uniqueness constraint. Record queued/running/succeeded/failed/timed-out states, lease generation, full request/evidence hashes, provider request ID where available, usage and returned model version. A lease-generation fence prevents a late result from an expired worker replacing the selected result. Retries preserve every attempt and can incur another provider charge; reserve from the run's adopted spend budget before each invocation and account for uncertain charges. Never claim exactly-once model execution.

The initial-account barrier opens only when all four valid immutable accounts exist. A failed or missing agent leaves the standard four-account round incomplete; do not silently describe three accounts as four. An explicitly configured incomplete-round analysis is a different condition and does not enter the normal comparison/evaluation cohort. Peer-access permissions are enforced in input construction and checked against saved manifests. Concurrency alone is not proof of independence.

After the barrier, construct the collective account with support/opposition links, union evidence and unresolved differences. Later individual revisions point to their parent, added evidence and stated revision reason. A complete pattern-discovery round can end with candidate findings and no forecast or action.

Keep five clocks separate: evidence cutoff, candle interval, history length, reasoning deadline and any later prediction horizon. Ten minutes is a candidate total reasoning deadline. Jobs persist beyond a browser request; the view reconnects using a durable cursor. A deadline closes the round honestly and prevents new chargeable calls, while already submitted calls and their eventual receipts remain accounted for.

## 5. Jev integration

Add a server-only adapter behind a typed judgment interface. Start with post-freeze claim classification, support-rubric judgments and relation labels such as agreement, contradiction, different scope or insufficient evidence. Exact questions and rubrics are versioned project designs. Jev supports typed Choice, Score and Noul questions; that constrains output shape, not truth. [Primitives](https://docs.typesafe.ai/primitives).

Pin `jev-1.13.0` for the first reproducible integration and retain the requested and returned versions. TypeSafe currently documents text/JSON inputs, not chart images. Send bounded, relevant evidence descriptions and claim records; compute candle validation, arithmetic and time ordering in code. [Models](https://docs.typesafe.ai/models), [State](https://docs.typesafe.ai/concepts/state), [documented limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13).

Store exact state/rubric hashes, accessible input records, answer distribution, available confidence statistic, latency, usage and failure reason. The inspector attributes every label to Jev. A confidence statistic is not a forecast-success probability. Jev failures remain visible: retain the four accounts and mark the comparison as missing that component. Do not silently swap model versions, omit dissent or promote a label into an authorization.

Before claiming usefulness, evaluate frozen labeled examples, a simple deterministic comparator, abstention behavior and disagreement with human labels. Future predictive evaluation is separate. Provider access, retention terms, account quotas and project-specific accuracy remain unverified prerequisites.

## 6. Financial services and exact outcomes

Prime is selected; account entitlements and supported routes are still unknown. Recommend provider-managed custody initially, with the provider's actual wallet, signing, approval and recovery responsibilities documented. Direct control of private keys is a separate architecture choice, not something supplied by the existing model-credential vault. The required wallet workflow still includes authorized wallet access/provisioning where supported, receiving, balances, transaction visibility, signing through the selected custody arrangement and demonstrated recovery.

Use a dedicated financial process and database identity. It owns portfolio mappings, roles, policies, wallet registry, proposals, approvals, immutable intents, submissions, external events, reservations, journals and reconciliation checkpoints. Model workers have no financial credentials, finance database grants or dispatch endpoint access. The browser holds no Prime secret. The financial API checks the verified principal, account role, policy version and deployment environment on every consequential operation.

Bind human authorization to the complete immutable intent: account, source wallet, product/asset/network, side or destination, exact quantity, price/order type where relevant, fee ceiling, expiry and policy version. Changes to these terms require a new authorization. The service rechecks authority, limits, spend reservations, destination policy and freshness immediately before dispatch. Provider approval requirements remain additional states and are not bypassed by the local approval.

Order and transfer records use separate lifecycles:

| Record | Important states and interpretation |
| --- | --- |
| Intent | Draft → awaiting authorization → authorized → reserved → dispatching. Expired, revoked and denied remain explicit. |
| Submission | Not sent, acknowledgment pending, submission unknown, provider acknowledged or provider rejected. A network timeout after dispatch creates uncertainty. |
| Order | Open, partially filled, cancel requested, canceled, filled, expired or rejected, based on provider evidence. A fill can race cancellation. |
| Transfer | Provider approval pending, accepted, processing, confirmed/completed or failed, with network-specific evidence. An API acknowledgment is not a settled transfer. |
| Reconciliation | Pending, current at a stated checkpoint, stale or discrepancy. Reconciliation does not overwrite the provider lifecycle. |

Keep a stable local intent UUID and immutable outbound payload before any network request. Prime orders expose `client_order_id`; transfers and withdrawals expose `idempotency_key`. Preserve those identifiers across attempts. Their presence alone does not establish an indefinite deduplication guarantee or a complete lookup path. Confirm account-specific recovery and retention semantics before enabling dispatch. If an acknowledgment is lost and the service cannot unambiguously recover by persisted identifiers and provider history, retain the reservation, stop automatic resubmission and raise an actionable reconciliation case. [Orders](https://docs.cdp.coinbase.com/api-reference/prime-api/rest-api/orders/create-order), [transfers](https://docs.cdp.coinbase.com/api-reference/prime-api/rest-api/transactions/create-transfer), [withdrawals](https://docs.cdp.coinbase.com/api-reference/prime-api/rest-api/transactions/create-withdrawal).

Use an inbox keyed by provider event identity and an outbox keyed by intent/operation. Expect duplicates and out-of-order delivery; supplement streamed updates with bounded polling and periodic full reconciliation. Store raw provider statuses and adapter version alongside normalized states. Unknown provider values remain unknown rather than defaulting to success. Prime offers order retrieval and cancellation interfaces; the precise supported lifecycle must be checked in the adapter. [Get order](https://docs.cdp.coinbase.com/api-reference/prime-api/rest-api/orders/get-order-by-order-id), [cancel order](https://docs.cdp.coinbase.com/api-reference/prime-api/rest-api/orders/cancel-order).

Amounts use decimal strings at API boundaries and exact integer base units or exact decimal arithmetic internally, with an asset registry recording scale and product precision. Never use JavaScript floating-point money. A balanced journal records assets, fees, in-flight movements and clearing accounts; every asset's postings balance. Reconcile orders, fills, transfers and wallet balances against external evidence, including opening balances and rounding rules. Research basis points retain their original research meaning and never become journal entries.

The proposed first financial coverage is BTC/USD spot limit orders and cancellation, Prime custody/wallet operations, internal supported wallet transfers and Bitcoin-network transfers to permitted endpoints. Research ETH/SOL coverage does not grant financial permissions for those assets. Supported networks, transfer destinations, thresholds, capital and fee limits must be explicit before live operation. Required provider approval may involve Prime's own interface; show its status and a validated provider link. [Prime approval policies](https://help.coinbase.com/en/prime/securing-your-account/edit-policies).

## 7. Three integration contracts

Contract details and failure cases are in [boundary-contracts-v1.md](boundary-contracts-v1.md). All are proposed version 1; two-sided independent checks are NOT_RUN.

1. **BC_RESEARCH_VIEW:** a frozen research projection carries source identity, schema version, sequence/checkpoint, evidence access, four account versions, comparisons and limitations. Looking Glass and the plain inspector resolve the same IDs and replay cursor. View state never changes research evidence.
2. **BC_RESEARCH_ACTION:** research can create an action proposal with cited record versions. It cannot approve or dispatch. The finance service validates a separate intent and binds actual human authorization and policy. Missing research references do not become invented certainty; a manual action is labeled manual.
3. **BC_FINANCIAL_VIEW:** authenticated projections expose only authorized account details, explicit lifecycle states and reconciliation freshness. Approval requests bind exact terms. The backend remains authoritative after browser disconnects, stale pages or changed roles.

The existing chain export is public. Private balances, addresses, approvals and raw financial events must never enter that export or its immutable payloads. A hash of sensitive low-entropy data is not adequate redaction. Keep the financial journal private; expose only explicitly reviewed public research projections and non-identifying references if needed. Build privacy into event creation, not a later UI filter.

The Interfractal server bridge verifies its real session, maps an issuer/subject to a BTC principal and calls the private backend with a short-lived, audience-bound server credential. Verify issuer, signature, expiry, intended audience and current backend permissions; never trust browser-supplied roles or a shared email string. Reject development/preview identities for financial dispatch. Exact production identity federation and key rotation are an early design check, not a claim that the present apps already share authentication.

## 8. Implementation sequence

The [ticket guide](implementation-tickets-v1.md) covers all sixteen inherited requirements. No implementers or calendar dates are assigned.

**First, challenge the largest assumptions:** T01 documents actual Prime portfolio capabilities, wallet and transfer routes, recovery lookup and signing responsibilities; T02 resolves deployment identity and worker/storage isolation. Use documentation and a paper lifecycle walkthrough before authorizing provider integration trials. A missing required route or unrecoverable ambiguous submission invalidates the proposed financial adapter; it does not justify silently dropping the capability. An inability to establish production identity invalidates the current bridge proposal.

**First useful research milestone:** T03–T08 and T09–T10 produce a durable four-account round from the accepted grid, post-freeze Jev comparison and real Looking Glass/plain replay. T12 gives a person a linked action proposal without pretending it has been submitted. The whole required build is not yet complete at this milestone.

**Complete the financial path:** T11–T16 provide exact storage, account authority, Prime orders, custody/wallet handling, transfers, reconciliation and the permitted action inspector. The first full vertical slice traces one research round through a human-authorized BTC order and transfer, provider results and reconciled balances, including recovery cases. Tests use deterministic substitutes and available provider test environments first. Where real operation is required to establish acceptance, the amount, account and action receive their own authorization.

**Complete operational and research acceptance:** T17–T18 cover migration, rollback, privacy, recovery, accessibility, observability and evaluation. Keep all four capabilities in the completion checklist. A passing mock, a receive address, or successful document validation does not establish working custody, wallet signing, orders or transfers.

## 9. Operations, migration and acceptance

Use additive schemas and versioned adapters. Preserve old Mode 0 study IDs, configurations, score formulas and chain bytes. New research has new configuration/version identities. If old rows are projected into the new inspector, record a translation version and label unavailable fields. Never invent historical worldviews or financial activity.

Separate simulation and financial credentials, DB grants, dispatch entry points and environment configuration. Replace blanket source-word prohibitions with meaningful capability/permission tests for each deployable; retain simulation tests that demonstrate it cannot load or reach real dispatch credentials. Rollback disables new dispatch and new research jobs while maintaining read access and reconciliation for already-submitted operations. Never rewind financial state or restore an old database over confirmed external transactions.

Record queue lag, lease loss, agent coverage, cutoff violations, request cost, missing feed coverage, Jev abstention/errors, export gaps, denied authorizations, unknown submissions, external-update lag and reconciliation differences. A stop control blocks new work; it does not claim cancellation of already-submitted operations. Logs use opaque IDs and redacted error classes. Backups include encryption-key recovery procedures and are tested by restoration into an isolated environment with dispatch disabled.

The UI must support keyboard inspection, visible focus, text-plus-shape status, reduced motion, a usable plain view and focus recovery after errors. It shows stale/current status and incomplete agents without celebratory completion. Actions show terms and authorizer plainly. Geometry, camera position, consensus and Jev confidence never imply consent.

Acceptance needs separate evidence for deterministic behavior, provider integration, actual permitted operation and research effectiveness. Required fault cases include missing candles, an interrupted agent, a late lease result, a challenged Jev label, changed authority, duplicate delivery, lost submission acknowledgment, partial fill/cancel race, transfer approval delay, stale balance, fee correction, restart and restore. Unknown cases stay visible. No target for financial returns or model superiority is assumed.

## 10. Open facts and deferred exploration

| ID | Uncertainty | Affected work and next evidence |
| --- | --- | --- |
| U1 | Actual Prime account/portfolio entitlements, wallet/signing/recovery arrangement and routes | T01, T11–T16. Capability matrix from the real account's permitted documentation/configuration; no secrets in the report. |
| U2 | Production identity, worker host and durable storage configuration | T02, T04, T09, T11–T17. Deployment design and identity trace; fail if a preview identity can authorize finance. |
| U3 | Feed pair/history coverage and bounded round latency/cost | T03–T08, T18. Coverage and workload measurements during separately authorized implementation tests. Ten minutes remains a candidate. |
| U4 | Current Looking Glass adapter readiness | T09–T10. Pin a reviewed instrument API and verify shared IDs/replay against a real collective record. Concurrent uncommitted workspace work is not evidence of completion. |
| U5 | Specific predictive task, scoring and strategy connecting findings to action | T12, T18. Remains an explicit research/configuration choice. Manual action proposals allow operational integration without inventing an automated strategy. |
| U6 | Live capital, fee limits, permitted destinations and account roles | T12–T16. Human-selected configuration before dispatch activation; plan supplies no implied financial mandate. |
| U7 | Jev access, data retention, quotas and local judgment quality | T07, T18. Provider agreement/account facts plus a labeled evaluation; no credentials requested in chat. |

Optional exploration includes additional specialty sources, longer windows, richer geometry, direct-control signing and later standing agent execution policies. They are excluded from baseline acceptance until adopted. Revisit them using a stated discriminating question, not by quietly expanding the first build.

## 11. Review status

The coordinator checked requirement coverage, ticket dependencies and boundary consistency against the accepted brief. This is self-review; the four earlier reviewers reviewed the vision, not this technical revision. New specialist, paired-owner and independent reliability/fidelity reviews remain NOT_RUN. The proposed team/budget was not treated as approved by silence. This reviewable draft advances the user's renewed planning request without commissioning that team or claiming the pilot workflow is complete.

The [review notes](planning-review-v1.md) identify remaining material issues and the first implementation checks. This revision has not been accepted as the final plan. Publication in the requested draft PR makes the proposal available for review; it does not activate any provider, financial service, new study or deployment.
