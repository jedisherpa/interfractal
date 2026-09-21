// Read-only HTTP verification of the exact local Gate 1 replay and Gate 0 link.
// Usage: node audit/gate-1/check-routes.mjs G1-CUBE-003 43994
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const project = resolve(here, '../..');
const runId = process.argv[2];
const port = Number(process.argv[3]);
if (!/^G1-CUBE-\d{3}$/.test(runId || '') || !Number.isInteger(port)) throw new Error('Pass G1 run ID and port');
const run = JSON.parse(readFileSync(join(project, 'calibration/runs', runId, 'run.json')));
const buildDir = join(project, 'calibration/builds', run.buildId);
const base = `http://127.0.0.1:${port}`;
const checks = [];
function check(name, fn) {
  try { awaitable.push(Promise.resolve(fn()).then(() => checks.push({ name, status: 'pass' }),
    error => checks.push({ name, status: 'fail', detail: error.message }))); }
  catch (error) { checks.push({ name, status: 'fail', detail: error.message }); }
}
const awaitable = [];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function get(path) {
  const response = await fetch(base + path, { redirect: 'manual', cache: 'no-store' });
  return { response, bytes: Buffer.from(await response.arrayBuffer()) };
}
check('root serves exact snapshot index', async () => {
  const { response, bytes } = await get('/');
  assert.equal(response.status, 200);
  assert.equal(sha(bytes), sha(readFileSync(join(buildDir, 'index.html'))));
  assert.match(response.headers.get('content-type') || '', /text\/html/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
for (const asset of ['app.mjs', 'model.mjs', 'style.css']) check(`${asset} serves exact snapshot bytes`, async () => {
  const { response, bytes } = await get(`/${asset}`);
  assert.equal(response.status, 200);
  assert.equal(sha(bytes), sha(readFileSync(join(buildDir, asset))));
});
for (const [route, file] of [['/api/run', 'run.json'], ['/api/current-run', 'run.json'],
  ['/api/checkpoints', 'checkpoints.json'], ['/api/events', 'events.jsonl']]) check(`${route} serves exact canonical bytes`, async () => {
  const { response, bytes } = await get(route);
  assert.equal(response.status, 200);
  assert.equal(sha(bytes), sha(readFileSync(join(project, 'calibration/runs', runId, file))));
});
check('evidence index identifies this run', async () => {
  const { response, bytes } = await get('/api/evidence');
  assert.equal(response.status, 200);
  const evidence = JSON.parse(bytes.toString('utf8'));
  assert.equal(evidence.runId, runId);
});
check('unknown and encoded traversal routes do not expose project files', async () => {
  for (const route of ['/definitely-not-a-route', '/api/unknown',
    '/evidence/gate-1/%2e%2e%2f%2e%2e%2fPROJECT_STATUS.json',
    '/evidence/gate-1/%2e%2e%2f%2e%2e%2finputs%2fINPUT_MANIFEST.json']) {
    const { response, bytes } = await get(route);
    assert.ok([400, 403, 404].includes(response.status), `${route}: ${response.status}`);
    assert.ok(!bytes.toString('utf8').includes('INPUT_MANIFEST'), `${route}: leaked input manifest`);
  }
});
check('Gate 0 preserved local replay remains reachable', async () => {
  const response = await fetch('http://127.0.0.1:43991/api/run', { cache: 'no-store' });
  assert.equal(response.status, 200);
  const previous = await response.json();
  assert.equal(previous.runId, 'G0-CUBE-005');
  assert.equal(previous.buildId, 'g0-d85237ad31362768');
});
await Promise.all(awaitable);
const result = { schema: 'looking-glass-gate-1-route-audit-v1', generatedAtUtc: new Date().toISOString(),
  scope: 'Read-only local HTTP bytes/status; not browser visual observation', runId, buildId: run.buildId, port,
  checks, passed: checks.filter(c => c.status === 'pass').length, failed: checks.filter(c => c.status === 'fail').length };
writeFileSync(join(here, `${runId}-route-audit.json`), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ runId, buildId: run.buildId, port, passed: result.passed, failed: result.failed,
  failures: checks.filter(c => c.status === 'fail') }, null, 2));
if (result.failed) process.exitCode = 1;
