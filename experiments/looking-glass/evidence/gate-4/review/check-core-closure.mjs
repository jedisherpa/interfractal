import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const closure = JSON.parse(await readFile(resolve(root, 'evidence/gate-4/core-evidence-closure.json')));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const entries = [];
for (const file of closure.files) {
  const bytes = await readFile(resolve(root, file.path));
  entries.push({ path: file.path, pass: bytes.length === file.bytes && hash(bytes) === file.sha256 });
}
const result = { kind: 'closed-core-evidence-byte-audit', closedAtUtc: closure.closedAtUtc,
  runId: closure.runId, buildId: closure.buildId, entryCount: entries.length,
  failures: entries.filter(e => !e.pass), counts: closure.counts,
  pass: entries.length === 27 && entries.every(e => e.pass) };
await writeFile(resolve(root, 'audit/gate-4/core-closure-integrity.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
if (!result.pass) process.exitCode = 1;
