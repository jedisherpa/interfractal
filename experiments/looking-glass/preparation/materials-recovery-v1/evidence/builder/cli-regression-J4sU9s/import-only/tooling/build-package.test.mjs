import assert from 'node:assert/strict';
import { validateDesign } from './build-package.mjs';

const cards = Array.from({ length: 18 }, (_, index) => ({ id: `C${String(index + 1).padStart(2, '0')}`, version: 1, occurredTick: 0, claims: [] }));
cards[0].rules = []; cards[0].statusSemantics = { supported: [true, false], refuted: [false, true], conflicted: [true, true], unknown: [false, false] };
cards[1].entities = { actors: [], resources: [] }; cards[1].plans = [];
const common = ['C01', 'C02'];
const packets = Array.from({ length: 4 }, (_, index) => ({
  agentId: `A${index + 1}`,
  perspectiveInstructionId: 'P0',
  cardIds: [...common, ...cards.slice(2 + 4 * index, 6 + 4 * index).map(card => card.id)],
}));
const fixture = () => ({
  world: { schemaVersion: 'synthetic/1', worldId: 'SYNTHETIC', cutoffTick: 0, rules: [], statusSemantics: structuredClone(cards[0].statusSemantics), entities: structuredClone(cards[1].entities), plans: [], cards: structuredClone(cards), commonFieldBoundary: 'synthetic' },
  allocations: { worldId: 'SYNTHETIC', sharedCardIds: [...common], packets: structuredClone(packets) },
  development: { worldId: 'SYNTHETIC', initialTaskIds: ['D1'], tasks: [{ id: 'D1', scope: 'synthetic', initialAccess: true }] },
  withheld: { tasks: [{ id: 'H1', scope: 'synthetic', sourceIds: ['C18'] }] },
  snapshotSchema: { type: 'object', properties: {}, additionalProperties: false },
});
assert.deepEqual(validateDesign(fixture()), []);
{
  const value = fixture(); value.allocations.packets[1].cardIds[2] = 'C03';
  assert.match(validateDesign(value).join(' '), /private cards must be distinct/);
}
{
  const value = fixture(); value.allocations.packets[2].cardIds[0] = 'C08';
  assert.match(validateDesign(value).join(' '), /anchor missing/);
}
{
  const value = fixture(); value.world.cards[17].id = 'C17';
  assert.match(validateDesign(value).join(' '), /duplicate card IDs/);
}
{
  const value = fixture(); value.development.tasks[0].sourceIds = ['C99'];
  assert.match(validateDesign(value).join(' '), /dangling card C99/);
}
{
  const value = fixture(); value.world.withheldTransfer = { context: 'SECRET' };
  assert.match(validateDesign(value).join(' '), /unexpected or missing public top-level field/);
}
{
  const value = fixture(); value.world.cards[2].authorAnswer = 'SECRET';
  assert.match(validateDesign(value).join(' '), /unexpected field in public card/);
}
process.stdout.write('package design mutation checks passed\n');
