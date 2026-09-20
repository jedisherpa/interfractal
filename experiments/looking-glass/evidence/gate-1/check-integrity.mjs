// Recheck the exact pre-browser bytes after all UI interventions.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const project = resolve(here, '../..');
const before = JSON.parse(readFileSync(join(project, 'evidence/gate-1/pre-browser-integrity.json')));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const checks = before.files.map(file => {
  try {
    const actual = sha(readFileSync(join(project, file.path)));
    assert.equal(actual, file.sha256);
    return { path: file.path, status: 'pass', sha256: actual };
  } catch (error) { return { path: file.path, status: 'fail', detail: error.message }; }
});
const result = { schema: 'looking-glass-gate-1-post-browser-integrity-v1', generatedAtUtc: new Date().toISOString(),
  runId: before.runId, buildId: before.buildId, comparedTo: 'evidence/gate-1/pre-browser-integrity.json',
  scope: 'Build, canonical fixture, and frozen prespec bytes only; append-only activity and captures excluded',
  checks, passed: checks.filter(c => c.status === 'pass').length, failed: checks.filter(c => c.status === 'fail').length };
writeFileSync(join(here, `${before.runId}-post-browser-integrity.json`), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ runId: before.runId, passed: result.passed, failed: result.failed,
  failures: checks.filter(c => c.status === 'fail') }, null, 2));
if (result.failed) process.exitCode = 1;
