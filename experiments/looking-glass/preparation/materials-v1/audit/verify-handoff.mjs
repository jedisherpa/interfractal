#!/usr/bin/env node
// Read-only final materials handoff verification; writes only this audit's result.
import {readFileSync,statSync,readdirSync,writeFileSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';import {join,resolve,dirname} from 'node:path';
const project=resolve(import.meta.dirname,'../../..'),base=join(project,'preparation/materials-v1');
const j=p=>JSON.parse(readFileSync(p)),h=b=>createHash('sha256').update(b).digest('hex');
const errors=[];const pins=[];
function pin(path,expected,bytes){const data=readFileSync(path);const pass=h(data)===expected&&(bytes===undefined||data.length===bytes);pins.push({path,pass,sha256:h(data),bytes:data.length});if(!pass)errors.push(`pin ${path}`);}
const expectedPacket='316528e2d942f1b611ceb9fb9705976e18c52012bf044cd0a50de22ccd7db608';
const expectedDisposition='e0629afb9e9735db89c3332853d78988b5cbe025942402f8d4838eaadae91daa';
const expectedCore='16795483e387a34c0f32e7185723d221dcc772da333a3e3a90848e2a9b80e4d6';
pin(join(base,'review/MATERIALS_REVIEW_PACKET.md'),expectedPacket);pin(join(base,'review/MATERIALS_REVIEW_DISPOSITION.json'),expectedDisposition);pin(join(base,'CORE_MANIFEST.json'),expectedCore);
const core=j(join(base,'CORE_MANIFEST.json'));if(core.files.length!==334||core.fileCount!==334)errors.push('core count');
for(const row of core.files)pin(join(project,row.path),row.sha256,row.bytes);
const disposition=j(join(base,'review/MATERIALS_REVIEW_DISPOSITION.json'));
if(disposition.status!=='PASS_BOUNDED_AUTHORED_MATERIALS_STAGE'||disposition.overallPreparationGoal!=='INCOMPLETE'||disposition.humanMaterialsApproval!=='PENDING'||disposition.gate14!=='UNAPPROVED_UNRUN')errors.push('disposition scope');
if(disposition.pins.length!==27)errors.push('disposition pin count');
for(const row of disposition.pins)pin(join(base,row.path),row.sha256,row.bytes);
const history=j(join(base,'evidence/historical-integrity-at-start.json'));let historical=0;
for(const row of history.manifests){pin(join(project,row.path),row.sha256);const manifest=j(join(project,row.path));for(const item of manifest.files){pin(join(project,item.path),item.sha256,item.bytes);historical++;}}
const freezes=[];for(const name of ['CANDIDATE_001_FREEZE.json','CANDIDATE_002_FREEZE.json']){const freeze=j(join(base,'evidence',name));let changed=0;for(const row of freeze.files){const b=readFileSync(join(project,row.path));if(h(b)!==row.sha256||(row.bytes!==undefined&&b.length!==row.bytes)){changed++;errors.push(`${name} ${row.path}`);}}freezes.push({name,entries:freeze.files.length,changed});}
const failed=j(join(base,'evidence/clean-reproduction-003.json')),good=j(join(base,'evidence/clean-reproduction-003-canonical.json'));
const candidateHash='7f7ba05a8f5d5fca9298d4e0b81210f049ff3a804fc94ab420d89fa4c5f32ced';
if(failed.pass!==false||failed.steps.length!==2||failed.steps.some(s=>s.exitCode!==0||s.stdout!==''||s.stderr!=='')||failed.manifestSha256!==null||failed.mismatches.length!==70)errors.push('first reproduction record');
if(good.pass!==true||good.steps.length!==2||good.steps.some(s=>s.exitCode!==0||!s.stdout.includes('passed: 70 files')||s.stderr!=='')||good.filesCompared!==70||good.mismatches.length!==0||good.manifestSha256!==candidateHash)errors.push('canonical reproduction record');
const stage=realpathSync(good.stagingDirectory),built=join(stage,'package-candidate-003'),current=join(base,'package-candidate-003');
const stageTop=readdirSync(stage).sort();
if(JSON.stringify(stageTop)!==JSON.stringify(['design','package-candidate-003','tooling']))errors.push('clean stage top-level inventory');
pin(join(built,'MANIFEST.json'),candidateHash);const manifest=j(join(current,'MANIFEST.json'));
if(manifest.files.length!==69)errors.push('candidate003 manifest entries');
let stageFiles=1;for(const item of manifest.files){const a=readFileSync(join(current,item.path)),b=readFileSync(join(built,item.path));if(h(a)!==item.sha256||a.length!==item.bytes||!a.equals(b))errors.push(`clean reproduction ${item.path}`);stageFiles++;}
if(stageFiles!==70)errors.push('clean reproduction file count');
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(join(dir,item.name)):[join(dir,item.name)]);}
if(walk(built).length!==70)errors.push('clean reproduction extra/missing file inventory');
const packet=readFileSync(join(base,'review/MATERIALS_REVIEW_PACKET.md'),'utf8');
const links=[...packet.matchAll(/\]\(([^)]+)\)/g)].map(m=>m[1]).filter(x=>!/^https?:/.test(x));
const badLinks=links.filter(link=>{try{return !statSync(resolve(base,'review',link.split('#')[0])).isFile();}catch{return true;}});if(badLinks.length)errors.push(`packet local links ${badLinks.join(',')}`);
const status=j(join(project,'PROJECT_STATUS.json'));
if(status.preparation_requirements_complete!==false||status.preparation_materials_human_approval!==false||status.next_gate_approved!==false||!/preparation-only/i.test(status.authorized_scope))errors.push('live status scope');
const ledger=readFileSync(join(project,'docs/program-requirements-and-status.md'),'utf8'),agents=readFileSync(join(project,'AGENTS.md'),'utf8'),readme=readFileSync(join(project,'README.md'),'utf8');
if(!ledger.includes('Preparation remains incomplete')||!ledger.includes('Transfer response schema/validator')||!agents.includes('Gate 14 remains unapproved')||!readme.includes('broader preparation goal remains incomplete'))errors.push('current prose scope');
const report={schemaVersion:'materials-final-handoff-verification/1',status:errors.length?'FAIL':'PASS_BOUNDED_HANDOFF',packetSha256:expectedPacket,dispositionSha256:expectedDisposition,coreManifestSha256:expectedCore,coreEntries:core.files.length,dispositionPins:disposition.pins.length,historicalEntries:historical,priorCandidateFreezes:freezes,cleanReproduction:{firstAttemptRecordedFailure:true,canonicalStageFileMatches:stageFiles,manifestSha256:candidateHash,noncanonicalPathIssueStillPresent:true},packetLocalLinks:links.length,badLinks,scope:{materialsStagePassed:true,overallPreparationIncomplete:true,humanMaterialsApprovalPending:true,researchCollectionPerformed:false},pinChecks:pins.length,errors};
writeFileSync(join(base,'audit/handoff-verification-final.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,core:report.coreEntries,dispositionPins:report.dispositionPins,historical:report.historicalEntries,stageFiles,errors:errors.length}));if(errors.length)process.exitCode=1;
