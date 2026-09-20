#!/usr/bin/env node
// Save actual command results before the first immutable package candidate is built.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { sha256 } from './package-utils.mjs';

const base = resolve(import.meta.dirname, '..');
const tooling = import.meta.dirname;
const recordId = process.argv[2] ?? '001';
if (!/^\d{3}$/.test(recordId)) throw new Error('Usage: node run-preflight.mjs [three-digit-record-id]');
const node = process.execPath;
const commands = [
  ['schema-validator-unit', ['schema-validator.test.mjs']],
  ['design-mutations', ['build-package.test.mjs']],
  ['synthetic-snapshot-contract', ['snapshot-contract.test.mjs']],
  ['frozen-source-and-generated-shape', ['build-package.mjs', 'check']],
  ['generator-syntax', ['--check', 'build-package.mjs']],
  ['preview-syntax', ['--check', 'preview.mjs']],
  ['snapshot-validator-syntax', ['--check', 'snapshot-contract.mjs']],
];
const results = commands.map(([name, args]) => {
  const commandArgs = args.map(arg => arg.endsWith('.mjs') ? join(tooling, arg) : arg);
  const startedAtUtc = new Date().toISOString();
  const result = spawnSync(node, commandArgs, { cwd: base, encoding: 'utf8', timeout: 30000 });
  return {
    name, executable: node, args: commandArgs, startedAtUtc, completedAtUtc: new Date().toISOString(),
    exitCode: result.status, signal: result.signal, stdout: result.stdout ?? '', stderr: result.stderr ?? '',
    spawnError: result.error?.message ?? null,
  };
});
const output = {
  schemaVersion: 'materials-builder-preflight/1',
  preparationOnly: true,
  recordId,
  designFreezeSha256: sha256(readFileSync(join(base, 'design/DESIGN_FREEZE.json'))),
  sourceTaskFreezeSha256: sha256(readFileSync(join(base, 'design/SOURCE_TASK_FREEZE.json'))),
  results,
  allPassed: results.every(result => result.exitCode === 0 && !result.spawnError),
};
const path = join(base, 'evidence/builder', `preflight-${recordId}.json`);
mkdirSync(join(base, 'evidence/builder'), { recursive: true });
writeFileSync(path, `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`Saved ${path}\n`);
for (const result of results) process.stdout.write(`${result.name}: exit=${result.exitCode} stdout=${JSON.stringify(result.stdout.trim())} stderr=${JSON.stringify(result.stderr.trim())}\n`);
if (!output.allPassed) process.exitCode = 1;
