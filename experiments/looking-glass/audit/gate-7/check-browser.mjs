import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Audit host-recorded actual browser observations. These files cannot by
// themselves authenticate a human participant or replace image inspection.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runId = process.argv[2] ?? 'G7-INTERPRET-002';
const run = JSON.parse(await readFile(join(root, 'interpretation/runs', runId, 'run.json')));
const fixture = JSON.parse(await readFile(join(root, 'docs/gate-7/task-fixture.json')));
const key = JSON.parse(await readFile(join(root, 'docs/gate-7/private-answer-key.json')));
const checkpoints = JSON.parse(await readFile(join(root, 'interpretation/runs', runId, 'checkpoints.json')));
const observations = JSON.parse(await readFile(join(root, 'evidence/gate-7/browser-observations.json')));
const captures = JSON.parse(await readFile(join(root, 'evidence/gate-7/capture-index.json')));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const hashObject = value => sha256(JSON.stringify(value));
const exact = value => assert.match(value, /^[a-f0-9]{64}$/);
const informationByTask = new Map();
const counts = { observations: observations.length, captures: captures.length,
  tasks: new Set(), conditions: new Set(), pristine: 0, software: 0 };

for (const [index, observation] of observations.entries()) {
  assert.equal(observation.index, index, `observation index ${index}`);
  assert.ok(Number.isFinite(Date.parse(observation.recordedAtUtc)), `observation ${index} time`);
  assert.ok(observation.url.startsWith('http://127.0.0.1:44000/'), `observation ${index} URL`);
  assert.equal(observation.viewport.width, observation.inspector.viewport.innerWidth,
    `observation ${index} viewport width`);
  assert.equal(observation.viewport.height, observation.inspector.viewport.innerHeight,
    `observation ${index} viewport height`);
  assert.equal(observation.viewport.dpr, observation.inspector.viewport.devicePixelRatio,
    `observation ${index} DPR`);
  assert.ok(observation.inspector.scene.width > 0 && observation.inspector.scene.height > 0,
    `observation ${index} scene`);
  assert.ok(observation.documentWidth <= observation.viewport.width,
    `observation ${index} horizontal overflow`);
  const { hashes, ...state } = observation.inspector;
  assert.equal(state.runId, runId, `observation ${index} run`);
  assert.equal(state.buildId, run.buildId, `observation ${index} build`);
  assert.equal(state.fixtureId, fixture.fixtureId, `observation ${index} fixture`);
  assert.ok(['unattributed_local', 'software_validation'].includes(state.actor));
  assert.equal(state.answerCount, state.responses.length);
  assert.equal(state.revealedCount, state.revealedTaskIds.length);
  assert.ok(!Object.hasOwn(state, 'availableFrames'), `observation ${index} exposes all frames`);
  const task = fixture.tasks.find(item => item.id === state.taskId);
  assert.ok(task, `observation ${index} task`);
  counts.tasks.add(task.id); counts.conditions.add(state.condition);
  if (state.actor === 'software_validation') counts.software++;
  if (state.answerCount === 0 && state.revealedCount === 0) counts.pristine++;
  assert.deepEqual(state.availableFrameIds, task.frames.map(frame => frame.id),
    `observation ${index} frame IDs`);
  assert.deepEqual(state.currentFrame, task.frames[state.frameIndex],
    `observation ${index} current frame`);
  if (state.condition === 'static') assert.deepEqual(state.displayedFrames, task.frames,
    `observation ${index} static sheet`);
  else assert.equal(state.displayedFrames, undefined,
    `observation ${index} serial/selective frame leak`);
  assert.equal(state.publicTask.prompt, task.prompt);
  assert.deepEqual(state.publicTask.availableFacts, task.availableFacts);
  assert.deepEqual(state.publicTask.options, task.options);
  const serialized = JSON.stringify(observation.inspector);
  assert.ok(!/privateDerivation|expectedChoice|sourceForCalculation|recoveredV|stackedRank/.test(serialized),
    `observation ${index} private field`);
  if (state.revealedCount === 0) for (const answer of key.answers)
    assert.ok(!observation.visibleText.includes(answer.explanation),
      `observation ${index} premature explanation`);
  for (const name of ['frameSetSha256', 'informationSha256', 'semanticSha256',
    'checkpointSha256', 'displaySha256']) exact(hashes[name]);
  assert.equal(hashes.frameSetSha256, hashObject(task.frames), `observation ${index} frames hash`);
  const information = {taskId: state.taskId, facts: state.publicTask.availableFacts,
    prompt: state.publicTask.prompt, options: state.publicTask.options, frames: task.frames};
  assert.equal(hashes.informationSha256, hashObject(information), `observation ${index} info hash`);
  const semantic = {taskId: state.taskId, selectedPointId: state.selectedPointId,
    prompt: state.publicTask.prompt, availableFacts: state.publicTask.availableFacts,
    currentFrame: state.currentFrame, availableFrameIds: state.availableFrameIds};
  assert.equal(hashes.semanticSha256, hashObject(semantic), `observation ${index} semantic hash`);
  assert.equal(hashes.displaySha256, hashObject(state), `observation ${index} display hash`);
  const checkpointBoundary = {simulationTimeMs: state.simulationTimeMs, taskId: state.taskId,
    condition: state.condition, frameIndex: state.frameIndex, answerCount: state.answerCount,
    revealed: state.revealedCount > 0, frameSetSha256: hashes.frameSetSha256};
  assert.equal(hashes.checkpointSha256, hashObject(checkpointBoundary),
    `observation ${index} checkpoint hash`);
  if (state.mode === 'saved-replay' && state.paused && state.answerCount === 0 &&
      state.revealedCount === 0 && checkpoints.some(item => item.simulationTimeMs === state.simulationTimeMs)) {
    const expected = checkpoints.find(item => item.simulationTimeMs === state.simulationTimeMs);
    assert.equal(hashes.checkpointSha256, expected.checkpointSha256,
      `observation ${index} saved checkpoint`);
    assert.equal(hashes.informationSha256, expected.informationSha256,
      `observation ${index} saved information`);
  }
  if (!informationByTask.has(task.id)) informationByTask.set(task.id, hashes.informationSha256);
  else assert.equal(hashes.informationSha256, informationByTask.get(task.id),
    `observation ${index} cross-condition information`);
}
for (const [index, capture] of captures.entries()) {
  assert.equal(capture.runId, runId, `capture ${index} run`);
  assert.equal(capture.buildId, run.buildId, `capture ${index} build`);
  assert.ok(Number.isInteger(capture.before) && Number.isInteger(capture.after));
  assert.ok(capture.before >= 0 && capture.after < observations.length && capture.before < capture.after,
    `capture ${index} observation bracket`);
  const bytes = await readFile(join(root, capture.path));
  assert.equal(sha256(bytes), capture.sha256, `capture ${index} hash`);
  assert.equal(bytes.length, capture.bytes, `capture ${index} size`);
}
console.log(JSON.stringify({ kind: 'gate-7-independent-browser-record-audit', runId,
  buildId: run.buildId, observations: counts.observations, originalCaptures: counts.captures,
  tasksSeen: [...counts.tasks], conditionsSeen: [...counts.conditions],
  pristineObservations: counts.pristine, softwareObservations: counts.software,
  allPassed: true }, null, 2));
