import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../..');
const routes=new Map([['/','index.html'],['/index.html','index.html'],['/app.mjs','app.mjs'],['/model.mjs','model.mjs'],['/receiver.mjs','receiver.mjs'],['/style.css','style.css'],['/fixture.json','fixture.json'],['/build.json','build.json'],['/run/run.json','RUN/run.json'],['/run/initial-state.json','RUN/initial-state.json'],['/run/events.jsonl','RUN/events.jsonl'],['/run/checkpoints.json','RUN/checkpoints.json']]);
const mime={html:'text/html; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json; charset=utf-8',jsonl:'application/x-ndjson; charset=utf-8',md:'text/markdown; charset=utf-8',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg'};
const digest=x=>createHash('sha256').update(x).digest('hex');
const send=(res,status,body,type='application/json; charset=utf-8',head=false)=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Length':Buffer.byteLength(body)});res.end(head?'':body);};
function args(argv){let runDir=null,port=44004;for(let i=0;i<argv.length;i++){if(argv[i]==='--run')runDir=resolve(argv[++i]);else if(argv[i]==='--port')port=Number(argv[++i]);else throw Error(`Unknown argument ${argv[i]}`);}if(!runDir)throw Error('Explicit --run is required');if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid port');return {runDir,port};}
async function review(path){let allow;try{allow=JSON.parse(await readFile(resolve(root,'review/allowlist.json'),'utf8'));}catch{return null;}
  const allowed=/^\/review\/(results\.html|replay-collection\.json|source-review\.md|images\/[A-Za-z0-9_-]+\.(png|jpg|jpeg))$/;
  const entry=Array.isArray(allow.assets)?allow.assets.find(x=>x.route===path&&allowed.test(x.route)):null;if(!entry||typeof entry.path!=='string'||!entry.path.startsWith('review/')||typeof entry.sha256!=='string')return null;
  const file=resolve(root,entry.path);if(!file.startsWith(resolve(root,'review')+'/'))return null;
  try{const bytes=await readFile(file);return digest(bytes)===entry.sha256?{bytes,file}:null;}catch{return null;}
}
export async function makeServer({runDir,port=44004}={}){
  if(!runDir)throw Error('Explicit runDir required');
  const run=JSON.parse(await readFile(join(runDir,'run.json'),'utf8')),build=JSON.parse(await readFile(join(here,'build.json'),'utf8'));
  if(run.runId!==build.runId||run.buildId!==build.buildId||run.sourceHash!==build.sourceHash)throw Error('Run/build mismatch');
  const server=http.createServer(async(req,res)=>{const path=req.url;
    if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,JSON.stringify({error:'method_not_allowed'}));
    if(typeof path!=='string'||path.includes('?')||path.includes('#')||path.includes('%')||path.includes('\\')||path.includes('..')||path.includes('//'))return send(res,404,JSON.stringify({error:'not_found'}));
    try{let bytes,file;if(routes.has(path)){file=routes.get(path);bytes=await readFile(file.startsWith('RUN/')?join(runDir,file.slice(4)):join(here,file));}
      else if(path.startsWith('/review/')){const found=await review(path);if(!found)return send(res,404,JSON.stringify({error:'not_found'}));bytes=found.bytes;file=found.file;}
      else return send(res,404,JSON.stringify({error:'not_found'}));
      const ext=file.slice(file.lastIndexOf('.')+1);return send(res,200,bytes,mime[ext]??'application/octet-stream',req.method==='HEAD');
    }catch{return send(res,500,JSON.stringify({error:'internal_error'}));}
  });return {server,run,build};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const options=args(process.argv.slice(2)),{server,run,build}=await makeServer(options);server.listen(options.port,'127.0.0.1',()=>process.stdout.write(`Gate 11 ${run.runId} ${build.buildId} http://127.0.0.1:${options.port}/\n`));}
