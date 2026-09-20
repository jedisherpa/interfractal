import { readFile, mkdir, writeFile, copyFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUN_ID, DURATION_MS, SAMPLE_MS, STEP_MS, CHECKPOINTS_MS, CAMERA, SCALE,
  SOURCE5, SOURCE4, EDGES5, EDGES4, modelAt, sourceState, rotationState,
  projectionState, comparatorState, sliceState, geometryState, checkpointState,
  displayState, observationsFor, reconstruct, projectionMatrix5, slice5 } from './model.mjs';

const dir = dirname(fileURLToPath(import.meta.url)), experimentDir = resolve(dir, '..');
const sha = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const freezePath = join(experimentDir, 'docs/gate-5/PRESPEC_FREEZE.json');
const freezeBytes = await readFile(freezePath), freeze = JSON.parse(freezeBytes);
for (const file of freeze.files) {
  const actual = sha(await readFile(join(experimentDir, file.path)));
  if (actual !== file.sha256) throw new Error(`Frozen prespec hash mismatch: ${file.path}`);
}
const baselinePath = join(experimentDir, 'hypercube/builds/g3-6c31bc16aeca4460/model.mjs');
const baselineSha256 = sha(await readFile(baselinePath));
if (baselineSha256 !== 'e9be25d2aaf9f625a3d3cd7784d70abb0739399da832fea307d9bff1c3b7bc2c')
  throw new Error('Frozen 4D comparator source pin mismatch');
execFileSync(process.execPath, [join(dir, 'test.mjs')], { cwd: experimentDir, stdio: 'inherit' });
const sourceFiles = ['index.html','style.css','app.mjs','model.mjs','server.mjs','build.mjs','test.mjs','README.md'];
const contents = await Promise.all(sourceFiles.map(name => readFile(join(dir, name))));
const digest = createHash('sha256');
sourceFiles.forEach((name,i)=>{digest.update(name);digest.update('\0');digest.update(contents[i]);digest.update('\0');});
const sourceSha256 = digest.digest('hex'), buildId = `g5-${sourceSha256.slice(0,16)}`;
const buildDir = join(dir,'builds',buildId), runDir=join(dir,'runs',RUN_ID);
const exists = p => access(p).then(()=>true,()=>false);
if (await exists(join(runDir,'run.json'))) {
  const prior=JSON.parse(await readFile(join(runDir,'run.json'),'utf8'));
  if(prior.buildId!==buildId)throw new Error(`${RUN_ID} belongs to immutable ${prior.buildId}; use next candidate ID`);
  console.log(`Existing immutable ${RUN_ID} / ${buildId}`);process.exit(0);
}
const fixture = ms => {
  const state=modelAt(ms);
  return {simulationTimeMs:ms,state,sourceSha256:sha(sourceState()),rotationSha256:sha(rotationState(state)),
    projectionSha256:sha(projectionState(state)),comparatorSha256:sha(comparatorState(state)),
    sliceSha256:sha(sliceState(state)),geometrySha256:sha(geometryState(state)),
    checkpointSha256:sha(checkpointState(state)),displaySha256:sha(displayState(state))};
};
const checkpoints=CHECKPOINTS_MS.map(fixture), initial=checkpoints[0];
const viewSets = { base:[[0,0]], hiddenV:[[0,0],[Math.PI/2,0]], revealV:[[0,0],[Math.PI/2,0],[0,Math.PI/2]] };
const observationCases = SOURCE5.map(({id,q})=>{
  const cases=Object.fromEntries(Object.entries(viewSets).map(([condition,views])=>{
    const observations=observationsFor(id,views), solved=reconstruct(observations);
    return [condition,{observations,...solved}];
  }));
  const solved=cases.revealV;
  return {id,cases,truthComparisonAfterSolve:{maxCoordinateError:Math.max(...q.map((x,i)=>Math.abs(x-solved.reconstructed[i]))),
    maxForwardResidual:solved.residual}};
});
const arbitrary=[.2,-.4,.6,-.8,1.1];
const probeCases=Object.fromEntries(Object.entries(viewSets).map(([condition,views])=>{
  const observations=views.map(([a,b])=>({id:'probe',alpha:a,beta:b,matrix:projectionMatrix5(a,b),
    projected:projectionMatrix5(a,b).map(row=>row.reduce((sum,x,i)=>sum+x*arbitrary[i],0))}));
  return [condition,{observations,...reconstruct(observations)}];
}));
const probe={id:'probe',cases:probeCases,truthComparisonAfterSolve:{
  maxCoordinateError:Math.max(...arbitrary.map((x,i)=>Math.abs(x-probeCases.revealV.reconstructed[i]))),
  maxForwardResidual:probeCases.revealV.residual}};
const observations={schemaVersion:'gate-5-observations-v1',candidateClass:'known matched raw xyz under declared transforms',
  viewSets,sourceCases:observationCases,opaqueProbe:probe,
  solverInputs:'ID + known matrix + raw projected xyz only; truth compared afterward' };
const slicePairs=[[0,0],[.5,0],[0,.5],[.5,.5],[1,0],[0,1],[1.25,0],[0,1.25],[1,1],[-.5,0],[0,-.5],
  [-.999999,0],[-1.000001,0],[.999999,0],[1.000001,0],[0,-.999999],[0,-1.000001],[0,.999999],[0,1.000001]];
const sliceCases={schemaVersion:'gate-5-slice-cases-v1',source:'closed 5D unit ball at known w/v planes',
  cases:slicePairs.map(([w,v])=>slice5(w,v)),equalRadiusPairs:[[.5,0],[0,.5]],
  fullProjectionRadius:1};
const gitHead=execFileSync('git',['rev-parse','HEAD'],{cwd:experimentDir,encoding:'utf8'}).trim();
await mkdir(buildDir,{recursive:true});
for(const name of sourceFiles)await copyFile(join(dir,name),join(buildDir,name));
const builtAtUtc=new Date().toISOString();
const build={buildId,sourceSha256,sourceFiles:sourceFiles.map((path,i)=>({path,sha256:sha(contents[i]),bytes:contents[i].length})),
  gitHead,baseRevision:'231780872da982cb87b54f004c287a078d26839b',uncommittedSourceIdentity:sourceSha256,
  dependencyIdentity:'Node.js builtins only; no packages, lockfile or external assets',nodeVersion:process.version,
  builtAtUtc,prespecFreezeSha256:sha(freezeBytes),prespecFrozenAtUtc:freeze.frozenAtUtc,prespecFiles:freeze.files,
  baseline4D:{path:'hypercube/builds/g3-6c31bc16aeca4460/model.mjs',sha256:baselineSha256,
    preservedRunId:'G3-TESSERACT-003',preservedBuildId:'g3-6c31bc16aeca4460'},
  renderer:'Browser SVG of raw 3D projected 4D/5D wireframes and analytic 5D-ball 3D slice'};
await writeFile(join(buildDir,'build.json'),JSON.stringify(build,null,2)+'\n',{flag:'wx'});
await mkdir(runDir,{recursive:true});
const run={runId:RUN_ID,gate:'G5',status:'planned deterministic fixture; actual browser observations stored separately',
  experimentVersion:'gate-5-charter-v1',modelVersion:'gate-5-model-v1',eventSchemaVersion:'gate-5-record-v1',
  generatorVersion:'gate-5-builder-v1',testId:'G5-two-independent-extra-coordinates',
  hypothesis:'Independent x–w and y–v source rotations expose distinct 5D effects; known raw views can reveal v; two-plane slices and fixed-camera task comparison retain specified ambiguities.',
  buildId,sourceSha256,gitHead,baseRevision:build.baseRevision,uncommittedSourceIdentity:sourceSha256,
  dependencyIdentity:build.dependencyIdentity,nodeVersion:process.version,builtAtUtc,
  prespecFreezeSha256:build.prespecFreezeSha256,prespecFrozenAtUtc:build.prespecFrozenAtUtc,prespecFiles:freeze.files,
  baseline4D:build.baseline4D,renderer:build.renderer,sourceSeed:null,
  durationMs:DURATION_MS,stepMs:STEP_MS,sampleMs:SAMPLE_MS,checkpointTimesMs:CHECKPOINTS_MS,
  source5:{dimension:5,boundaryDimension:4,vertices:SOURCE5.length,edges:EDGES5.length},
  comparator4:{dimension:4,boundaryDimension:3,vertices:SOURCE4.length,edges:EDGES4.length,
    description:'newly computed comparator validated against untouched Gate 3 source; beta ignored'},
  display:{camera:CAMERA,viewBox:[0,0,640,420],center:[320,210],scale:SCALE,glyphRadiusSvgUnits:4,
    noAutoFit:true,noJitter:true},
  observationCasesFile:'observation-cases.json',sliceCasesFile:'slice-cases.json',
  initialSourceSha256:initial.sourceSha256,initialRotationSha256:initial.rotationSha256,
  initialProjectionSha256:initial.projectionSha256,initialComparatorSha256:initial.comparatorSha256,
  initialSliceSha256:initial.sliceSha256,initialCheckpointSha256:initial.checkpointSha256,
  initialStateFile:'initial-state.json',checkpointsFile:'checkpoints.json',eventsFile:'events.jsonl',
  eventsKind:'planned deterministic fixture; not observed browser controls'};
const events=[{seq:1,kind:'planned-fixture',type:'replay.open',simulationTimeMs:0,
  actor:'fixture-generator',origin:'planned-fixture',intended:{openingState:'paused-at-start',runId:RUN_ID,buildId}},
  ...checkpoints.map((cp,i)=>({seq:i+2,kind:'planned-fixture',type:'checkpoint.expected',
    simulationTimeMs:cp.simulationTimeMs,actor:'fixture-generator',origin:'planned-fixture',
    expected:{rotationSha256:cp.rotationSha256,projectionSha256:cp.projectionSha256,
      comparatorSha256:cp.comparatorSha256,sliceSha256:cp.sliceSha256,checkpointSha256:cp.checkpointSha256}})),
  {seq:checkpoints.length+2,kind:'planned-fixture',type:'playback.pause',simulationTimeMs:DURATION_MS,
    actor:'fixture-generator',origin:'automatic-playback',intended:{reason:'end-of-sequence'}}];
for(const [name,value] of [['run.json',run],['initial-state.json',initial],['checkpoints.json',checkpoints],
  ['observation-cases.json',observations],['slice-cases.json',sliceCases]])
  await writeFile(join(runDir,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
await writeFile(join(runDir,'events.jsonl'),events.map(e=>JSON.stringify(e)).join('\n')+'\n',{flag:'wx'});
console.log(JSON.stringify({runId:RUN_ID,buildId,sourceSha256,prespecFreezeSha256:build.prespecFreezeSha256,
  baseline4DSha256:baselineSha256,launch:`node ${join(buildDir,'server.mjs')}`},null,2));
