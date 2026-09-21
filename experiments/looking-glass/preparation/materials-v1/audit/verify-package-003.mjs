#!/usr/bin/env node
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,relative,resolve} from 'node:path';
const base=resolve(import.meta.dirname,'..'),dir=join(base,'package-candidate-003');
const j=p=>JSON.parse(readFileSync(p)),h=b=>createHash('sha256').update(b).digest('hex');
const errors=[];const manifest=j(join(dir,'MANIFEST.json'));
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);
const actual=walk(dir).map(p=>relative(dir,p)).filter(p=>p!=='MANIFEST.json').sort();
const listed=manifest.files.map(f=>f.path).sort();if(JSON.stringify(actual)!==JSON.stringify(listed))errors.push('root inventory');
for(const item of manifest.files){const b=readFileSync(join(dir,item.path));if(b.length!==item.bytes||h(b)!==item.sha256)errors.push(`root manifest ${item.path}`);}
for(const item of manifest.inputs){const b=readFileSync(join(base,item.path));if(b.length!==item.bytes||h(b)!==item.sha256)errors.push(`input ${item.path}`);}
for(const freezeName of ['DESIGN_FREEZE.json','SOURCE_TASK_FREEZE.json'])for(const item of j(join(base,'design',freezeName)).files){const b=readFileSync(join(base,'design',item.path.split('/').at(-1)));if(b.length!==item.bytes||h(b)!==item.sha256)errors.push(`${freezeName} ${item.path}`);}
const world=j(join(base,'design/world.json')),alloc=j(join(base,'design/allocations.json')),development=j(join(base,'design/development-tasks.json'));
const packetReports=[];
for(const packet of alloc.packets){
 const prefix=join(dir,'participants',packet.agentId),names=readdirSync(prefix).sort();
 const expect=['INITIAL_PROMPT_TEMPLATE.txt','MANIFEST.json','PARTICIPANT_INSTRUCTIONS.md','allocation.json','development-tasks.json','input-manifest.json','proposed-run-settings.json','snapshot.schema.json','world.json'].sort();
 if(JSON.stringify(names)!==JSON.stringify(expect))errors.push(`${packet.agentId} names`);
 const sub=j(join(prefix,'MANIFEST.json'));for(const item of sub.files){const b=readFileSync(join(prefix,item.path));if(b.length!==item.bytes||h(b)!==item.sha256)errors.push(`${packet.agentId} manifest ${item.path}`);}
 const filtered=j(join(prefix,'world.json'));const own=new Set(packet.cardIds);
 if(filtered.cards.length!==6||filtered.cards.some(c=>!own.has(c.id)||JSON.stringify(c)!==JSON.stringify(world.cards.find(x=>x.id===c.id))))errors.push(`${packet.agentId} cards`);
 for(const field of ['schemaVersion','worldId','cutoffTick','statusSemantics','rules','entities','plans','commonFieldBoundary'])if(JSON.stringify(filtered[field])!==JSON.stringify(world[field]))errors.push(`${packet.agentId} common ${field}`);
 const localAlloc=j(join(prefix,'allocation.json'));if(JSON.stringify(localAlloc.packet)!==JSON.stringify(packet)||localAlloc.packets)errors.push(`${packet.agentId} allocation`);
 const localTasks=j(join(prefix,'development-tasks.json'));if(localTasks.tasks.length!==8||localTasks.tasks.some(t=>!t.initialAccess||JSON.stringify(t)!==JSON.stringify(development.tasks.find(x=>x.id===t.id))))errors.push(`${packet.agentId} tasks`);
 const manifestText=readFileSync(join(prefix,'input-manifest.json'),'utf8');if(/AUTHOR_ANSWER_KEY|withheld-tasks|SCORING_AND_ANALYSIS|PROMPT_TEMPLATES|execution-plan/.test(manifestText))errors.push(`${packet.agentId} private manifest`);
 const allText=names.map(n=>readFileSync(join(prefix,n),'utf8')).join('\n');for(const c of world.cards.filter(c=>!own.has(c.id)))for(const fact of c.claims)if(allText.includes(fact.id))errors.push(`${packet.agentId} foreign fact ${fact.id}`);
 packetReports.push({agentId:packet.agentId,cardIds:filtered.cards.map(c=>c.id),files:names.length,initialTasks:localTasks.tasks.length});
}
for(const name of readdirSync(join(base,'design'))){const source=readFileSync(join(base,'design',name)),copy=readFileSync(join(dir,'research-team/design',name));if(h(source)!==h(copy))errors.push(`research design copy ${name}`);}
for(const name of readdirSync(join(base,'tooling'),{withFileTypes:true}).filter(e=>e.isFile()).map(e=>e.name)){const source=readFileSync(join(base,'tooling',name)),copy=readFileSync(join(dir,'builder-tooling',name));if(h(source)!==h(copy))errors.push(`tooling copy ${name}`);}
const preview=readFileSync(join(dir,'review/index.html'));const previous=readFileSync(join(base,'package-candidate-001/review/index.html'));
const report={schemaVersion:'materials-package-independent-audit/2',status:errors.length?'FAIL':'PASS',manifestSha256:h(readFileSync(join(dir,'MANIFEST.json'))),fileCount:actual.length+1,manifestEntries:manifest.files.length,packets:packetReports,previewSha256:h(preview),previewIdenticalToCandidate001:h(preview)===h(previous),errors};
writeFileSync(join(base,'audit/package-verification-003.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,files:report.fileCount,entries:report.manifestEntries,previewIdentical:report.previewIdenticalToCandidate001,errors:errors.length}));if(errors.length)process.exitCode=1;
