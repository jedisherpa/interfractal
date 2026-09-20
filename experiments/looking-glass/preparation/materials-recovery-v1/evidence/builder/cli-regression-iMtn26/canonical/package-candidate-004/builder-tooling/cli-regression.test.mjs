import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { sha256 } from './package-utils.mjs';
import { assessCandidateResult } from './run-candidate.mjs';

const base = resolve(import.meta.dirname, '..');
const evidenceRoot = join(base, 'evidence/builder');
mkdirSync(evidenceRoot, { recursive: true });
const caseRoot = mkdtempSync(join(evidenceRoot, 'cli-regression-'));
const results = [];
const node = process.execPath;
function stage(name) {
  const root = join(caseRoot, name);
  mkdirSync(root, { recursive: true });
  cpSync(join(base, 'tooling'), join(root, 'tooling'), { recursive: true });
  cpSync(join(base, 'design'), join(root, 'design'), { recursive: true });
  return root;
}
function run(name, args, timeout = 30000) {
  const result = spawnSync(node, args, { encoding: 'utf8', timeout });
  const item = { name, executable: node, args, exitCode: result.status, signal: result.signal, stdout: result.stdout ?? '', stderr: result.stderr ?? '', spawnError: result.error?.message ?? null };
  results.push(item);
  return item;
}
function built(root, result) {
  const manifest = join(root, 'package-candidate-004/MANIFEST.json');
  assert.equal(result.exitCode, 0, `${result.name}: ${result.stderr}`);
  assert.match(result.stdout, /build passed: \d+ files/);
  assert.ok(existsSync(manifest), `${result.name}: manifest absent`);
  return sha256(readFileSync(manifest));
}
let failed = null;
try {
  const canonical = stage('canonical');
  const canonicalEntry = join(canonical, 'tooling/build-package.mjs');
  assert.equal(run('canonical check', [canonicalEntry, 'check']).exitCode, 0);
  const canonicalHash = built(canonical, run('canonical build', [canonicalEntry, 'build']));
  assert.equal(run('canonical verify', [canonicalEntry, 'verify']).exitCode, 0);
  const overwrite = run('existing target refuses overwrite', [canonicalEntry, 'build']);
  assert.notEqual(overwrite.exitCode, 0);
  assert.match(overwrite.stderr, /Refusing to overwrite candidate/);
  assert.equal(sha256(readFileSync(join(canonical, 'package-candidate-004/MANIFEST.json'))), canonicalHash);

  const dirTarget = stage('directory-target');
  const dirAlias = join(caseRoot, 'directory-symlink');
  symlinkSync(dirTarget, dirAlias, 'dir');
  const dirEntry = join(dirAlias, 'tooling/build-package.mjs');
  assert.notEqual(dirEntry, resolve(dirTarget, 'tooling/build-package.mjs'));
  assert.equal(built(dirTarget, run('symlinked directory build', [dirEntry, 'build'])), canonicalHash);
  assert.equal(run('symlinked directory verify', [dirEntry, 'verify']).exitCode, 0);

  const fileTarget = stage('file-target');
  const fileAlias = join(caseRoot, 'file-symlink.mjs');
  symlinkSync(join(fileTarget, 'tooling/build-package.mjs'), fileAlias, 'file');
  assert.equal(built(fileTarget, run('symlinked file build', [fileAlias, 'build'])), canonicalHash);
  assert.equal(run('symlinked file verify', [fileAlias, 'verify']).exitCode, 0);

  const invalid = stage('invalid-command');
  const invalidResult = run('invalid command fails', [join(invalid, 'tooling/build-package.mjs'), 'not-a-mode']);
  assert.notEqual(invalidResult.exitCode, 0);
  assert.ok(!existsSync(join(invalid, 'package-candidate-004')));

  const imported = stage('import-only');
  const modules = ['build-package.mjs', 'run-candidate.mjs', 'run-preflight.mjs', 'preview.mjs'];
  const source = `await Promise.all(${JSON.stringify(modules.map(name => pathToFileURL(join(imported, 'tooling', name)).href))}.map(url => import(url))); process.stdout.write('IMPORT_OK\\n');`;
  const importResult = run('normal imports have no output artifacts or server', ['--input-type=module', '-e', source], 4000);
  assert.equal(importResult.exitCode, 0, importResult.stderr);
  assert.equal(importResult.stdout.trim(), 'IMPORT_OK');
  assert.ok(!existsSync(join(imported, 'package-candidate-004')));
  assert.ok(!existsSync(join(imported, 'evidence')));

  const noOutput = join(caseRoot, 'no-op-child-output');
  const noOp = { exitCode: 0, stdout: '', stderr: '', signal: null, spawnError: null };
  const noOpAssessment = assessCandidateResult({ build: noOp, verify: noOp, candidateDir: noOutput, candidateName: 'package-candidate-004' });
  assert.ok(noOpAssessment.errors.some(error => error.includes('root manifest absent')));
  assert.ok(noOpAssessment.errors.some(error => error.includes('success marker absent')));
  results.push({ name: 'no-op child exit zero rejected', assessmentErrors: noOpAssessment.errors });
  const fakeSuccess = { ...noOp, stdout: 'build passed: 73 files; candidate package-candidate-004\nverify passed: 73 files; candidate package-candidate-004\n' };
  const fakeAssessment = assessCandidateResult({ build: fakeSuccess, verify: fakeSuccess, candidateDir: noOutput, candidateName: 'package-candidate-004' });
  assert.ok(fakeAssessment.errors.includes('candidate root manifest absent'));
  results.push({ name: 'fake success without artifacts rejected', assessmentErrors: fakeAssessment.errors });
  results.push({ name: 'deterministic manifest identity', sha256: canonicalHash });
} catch (error) {
  failed = error.stack ?? String(error);
} finally {
  const path = join(caseRoot, 'RESULTS.json');
  writeFileSync(path, `${JSON.stringify({ schemaVersion: 'materials-cli-regression/1', source: 'synthetic engineering checks; no research outputs', results, failure: failed }, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`CLI regression evidence: ${path}\n`);
}
if (failed) throw new Error(failed);
process.stdout.write('CLI canonical/symlink/import/failure checks passed\n');
