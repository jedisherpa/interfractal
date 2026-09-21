import { createServer } from 'node:http';
import { readFile, appendFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUN_ID } from './model.mjs';

const assetDir = dirname(fileURLToPath(import.meta.url));
const slicesDir = basename(dirname(assetDir)) === 'builds' ? resolve(assetDir, '../..') : assetDir;
const experimentDir = resolve(slicesDir, '..');
const port = 43997;
const runDir = join(slicesDir, 'runs', RUN_ID);
const evidenceDir = join(experimentDir, 'evidence', 'gate-4');
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jsonl': 'application/x-ndjson; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8'
};
function json(res, status, value) {
  res.writeHead(status, { 'content-type': mime['.json'], 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(value));
}
async function sendFile(res, path) {
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': mime[extname(path)] || 'application/octet-stream',
      'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(body);
  } catch (error) { json(res, error.code === 'ENOENT' ? 404 : 500, { error: error.code === 'ENOENT' ? 'Not found' : 'Read error' }); }
}
function safePath(base, relative) {
  const path = resolve(base, relative);
  return path === base || path.startsWith(base + sep) ? path : null;
}
const assets = new Set(['index.html', 'style.css', 'app.mjs', 'model.mjs']);
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (req.method === 'GET' && (url.pathname === '/api/run' || url.pathname === '/api/current-run')) return sendFile(res, join(runDir, 'run.json'));
  if (req.method === 'GET' && url.pathname === '/api/checkpoints') return sendFile(res, join(runDir, 'checkpoints.json'));
  if (req.method === 'GET' && url.pathname === '/api/movie-trace') return sendFile(res, join(runDir, 'movie-3d.json'));
  if (req.method === 'GET' && url.pathname === '/api/events') return sendFile(res, join(runDir, 'events.jsonl'));
  if (req.method === 'GET' && url.pathname === '/api/evidence') return sendFile(res, join(evidenceDir, 'run-evidence.json'));
  if (req.method === 'GET' && url.pathname === '/api/activity') return sendFile(res, join(runDir, 'activity.jsonl'));
  if (req.method === 'POST' && url.pathname === '/api/activity') {
    let body = '';
    try {
      for await (const chunk of req) { body += chunk; if (body.length > 65536) throw new Error('Event too large'); }
      const event = JSON.parse(body);
      if (event.kind !== 'observed-ui' || event.runId !== RUN_ID || typeof event.buildId !== 'string' ||
        typeof event.sessionId !== 'string' || event.actor !== 'unspecified-ui' ||
        !['manual-control', 'automatic-playback', 'programmatic-restore'].includes(event.origin) ||
        !Number.isInteger(event.seq) || typeof event.type !== 'string' ||
        typeof event.wallTimeUtc !== 'string' || !event.payload || !event.before || !event.observed ||
        !Number.isFinite(event.simTimeBeforeMs) || !Number.isFinite(event.simTimeAfterMs) ||
        !event.before.checkpointSha256 || !event.observed.checkpointSha256) throw new Error('Invalid event');
      const path = join(runDir, 'activity.jsonl');
      const size = await stat(path).then(v => v.size).catch(error => error.code === 'ENOENT' ? 0 : Promise.reject(error));
      if (size > 2_000_000) return json(res, 507, { error: 'Activity log limit reached' });
      await appendFile(path, JSON.stringify(event) + '\n', { flag: 'a' });
      return json(res, 201, { saved: true });
    } catch (error) { return json(res, error.message === 'Event too large' ? 413 : 400, { error: String(error.message || error) }); }
  }
  if (req.method === 'GET' && url.pathname.startsWith('/evidence/gate-4/')) {
    let relative;
    try { relative = decodeURIComponent(url.pathname.slice('/evidence/gate-4/'.length)); }
    catch { return json(res, 400, { error: 'Malformed evidence path' }); }
    const path = safePath(evidenceDir, relative);
    return path ? sendFile(res, path) : json(res, 403, { error: 'Forbidden path' });
  }
  if (req.method === 'GET' && url.pathname.startsWith('/runs/')) {
    let relative;
    try { relative = decodeURIComponent(url.pathname.slice('/runs/'.length)); }
    catch { return json(res, 400, { error: 'Malformed run path' }); }
    const path = safePath(join(slicesDir, 'runs'), relative);
    return path ? sendFile(res, path) : json(res, 403, { error: 'Forbidden path' });
  }
  if (req.method === 'GET') {
    const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    if (assets.has(name)) return sendFile(res, join(assetDir, name));
  }
  return json(res, 404, { error: 'Not found' });
});
server.on('error', error => { console.error(`Gate 4 cannot bind 127.0.0.1:${port}: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Gate 4 ${RUN_ID} from ${assetDir} at http://127.0.0.1:${port}/`));
