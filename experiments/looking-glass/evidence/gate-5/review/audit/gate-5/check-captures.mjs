// Original JPEG byte/dimension/bracketing audit. Does not alter images.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const captures=JSON.parse(await readFile(resolve(root,'evidence/gate-5/capture-index.json')));
const observations=JSON.parse(await readFile(resolve(root,'evidence/gate-5/browser-observations.json')));
const byIndex=new Map(observations.map(o=>[o.index,o]));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function jpegSize(bytes){
  assert.equal(bytes.readUInt16BE(0),0xffd8,'JPEG SOI');
  let pos=2;
  while(pos+4<bytes.length){
    if(bytes[pos]!==0xff){pos++;continue;}
    while(bytes[pos]===0xff)pos++;
    const marker=bytes[pos++];
    if(marker===0xd8||marker===0xd9||marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
    const length=bytes.readUInt16BE(pos);assert.ok(length>=2&&pos+length<=bytes.length,'JPEG segment');
    if((marker>=0xc0&&marker<=0xc3)||(marker>=0xc5&&marker<=0xc7)||
      (marker>=0xc9&&marker<=0xcb)||(marker>=0xcd&&marker<=0xcf))
      return {height:bytes.readUInt16BE(pos+3),width:bytes.readUInt16BE(pos+5)};
    pos+=length;
  }
  throw new Error('JPEG SOF not found');
}
const results=[];
for(const c of captures){
  assert.equal(c.runId,'G5-PENTERACT-001');assert.equal(c.buildId,'g5-0bdee39bcd7dd541');
  assert.equal(c.mime,'image/jpeg');assert.ok(c.captureMethod.includes('Unedited native'));
  const before=byIndex.get(c.beforeObservation),after=byIndex.get(c.afterObservation);
  assert.ok(before&&after,`${c.label} observation bracket`);
  assert.ok(before.index<after.index,`${c.label} bracket order`);
  const bytes=await readFile(resolve(root,'evidence/gate-5',c.path));
  assert.equal(bytes.length,c.bytes,`${c.label} bytes`);assert.equal(sha(bytes),c.sha256,`${c.label} hash`);
  const dimensions=jpegSize(bytes);
  assert.deepEqual(dimensions,{width:before.outer.viewport.width,height:before.outer.viewport.height},`${c.label} original dimensions`);
  assert.deepEqual(before.outer.viewport,after.outer.viewport,`${c.label} stable viewport`);
  if(c.pixelWidth!==undefined)assert.equal(c.pixelWidth,dimensions.width);
  if(c.pixelHeight!==undefined)assert.equal(c.pixelHeight,dimensions.height);
  results.push({label:c.label,path:c.path,sha256:c.sha256,bytes:c.bytes,dimensions,
    beforeObservation:before.index,afterObservation:after.index,
    beforeTimeMs:before.state.simulationTimeMs,afterTimeMs:after.state.simulationTimeMs,
    sameCheckpointHash:before.state.checkpointSha256===after.state.checkpointSha256});
}
const result={kind:'original-capture-integrity',runId:'G5-PENTERACT-001',buildId:'g5-0bdee39bcd7dd541',
  originalsChecked:results.length,allChecksPassed:true,captures:results,
  interpretation:'Active images are bounded by before/after observations; no atomic frame time is inferred.'};
await writeFile(resolve(root,'audit/gate-5/G5-PENTERACT-001-capture-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({originalsChecked:results.length,allChecksPassed:true}));
