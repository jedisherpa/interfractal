// Read-only HTTP audit of the running exact Gate 6 snapshot. Never POST activity.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const baseUrl = process.argv[2] || 'http://127.0.0.1:43999';
const buildDir = resolve(process.argv[3] || '');
if (!process.argv[3]) throw new Error('Pass the immutable build directory');
const m = await import(pathToFileURL(join(buildDir, 'model.mjs')).href);
const runDir = resolve(root, `local-models/runs/${m.RUN_ID}`);
const cases = [
  ['/', join(buildDir, 'index.html')],
  ['/index.html', join(buildDir, 'index.html')],
  ['/style.css', join(buildDir, 'style.css')],
  ['/app.mjs', join(buildDir, 'app.mjs')],
  ['/model.mjs', join(buildDir, 'model.mjs')],
  ['/fictional-records.json', join(buildDir, 'fictional-records.json')],
  ['/reference-mappings.json', join(buildDir, 'reference-mappings.json')],
  ['/fixture.json', join(buildDir, 'fixture.json')],
  ['/api/run', join(runDir, 'run.json')],
  ['/api/current-run', join(runDir, 'run.json')],
  ['/api/checkpoints', join(runDir, 'checkpoints.json')],
  ['/api/events', join(runDir, 'events.jsonl')],
  [`/runs/${m.RUN_ID}/initial-state.json`, join(runDir, 'initial-state.json')],
];
const findings = [];
for (const [path, file] of cases) {
  const response = await fetch(new URL(path, baseUrl));
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get('cache-control'), 'no-store', path);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
  const actual = Buffer.from(await response.arrayBuffer());
  const expected = await readFile(file);
  assert.deepEqual(actual, expected, `exact bytes ${path}`);
  findings.push({ path, status: response.status, exactBytes: true });
}
for (const [path, expectedStatus] of [['/unknown', 404], ['/api/no-such-route', 404],
  ['/runs/%2e%2e%2f%2e%2e%2fREADME.md', 403], ['/evidence/gate-6/%2e%2e%2f%2e%2e%2fREADME.md', 403]]) {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.status, expectedStatus, path);
  findings.push({ path, status: response.status });
}
const blockedWrite = await fetch(`${baseUrl}/api/no-such-route`, { method: 'POST', body: '{}' });
assert.equal(blockedWrite.status, 404);
findings.push({ path: '/api/no-such-route', method: 'POST', status: 404 });
const result = { kind: 'gate-6-independent-read-only-routes', baseUrl, buildDir,
  exactByteCases: cases.length, rejectionCases: findings.length - cases.length, findings, checksPassed: true };
if (process.argv[4]) await writeFile(resolve(process.argv[4]), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ exactByteCases: result.exactByteCases, rejectionCases: result.rejectionCases, checksPassed: true }));
