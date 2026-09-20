import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as model from '../../ambiguity/builds/g8-f5c5ee62889da529/model.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const evidenceDir=join(root,'evidence/gate-8');
const fixture=JSON.parse(await readFile(join(root,'docs/gate-8/fixture.json')));
const derived=JSON.parse(await readFile(join(root,'audit/gate-8/independent-results.json')));
const observations=JSON.parse(await readFile(join(evidenceDir,'browser-observations.json')));
const actions=JSON.parse(await readFile(join(evidenceDir,'action-trace.json')));
const checkpointReview=JSON.parse(await readFile(join(evidenceDir,'checkpoint-review.json')));
const uniqueSessions=new Set();
let viewportChecks=0,modelChecks=0,certificateChecks=0;
for(const item of observations){
  assert.equal(item.actor,'software_validation');
  assert.equal(item.index,modelChecks);
  const s=item.state;
  if(s){
    assert.equal(s.runId,'G8-AMBIGUITY-001');
    assert.equal(s.buildId,'g8-f5c5ee62889da529');
    assert.equal(s.fixtureId,fixture.fixtureId);
    assert.equal(typeof s.sessionId,'string');uniqueSessions.add(s.sessionId);
    const view=model.deriveView(s,fixture);
    assert.deepEqual(s.selectedAdditionalQueryIds,view.selectedAdditionalQueryIds);
    assert.deepEqual(s.observedBundle,view.observedBundle);
    assert.deepEqual(s.compatibleWorldIds,view.compatibleWorldIds);
    assert.equal(s.localPropertyDetermined,view.localPropertyDetermined);
    assert.deepEqual(s.pairDiagnostics,view.pairDiagnostics);
    assert.deepEqual(s.certificate,view.certificate);
    assert.equal(s.semanticFingerprint,model.semanticFingerprint(s,fixture));
    assert.equal(s.informationFingerprint,model.informationFingerprint(s,fixture));
    const independentCase=derived.caseResults[s.caseId];
    const world=fixture.cases.find(c=>c.id===s.caseId).worlds.find(w=>w.id===s.referenceWorldId);
    for(const {queryId,observation} of s.observedBundle)
      assert.deepEqual(observation,independentCase.observations[world.id][queryId]);
    if(s.certificateVisible){
      assert.deepEqual(s.certificate.minimum,independentCase.minimum);
      assert.deepEqual(s.certificate.subsets,independentCase.subsets);
      certificateChecks++;
    }
    if(item.dom){
      assert.equal(s.viewport.width,item.dom.width);
      assert.equal(s.viewport.height,item.dom.height);
      assert.equal(s.viewport.devicePixelRatio,item.dom.dpr);
      assert.equal(s.viewport.scrollX,item.dom.scrollX);
      assert.equal(s.viewport.scrollY,item.dom.scrollY);
      assert.equal(s.scene.clientWidth,item.dom.clientWidth);
      assert.equal(s.scene.scrollWidth,item.dom.scrollWidth);
      viewportChecks++;
    }
  }
  modelChecks++;
}
for(const action of actions){
  assert.equal(action.actor,'software_validation');
  assert.ok(action.beforeObservation>=0&&action.beforeObservation<observations.length);
  if(action.afterObservation!==undefined)
    assert.ok(action.afterObservation>=action.beforeObservation&&action.afterObservation<observations.length);
}
const passes=new Map();
for(const row of checkpointReview){
  const expected=derived.canonicalCheckpoints.find(cp=>cp.timeSeconds===row.seconds);
  assert.ok(expected);
  assert.equal(row.semanticFingerprint,observations[row.observation].state.semanticFingerprint);
  assert.equal(row.informationFingerprint,observations[row.observation].state.informationFingerprint);
  assert.equal(row.caseId,expected.caseId);
  assert.equal(row.paused,true);
  assert.equal(row.cursorSeconds,row.seconds);
  if(!passes.has(row.pass)) passes.set(row.pass,[]);
  passes.get(row.pass).push(row);
}
for(const [pass,rows] of passes){
  if(rows.length>=9){
    const lastNine=rows.slice(-9);
    assert.deepEqual(lastNine.map(r=>r.seconds),[0,4,8,12,16,20,24,28,32],pass);
    for(const row of lastNine){
      const expected=JSON.parse(await readFile(join(root,'ambiguity/runs/G8-AMBIGUITY-001/checkpoints.json')))
        .find(cp=>cp.timeSeconds===row.seconds);
      assert.equal(row.semanticFingerprint,expected.semanticFingerprint,`${pass}/${row.seconds}`);
      assert.equal(row.informationFingerprint,expected.informationFingerprint,`${pass}/${row.seconds}`);
    }
  }
}
const report={kind:'gate8-independent-browser-evidence-audit',status:'PASS',
  observations:observations.length,actions:actions.length,modelChecks,viewportChecks,
  certificateChecks,checkpointRecords:checkpointReview.length,
  checkpointPasses:Object.fromEntries([...passes].map(([key,rows])=>[key,rows.length])),
  sessions:[...uniqueSessions],limitation:'This script audits stored host observations; original-image visual review and observed activity are separate.'};
await writeFile(join(root,'audit/gate-8/browser-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
