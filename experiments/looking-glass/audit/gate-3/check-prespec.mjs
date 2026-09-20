import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'../..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const expected=read('audit/gate-3/oracle-results.json');
const declared=read('docs/gate-3/independent-predictions.json');
const freezePath=path.join(root,'docs/gate-3/PRESPEC_FREEZE.json');
const checks=[];
const check=(name,pass,detail)=>checks.push({name,pass:Boolean(pass),...(detail===undefined?{}:{detail})});
const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-10;
const vec=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>near(v,b[i]));
check('oracle itself passed independently',expected.failed===0&&expected.passed>=12);
check('source vertices and marked identities match independent enumeration',
  JSON.stringify(declared.object.vertices)===JSON.stringify(expected.source.vertices)&&
  declared.canonical.markedA===expected.source.marked.A&&
  declared.canonical.markedB===expected.source.marked.B&&
  declared.canonical.markedEdge===expected.source.marked.edge);
check('declared source counts and distance histogram',declared.object.vertexCount===16&&declared.object.edgeCount===32&&
  declared.object.unorderedPairCount===120&&JSON.stringify(declared.object.squaredDistanceHistogram)===JSON.stringify({'4':32,'8':48,'12':32,'16':8}));
const checkpointResults=[];
for(let i=0;i<5;i++){
  const d=declared.checkpoints[i],e=expected.checkpoints[i];
  const a=d?.rows?.find(row=>row.id==='v1110'),b=d?.rows?.find(row=>row.id==='v1111');
  const allRows=d?.rows?.every(row=>{
    const source=expected.source.vertices.find(v=>v.id===row.id);
    if(!source)return false;
    const theta=e.thetaRad,c=Math.cos(theta),s=Math.sin(theta),[x,y,z,w]=source.q;
    return vec(row.qPrime,[c*x-s*w,y,z,s*x+c*w])&&vec(row.p,[c*x-s*w,y,z]);
  });
  checkpointResults.push({timeMs:e.timeMs,pass:d?.timeMs===e.timeMs&&near(d?.thetaRadians,e.thetaRad)&&d?.rows?.length===16&&allRows&&
    vec(a?.qPrime,e.ASourceRotated)&&vec(b?.qPrime,e.BSourceRotated)&&
    vec(a?.p,e.AShadow)&&vec(b?.p,e.BShadow)&&near(d?.markedProjectionDistance,e.pairShadowDistance)});
}
check('all five declared checkpoint tables agree with independent rotation and projection',checkpointResults.every(x=>x.pass),checkpointResults.filter(x=>!x.pass));
check('negative rank and positive known-transform Gram are declared correctly',
  declared.negativeFixedView.rank===3&&declared.negativeCameraOnly.cameraSpace3DStackRank===3&&
  declared.positiveTwoKnownSourceViews.rank===4&&
  JSON.stringify(declared.positiveTwoKnownSourceViews.gramMatrix)===JSON.stringify([[1,0,0,0],[0,2,0,0],[0,0,2,0],[0,0,0,1]]));
if(fs.existsSync(freezePath)){
  const freeze=JSON.parse(fs.readFileSync(freezePath));
  const files=freeze.files??freeze.prespecFiles??[];
  const results=files.map(item=>{
    const bytes=fs.readFileSync(path.join(root,item.path));
    return {path:item.path,pass:sha(bytes)===item.sha256&&(item.bytes===undefined||item.bytes===bytes.length)};
  });
  check('four prespec files match frozen hashes and byte counts',files.length===4&&results.every(x=>x.pass),results.filter(x=>!x.pass));
}else check('prespec freeze exists',false,{status:'pending; no browser trial may count before freeze'});
const result={checkedAtUtc:new Date().toISOString(),pass:checks.every(x=>x.pass),checks};
fs.writeFileSync(path.join(import.meta.dirname,'prespec-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pass:result.pass,checks:checks.map(c=>({name:c.name,pass:c.pass}))}));
if(!result.pass)process.exitCode=1;
