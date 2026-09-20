import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// This oracle deliberately imports no interpretation/ implementation file.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const freezePath = 'docs/gate-7/PRESPEC_FREEZE.json';
const freezeHash = '8abb6366f27a42590c89365c4d1f019e5c350dee90bfff77290cdd4783b1469f';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = await readFile(resolve(root, freezePath));
assert.equal(sha256(bytes), freezeHash, 'prespec freeze manifest changed');
const freeze = JSON.parse(bytes);
assert.equal(freeze.gate, 7);
assert.equal(freeze.files.length, 6);
for (const file of freeze.files) {
  const body = await readFile(resolve(root, file.path));
  assert.equal(sha256(body), file.sha256, `${file.path} changed`);
  assert.equal(body.length, file.bytes, `${file.path} size changed`);
}
const fixture = JSON.parse(await readFile(resolve(root, 'docs/gate-7/task-fixture.json')));
const key = JSON.parse(await readFile(resolve(root, 'docs/gate-7/private-answer-key.json')));
const predictions = JSON.parse(await readFile(resolve(root, 'docs/gate-7/independent-predictions.json')));
const tasks = new Map(fixture.tasks.map(task => [task.id, task]));
const answers = new Map(key.answers.map(answer => [answer.taskId, answer]));
const tolerance = 1e-10;
const near = (actual, expected, label) => assert.ok(
  Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
  `${label}: ${actual} != ${expected}`,
);
const degrees = angle => angle * Math.PI / 180;
const observationMatrix = (dimension, alphaDegrees, betaDegrees = 0) => {
  const alpha = degrees(alphaDegrees), beta = degrees(betaDegrees);
  return dimension === 4
    ? [[Math.cos(alpha), 0, 0, -Math.sin(alpha)], [0, 1, 0, 0], [0, 0, 1, 0]]
    : [[Math.cos(alpha), 0, 0, -Math.sin(alpha), 0],
       [0, Math.cos(beta), 0, 0, -Math.sin(beta)], [0, 0, 1, 0, 0]];
};
const multiply = (matrix, point) => matrix.map(row => row.reduce((sum, value, i) => sum + value * point[i], 0));
const matrixRank = input => {
  const matrix = input.map(row => [...row]);
  let rank = 0;
  for (let column = 0; column < matrix[0].length; column++) {
    const pivot = matrix.findIndex((row, index) => index >= rank && Math.abs(row[column]) > tolerance);
    if (pivot < 0) continue;
    [matrix[rank], matrix[pivot]] = [matrix[pivot], matrix[rank]];
    const denominator = matrix[rank][column];
    for (let j = column; j < matrix[rank].length; j++) matrix[rank][j] /= denominator;
    for (let i = 0; i < matrix.length; i++) {
      if (i === rank) continue;
      const factor = matrix[i][column];
      for (let j = column; j < matrix[i].length; j++) matrix[i][j] -= factor * matrix[rank][j];
    }
    rank++;
  }
  return rank;
};
const checkPoint = (taskId, source, pointId, dimension) => {
  const task = tasks.get(taskId);
  const rows = [];
  for (const frame of task.frames) {
    const matrix = observationMatrix(dimension, frame.parameters.alphaDegrees, frame.parameters.betaDegrees ?? 0);
    const observed = frame.points.find(point => point.id === pointId)?.xyz;
    assert.ok(observed, `${taskId}/${frame.id} missing ${pointId}`);
    const expected = multiply(matrix, source);
    expected.forEach((value, i) => near(observed[i], value, `${taskId}/${frame.id}/${pointId}/${i}`));
    rows.push(...matrix);
  }
  return matrixRank(rows);
};

assert.equal(tasks.size, 8);
assert.equal(answers.size, 8);
assert.deepEqual([...tasks.keys()], Array.from({ length: 8 }, (_, i) => `Q0${i + 1}`));
for (const task of tasks.values()) {
  const answer = answers.get(task.id);
  assert.ok(answer, `${task.id} missing key`);
  assert.ok(task.options.some(option => option.id === answer.choiceId), `${task.id} key not offered`);
  assert.equal(answer.choiceId, predictions.tasks[task.id].expectedChoice, `${task.id} key/prediction disagreement`);
  assert.equal(new Set(task.options.map(option => option.id)).size, task.options.length, `${task.id} duplicate choice`);
}
assert.ok(!/privateDerivation|expectedChoice|correctChoice|recoveredV|stackedRank/.test(JSON.stringify(fixture)), 'private data in public fixture');

const q1 = answers.get('Q01').privateDerivation;
assert.equal(checkPoint('Q01', q1.K, 'K', 4), 4);
assert.equal(checkPoint('Q01', q1.M, 'M', 4), 4);
near(q1.K[3], -0.8, 'Q01 w');
const q2 = answers.get('Q02').privateDerivation;
assert.equal(checkPoint('Q02', q2.compatibleSources[0], 'N', 4), 3);
assert.equal(checkPoint('Q02', q2.compatibleSources[1], 'N', 4), 3);
assert.notEqual(q2.compatibleSources[0][3], q2.compatibleSources[1][3]);
const q3 = answers.get('Q03').privateDerivation;
assert.equal(checkPoint('Q03', q3.sourceForCalculation, 'P', 5), 4);
assert.equal(checkPoint('Q03', q3.alternativeSource, 'P', 5), 4);
assert.ok(q3.sourceForCalculation[4] * q3.alternativeSource[4] < 0, 'Q03 opposite v signs');
const q4 = answers.get('Q04').privateDerivation;
assert.equal(checkPoint('Q04', q4.sourceForCalculation, 'R', 5), 5);
near(q4.sourceForCalculation[4], predictions.tasks.Q04.recoveredV, 'Q04 recovered v');
assert.ok(q4.sourceForCalculation[4] < 0);

const q5 = tasks.get('Q05');
assert.equal(q5.frames.length, 3);
for (const frame of q5.frames) {
  const radicand = 1.2 ** 2 - (frame.parameters.sliceW - 0.3) ** 2;
  const expectedKind = radicand < -tolerance ? 'empty' : Math.abs(radicand) <= tolerance ? 'point' : 'ball';
  assert.equal(frame.slice.kind, expectedKind, `Q05/${frame.id} kind`);
  near(frame.slice.radius, Math.sqrt(Math.max(0, radicand)), `Q05/${frame.id} radius`);
  assert.equal(frame.projection.kind, 'ball');
  near(frame.projection.radius, 1.2, `Q05/${frame.id} projection`);
}
const heldOut = predictions.tasks.Q05.heldOutSetting;
assert.ok(!q5.frames.some(frame => frame.parameters.sliceW === heldOut), 'Q05 answer frame exposed');
assert.ok(1.2 ** 2 - (heldOut - 0.3) ** 2 < -tolerance, 'Q05 held-out slice not empty');

const q6 = tasks.get('Q06');
assert.ok(q6.frames.every(frame => Object.keys(frame.parameters).length === 0));
for (const [s, t] of answers.get('Q06').privateDerivation.compatibleSettings) {
  near(Math.sqrt(1 - s ** 2 - t ** 2), 0.6, 'Q06 witness radius');
}

const q7 = tasks.get('Q07');
assert.equal(q7.frames.length, 1);
assert.equal(q7.frames[0].records, undefined);
assert.ok(q7.frames[0].contexts.every(context => context.requiredCosts === undefined));
const witness = answers.get('Q07').privateDerivation.witnessCosts;
assert.deepEqual(Object.keys(witness).sort(), ['worldA', 'worldB']);
for (const context of ['Oak', 'Jetty']) {
  assert.equal(typeof witness.worldA[context], 'number');
  assert.equal(typeof witness.worldB[context], 'number');
  assert.notEqual(witness.worldA[context] <= 6, witness.worldB[context] <= 6,
    `Q07 ${context} outcomes must differ across compatible cost completions`);
}
const q8 = tasks.get('Q08');
const q8Expected = predictions.tasks.Q08;
for (const [index, frame] of q8.frames.entries()) {
  assert.deepEqual(frame.records, q8.frames[0].records, 'Q08 source records changed');
  for (const record of frame.records) {
    const total = record.requiredCosts.reduce((sum, item) => sum + item.tokens, 0);
    assert.equal(total, q8Expected.totals[record.contextId], `Q08/${record.contextId} cost`);
    const passes = record.capacity >= frame.receiver.capacityMin && total <= frame.receiver.budgetMax;
    assert.equal(passes, q8Expected.receiverResults[index][record.contextId], `Q08/${frame.id}/${record.contextId} receiver`);
  }
}
assert.deepEqual(predictions.canonicalReplay.checkpoints.map(item => item.timeSeconds), [0, 6, 12, 18, 24, 30, 36, 42, 48]);
assert.equal(predictions.canonicalReplay.durationSeconds, 48);
assert.ok(predictions.canonicalReplay.checkpoints.every(item => item.answerCount === 0 && item.revealed === false));

console.log(JSON.stringify({ kind: 'gate-7-independent-prespec-oracle', prespecSha256: freezeHash,
  tasksChecked: tasks.size, checks: ['freeze-hashes', 'answer-mapping', 'point-projections', 'matrix-ranks',
    'ambiguity-witnesses', 'slice-kinds', 'held-out-question', 'attention-records-and-rules', 'tour-checkpoints'],
  allPassed: true }, null, 2));
