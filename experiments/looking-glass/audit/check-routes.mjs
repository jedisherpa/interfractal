// Read-only HTTP routing check against a frozen Gate 0 server snapshot.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { request } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const experiment = join(dirname(fileURLToPath(import.meta.url)), '..');
const runId = process.argv[2];
if (!/^G0-CUBE-\d{3}$/.test(runId ?? '')) throw new Error('Pass a Gate 0 run ID');
const runDir = join(experiment, 'probe', 'runs', runId);
const run = JSON.parse(await readFile(join(runDir, 'run.json'), 'utf8'));
const serverPath = join(experiment, 'probe', 'builds', run.buildId, 'server.mjs');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalNames = ['run.json','initial-state.json','checkpoints.json','events.jsonl'];
const canonical = async () => Promise.all(canonicalNames.map(async name => hash(await readFile(join(runDir,name)))));
const before = await canonical();
const send = (path, method='GET') => new Promise((resolve, reject) => {
  const req = request({ hostname:'127.0.0.1', port:43991, path, method, timeout:3000 }, res => {
    const chunks=[]; res.on('data', c=>chunks.push(c)); res.on('end', ()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
  });
  req.on('timeout', ()=>req.destroy(new Error('Timed out')));
  req.on('error', reject); req.end();
});

let child;
try {
  try { await send('/api/run'); }
  catch {
    child = spawn(process.execPath, [serverPath], { stdio:'ignore' });
    let ready=false;
    for (let i=0;i<50;i++) {
      await new Promise(resolve=>setTimeout(resolve,50));
      if (child.exitCode !== null) throw new Error(`Server exited with ${child.exitCode}`);
      try { await send('/api/run'); ready=true; break; } catch { /* startup */ }
    }
    if (!ready) throw new Error('Frozen server did not start');
  }
  const manifest = await send('/api/run');
  assert.equal(manifest.status,200);
  assert.equal(JSON.parse(manifest.body).runId,runId,'port must serve requested frozen run');
  assert.equal(JSON.parse(manifest.body).buildId,run.buildId);
  for (const path of ['/','/index.html','/app.mjs','/model.mjs','/style.css','/api/checkpoints','/api/events']) {
    const response=await send(path);
    assert.equal(response.status,200,path);
    assert.equal(response.headers['cache-control'],'no-store',path);
    assert.equal(response.headers['x-content-type-options'],'nosniff',path);
  }
  for (const path of ['/PROJECT_STATUS.json','/api/unknown','/probe/build.mjs','/inputs/LOOKING_GLASS_CODEX_ORCHESTRATOR_PROMPT.md'])
    assert.equal((await send(path)).status,404,path);
  assert.equal((await send('/api/run','POST')).status,404,'run manifest must be read-only');
  assert.equal((await send('/api/checkpoints','POST')).status,404,'checkpoints must be read-only');
  assert.equal((await send('/evidence/gate-0/%2e%2e%2f%2e%2e%2finputs%2fINPUT_MANIFEST.json')).status,403,'decoded traversal');
  assert.equal((await send('/evidence/gate-0/%ZZ')).status,400,'malformed encoding');
  assert.deepEqual(await canonical(),before,'HTTP reads cannot change canonical artifacts');
  console.log(JSON.stringify({result:'pass',runId,buildId:run.buildId,checks:['frozen snapshot HTTP entry point','static/API no-store','allowlist','read-only canonical endpoints','traversal and malformed path rejection','canonical bytes unchanged']},null,2));
} finally {
  if (child) child.kill('SIGTERM');
}
