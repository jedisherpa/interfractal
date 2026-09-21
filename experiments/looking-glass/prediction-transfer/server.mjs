import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {PredictionService} from './service.mjs';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.jsonl':'application/x-ndjson; charset=utf-8','.md':'text/markdown; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'};
const publicRoutes=new Map([
  ['/','index.html'],['/index.html','index.html'],['/app.mjs','app.mjs'],['/model.mjs','model.mjs'],['/style.css','style.css'],['/fixture.json','fixture.json'],['/build.json','build.json'],
  ['/run/run.json','RUN/run.json'],['/run/initial-state.json','RUN/initial-state.json'],['/run/events.jsonl','RUN/events.jsonl'],['/run/checkpoints.json','RUN/checkpoints.json']
]);
const apiRoutes=new Set(['/api/session','/api/start','/api/commit','/api/reveal','/api/close','/api/export']);
const digest=b=>createHash('sha256').update(b).digest('hex');
const send=(res,status,body,type='application/json; charset=utf-8',head=false)=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'none','Content-Length':Buffer.byteLength(body)});res.end(head?'':body);};
function parseArgs(args){let port=44003,runDir=resolve(root,'runs/G10-PREDICT-001');for(let i=0;i<args.length;i++){if(args[i]==='--port')port=Number(args[++i]);else if(args[i]==='--run')runDir=resolve(args[++i]);else throw Error(`Unknown argument ${args[i]}`);}if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid port');return {port,runDir};}
async function readReview(route){
  const manifestPath=resolve(root,'live/review-allowlist.json');let manifest;
  try{manifest=JSON.parse(await readFile(manifestPath,'utf8'));}catch{return null;}
  if(!Array.isArray(manifest.assets))return null;
  const entry=manifest.assets.find(x=>x.route===route&&/^\/review\/(results\.html|replay-collection\.json|source-review\.md|screenshots\/[A-Za-z0-9_-]+\.(png|jpg|jpeg))$/.test(x.route));
  if(!entry||typeof entry.path!=='string'||typeof entry.sha256!=='string')return null;
  // Host approval manifest pins actual bytes. It must only list reviewed answer-free files.
  const path=resolve(root,entry.path);if(!path.startsWith(root+'/'))return null;
  try{const bytes=await readFile(path);if(digest(bytes)!==entry.sha256)return null;return {bytes,path};}catch{return null;}
}
export async function makeServer({port=44003,runDir=resolve(root,'runs/G10-PREDICT-001'),logPath=null}={}){
  const run=JSON.parse(await readFile(join(runDir,'run.json'),'utf8'));
  const build=JSON.parse(await readFile(join(here,'build.json'),'utf8'));
  if(run.runId!==build.runId||run.buildId!==build.buildId)throw Error('Run/build identity mismatch');
  const fixture=JSON.parse(await readFile(join(here,'fixture.json'),'utf8'));
  const key=JSON.parse(await readFile(join(here,'private/private-answer-key.json'),'utf8'));
  const service=new PredictionService({fixture,key,runId:run.runId,buildId:build.buildId,logPath:logPath??resolve(root,`live/${run.runId}/actions.jsonl`)});
  const server=http.createServer(async(req,res)=>{
    try{
      const path=req.url;
      if(typeof path!=='string'||path.includes('?')||path.includes('#')||path.includes('%')||path.includes('\\')||path.includes('..')||path.includes('//'))return send(res,404,JSON.stringify({error:'not_found'}));
      if(apiRoutes.has(path)){
        if(req.method!=='POST')return send(res,405,JSON.stringify({error:'method_not_allowed'}));
        const expectedOrigin=`http://127.0.0.1:${port}`;
        if(req.headers.origin&&req.headers.origin!==expectedOrigin)return send(res,403,JSON.stringify({error:'origin_rejected'}));
        if(req.headers['content-type']?.split(';')[0].trim()!=='application/json')return send(res,415,JSON.stringify({error:'json_required'}));
        let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>16384)return send(res,413,JSON.stringify({error:'body_too_large'}));chunks.push(chunk);}
        let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(res,400,JSON.stringify({error:'invalid_json'}));}
        const result=await service.handle(path,body);return send(res,result.status,JSON.stringify(result.body));
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,JSON.stringify({error:'method_not_allowed'}));
      let bytes,file;
      if(publicRoutes.has(path)){file=publicRoutes.get(path);bytes=await readFile(file.startsWith('RUN/')?join(runDir,file.slice(4)):join(here,file));}
      else if(/^\/review\//.test(path)){const approved=await readReview(path);if(!approved)return send(res,404,JSON.stringify({error:'not_found'}));bytes=approved.bytes;file=approved.path;}
      else return send(res,404,JSON.stringify({error:'not_found'}));
      const ext=file.slice(file.lastIndexOf('.'));return send(res,200,bytes,mime[ext]??'application/octet-stream',req.method==='HEAD');
    }catch(e){return send(res,500,JSON.stringify({error:'internal_error'}));}
  });
  return {server,service,run,build};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const options=parseArgs(process.argv.slice(2));const {server,run,build}=await makeServer(options);
  server.listen(options.port,'127.0.0.1',()=>process.stdout.write(`Gate 10 ${run.runId} ${build.buildId} http://127.0.0.1:${options.port}/\n`));
}
