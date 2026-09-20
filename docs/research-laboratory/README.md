# Looking Glass research laboratory

This package adds the existing Looking Glass laboratory to Interfractal for inspection and further design work. It is a source import, not a new integration into the deployed teaching app.

- [Laboratory source and historical guide](../../experiments/looking-glass/README.md)
- [Accepted BTC-Learning design](accepted-design.md)
- [BTC-Learning technical plan — review draft](technical-plan-v1.md)
- [Implementation tickets and acceptance checks](implementation-tickets-v1.md)
- [Visual plan overview](first-view.html)
- [Planning scope and remaining decisions](planning-scope.md)
- [Source manifest](source-manifest.json)
- [Import verification](import-verification.json)

## Source and limits

Imported from BTC-Learning commit `caa52b02bf7695ee10cd0890a6fd8b1b57af3c7a`: **5,938 regular files**, including the instrument code, synthetic fixtures, frozen builds, research notes, preparation materials and preserved review evidence. Each included file matches its source Git blob. The manifest records SHA-256, original Git blob ID and file mode.

Nineteen historical symlink fixtures are omitted and listed in the manifest. Their targets belong to the original checkout; they are not recreated or followed. Source working-tree changes that were not committed at capture time are excluded. The manifest is the authority for this snapshot, rather than a moving status page in another checkout.

The imported records are historical evidence. Statements such as “current work,” absolute local paths and gate approvals refer to the original research task. They do not authorize new study execution, financial actions, or deployment from this repository. Historical Git restoration instructions require the original repository and commit history. The preserved Gate 10 prediction-workflow failure remains a failure; a source copy does not repair it or establish research effectiveness.

## Inspect and run the standalone instruments

Use Node.js 24 for the documented laboratory commands. The gate instruments use Node built-ins; this import does not add Interfractal dependencies or application routes. Run commands from the repository root. For example, the frozen Gate 0 replay is served by:

```sh
node experiments/looking-glass/probe/builds/g0-d85237ad31362768/server.mjs
```

The replay binds to loopback and its documented fixed port. Running a local replay can create local activity logs; it does not collect a new research study. Each instrument's README names its saved build, run and limitations. Older preserved failures and audit fixture trees should not be treated as current launch targets.

## Relationship to BTC-Learning

The intended BTC-Learning build adds structured four-agent worldviews, Jev comparison, Looking Glass/plain inspection, and Coinbase Prime order, custody, wallet and transfer operations. Those additions remain planned. This PR transfers the existing laboratory and design context; it does not implement that financial or research orchestration system.

The public Interfractal teaching experience remains unchanged. The technical plan proposes its authenticated laboratory entry point, backend workers, identity mapping, record contracts and acceptance checks. It is a coordinator review draft; new specialist reviews and exact plan acceptance remain pending.
