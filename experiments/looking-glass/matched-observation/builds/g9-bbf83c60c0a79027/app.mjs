import {Gate9Engine} from './engine.mjs';
import {acquiredOccurrences,hash,informationHash,semanticFingerprint,semanticState,uniqueObservations,visibleIndices} from './core.mjs';

const $=id=>document.getElementById(id);
const fixture=await (await fetch('/fixture.json')).json();
const metadata=await (await fetch('/metadata.json')).json();
let owner=null,timer=null,busy=false,lastExport='';
const engine=new Gate9Engine(fixture,metadata,render);
engine.stopClock=()=>{if(owner==='local'){clearInterval(timer);timer=null;owner=null;}};
function stopAny(){if(timer)clearInterval(timer);timer=null;owner=null;}
async function action(work){if(busy)return;busy=true;try{await work();await render();}catch(e){$('export-output').textContent=JSON.stringify({error:String(e)},null,2);}finally{busy=false;}}
function val(r){const [n,d='1']=r.split('/');return Number(n)/Number(d);}
function fixed(r){const x=val(r);const y=x.toFixed(2);return y==='-0.00'?'0.00':y;}
function card(o){
  const [x,y,z]=o.observation.xyz.map(val),pitch=20*Math.PI/180,scale=80;
  const sx=140+scale*x,sy=100-scale*(y*Math.cos(pitch)-z*Math.sin(pitch));
  const axis=(x2,y2,label)=>`<line x1="140" y1="100" x2="${x2}" y2="${y2}" stroke="#9badbc" stroke-width="1.5"/><text x="${x2+3}" y="${y2-3}" font-size="11" fill="#536c82">${label}</text>`;
  const svg=`<svg viewBox="0 0 280 200" width="280" height="200" role="img" aria-label="Point P projected at x ${fixed(o.observation.xyz[0])}, y ${fixed(o.observation.xyz[1])}, z ${fixed(o.observation.xyz[2])}">${axis(230,100,'x')}${axis(140,25,'y')}${axis(140,125,'z')}<circle cx="${sx}" cy="${sy}" r="6" fill="#d94d42" stroke="#722620" stroke-width="2"/><text x="${sx+9}" y="${sy-7}" font-size="12" font-weight="700" fill="#152e41">P</text></svg>`;
  const el=document.createElement('article');el.className='card';el.dataset.index=o.index;el.dataset.queryId=o.queryId;
  const title=document.createElement('h3');title.textContent=`Observation ${o.index+1} · ${o.queryId}`;el.append(title);
  el.insertAdjacentHTML('beforeend',svg);
  const raw=document.createElement('p');raw.className='raw';raw.textContent=`Exact P = (${o.observation.xyz.join(', ')})`;el.append(raw);
  const rounded=document.createElement('p');rounded.className='raw';rounded.textContent=`Display = (${o.observation.xyz.map(fixed).join(', ')})`;el.append(rounded);
  return el;
}
function makeContext(){
  $('task').textContent=fixture.commonContext.taskText;
  $('instructions').replaceChildren(...fixture.commonContext.instructions.map(t=>{const p=document.createElement('p');p.textContent=t;return p;}));
  $('worlds').replaceChildren(...fixture.commonContext.worlds.map(w=>{const tr=document.createElement('tr');[w.id,...w.source,`(${w.propertyValue.join(', ')})`].forEach(t=>{const td=document.createElement('td');td.textContent=t;tr.append(td);});if(w.id===fixture.commonContext.referenceWorldId)tr.title='Public reference';return tr;}));
  $('queries').replaceChildren(...fixture.commonContext.queries.map(q=>{const p=document.createElement('p');p.textContent=`${q.id}: ${q.label}; ${q.formula}`;return p;}));
  const p=fixture.commonContext.practice;
  $('practice').innerHTML='';const heading=document.createElement('h3');heading.textContent=p.title;$('practice').append(heading);
  for(const line of [`Source: (${p.source.join(', ')})`,`Project: (${p.project.xyz.join(', ')})`,`Repeat project: (${p.repeatProject.xyz.join(', ')})`,`x-w quarter-turn: (${p.xw90.xyz.join(', ')})`,p.explanation]){const e=document.createElement('p');e.textContent=line;$('practice').append(e);}
  $('query-controls').replaceChildren(...fixture.commonContext.queries.map(q=>{const b=document.createElement('button');b.type='button';b.textContent=q.label;b.id=`choose-${q.id}`;b.addEventListener('click',()=>action(()=>engine.choose(q.id)));return b;}));
  $('checkpoints').replaceChildren(...fixture.savedTour.checkpointsSeconds.map(t=>{const b=document.createElement('button');b.type='button';b.textContent=`Checkpoint ${t} s`;b.addEventListener('click',()=>action(async()=>{stopAny();await engine.restoreCheckpoint(t);}));return b;}));
}
makeContext();
await engine.init();
async function inspector(){
  const s=engine.state,indices=visibleIndices(s),acquired=acquiredOccurrences(s),exposeTrace=s.phase==='complete'||s.condition==='static';
  const safeState={...semanticState(s),trace:exposeTrace?s.trace:null,traceWithheld:!!s.trace&&!exposeTrace,occurrences:undefined};
  const cards=[...document.querySelectorAll('.card')].map(e=>({index:Number(e.dataset.index),queryId:e.dataset.queryId,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,svgWidth:e.querySelector('svg').getBoundingClientRect().width,svgHeight:e.querySelector('svg').getBoundingClientRect().height}));
  return {schema:'gate9-browser-inspector-v1',runId:metadata.runId,buildId:metadata.buildId,sessionId:engine.sessionId,fixtureId:fixture.fixtureId,contextHash:engine.contextHash,commonContext:fixture.commonContext,state:safeState,traceHash:s.traceHash,provenance:engine.selectedTrace?.envelope.provenance??(s.mode==='saved-tour'?'scripted_demonstration':'local_control'),visibleOccurrences:indices.map(i=>s.occurrences[i]),acquiredOccurrences:acquired,acquiredInformationHash:await informationHash(fixture,engine.contextHash,acquired),informationHash:s.phase==='complete'&&s.trace?await informationHash(fixture,engine.contextHash,s.trace.occurrences):null,completedSummary:s.phase==='complete'?s.completedSummary:null,endpointComparisonEligible:s.phase==='complete'&&!!s.trace,semanticFingerprint:await semanticFingerprint(s),eventCount:engine.events.length,lastEvent:engine.events.at(-1)??null,viewport:{innerWidth:innerWidth,innerHeight:innerHeight,scrollX,scrollY,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,cards}};
}
async function render(){
  if(!$('identity'))return;
  const s=engine.state,hasTrace=!!engine.selectedTrace,route=['watch','static'].includes(s.condition);
  $('identity').textContent=`${metadata.runId} · ${metadata.buildId} · fixture ${fixture.fixtureId} · context ${engine.contextHash}`;
  $('status').textContent=`Mode ${s.mode} · ${s.condition} / ${s.phase} · ${s.choices.length}/2 choices · local ${s.localSeconds.toFixed(1)} s · tour ${s.tourSeconds.toFixed(1)} s · ${s.reviewStatus} · acquired ${s.acquiredOccurrenceIndices.length}/3 · trace ${s.traceHash??'draft'}`;
  $('cards').replaceChildren(...visibleIndices(s).map(i=>card(s.occurrences[i])));
  $('history').textContent=`Acquired occurrence history: ${s.acquiredOccurrenceIndices.map(i=>`${i+1}. ${s.occurrences[i].queryId}`).join(' → ')}`;
  $('summary').textContent=s.phase==='complete'&&s.completedSummary?`Completed selected-evidence result: compatible ${s.completedSummary.compatibleWorldIds.join(', ')}; property determined ${s.completedSummary.propertyDetermined?'yes':'no'}.`:'';
  $('trace-selection').replaceChildren();const label=document.createElement('label');label.textContent='Sealed trace registry: ';const select=document.createElement('select');select.id='trace-registry';select.setAttribute('aria-label','Select sealed trace');
  engine.registry.forEach((entry,i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=`${i+1}. ${entry.envelope.choiceQueryIds.join(' → ')} · ${entry.traceHash.slice(0,12)}`;select.append(opt);});
  if(engine.selectedTrace)select.value=String(engine.registry.indexOf(engine.selectedTrace));select.disabled=!engine.registry.length;
  select.addEventListener('change',()=>action(async()=>{stopAny();await engine.selectTrace(Number(select.value));}));label.append(select);$('trace-selection').append(label);
  for(const q of fixture.commonContext.queries)$(`choose-${q.id}`).disabled=s.condition!=='choose'||s.phase!=='draft'||s.choices.length>=2;
  for(const [id,condition] of [['review-choose','choose'],['review-watch','watch'],['review-static','static']])$(id).disabled=!hasTrace;
  $('presentation-play').disabled=!route||!s.presentationPaused||s.phase==='complete';
  $('presentation-pause').disabled=!route||s.presentationPaused||s.phase!=='running';
  $('presentation-restart').disabled=!route||!hasTrace;
  $('previous-observation').disabled=s.condition!=='watch'||!hasTrace||!s.presentationPaused||s.localSeconds<=0;
  $('next-observation').disabled=s.condition!=='watch'||!hasTrace||!s.presentationPaused||s.localSeconds>=6;
  $('finish-sheet').disabled=s.condition!=='static'||!hasTrace||s.phase==='complete';
  $('tour-pause').disabled=s.mode!=='saved-tour'||s.tourPaused;
  $('export-route').disabled=s.phase!=='complete'||!s.trace;
  $('practice').hidden=!s.practiceOpen;$('practice-toggle').textContent=s.practiceOpen?'Close shared worked practice':'Open shared worked practice';
  $('inspector').textContent=JSON.stringify(await inspector(),null,2);
}

async function localTimer(){stopAny();owner='local';let last=engine.state.localSeconds,start=performance.now()-last*1000;
  timer=setInterval(()=>action(async()=>{if(owner!=='local')return;const elapsed=Math.min(6,(performance.now()-start)/1000);for(const t of [2,4,6])if(last<t&&elapsed>=t){await engine.localBoundary(t);last=t;}if(engine.state.phase==='running')engine.state.localSeconds=elapsed;if(elapsed>=6)stopAny();}),80);
}
async function tourTimer(){stopAny();owner='tour';let last=engine.state.tourSeconds,start=performance.now()-last*1000;
  timer=setInterval(()=>action(async()=>{if(owner!=='tour')return;const elapsed=Math.min(24,(performance.now()-start)/1000);for(const t of fixture.savedTour.checkpointsSeconds.slice(1))if(last<t&&elapsed>=t){await engine.advanceTourBoundary(t);last=t;}if(elapsed<24)engine.state.tourSeconds=elapsed;if(engine.state.phase==='running'&&!engine.state.presentationPaused)engine.state.localSeconds=engine.state.condition==='watch'?Math.max(0,Math.min(6,elapsed-6)):Math.max(0,Math.min(6,elapsed-14));if(elapsed>=24)stopAny();}),80);
}
$('new-choice').addEventListener('click',()=>action(async()=>{const wasTour=owner==='tour';stopAny();if(wasTour)await engine.tourPause();await engine.newChoice();}));
for(const [id,c] of [['review-choose','choose'],['review-watch','watch'],['review-static','static']])$(id).addEventListener('click',()=>action(async()=>{stopAny();if(engine.state.mode==='saved-tour'&&!engine.state.tourPaused)await engine.tourPause();await engine.selectCondition(c);}));
$('presentation-play').addEventListener('click',()=>action(async()=>{await engine.play();await localTimer();}));
$('presentation-pause').addEventListener('click',()=>action(async()=>{stopAny();await engine.pause();}));
$('presentation-restart').addEventListener('click',()=>action(async()=>{stopAny();await engine.restart();}));
$('previous-observation').addEventListener('click',()=>action(()=>engine.step(-1)));
$('next-observation').addEventListener('click',()=>action(()=>engine.step(1)));
$('finish-sheet').addEventListener('click',()=>action(async()=>{stopAny();await engine.finishSheet();}));
$('practice-toggle').addEventListener('click',()=>action(()=>engine.practice(!engine.state.practiceOpen)));
$('export-route').addEventListener('click',()=>action(async()=>{lastExport=JSON.stringify(await engine.exportRoute(),null,2);$('export-output').textContent=lastExport;}));
$('export-events').addEventListener('click',()=>action(async()=>{await engine.event('trace-export','user-control',{kind:'event-log'},()=>{});lastExport=JSON.stringify({schema:'gate9-event-export-v1',runId:metadata.runId,buildId:metadata.buildId,events:engine.events},null,2);$('export-output').textContent=lastExport;}));
$('tour-play').addEventListener('click',()=>action(async()=>{stopAny();await engine.tourPlay();await tourTimer();}));
$('tour-pause').addEventListener('click',()=>action(async()=>{stopAny();await engine.tourPause();}));
for(const [id,dir] of [['previous-checkpoint',-1],['next-checkpoint',1]])$(id).addEventListener('click',()=>action(async()=>{stopAny();const list=fixture.savedTour.checkpointsSeconds,current=engine.state.tourSeconds,target=dir>0?list.find(t=>t>current):[...list].reverse().find(t=>t<current);await engine.restoreCheckpoint(target??(dir>0?24:0));}));
$('reopen-start').addEventListener('click',()=>action(async()=>{stopAny();await engine.reopenSavedStart();}));
addEventListener('resize',()=>{render();});addEventListener('scroll',()=>{render();},{passive:true});
await render();
