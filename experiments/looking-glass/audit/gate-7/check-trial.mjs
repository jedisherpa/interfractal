import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Independent, read-only checks of the host's actual browser trial. This is
// software evidence, not an estimate of human comprehension.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = async path => JSON.parse(await readFile(join(root, path)));
const observations = await readJson('evidence/gate-7/browser-observations.json');
const checkpointReview = await readJson('evidence/gate-7/checkpoint-review.json');
const parity = await readJson('evidence/gate-7/actual-condition-parity.json');
const actions = await readJson('evidence/gate-7/action-trace.json');
const planned = await readJson('interpretation/runs/G7-INTERPRET-002/checkpoints.json');

const phases = ['baseline', 'restored', 'reopened', 'reloaded'];
assert.equal(checkpointReview.length, phases.length * planned.length);
for (const [phaseIndex, phase] of phases.entries()) {
  const rows = checkpointReview.filter(row => row.phase === phase);
  assert.equal(rows.length, planned.length, `${phase} checkpoint count`);
  for (const [index, row] of rows.entries()) {
    const expected = planned[index];
    const observed = observations[row.observation];
    assert.equal(row.timeMs, expected.simulationTimeMs, `${phase} time`);
    assert.equal(observed.inspector.simulationTimeMs, row.timeMs, `${phase} browser time`);
    assert.equal(observed.inspector.mode, 'saved-replay', `${phase} browser mode`);
    assert.equal(observed.inspector.paused, true, `${phase} paused`);
    assert.equal(observed.inspector.taskId, expected.taskId, `${phase} task`);
    assert.equal(observed.inspector.condition, expected.condition, `${phase} condition`);
    assert.equal(observed.inspector.frameIndex, expected.frameIndex, `${phase} frame`);
    for (const key of ['frameSetSha256', 'informationSha256', 'checkpointSha256']) {
      assert.equal(row.hashes[key], expected[key], `${phase} ${key}`);
      assert.equal(row.hashes[key], observed.inspector.hashes[key], `${phase} browser ${key}`);
    }
    assert.equal(row.hashes.semanticSha256, observed.inspector.hashes.semanticSha256,
      `${phase} semantic hash`);
    assert.equal(row.hashes.displaySha256, observed.inspector.hashes.displaySha256,
      `${phase} display hash`);
  }
  assert.equal(checkpointReview[phaseIndex * planned.length].phase, phase);
}

assert.equal(parity.length, 3);
for (const [index, row] of parity.entries()) {
  assert.equal(row.frame, `F${index + 1}`);
  const a = observations[row.objectsObservation].inspector;
  const b = observations[row.plainObservation].inspector;
  assert.equal(a.taskId, b.taskId);
  assert.equal(a.frameIndex, b.frameIndex);
  assert.equal(a.condition, 'attention');
  assert.equal(b.condition, 'plain');
  assert.deepEqual(a.currentFrame, b.currentFrame);
  assert.equal(a.hashes.informationSha256, b.hashes.informationSha256);
  assert.equal(row.sameFrame, true);
  assert.equal(row.sameInformation, true);
}

const find = text => {
  const matches = observations.filter(row => row.label === text);
  assert.equal(matches.length, 1, `unique observation: ${text}`);
  return matches[0];
};
const submitBefore = find('002 submit software response before').inspector;
const submitAfter = find('002 submit software response after').inspector;
assert.equal(submitBefore.actor, 'software_validation');
assert.equal(submitBefore.answerCount, 0);
assert.equal(submitAfter.answerCount, 1);
assert.equal(submitAfter.revealedCount, 0);
assert.equal(submitAfter.responses[0].skipped, false);
assert.equal(submitAfter.responses[0].receiptStatus, 'locked');
const revealAfter = find('002 deliberate Q01 explanation reveal after').inspector;
assert.equal(revealAfter.answerCount, 1);
assert.equal(revealAfter.revealedCount, 1);
const skipAfter = find('002 explicit software skip after').inspector;
assert.equal(skipAfter.answerCount, 2);
assert.equal(skipAfter.revealedCount, 1);
assert.equal(skipAfter.responses[1].choiceId, null);
assert.equal(skipAfter.responses[1].skipped, true);
assert.equal(skipAfter.responses[1].receiptStatus, 'locked');
const skippedReveal = find('002 deliberate skipped-case reveal after').inspector;
assert.equal(skippedReveal.answerCount, 2);
assert.equal(skippedReveal.revealedCount, 2);
const reset = find('002 clear responses and reveals after').inspector;
assert.equal(reset.answerCount, 0);
assert.equal(reset.revealedCount, 0);
assert.equal(reset.actor, 'unattributed_local');
assert.equal(reset.mode, 'saved-replay');

const elapsed = find('002 full tour elapsed observation').inspector;
const stopped = find('002 full tour natural end').inspector;
assert.ok(elapsed.simulationTimeMs > 0 && elapsed.simulationTimeMs < 48000);
assert.equal(elapsed.paused, false);
assert.equal(elapsed.playing, true);
assert.equal(stopped.simulationTimeMs, 48000);
assert.equal(stopped.paused, true);
assert.equal(stopped.playing, false);
assert.equal(stopped.answerCount, 0);
assert.equal(stopped.revealedCount, 0);

for (const [index, action] of actions.entries()) {
  assert.equal(action.index, index);
  assert.equal(action.success, true, `host action ${index}`);
  assert.ok(action.before < action.after && action.after < observations.length,
    `host action ${index} observation bracket`);
  assert.ok(Date.parse(action.startedAtUtc) <= Date.parse(action.endedAtUtc),
    `host action ${index} time`);
}
console.log(JSON.stringify({kind: 'gate-7-independent-actual-trial-audit',
  runId: 'G7-INTERPRET-002', checkpointRows: checkpointReview.length,
  checkpointPasses: phases.length, attentionParityFrames: parity.length,
  answerBranches: ['submit', 'reveal', 'skip', 'skip-reveal', 'reset'],
  naturalTourStopMs: stopped.simulationTimeMs, hostActions: actions.length,
  allPassed: true}, null, 2));
