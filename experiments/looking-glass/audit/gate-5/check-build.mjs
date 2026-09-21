// Exact immutable build/run/prespec audit. No implementation import here.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const runId=process.argv[2]||'G5-PENTERACT-001';
const runDir=resolve(root,'five-dimensional/runs',runId);
const read=async p=>JSON.parse(await readFile(p));
const sha=x=>createHash('sha256').update(x).digest('hex');
const near=(a,b,what)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-10,`${what}: ${a} != ${b}`);
const vec=(a,b,what)=>{assert.equal(a.length,b.length,what);a.forEach((x,i)=>near(x,b[i],`${what}[${i}]`));};
const freezeBytes=await readFile(resolve(root,'docs/gate-5/PRESPEC_FREEZE.json'));
const freeze=JSON.parse(freezeBytes),p=await read(resolve(root,'docs/gate-5/independent-predictions.json'));
const run=await read(resolve(runDir,'run.json'));
const buildDir=resolve(root,'five-dimensional/builds',run.buildId),build=await read(resolve(buildDir,'build.json'));
const checkpoints=await read(resolve(runDir,'checkpoints.json'));
const obs=await read(resolve(runDir,'observation-cases.json'));
const slices=await read(resolve(runDir,'slice-cases.json'));
const planned=(await readFile(resolve(runDir,'events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
assert.equal(sha(freezeBytes),'71d14a6f31f1c22dc705b9dd5b51a6f2dd7c4ecb709741e9ba52d3dc5573e82e');
assert.equal(sha(freezeBytes),run.prespecFreezeSha256);assert.equal(sha(freezeBytes),build.prespecFreezeSha256);
assert.equal(freeze.files.length,4);
for(const file of freeze.files){const bytes=await readFile(resolve(root,file.path));assert.equal(bytes.length,file.bytes);assert.equal(sha(bytes),file.sha256);}
const pinned=await readFile(resolve(root,freeze.baseline4D.modelPath));
assert.equal(sha(pinned),freeze.baseline4D.modelSha256);
assert.equal(sha(pinned),build.baseline4D.sha256);
const digest=createHash('sha256');
for(const file of build.sourceFiles){
  const bytes=await readFile(resolve(buildDir,file.path));
  assert.equal(bytes.length,file.bytes);assert.equal(sha(bytes),file.sha256);
  digest.update(file.path);digest.update('\0');digest.update(bytes);digest.update('\0');
}
const sourceSha256=digest.digest('hex');
assert.equal(sourceSha256,build.sourceSha256);assert.equal(sourceSha256,run.sourceSha256);
assert.equal(run.buildId,build.buildId);assert.equal(run.buildId,`g5-${sourceSha256.slice(0,16)}`);
assert.equal(runId,'G5-PENTERACT-001');assert.equal(run.runId,runId);
assert.equal(run.gate,'G5');assert.equal(run.gitHead,freeze.baseRevision);
assert.equal(run.durationMs,40000);assert.equal(run.sampleMs,100);assert.equal(run.stepMs,1000);
assert.deepEqual(run.checkpointTimesMs,p.checkpoints.map(x=>x.timeMs));
assert.equal(run.sourceSeed,null);assert.equal(run.source5.vertices,32);assert.equal(run.source5.edges,80);
assert.equal(run.comparator4.vertices,16);assert.equal(run.comparator4.edges,32);
assert.equal(run.display.scale,80);assert.equal(run.display.glyphRadiusSvgUnits,4);
assert.equal(checkpoints.length,9);
for(let i=0;i<9;i++){
  const c=checkpoints[i],expected=p.checkpoints[i],s=c.state;
  assert.equal(c.simulationTimeMs,expected.timeMs);assert.equal(s.simulationTimeMs,expected.timeMs);
  near(s.source5.rotation.alpha,expected.alphaDegrees*Math.PI/180,`checkpoint ${i} alpha`);
  near(s.source5.rotation.beta,expected.betaDegrees*Math.PI/180,`checkpoint ${i} beta`);
  assert.equal(s.source5.metrics.uniqueProjectedSites,expected.rawUniqueSiteCount5D);
  assert.equal(s.source5.metrics.collapsedEdges,expected.collapsedEdgeCount5D);
  for(const [id,marked] of Object.entries(expected.marked)){
    const v=s.source5.vertices.find(x=>x.id===id);assert.ok(v,`checkpoint ${i} ${id}`);
    vec(v.projected,marked.raw3,`checkpoint ${i} ${id} raw`);
    vec(v.screen,marked.screen2,`checkpoint ${i} ${id} screen`);
  }
  assert.equal(s.slice.kind,'solid');near(s.slice.radius,1,'canonical slice');
  assert.equal(s.camera.yaw,Math.PI/6);assert.equal(s.camera.pitch,Math.PI/9);
  assert.deepEqual(s.interface,{selectedVertexId:'v00000',observationCondition:'base',task:{id:'none',stage:'none'}});
  assert.ok(Object.values(s.controls).every(v=>v===null));
  assert.equal(s.displayOptions.inspectorOpen,false);
  assert.equal(c.sourceSha256,run.initialSourceSha256);
  assert.equal(c.sliceSha256,run.initialSliceSha256);
}
assert.deepEqual(await read(resolve(runDir,'initial-state.json')),checkpoints[0]);
assert.equal(new Set(checkpoints.map(c=>c.checkpointSha256)).size,9);
assert.equal(obs.sourceCases.length,32);assert.equal(obs.opaqueProbe.id,'probe');
for(const x of [...obs.sourceCases,obs.opaqueProbe]){
  assert.equal(x.cases.base.rank,3);assert.equal(x.cases.base.reconstructed,null);
  assert.equal(x.cases.hiddenV.rank,4);assert.equal(x.cases.hiddenV.reconstructed,null);
  assert.equal(x.cases.revealV.rank,5);assert.ok(x.cases.revealV.reconstructed);
  assert.ok(x.truthComparisonAfterSolve.maxCoordinateError<=1e-10);
  assert.ok(x.truthComparisonAfterSolve.maxForwardResidual<=1e-10);
  assert.deepEqual(x.cases.revealV.observations.map(o=>[o.alpha,o.beta]),[[0,0],[Math.PI/2,0],[0,Math.PI/2]]);
}
assert.equal(slices.cases.length,p.slice.cases.length);
for(let i=0;i<slices.cases.length;i++){
  const a=slices.cases[i],b=p.slice.cases[i];
  near(a.constraints.w,b.s,`slice ${i} w`);near(a.constraints.v,b.t,`slice ${i} v`);
  near(a.discriminant,b.radicand,`slice ${i} radicand`);assert.equal(a.kind,b.kind);
  assert.equal(a.radius===null,b.radius===null);if(a.radius!==null)near(a.radius,b.radius,`slice ${i} radius`);
}
assert.ok(planned.length>=11&&planned.every(e=>e.kind==='planned-fixture'&&e.actor==='fixture-generator'));
const result={kind:'immutable-build-run-audit',runId,buildId:run.buildId,sourceSha256,
  prespecFreezeSha256:sha(freezeBytes),prespecFilesVerified:4,sourceFilesVerified:build.sourceFiles.length,
  checkpointsVerified:9,observationCasesVerified:33,sliceCasesVerified:slices.cases.length,
  plannedEvents:planned.length,allChecksPassed:true,scope:'Exact bytes and generated records; actual browser behavior audited separately'};
await writeFile(resolve(root,`audit/gate-5/${runId}-build-audit.json`),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
