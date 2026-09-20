import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../..');
const expected = [
  { gate: 0, count: 61, manifestSha256: '0dd3d5b9bd66ec07f8ee7d82db407365acc4eb2a04b1d0f9bb1ed8783ef82dc5' },
  { gate: 1, count: 95, manifestSha256: '302bc210ce9e7f45573ce4515229fd6402f491db12b8d173c9bd26f98438587d' },
  { gate: 2, count: 120, manifestSha256: '52d91bfe40813a6f041b8806a036bc78c144f2a1fbe03e73f3fc05ff03de1104' }
];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const checks = expected.map(({gate,count,manifestSha256}) => {
  const manifestPath = path.join(root, `evidence/gate-${gate}/GATE_${gate}_FREEZE.json`);
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes);
  const files = manifest.files.map(item => {
    const filePath = path.join(root, item.path);
    try {
      const bytes = fs.readFileSync(filePath);
      return {path:item.path, pass:sha(bytes)===item.sha256 && (item.bytes===undefined || item.bytes===bytes.length)};
    } catch (error) { return {path:item.path, pass:false, error:String(error)}; }
  });
  return {gate, expectedFiles:count, actualFiles:files.length, manifestSha256, actualManifestSha256:sha(manifestBytes),
    pass:files.length===count && sha(manifestBytes)===manifestSha256 && files.every(item=>item.pass),
    mismatches:files.filter(item=>!item.pass)};
});
const result = {checkedAtUtc:new Date().toISOString(), scope:'All 276 frozen Gate 0, 1 and 2 entries and pinned manifest bytes',
  pass:checks.every(item=>item.pass), checks};
const output = path.join(import.meta.dirname,'prior-integrity.json');
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pass:result.pass,checks:checks.map(c=>({gate:c.gate,pass:c.pass,files:c.actualFiles,mismatches:c.mismatches.length}))}));
if(!result.pass) process.exitCode=1;
