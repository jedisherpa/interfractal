import { readFile, mkdir, writeFile, copyFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUN_ID, DURATION_MS, CHECKPOINTS_MS, SOURCE, EDGES, CAMERA, modelAt, canonicalState } from './model.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const files = ['index.html','style.css','app.mjs','model.mjs','server.mjs','build.mjs','test.mjs'];
const hash = createHash('sha256');
const bytes = [];
for (const file of files) {
  const content = await readFile(join(dir,file));
  bytes.push(content);
  hash.update(file); hash.update('\0'); hash.update(content); hash.update('\0');
}
const sourceSha256 = hash.digest('hex');
const buildId = `g0-${sourceSha256.slice(0,16)}`;
const buildDir = join(dir, 'builds', buildId);
const runDir = join(dir, 'runs', RUN_ID);
const sha256 = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : canonicalState(value)).digest('hex');
const exists = path => access(path).then(()=>true,()=>false);
if (await exists(join(runDir,'run.json'))) {
  const old = JSON.parse(await readFile(join(runDir,'run.json'),'utf8'));
  if (old.buildId !== buildId) throw new Error(`${RUN_ID} is immutable and belongs to ${old.buildId}. Choose a new run ID for changed source.`);
  console.log(`Existing immutable run ${RUN_ID} uses ${buildId}`);
  process.exit(0);
}
await mkdir(buildDir, { recursive:true });
for (let i=0;i<files.length;i++) await copyFile(join(dir,files[i]),join(buildDir,files[i]));
const builtAt = new Date().toISOString();
const build = { buildId, sourceSha256, sourceFiles:files.map((path,i)=>({ path, sha256:sha256(bytes[i]) })), dependencyIdentity:'node-builtins-only; no lockfile or external assets', nodeVersion:process.version, builtAt };
await writeFile(join(buildDir,'build.json'), JSON.stringify(build,null,2)+'\n',{flag:'wx'});
await mkdir(runDir,{recursive:true});
const states = CHECKPOINTS_MS.map(t => ({ simulationTimeMs:t, state:modelAt(t), stateSha256:sha256(modelAt(t)) }));
const initial = states[0];
const run = {
  runId:RUN_ID, gate:'G0', experimentVersion:'G0-charter-v1', testId:'G0-cube-view-replay',
  hypothesis:'A marked ordinary 3D cube remains legible and a saved camera path can be replayed from exact time states.',
  baseRevision:'3f1b1d028947fcc2fb207e41780f1a2b714705b0', buildId, sourceSha256,
  dependencyIdentity:build.dependencyIdentity, builtAt, durationMs:DURATION_MS, checkpointTimesMs:CHECKPOINTS_MS,
  model:{ type:'ordinary-3d-wire-cube', dimension:3, generatorVersion:'cube-v1', seed:null, vertices:SOURCE, edges:EDGES, selectedVertexId:'v111', sourceTransform:'identity', displayCamera:{...CAMERA, order:'Rx(pitch) · Ry(yaw) · q'}, projection:'orthographic screen=(cx,-cy)', scalePxPerUnit:138, clipping:'none', displayOptions:{ depthCue:'edge-opacity', glow:false, trail:false, autoRescale:false }, renderer:'SVG 2D', viewport:'responsive SVG viewBox 700×560' },
  initialStateHash:initial.stateSha256, eventsFile:'events.jsonl', checkpointsFile:'checkpoints.json', initialStateFile:'initial-state.json',
  resultsStatus:'Model replay checks are recorded separately by actual test; browser inspection required.'
};
const event = (sequence,type,t,intended) => ({ sequence,type,simulationTimeMs:t,wallTimestamp:builtAt,intended,observed:{ simulationTimeMs:t,camera:modelAt(t).camera,sourceRotation:'identity' }, stateSha256:sha256(modelAt(t)) });
const events = [event(1,'replay.open',0,{openingState:'paused-at-start'}),event(2,'camera.set',0,{source:'saved-path'}),event(3,'camera.set',10_000,{source:'saved-path'}),event(4,'camera.set',20_000,{source:'saved-path'}),event(5,'playback.pause',20_000,{source:'saved-path'})];
await writeFile(join(runDir,'run.json'),JSON.stringify(run,null,2)+'\n',{flag:'wx'});
await writeFile(join(runDir,'initial-state.json'),JSON.stringify(initial,null,2)+'\n',{flag:'wx'});
await writeFile(join(runDir,'checkpoints.json'),JSON.stringify(states,null,2)+'\n',{flag:'wx'});
await writeFile(join(runDir,'events.jsonl'),events.map(e=>JSON.stringify(e)).join('\n')+'\n',{flag:'wx'});
console.log(JSON.stringify({ runId:RUN_ID, buildId, sourceSha256, launch:`node ${join(buildDir,'server.mjs')}` },null,2));
