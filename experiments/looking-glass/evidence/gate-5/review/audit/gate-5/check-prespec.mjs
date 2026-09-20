// Cross-check Astra's independent predictions against the separately derived audit oracle.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=async name=>JSON.parse(await readFile(resolve(root,name)));
const p=await read('docs/gate-5/independent-predictions.json');
const o=await read('audit/gate-5/oracle-results.json');
const near=(a,b,label)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-10,`${label}: ${a} != ${b}`);
const vector=(a,b,label)=>{assert.equal(a.length,b.length,label);a.forEach((x,i)=>near(x,b[i],`${label}[${i}]`));};
assert.equal(p.source.vertexCount,o.geometry.vertices);
assert.equal(p.source.edgeCount,o.geometry.edges);
assert.equal(p.source.affineSpan,o.geometry.affineRank);
assert.equal(p.source.pairCount,o.geometry.pairwiseDistancesPerGridPoint);
assert.equal(p.rotation.anglePairCount,o.geometry.gridPoints);
assert.equal(p.observability.ranks.base,o.reconstruction.baseRank);
assert.equal(p.observability.ranks.basePlusXw,o.reconstruction.withXwRank);
assert.equal(p.observability.ranks.basePlusXwPlusYv,o.reconstruction.withYvRank);
assert.equal(p.checkpoints.length,o.checkpoints.length);
for(let i=0;i<p.checkpoints.length;i++){
  const actual=p.checkpoints[i],expected=o.checkpoints[i];
  assert.equal(actual.timeMs,expected.timeMs);
  near(actual.alphaDegrees,expected.anglesDeg[0],`checkpoint ${i} alpha`);
  near(actual.betaDegrees,expected.anglesDeg[1],`checkpoint ${i} beta`);
  assert.equal(actual.canonicalSlice.kind,'solid');near(actual.canonicalSlice.radius,1,'canonical slice');
}
assert.equal(p.slice.cases.length,o.slices.length);
for(let i=0;i<p.slice.cases.length;i++){
  const a=p.slice.cases[i],b=o.slices.find(x=>x.s===a.s&&x.t===a.t);
  assert.ok(b,`slice ${i} has independent case`);
  near(a.s,b.s,`slice ${i} s`);near(a.t,b.t,`slice ${i} t`);near(a.radicand,b.u,`slice ${i} radicand`);
  assert.equal(a.kind,b.kind);assert.equal(a.radius===null,b.radius===null);
  if(a.radius!==null)near(a.radius,b.radius,`slice ${i} radius`);
}
for(let i=0;i<3;i++){
  const a=p.comparison.taskStatePredictions[i],b=o.comparisons[i];
  vector(a.requestedAnglesDegrees,b.anglesDeg,`task ${i} angle`);
  for(const [dimension,model] of [['fourD','four'],['fiveD','five']]){
    const x=a[dimension],y=b[model];
    assert.equal(x.vertexCount,y.vertices);assert.equal(x.edgeCount,y.edges);
    assert.equal(x.rawUniqueSiteCount,y.rawSites);assert.equal(x.collapsedEdgeCount,y.collapsed);
    assert.equal(x.nonzeroEdgeRecords,y.nonzero);assert.equal(x.exactScreenSiteCount,y.screenSites);
    assert.equal(x.coincidentMarkerExcess,y.screenExcess);
    assert.equal(x.markerCollisionPairCount,y.markerCollisionPairs);
    if(x.markerCollisionPairs)assert.deepEqual(x.markerCollisionPairs,y.markerCollisionPairIds);
  }
}
const generic=p.comparison.genericFiniteModelCase,b=o.comparisons[3];
vector(generic.anglesDegrees,b.anglesDeg,'generic angle');
assert.equal(generic.fourD.rawUniqueSiteCount,b.four.rawSites);
assert.equal(generic.fiveD.rawUniqueSiteCount,b.five.rawSites);
const result={kind:'independent-prespec-cross-check',prediction:'docs/gate-5/independent-predictions.json',
  oracle:'audit/gate-5/oracle-results.json',checkpoints:9,sliceCases:p.slice.cases.length,comparisonTaskStates:3,
  geometryPairs:o.geometry.pairsChecked,status:'pass; this compares two independent mathematical derivations, not implementation or browser observations'};
await writeFile(resolve(root,'audit/gate-5/prespec-cross-check.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
