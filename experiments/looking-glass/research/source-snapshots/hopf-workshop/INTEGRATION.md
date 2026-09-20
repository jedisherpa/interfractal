# Hopf × WeOpoly × TAWarRoom — integration analysis and rehearsal

Date: 14 September 2026. Independent explore agents read `jedisherpa/weopoly` (`grok/weopoly-learning-community-v1`), `jedisherpa/sphere` TAWar work on `codex/tawar-multisphere-implementation` (production is `https://tawarroom.vercel.app` on `main`; there is no Git branch literally named `TAWarRoom`), and this Hopf Workshop.

This document is analysis plus the contract for the **testable rehearsal now in this repo**. It is not permission to deploy into WeOpoly production or TAWar.

**Intention Abacus (16 September 2026):** optional 3D/2D instrument in this repo at `intention-abacus.html`. It is a view of the same Hopf protocol, not a new authority. Mapping: `docs/INTENTION_ABACUS.md`. Parallel branch PRs exist on `jedisherpa/weopoly` and `jedisherpa/sphere` (TAWarRoom). Linking does not enroll membership.

## What each system actually is

| System | Executable core | Sequencing / authority | Hard nonclaims |
|---|---|---|---|
| **Hopf Workshop** | `hopf_model.py` / `hopf.js` | Versioned proposal, explicit Boolean consent, review stamps, commit, simulated act, withdraw → repair → release | Not S³-as-mind, not production auth, suggestion ≠ permission, topology ≠ ethics |
| **WeOpoly** | `lib/domain.ts` `dispatch` | PLAY → COORDINATE → ACT; **RETURN is a command**, not a phase. READY is not consent. Advice is not a decision. | Not constitutional adoption, not membership, practice is simulated, hosted groups 503 until durable store |
| **TAWarRoom** | Agency desk + ROLR briefing | Paul+Max two-signer Agency decisions; agents cannot attest; review digests are local integrity, not Cell receipts | Not Joeville; `requestSphere` grants no membership; external game events would be **pending observations** |

## Layer map (do not collapse)

1. **Geometry / representation** — Hopf π, WeOpoly octahedron/pyramid, TAWar desk UI. None of these mint permission.
2. **Sequencing** — WeOpoly PLAY / COORDINATE / ACT / RETURN. Round cycle is compressive; it cannot replace a ledger.
3. **Permission** — Hopf Workshop protocol (and TAWar attestations, separately). Consent is version-bound.
4. **Institutional authority** — TAWar membership, Paul+Max policy, Cell/Pillar native contracts. Out of this rehearsal.

WeOpoly already says geometric closure is coordination readiness, not completion. Hopf adds: a selector, a round, and a high-confidence feeling still cannot sign.

## Mapping used in the rehearsal

| WeOpoly | Hopf analogue | Rehearsal rule |
|---|---|---|
| PLAY | Upper cone (generate) | Propose, explore, READY. READY does not write Hopf consent. |
| CLOSE_ROUND | Enter torus table | All **active** seats must READY themselves. Absence is not consent. Not a commit. |
| COORDINATE | Torus gate | Review + versioned consent + Hopf `commit`. |
| BEGIN_ACT | Keep the promise | Requires an **active Hopf agreement**. Readiness is not enough. |
| ACT / RECORD_OUTCOME | Simulated action | Blocked if withdrawn/paused/retired. |
| RETURN | Lower cone without erase | Applies pending outcomes **once**, opens next PLAY, **appends** Hopf history. Does not revive a retired agreement. |
| WITHDRAW_* | Hopf withdraw | Pauses agreement, opens repair, stops ACT. |
| Advice ≠ decision | suggestion ≠ authorization | `propose_suggestion` cannot `commit` or `begin_act`. |

Four simulated seats: Maya, Finn, Bea, Sam. This is practice (`simulated=True`), not four human browsers, not TAWar identities.

## What it would take to put this into WeOpoly later

Keep `dispatch` as the only mutator. Add **no** Hopf coordinates into `ALLOCATE` / `READY` / `ACCEPT_COMMITMENT`.

Possible later seam (not built here):

- Optional `permission` adapter called **before** `BEGIN_ACT` and `RECORD_OUTCOME` that requires a Hopf-shaped record: exact proposal version, per-seat booleans, review stamps, commit event.
- Do not treat `goalStatus().ready` or pyramid fold as that adapter.
- Do not import Hopf fibres into `world-geometry.ts` (those tests assert square edges, rigid hinges, four slots).
- Registry: new tests would need `knowledge/traceability.json` IDs; `test:legacy` stays excluded.
- Hosted rooms remain out of slice until a durable store exists.

## What it would look like inside TAWarRoom later

Not a new product host. TAWar product split forbids treating the War Room as an arbitrary app shell.

If ever linked:

1. WeOpoly/Hopf rehearsal events arrive as **pending observations** on one explicitly selected Sphere (CueBlock/integration handoff rule).
2. A payload containing “approved” does not create accepted Work or human assent.
3. Linking must not auto-enroll membership, Lens, device, or policy.
4. Agency decisions still require the Sphere’s actual signers (production: Paul and Max).
5. Review-context digests stay local integrity, not native signatures.
6. Wizard Joe remains orientation-only.

This is a **later, separately authorized** integration. The rehearsal in this repo does not call TAWar APIs.

## Testable version now

| File | Role |
|---|---|
| `weopoly_hopf.py` | Four-seat PLAY/COORDINATE/ACT + RETURN over `Workshop` |
| `test_weopoly_hopf.py` | 16 sequencing/permission tests |
| `weopoly_hopf.js` | Browser/Node port |
| `test_weopoly_hopf.js` | Node checks of the same gates |
| `workshop.html` | WeOpoly round strip (separate from the 3-person parade table) |

Run:

```sh
python3 -m unittest test_weopoly_hopf test_model -v
node test_weopoly_hopf.js
node test_hopf.js
```

## Independent-review findings that shaped this

- WeOpoly RETURN is a **command**; calling the round a “phase cycle that clears obligations” would be a misread. Outcomes apply once; unfinished work remains visible.
- WeOpoly `BEGIN_ACT` does **not** currently require advice completeness; the rehearsal **tightens** that seam by requiring Hopf commit before ACT.
- TAWar linked-review retirement is **replacement-adoption**, not Hopf’s permissionless individual withdraw. Do not pretend they are the same state machine.
- Constitutional edition conflict (Second vs Third) is unresolved in WeOpoly; this rehearsal does not adopt an edition.
- Human playtest of WeOpoly is `NOT_RUN`. Automated rehearsal seats are not four humans.

## Nonclaims (survive this integration)

- Not a proof that WeOpoly, TAWar, or the Metacanon Constitution has Hopf topology.
- Not production authentication, group rooms, or TAWar membership.
- Not recruitment, SOW execution, or client contractual acceptance.
- Not a criterion for overriding consent.
- Not GPU/browser/human attestation of WeOpoly Gate J.
