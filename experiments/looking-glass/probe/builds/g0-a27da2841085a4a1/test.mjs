import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCE, EDGES, RUN_ID, CHECKPOINTS_MS, CAMERA, modelAt, project, canonicalState } from './model.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const runDir = join(dir,'runs',RUN_ID);
const run = JSON.parse(await readFile(join(runDir,'run.json'),'utf8'));
const checkpoints = JSON.parse(await readFile(join(runDir,'checkpoints.json'),'utf8'));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const near = (actual,expected) => assert.ok(Math.abs(actual-expected) < 1e-10, `${actual} ≠ ${expected}`);

assert.equal(SOURCE.length,8);
assert.equal(new Set(SOURCE.map(v=>v.id)).size,8);
assert.equal(EDGES.length,12);
assert.equal(new Set(EDGES.map(e=>e.id)).size,12);
for (const edge of EDGES) assert.equal([...edge.from.slice(1)].filter((bit,i)=>bit!==edge.to[i+1]).length,1);
assert.deepEqual(CHECKPOINTS_MS,[0,10_000,20_000]);
assert.equal(run.runId,RUN_ID);
assert.equal(run.buildId,`g0-${run.sourceSha256.slice(0,16)}`);

// Independently evaluate the marked corner's declared column-vector camera equations.
for (const [index,t] of CHECKPOINTS_MS.entries()) {
  const s = modelAt(t);
  const v = s.vertices.find(v=>v.id==='v111');
  const yaw = Math.PI/6 + (Math.PI/6)*(t/20_000);
  const pitch = Math.PI/9;
  const expectedX = Math.cos(yaw)+Math.sin(yaw);
  const expectedZ1 = -Math.sin(yaw)+Math.cos(yaw);
  const expectedY = Math.cos(pitch)-Math.sin(pitch)*expectedZ1;
  near(v.screen[0],expectedX);
  near(v.screen[1],-expectedY);
  near(s.camera.yaw,yaw);
  assert.deepEqual(v.source,[1,1,1]);
  assert.equal(s.vertices.length,8);
  assert.equal(s.edges.length,12);
  assert.deepEqual(s,checkpoints[index].state);
  assert.equal(sha256(canonicalState(s)),checkpoints[index].stateSha256);
}
assert.equal(sha256(canonicalState(modelAt(0))),run.initialStateHash);
assert.deepEqual(modelAt(10_000),modelAt(10_000));
assert.deepEqual(modelAt(0,Math.PI/2).vertices.map(v=>v.source),modelAt(0).vertices.map(v=>v.source));
assert.notDeepEqual(project([1,1,1],modelAt(0).camera).screen,project([1,1,1],modelAt(20_000).camera).screen);

const buildDir = join(dir,'builds',run.buildId);
const build = JSON.parse(await readFile(join(buildDir,'build.json'),'utf8'));
const digest = createHash('sha256');
for (const entry of build.sourceFiles) {
  const bytes = await readFile(join(buildDir,entry.path));
  assert.equal(sha256(bytes),entry.sha256);
  digest.update(entry.path); digest.update('\0'); digest.update(bytes); digest.update('\0');
}
assert.equal(digest.digest('hex'),run.sourceSha256);
const runPath = join(runDir,'run.json');
const before = { hash:sha256(await readFile(runPath)), modified:(await stat(runPath)).mtimeMs };
const repeat = spawnSync(process.execPath,[join(dir,'build.mjs')],{encoding:'utf8'});
assert.equal(repeat.status,0,repeat.stderr);
assert.deepEqual({ hash:sha256(await readFile(runPath)), modified:(await stat(runPath)).mtimeMs },before);
console.log(`PASS ${RUN_ID}: 8 vertices, 12 edges, independent camera checkpoints, deterministic state, frozen source, immutable run`);
