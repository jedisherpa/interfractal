#!/usr/bin/env node
// One-shot generation with retained actual outputs and an independent artifact check.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { sha256, verifyFiles } from './package-utils.mjs';
import { isDirectEntry } from './cli-entry.mjs';

function allFiles(folder, prefix = '') {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const relative = `${prefix}${entry.name}`;
    return entry.isDirectory() ? allFiles(join(folder, entry.name), `${relative}/`) : [relative];
  }).sort();
}

// Exposed for a no-op child regression: exit 0 is insufficient without real files.
export function assessCandidateResult({ build, verify, candidateDir, candidateName }) {
  const errors = [];
  for (const [mode, result] of [['build', build], ['verify', verify]]) {
    if (!result || result.exitCode !== 0 || result.spawnError || result.signal) errors.push(`${mode}: child did not finish successfully`);
    if (!result?.stdout?.includes(`${mode} passed: `) || !result.stdout.includes(`candidate ${candidateName}`)) errors.push(`${mode}: required success marker absent`);
  }
  const manifestPath = join(candidateDir, 'MANIFEST.json');
  if (!existsSync(manifestPath)) return { errors: [...errors, 'candidate root manifest absent'], manifestSha256: null, fileCount: 0 };
  let manifest;
  try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); }
  catch (error) { return { errors: [...errors, `candidate root manifest invalid: ${error.message}`], manifestSha256: null, fileCount: 0 }; }
  const entries = manifest.files;
  if (manifest.schemaVersion !== 'materials-package-manifest-v1' || !Array.isArray(entries) || entries.length < 69) errors.push('candidate root manifest has wrong schema or incomplete inventory');
  const required = [
    'builder-tooling/build-package.mjs', 'builder-tooling/run-candidate.mjs',
    'research-team/design/world.json', 'research-team/design/DESIGN_FREEZE.json',
    'transfer-phase-bound/withheld-tasks.json', 'review/index.html',
    ...['A1', 'A2', 'A3', 'A4'].flatMap(id => [`participants/${id}/world.json`, `participants/${id}/MANIFEST.json`]),
  ];
  const listed = new Set(Array.isArray(entries) ? entries.map(item => item.path) : []);
  for (const path of required) if (!listed.has(path)) errors.push(`required file absent from manifest: ${path}`);
  const actual = allFiles(candidateDir);
  const expected = new Set([...listed, 'MANIFEST.json']);
  if (actual.length !== expected.size || actual.some(path => !expected.has(path))) errors.push('candidate file inventory differs from root manifest');
  if (Array.isArray(entries)) errors.push(...verifyFiles(candidateDir, entries));
  return { errors, manifestSha256: sha256(readFileSync(manifestPath)), fileCount: actual.length };
}

function main() {
  const base = resolve(import.meta.dirname, '..');
  const evidence = join(base, 'evidence/builder');
  const candidateName = 'package-candidate-004';
  const candidateDir = join(base, candidateName);
  const outputPath = join(evidence, 'candidate-build-004.json');
  const preflightPath = join(evidence, 'preflight-001.json');
  if (existsSync(outputPath)) throw new Error(`Refusing to overwrite ${outputPath}`);
  if (existsSync(candidateDir)) throw new Error(`Refusing to overwrite ${candidateDir}`);
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
  const assessment = assessCandidateResult({ build, verify, candidateDir, candidateName });
  const report = {
    schemaVersion: 'materials-candidate-build/2', candidate: candidateName,
    preflightSha256: sha256(readFileSync(preflightPath)), build, verify,
    candidateManifestSha256: assessment.manifestSha256,
    candidateFileCount: assessment.fileCount,
    assessmentErrors: assessment.errors,
    allPassed: assessment.errors.length === 0,
  };
  mkdirSync(evidence, { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`Saved ${outputPath}\n`);
  for (const result of [build, verify].filter(Boolean)) process.stdout.write(`${result.mode}: exit=${result.exitCode} stdout=${JSON.stringify(result.stdout.trim())} stderr=${JSON.stringify(result.stderr.trim())}\n`);
  for (const error of assessment.errors) process.stderr.write(`${error}\n`);
  if (!report.allPassed) process.exitCode = 1;
}

if (isDirectEntry(import.meta.url)) main();
