import { createServer } from 'node:http';
import { readFile, appendFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const buildDir = dirname(fileURLToPath(import.meta.url));
const probeDir = resolve(buildDir, '../..');
const experimentDir = resolve(probeDir, '..');
const runId = 'G0-CUBE-002';
const runDir = join(probeDir, 'runs', runId);
const evidenceDir = join(experimentDir, 'evidence', 'gate-0');
const port = 43991;
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.md':'text/markdown; charset=utf-8' };

async function sendFile(res, file, immutable = false) {
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type':mime[extname(file)] || 'application/octet-stream', 'cache-control':immutable?'public,max-age=31536000,immutable':'no-store', 'x-content-type-options':'nosniff' });
    res.end(body);
  } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end(error.code === 'ENOENT' ? 'Not found' : 'Read error'); }
}
function safePath(base, relative) {
  const candidate = resolve(base, relative);
  if (candidate !== base && !candidate.startsWith(base + sep)) return null;
  return candidate;
}
function json(res, status, value) { res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' }); res.end(JSON.stringify(value)); }
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (req.method === 'GET' && url.pathname === '/api/run') return sendFile(res, join(runDir, 'run.json'));
  if (req.method === 'GET' && url.pathname === '/api/checkpoints') return sendFile(res, join(runDir, 'checkpoints.json'));
  if (req.method === 'GET' && url.pathname === '/api/events') return sendFile(res, join(runDir, 'events.jsonl'));
  if (req.method === 'GET' && url.pathname === '/api/evidence') return sendFile(res, join(evidenceDir, 'run-evidence.json'));
  if (req.method === 'GET' && url.pathname === '/api/activity') return sendFile(res, join(runDir, 'activity.jsonl'));
  if (req.method === 'POST' && url.pathname === '/api/activity') {
    let body = '';
    try {
      for await (const chunk of req) { body += chunk; if (body.length > 16_384) throw new Error('Event too large'); }
      const event = JSON.parse(body);
      if (event.runId !== runId || !Number.isInteger(event.sequence) || typeof event.type !== 'string' || typeof event.wallTimestamp !== 'string' || !event.intended || !event.observed) throw new Error('Invalid event');
      const path = join(runDir, 'activity.jsonl');
      const size = await stat(path).then(v=>v.size).catch(()=>0);
      if (size > 2_000_000) return json(res, 507, { error:'Activity log limit reached' });
      await appendFile(path, JSON.stringify(event) + '\n', { flag:'a' });
      return json(res, 201, { saved:true });
    } catch (error) { return json(res, 400, { error:String(error.message || error) }); }
  }
  if (req.method === 'GET' && url.pathname.startsWith('/evidence/gate-0/')) {
    const file = safePath(evidenceDir, decodeURIComponent(url.pathname.slice('/evidence/gate-0/'.length)));
    return file ? sendFile(res, file) : json(res, 403, { error:'Forbidden path' });
  }
  const assets = { '/':'index.html', '/index.html':'index.html', '/style.css':'style.css', '/app.mjs':'app.mjs', '/model.mjs':'model.mjs' };
  if (req.method === 'GET' && assets[url.pathname]) return sendFile(res, join(buildDir, assets[url.pathname]), true);
  json(res, 404, { error:'Not found' });
});
server.on('error', error => { console.error(`Gate 0 probe cannot bind 127.0.0.1:${port}: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Gate 0 run ${runId} from ${buildDir} at http://127.0.0.1:${port}/`));
