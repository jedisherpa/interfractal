import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonical,canonicalStateAt,semanticPayload,freshState} from './model.mjs';

const here=dirname(fileURLToPath(import.meta.url)),project=resolve(here,'..'),docs=join(project,'docs/gate-10');
const nodeRequired='/opt/homebrew/Cellar/node@24/24.17.0/bin/node';
if(process.execPath!==nodeRequired||process.version!=='v24.17.0')throw Error(`Use exact Node ${nodeRequired} v24.17.0`);
const sha=b=>createHash('sha256').update(b).digest('hex');
const get=async p=>readFile(p);
const prespec=JSON.parse(await get(join(docs,'PRESPEC_FREEZE.json')));
const frozenBytes=await get(join(docs,'PRESPEC_FREEZE.json'));
if(sha(frozenBytes)!=='3dba94a05674bf8760ea036a4115010ae524e2211d7aa7ecf404139dba3f9d56')throw Error('Prespec freeze changed');
const sourceFiles=['README.md','app.mjs','build.mjs','index.html','math.mjs','model.mjs','server.mjs','service.mjs','style.css','test.mjs'];
const prespecFiles=['PRESPEC_FREEZE.json','experiment-charter.md','fixture.json','independent-predictions.json','model-contract.md','private-answer-key.json','record-contract.md'];
const content=[];for(const name of sourceFiles)content.push({path:`prediction-transfer/${name}`,sha256:sha(await get(join(here,name)))});
for(const name of prespecFiles)content.push({path:`docs/gate-10/${name}`,sha256:sha(await get(join(docs,name)))});
const candidate=process.argv[2]==='--candidate'?process.argv[3]:'001';if(!['001','002','003'].includes(candidate))throw Error('Invalid candidate');
const sourceHash=sha(canonical(content)),buildId=`g10-${sourceHash.slice(0,20)}`,runId=`G10-PREDICT-${candidate}`;
const buildDir=join(here,'builds',buildId),runDir=join(here,'runs',runId);
const fixture=JSON.parse(await get(join(docs,'fixture.json')));
const baseCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:project,encoding:'utf8'}).trim();
if(baseCommit!=='9e39c0332d7b34f60a9e779cdbff7fd93e6acee1')throw Error('Unexpected base commit');
async function mkdirNew(dir){try{await stat(dir);throw Error(`Immutable directory exists: ${dir}`);}catch(e){if(e.code!=='ENOENT')throw e;}await mkdir(dir,{recursive:true});}
await mkdirNew(buildDir);await mkdirNew(runDir);
for(const name of sourceFiles)await writeFile(join(buildDir,name),await get(join(here,name)));
await writeFile(join(buildDir,'fixture.json'),await get(join(docs,'fixture.json')));
await mkdir(join(buildDir,'private'));
for(const name of ['private-answer-key.json','independent-predictions.json','PRESPEC_FREEZE.json'])await writeFile(join(buildDir,'private',name),await get(join(docs,name)));
const routes=['/','/index.html','/app.mjs','/model.mjs','/style.css','/fixture.json','/build.json','/run/run.json','/run/initial-state.json','/run/events.jsonl','/run/checkpoints.json'];
const publicBuild={schema:'gate10-public-build-v1',runId,buildId,fixtureId:fixture.fixtureId,sourceHash,baseCommit,nodeVersion:process.version,publicRoutes:routes,apiRoutes:['/api/session','/api/start','/api/commit','/api/reveal','/api/close','/api/export'],localSoftwareOnly:true,humanParticipants:0};
await writeFile(join(buildDir,'build.json'),JSON.stringify(publicBuild,null,2)+'\n');
const privateBuild={schema:'gate10-private-build-manifest-v1',runId,buildId,sourceHash,baseCommit,nodeExecutable:process.execPath,nodeVersion:process.version,sourceContent:content,buildFiles:[]};
for(const name of [...sourceFiles,'fixture.json','build.json','private/private-answer-key.json','private/independent-predictions.json','private/PRESPEC_FREEZE.json'])privateBuild.buildFiles.push({path:name,sha256:sha(await get(join(buildDir,name)))});
await writeFile(join(buildDir,'private/build-manifest.json'),JSON.stringify(privateBuild,null,2)+'\n');
const hashState=s=>sha(canonical(semanticPayload(s,fixture)));
const initial=freshState();
const checkpoints=fixture.savedTour.checkpoints.map(seconds=>{const state=canonicalStateAt(fixture,seconds),payload=semanticPayload(state,fixture);return {seconds,state,payload,semanticFingerprint:sha(canonical(payload)),referenceOnly:true};});
const baseUtc=Date.parse('2026-09-20T00:00:00.000Z');let seq=0,events=[];
for(const seconds of [4,8,12,16,20]){
  const before=canonicalStateAt(fixture,seconds-4);before.cursorSeconds=seconds;before.paused=false;
  const after=structuredClone(before);after.caseId=fixture.savedTour.caseOrder[seconds/4];
  events.push({schema:'gate10-canonical-event-v1',sequence:++seq,eventId:`${runId}-script:${seq}`,atUtc:new Date(baseUtc+seconds*1000).toISOString(),runId,buildId,origin:'replay',actor:'scripted_demonstration',provenance:'scripted_demonstration',type:'case-select',cursorSeconds:seconds,intended:{caseId:after.caseId,boundarySeconds:seconds},result:'accepted',beforeSemanticFingerprint:hashState(before),afterSemanticFingerprint:hashState(after)});
}
{
  const before=canonicalStateAt(fixture,20);before.paused=false;before.reviewStatus='standard-playback';
  const after=structuredClone(before);after.paused=true;after.reviewStatus='end-of-sequence';
  events.push({schema:'gate10-canonical-event-v1',sequence:++seq,eventId:`${runId}-script:${seq}`,atUtc:new Date(baseUtc+20000).toISOString(),runId,buildId,origin:'automatic',actor:'scripted_demonstration',provenance:'scripted_demonstration',type:'tour-stop',cursorSeconds:20,intended:{reason:'end-of-sequence'},result:'accepted',beforeSemanticFingerprint:hashState(before),afterSemanticFingerprint:hashState(after)});
}
const run={schema:'gate10-run-v1',runId,buildId,sourceHash,baseCommit,nodeExecutable:process.execPath,nodeVersion:process.version,fixtureId:fixture.fixtureId,fixtureSha256:sha(await get(join(docs,'fixture.json'))),prespecFreezeSha256:sha(frozenBytes),port:44003,host:'127.0.0.1',durationSeconds:20,checkpointSeconds:fixture.savedTour.checkpoints,scheduledEventCount:6,localSoftwareOnly:true,humanParticipants:0};
await writeFile(join(runDir,'run.json'),JSON.stringify(run,null,2)+'\n');
await writeFile(join(runDir,'initial-state.json'),JSON.stringify({state:initial,payload:semanticPayload(initial,fixture),semanticFingerprint:hashState(initial)},null,2)+'\n');
await writeFile(join(runDir,'events.jsonl'),events.map(x=>JSON.stringify(x)).join('\n')+'\n');
await writeFile(join(runDir,'checkpoints.json'),JSON.stringify(checkpoints,null,2)+'\n');
await writeFile(join(runDir,'computational-results.json'),JSON.stringify({schema:'gate10-computational-results-v1',fixtureId:fixture.fixtureId,source:'builder math model test; not human observations',cases:fixture.tasks.map(t=>({caseId:t.id,category:t.category})),responseCount:0,revealCount:0,humanParticipants:0},null,2)+'\n');
await writeFile(join(runDir,'run-manifest.json'),JSON.stringify({schema:'gate10-run-manifest-v1',runId,buildId,files:await Promise.all(['run.json','initial-state.json','events.jsonl','checkpoints.json','computational-results.json'].map(async path=>({path,sha256:sha(await get(join(runDir,path)))})))},null,2)+'\n');
process.stdout.write(JSON.stringify({runId,buildId,sourceHash,buildDir,runDir,nodeExecutable:process.execPath,nodeVersion:process.version})+'\n');
