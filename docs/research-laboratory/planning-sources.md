# Planning source register

Primary documentation checked on 20 September 2026. These pages support API shape and constraints; they do not establish account entitlement, deployed behavior, judgment quality or a tested integration. Four public-documentation tool calls were made during the coordinator continuation. No provider API was called.

## Pinned repository evidence

- [BTC-Learning source snapshot](https://github.com/jedisherpa/btc-constitutional-learning-collective/tree/ffe390e2dbdf48a74be4a8d41df79bcad12972e4) — private repository. Reviewed paths: `server/collective/juryRunner.ts`, `liveMarket.ts`, `providerInvoke.ts`, `vault.ts`, `chain.ts`; `server/routers/collective.ts`; `server/_core/trpc.ts`; `shared/ledger/mode.ts`, `settlement.ts`, `chainExport.ts`, `verifyExport.ts`; `drizzle/schema.ts`; `docs/CUEBLOCK_READ_SIDE_INTEGRATION.md`; `client/src/pages/CycleDetail.tsx`; `client/src/chamber/ReviewColumn.tsx`; package/lockfile evidence retained in the private intake.
- [Interfractal application baseline](https://github.com/jedisherpa/interfractal/tree/1326cc64223fc167610c2157f2c24fa33a87c93b) — reviewed package/configuration, route inventory and `src/lib/auth/server.ts`, `verify.server.ts`.
- [Imported Looking Glass source](../../experiments/looking-glass/README.md) — see [manifest](source-manifest.json) for exact file hashes, exclusions and source commit. `PROJECT_STATUS.json` retains qualified results and the Gate 10 prediction-workflow failure. These are historical records, not new study evidence.
- [Interfractal PR #12](https://github.com/jedisherpa/interfractal/pull/12) — source import first pushed as `cac259cfc2e38548c0d013d9f03448c57b255b6b`; later planning documents are separate commits. No production merge is part of this package.

## Market evidence

- [Coinbase Exchange candles](https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles): supported granularities, request-size limit, missing intervals and paging considerations.
- [Kraken OHLC](https://docs.kraken.com/api-reference/market-data/get-ohlc-data): supported intervals, recent-history limit and unfinished final candle. No assumption of arbitrary historical backfill.

## Jev

- [Models](https://docs.typesafe.ai/models): version IDs and aliases; current documented version `jev-1.13.0` at review time.
- [Primitives](https://docs.typesafe.ai/primitives): Choice, Score and Noul output contracts.
- [State](https://docs.typesafe.ai/concepts/state): supplied text/JSON input model.
- [Jev 1.13 limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13): numeric, counting, time-comparison and context limitations informing the division between code and judgments.

## Coinbase Prime

- [Prime overview](https://docs.cdp.coinbase.com/prime/introduction/welcome): selected product context.
- [Create order](https://docs.cdp.coinbase.com/api-reference/prime-api/rest-api/orders/create-order): portfolio/product terms and client order identifier.
- [Get order](https://docs.cdp.coinbase.com/api-reference/prime-api/rest-api/orders/get-order-by-order-id) and [cancel order](https://docs.cdp.coinbase.com/api-reference/prime-api/rest-api/orders/cancel-order): status/recovery surface. Account-specific lookup completeness remains to be established.
- [Create transfer](https://docs.cdp.coinbase.com/api-reference/prime-api/rest-api/transactions/create-transfer): wallet destination, idempotency identity and returned activity/transaction information.
- [Create withdrawal](https://docs.cdp.coinbase.com/api-reference/prime-api/rest-api/transactions/create-withdrawal): destination types, idempotency identity and returned approval/transaction information.
- [Transfer approval policies](https://help.coinbase.com/en/prime/securing-your-account/edit-policies): provider approval remains separate from local authorization.

All named new services, tables, fields and paths are coordinator proposals. Existing code observations and external API descriptions are not evidence that those proposed components exist.
