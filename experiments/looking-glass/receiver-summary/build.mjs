import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonical,hash,clone,sourceHashes,makeRevision,allCertificates,initialState,checkpointState,derive,fullAnswer} from './model.mjs';
const here=dirname(fileURLToPath(import.meta.url)),project=resolve(here,'..'),docs=join(project,'docs/gate-11'),nodePath='/opt/homebrew/Cellar/node@24/24.17.0/bin/node';
if(process.execPath!==nodePath||process.version!=='v24.17.0')throw Error(`Use exact Node ${nodePath} v24.17.0`);
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFile(p);
const freeze=await read(join(docs,'PRESPEC_FREEZE.json'));if(sha(freeze)!=='bc6f624e0eb0a2d225e1aafdebb99ec2fd3dcce45bcd24dd8ccadf6edd85fba9')throw Error('Frozen prespec changed');
const sourceFiles=['FAILED_CANDIDATES.md','README.md','app.mjs','build.mjs','index.html','model.mjs','receiver.mjs','server.mjs','style.css','test.mjs'];
const specFiles=['PRESPEC_FREEZE.json','experiment-charter.md','model-contract.md','record-contract.md','fixture.json','independent-predictions.json'];
const content=[];for(const name of sourceFiles)content.push({path:`receiver-summary/${name}`,sha256:sha(await read(join(here,name)))});for(const name of specFiles)content.push({path:`docs/gate-11/${name}`,sha256:sha(await read(join(docs,name)))});
const candidate=process.argv[2]==='--candidate'?process.argv[3]:'001';if(!['001','002','003'].includes(candidate))throw Error('Invalid candidate');
const sourceHash=sha(canonical(content)),buildId=`g11-${sourceHash.slice(0,20)}`,runId=`G11-RECEIVER-${candidate}`,baseCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:project,encoding:'utf8'}).trim();
if(baseCommit!=='a35be1ccb61c802a8bd7282903a9665b2c7d1863')throw Error('Unexpected base commit');
const buildDir=join(here,'builds',buildId),runDir=join(here,'runs',runId);
async function newDir(path){try{await stat(path);throw Error(`Immutable path exists: ${path}`);}catch(e){if(e.code!=='ENOENT')throw e;}await mkdir(path,{recursive:true});}
await newDir(buildDir);await newDir(runDir);
for(const name of sourceFiles)await writeFile(join(buildDir,name),await read(join(here,name)));
await writeFile(join(buildDir,'fixture.json'),await read(join(docs,'fixture.json')));
const routes=['/','/index.html','/app.mjs','/model.mjs','/receiver.mjs','/style.css','/fixture.json','/build.json','/run/run.json','/run/initial-state.json','/run/events.jsonl','/run/checkpoints.json'];
const publicBuild={schema:'gate11-public-build-v1',runId,buildId,sourceHash,baseCommit,fixtureId:'G11-FIXTURE-001',nodeVersion:process.version,publicRoutes:routes,reviewRoutesRequireHashApproval:true,localSoftwareOnly:true,humanParticipants:0};
await writeFile(join(buildDir,'build.json'),JSON.stringify(publicBuild,null,2)+'\n');
const built=[];for(const name of [...sourceFiles,'fixture.json','build.json'])built.push({path:name,sha256:sha(await read(join(buildDir,name)))});
await writeFile(join(buildDir,'source-manifest.json'),JSON.stringify({schema:'gate11-source-manifest-v1',runId,buildId,sourceHash,baseCommit,nodeExecutable:process.execPath,nodeVersion:process.version,content,built},null,2)+'\n');
const fixture=JSON.parse(await read(join(docs,'fixture.json'))),hashes=await sourceHashes(fixture),certificates=await allCertificates(fixture),registry={};
registry.S0=await makeRevision(fixture,hashes,{id:'S0',parentId:null,fieldsBefore:[],requestedFields:[],triggerReceiverId:'R_COUNT',provenance:'scripted_demonstration',originEventReference:'initial-state'});
registry.S1=await makeRevision(fixture,hashes,{id:'S1',parentId:'S0',fieldsBefore:[],requestedFields:['calibration'],triggerReceiverId:'R_RELEASE',provenance:'scripted_demonstration',originEventReference:`${runId}-script:3`});
registry.S2=await makeRevision(fixture,hashes,{id:'S2',parentId:'S1',fieldsBefore:['calibration'],requestedFields:['authorization'],triggerReceiverId:'R_RELEASE',provenance:'scripted_demonstration',originEventReference:`${runId}-script:4`});
const semantic=s=>derive(fixture,s,registry,certificates,hashes).semanticPayload;
const initial=initialState(fixture),checkpoints=[];for(const seconds of fixture.savedTour.checkpointSeconds){const state=checkpointState(fixture,seconds),payload=semantic(state);checkpoints.push({seconds,state,payload,semanticFingerprint:await hash(payload),referenceOnly:true});}
let state={...clone(initial),paused:false},events=[],seq=0;const atBase=Date.parse('2026-09-20T00:00:00Z');
for(const spec of fixture.savedTour.events){state.cursorSeconds=spec.seconds;const before=semantic(state);
  if(spec.type==='receiver-select')state.receiverId=spec.payload.receiverId;
  else if(spec.type==='witness-open')state.witnessPair=clone(spec.payload.pair);
  else if(spec.type==='repair-apply')state.revisionId=spec.payload.revisionId;
  else if(spec.type==='representation-select')state.representation=spec.payload.representation;
  else if(spec.type==='canonical-restore'){state=initialState(fixture);state.cursorSeconds=24;state.paused=false;}
  else if(spec.type==='tour-stop'){state.paused=true;state.endReason='end-of-sequence';}
  const after=semantic(state);events.push({schema:'gate11-canonical-event-v1',sequence:++seq,eventId:`${runId}-script:${seq}`,atUtc:new Date(atBase+spec.seconds*1000).toISOString(),runId,buildId,documentId:'canonical-script',cursorSeconds:spec.seconds,origin:spec.origin,actor:'scripted_demonstration',provenance:'scripted_demonstration',type:spec.type,intended:spec.payload,result:'accepted',beforeSemanticFingerprint:await hash(before),afterSemanticFingerprint:await hash(after)});
}
const run={schema:'gate11-run-v1',runId,buildId,sourceHash,baseCommit,nodeExecutable:process.execPath,nodeVersion:process.version,fixtureId:fixture.fixtureId,fixtureSha256:sha(await read(join(docs,'fixture.json'))),prespecFreezeSha256:sha(freeze),host:'127.0.0.1',port:44004,durationSeconds:24,checkpointSeconds:fixture.savedTour.checkpointSeconds,scheduledEventCount:7,sourceFamilyHash:hashes.family,localSoftwareOnly:true,humanParticipants:0};
await writeFile(join(runDir,'run.json'),JSON.stringify(run,null,2)+'\n');
await writeFile(join(runDir,'initial-state.json'),JSON.stringify({state:initial,payload:semantic(initial),semanticFingerprint:await hash(semantic(initial))},null,2)+'\n');
await writeFile(join(runDir,'events.jsonl'),events.map(JSON.stringify).join('\n')+'\n');
await writeFile(join(runDir,'checkpoints.json'),JSON.stringify(checkpoints,null,2)+'\n');
await writeFile(join(runDir,'computational-results.json'),JSON.stringify({schema:'gate11-computational-results-v1',runId,fixtureId:fixture.fixtureId,sourceHashes:hashes,fullSourceAnswers:Object.fromEntries(fixture.worlds.map(w=>[w.id,{R_COUNT:fullAnswer(w,'R_COUNT'),R_RELEASE:fullAnswer(w,'R_RELEASE')}])),certificates,canonicalRevisions:registry,shortcutDisagreementWorlds:fixture.worlds.filter(w=>fullAnswer(w,'R_COUNT')!==fullAnswer(w,'R_RELEASE')).map(w=>w.id),humanParticipants:0},null,2)+'\n');
const runFiles=['run.json','initial-state.json','events.jsonl','checkpoints.json','computational-results.json'];await writeFile(join(runDir,'run-manifest.json'),JSON.stringify({schema:'gate11-run-manifest-v1',runId,buildId,files:await Promise.all(runFiles.map(async path=>({path,sha256:sha(await read(join(runDir,path)))})))},null,2)+'\n');
process.stdout.write(JSON.stringify({runId,buildId,sourceHash,buildDir,runDir,nodeExecutable:process.execPath,nodeVersion:process.version})+'\n');
