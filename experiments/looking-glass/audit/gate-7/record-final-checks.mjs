import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Record the final read-only audit command outputs after the public review
// routes are complete. Never includes private answer values in this summary.
const auditDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(auditDir, '../..');
const commands = [
  ['check-prior-integrity.mjs'],
  ['oracle.mjs'],
  ['check-build.mjs', 'G7-INTERPRET-002', 'g7-90e64952eb028069'],
  ['check-core.mjs'],
  ['check-browser.mjs', 'G7-INTERPRET-002'],
  ['check-activity.mjs', 'G7-INTERPRET-002'],
  ['check-trial.mjs'],
  ['check-routes.mjs', 'http://127.0.0.1:44000'],
];
const results = [];
for (const [script, ...args] of commands) {
  const result = spawnSync(process.execPath, [join(auditDir, script), ...args],
    {cwd: root, encoding: 'utf8', maxBuffer: 2_000_000});
  assert.equal(result.status, 0, `${script}: ${result.stderr || result.stdout}`);
  const output = JSON.parse(result.stdout);
  assert.equal(output.allPassed ?? output.allUnchanged, true, script);
  results.push({command: `node audit/gate-7/${script}${args.length ? ` ${args.join(' ')}` : ''}`,
    exitCode: result.status, result: output});
}
const routes = results.at(-1).result.checked;
for (const path of ['/review/results.html', '/review/replay-collection.json',
  '/review/packet.md', '/review/audit.md', '/review/run-evidence.json',
  '/review/source-review.md']) {
  assert.equal(routes.find(item => item.path === path)?.status, 200,
    `${path} final route unavailable`);
}
const presentationFiles = [];
for (const path of ['evidence/gate-7/results.html',
  'evidence/gate-7/GATE_7_PACKET.md', 'evidence/gate-7/run-evidence.json',
  'audit/gate-7/AUDIT.md']) {
  const bytes = await readFile(join(root, path));
  presentationFiles.push({path, bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex')});
}
const output = {
  kind: 'gate-7-independent-final-check-outputs',
  checkedAtUtc: new Date().toISOString(),
  nodeVersion: process.version,
  nodeExecutable: process.execPath,
  runId: 'G7-INTERPRET-002',
  coreManifestSha256: '633f7c56a33ac1c64f49965ecca028a6f2b62fbb3e70f14f96dd9232bff10779',
  presentationFiles,
  commands: results,
  allPassed: true,
  interpretationLimit: 'Synthetic software/model checks; no human participant or comprehension inference.',
};
await writeFile(join(auditDir, 'final-checks.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({path: 'audit/gate-7/final-checks.json',
  commands: results.length, allPassed: true}, null, 2));
