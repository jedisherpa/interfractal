import { createServer } from 'node:http';
import { readFile, appendFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUN_ID } from './model.mjs';

const assetDir=dirname(fileURLToPath(import.meta.url));
const localDir=basename(dirname(assetDir))==='builds'?resolve(assetDir,'../..'):assetDir;
const experimentDir=resolve(localDir,'..'), runDir=join(localDir,'runs',RUN_ID), evidenceDir=join(experimentDir,'evidence','gate-6');
const port=43999;
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8','.jsonl':'application/x-ndjson; charset=utf-8','.md':'text/markdown; charset=utf-8',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
function json(res,status,value){res.writeHead(status,{'content-type':mime['.json'],'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));}
async function sendFile(res,path){try{const bytes=await readFile(path);res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(bytes);}
  catch(error){json(res,error.code==='ENOENT'?404:500,{error:error.code==='ENOENT'?'Not found':'Read error'});}}
function safePath(base,relative){const path=resolve(base,relative);return path===base||path.startsWith(base+sep)?path:null;}
const assets=new Set(['index.html','style.css','app.mjs','model.mjs','fictional-records.json','reference-mappings.json','fixture.json']);
createServer(async(req,res)=>{
  const url=new URL(req.url,`http://127.0.0.1:${port}`);
  if(req.method==='GET'&&['/api/run','/api/current-run'].includes(url.pathname))return sendFile(res,join(runDir,'run.json'));
  if(req.method==='GET'&&url.pathname==='/api/checkpoints')return sendFile(res,join(runDir,'checkpoints.json'));
  if(req.method==='GET'&&url.pathname==='/api/events')return sendFile(res,join(runDir,'events.jsonl'));
  if(req.method==='GET'&&url.pathname==='/api/activity')return sendFile(res,join(runDir,'activity.jsonl'));
  if(req.method==='GET'&&url.pathname==='/api/evidence')return sendFile(res,join(evidenceDir,'run-evidence.json'));
  if(req.method==='POST'&&url.pathname==='/api/activity'){
    let body='';try{
      for await(const chunk of req){body+=chunk;if(body.length>65536)throw new Error('Event too large');}
      const event=JSON.parse(body);
      const currentRun=JSON.parse(await readFile(join(runDir,'run.json'),'utf8'));
      if(event.kind!=='observed-ui'||event.runId!==RUN_ID||typeof event.buildId!=='string'||typeof event.sessionId!=='string'||
        event.buildId!==currentRun.buildId||
        event.actor!=='unspecified-ui'||!['manual-control','automatic-playback','programmatic-restore'].includes(event.origin)||
        !Number.isInteger(event.seq)||typeof event.type!=='string'||typeof event.wallTimeUtc!=='string'||
        !event.payload||!event.before?.checkpointSha256||!event.observed?.checkpointSha256||
        !Number.isFinite(event.simulationTimeBeforeMs)||!Number.isFinite(event.simulationTimeAfterMs))throw new Error('Invalid event');
      const path=join(runDir,'activity.jsonl'),size=await stat(path).then(v=>v.size).catch(e=>e.code==='ENOENT'?0:Promise.reject(e));
      if(size>2_000_000)return json(res,507,{error:'Activity log limit reached'});
      await appendFile(path,JSON.stringify(event)+'\n',{flag:'a'});return json(res,201,{saved:true});
    }catch(error){return json(res,error.message==='Event too large'?413:400,{error:String(error.message||error)});}
  }
  if(req.method==='GET'&&url.pathname.startsWith('/evidence/gate-6/')){
    let relative;try{relative=decodeURIComponent(url.pathname.slice('/evidence/gate-6/'.length));}catch{return json(res,400,{error:'Malformed path'});}
    const path=safePath(evidenceDir,relative);return path?sendFile(res,path):json(res,403,{error:'Forbidden path'});
  }
  if(req.method==='GET'&&url.pathname.startsWith('/runs/')){
    let relative;try{relative=decodeURIComponent(url.pathname.slice('/runs/'.length));}catch{return json(res,400,{error:'Malformed path'});}
    const path=safePath(join(localDir,'runs'),relative);return path?sendFile(res,path):json(res,403,{error:'Forbidden path'});
  }
  if(req.method==='GET'){
    const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
    if(assets.has(name))return sendFile(res,join(assetDir,name));
  }
  return json(res,404,{error:'Not found'});
}).listen(port,'127.0.0.1',()=>console.log(`Gate 6 ${RUN_ID} from ${assetDir} at http://127.0.0.1:${port}/`));
