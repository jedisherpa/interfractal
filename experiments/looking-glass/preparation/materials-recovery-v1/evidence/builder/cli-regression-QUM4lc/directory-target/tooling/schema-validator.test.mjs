import assert from 'node:assert/strict';
import { validateJson, validateSchemaDefinition } from './schema-validator.mjs';

const schema = {
  type: 'object', required: ['actor', 'positions'], additionalProperties: false,
  properties: {
    actor: { type: 'string', minLength: 1 },
    positions: { type: 'array', minItems: 1, items: { $ref: '#/$defs/position' } },
  },
  $defs: {
    position: {
      type: 'object', required: ['understanding', 'endorsement', 'commitment'], additionalProperties: false,
      properties: {
        understanding: { enum: ['understood', 'unknown', 'disputed'] },
        endorsement: { enum: ['endorsed', 'declined', 'unknown'] },
        commitment: { enum: ['committed', 'not-committed', 'unknown'] },
      },
    },
  },
};
const valid = { actor: 'SYNTHETIC-A', positions: [{ understanding: 'understood', endorsement: 'declined', commitment: 'not-committed' }] };
assert.deepEqual(validateSchemaDefinition(schema), []);
assert.deepEqual(validateJson(valid, schema), []);
assert.match(validateJson({ ...valid, positions: [{}] }, schema).join(' '), /required/);
assert.match(validateJson({ ...valid, positions: [{ ...valid.positions[0], endorsement: false }] }, schema).join(' '), /outside enum/);
// Cross-field commitment semantics are checked by the package contract validator.
assert.match(validateSchemaDefinition({ type: 'object', unevaluatedProperties: false }).join(' '), /unsupported keyword/);
process.stdout.write('schema validator unit checks passed\n');
