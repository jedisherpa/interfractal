import { readFile, mkdir, writeFile, copyFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUN_ID, DURATION_MS, CHECKPOINTS_MS, CAMERA, BASES, SAMPLE_COUNT, CLIP_RADIUS, modelAt, geometryState, mappingFingerprintState, checkpointFingerprintState } from './model.mjs';
import { mappingState } from './mapping.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const experimentDir = resolve(dir,'..');
const prespecBytes = await readFile(join(experimentDir,'docs/gate-2/PRESPEC_FREEZE.json'));
const prespecFreeze = JSON.parse(prespecBytes);
const files = ['index.html','style.css','app.mjs','model.mjs','mapping.mjs','server.mjs','build.mjs','test.mjs','fictional-records.json','reference-mappings.json','README.md'];
const sha256 = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const content = await Promise.all(files.map(name => readFile(join(dir,name))));
for (const file of prespecFreeze.files) {
  const actual = sha256(await readFile(join(experimentDir,file.path)));
  if (actual !== file.sha256) throw new Error(`Frozen prespec hash mismatch: ${file.path}`);
}
const sourceDigest = createHash('sha256');
files.forEach((name,i) => { sourceDigest.update(name); sourceDigest.update('\0'); sourceDigest.update(content[i]); sourceDigest.update('\0'); });
const sourceSha256 = sourceDigest.digest('hex'), buildId = `g2-${sourceSha256.slice(0,16)}`;
const buildDir = join(dir,'builds',buildId), runDir = join(dir,'runs',RUN_ID);
const exists = path => access(path).then(() => true, () => false);
if (await exists(join(runDir,'run.json'))) {
  const prior = JSON.parse(await readFile(join(runDir,'run.json'),'utf8'));
  if (prior.buildId !== buildId) throw new Error(`${RUN_ID} is immutable and belongs to ${prior.buildId}; use a new candidate run ID for changed source`);
  console.log(`Existing immutable run ${RUN_ID} uses ${buildId}`); process.exit(0);
}
const records = JSON.parse(await readFile(join(dir,'fictional-records.json'),'utf8'));
const mappings = JSON.parse(await readFile(join(dir,'reference-mappings.json'),'utf8'));
const mapping = mappingState(records,mappings,'R_CAPACITY_60');
const stateAt = ms => ({ model: modelAt(ms), mapping, display: { comparing: false, showUnmapped: false, selectedRecordId: null } });
const checkpoints = CHECKPOINTS_MS.map(simulationTimeMs => {
  const state = stateAt(simulationTimeMs);
  return { simulationTimeMs, state, stateSha256: sha256(checkpointFingerprintState(state)), modelSha256: sha256(state.model), geometrySha256: sha256(geometryState(state.model)), mappingSha256: sha256(mappingFingerprintState(mapping)), recordsSha256: sha256(records.records) };
});
await mkdir(buildDir,{recursive:true});
for (let i=0;i<files.length;i++) await copyFile(join(dir,files[i]),join(buildDir,files[i]));
const builtAt = new Date().toISOString();
const build = { buildId, sourceSha256, sourceFiles: files.map((path,i) => ({ path, sha256: sha256(content[i]) })),
  dependencyIdentity: 'Node.js builtins only; no packages, lockfile or external runtime assets', nodeVersion: process.version, builtAt,
  prespecFreezeSha256:sha256(prespecBytes), prespecFrozenAtUtc:prespecFreeze.frozenAtUtc, prespecFiles:prespecFreeze.files };
await writeFile(join(buildDir,'build.json'),JSON.stringify(build,null,2)+'\n',{flag:'wx'});
await mkdir(runDir,{recursive:true});
const run = { runId:RUN_ID, gate:'G2', status:'planned deterministic fixture; actual browser observations recorded separately',
  experimentVersion:'gate-2-hopf-correspondence-v1', testId:'G2-hopf-phase-chart-and-reference',
  hypothesis:'Each selected S² point identifies one full S³ fiber; shared phase moves source q without moving its base, while a separate candidate reference maps the same fictional records by declared partial criteria.',
  baseRevision:'b8b354e47477b342726fa14403980e0caea47c0b', buildId, sourceSha256,
  dependencyIdentity:build.dependencyIdentity, builtAt, prespecFreezeSha256:build.prespecFreezeSha256,
  prespecFrozenAtUtc:build.prespecFrozenAtUtc, prespecFiles:build.prespecFiles,
  durationMs:DURATION_MS, stepMs:1000, checkpointTimesMs:CHECKPOINTS_MS,
  model:{ type:'Hopf correspondence S³→S²', sourceCoordinates:'q=(Re z1,Im z1,Re z2,Im z2) in R⁴', sourceDimension:3, ambientDimension:4,
    basePoints:BASES, fiberSamplesPerBase:SAMPLE_COUNT, stereoClipRadius:CLIP_RADIUS, camera:CAMERA,
    sourceToBase:'h=(2(ac+bd),2(bc-ad),a²+b²-c²-d²)', sourceToDisplay:'(a,b,c)/(1-d), d=1 excluded',
    phasePath:'east/north chart, gamma=2πt/24000', seed:null, renderer:'SVG 2D projection of computed R³ curves',
    fixedScaleSvgUnitsPerR3Unit:55, clipping:'R³ radius 4; discontinuity at stereographic infinity; never join across excluded point',
    semanticLoopDisplay:{center:[160,110],radiusSvgUnits:66,xyFromPhase:'x=160+66cos(phase); y=110−66sin(phase); arbitrary categorical display slot'} },
  attention:{ recordFixture:'fictional-records.json', recordFixtureSha256:sha256(await readFile(join(dir,'fictional-records.json'))),
    mappingFixture:'reference-mappings.json', mappingFixtureSha256:sha256(await readFile(join(dir,'reference-mappings.json'))),
    initialReferenceId:'R_CAPACITY_60', recordIdsAndHashes:records.records.map(r => ({id:r.id,sha256:r.contentSha256})),
    semantics:'candidate partial display mapping; phase is arbitrary display slot; no endorsement or full feasibility claim' },
  initialStateHash:checkpoints[0].stateSha256, initialModelHash:checkpoints[0].modelSha256,
  initialGeometryHash:checkpoints[0].geometrySha256, initialMappingHash:checkpoints[0].mappingSha256,
  initialRecordsHash:checkpoints[0].recordsSha256,
  initialStateFile:'initial-state.json', eventsFile:'events.jsonl', checkpointsFile:'checkpoints.json',
  eventsKind:'planned deterministic fixture, not observed browser controls' };
const events = [{sequence:1,kind:'planned-fixture',type:'replay.open',simulationTimeMs:0,actor:'fixture-generator',origin:'planned-fixture',intended:{openingState:'paused-at-start'}}
  ,...CHECKPOINTS_MS.map((simulationTimeMs,i)=>({sequence:i+2,kind:'planned-fixture',type:'fiber.phase.set',simulationTimeMs,actor:'fixture-generator',origin:'planned-fixture',intended:{phaseRad:2*Math.PI*simulationTimeMs/DURATION_MS},expected:{stateSha256:checkpoints[i].stateSha256,geometrySha256:checkpoints[i].geometrySha256}}))
  ,{sequence:7,kind:'planned-fixture',type:'playback.pause',simulationTimeMs:DURATION_MS,actor:'fixture-generator',origin:'automatic-playback',intended:{reason:'canonical-end'}}];
await writeFile(join(runDir,'run.json'),JSON.stringify(run,null,2)+'\n',{flag:'wx'});
await writeFile(join(runDir,'initial-state.json'),JSON.stringify(checkpoints[0],null,2)+'\n',{flag:'wx'});
await writeFile(join(runDir,'checkpoints.json'),JSON.stringify(checkpoints,null,2)+'\n',{flag:'wx'});
await writeFile(join(runDir,'events.jsonl'),events.map(e=>JSON.stringify(e)).join('\n')+'\n',{flag:'wx'});
console.log(JSON.stringify({runId:RUN_ID,buildId,sourceSha256,launch:`node ${join(buildDir,'server.mjs')}`},null,2));
