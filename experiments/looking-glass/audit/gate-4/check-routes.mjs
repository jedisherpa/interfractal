// Read-only HTTP route audit of the exact local Gate 4 snapshot.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runId = process.argv[2] || 'G4-SLICES-001';
const run = JSON.parse(await readFile(resolve(root, `slices/runs/${runId}/run.json`)));
const base = 'http://127.0.0.1:43997';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const routes = [
  ['/', resolve(root, `slices/builds/${run.buildId}/index.html`)],
  ['/style.css', resolve(root, `slices/builds/${run.buildId}/style.css`)],
  ['/app.mjs', resolve(root, `slices/builds/${run.buildId}/app.mjs`)],
  ['/model.mjs', resolve(root, `slices/builds/${run.buildId}/model.mjs`)],
  ['/api/run', resolve(root, `slices/runs/${runId}/run.json`)],
  ['/api/checkpoints', resolve(root, `slices/runs/${runId}/checkpoints.json`)],
  ['/api/events', resolve(root, `slices/runs/${runId}/events.jsonl`)],
  ['/api/movie-trace', resolve(root, `slices/runs/${runId}/movie-3d.json`)],
  [`/runs/${runId}/movie-3d.json`, resolve(root, `slices/runs/${runId}/movie-3d.json`)]
];
const checks = [];
for (const [route, path] of routes) {
  const response = await fetch(base + route, { cache: 'no-store' });
  const body = Buffer.from(await response.arrayBuffer());
  const file = await readFile(path);
  checks.push({ route, status: response.status, bytes: body.length, sha256: sha(body),
    expectedSha256: sha(file), pass: response.status === 200 && body.equals(file) });
}
const missing = await fetch(base + '/no-such-gate4-asset');
checks.push({ route: '/no-such-gate4-asset', status: missing.status, pass: missing.status === 404 });
const traversal = await fetch(base + '/evidence/gate-4/%2e%2e%2fGATE_3_PACKET.md');
checks.push({ route: '/evidence/gate-4/%2e%2e%2fGATE_3_PACKET.md', status: traversal.status,
  pass: traversal.status === 403 || traversal.status === 404 });
const result = { checkedAtUtc: new Date().toISOString(), kind: 'read-only-local-route-audit',
  runId: run.runId, buildId: run.buildId, base, pass: checks.every(x => x.pass),
  checks, scope: 'HTTP byte routes only; no browser rendering, controls, screenshots or user observations.' };
await writeFile(resolve(root, `audit/gate-4/${runId}-route-audit.json`), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ pass: result.pass, passed: checks.filter(x => x.pass).length,
  failed: checks.filter(x => !x.pass) }));
if (!result.pass) process.exitCode = 1;
