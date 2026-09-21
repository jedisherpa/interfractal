import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Gate9Engine} from './engine.mjs';
import {hash,informationHash,semanticFingerprint,visibleIndices} from './core.mjs';

const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'..');
const runId=process.env.LOOKING_GLASS_G9_RUN_ID||'G9-MATCHED-001',freezePath=join(root,'docs/gate-9/PRESPEC_FREEZE.json');
if(!/^G9-MATCHED-00[1-3]$/.test(runId))throw Error('Run ID outside frozen candidate allowance');
const freezePin='f91788e4ae31949bec265582afe4e879f9fafb4e05eb8cdb3c9c2c9cacc881cd';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const exists=path=>access(path).then(()=>true,()=>false);
const freezeBytes=await readFile(freezePath),freeze=JSON.parse(freezeBytes);
if(sha(freezeBytes)!==freezePin||freeze.gate!==9||freeze.files.length!==5)throw Error('Frozen Gate 9 prespec mismatch');
for(const f of freeze.files){const bytes=await readFile(join(root,f.path));if(sha(bytes)!==f.sha256||bytes.length!==f.bytes)throw Error(`Frozen file changed: ${f.path}`);}
const fixtureBytes=await readFile(join(root,'docs/gate-9/fixture.json')),fixture=JSON.parse(fixtureBytes);
const testResult=JSON.parse(execFileSync(process.execPath,[join(dir,'test.mjs')],{cwd:root,encoding:'utf8',maxBuffer:8_000_000}));
if(testResult.status!=='passed'||testResult.allOrderedChoiceCount!==9)throw Error('Gate 9 computation failed');
const publicNames=['index.html','style.css','app.mjs','core.mjs','engine.mjs','fixture.json'];
const internalNames=['server.mjs','build.mjs','test.mjs','README.md','PRESPEC_FREEZE.json','independent-predictions.json'];
const names=[...publicNames,...internalNames];
const bytes=await Promise.all(names.map(n=>n==='fixture.json'?Promise.resolve(fixtureBytes):n==='PRESPEC_FREEZE.json'?Promise.resolve(freezeBytes):n==='independent-predictions.json'?readFile(join(root,'docs/gate-9/independent-predictions.json')):readFile(join(dir,n))));
const digest=createHash('sha256');names.forEach((n,i)=>{digest.update(n);digest.update('\0');digest.update(bytes[i]);digest.update('\0');});
const sourceSha256=digest.digest('hex'),buildId=`g9-${sourceSha256.slice(0,16)}`;
const buildDir=join(dir,'builds',buildId),runDir=join(dir,'runs',runId);
const launch=`${process.execPath} ${join(buildDir,'server.mjs')}`;
const manifest=(ns,bs)=>ns.map((path,i)=>({path,sha256:sha(bs[i]),bytes:bs[i].length}));
if(await exists(buildDir)||await exists(runDir)){
  if(!(await exists(buildDir))||!(await exists(runDir)))throw Error('Partial candidate exists; preserve and inspect it');
  const old=JSON.parse(await readFile(join(runDir,'run.json')));
  if(old.buildId!==buildId||old.sourceSha256!==sourceSha256)throw Error('G9-MATCHED-001 is frozen to different source; preserve it and use an authorized correction candidate');
  for(let i=0;i<names.length;i++)if(sha(await readFile(join(buildDir,names[i])))!==sha(bytes[i]))throw Error(`Immutable build changed: ${names[i]}`);
  console.log(JSON.stringify({runId,buildId,sourceSha256,unchanged:true,launch},null,2));process.exit(0);
}
const gitHead=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
if(gitHead!==freeze.baseRevision)throw Error('Base revision changed');
const builtAtUtc=new Date().toISOString(),contextHash=await hash(fixture.commonContext);
const build={schemaVersion:'gate9-build-v1',runId,buildId,sourceSha256,publicFiles:manifest(publicNames,bytes.slice(0,publicNames.length)),internalFiles:manifest(internalNames,bytes.slice(publicNames.length)),gitHead,baseRevision:freeze.baseRevision,nodeVersion:process.version,nodeExecutable:process.execPath,builtAtUtc,prespecFreezeSha256:sha(freezeBytes),prespecFiles:freeze.files,publicFixtureSha256:sha(fixtureBytes),contextHash,renderer:'280x200 SVG; yaw 0°, pitch +20°, 80 CSS px/unit; exact rational labels',servedRoutes:['/','/index.html','/style.css','/app.mjs','/core.mjs','/engine.mjs','/fixture.json','/metadata.json','/api/build','/api/run','/api/initial-state','/api/checkpoints','/api/events','/api/computation','/review/results.html','/review/packet.md','/review/audit.md','/review/run-evidence.json','/review/source-review.md','/review/screenshots/<safe-name>']};
const metadata={runId,buildId,sourceSha256,fixtureId:fixture.fixtureId,contextHash};
const tour=await new Gate9Engine(fixture,{runId,buildId}).init();tour.sessionId=`${runId}-scripted-demonstration`;tour.draftId='canonical-draft';
const checkpoints=[];
for(const t of fixture.savedTour.checkpointsSeconds){
  if(t)await tour.advanceTourBoundary(t);
  const state=structuredClone(tour.state);state.tourPaused=true;state.presentationPaused=true;
  const acquired=state.acquiredOccurrenceIndices.map(i=>state.occurrences[i]);
  checkpoints.push({seconds:t,state,visibleOccurrenceIndices:visibleIndices(state),acquiredInformationHash:await informationHash(fixture,contextHash,acquired),semanticFingerprint:await semanticFingerprint(state)});
}
if(tour.events.length!==12)throw Error(`Expected 12 canonical semantic events, got ${tour.events.length}`);
const run={schemaVersion:'gate9-run-v1',gate:'G9',runId,buildId,sourceSha256,status:'scripted demonstration and mathematical software checks; browser validation separate',gitHead,baseRevision:freeze.baseRevision,nodeVersion:process.version,nodeExecutable:process.execPath,builtAtUtc,prespecFreezeSha256:sha(freezeBytes),prespecFiles:freeze.files,fixtureId:fixture.fixtureId,publicFixtureSha256:sha(fixtureBytes),contextHash,experimentVersion:'gate9-charter-v1',modelVersion:'gate9-model-v1',recordVersion:'gate9-record-v1',durationSeconds:24,checkpointSeconds:fixture.savedTour.checkpointsSeconds,scheduledEventCount:12,allOrderedChoiceCount:9,humanParticipantCount:0,humanPerformance:'untested',actor:'scripted_demonstration',eventsKind:'canonical scripted expectations; browser events exported separately',files:{initialState:'initial-state.json',checkpoints:'checkpoints.json',events:'events.jsonl',computationalResults:'computational-results.json'}};
await mkdir(buildDir,{recursive:true});for(let i=0;i<names.length;i++)await writeFile(join(buildDir,names[i]),bytes[i],{flag:'wx'});
await writeFile(join(buildDir,'build.json'),JSON.stringify(build,null,2)+'\n',{flag:'wx'});
await writeFile(join(buildDir,'metadata.json'),JSON.stringify(metadata,null,2)+'\n',{flag:'wx'});
await mkdir(runDir,{recursive:true});
for(const [name,data] of [['run.json',run],['initial-state.json',checkpoints[0]],['checkpoints.json',checkpoints],['computational-results.json',testResult]])await writeFile(join(runDir,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
await writeFile(join(runDir,'events.jsonl'),tour.events.map(e=>JSON.stringify(e)).join('\n')+'\n',{flag:'wx'});
console.log(JSON.stringify({runId,buildId,sourceSha256,prespecFreezeSha256:sha(freezeBytes),contextHash,modelChecks:testResult.status,allOrderedChoiceCount:9,scheduledEvents:12,checkpoints:10,launch},null,2));
