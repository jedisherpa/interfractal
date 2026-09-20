# Technical planning scope

The accepted design is ready for technical planning. The detailed implementation plan is not complete in this import PR.

| Workstream | Guidance still to complete |
| --- | --- |
| Research and Jev | Evidence providers and allocation; frozen manifests; durable per-agent attempts; worldview schema; comparison/revision procedure; Jev inputs and rubric; evaluation |
| Prime and accounting | Account-scoped roles; order/custody/wallet/transfer adapters; exact amounts; approval lifecycle; reconciliation; ambiguous responses; recovery and migration |
| Interfractal and Looking Glass | Authenticated laboratory routes; host/backend identity mapping; shared read models; equivalent plain/visual inspection; keyboard and reduced-motion behavior; deployment and rollback |

The key interfaces are research-to-view, research-to-action and financial-action-to-view. Research records may justify an action proposal but do not authorize it. The same versioned records must drive the plain inspector and Looking Glass. The frontend must distinguish authorization, submission, acknowledgment, execution/confirmation and reconciliation.

The first potentially invalidating questions concern the actual Prime account capabilities and the authentication/worker deployment boundary. The Vercel page request should not own the entire reasoning round or act as the only durable record of financial submission. Existing BTC-Learning event export/verification is a useful provenance seam, not a financial settlement mechanism.

The planning proposal names three specialties and a bounded review process. A new specialist planning team has not yet been commissioned. Existing DaVinci reviews are retained privately; their conclusions inform the accepted design. Product implementation, new research collection and live financial verification are outside this planning stage.
