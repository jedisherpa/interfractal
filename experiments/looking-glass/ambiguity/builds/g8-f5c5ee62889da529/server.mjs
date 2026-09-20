import {createServer} from 'node:http';
import {readFile, appendFile, stat} from 'node:fs/promises';
import {dirname, join, resolve, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {RUN_ID} from './model.mjs';

const assetDir = dirname(fileURLToPath(import.meta.url));
const localDir = basename(dirname(assetDir)) === 'builds' ? resolve(assetDir, '../..') : assetDir;
const root = resolve(localDir, '..');
const runDir = join(localDir, 'runs', RUN_ID);
const evidenceDir = join(root, 'evidence/gate-8');
const port = Number(process.env.LOOKING_GLASS_G8_PORT || 44001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid loopback port');
const assets = new Map([
  ['/', ['index.html','text/html; charset=utf-8']],
  ['/index.html', ['index.html','text/html; charset=utf-8']],
  ['/style.css', ['style.css','text/css; charset=utf-8']],
  ['/app.mjs', ['app.mjs','text/javascript; charset=utf-8']],
  ['/model.mjs', ['model.mjs','text/javascript; charset=utf-8']],
  ['/hash.mjs', ['hash.mjs','text/javascript; charset=utf-8']],
  ['/fixture.json', ['fixture.json','application/json; charset=utf-8']]
]);
const review = new Map([
  ['/review/results.html', [join(evidenceDir,'results.html'),'text/html; charset=utf-8']],
  ['/review/packet.md', [join(evidenceDir,'GATE_8_PACKET.md'),'text/markdown; charset=utf-8']],
  ['/review/audit.md', [join(root,'audit/gate-8/AUDIT.md'),'text/markdown; charset=utf-8']],
  ['/review/run-evidence.json', [join(evidenceDir,'run-evidence.json'),'application/json; charset=utf-8']],
  ['/review/source-review.md', [join(root,'research/gate-8/source-review.md'),'text/markdown; charset=utf-8']]
]);
const json = (res,status,body) => {res.writeHead(status,{'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body));};
async function serveFile(res,path,type,head=false) {
  try {const bytes=await readFile(path);res.writeHead(200,{'content-type':type,'content-length':bytes.length,
    'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(head?undefined:bytes);}
  catch(error){json(res,error.code==='ENOENT'?404:500,{error:error.code==='ENOENT'?'Not found':'Read error'});}
}
async function parseBody(req) {
  let text='';
  for await (const chunk of req) {text+=chunk;if(text.length>8192) throw new Error('Request too large');}
  return JSON.parse(text);
}
createServer(async(req,res)=>{
  let pathname;
  try {pathname=new URL(req.url,`http://127.0.0.1:${port}`).pathname;}
  catch {return json(res,400,{error:'Malformed URL'});}
  if(req.method==='GET'||req.method==='HEAD') {
    const head=req.method==='HEAD';
    if(assets.has(pathname)) {const [name,type]=assets.get(pathname);return serveFile(res,join(assetDir,name),type,head);}
    if(pathname==='/api/run') return serveFile(res,join(runDir,'run.json'),'application/json; charset=utf-8',head);
    if(pathname==='/api/build') return serveFile(res,join(assetDir,'build.json'),'application/json; charset=utf-8',head);
    if(pathname==='/api/checkpoints') return serveFile(res,join(runDir,'checkpoints.json'),'application/json; charset=utf-8',head);
    if(pathname==='/api/events') return serveFile(res,join(runDir,'events.jsonl'),'application/x-ndjson; charset=utf-8',head);
    if(review.has(pathname)) {const [path,type]=review.get(pathname);return serveFile(res,path,type,head);}
    const imageName=pathname.startsWith('/review/screenshots/')?pathname.slice('/review/screenshots/'.length):'';
    if(/^[A-Za-z0-9_-]+\.(?:png|jpe?g)$/.test(imageName))
      return serveFile(res,join(evidenceDir,'screenshots',imageName),imageName.endsWith('.png')?'image/png':'image/jpeg',head);
    return json(res,404,{error:'Not found'});
  }
  if(req.method!=='POST'||pathname!=='/api/activity') return json(res,404,{error:'Not found'});
  try {
    const body=await parseBody(req);
    if(typeof body.sessionId!=='string'||!/^[-a-zA-Z0-9]{8,128}$/.test(body.sessionId)||
       !Number.isInteger(body.seq)||body.seq<1||body.seq>1_000_000||
       !['user-control','replay','automatic'].includes(body.origin)||
       !['software_validation','unattributed_local'].includes(body.actor)||
       typeof body.type!=='string'||!/^[-a-zA-Z0-9]{1,64}$/.test(body.type)||
       !Number.isFinite(body.simulationCursorSeconds)||body.simulationCursorSeconds<0||body.simulationCursorSeconds>32||
       typeof body.beforeSemanticFingerprint!=='string'||!/^\w{64}$/.test(body.beforeSemanticFingerprint)||
       typeof body.afterSemanticFingerprint!=='string'||!/^\w{64}$/.test(body.afterSemanticFingerprint)||
       !body.intended||typeof body.intended!=='object') throw new Error('Invalid activity');
    const size=await stat(join(runDir,'activity.jsonl')).then(item=>item.size,()=>0);
    if(size>4_000_000) return json(res,507,{error:'Activity log limit reached'});
    const run=JSON.parse(await readFile(join(runDir,'run.json'),'utf8'));
    await appendFile(join(runDir,'activity.jsonl'),JSON.stringify({schema:'gate8-ui-event-v1',
      timeUtc:new Date().toISOString(),runId:RUN_ID,buildId:run.buildId,...body})+'\n');
    return json(res,201,{saved:true,seq:body.seq});
  } catch(error) {return json(res,error.message==='Request too large'?413:400,{error:error.message||'Invalid activity'});}
}).listen(port,'127.0.0.1',()=>console.log(`Gate 8 ${RUN_ID} from ${assetDir} at http://127.0.0.1:${port}/`));
