#!/usr/bin/env node
// Independent, dependency-free, disposable reproduction of the packaged materials CLI.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const revision = resolve(import.meta.dirname, '..');
const project = resolve(revision, '../..');
const previous = join(project, 'preparation/materials-v1');
const original = join(revision, 'package-candidate-004');
const evidence = join(revision, 'evidence/audit');
mkdirSync(evidence, { recursive: true });
const probes = mkdtempSync(join(evidence, 'probes-'));
const log = { schemaVersion: 'independent-materials-cli-audit/1', createdAtUtc: new Date().toISOString(), node: process.version, executable: process.execPath, platform: process.platform, architecture: process.arch, probes, commands: [], assertions: {}, errors: [] };
const hash = data => createHash('sha256').update(data).digest('hex');
const bytes = path => readFileSync(path);
const digest = path => hash(bytes(path));
function inventory(dir, prefix = '') {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? inventory(join(dir, item.name), `${prefix}${item.name}/`) : [`${prefix}${item.name}`]).sort();
}
function snapshot(dir) { return Object.fromEntries(inventory(dir).map(path => [path, { bytes: bytes(join(dir, path)).length, sha256: digest(join(dir, path)) }])); }
function stage(name, withDesign = true) {
  const root = join(probes, name); mkdirSync(root);
  cpSync(join(original, 'builder-tooling'), join(root, 'tooling'), { recursive: true });
  if (withDesign) cpSync(join(original, 'research-team/design'), join(root, 'design'), { recursive: true });
  return root;
}
function run(name, args, timeout = 30000) {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout });
  const item = { name, executable: process.execPath, args, exitCode: result.status, signal: result.signal, stdout: result.stdout ?? '', stderr: result.stderr ?? '', spawnError: result.error?.message ?? null };
  log.commands.push(item); return item;
}
function pass(item, marker) { assert.equal(item.exitCode, 0, `${item.name}: ${item.stderr}`); assert.equal(item.stderr, ''); assert.ok(item.stdout.includes(marker), `${item.name}: absent marker`); }
function fails(item, pattern) { assert.notEqual(item.exitCode, 0, `${item.name}: falsely succeeded`); assert.match(item.stderr, pattern, `${item.name}: unhelpful diagnostic`); }
function checkManifest(dir, expectedDigest) {
  const manifestPath = join(dir, 'MANIFEST.json');
  assert.ok(existsSync(manifestPath), `missing ${manifestPath}`);
  assert.equal(digest(manifestPath), expectedDigest);
  const manifest = JSON.parse(bytes(manifestPath));
  assert.equal(manifest.schemaVersion, 'materials-package-manifest-v1');
  const actual = snapshot(dir);
  assert.equal(Object.keys(actual).length, 72);
  assert.deepEqual(Object.keys(actual).sort(), [...manifest.files.map(row => row.path), 'MANIFEST.json'].sort());
  for (const row of manifest.files) assert.deepEqual(actual[row.path], { bytes: row.bytes, sha256: row.sha256 }, row.path);
  return actual;
}
async function main() {
  const expectedDigest = '66c2343ea244d5e8946b7a6841520c9af5d7361c74b358c018d8733f01bdd823';
  const originalInventory = checkManifest(original, expectedDigest);
  log.assertions.original = { manifestSha256: expectedDigest, inventory: originalInventory };
  const canon = stage('canonical'); const canonEntry = join(canon, 'tooling/build-package.mjs');
  pass(run('canonical build', [canonEntry, 'build']), 'build passed: 72 files;');
  pass(run('canonical verify', [canonEntry, 'verify']), 'verify passed: 72 files;');
  const canonical = checkManifest(join(canon, 'package-candidate-004'), expectedDigest);
  assert.deepEqual(canonical, originalInventory);
  log.assertions.canonical = { manifestSha256: expectedDigest, files: Object.keys(canonical).length, byteForByteOriginal: true };

  const dir = stage('directory-target'); const dirAlias = join(probes, 'directory-alias'); symlinkSync(dir, dirAlias);
  const dirEntry = join(dirAlias, 'tooling/build-package.mjs');
  assert.notEqual(dirEntry, realpathSync(dirEntry));
  pass(run('directory symlink build', [dirEntry, 'build']), 'build passed: 72 files;');
  pass(run('directory symlink verify', [dirEntry, 'verify']), 'verify passed: 72 files;');
  assert.deepEqual(checkManifest(join(dir, 'package-candidate-004'), expectedDigest), canonical);

  const file = stage('file-target'); const fileAlias = join(probes, 'entry-alias.mjs'); symlinkSync(join(file, 'tooling/build-package.mjs'), fileAlias);
  assert.notEqual(fileAlias, realpathSync(fileAlias));
  pass(run('file symlink build', [fileAlias, 'build']), 'build passed: 72 files;');
  pass(run('file symlink verify', [fileAlias, 'verify']), 'verify passed: 72 files;');
  assert.deepEqual(checkManifest(join(file, 'package-candidate-004'), expectedDigest), canonical);
  log.assertions.symlinks = { directoryAlias: dirAlias, directoryTarget: realpathSync(dirEntry), fileAlias, fileTarget: realpathSync(fileAlias), manifestSha256: expectedDigest, inventoryEqualCanonical: true };

  const importRoot = stage('import-only'); const importAlias = join(probes, 'import-dir-alias'); symlinkSync(importRoot, importAlias);
  const modules = ['build-package.mjs', 'run-candidate.mjs', 'run-preflight.mjs', 'preview.mjs'];
  for (const [label, path] of [['real', importRoot], ['directory symlink', importAlias]]) {
    const before = snapshot(importRoot);
    const urls = modules.map(name => pathToFileURL(join(path, 'tooling', name)).href);
    const source = `const mods = await Promise.all(${JSON.stringify(urls)}.map(url => import(url))); if (typeof mods[0].validateDesign !== 'function' || typeof mods[1].assessCandidateResult !== 'function') throw Error('exports missing'); process.stdout.write('IMPORT_CONTINUED\\n')`;
    const result = run(`${label} imports`, ['--input-type=module', '-e', source], 4000);
    assert.equal(result.exitCode, 0, result.stderr); assert.equal(result.stdout, 'IMPORT_CONTINUED\n'); assert.equal(result.stderr, '');
    assert.deepEqual(snapshot(importRoot), before);
  }
  log.assertions.imports = { modulePaths: modules, realAndDirectorySymlink: true, exportsUsable: true, beforeAfterInventoryEqual: true, noChildOutputOrPreviewServer: true };

  const initial = snapshot(join(canon, 'package-candidate-004'));
  fails(run('overwrite refusal', [canonEntry, 'build']), /Refusing to overwrite candidate/);
  assert.deepEqual(snapshot(join(canon, 'package-candidate-004')), initial);
  const invalid = stage('invalid'); fails(run('invalid mode', [join(invalid, 'tooling/build-package.mjs'), 'absurd']), /Usage: node build-package/);
  assert.ok(!existsSync(join(invalid, 'package-candidate-004')));
  const missing = stage('missing', false); fails(run('missing design', [join(missing, 'tooling/build-package.mjs'), 'build']), /Missing authored design/);
  assert.ok(!existsSync(join(missing, 'package-candidate-004')));
  const verifyMissing = stage('verify-missing'); fails(run('verify missing output', [join(verifyMissing, 'tooling/build-package.mjs'), 'verify']), /ENOENT.*package-candidate-004|no such file.*package-candidate-004/i);
  const corrupt = stage('corrupt'); const corruptEntry = join(corrupt, 'tooling/build-package.mjs');
  pass(run('disposable build before corrupt', [corruptEntry, 'build']), 'build passed: 72 files;');
  writeFileSync(join(corrupt, 'package-candidate-004/review/index.html'), 'CORRUPT\n');
  fails(run('verify corrupt output', [corruptEntry, 'verify']), /deterministic bytes differ|hash\/byte mismatch/);
  log.assertions.negativeCommands = { overwriteInventoryUnchanged: true, invalidNoOutput: true, missingInputNoOutput: true, verifyMissingNonzero: true, verifyCorruptNonzero: true };

  const { assessCandidateResult } = await import(pathToFileURL(join(canon, 'tooling/run-candidate.mjs')));
  const empty = { exitCode: 0, signal: null, spawnError: null, stdout: '', stderr: '' };
  const noOp = assessCandidateResult({ build: empty, verify: empty, candidateDir: join(probes, 'absent'), candidateName: 'package-candidate-004' });
  assert.ok(noOp.errors.some(error => error.includes('success marker absent')) && noOp.errors.some(error => error.includes('root manifest absent')));
  const pretend = { ...empty, stdout: 'build passed: 72 files; candidate package-candidate-004\nverify passed: 72 files; candidate package-candidate-004\n' };
  const missingOutput = assessCandidateResult({ build: pretend, verify: pretend, candidateDir: join(probes, 'absent'), candidateName: 'package-candidate-004' });
  assert.ok(missingOutput.errors.includes('candidate root manifest absent'));
  const corruptOutput = assessCandidateResult({ build: pretend, verify: pretend, candidateDir: join(corrupt, 'package-candidate-004'), candidateName: 'package-candidate-004' });
  assert.ok(corruptOutput.errors.some(error => error.includes('hash/byte mismatch')));
  log.assertions.falseSuccessRejection = { noOp, pretendWithoutPackage: missingOutput, pretendWithCorruptPackage: corruptOutput };

  const baseline = JSON.parse(bytes(join(revision, 'baseline-contract.json')));
  assert.equal(baseline.files.length, 58);
  for (const item of baseline.files) {
    const current = join(original, item.relativeCandidatePath);
    const old = join(project, item.referencePath);
    assert.deepEqual({ bytes: bytes(current).length, sha256: digest(current) }, { bytes: item.bytes, sha256: item.sha256 }, item.relativeCandidatePath);
    assert.equal(digest(old), item.sha256, item.referencePath);
  }
  const oldDir = join(previous, 'package-candidate-003'); const old = snapshot(oldDir);
  const added = Object.keys(originalInventory).filter(path => !(path in old));
  const removed = Object.keys(old).filter(path => !(path in originalInventory));
  const changed = Object.keys(originalInventory).filter(path => path in old && originalInventory[path].sha256 !== old[path].sha256);
  assert.deepEqual(added, ['builder-tooling/cli-entry.mjs', 'builder-tooling/cli-regression.test.mjs']); assert.deepEqual(removed, []);
  assert.deepEqual(changed, ['MANIFEST.json', 'builder-tooling/README.md', 'builder-tooling/build-package.mjs', 'builder-tooling/preview.mjs', 'builder-tooling/run-candidate.mjs', 'builder-tooling/run-preflight.mjs', 'review/index.html']);
  const currentPreview = bytes(join(original, 'review/index.html')).toString();
  const previousPreview = bytes(join(oldDir, 'review/index.html')).toString();
  assert.equal(currentPreview.replaceAll('candidate 004', 'candidate 003'), previousPreview);
  log.assertions.history = { semanticPins: 58, added, removed, changed, previewOnlyIdentity: true, previousManifestSha256: digest(join(oldDir, 'MANIFEST.json')) };

  const prior = spawnSync('python3', [join(previous, 'verify-frozen.py')], { cwd: project, encoding: 'utf8' });
  log.commands.push({ name: 'prior frozen manifest verification', executable: 'python3', args: [join(previous, 'verify-frozen.py')], exitCode: prior.status, stdout: prior.stdout, stderr: prior.stderr });
  assert.equal(prior.status, 0, prior.stderr); const priorResult = JSON.parse(prior.stdout);
  assert.equal(priorResult.historicalEntries, 1947); assert.equal(priorResult.materialsEntries, 352); assert.equal(priorResult.pass, true);
  log.assertions.priorFrozen = priorResult;

  const regress = stage('regressions');
  for (const name of ['schema-validator.test.mjs', 'build-package.test.mjs', 'snapshot-contract.test.mjs', 'literal-attestation.test.mjs', 'cli-regression.test.mjs']) {
    const result = run(`packaged ${name}`, [join(regress, 'tooling', name)], 30000); assert.equal(result.exitCode, 0, `${name}: ${result.stderr}`);
  }
  pass(run('packaged design check', [join(regress, 'tooling/build-package.mjs'), 'check']), 'source/design and in-memory package check passed:');
  log.assertions.regressions = { packagedTestFiles: 5, designCheck: true };
}
try { await main(); log.passed = true; }
catch (error) { log.errors.push(error.stack ?? String(error)); log.passed = false; }
const outputPath = join(evidence, `independent-cli-${Date.now()}.json`);
writeFileSync(outputPath, `${JSON.stringify(log, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ outputPath, passed: log.passed, assertions: Object.keys(log.assertions), error: log.errors[0] ?? null })}\n`);
if (!log.passed) process.exitCode = 1;
