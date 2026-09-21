#!/usr/bin/env node
// One-shot generation with retained actual command outputs; never overwrite candidate.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { sha256 } from './package-utils.mjs';

const base = resolve(import.meta.dirname, '..');
const evidence = join(base, 'evidence/builder');
const outputPath = join(evidence, 'candidate-build-001.json');
const preflightPath = join(evidence, 'preflight-004.json');
if (existsSync(outputPath)) throw new Error(`Refusing to overwrite ${outputPath}`);
const preflight = JSON.parse(readFileSync(preflightPath, 'utf8'));
if (!preflight.allPassed) throw new Error('Successful saved preflight required before candidate build');
const node = process.execPath;
const script = join(import.meta.dirname, 'build-package.mjs');
function run(mode) {
  const startedAtUtc = new Date().toISOString();
  const result = spawnSync(node, [script, mode], { cwd: base, encoding: 'utf8', timeout: 30000 });
  return { mode, executable: node, args: [script, mode], startedAtUtc, completedAtUtc: new Date().toISOString(), exitCode: result.status, signal: result.signal, stdout: result.stdout ?? '', stderr: result.stderr ?? '', spawnError: result.error?.message ?? null };
}
const build = run('build');
const verify = build.exitCode === 0 ? run('verify') : null;
const manifestPath = join(base, 'package-candidate-001/MANIFEST.json');
const report = {
  schemaVersion: 'materials-candidate-build/1',
  candidate: 'package-candidate-001',
  preflightSha256: sha256(readFileSync(preflightPath)),
  build,
  verify,
  candidateManifestSha256: existsSync(manifestPath) ? sha256(readFileSync(manifestPath)) : null,
  allPassed: build.exitCode === 0 && verify?.exitCode === 0,
};
mkdirSync(evidence, { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`Saved ${outputPath}\n`);
for (const result of [build, verify].filter(Boolean)) process.stdout.write(`${result.mode}: exit=${result.exitCode} stdout=${JSON.stringify(result.stdout.trim())} stderr=${JSON.stringify(result.stderr.trim())}\n`);
if (!report.allPassed) process.exitCode = 1;
