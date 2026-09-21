// Independent audit of root's saved actual DOM/inspector observations and SVG nodes.
// Does not drive the browser or import the implementation.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const observations=JSON.parse(await readFile(resolve(root,'evidence/gate-5/browser-observations.json')));
const run=JSON.parse(await readFile(resolve(root,'five-dimensional/runs/G5-PENTERACT-001/run.json')));
const near=(a,b,why,t=1e-8)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=t,`${why}: ${a} != ${b}`);
const vec=(a,b,why)=>{assert.equal(a.length,b.length,why);a.forEach((x,i)=>near(x,b[i],`${why}[${i}]`));};
const d2=(p,q)=>p.reduce((s,x,i)=>s+(x-q[i])**2,0);
const screen=([x,y,z],camera)=>{
  const cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
  const a=cy*x-sy*z,b=sy*x+cy*z;
  return [320+80*a,210-80*(cp*y-sp*b)];
};
const raw5=(q,a,b)=>[Math.cos(a)*q[0]-Math.sin(a)*q[3],Math.cos(b)*q[1]-Math.sin(b)*q[4],q[2]];
const raw4=(q,a)=>[Math.cos(a)*q[0]-Math.sin(a)*q[3],q[1],q[2]];
const siteCount=(points,field)=>{
  const sites=[];for(const p of points){if(!sites.some(q=>q[field].every((x,i)=>Math.abs(x-p[field][i])<=1e-10)))sites.push(p);}
  return sites.length;
};
const pairProxy=points=>{let n=0;for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)if(Math.sqrt(d2(points[i].screen,points[j].screen))<8)n++;return n;};
const matchMultiset=(actual,expected,what)=>{
  assert.equal(actual.length,expected.length,`${what} count`);
  const left=[...actual];for(const p of expected){const k=left.findIndex(x=>x.length===p.length&&x.every((v,i)=>Math.abs(v-p[i])<=1e-8));
    assert.ok(k>=0,`${what}: missing ${JSON.stringify(p)}`);left.splice(k,1);}
};
const summaries=[];
for(const o of observations){
  assert.equal(o.url,'http://127.0.0.1:43998/');
  assert.equal(o.title,'Looking Glass · Gate 5 · two additional coordinates');
  const s=o.state,actual=o.outer;
  assert.ok(s&&s.model&&o.diagnostics,`observation ${o.index} inspector`);
  assert.equal(s.simulationTimeMs,s.model.simulationTimeMs);
  assert.equal(s.simulationTimeMs%100,0);
  assert.ok(s.simulationTimeMs>=0&&s.simulationTimeMs<=40000);
  assert.equal(s.viewport.width,actual.viewport.width);
  assert.equal(s.viewport.height,actual.viewport.height);
  assert.equal(s.viewport.devicePixelRatio,actual.viewport.devicePixelRatio);
  assert.equal(s.documentScrollWidth,actual.documentScrollWidth);
  assert.equal(s.documentClientWidth,actual.documentClientWidth);
  assert.ok(actual.documentScrollWidth<=actual.documentClientWidth+1,`observation ${o.index} width overflow`);
  for(const id of ['scene-4','scene-5','scene-slice']){
    assert.deepEqual(s.sceneRects[id],actual.sceneRects[id],`observation ${o.index} ${id} fresh rect`);
    assert.equal(o.scenes[id].attributes.viewBox,'0 0 640 420');
  }
  assert.equal(s.mode,s.model.interface.task.id==='none'&&s.model.interface.task.stage==='none'&&
    s.selectedVertexId==='v00000'&&s.rankCondition==='base'&&!s.inspectorOpen&&
    Object.values(s.controls).every(x=>x===null)?'saved-run':'exploration');
  assert.equal(s.playing,!!s.playing);
  assert.equal(s.sourceSha256,run.initialSourceSha256);
  assert.equal(s.model.source5.vertices.length,32);assert.equal(s.model.source5.edges.length,80);
  assert.equal(s.model.comparator4.vertices.length,16);assert.equal(s.model.comparator4.edges.length,32);
  const a=s.sourceAngles.alpha,b=s.sourceAngles.beta;
  near(a,s.model.source5.rotation.alpha,`observation ${o.index} alpha`);
  near(b,s.model.source5.rotation.beta,`observation ${o.index} beta`);
  near(a,s.model.comparator4.rotation.alpha,`observation ${o.index} comparator alpha`);
  assert.equal(s.model.comparator4.rotation.beta,null);
  for(const [dimension,shape,project] of [[5,s.model.source5,q=>raw5(q,a,b)],[4,s.model.comparator4,q=>raw4(q,a)]]){
    const vertices=shape.vertices,byId=new Map(vertices.map(v=>[v.id,v]));
    for(const v of vertices){
      vec(v.projected,project(v.originalSource),`observation ${o.index} ${dimension}D ${v.id} raw`);
      vec(v.screen,screen(v.projected,s.camera),`observation ${o.index} ${dimension}D ${v.id} screen`);
    }
    const unique=siteCount(vertices,'projected'),screenUnique=siteCount(vertices,'screen');
    assert.equal(shape.metrics.uniqueProjectedSites,unique);
    assert.equal(shape.metrics.screen.exactScreenSiteCount,screenUnique);
    assert.equal(shape.metrics.screen.coincidentMarkerExcess,vertices.length-screenUnique);
    assert.equal(shape.metrics.screen.glyphOverlapPairCount,pairProxy(vertices));
    let collapsed=0;for(const edge of shape.edges){
      const d=Math.sqrt(d2(byId.get(edge.from).projected,byId.get(edge.to).projected));
      near(edge.projectedLength,d,`observation ${o.index} edge length`);
      assert.equal(edge.collapsed,d<=1e-10);if(edge.collapsed)collapsed++;
    }
    assert.equal(shape.metrics.collapsedEdges,collapsed);
    assert.equal(shape.metrics.nonzeroProjectedEdges,shape.edges.length-collapsed);
    const nodes=o.scenes[`scene-${dimension}`].children;
    assert.equal(nodes.filter(n=>n.tag==='line').length,shape.edges.length);
    assert.equal(nodes.filter(n=>n.tag==='circle').length,vertices.length);
    const circles=nodes.filter(n=>n.tag==='circle').map(n=>[Number(n.attributes.cx),Number(n.attributes.cy)]);
    matchMultiset(circles,vertices.map(v=>v.screen),`observation ${o.index} ${dimension}D SVG circles`);
    assert.ok(nodes.filter(n=>n.tag==='circle').every(n=>Number(n.attributes.r)===4));
    const lines=nodes.filter(n=>n.tag==='line').map(n=>[Number(n.attributes.x1),Number(n.attributes.y1),Number(n.attributes.x2),Number(n.attributes.y2)]);
    const expectedLines=shape.edges.map(e=>{
      const u=byId.get(e.from).screen,v=byId.get(e.to).screen;return [...u,...v];
    });
    matchMultiset(lines,expectedLines,`observation ${o.index} ${dimension}D SVG lines`);
  }
  const selectedSource=s.model.source5.vertices.find(v=>v.id===s.selectedVertexId)?.originalSource;
  assert.ok(selectedSource,`observation ${o.index} selected source exists`);
  assert.equal(s.rank.sourceId,s.selectedVertexId);
  const expectedViews=s.rankCondition==='base'?[[0,0]]:s.rankCondition==='hidden'?
    [[0,0],[Math.PI/2,0]]:[[0,0],[Math.PI/2,0],[0,Math.PI/2]];
  assert.equal(s.rank.observations.length,expectedViews.length);
  assert.equal(s.rank.rank,expectedViews.length===1?3:expectedViews.length===2?4:5);
  for(let j=0;j<expectedViews.length;j++){
    const view=s.rank.observations[j],angles=expectedViews[j];
    vec([view.alpha,view.beta],angles,`observation ${o.index} known view ${j}`);
    assert.equal(view.id,s.selectedVertexId);
    vec(view.projected,raw5(selectedSource,...angles),`observation ${o.index} known raw view ${j}`);
    const expectedMatrix=[
      [Math.cos(angles[0]),0,0,-Math.sin(angles[0]),0],
      [0,Math.cos(angles[1]),0,0,-Math.sin(angles[1])],
      [0,0,1,0,0]];
    for(let k=0;k<3;k++)vec(view.matrix[k],expectedMatrix[k],`observation ${o.index} matrix ${j}/${k}`);
  }
  if(s.rank.rank<5){assert.equal(s.rank.reconstructed,null);assert.equal(s.rank.residual,null);}
  else{vec(s.rank.reconstructed,selectedSource,`observation ${o.index} recovered5`);
    assert.ok(s.rank.residual<=1e-10);assert.ok(s.rank.truthComparisonAfterSolve<=1e-10);}
  for(const [dimension,shape,markedId] of [[4,s.model.comparator4,'v0000'],[5,s.model.source5,'v00000']]){
    const target=shape.vertices.find(v=>v.id===markedId);
    const roster=shape.vertices.filter(v=>v.projected.every((x,i)=>Math.abs(x-target.projected[i])<=1e-10)).map(v=>v.id);
    assert.deepEqual(s.markedSite[dimension===4?'four':'five'].sourceIds,roster);
  }
  const slice=s.slice,u=1-slice.constraints.w**2-slice.constraints.v**2;
  near(slice.discriminant,u,`observation ${o.index} slice radicand`);
  assert.equal(slice.kind,u>0?'solid':u===0?'point':'empty');
  if(u<0){assert.equal(slice.radius,null);assert.equal(slice.center3,null);}
  else{near(slice.radius,Math.sqrt(u),`observation ${o.index} slice radius`);vec(slice.center3,[0,0,0],'slice center');}
  near(s.model.sliceProjection.radius,1,'full projection');
  const sliceNodes=o.scenes['scene-slice'].children;
  const guides=sliceNodes.filter(n=>n.tag==='line');assert.equal(guides.length,3);
  if(slice.kind==='empty'){
    assert.equal(sliceNodes.filter(n=>n.tag==='circle'||n.tag==='path').length,0);
    assert.ok(sliceNodes.some(n=>n.text.includes('EMPTY · NO POINTS')));
  }else if(slice.kind==='point'){
    assert.equal(sliceNodes.filter(n=>n.tag==='circle').length,2);
    assert.equal(sliceNodes.filter(n=>n.tag==='path').length,0);
    assert.ok(sliceNodes.some(n=>n.text.includes('one location')));
  }else{
    assert.equal(sliceNodes.filter(n=>n.tag==='path').length,3);
    assert.equal(sliceNodes.filter(n=>n.tag==='circle').length,1);
  }
  summaries.push({index:o.index,label:o.label,timeMs:s.simulationTimeMs,mode:s.mode,playing:s.playing,
    angles:[a,b],sliceKind:slice.kind,viewport:actual.viewport,rawSites:[s.model.comparator4.metrics.uniqueProjectedSites,s.model.source5.metrics.uniqueProjectedSites],
    collapsedEdges:[s.model.comparator4.metrics.collapsedEdges,s.model.source5.metrics.collapsedEdges],
    markerCollisionPairs:[s.model.comparator4.metrics.screen.glyphOverlapPairCount,s.model.source5.metrics.screen.glyphOverlapPairCount]});
}
const result={kind:'saved-actual-browser-state-svg-audit',runId:run.runId,buildId:run.buildId,
  observationsChecked:observations.length,checks:'fresh metadata, source/raw/screen equations, declared metrics, SVG points/edges, strict slice drawing',
  allChecksPassed:true,observationSummaries:summaries};
await writeFile(resolve(root,'audit/gate-5/G5-PENTERACT-001-browser-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({observationsChecked:observations.length,allChecksPassed:true}));
