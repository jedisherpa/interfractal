// Independent Gate 2 oracle. Deliberately imports no correspondence implementation.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const project = path.resolve(import.meta.dirname, '../..');
const read = relative => JSON.parse(fs.readFileSync(path.join(project, relative), 'utf8'));
const raw = relative => fs.readFileSync(path.join(project, relative));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const predictions = read('docs/gate-2/independent-predictions.json');
const records = read('docs/gate-2/fictional-records.json');
const mappings = read('docs/gate-2/reference-mappings.json');
const tolerance = 1e-10;
const assertions = [];
const verify = (name, condition, detail = undefined) => assertions.push({ name, pass: Boolean(condition), ...(detail === undefined ? {} : { detail }) });
const close = (a, b) => Math.abs(a - b) <= tolerance;
const vectorClose = (a, b) => a.length === b.length && a.every((v, i) => close(v, b[i]));
const sqNorm = v => v.reduce((sum, x) => sum + x*x, 0);
const sorted = value => Array.isArray(value) ? value.map(sorted) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
const canonical = value => JSON.stringify(sorted(value));

// Complex multiplication is used here independently of the build's real-coordinate routines.
const multiply = ([ar, ai], [br, bi]) => [ar*br-ai*bi, ar*bi+ai*br];
const conjugate = ([r, i]) => [r, -i];
const section = (p, chart) => {
  const [X, Y, Z] = p;
  if (chart === 'north') {
    if (1+Z <= 1e-12) throw new RangeError('north chart unavailable at south pole');
    const z1 = [Math.sqrt((1+Z)/2), 0];
    const denominator = Math.sqrt(2*(1+Z));
    return [z1, [X/denominator, -Y/denominator]];
  }
  if (chart === 'south') {
    if (1-Z <= 1e-12) throw new RangeError('south chart unavailable at north pole');
    const denominator = Math.sqrt(2*(1-Z));
    return [[X/denominator, Y/denominator], [Math.sqrt((1-Z)/2), 0]];
  }
  throw new RangeError(`unknown chart ${chart}`);
};
const source = (p, chart, phase) => {
  const factor = [Math.cos(phase), Math.sin(phase)];
  return section(p, chart).flatMap(z => multiply(factor, z));
};
const hopf = ([a,b,c,d]) => [2*(a*c+b*d), 2*(b*c-a*d), a*a+b*b-c*c-d*d];
const projection = ([a,b,c,d]) => (1-d <= 1e-12 ? null : [a/(1-d), b/(1-d), c/(1-d)]);

const sampleResults = [];
for (const base of predictions.bases) {
  const points = Array.from({length:128}, (_,j) => source(base.xyz, base.canonicalSamplingChart, 2*Math.PI*j/128));
  const maxQNormError = Math.max(...points.map(q => Math.abs(sqNorm(q)-1)));
  const maxBaseError = Math.max(...points.flatMap(q => hopf(q).map((v,i) => Math.abs(v-base.xyz[i]))));
  const unique = new Set(points.map(q => q.map(v => v.toFixed(12)).join(','))).size;
  sampleResults.push({id:base.id, count:points.length, unique, maxQNormError, maxBaseError,
    infinityIndices:points.flatMap((q,j) => projection(q) === null ? [j] : [])});
}
verify('8 bases × 128 unique source points', sampleResults.length===8 && sampleResults.every(x=>x.count===128 && x.unique===128), sampleResults);
verify('all source norms and Hopf base identities', sampleResults.every(x=>x.maxQNormError<=tolerance && x.maxBaseError<=tolerance));
verify('only south sample j32 reaches stereo pole', sampleResults.every(x=> x.id==='south' ? x.infinityIndices.join(',')==='32' : x.infinityIndices.length===0));

const replay = predictions.replayCheckpoints.map(expected => {
  const phase=2*Math.PI*expected.tMs/24000;
  const q=source([1,0,0],'north',phase);
  const h=hopf(q), P=projection(q);
  return {tMs:expected.tMs,q,h,P,expectedMatch:vectorClose(q,expected.sourceQ)&&vectorClose(h,expected.hopfBase)&&vectorClose(P,expected.stereographicR3)};
});
verify('closed-form east replay checkpoints',replay.length===5&&replay.every(x=>x.expectedMatch),replay);
verify('east half-turn is antipodal and same base', vectorClose(replay[2].q,replay[0].q.map(x=>-x))&&vectorClose(replay[2].h,replay[0].h));
verify('24s numerical return, not exact hash requirement',vectorClose(replay[4].q,replay[0].q)&&vectorClose(replay[4].P,replay[0].P));

const front=[0,1,0], frontNorth=source(front,'north',0), frontSouth=source(front,'south',-Math.PI/2);
verify('front compensated north→south keeps source, base and projection',
  vectorClose(frontNorth,frontSouth)&&vectorClose(hopf(frontNorth),front)&&vectorClose(projection(frontNorth),predictions.chartSwitch.expectedProjection),
  {frontNorth,frontSouth});
for (const [name,p,chart] of [['north→south',[0,0,1],'south'],['south→north',[0,0,-1],'north']]) {
  let rejects=false; try {section(p,chart)} catch(error) {rejects=error instanceof RangeError}
  verify(`${name} invalid chart rejected`,rejects);
}
const seamPlus=predictions.bases.find(x=>x.id==='seam-plus').xyz;
const seamMinus=predictions.bases.find(x=>x.id==='seam-minus').xyz;
verify('seam base closeness and atan2 branch jump',close(Math.hypot(...seamPlus.map((v,i)=>v-seamMinus[i])),2e-6)&&
  close(Math.atan2(seamPlus[1],seamPlus[0])-Math.atan2(seamMinus[1],seamMinus[0]),predictions.seamCases.longitudeDifferenceApprox));
for (const [index,gamma,expected] of [[0,0,[0,0,1]],[32,Math.PI/2,null],[64,Math.PI,[0,0,-1]],[96,3*Math.PI/2,[0,0,0]]]) {
  const q=source([0,0,-1],'south',gamma), P=projection(q);
  verify(`south pole phase sample ${index}`,vectorClose(hopf(q),[0,0,-1])&&(expected===null?P===null:vectorClose(P,expected)),{q,P});
}
const southNear=Array.from({length:128},(_,j)=>projection(source([0,0,-1],'south',2*Math.PI*j/128)));
verify('south projection exceeds clip on both sides of infinity',
  southNear[31][2]>4&&southNear[33][2]<-4&&southNear[32]===null&&southNear[0][2]===1&&close(southNear[64][2],-1),
  {before:southNear[31],pole:southNear[32],after:southNear[33]});

const custom=predictions.customSelection;
const rad=Math.PI/180;
const lat=custom.latitudeDegrees*rad,lon=custom.longitudeDegrees*rad;
const customP=[Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)];
const customQ=source(customP,'north',0);
verify('custom latitude/longitude and north-section source',vectorClose(customP,custom.expectedBase)&&vectorClose(customQ,custom.expectedSourceQ)&&vectorClose(projection(customQ),custom.expectedProjection));
const [u,v]=custom.surfacePick.targetSvg;
const X=(u-320)/148,Z=-(v-210)/148,Y=Math.sqrt(1-X*X-Z*Z);
const picked=[X,Y,Z], pickedQ=source(picked,'north',0);
verify('exact front-disk inverse at declared target',vectorClose(picked,custom.surfacePick.targetBase)&&vectorClose(hopf(pickedQ),picked)&&close(sqNorm(picked),1),{picked});

const sourceSha=sha(raw(records.sourceDocument.path));
verify('source document SHA-256',sourceSha===records.sourceDocument.sha256,{sourceSha});
const recChecks=records.records.map(record=>{
  const {contentSha256,...body}=record;
  return {id:record.id,hash:sha(canonical(body)),expected:contentSha256,sourceMatches:record.source.sha256===sourceSha};
});
verify('four per-record sorted-key hashes and provenance',recChecks.length===4&&recChecks.every(x=>x.hash===x.expected&&x.sourceMatches),recChecks);
const byId=Object.fromEntries(records.records.map(r=>[r.id,r]));
const answers={};
for (const definition of mappings.referenceDefinitions) {
  const id=definition.id;
  answers[id]=records.records.map(record=>{
    const answer=record.kind!=='venue'?null:id==='R_CAPACITY_60'
      ? record.facts.capacityHouseholds>=60 : record.facts.alreadyWheelchairAccessible;
    return {recordId:record.id,answer:answer===null?'unmapped':answer?'yes':'no'};
  });
  const expected=mappings.expectedAssignments[id];
  verify(`${id} assignments derive from supplied facts`,expected.length===4&&expected.every((row,i)=>{
    const derived=answers[id][i];
    const phase=[0,Math.PI/2,Math.PI,null][i];
    return row.recordId===derived.recordId&&row.recordSha256===byId[row.recordId].contentSha256&&
      row.answer===(derived.answer==='unmapped'?null:derived.answer)&&row.status===(derived.answer==='unmapped'?'unmapped':'mapped')&&
      row.baseId===(derived.answer==='unmapped'?null:derived.answer==='yes'?'east':'west')&&row.displayPhaseRad===phase;
  }),answers[id]);
}
verify('Hall ramp option retained despite no existing access',byId['venue-hall'].facts.alreadyWheelchairAccessible===false&&
  byId['venue-hall'].facts.requiredAccessEquipment.name==='portable ramp'&&
  byId['venue-hall'].facts.requiredAccessEquipment.costTokens===2);
verify('weather remains unmapped under both partial references',Object.values(answers).every(rows=>rows.find(x=>x.recordId==='weather-context').answer==='unmapped'));
verify('record fixture explicitly excludes full-feasibility inference',records.limits.some(x=>x.includes('full task feasibility')));

const result={oracle:'independent-gate-2-v1',inputs:{predictions:'docs/gate-2/independent-predictions.json',records:'docs/gate-2/fictional-records.json',mappings:'docs/gate-2/reference-mappings.json',sourceDocument:records.sourceDocument.path},
  tolerance,assertions,summary:{passed:assertions.filter(x=>x.pass).length,total:assertions.length,failed:assertions.filter(x=>!x.pass).map(x=>x.name)}};
fs.writeFileSync(path.join(import.meta.dirname,'oracle-results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary));
if(result.summary.failed.length)process.exitCode=1;
