#!/usr/bin/env node
// Read-only independent candidate-byte and release-boundary audit.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, relative } from 'node:path';

const base = resolve(import.meta.dirname, '..');
const candidate = join(base, 'package-candidate-001');
const load = path => JSON.parse(readFileSync(path, 'utf8'));
const h = bytes => createHash('sha256').update(bytes).digest('hex');
const errors = [];
const manifest = load(join(candidate, 'MANIFEST.json'));
const world = load(join(base,'design/world.json'));
const allocation = load(join(base,'design/allocations.json'));
const development = load(join(base,'design/development-tasks.json'));
const designFreeze = load(join(base,'design/DESIGN_FREEZE.json'));
const sourceFreeze = load(join(base,'design/SOURCE_TASK_FREEZE.json'));
function walk(dir) { return readdirSync(dir, {withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]); }
const listed = manifest.files.map(item=>item.path).sort();
const actual = walk(candidate).map(file=>relative(candidate,file)).filter(path=>path!=='MANIFEST.json').sort();
if(JSON.stringify(listed)!==JSON.stringify(actual)) errors.push('root file/path inventory differs');
let bytesChecked=0;
for(const item of manifest.files) {
  const bytes=readFileSync(join(candidate,item.path)); bytesChecked+=bytes.length;
  if(bytes.length!==item.bytes || h(bytes)!==item.sha256) errors.push(`root manifest mismatch ${item.path}`);
}
for(const freeze of [designFreeze,sourceFreeze]) for(const item of freeze.files) {
  const file=join(base,'design',item.path.split('/').at(-1));
  const bytes=readFileSync(file);
  if(bytes.length!==item.bytes || h(bytes)!==item.sha256) errors.push(`design freeze mismatch ${item.path}`);
}
for(const item of manifest.inputs) {
  const bytes=readFileSync(join(base,item.path));
  if(bytes.length!==item.bytes || h(bytes)!==item.sha256) errors.push(`design input mismatch ${item.path}`);
}
const allCards = new Map(world.cards.map(c=>[c.id,c]));
const anchors = allocation.sharedCardIds;
const packetReports=[];
for(const packet of allocation.packets) {
  const path=join(candidate,'participants',packet.agentId);
  const files=readdirSync(path).sort();
  const expected=['INITIAL_PROMPT_TEMPLATE.txt','MANIFEST.json','PARTICIPANT_INSTRUCTIONS.md','allocation.json','development-tasks.json','input-manifest.json','proposed-run-settings.json','snapshot.schema.json','world.json'].sort();
  if(JSON.stringify(files)!==JSON.stringify(expected)) errors.push(`${packet.agentId}: file allowlist differs`);
  const sub=load(join(path,'MANIFEST.json'));
  for(const item of sub.files) { const bytes=readFileSync(join(path,item.path));if(bytes.length!==item.bytes||h(bytes)!==item.sha256)errors.push(`${packet.agentId}: submanifest ${item.path}`); }
  const input=load(join(path,'input-manifest.json'));
  if(input.files.some(item=>/AUTHOR|withheld|execution-plan|allocations\.json|PROMPT_TEMPLATES|SCORING/i.test(item.path)))errors.push(`${packet.agentId}: private path leaked into input manifest`);
  const filtered=load(join(path,'world.json'));
  const own=new Set(packet.cardIds);
  if(filtered.cards.length!==6||filtered.cards.some(c=>!own.has(c.id)||JSON.stringify(c)!==JSON.stringify(allCards.get(c.id)))) errors.push(`${packet.agentId}: filtered card identity/bytes wrong`);
  for(const field of ['schemaVersion','worldId','cutoffTick','statusSemantics','rules','entities','plans','commonFieldBoundary']) if(JSON.stringify(filtered[field])!==JSON.stringify(world[field])) errors.push(`${packet.agentId}: common ${field} differs`);
  const ownAllocation=load(join(path,'allocation.json'));
  if(JSON.stringify(ownAllocation.packet)!==JSON.stringify(packet)||JSON.stringify(ownAllocation.sharedCardIds)!==JSON.stringify(anchors)||'packets' in ownAllocation)errors.push(`${packet.agentId}: allocation scope wrong`);
  const tasks=load(join(path,'development-tasks.json'));
  if(tasks.tasks.length!==8||tasks.tasks.some(t=>!t.initialAccess)||tasks.tasks.some(t=>JSON.stringify(t)!==JSON.stringify(development.tasks.find(x=>x.id===t.id))))errors.push(`${packet.agentId}: initial task scope wrong`);
  const settings=load(join(path,'proposed-run-settings.json'));
  if(settings.status!=='PROPOSED_NOT_RATIFIED_NOT_EXECUTED'||settings.modelVersion!==null||settings.network!==false||settings.tools.length!==0)errors.push(`${packet.agentId}: proposed settings wrong`);
  const publicBytes=files.map(name=>readFileSync(join(path,name),'utf8')).join('\n');
  for(const other of world.cards.filter(c=>!own.has(c.id))) for(const claim of other.claims) if(publicBytes.includes(claim.id)) errors.push(`${packet.agentId}: foreign claim ID ${claim.id}`);
  packetReports.push({agentId:packet.agentId,cardIds:filtered.cards.map(c=>c.id),files:files.length,inputFiles:input.files.length,privateClaimLeakCount:0});
}
for(const name of ['AUTHOR_ANSWER_KEY.json','DESIGN_CONTRACT.md','execution-plan.json','PROMPT_TEMPLATES.md','SCORING_AND_ANALYSIS.md','withheld-tasks.json']) {
  const bytes=readFileSync(join(base,'design',name));
  if(h(bytes)!==h(readFileSync(join(candidate,'research-team/design',name))))errors.push(`research copy differs ${name}`);
}
if(h(readFileSync(join(base,'design/withheld-tasks.json')))!==h(readFileSync(join(candidate,'transfer-phase-bound/withheld-tasks.json'))))errors.push('phase-bound withheld differs');
const preview=readFileSync(join(candidate,'review/index.html'),'utf8');
if(preview.includes('AUTHOR_ANSWER_KEY')||preview.includes('W06-SHARED')||preview.includes('withheld-tasks.json'))errors.push('preview contains private answer or path marker');
if(!preview.includes('Preparation only.')||!preview.includes('not collected agent or human responses'))errors.push('preview lacks scope qualification');
const report={schemaVersion:'materials-package-independent-audit/1',status:errors.length?'FAIL':'PASS',candidateManifestSha256:h(readFileSync(join(candidate,'MANIFEST.json'))),fileCount:actual.length+1,manifestEntryCount:manifest.files.length,totalManifestBytes:bytesChecked,designFreezeEntries:designFreeze.files.length,sourceFreezeEntries:sourceFreeze.files.length,packets:packetReports,errors};
writeFileSync(join(base,'audit/package-verification-001.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,fileCount:report.fileCount,entries:report.manifestEntryCount,errors:errors.length}));
if(errors.length)process.exitCode=1;
