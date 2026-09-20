export const RUN_ID = 'G7-INTERPRET-002';
export const DURATION_MS = 48_000;
export const SAMPLE_MS = 100;
export const STEP_MS = 1_000;
export const CHECKPOINTS_MS = Array.from({length: 9}, (_, i) => i * 6_000);
export const TOUR = [
  ['Q01', 'static'], ['Q02', 'prescribed'], ['Q03', 'interactive'],
  ['Q04', 'prescribed'], ['Q05', 'static'], ['Q06', 'interactive'],
  ['Q07', 'attention'], ['Q08', 'plain']
];

export function clampTime(ms) {
  if (!Number.isFinite(Number(ms))) throw new TypeError('Finite time required');
  return Math.max(0, Math.min(DURATION_MS, Math.round(Number(ms) / SAMPLE_MS) * SAMPLE_MS));
}

export function tourAt(ms) {
  const t = clampTime(ms);
  const block = t === DURATION_MS ? 0 : Math.floor(t / 6_000);
  const offset = t === DURATION_MS ? 0 : t % 6_000;
  const [taskId, condition] = TOUR[block];
  const frameIndex = condition === 'static' || condition === 'attention'
    ? 0 : Math.min(2, Math.floor(offset / 2_000));
  return {simulationTimeMs: t, taskId, condition, frameIndex, answerCount: 0, revealed: false};
}

const publicTaskFields = ['id', 'family', 'scene', 'model', 'prompt', 'selectedPointId',
  'availableFacts', 'options'];
const publicRootFields = ['schema', 'fixtureId', 'sourceStatus', 'publicInformationRule',
  'teaching', 'conditions', 'timing'];
const publicFrameFields = ['id', 'displayCamera', 'parameters', 'points', 'projection', 'slice',
  'referenceId', 'receiver', 'references', 'contexts', 'records', 'detailLevel', 'revisionAuthor'];

export function publicFixture(source) {
  const result = Object.fromEntries(publicRootFields.filter(k => Object.hasOwn(source, k))
    .map(k => [k, structuredClone(source[k])]));
  result.tasks = source.tasks.map(task => {
    const value = Object.fromEntries(publicTaskFields.filter(k => Object.hasOwn(task, k))
      .map(k => [k, structuredClone(task[k])]));
    value.frames = task.frames.map(frame => Object.fromEntries(publicFrameFields
      .filter(k => Object.hasOwn(frame, k)).map(k => [k, structuredClone(frame[k])])));
    return value;
  });
  return result;
}

export function validateFixture(source, key) {
  if (source.schema !== 'gate7-task-fixture-v1' || source.tasks.length !== 8 ||
      key.schema !== 'gate7-private-answer-key-v1' || key.answers.length !== 8)
    throw new Error('Unexpected Gate 7 fixture/key schema');
  for (let i = 0; i < 8; i++) {
    const task = source.tasks[i], answer = key.answers[i];
    if (task.id !== `Q0${i + 1}` || answer.taskId !== task.id ||
        !task.options.some(option => option.id === answer.choiceId))
      throw new Error(`Invalid task/answer identity at ${i}`);
    if (task.frames.length !== (i === 6 ? 1 : 3) ||
        task.frames.some((frame, index) => frame.id !== `F${index + 1}`))
      throw new Error(`Invalid frame set at ${task.id}`);
    if (i < 6 && task.family !== 'geometry' || i >= 6 && task.family !== 'attention')
      throw new Error(`Invalid family at ${task.id}`);
  }
  return true;
}
