import {readFile,mkdir,copyFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {RUN_ID,DURATION_MS,SAMPLE_MS,STEP_MS,CHECKPOINTS_MS,modelAt,
  sourceState,localState,supportedRelationState,mappingState,summaryState,
  summaryHistoryState,receiverState,semanticState,checkpointState} from './model.mjs';

const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'..');
const BASE_REVISION='56a8e6956e455155326c6b2a7fa50ef2c89e3836';
const PRESPEC_SHA256='2241afcb9c3bcdffacfbc277d92c918d4c3678baa41e0f906467cfa81b020570';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hash=value=>sha(JSON.stringify(value));
const exists=path=>access(path).then(()=>true,()=>false);
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const freezeBytes=await readFile(join(root,'docs/gate-6/PRESPEC_FREEZE.json'));
if(sha(freezeBytes)!==PRESPEC_SHA256)throw Error('Gate 6 prespec freeze byte pin mismatch');
const freeze=JSON.parse(freezeBytes);
if(freeze.baseRevision!==BASE_REVISION||freeze.files.length!==5)throw Error('Unexpected Gate 6 freeze metadata');
for(const file of freeze.files){
  const bytes=await readFile(join(root,file.path));
  if(sha(bytes)!==file.sha256||bytes.length!==file.bytes)throw Error(`Frozen prespec mismatch: ${file.path}`);
}
for(const pin of freeze.sourcePins){
  const historical=await readFile(join(root,pin.path));
  const copy=await readFile(join(dir,basename(pin.path)));
  if(sha(historical)!==pin.sha256||historical.length!==pin.bytes||!copy.equals(historical))
    throw Error(`Gate 2 source pin mismatch: ${pin.path}`);
}
execFileSync(process.execPath,[join(dir,'test.mjs')],{cwd:root,stdio:'inherit'});

const sourceNames=['index.html','style.css','app.mjs','model.mjs','server.mjs','build.mjs','test.mjs','README.md',
  'fictional-records.json','reference-mappings.json','fixture.json'];
const contents=await Promise.all(sourceNames.map(name=>readFile(join(dir,name))));
const digest=createHash('sha256');
sourceNames.forEach((name,i)=>{digest.update(name);digest.update('\0');digest.update(contents[i]);digest.update('\0');});
const sourceSha256=digest.digest('hex'),buildId=`g6-${sourceSha256.slice(0,16)}`;
const buildDir=join(dir,'builds',buildId),runDir=join(dir,'runs',RUN_ID);
if(await exists(join(runDir,'run.json'))){
  const prior=await json(join(runDir,'run.json'));
  if(prior.buildId!==buildId||prior.sourceSha256!==sourceSha256)
    throw Error(`${RUN_ID} is preserved with ${prior.buildId}; use the next candidate ID and keep this run`);
  console.log(JSON.stringify({runId:RUN_ID,buildId,sourceSha256,unchanged:true,
    launch:`node ${join(buildDir,'server.mjs')}`},null,2));
  process.exit(0);
}
if(await exists(join(buildDir,'build.json')))
  throw Error(`Build ${buildId} already exists without ${RUN_ID}; inspect the partial candidate before retrying`);

const [source,refs,gate]=await Promise.all(['fictional-records.json','reference-mappings.json','fixture.json']
  .map(name=>json(join(dir,name))));
const fingerprint=s=>({sourceSha256:hash(sourceState(s)),localSha256:hash(localState(s)),
  relationsSha256:hash(supportedRelationState(s)),mappingSha256:hash(mappingState(s)),
  summarySha256:hash(summaryState(s)),summaryHistorySha256:hash(summaryHistoryState(s)),
  receiverSha256:hash(receiverState(s)),semanticSha256:hash(semanticState(s)),
  checkpointSha256:hash(checkpointState(s))});
const checkpoints=CHECKPOINTS_MS.map(ms=>{
  const state=modelAt(ms,source.records,refs,gate);
  return {simulationTimeMs:ms,state,...fingerprint(state)};
});
const initial=checkpoints[0];
const gitHead=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const builtAtUtc=new Date().toISOString();
const dependencyIdentity='Node.js built-ins and browser SVG/HTML only; no package, lockfile, external asset or source seed';
const renderer='Browser HTML/SVG local-context diagram and equivalent plain table; arbitrary layout without geometric inference';
const build={schemaVersion:'gate-6-build-v1',buildId,sourceSha256,
  sourceFiles:sourceNames.map((path,i)=>({path,sha256:sha(contents[i]),bytes:contents[i].length})),
  gitHead,baseRevision:BASE_REVISION,uncommittedSourceIdentity:sourceSha256,
  dependencyIdentity,nodeVersion:process.version,builtAtUtc,prespecFreezeSha256:PRESPEC_SHA256,
  prespecFrozenAtUtc:freeze.frozenAtUtc,prespecFiles:freeze.files,sourcePins:freeze.sourcePins,
  fixtureSha256:sha(await readFile(join(dir,'fixture.json'))),renderer,
  fingerprintAlgorithm:'SHA-256 of UTF-8 JSON.stringify of declared state boundary, in fixed property order'};
const run={schemaVersion:'gate-6-run-v1',runId:RUN_ID,gate:'G6',
  status:'planned deterministic fixture; actual browser results and activity stored separately',
  experimentVersion:'gate-6-charter-v1',modelVersion:'gate-6-model-v1',eventSchemaVersion:'gate-6-record-v1',
  generatorVersion:'gate-6-builder-v1',buildId,sourceSha256,gitHead,baseRevision:BASE_REVISION,
  uncommittedSourceIdentity:sourceSha256,dependencyIdentity,nodeVersion:process.version,builtAtUtc,
  prespecFreezeSha256:PRESPEC_SHA256,prespecFrozenAtUtc:freeze.frozenAtUtc,prespecFiles:freeze.files,
  sourcePins:freeze.sourcePins,fixtureSha256:build.fixtureSha256,renderer,sourceSeed:null,
  durationMs:DURATION_MS,sampleMs:SAMPLE_MS,stepMs:STEP_MS,checkpointTimesMs:CHECKPOINTS_MS,
  localContextCount:gate.localContexts.length,sourceRecordCount:source.records.length,
  supportedRelationCount:gate.supportedRelations.length,unsupportedClaimCount:1,
  initialStateFile:'initial-state.json',checkpointsFile:'checkpoints.json',
  eventsFile:'events.jsonl',activityFile:'activity.jsonl',
  eventsKind:'planned deterministic fixture; not observed browser controls',
  initialSourceSha256:initial.sourceSha256,initialLocalSha256:initial.localSha256,
  initialRelationsSha256:initial.relationsSha256,initialMappingSha256:initial.mappingSha256,
  initialSummarySha256:initial.summarySha256,initialSummaryHistorySha256:initial.summaryHistorySha256,
  initialReceiverSha256:initial.receiverSha256,initialCheckpointSha256:initial.checkpointSha256,
  fingerprintAlgorithm:build.fingerprintAlgorithm};
const planned=[{seq:1,kind:'planned-fixture',type:'replay.open',simulationTimeMs:0,
  actor:'fixture-generator',origin:'planned-fixture',intended:{openingState:'paused-at-start',runId:RUN_ID,buildId}},
  ...checkpoints.map((cp,i)=>({seq:i+2,kind:'planned-fixture',type:'checkpoint.expected',
    simulationTimeMs:cp.simulationTimeMs,actor:'fixture-generator',origin:'planned-fixture',
    expected:Object.fromEntries(Object.entries(cp).filter(([k])=>k.endsWith('Sha256')))})),
  {seq:checkpoints.length+2,kind:'planned-fixture',type:'playback.pause',simulationTimeMs:DURATION_MS,
    actor:'fixture-generator',origin:'planned-fixture',intended:{reason:'end-of-sequence'}}];
await mkdir(buildDir,{recursive:true});
for(const name of sourceNames)await copyFile(join(dir,name),join(buildDir,name));
await writeFile(join(buildDir,'build.json'),JSON.stringify(build,null,2)+'\n',{flag:'wx'});
await mkdir(runDir,{recursive:true});
for(const [name,value] of [['run.json',run],['initial-state.json',initial],['checkpoints.json',checkpoints]])
  await writeFile(join(runDir,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
await writeFile(join(runDir,'events.jsonl'),planned.map(e=>JSON.stringify(e)).join('\n')+'\n',{flag:'wx'});
await writeFile(join(runDir,'activity.jsonl'),'',{flag:'wx'});
console.log(JSON.stringify({runId:RUN_ID,buildId,sourceSha256,prespecFreezeSha256:PRESPEC_SHA256,
  launch:`node ${join(buildDir,'server.mjs')}`},null,2));
