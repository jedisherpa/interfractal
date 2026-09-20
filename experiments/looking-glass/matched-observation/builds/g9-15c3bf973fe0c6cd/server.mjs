import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname,join,resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';

const assetDir=dirname(fileURLToPath(import.meta.url));
if(basename(dirname(assetDir))!=='builds') throw Error('Launch the immutable build server, not mutable source');
const sourceDir=resolve(assetDir,'../..'),root=resolve(sourceDir,'..');
const build=JSON.parse(await readFile(join(assetDir,'build.json'),'utf8'));
const runDir=join(sourceDir,'runs',build.runId),evidenceDir=join(root,'evidence/gate-9');
const port=Number(process.env.LOOKING_GLASS_G9_PORT||44002);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid loopback port');
const assets=new Map([
  ['/',['index.html','text/html; charset=utf-8']],['/index.html',['index.html','text/html; charset=utf-8']],
  ['/style.css',['style.css','text/css; charset=utf-8']],['/app.mjs',['app.mjs','text/javascript; charset=utf-8']],
  ['/core.mjs',['core.mjs','text/javascript; charset=utf-8']],['/engine.mjs',['engine.mjs','text/javascript; charset=utf-8']],
  ['/fixture.json',['fixture.json','application/json; charset=utf-8']]
]);
const runFiles=new Map([
  ['/metadata.json',[join(assetDir,'metadata.json'),'application/json; charset=utf-8']],
  ['/api/build',[join(assetDir,'build.json'),'application/json; charset=utf-8']],
  ['/api/run',[join(runDir,'run.json'),'application/json; charset=utf-8']],
  ['/api/initial-state',[join(runDir,'initial-state.json'),'application/json; charset=utf-8']],
  ['/api/checkpoints',[join(runDir,'checkpoints.json'),'application/json; charset=utf-8']],
  ['/api/events',[join(runDir,'events.jsonl'),'application/x-ndjson; charset=utf-8']],
  ['/api/computation',[join(runDir,'computational-results.json'),'application/json; charset=utf-8']]
]);
const review=new Map([
  ['/review/results.html',[join(evidenceDir,'results.html'),'text/html; charset=utf-8']],
  ['/review/packet.md',[join(evidenceDir,'GATE_9_PACKET.md'),'text/markdown; charset=utf-8']],
  ['/review/audit.md',[join(root,'audit/gate-9/AUDIT.md'),'text/markdown; charset=utf-8']],
  ['/review/run-evidence.json',[join(evidenceDir,'run-evidence.json'),'application/json; charset=utf-8']],
  ['/review/source-review.md',[join(root,'research/gate-9/source-review.md'),'text/markdown; charset=utf-8']]
]);
function json(res,status,body){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body));}
async function serve(res,path,type,head){try{const bytes=await readFile(path);res.writeHead(200,{'content-type':type,'content-length':bytes.length,'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(head?undefined:bytes);}catch(e){json(res,e.code==='ENOENT'?404:500,{error:e.code==='ENOENT'?'Not found':'Read error'});}}
createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method))return json(res,404,{error:'Not found'});
  let pathname;try{pathname=new URL(req.url,`http://127.0.0.1:${port}`).pathname;}catch{return json(res,400,{error:'Malformed URL'});}
  const head=req.method==='HEAD';
  if(assets.has(pathname)){const [file,type]=assets.get(pathname);return serve(res,join(assetDir,file),type,head);}
  if(runFiles.has(pathname)){const [path,type]=runFiles.get(pathname);return serve(res,path,type,head);}
  if(review.has(pathname)){const [path,type]=review.get(pathname);return serve(res,path,type,head);}
  const imageName=pathname.startsWith('/review/screenshots/')?pathname.slice('/review/screenshots/'.length):'';
  if(/^[A-Za-z0-9_-]+\.(?:png|jpe?g)$/.test(imageName))return serve(res,join(evidenceDir,'screenshots',imageName),imageName.endsWith('.png')?'image/png':'image/jpeg',head);
  return json(res,404,{error:'Not found'});
}).listen(port,'127.0.0.1',()=>console.log(`Gate 9 ${build.runId} ${build.buildId} at http://127.0.0.1:${port}/`));
