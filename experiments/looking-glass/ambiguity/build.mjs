import {readFile, writeFile, copyFile, mkdir, access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {RUN_ID, CHECKPOINT_SECONDS, stateAt, semanticFingerprint, informationFingerprint,
  deriveView} from './model.mjs';

const dir=dirname(fileURLToPath(import.meta.url)), root=resolve(dir,'..');
const docsDir=join(root,'docs/gate-8');
const freezePath=join(docsDir,'PRESPEC_FREEZE.json');
const PRESPEC_SHA256='38f1cbae00339eb9d4d1f1ee097fdb124b120c598ecea4c69c3ee7af8c19e7b8';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const exists=path=>access(path).then(()=>true,()=>false);
const freezeBytes=await readFile(freezePath), freeze=JSON.parse(freezeBytes);
if(sha(freezeBytes)!==PRESPEC_SHA256) throw new Error('Gate 8 freeze byte pin mismatch');
if(freeze.gate!==8||freeze.files.length!==5) throw new Error('Gate 8 freeze must pin five files');
for(const entry of freeze.files) {
  const bytes=await readFile(join(root,entry.path));
  if(sha(bytes)!==entry.sha256||bytes.length!==entry.bytes)
    throw new Error(`Frozen file mismatch: ${entry.path}`);
}
const fixtureBytes=await readFile(join(docsDir,'fixture.json'));
const localFixture=join(dir,'fixture.json');
if(await exists(localFixture)) {
  if(!Buffer.from(await readFile(localFixture)).equals(fixtureBytes)) throw new Error('Public fixture copy differs from freeze');
} else await writeFile(localFixture,fixtureBytes,{flag:'wx'});
const fixture=JSON.parse(fixtureBytes);
const computational=JSON.parse(execFileSync(process.execPath,[join(dir,'test.mjs')],
  {cwd:root,encoding:'utf8',maxBuffer:8_000_000}));
if(computational.status!=='passed') throw new Error('Model checks failed');
const publicNames=['index.html','style.css','app.mjs','model.mjs','hash.mjs','fixture.json'];
const internalNames=['server.mjs','build.mjs','test.mjs','README.md','PRESPEC_FREEZE.json','independent-predictions.json'];
const sourcePaths=[...publicNames,...internalNames];
const sourceBytes=await Promise.all(sourcePaths.map(name=>
  name==='PRESPEC_FREEZE.json'?Promise.resolve(freezeBytes):
  name==='independent-predictions.json'?readFile(join(docsDir,name)):readFile(join(dir,name))));
const digest=createHash('sha256');
sourcePaths.forEach((name,i)=>{digest.update(name);digest.update('\0');digest.update(sourceBytes[i]);digest.update('\0');});
const sourceSha256=digest.digest('hex'), buildId=`g8-${sourceSha256.slice(0,16)}`;
const buildDir=join(dir,'builds',buildId), runDir=join(dir,'runs',RUN_ID);
const launch=`${process.execPath} ${join(buildDir,'server.mjs')}`;
if(await exists(join(runDir,'run.json'))) {
  const old=JSON.parse(await readFile(join(runDir,'run.json'),'utf8'));
  if(old.buildId!==buildId||old.sourceSha256!==sourceSha256)
    throw new Error(`${RUN_ID} already preserves ${old.buildId}; create an authorized next candidate and retain this one`);
  console.log(JSON.stringify({runId:RUN_ID,buildId,sourceSha256,unchanged:true,launch},null,2));
  process.exit(0);
}
if(await exists(buildDir)||await exists(runDir)) throw new Error('Partial candidate exists; inspect it before any retry');
const manifest=(names,bytes)=>names.map((path,i)=>({path,sha256:sha(bytes[i]),bytes:bytes[i].length}));
const builtAtUtc=new Date().toISOString();
const gitHead=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const build={schemaVersion:'gate8-build-v1',buildId,runId:RUN_ID,sourceSha256,
  publicFiles:manifest(publicNames,sourceBytes.slice(0,publicNames.length)),
  internalFiles:manifest(internalNames,sourceBytes.slice(publicNames.length)),
  servedRoutes:['/','/index.html','/style.css','/app.mjs','/model.mjs','/hash.mjs','/fixture.json',
    '/api/run','/api/build','/api/checkpoints','/api/events','POST /api/activity',
    '/review/results.html','/review/packet.md','/review/audit.md','/review/run-evidence.json',
    '/review/source-review.md','/review/screenshots/<original-name>'],
  gitHead,baseRevision:freeze.baseRevision,nodeVersion:process.version,nodeExecutable:process.execPath,
  dependencyIdentity:'Node.js built-ins and browser HTML/SVG only; no package, lockfile or external asset',
  builtAtUtc,prespecFreezeSha256:sha(freezeBytes),prespecFiles:freeze.files,
  publicFixtureSha256:sha(fixtureBytes),renderer:'Fixed 43 px/unit SVG, yaw about display y, fixed pitch 20°, no autoscale; exact records separate'};
const checkpoints=CHECKPOINT_SECONDS.map(timeSeconds=>{
  const state=stateAt(timeSeconds,fixture),view=deriveView(state,fixture);
  return {timeSeconds,state,observedBundle:view.observedBundle,
    compatibleWorldIds:view.compatibleWorldIds,localPropertyDetermined:view.localPropertyDetermined,
    semanticFingerprint:semanticFingerprint(state,fixture),informationFingerprint:informationFingerprint(state,fixture)};
});
const planned=[];
let prior={...stateAt(0,fixture),paused:false};
function record(timeSeconds,origin,type,intended,next,reason=null) {
  const before={...prior,cursorSeconds:timeSeconds};
  const after={...next,cursorSeconds:timeSeconds};
  planned.push({seq:planned.length+1,kind:'planned-fixture',timeUtc:builtAtUtc,
    runId:RUN_ID,buildId,origin,actor:'fixture-generator',simulationCursorSeconds:timeSeconds,
    type,intended,reason,beforeSemanticFingerprint:semanticFingerprint(before,fixture),
    afterSemanticFingerprint:semanticFingerprint(after,fixture)});
  prior=after;
}
for(const t of CHECKPOINT_SECONDS.slice(1)) {
  if([8,20,28].includes(t)) {
    const next={...stateAt(t,fixture),paused:false};
    record(t,'replay','case-select',{caseId:next.caseId,referenceWorldId:next.referenceWorldId,resetToBaseline:true},next);
  }
  const additions=t===4||t===12||t===32?['xw90']:t===16?['yv90']:t===24?['sliceMinus2','slicePlus2']:[];
  for(const queryId of additions) {
    const caseData=fixture.cases.find(item=>item.id===prior.caseId);
    const selected=caseData.additionalQueryIds.filter(id=>prior.selectedAdditionalQueryIds.includes(id)||id===queryId);
    record(t,'replay','add-query',{queryId},{...prior,selectedAdditionalQueryIds:selected});
  }
  if(t===32) record(t,'automatic','tour-stop',{cursorSeconds:32},{...prior,paused:true},'end-of-sequence');
}
const run={schemaVersion:'gate8-run-v1',gate:'G8',runId:RUN_ID,buildId,sourceSha256,
  status:'planned deterministic software demonstration; browser activity is separate',
  gitHead,baseRevision:freeze.baseRevision,nodeVersion:process.version,nodeExecutable:process.execPath,
  builtAtUtc,prespecFreezeSha256:sha(freezeBytes),prespecFiles:freeze.files,
  publicFixtureSha256:sha(fixtureBytes),fixtureId:fixture.fixtureId,fixtureVersion:fixture.schema,
  experimentVersion:'gate8-charter-v1',modelVersion:'gate8-model-v1',eventSchemaVersion:'gate8-record-v1',
  renderer:build.renderer,durationSeconds:32,checkpointSeconds:CHECKPOINT_SECONDS,
  candidateCount:fixture.cases.reduce((count,item)=>count+item.worlds.length,0),
  humanParticipantCount:0,actor:'unattributed_local',answerCount:0,
  initialStateFile:'initial-state.json',checkpointsFile:'checkpoints.json',eventsFile:'events.jsonl',
  activityFile:'activity.jsonl',computationalResultsFile:'computational-results.json',
  eventsKind:'planned fixture expectations, not observed browser controls',
  fingerprintAlgorithm:'SHA-256 of fixed-order UTF-8 JSON; full exact observation strings'};
await mkdir(buildDir,{recursive:true});
for(let i=0;i<sourcePaths.length;i++) await writeFile(join(buildDir,sourcePaths[i]),sourceBytes[i],{flag:'wx'});
await writeFile(join(buildDir,'build.json'),JSON.stringify(build,null,2)+'\n',{flag:'wx'});
await mkdir(runDir,{recursive:true});
for(const [name,data] of [['run.json',run],['initial-state.json',checkpoints[0]],
  ['checkpoints.json',checkpoints],['computational-results.json',computational]])
  await writeFile(join(runDir,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
await writeFile(join(runDir,'events.jsonl'),planned.map(event=>JSON.stringify(event)).join('\n')+'\n',{flag:'wx'});
await writeFile(join(runDir,'activity.jsonl'),'',{flag:'wx'});
console.log(JSON.stringify({runId:RUN_ID,buildId,sourceSha256,prespecFreezeSha256:sha(freezeBytes),
  modelChecks:computational.status,plannedEvents:planned.length,launch},null,2));
