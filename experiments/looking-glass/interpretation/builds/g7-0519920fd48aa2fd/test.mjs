import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {dirname, join, resolve, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {RUN_ID, DURATION_MS, CHECKPOINTS_MS, clampTime, tourAt,
  publicFixture, validateFixture} from './model.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const root = basename(dirname(dir)) === 'builds' ? resolve(dir, '../../..') : resolve(dir, '..');
const exists = path => access(path).then(() => true, () => false);
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const close = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) <= tolerance,
  `${a} differs from ${b}`);
const publicData = await readJson(join(dir, 'public-cases.json'));
const keyPath = await exists(join(dir, 'private-answer-key.json'))
  ? join(dir, 'private-answer-key.json') : join(root, 'docs/gate-7/private-answer-key.json');
const predictionPath = await exists(join(dir, 'independent-predictions.json'))
  ? join(dir, 'independent-predictions.json') : join(root, 'docs/gate-7/independent-predictions.json');
const key = await readJson(keyPath), expected = await readJson(predictionPath);
validateFixture(publicData, key);
assert.equal(RUN_ID, 'G7-INTERPRET-001'); assert.equal(DURATION_MS, 48000);
assert.deepEqual(CHECKPOINTS_MS, [0,6000,12000,18000,24000,30000,36000,42000,48000]);
assert.equal(clampTime(6050), 6100);
for (const bad of [NaN, Infinity, -Infinity]) assert.throws(() => clampTime(bad));
const fixturePath = join(root, 'docs/gate-7/task-fixture.json');
if (await exists(fixturePath)) {
  const source = await readJson(fixturePath);
  assert.deepEqual(publicFixture(source), publicData);
}
const tasks = Object.fromEntries(publicData.tasks.map(t => [t.id, t]));
const expectedIds = publicData.tasks.map(t => t.id);
assert.deepEqual(expectedIds, ['Q01','Q02','Q03','Q04','Q05','Q06','Q07','Q08']);
for (const task of publicData.tasks) {
  assert.equal(key.answers.find(a => a.taskId === task.id).choiceId,
    expected.tasks[task.id].expectedChoice);
  assert.equal(new Set(task.options.map(o => o.id)).size, task.options.length);
  for (const frame of task.frames) assert.ok(frame.id && !Object.hasOwn(frame, 'answer'));
  assert.equal(new Set(task.frames.map(frame => frame.id)).size, task.frames.length);
}
const publicText = JSON.stringify(publicData);
for (const forbidden of ['privateDerivation', 'correctChoice', 'expectedChoice',
  'recoveredV', 'stackedRank', 'compatibleSources', 'sourceForCalculation'])
  assert.ok(!publicText.includes(forbidden), `${forbidden} leaked into public fixture`);
assert.ok(!publicText.includes(key.answers[0].explanation));

const d = angle => angle * Math.PI / 180;
const point = (taskId, frameIndex, id) => tasks[taskId].frames[frameIndex].points.find(p => p.id === id).xyz;
const pointIds = tasks.Q01.frames[0].points.map(p => p.id);
assert.deepEqual(pointIds, ['K','M']);
for (const id of pointIds) {
  const source = key.answers[0].privateDerivation[id];
  for (const frame of tasks.Q01.frames) {
    const projected = frame.points.find(p => p.id === id).xyz;
    close(projected[0], source[0] * Math.cos(d(frame.parameters.alphaDegrees)) -
      source[3] * Math.sin(d(frame.parameters.alphaDegrees)));
    close(projected[1], source[1]); close(projected[2], source[2]);
  }
}
const q1f1 = tasks.Q01.frames[0], q1f2 = tasks.Q01.frames[1];
const a1 = Math.cos(d(q1f1.parameters.alphaDegrees)), b1 = -Math.sin(d(q1f1.parameters.alphaDegrees));
const a2 = Math.cos(d(q1f2.parameters.alphaDegrees)), b2 = -Math.sin(d(q1f2.parameters.alphaDegrees));
const determinant = a1 * b2 - a2 * b1;
assert.ok(Math.abs(determinant) > .5);
const recoveredW = (a1 * point('Q01',1,'K')[0] - a2 * point('Q01',0,'K')[0]) / determinant;
close(recoveredW, expected.tasks.Q01.source[3]);
assert.equal(expected.tasks.Q01.stackedRank, 4);

const q2 = tasks.Q02;
assert.equal(new Set(q2.frames.map(f => f.parameters.alphaDegrees)).size, 1);
assert.equal(new Set(q2.frames.map(f => JSON.stringify(f.points))).size, 1);
assert.equal(new Set(q2.frames.map(f => f.displayCamera.yawDegrees)).size, 3);
for (const source of key.answers[1].privateDerivation.compatibleSources) {
  const frame = q2.frames[0], observed = frame.points[0].xyz;
  close(source[0] * Math.cos(d(frame.parameters.alphaDegrees)) -
    source[3] * Math.sin(d(frame.parameters.alphaDegrees)), observed[0]);
}
assert.equal(expected.tasks.Q02.stackedRank, 3);

for (const taskId of ['Q03','Q04']) {
  const t = tasks[taskId], source = key.answers.find(a => a.taskId === taskId)
    .privateDerivation.sourceForCalculation;
  for (const frame of t.frames) {
    const p = frame.points[0].xyz, alpha = d(frame.parameters.alphaDegrees), beta = d(frame.parameters.betaDegrees);
    close(p[0], source[0] * Math.cos(alpha) - source[3] * Math.sin(alpha));
    close(p[1], source[1] * Math.cos(beta) - source[4] * Math.sin(beta));
    close(p[2], source[2]);
  }
}
assert.ok(tasks.Q03.frames.every(frame => frame.parameters.betaDegrees === 0));
const q3alternative = key.answers[2].privateDerivation.alternativeSource;
for (const frame of tasks.Q03.frames)
  close(frame.points[0].xyz[1], q3alternative[1]);
assert.equal(expected.tasks.Q03.stackedRank, 4);
const q4zero = tasks.Q04.frames.find(f => f.parameters.betaDegrees === 0);
const q4nonzero = tasks.Q04.frames.find(f => f.parameters.betaDegrees !== 0);
const recoveredV = (q4zero.points[0].xyz[1] * Math.cos(d(q4nonzero.parameters.betaDegrees)) -
  q4nonzero.points[0].xyz[1]) / Math.sin(d(q4nonzero.parameters.betaDegrees));
close(recoveredV, expected.tasks.Q04.recoveredV);
assert.equal(expected.tasks.Q04.stackedRank, 5);

const q5 = tasks.Q05;
assert.deepEqual(q5.frames.map(f => f.parameters.sliceW), [0.3,0.9,1.5]);
for (const frame of q5.frames) {
  const r2 = 1.2 ** 2 - (frame.parameters.sliceW - 0.3) ** 2;
  const expectedKind = r2 < -1e-10 ? 'empty' : Math.abs(r2) <= 1e-10 ? 'point' : 'ball';
  assert.equal(frame.slice.kind, expectedKind);
  if (expectedKind === 'ball') close(frame.slice.radius, Math.sqrt(r2));
  else if (expectedKind === 'point') close(frame.slice.radius, 0);
  close(frame.projection.radius, 1.2);
}
assert.equal(1.2 ** 2 - (1.8 - 0.3) ** 2 < 0, true);
assert.ok(!q5.frames.some(f => f.parameters.sliceW === 1.8));
const q6 = tasks.Q06;
assert.ok(q6.frames.every(f => Object.keys(f.parameters).length === 0 && f.slice.radius === .6));
for (const [s,t] of key.answers[5].privateDerivation.compatibleSettings)
  close(Math.sqrt(1 - s*s - t*t), .6);
assert.ok(!JSON.stringify(q6.frames).includes('0.48'));

const q7 = tasks.Q07.frames[0];
assert.equal(q7.detailLevel, 'summary-only');
assert.ok(!Object.hasOwn(q7, 'records'));
assert.deepEqual(q7.contexts.map(c => c.id), ['Oak','Jetty']);
assert.ok(q7.contexts.every(c => Object.keys(c.outwardSummary).length === 1));
const q8 = tasks.Q08;
assert.deepEqual(q8.frames.map(f => f.id), ['F1','F2','F3']);
assert.deepEqual(q8.frames.map(f => f.referenceId),
  ['capacity60@1','existing-access@1','capacity60@1']);
const sourceRecords = q8.frames[0].records;
for (const frame of q8.frames) assert.deepEqual(frame.records, sourceRecords);
assert.deepEqual(sourceRecords.map(r => r.contextId), ['Cedar','Quay']);
const totals = Object.fromEntries(sourceRecords.map(r =>
  [r.contextId, r.requiredCosts.reduce((sum, c) => sum + c.tokens, 0)]));
assert.deepEqual(totals, expected.tasks.Q08.totals);
for (let i = 0; i < q8.frames.length; i++) {
  const frame = q8.frames[i];
  const result = Object.fromEntries(sourceRecords.map(r => [r.contextId,
    r.capacity >= frame.receiver.capacityMin && totals[r.contextId] <= frame.receiver.budgetMax]));
  assert.deepEqual(result, expected.tasks.Q08.receiverResults[i]);
}
for (const [i, ms] of CHECKPOINTS_MS.entries()) {
  const state = tourAt(ms), prediction = expected.canonicalReplay.checkpoints[i];
  assert.equal(state.taskId, prediction.taskId); assert.equal(state.condition, prediction.condition);
  assert.equal(state.frameIndex, prediction.frameIndex);
  assert.equal(state.answerCount, 0); assert.equal(state.revealed, false);
}
assert.equal(tourAt(44_000).frameIndex, 1);
assert.equal(tourAt(46_000).frameIndex, 2);
const results = {
  schema: 'gate7-computational-results-v1', status: 'passed',
  provenance: 'software_validation; source/key-informed model checks, not visual comprehension',
  checkGroups: ['fixture/key identity', 'public fixture isolation', '4D recovery and camera ambiguity',
    '5D hidden and revealed coordinate', '4D ball projection/slice and held-out setting',
    '5D equal-radius ambiguity', 'reference summary insufficiency',
    'reference and receiver calculations', 'nine deterministic tour checkpoints'],
  taskCount: 8, humanParticipantCount: 0, score: null
};
process.stdout.write(JSON.stringify(results));
