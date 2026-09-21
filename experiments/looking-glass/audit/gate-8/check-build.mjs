import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import * as model from '../../ambiguity/builds/g8-f5c5ee62889da529/model.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const buildDir=join(root,'ambiguity/builds/g8-f5c5ee62889da529');
const runDir=join(root,'ambiguity/runs/G8-AMBIGUITY-001');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const fixture=await json(join(root,'docs/gate-8/fixture.json'));
const expected=await json(join(root,'audit/gate-8/independent-results.json'));
const freeze=await json(join(root,'docs/gate-8/PRESPEC_FREEZE.json'));
const build=await json(join(buildDir,'build.json'));
const run=await json(join(runDir,'run.json'));
const checkpoints=await json(join(runDir,'checkpoints.json'));
const computed=await json(join(runDir,'computational-results.json'));
const freezeBytes=await readFile(join(root,'docs/gate-8/PRESPEC_FREEZE.json'));
const freezeSha=digest(freezeBytes);
assert.equal(freezeSha,'38f1cbae00339eb9d4d1f1ee097fdb124b120c598ecea4c69c3ee7af8c19e7b8');
assert.equal(digest(await readFile(join(root,'audit/gate-8/prespec-review.md'))),freeze.independentReviewSha256);
assert.equal(digest(await readFile(join(root,freeze.clarificationReview.path))),freeze.clarificationReview.sha256);
for(const entry of freeze.files){
  const bytes=await readFile(join(root,entry.path));
  assert.equal(digest(bytes),entry.sha256,entry.path);
  assert.equal(bytes.length,entry.bytes,entry.path);
}
assert.equal(run.prespecFreezeSha256,freezeSha);
assert.equal(build.prespecFreezeSha256,freezeSha);
assert.equal(build.buildId,run.buildId);
assert.equal(run.sourceSha256,build.sourceSha256);
assert.equal(run.gitHead,freeze.baseRevision);
assert.equal(build.gitHead,freeze.baseRevision);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),freeze.baseRevision);
assert.equal(run.nodeVersion,build.nodeVersion);
assert.equal(run.nodeExecutable,build.nodeExecutable);
assert.equal(run.nodeExecutable,process.execPath);
assert.equal(run.nodeVersion,process.version);
assert.equal(run.fixtureId,fixture.fixtureId);
assert.equal(run.humanParticipantCount,0);
assert.equal(run.answerCount,0);
assert.equal(run.durationSeconds,32);
assert.deepEqual(run.checkpointSeconds,[0,4,8,12,16,20,24,28,32]);
const sourceDigest=createHash('sha256');
for(const entry of [...build.publicFiles,...build.internalFiles]){
  const bytes=await readFile(join(buildDir,entry.path));
  assert.equal(digest(bytes),entry.sha256,entry.path);
  assert.equal(bytes.length,entry.bytes,entry.path);
  sourceDigest.update(entry.path);sourceDigest.update('\0');sourceDigest.update(bytes);sourceDigest.update('\0');
  const original=entry.path==='PRESPEC_FREEZE.json'?join(root,'docs/gate-8/PRESPEC_FREEZE.json'):
    entry.path==='independent-predictions.json'?join(root,'docs/gate-8/independent-predictions.json'):
    join(root,'ambiguity',entry.path);
  assert.deepEqual(bytes,await readFile(original),`source copy ${entry.path}`);
}
assert.equal(sourceDigest.digest('hex'),build.sourceSha256);
assert.equal(build.buildId,`g8-${build.sourceSha256.slice(0,16)}`);
assert.equal(digest(await readFile(join(buildDir,'fixture.json'))),freeze.files.find(x=>x.path==='docs/gate-8/fixture.json').sha256);
assert.equal(digest(await readFile(join(buildDir,'PRESPEC_FREEZE.json'))),freezeSha);
assert.equal(checkpoints.length,9);
assert.deepEqual(await json(join(runDir,'initial-state.json')),checkpoints[0]);
assert.equal(computed.status,'passed');
assert.equal(computed.pairCount,9);
assert.equal(computed.subsetCount,12);
assert.equal(computed.exactBaselineCollisions,8);

let observations=0,pairs=0,subsets=0;
for(const caseData of fixture.cases){
  const reference=expected.caseResults[caseData.id];
  for(const world of caseData.worlds){
    for(const query of caseData.queries){
      assert.deepEqual(model.observe(world,query),reference.observations[world.id][query.id]);
      observations++;
    }
  }
  const certificate=model.enumerateCertificate(caseData);
  assert.deepEqual(certificate.baselinePairDiagnostics,reference.baselinePairDiagnostics);
  assert.deepEqual(certificate.separatingPairsByAdditionalQuery,reference.separatingPairsByAdditionalQuery);
  assert.deepEqual(certificate.subsets,reference.subsets);
  assert.deepEqual(certificate.minimum,reference.minimum);
  assert.equal(certificate.subsetCountExamined,reference.subsets.length);
  assert.deepEqual(computed.cases[caseData.id].certificate,certificate);
  for(const world of caseData.worlds){
    assert.deepEqual(computed.cases[caseData.id].observations[world.id],reference.observations[world.id]);
  }
  pairs+=certificate.baselinePairDiagnostics.length;
  subsets+=certificate.subsets.length;
  const state={...model.stateAt(0,fixture),caseId:caseData.id,referenceWorldId:caseData.defaultReferenceWorldId};
  const initialInfo=model.informationFingerprint(state,fixture);
  const initialView=model.deriveView(state,fixture);
  for(const yaw of fixture.cameraYawDegrees){
    const camera={...state,cameraYawDegrees:yaw};
    assert.equal(model.informationFingerprint(camera,fixture),initialInfo);
    assert.deepEqual(model.deriveView(camera,fixture).observedBundle,initialView.observedBundle);
    assert.deepEqual(model.deriveView(camera,fixture).compatibleWorldIds,initialView.compatibleWorldIds);
  }
  const certState={...state,certificateVisible:true};
  assert.equal(model.informationFingerprint(certState,fixture),initialInfo);
  const forbidden=model.transition(state,{type:'add-query',value:'slicePlusHalf'},fixture);
  assert.equal(forbidden.result,'off-menu');assert.deepEqual(forbidden.state,state);
  const first=caseData.additionalQueryIds[0];
  const once=model.transition(state,{type:'add-query',value:first},fixture);
  const twice=model.transition(once.state,{type:'add-query',value:first},fixture);
  assert.equal(twice.result,'already-selected');
  assert.deepEqual(twice.state,once.state);
  for(const world of caseData.worlds){
    const alt={...state,referenceWorldId:world.id};
    const bundle=model.deriveView(alt,fixture).observedBundle;
    if(JSON.stringify(bundle)===JSON.stringify(initialView.observedBundle))
      assert.equal(model.informationFingerprint(alt,fixture),initialInfo);
  }
}
assert.equal(observations,28);assert.equal(pairs,9);assert.equal(subsets,12);
const c02=fixture.cases.find(c=>c.id==='G8-C02');
const b02={...model.stateAt(8,fixture)};
const xy=model.transition(model.transition(b02,{type:'add-query',value:'xw90'},fixture).state,
  {type:'add-query',value:'yv90'},fixture).state;
const yx=model.transition(model.transition(b02,{type:'add-query',value:'yv90'},fixture).state,
  {type:'add-query',value:'xw90'},fixture).state;
assert.deepEqual(model.deriveView(xy,fixture).observedBundle,model.deriveView(yx,fixture).observedBundle);
assert.equal(model.informationFingerprint(xy,fixture),model.informationFingerprint(yx,fixture));
assert.equal(model.enumerateCertificate(c02).minimum.size,2);
assert.equal(model.roundedLabel('-1/1000000000000'),'0.00');

for(let i=0;i<checkpoints.length;i++){
  const cp=checkpoints[i], independentlyExpected=expected.canonicalCheckpoints[i];
  assert.equal(cp.timeSeconds,independentlyExpected.timeSeconds);
  assert.equal(cp.state.caseId,independentlyExpected.caseId);
  assert.deepEqual(cp.state.selectedAdditionalQueryIds,independentlyExpected.selectedAdditionalQueryIds);
  assert.deepEqual(cp.compatibleWorldIds,independentlyExpected.compatibleWorldIds);
  assert.equal(cp.localPropertyDetermined,independentlyExpected.localPropertyDetermined);
  assert.deepEqual(cp.observedBundle,model.deriveView(cp.state,fixture).observedBundle);
  assert.equal(cp.semanticFingerprint,model.semanticFingerprint(cp.state,fixture));
  assert.equal(cp.informationFingerprint,model.informationFingerprint(cp.state,fixture));
  assert.deepEqual(computed.checkpoints[i].state,cp.state);
}
const lines=(await readFile(join(runDir,'events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
assert.equal(lines.length,10);
assert.deepEqual(lines.map(e=>[e.simulationCursorSeconds,e.origin,e.type]),[
  [4,'replay','add-query'],[8,'replay','case-select'],[12,'replay','add-query'],
  [16,'replay','add-query'],[20,'replay','case-select'],[24,'replay','add-query'],
  [24,'replay','add-query'],[28,'replay','case-select'],[32,'replay','add-query'],
  [32,'automatic','tour-stop']]);
let prior={...model.stateAt(0,fixture),paused:false};
for(const [i,event] of lines.entries()){
  assert.equal(event.seq,i+1);
  assert.equal(event.kind,'planned-fixture');
  assert.equal(event.actor,'fixture-generator');
  assert.equal(event.runId,run.runId);assert.equal(event.buildId,run.buildId);
  assert.equal(event.beforeSemanticFingerprint,model.semanticFingerprint({...prior,cursorSeconds:event.simulationCursorSeconds},fixture));
  let after={...prior,cursorSeconds:event.simulationCursorSeconds};
  if(event.type==='case-select') after={...model.stateAt(event.simulationCursorSeconds,fixture),paused:false};
  if(event.type==='add-query'){
    const caseData=fixture.cases.find(c=>c.id===after.caseId);
    after.selectedAdditionalQueryIds=caseData.additionalQueryIds.filter(q=>
      after.selectedAdditionalQueryIds.includes(q)||q===event.intended.queryId);
  }
  if(event.type==='tour-stop'){
    assert.equal(event.reason,'end-of-sequence');after.paused=true;
  }
  assert.equal(event.afterSemanticFingerprint,model.semanticFingerprint(after,fixture));
  prior=after;
}
assert.equal(lines[6].beforeSemanticFingerprint,lines[5].afterSemanticFingerprint);
assert.equal(lines[9].beforeSemanticFingerprint,lines[8].afterSemanticFingerprint);
assert.equal(lines[9].afterSemanticFingerprint,checkpoints.at(-1).semanticFingerprint);
const report={kind:'gate8-independent-build-audit',status:'PASS',buildId:build.buildId,
  sourceSha256:build.sourceSha256,prespecFreezeSha256:freezeSha,
  observations,pairs,subsets,checkpoints:checkpoints.length,plannedEvents:lines.length,
  runtime:{nodeVersion:run.nodeVersion,nodeExecutable:run.nodeExecutable},
  historyEntriesPreviouslyVerified:979,
  browserAndObservedEvents:'pending host capture'};
await writeFile(join(root,'audit/gate-8/build-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
