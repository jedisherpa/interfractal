// Gate 5 equation oracle. Deliberately imports no five-dimensional/ code.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const tol = 1e-10;
const near = (a, b, why) => assert.ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b) <= tol, `${why}: ${a} != ${b}`);
const vec = (a, b, why) => { assert.equal(a.length, b.length, why); a.forEach((x,i) => near(x,b[i],`${why}[${i}]`)); };
const id = bits => `v${bits.map(String).join('')}`;
const cube = d => Array.from({length:2**d},(_,k) => {
  const bits=Array.from({length:d},(_,i)=>(k>>(d-1-i))&1);
  return {id:id(bits), q:bits.map(b=>2*b-1)};
});
const edges = vertices => vertices.flatMap((v,i)=>vertices.slice(i+1).filter(w=>v.q.reduce((n,x,j)=>n+(x!==w.q[j]),0)===1).map(w=>[v.id,w.id]));
const rotate = (q,a,b) => {
  const ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
  const [x,y,z,w,v]=q;
  return [ca*x-sa*w,cb*y-sb*v,z,sa*x+ca*w,sb*y+cb*v];
};
const mat = (a,b) => Array.from({length:5},(_,i)=>rotate(Array.from({length:5},(_,j)=>+(i===j)),a,b)); // columns
const proj = q => q.slice(0,3);
const norm2 = q => q.reduce((s,x)=>s+x*x,0);
const dist2 = (p,q) => norm2(p.map((x,i)=>x-q[i]));
const screen = p => {
  const yaw=Math.PI/6,pitch=Math.PI/9;
  const a=Math.cos(yaw)*p[0]-Math.sin(yaw)*p[2];
  const b=Math.sin(yaw)*p[0]+Math.cos(yaw)*p[2];
  return [320+80*a,210-80*(Math.cos(pitch)*p[1]-Math.sin(pitch)*b)];
};
const rank = rows => {
  const a=rows.map(r=>[...r]), m=a.length,n=a[0].length;
  let k=0;
  for(let j=0;j<n&&k<m;j++){
    let p=k; for(let i=k+1;i<m;i++) if(Math.abs(a[i][j])>Math.abs(a[p][j]))p=i;
    if(Math.abs(a[p][j])<=tol) continue;
    [a[k],a[p]]=[a[p],a[k]];
    const h=a[k][j]; for(let c=j;c<n;c++) a[k][c]/=h;
    for(let i=k+1;i<m;i++){const t=a[i][j]; for(let c=j;c<n;c++)a[i][c]-=t*a[k][c];}
    k++;
  }
  return k;
};
const projectedRows = (a,b) => [0,1,2].map(i=>Array.from({length:5},(_,j)=>mat(a,b)[j][i]));
const slice = (s,t) => {
  assert.ok(Number.isFinite(s)&&Number.isFinite(t));
  const u=1-s*s-t*t;
  return {s,t,u,kind:u>0?'solid':u===0?'point':'empty',radius:u<0?null:Math.sqrt(u),center3:u<0?null:[0,0,0]};
};
const deg = x => x*Math.PI/180;
const path = t => t<=10000?[9*t/1000,0]:t<=20000?[90,9*(t-10000)/1000]:t<=30000?[9*(30000-t)/1000,90]:[0,9*(40000-t)/1000];
const group = (entries,key) => {
  const groups=[];
  for(const e of entries){
    const g=groups.find(g=>g.position.every((x,i)=>Math.abs(x-e[key][i])<=tol));
    if(g)g.ids.push(e.id); else groups.push({position:e[key],ids:[e.id]});
  }
  return groups;
};
const metrics = (d,a,b) => {
  const vertices=cube(d),links=edges(vertices);
  const points=vertices.map(v=>{
    const q=d===4?[...v.q,0]:v.q;
    const raw=proj(rotate(q,a,d===4?0:b));
    return {id:v.id,raw,screen:screen(raw)};
  });
  const byId=new Map(points.map(p=>[p.id,p]));
  const collapsed=links.filter(([u,v])=>Math.sqrt(dist2(byId.get(u).raw,byId.get(v).raw))<=tol).length;
  const rawGroups=group(points,'raw'),screenGroups=group(points,'screen');
  const collisionPairs=[];
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)
    if(Math.sqrt(dist2(points[i].screen,points[j].screen))<8)collisionPairs.push([points[i].id,points[j].id]);
  return {vertices:vertices.length,edges:links.length,collapsed,nonzero:links.length-collapsed,
    rawSites:rawGroups.length,rawExcess:vertices.length-rawGroups.length,
    screenSites:screenGroups.length,screenExcess:vertices.length-screenGroups.length,
    markerCollisionPairs:collisionPairs.length,
    markerCollisionPairIds:collisionPairs,
    markedRoster:rawGroups.find(g=>g.ids.includes(d===4?'v0000':'v00000')).ids};
};

const five=cube(5),links=edges(five);
assert.equal(five.length,32); assert.equal(links.length,80);
assert.ok(five.every(v=>norm2(v.q)===5));
assert.ok(five.every(v=>links.filter(e=>e.includes(v.id)).length===5));
const origin=five[0].q;
const span=Array.from({length:5},(_,i)=>five.find(v=>v.q[i]===1&&v.q.every((x,j)=>j===i||x===-1)).q.map((x,j)=>x-origin[j]));
assert.equal(rank(span),5);
assert.ok(span.every((r,i)=>r.every((x,j)=>x===(i===j?2:0))));
let transforms=0,pairsChecked=0,maxInvariantError=0;
for(const ad of [-60,0,30,45,90])for(const bd of [-60,0,30,45,90]){
  const a=deg(ad),b=deg(bd),cols=mat(a,b);
  for(let i=0;i<5;i++)for(let j=0;j<5;j++)
    near(cols[i].reduce((s,x,k)=>s+x*cols[j][k],0),+(i===j),`orthogonal ${ad}/${bd}/${i}/${j}`);
  for(const v of five){
    const r=rotate(v.q,a,b);
    near(norm2(r),5,`norm ${ad}/${bd}/${v.id}`);
    vec(rotate(r,-a,-b),v.q,`inverse ${ad}/${bd}/${v.id}`);
    // Independent disjoint plane calculations commute.
    vec(rotate(rotate(v.q,a,0),0,b),rotate(rotate(v.q,0,b),a,0),`commute ${ad}/${bd}/${v.id}`);
  }
  for(let i=0;i<five.length;i++)for(let j=i+1;j<five.length;j++){
    const d0=dist2(five[i].q,five[j].q),d1=dist2(rotate(five[i].q,a,b),rotate(five[j].q,a,b));
    maxInvariantError=Math.max(maxInvariantError,Math.abs(d1-d0));
    near(d1,d0,`distance ${ad}/${bd}/${i}/${j}`); pairsChecked++;
  }
  transforms++;
}
assert.equal(pairsChecked,25*496);
const zero=projectedRows(0,0),xw=projectedRows(Math.PI/2,0),yv=projectedRows(0,Math.PI/2);
assert.equal(rank(zero),3); assert.equal(rank([...zero,...xw]),4); assert.equal(rank([...zero,...xw,...yv]),5);
vec(xw[0],[0,0,0,-1,0],'known xw row');
vec(yv[1],[0,0,0,0,-1],'known yv row');
for(const q of [...five.map(v=>v.q),[.2,-.4,.6,-.8,1.1]]){
  const o0=proj(q),ow=proj(rotate(q,Math.PI/2,0)),ov=proj(rotate(q,0,Math.PI/2));
  const recovered=[o0[0],o0[1],o0[2],-ow[0],-ov[1]];
  vec(recovered,q,'known-observation reconstruction');
  vec(proj(rotate(recovered,Math.PI/2,0)),ow,'xw residual');
  vec(proj(rotate(recovered,0,Math.PI/2)),ov,'yv residual');
}
const sliceCases=[[0,0],[.5,0],[0,.5],[.5,.5],[1,0],[0,1],[1.25,0],[0,1.25],[1,1],[-.5,0],[0,-.5]];
for(const sign of [-1,1])for(const delta of [-1e-6,1e-6]){
  sliceCases.push([sign*(1+delta),0],[0,sign*(1+delta)]);
}
const slices=sliceCases.map(([s,t])=>slice(s,t));
assert.equal(slice(1,0).kind,'point'); assert.equal(slice(0,1).kind,'point');
assert.equal(slice(1.25,0).kind,'empty'); assert.equal(slice(.5,0).radius,slice(0,.5).radius);
assert.equal(slice(1-1e-6,0).kind,'solid'); assert.equal(slice(1+1e-6,0).kind,'empty');
const checkpoints=[0,5000,10000,15000,20000,25000,30000,35000,40000].map(timeMs=>({timeMs,anglesDeg:path(timeMs)}));
const comparisons=[[0,0],[45,0],[45,45],[30,30]].map(([a,b])=>({anglesDeg:[a,b],four:metrics(4,deg(a),deg(b)),five:metrics(5,deg(a),deg(b))}));
for(const [i,[four,five]] of [[8,8],[12,12],[12,18]].entries()){
  assert.equal(comparisons[i].four.rawSites,four); assert.equal(comparisons[i].five.rawSites,five);
}
for(const [i,[four,five]] of [[8,32],[0,16],[0,0]].entries()){
  assert.equal(comparisons[i].four.collapsed,four); assert.equal(comparisons[i].five.collapsed,five);
}
assert.equal(comparisons[0].four.markedRoster.length,2);
assert.equal(comparisons[0].five.markedRoster.length,4);
assert.equal(comparisons[3].five.rawSites,32);
const result={kind:'independent-equation-oracle',implementationImported:false,tolerance:tol,
  geometry:{vertices:32,edges:80,affineRank:5,pairwiseDistancesPerGridPoint:496,gridPoints:transforms,pairsChecked,maxInvariantError},
  reconstruction:{baseRank:3,withXwRank:4,withYvRank:5,testPoints:33,underXwOnly:'v hidden'},
  slices,checkpoints,comparisons,status:'prespecified equations independently verified; no implementation or browser result'};
await writeFile(resolve(root,'audit/gate-5/oracle-results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({geometry:result.geometry,reconstruction:result.reconstruction,checkpoints,comparisons:comparisons.map(c=>({anglesDeg:c.anglesDeg,four:{rawSites:c.four.rawSites,collapsed:c.four.collapsed,markerCollisionPairs:c.four.markerCollisionPairs},five:{rawSites:c.five.rawSites,collapsed:c.five.collapsed,markerCollisionPairs:c.five.markerCollisionPairs}}))}));
