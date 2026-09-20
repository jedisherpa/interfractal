import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha256} from './hash.mjs';
import {CHECKPOINT_SECONDS, caseById, compareBundles, compareObservations, deriveView,
  enumerateCertificate, informationFingerprint, observationBundle, observe, pairDiagnostics,
  rationalString, roundedLabel, semanticFingerprint, stateAt, transition} from './model.mjs';

const dir=dirname(fileURLToPath(import.meta.url));
const root=resolve(dir,'..');
const fixture=JSON.parse(await readFile(join(root,'docs/gate-8/fixture.json'),'utf8'));
const predictions=JSON.parse(await readFile(join(root,'docs/gate-8/independent-predictions.json'),'utf8'));
assert.equal(sha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
assert.equal(rationalString({n:6n,d:-8n}),'-3/4');
assert.equal(roundedLabel('-1/1000000000000'),'0.00');
const cases={};
let pairCount=0, subsetCount=0, exactBaselineCollisions=0;
for(const caseData of fixture.cases) {
  const expected=predictions.cases[caseData.id];
  for(const world of caseData.worlds) for(const query of caseData.queries) {
    assert.deepEqual(observe(world,query),expected.observations[world.id][query.id],
      `${caseData.id}/${world.id}/${query.id}`);
  }
  const certificate=enumerateCertificate(caseData);
  assert.deepEqual(certificate.baselinePairDiagnostics,expected.baselinePairDiagnostics);
  assert.deepEqual(certificate.separatingPairsByAdditionalQuery,expected.separatingPairsByAdditionalQuery);
  assert.deepEqual(certificate.subsets,expected.subsets);
  assert.deepEqual(certificate.minimum,expected.minimum);
  pairCount+=certificate.baselinePairDiagnostics.length;
  subsetCount+=certificate.subsetCountExamined;
  exactBaselineCollisions+=certificate.baselineCollisionPairs.length;
  const base=stateAt(0,fixture);
  const current={...base,caseId:caseData.id,referenceWorldId:caseData.defaultReferenceWorldId};
  const baselineInformation=informationFingerprint(current,fixture);
  const baselineView=deriveView(current,fixture);
  for(const yaw of fixture.cameraYawDegrees) {
    const rotated={...current,cameraYawDegrees:yaw};
    assert.equal(informationFingerprint(rotated,fixture),baselineInformation);
    assert.deepEqual(deriveView(rotated,fixture).observedBundle,baselineView.observedBundle);
    assert.deepEqual(deriveView(rotated,fixture).compatibleWorldIds,baselineView.compatibleWorldIds);
  }
  const alternate=caseData.worlds.find(world=>world.id!==caseData.defaultReferenceWorldId);
  if(alternate) {
    const other={...current,referenceWorldId:alternate.id};
    if(compareBundles(observationBundle(caseData,caseData.worlds[0]),observationBundle(caseData,alternate)).exactEqual)
      assert.equal(informationFingerprint(current,fixture),informationFingerprint(other,fixture));
  }
  const revealed={...current,certificateVisible:true};
  assert.equal(informationFingerprint(current,fixture),informationFingerprint(revealed,fixture));
  const forbidden=transition(current,{type:'add-query',value:'slicePlusHalf'},fixture);
  assert.equal(forbidden.result,'off-menu');
  assert.deepEqual(forbidden.state,current);
  if(caseData.additionalQueryIds.length) {
    const once=transition(current,{type:'add-query',value:caseData.additionalQueryIds[0]},fixture);
    const twice=transition(once.state,{type:'add-query',value:caseData.additionalQueryIds[0]},fixture);
    assert.equal(twice.result,'already-selected');
    assert.deepEqual(twice.state,once.state);
    const reset=transition(once.state,{type:'reference',value:alternate.id},fixture);
    assert.deepEqual(reset.state.selectedAdditionalQueryIds,[]);
    assert.equal(reset.state.cameraYawDegrees,0);
    assert.equal(reset.state.certificateVisible,false);
  }
  cases[caseData.id]={observations:Object.fromEntries(caseData.worlds.map(world=>
      [world.id,Object.fromEntries(caseData.queries.map(query=>[query.id,observe(world,query)]))])),
    certificate};
}
assert.equal(pairCount,9);assert.equal(subsetCount,12);assert.equal(exactBaselineCollisions,8);
const c03=caseById(fixture,'G8-C03');
const outside=c03.outsideMenuQueries[0];
assert.deepEqual(observe(c03.worlds[0],outside),predictions.cases['G8-C03'].outsideMenu.observations['C03-W01']);
assert.deepEqual(observe(c03.worlds[1],outside),predictions.cases['G8-C03'].outsideMenu.observations['C03-W02']);
assert.deepEqual(compareObservations({kind:'point',center:['0','0','0'],radiusSquared:'0'},{kind:'empty'}),
  {exactEqual:false,withinTolerance:false,roundedLabelsEqual:false});
const c04=caseById(fixture,'G8-C04');
assert.deepEqual(pairDiagnostics(c04)[0],predictions.cases['G8-C04'].baselinePairDiagnostics[0]);
assert.equal(enumerateCertificate(c04).minimum.size,0);
const checkpoints=CHECKPOINT_SECONDS.map(timeSeconds=>{
  const state=stateAt(timeSeconds,fixture), view=deriveView(state,fixture);
  const expected=predictions.canonicalReplay.checkpoints.find(item=>item.timeSeconds===timeSeconds);
  for(const key of ['caseId','referenceWorldId','selectedAdditionalQueryIds','cameraYawDegrees','certificateVisible','paused','mode'])
    assert.deepEqual(state[key],expected[key],`checkpoint ${timeSeconds} ${key}`);
  assert.deepEqual(view.compatibleWorldIds,expected.compatibleWorldIds);
  assert.equal(view.localPropertyDetermined,expected.localPropertyDetermined);
  assert.deepEqual(transition(state,{type:'checkpoint',value:timeSeconds},fixture).state,state);
  return {timeSeconds,state,semanticFingerprint:semanticFingerprint(state,fixture),
    informationFingerprint:informationFingerprint(state,fixture)};
});
const c02=caseById(fixture,'G8-C02');
const base={...stateAt(12,fixture),caseId:c02.id,referenceWorldId:c02.defaultReferenceWorldId,
  selectedAdditionalQueryIds:[]};
const xy=transition(transition(base,{type:'add-query',value:'xw90'},fixture).state,
  {type:'add-query',value:'yv90'},fixture).state;
const yx=transition(transition(base,{type:'add-query',value:'yv90'},fixture).state,
  {type:'add-query',value:'xw90'},fixture).state;
assert.equal(informationFingerprint(xy,fixture),informationFingerprint(yx,fixture));
assert.deepEqual(deriveView(xy,fixture).observedBundle,deriveView(yx,fixture).observedBundle);
console.log(JSON.stringify({status:'passed',fixtureId:fixture.fixtureId,pairCount,subsetCount,
  exactBaselineCollisions,cases,checkpoints},null,2));
