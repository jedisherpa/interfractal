import {createServer} from 'node:http';
import {readFile, appendFile, stat} from 'node:fs/promises';
import {randomBytes, createHash} from 'node:crypto';
import {dirname, join, resolve, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {RUN_ID} from './model.mjs';

const assetDir = dirname(fileURLToPath(import.meta.url));
const localDir = basename(dirname(assetDir)) === 'builds' ? resolve(assetDir, '../..') : assetDir;
const runDir = join(localDir, 'runs', RUN_ID);
const evidenceDir = resolve(localDir, '../evidence/gate-7');
const port = Number(process.env.LOOKING_GLASS_G7_PORT || 44000);
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.mjs', ['app.mjs', 'text/javascript; charset=utf-8']],
  ['/public-cases.json', ['public-cases.json', 'application/json; charset=utf-8']]
]);
const reviewAssets = new Map([
  ['/review/results.html', [join(evidenceDir, 'results.html'), 'text/html; charset=utf-8']],
  ['/review/replay-collection.json', [join(evidenceDir, 'replay-collection.json'), 'application/json; charset=utf-8']],
  ['/review/packet.md', [join(evidenceDir, 'GATE_7_PACKET.md'), 'text/markdown; charset=utf-8']],
  ['/review/audit.md', [resolve(localDir, '../audit/gate-7/AUDIT.md'), 'text/markdown; charset=utf-8']],
  ['/review/run-evidence.json', [join(evidenceDir, 'run-evidence.json'), 'application/json; charset=utf-8']],
  ['/review/source-review.md', [resolve(localDir, '../research/gate-7/source-review.md'), 'text/markdown; charset=utf-8']]
]);
const receipts = new Map();
const reply = (res, status, body) => {
  res.writeHead(status, {'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store', 'x-content-type-options': 'nosniff'});
  res.end(JSON.stringify(body));
};
async function file(res, path, type) {
  try {
    const bytes = await readFile(path);
    res.writeHead(200, {'content-type': type, 'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'});
    res.end(bytes);
  } catch (error) {
    reply(res, error.code === 'ENOENT' ? 404 : 500, {error: error.code === 'ENOENT' ? 'Not found' : 'Read error'});
  }
}
async function bodyJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 16_384) throw new Error('Request too large');
  }
  return JSON.parse(body);
}
function appendActivity(event) {
  return readFile(join(runDir, 'run.json'), 'utf8').then(bytes => {
    const run = JSON.parse(bytes);
    return appendFile(join(runDir, 'activity.jsonl'), JSON.stringify({
      wallTimeUtc: new Date().toISOString(), runId: RUN_ID, buildId: run.buildId, ...event
    }) + '\n');
  });
}
const hash = value => value === null || value === undefined ? null :
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
function clientEvent(event) {
  return appendActivity({kind: 'observed-browser-action', schemaVersion: 'gate7-ui-event-v1',
    simulationTimeMs: event.after.simulationTimeMs,
    beforeSha256: hash(event.before), afterSha256: hash(event.after), ...event});
}
function apiTransaction(event) {
  return appendActivity({kind: 'api-transaction', schemaVersion: 'gate7-api-transaction-v1',
    provenance: 'HTTP transaction only; excludes UI-origin semantic event fields and human attribution',
    ...event});
}

createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, `http://127.0.0.1:${port}`); }
  catch { return reply(res, 400, {error: 'Malformed URL'}); }
  const path = url.pathname;
  if (req.method === 'GET') {
    if (assets.has(path)) {
      const [name, type] = assets.get(path);
      return file(res, join(assetDir, name), type);
    }
    if (path === '/api/run') return file(res, join(runDir, 'run.json'), 'application/json; charset=utf-8');
    if (path === '/api/checkpoints') return file(res, join(runDir, 'checkpoints.json'), 'application/json; charset=utf-8');
    if (path === '/api/events') return file(res, join(runDir, 'events.jsonl'), 'application/x-ndjson; charset=utf-8');
    if (reviewAssets.has(path)) {
      const [target, type] = reviewAssets.get(path);
      return file(res, target, type);
    }
    const imageName = path.startsWith('/review/screenshots/') ? path.slice('/review/screenshots/'.length) : '';
    if (/^[A-Za-z0-9_-]+\.jpe?g$/.test(imageName))
      return file(res, join(evidenceDir, 'screenshots', imageName), 'image/jpeg');
    return reply(res, 404, {error: 'Not found'});
  }
  if (req.method !== 'POST' || !['/api/submit', '/api/reveal', '/api/activity', '/api/reset'].includes(path))
    return reply(res, 404, {error: 'Not found'});
  try {
    const body = await bodyJson(req);
    if (path === '/api/reset') {
      if (typeof body.sessionId !== 'string' || !/^[-a-zA-Z0-9]{8,128}$/.test(body.sessionId) ||
          !['software_validation', 'unattributed_local'].includes(body.actor))
        throw new Error('Invalid session');
      let clearedReceipts = 0;
      for (const [receipt, data] of receipts) {
        if (data.sessionId === body.sessionId) { receipts.delete(receipt); clearedReceipts++; }
      }
      await apiTransaction({sessionId: body.sessionId, actor: body.actor,
        type: 'reset', clearedReceipts});
      return reply(res, 200, {cleared: true});
    }
    if (path === '/api/activity') {
      if (typeof body.sessionId !== 'string' || body.sessionId.length > 128 ||
          !/^[-a-zA-Z0-9]{8,128}$/.test(body.sessionId) ||
          typeof body.type !== 'string' || !/^[-a-zA-Z0-9.]{1,64}$/.test(body.type) ||
          !Number.isInteger(body.seq) || body.seq < 1 || body.seq > 1_000_000 ||
          !['user-control','replay','automatic'].includes(body.origin) ||
          !(body.before === null || typeof body.before === 'object') ||
          !body.after || typeof body.after !== 'object' ||
          !['software_validation', 'unattributed_local'].includes(body.actor) ||
          typeof body.taskId !== 'string' || !/^Q0[1-8]$/.test(body.taskId) ||
          typeof body.condition !== 'string' || !['static', 'prescribed', 'interactive', 'attention', 'plain'].includes(body.condition))
        throw new Error('Invalid activity');
      const size = await stat(join(runDir, 'activity.jsonl')).then(s => s.size, () => 0);
      if (size > 2_000_000) return reply(res, 507, {error: 'Activity log limit reached'});
      await clientEvent({sessionId: body.sessionId, seq: body.seq, origin: body.origin,
        actor: body.actor, type: body.type, taskId: body.taskId,
        condition: body.condition, frameId: typeof body.frameId === 'string' ? body.frameId : null,
        intended: body.intended || {}, before: body.before, after: body.after});
      return reply(res, 201, {saved: true});
    }
    const cases = JSON.parse(await readFile(join(assetDir, 'public-cases.json'), 'utf8'));
    const task = cases.tasks.find(t => t.id === body.taskId);
    if (!task || typeof body.sessionId !== 'string' || !/^[-a-zA-Z0-9]{8,128}$/.test(body.sessionId) ||
        path === '/api/submit' && !['software_validation', 'unattributed_local'].includes(body.actor))
      throw new Error('Invalid task or session');
    if (path === '/api/submit') {
      const skipped = body.skipped === true;
      const choiceId = body.choiceId;
      if (skipped === (typeof choiceId === 'string') ||
          skipped && choiceId !== null ||
          !skipped && !task.options.some(option => option.id === choiceId))
        throw new Error('Select one choice or skip');
      const receipt = randomBytes(24).toString('base64url');
      if (receipts.size >= 512) receipts.delete(receipts.keys().next().value);
      receipts.set(receipt, {taskId: task.id, sessionId: body.sessionId, choiceId: skipped ? null : choiceId,
        skipped, actor: body.actor, createdAt: Date.now()});
      await apiTransaction({sessionId: body.sessionId, actor: body.actor, type: skipped ? 'skip' : 'submit',
        taskId: task.id, choiceId: skipped ? null : choiceId});
      return reply(res, 201, {receipt, taskId: task.id, locked: true, skipped, scored: false});
    }
    const found = typeof body.receipt === 'string' ? receipts.get(body.receipt) : null;
    if (!found || found.taskId !== task.id || found.sessionId !== body.sessionId ||
        Date.now() - found.createdAt > 12 * 60 * 60_000)
      return reply(res, 403, {error: 'A matching submit-or-skip receipt is required'});
    const key = JSON.parse(await readFile(join(assetDir, 'private-answer-key.json'), 'utf8'));
    const answer = key.answers.find(item => item.taskId === task.id);
    const correctChoice = task.options.find(option => option.id === answer.choiceId);
    await apiTransaction({sessionId: body.sessionId, actor: found.actor,
      type: 'reveal', taskId: task.id});
    return reply(res, 200, {taskId: task.id, choiceId: answer.choiceId,
      correctChoice: correctChoice.label, explanation: answer.explanation,
      responseStatus: found.skipped ? 'skipped' : 'submitted'});
  } catch (error) {
    return reply(res, error.message === 'Request too large' ? 413 : 400, {error: error.message || 'Invalid request'});
  }
}).listen(port, '127.0.0.1', () =>
  console.log(`Gate 7 ${RUN_ID} from ${assetDir} at http://127.0.0.1:${port}/`));
