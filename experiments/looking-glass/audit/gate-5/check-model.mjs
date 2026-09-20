// Independent implementation conformance. Use an immutable build model path as argv[2].
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const modulePath=resolve(process.argv[2]||resolve(root,'five-dimensional/model.mjs'));
const m=await import(pathToFileURL(modulePath).href);
const g3=await import(pathToFileURL(resolve(root,'hypercube/builds/g3-6c31bc16aeca4460/model.mjs')).href);
const tol=1e-10,near=(a,b,label)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol,`${label}: ${a} != ${b}`);
const vector=(a,b,label)=>{assert.equal(a.length,b.length,label);a.forEach((x,i)=>near(x,b[i],`${label}[${i}]`));};
const norm2=q=>q.reduce((s,x)=>s+x*x,0),dist2=(p,q)=>norm2(p.map((x,i)=>x-q[i]));
const mv=(M,q)=>M.map(row=>row.reduce((s,x,i)=>s+x*q[i],0));
const deg=x=>x*Math.PI/180;
const expectedId=(n,d)=>'v'+n.toString(2).padStart(d,'0');
const s5=m.SOURCE5,s4=m.SOURCE4;
assert.equal(s5.length,32);assert.equal(m.EDGES5.length,80);
assert.equal(s4.length,16);assert.equal(m.EDGES4.length,32);
for(let i=0;i<32;i++){
  const v=s5[i]; assert.equal(v.id,expectedId(i,5));
  vector(v.q,Array.from({length:5},(_,j)=>((i>>(4-j))&1)?1:-1),`source ${v.id}`);
  assert.equal(m.EDGES5.filter(e=>e.from===v.id||e.to===v.id).length,5);
}
for(const e of m.EDGES5){
  assert.equal(e.id,`e-${e.from}-${e.to}`);assert.ok(e.from<e.to);
  const p=s5.find(v=>v.id===e.from).q,q=s5.find(v=>v.id===e.to).q;
  assert.equal(p.reduce((n,x,i)=>n+(x!==q[i]),0),1);
}
let pairChecks=0,maxDistanceError=0,maxNormError=0,maxOrthogonalityError=0,maxRoundtripError=0;
for(const ad of [-60,0,30,45,90])for(const bd of [-60,0,30,45,90]){
  const a=deg(ad),b=deg(bd),R=m.rotation5(a,b),X=m.rotationXW(a),Y=m.rotationYV(b);
  for(let i=0;i<5;i++)for(let j=0;j<5;j++){
    const dot=R.reduce((sum,row)=>sum+row[i]*row[j],0),err=Math.abs(dot-+(i===j));
    maxOrthogonalityError=Math.max(maxOrthogonalityError,err);near(dot,+(i===j),'orthogonality');
  }
  for(const v of s5){
    const rotated=mv(R,v.q),byPlanes=mv(Y,mv(X,v.q)),reversed=mv(X,mv(Y,v.q));
    vector(rotated,byPlanes,'composition');vector(rotated,reversed,'commutation');
    const recovered=mv(m.rotation5(-a,-b),rotated);
    for(let i=0;i<5;i++)maxRoundtripError=Math.max(maxRoundtripError,Math.abs(recovered[i]-v.q[i]));
    vector(recovered,v.q,'roundtrip');
    maxNormError=Math.max(maxNormError,Math.abs(norm2(rotated)-5));near(norm2(rotated),5,'norm');
    vector(mv(m.projectionMatrix5(a,b),v.q),rotated.slice(0,3),'projection matrix');
  }
  for(let i=0;i<32;i++)for(let j=i+1;j<32;j++){
    const expected=dist2(s5[i].q,s5[j].q),actual=dist2(mv(R,s5[i].q),mv(R,s5[j].q));
    maxDistanceError=Math.max(maxDistanceError,Math.abs(actual-expected));near(actual,expected,'pair distance');pairChecks++;
  }
}
assert.equal(pairChecks,12400);
const base=m.projectionMatrix5(0,0),xw=m.projectionMatrix5(Math.PI/2,0),yv=m.projectionMatrix5(0,Math.PI/2);
assert.equal(m.matrixRank(base,5),3);assert.equal(m.matrixRank([...base,...xw],5),4);assert.equal(m.matrixRank([...base,...xw,...yv],5),5);
const gram=Array.from({length:5},(_,i)=>Array.from({length:5},(_,j)=>[...base,...xw,...yv]
  .reduce((sum,row)=>sum+row[i]*row[j],0)));
for(let i=0;i<5;i++)for(let j=0;j<5;j++)near(gram[i][j],i===j?[2,2,3,1,1][i]:0,`stacked Gram ${i}/${j}`);
let maxRecoveryError=0,maxResidual=0;
for(const {id,q} of s5){
  const observations=[[0,0],[Math.PI/2,0],[0,Math.PI/2]].map(([a,b])=>({id,
    matrix:m.projectionMatrix5(a,b),projected:mv(m.projectionMatrix5(a,b),q)}));
  const b=m.reconstruct(observations.slice(0,1)),h=m.reconstruct(observations.slice(0,2)),r=m.reconstruct(observations);
  assert.equal(b.rank,3);assert.equal(b.reconstructed,null);
  assert.equal(h.rank,4);assert.equal(h.reconstructed,null);
  assert.equal(r.rank,5); assert.ok(r.reconstructed); vector(r.reconstructed,q,`${id} recovery`);
  maxRecoveryError=Math.max(maxRecoveryError,...r.reconstructed.map((x,i)=>Math.abs(x-q[i])));
  maxResidual=Math.max(maxResidual,r.residual);
}
const probe=[.2,-.4,.6,-.8,1.1],opaque='probe';
const probeObservations=[[0,0],[Math.PI/2,0],[0,Math.PI/2]].map(([a,b])=>({id:opaque,
  matrix:m.projectionMatrix5(a,b),projected:mv(m.projectionMatrix5(a,b),probe)}));
const probeResult=m.reconstruct(probeObservations);assert.equal(probeResult.rank,5);vector(probeResult.reconstructed,probe,'opaque probe');
const defaultState=m.modelAt(0),turnedX=m.modelAt(0,{alphaOverride:Math.PI/4}),
  turnedY=m.modelAt(0,{betaOverride:Math.PI/4}),turnedXY=m.modelAt(0,{alphaOverride:Math.PI/4,betaOverride:Math.PI/4}),
  movedCamera=m.modelAt(0,{cameraYawOverride:2*Math.PI/3}),movedSlice=m.modelAt(0,{sliceWOverride:.5});
assert.deepEqual(m.comparatorState(turnedX),m.comparatorState(turnedXY),'4D comparator ignores beta');
assert.deepEqual(m.projectionState(defaultState),m.projectionState(movedCamera),'camera leaves raw projection');
assert.deepEqual(m.rotationState(defaultState),m.rotationState(movedCamera),'camera leaves 5D rotation');
assert.deepEqual(m.sliceState(defaultState),m.sliceState(movedCamera),'camera leaves slice');
assert.deepEqual(m.rotationState(defaultState),m.rotationState(movedSlice),'slice leaves source rotation');
assert.deepEqual(m.projectionState(defaultState),m.projectionState(movedSlice),'slice leaves raw projection');
assert.deepEqual(m.comparatorState(defaultState),m.comparatorState(movedSlice),'slice leaves comparator');
for(let i=0;i<32;i++){
  const q=defaultState.source5.vertices[i].rotatedSource,x=turnedX.source5.vertices[i].rotatedSource,y=turnedY.source5.vertices[i].rotatedSource;
  for(const k of [1,2,4])near(x[k],q[k],`xw-held coordinate ${i}/${k}`);
  for(const k of [0,2,3])near(y[k],q[k],`yv-held coordinate ${i}/${k}`);
}
const baselineCheckpoint=m.checkpointState(defaultState);
for(const options of [{selectedVertexId:'v00001'},{observationCondition:'hidden'},
  {task:{id:'T1',stage:'baseline overlap'}},{inspectorOpen:true}])
  assert.notDeepEqual(m.checkpointState(m.modelAt(0,options)),baselineCheckpoint,'checkpoint binds interface state');
for(const [s,t,kind] of [[0,0,'solid'],[.5,0,'solid'],[0,.5,'solid'],[.5,.5,'solid'],[1,0,'point'],[0,1,'point'],[1.25,0,'empty'],[0,1.25,'empty'],[1,1,'empty'],[-.5,0,'solid'],[0,-.5,'solid']]){
  const actual=m.slice5(s,t),u=1-s*s-t*t;
  assert.equal(actual.kind,kind); near(actual.discriminant,u,'slice radicand');
  if(u<0){assert.equal(actual.radius,null);assert.equal(actual.center3,null);}else{near(actual.radius,Math.sqrt(u),'slice radius');vector(actual.center3,[0,0,0],'slice center');}
}
for(const sign of [-1,1])for(const delta of [-1e-6,1e-6])for(const axis of [0,1]){
  const x=sign*(1+delta),slice=m.slice5(axis===0?x:0,axis===1?x:0);
  assert.equal(slice.kind,delta<0?'solid':'empty');
}
for(const bad of [NaN,Infinity,-Infinity]){
  assert.throws(()=>m.slice5(bad,0));assert.throws(()=>m.slice5(0,bad));
  assert.throws(()=>m.rotationXW(bad));assert.throws(()=>m.rotationYV(bad));
}
const checkpointExpectations=[[0,0],[45,0],[90,0],[90,45],[90,90],[45,90],[0,90],[0,45],[0,0]];
for(const [i,timeMs] of m.CHECKPOINTS_MS.entries()){
  assert.equal(timeMs,5000*i);const angles=m.anglesAt(timeMs);
  near(angles.alpha,deg(checkpointExpectations[i][0]),'path alpha');near(angles.beta,deg(checkpointExpectations[i][1]),'path beta');
}
const comparisons=[];
for(const [a,b,expected4,expected5,collapsed4,collapsed5] of [[0,0,8,8,8,32],[45,0,12,12,0,16],[45,45,12,18,0,0],[30,30,16,32,0,0]]){
  const current4=m.shapeAt(4,deg(a),deg(b)),current5=m.shapeAt(5,deg(a),deg(b));
  assert.equal(current4.metrics.uniqueProjectedSites,expected4);assert.equal(current5.metrics.uniqueProjectedSites,expected5);
  assert.equal(current4.metrics.collapsedEdges,collapsed4);assert.equal(current5.metrics.collapsedEdges,collapsed5);
  for(const v of current4.vertices){
    const old=g3.projected3(v.originalSource,deg(a));vector(v.projected,old,`G3 baseline ${a}/${v.id}`);
    vector(v.screen,g3.displayProjection(old).screen,`G3 camera ${a}/${v.id}`);
  }
  for(const v of current5.vertices){
    const [x,y,z,w,f]=v.originalSource,ca=Math.cos(deg(a)),sa=Math.sin(deg(a)),cb=Math.cos(deg(b)),sb=Math.sin(deg(b));
    vector(v.projected,[ca*x-sa*w,cb*y-sb*f,z],`5D projection ${a}/${b}/${v.id}`);
  }
  comparisons.push({anglesDeg:[a,b],rawSites:[current4.metrics.uniqueProjectedSites,current5.metrics.uniqueProjectedSites],
    collapsedEdges:[current4.metrics.collapsedEdges,current5.metrics.collapsedEdges],
    screenSites:[current4.metrics.screen.exactScreenSiteCount,current5.metrics.screen.exactScreenSiteCount],
    markerCollisionPairs:[current4.metrics.screen.glyphOverlapPairCount,current5.metrics.screen.glyphOverlapPairCount]});
}
// The preserved 4D source pin is also checked at the declared 90-degree endpoint.
for(const v of m.shapeAt(4,Math.PI/2,0).vertices){
  const old=g3.projected3(v.originalSource,Math.PI/2);
  vector(v.projected,old,`G3 baseline 90/${v.id}`);
  vector(v.screen,g3.displayProjection(old).screen,`G3 camera 90/${v.id}`);
}
const g3SourcePath=resolve(root,'hypercube/builds/g3-6c31bc16aeca4460/model.mjs');
const fileHash=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
const result={kind:'independent-exact-module-audit',modulePath,sourceSha256:await fileHash(modulePath),
  gate3BaselineSha256:await fileHash(g3SourcePath),tolerance:tol,sourceCounts:{fiveVertices:32,fiveEdges:80,fourVertices:16,fourEdges:32},
  grid:{anglePairs:25,pairChecks,maxDistanceError,maxNormError,maxOrthogonalityError,maxRoundtripError},
  reconstruction:{baseRank:3,hiddenRank:4,revealedRank:5,hypercubePoints:32,opaqueProbe:true,maxRecoveryError,maxResidual},
  comparisons,checksPassed:true};
const outputPath=process.argv[3]&&resolve(process.argv[3]);
if(outputPath)await writeFile(outputPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
