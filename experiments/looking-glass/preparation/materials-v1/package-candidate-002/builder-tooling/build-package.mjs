#!/usr/bin/env node
// Deterministic preparation packager. This code never invokes a research model.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { encoded, readJson, manifestFor, sha256, writeNewDirectory, verifyFiles } from './package-utils.mjs';
import { validateSchemaDefinition } from './schema-validator.mjs';

const base = resolve(import.meta.dirname, '..');
const design = join(base, 'design');
const tooling = join(base, 'tooling');
const candidate = join(base, 'package-candidate-002');
const required = ['world.json', 'allocations.json', 'development-tasks.json', 'withheld-tasks.json', 'snapshot.schema.json', 'AUTHOR_ANSWER_KEY.json', 'execution-plan.json', 'PROMPT_TEMPLATES.md', 'PARTICIPANT_INSTRUCTIONS.md', 'DESIGN_FREEZE.json'];
const fail = message => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
const unique = items => new Set(items).size === items.length;
const htmlEscape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function allFiles(folder, prefix = '') {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const rel = `${prefix}${entry.name}`;
    return entry.isDirectory() ? allFiles(join(folder, entry.name), `${rel}/`) : [rel];
  }).sort();
}

export function validateDesign({ world, allocations, development, withheld, snapshotSchema }) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  check(world?.worldId === allocations?.worldId && world?.worldId === development?.worldId, 'worldId mismatch');
  const worldFields = ['schemaVersion', 'worldId', 'cutoffTick', 'statusSemantics', 'rules', 'entities', 'plans', 'cards', 'commonFieldBoundary'];
  check(Object.keys(world ?? {}).length === worldFields.length && Object.keys(world ?? {}).every(field => worldFields.includes(field)), 'world has unexpected or missing public top-level field');
  check(Array.isArray(world?.cards) && world.cards.length === 18, 'world requires exactly 18 cards');
  const cards = world?.cards ?? [];
  const cardFields = new Set(['id', 'version', 'occurredTick', 'recordedTick', 'kind', 'title', 'surfaceText', 'claims', 'provenance', 'rules', 'statusSemantics', 'entities', 'plans', 'speechAct', 'referent']);
  const claimFields = new Set(['id', 'predicate', 'arguments', 'value', 'evidenceKind', 'lineageId', 'supersedes', 'restates']);
  for (const card of cards) {
    check(Object.keys(card).every(field => cardFields.has(field)), `${card.id}: unexpected field in public card`);
    for (const claim of card.claims ?? []) check(Object.keys(claim).every(field => claimFields.has(field)), `${claim.id}: unexpected field in public claim`);
  }
  const ids = cards.map(card => card.id);
  check(ids.every(id => typeof id === 'string' && id.length > 0), 'card IDs must be nonempty strings');
  check(unique(ids), 'duplicate card IDs');
  const idSet = new Set(ids);
  const anchors = allocations?.sharedCardIds ?? [];
  check(Array.isArray(anchors) && anchors.length === 2 && unique(anchors), 'exactly two unique anchors required');
  check(anchors.every(id => idSet.has(id)), 'anchor references missing card');
  const packets = allocations?.packets ?? [];
  check(Array.isArray(packets) && packets.length === 4, 'exactly four packets required');
  check(unique(packets.map(packet => packet.agentId)), 'duplicate agentId');
  const privatePlacements = [];
  for (const packet of packets) {
    const packetIds = packet.cardIds ?? [];
    check(packetIds.length === 6 && unique(packetIds), `${packet.agentId}: expected six unique cards`);
    check(anchors.every(id => packetIds.includes(id)), `${packet.agentId}: anchor missing`);
    check(packetIds.every(id => idSet.has(id)), `${packet.agentId}: unknown card`);
    privatePlacements.push(...packetIds.filter(id => !anchors.includes(id)));
  }
  check(privatePlacements.length === 16 && unique(privatePlacements), 'private cards must be distinct across packets');
  check(new Set([...anchors, ...privatePlacements]).size === 18, 'allocation does not cover all cards');
  check(Array.isArray(development?.tasks) && development.tasks.length > 0, 'development tasks missing');
  check(Array.isArray(withheld?.tasks) && withheld.tasks.length > 0, 'withheld tasks missing');
  check(unique([...(development?.tasks ?? []), ...(withheld?.tasks ?? [])].map(task => task.id)), 'duplicate task ID');
  check(JSON.stringify(cards[0]?.rules) === JSON.stringify(world?.rules), 'C01 anchor rules differ from shared rules');
  check(JSON.stringify(cards[0]?.statusSemantics) === JSON.stringify(world?.statusSemantics), 'C01 anchor statuses differ from shared statuses');
  check(JSON.stringify(cards[1]?.entities) === JSON.stringify(world?.entities), 'C02 anchor entities differ from shared entities');
  check(JSON.stringify(cards[1]?.plans) === JSON.stringify(world?.plans), 'C02 anchor plans differ from shared plans');
  check(JSON.stringify(world?.statusSemantics?.unknown) === '[false,false]' && JSON.stringify(world?.statusSemantics?.refuted) === '[false,true]', 'unknown and refuted semantics must differ');
  const initialTasks = (development?.tasks ?? []).filter(task => task.initialAccess === true).map(task => task.id);
  const taskFields = new Set(['id', 'scope', 'question', 'responseFields', 'scoringAtoms', 'initialAccess']);
  for (const task of development?.tasks ?? []) check(Object.keys(task).every(field => taskFields.has(field)), `${task.id}: unexpected field in development task`);
  check(JSON.stringify(initialTasks) === JSON.stringify(development?.initialTaskIds), 'initial task allowlist mismatch');
  check((development?.tasks ?? []).every(task => typeof task.initialAccess === 'boolean'), 'every development task needs explicit initialAccess');
  const claims = cards.flatMap(card => card.claims ?? []);
  const claimIds = claims.map(claim => claim.id);
  const claimSet = new Set(claimIds);
  check(unique(claimIds), 'duplicate claim ID');
  const actorIds = new Set(world?.entities?.actors?.map(actor => actor.id) ?? []);
  const resources = new Map((world?.entities?.resources ?? []).map(resource => [resource.id, resource.owner]));
  const plans = new Set((world?.plans ?? []).map(plan => `${plan.id}@${plan.version}`));
  const roles = {
    demand: ['requirement', 'requirementVersion'], capacity: ['actor', 'resource'],
    explores: ['actor', 'plan', 'planVersion'], understands: ['actor', 'plan', 'planVersion'],
    endorses: ['actor', 'plan', 'planVersion'], model_attributes_endorsement: ['actor', 'plan', 'planVersion'],
    resource_commitment: ['actor', 'plan', 'planVersion', 'resource', 'quantity'],
    inspection_report: ['plan', 'planVersion', 'scope', 'reporter'], mandate: ['actor', 'scope', 'complete'],
  };
  for (const card of cards) {
    check(Number.isInteger(card.version) && card.version >= 1, `${card.id}: version missing`);
    check(Number.isInteger(card.occurredTick) && card.occurredTick <= world.cutoffTick, `${card.id}: outside cutoff`);
    for (const claim of card.claims ?? []) {
      check(Boolean(roles[claim.predicate]), `${claim.id}: unknown predicate`);
      for (const role of roles[claim.predicate] ?? []) check(Object.hasOwn(claim.arguments ?? {}, role), `${claim.id}: missing role ${role}`);
      if (claim.arguments?.actor) check(actorIds.has(claim.arguments.actor), `${claim.id}: unknown actor`);
      if (claim.arguments?.resource) check(resources.has(claim.arguments.resource), `${claim.id}: unknown resource`);
      if (claim.arguments?.plan) check(plans.has(`${claim.arguments.plan}@${claim.arguments.planVersion}`), `${claim.id}: unknown plan/version`);
      if (claim.predicate === 'resource_commitment') check(resources.get(claim.arguments?.resource) === claim.arguments?.actor, `${claim.id}: commitment actor does not own resource`);
      for (const ref of [...(claim.supersedes ?? []), ...(claim.restates ?? [])]) check(claimSet.has(ref), `${claim.id}: dangling claim reference ${ref}`);
      if (claim.predicate === 'model_attributes_endorsement') check(claim.evidenceKind === 'synthetic_model_artifact', `${claim.id}: model attribution misclassified`);
    }
  }
  const schemaErrors = validateSchemaDefinition(snapshotSchema);
  errors.push(...schemaErrors.map(error => `snapshot schema: ${error}`));
  // Source link keys in authored JSON must resolve to a real card. This is deliberately
  // explicit: unrelated ID fields (entities, plans, tasks) are not card references.
  const sourceKeys = new Set(['sourceIds', 'supportingSourceIds', 'conflictingSourceIds', 'cardIds', 'allowedCardIds', 'supersedesCardIds']);
  function links(value, path) {
    if (Array.isArray(value)) { value.forEach((item, index) => links(item, `${path}[${index}]`)); return; }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (sourceKeys.has(key) && Array.isArray(child)) {
        for (const id of child) if (!idSet.has(id)) errors.push(`${path}.${key}: dangling card ${id}`);
      }
      links(child, `${path}.${key}`);
    }
  }
  links(world, 'world'); links(development, 'development'); links(withheld, 'withheld');
  return errors;
}

function reviewHtml(world, allocations, development, withheld, inputs) {
  const packets = allocations.packets.map(packet => `<tr><th scope="row">${htmlEscape(packet.agentId)}</th><td>${packet.cardIds.map(id => `<code>${htmlEscape(id)}</code>`).join(' ')}</td><td>${htmlEscape(packet.perspectiveInstructionId ?? '')}</td></tr>`).join('');
  const cards = world.cards.map(card => `<tr><th scope="row">${htmlEscape(card.id)}</th><td>${htmlEscape(card.version ?? '')}</td><td>${htmlEscape(card.title ?? card.label ?? '')}</td><td><details><summary>Inspect authored source record</summary><pre>${htmlEscape(JSON.stringify(card, null, 2))}</pre></details></td></tr>`).join('');
  const tasks = development.tasks.map(task => `<tr><th scope="row">${htmlEscape(task.id)}</th><td>${task.initialAccess ? 'initial access' : 'post-union only'}</td><td>${htmlEscape(task.scope ?? '')}</td><td>${htmlEscape(task.question ?? task.prompt ?? '')}</td></tr>`).join('');
  const publicInputNames = new Set(['design/world.json', 'design/allocations.json', 'design/development-tasks.json', 'design/snapshot.schema.json']);
  const inputRows = inputs.filter(item => publicInputNames.has(item.path)).map(item => `<tr><td><code>${htmlEscape(item.path)}</code></td><td>${item.bytes}</td><td><code>${item.sha256}</code></td></tr>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Looking Glass materials review</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:1100px;margin:auto;padding:2rem;color:#18233a;background:#f7f9fc}h1,h2{line-height:1.2}header{border-bottom:3px solid #243c64}table{border-collapse:collapse;width:100%;margin:1rem 0 2rem;background:white}th,td{padding:.6rem;border:1px solid #ccd3df;text-align:left;vertical-align:top}tr:nth-child(even){background:#f2f5fa}code{white-space:nowrap}pre{white-space:pre-wrap;overflow-wrap:anywhere}details{max-width:44rem}.scope{background:#fff4d8;border-left:4px solid #a36500;padding:1rem}a{color:#164f9d}</style><header><h1>Looking Glass · materials review</h1><p>World ${htmlEscape(world.worldId)} · cutoff ${htmlEscape(world.cutoffTick)} · candidate 002</p></header><p class="scope"><strong>Preparation only.</strong> These are authored synthetic sources and proposed future packets, not collected agent or human responses. This page does not establish readiness to enroll, comparison outcomes, or approval of Gate 14.</p><h2>Allocation</h2><p>Two common anchors (${anchorsText(allocations.sharedCardIds)}); four distinct private cards in each of four proposed six-card packets. Each anchor is one source even when shown in four packets.</p><table><thead><tr><th>Future packet</th><th>Card IDs</th><th>Perspective instruction</th></tr></thead><tbody>${packets}</tbody></table><h2>Source cards</h2><table><thead><tr><th>ID</th><th>Version</th><th>Title</th><th>Record</th></tr></thead><tbody>${cards}</tbody></table><h2>Development task references</h2><p>Withheld tasks and answers are researcher-only files and are not served by this preview.</p><table><thead><tr><th>ID</th><th>Access phase</th><th>Scope</th><th>Question</th></tr></thead><tbody>${tasks}</tbody></table><h2>Public source input hashes</h2><table><thead><tr><th>Design path</th><th>Bytes</th><th>SHA-256</th></tr></thead><tbody>${inputRows}</tbody></table><p>Inspect the generated JSON bundles and their SHA-256 manifests on disk for exact source and release boundaries.</p></html>`;
}
function anchorsText(ids) { return ids.map(id => `<code>${htmlEscape(id)}</code>`).join(', '); }

function load() {
  for (const name of required) assert(existsSync(join(design, name)), `Missing authored design/${name}`);
  const freeze = readJson(join(design, 'SOURCE_TASK_FREEZE.json'));
  for (const item of freeze.files) {
    const path = join(design, item.path.split('/').at(-1));
    const bytes = readFileSync(path);
    assert(bytes.length === item.bytes && sha256(bytes) === item.sha256, `Frozen source changed: ${item.path}`);
  }
  const fullFreeze = readJson(join(design, 'DESIGN_FREEZE.json'));
  for (const item of fullFreeze.files) {
    const path = join(design, item.path.split('/').at(-1));
    const bytes = readFileSync(path);
    assert(bytes.length === item.bytes && sha256(bytes) === item.sha256, `Frozen complete design changed: ${item.path}`);
  }
  const inputs = allFiles(design).map(path => ({ path: `design/${path}`, bytes: statSync(join(design, path)).size, sha256: sha256(readFileSync(join(design, path))) }));
  return {
    world: readJson(join(design, 'world.json')),
    allocations: readJson(join(design, 'allocations.json')),
    development: readJson(join(design, 'development-tasks.json')),
    withheld: readJson(join(design, 'withheld-tasks.json')),
    snapshotSchema: readJson(join(design, 'snapshot.schema.json')),
    executionPlan: readJson(join(design, 'execution-plan.json')),
    initialTemplate: readFileSync(join(design, 'PROMPT_TEMPLATES.md'), 'utf8'),
    inputs,
  };
}

function makeFiles(data) {
  const files = new Map();
  const add = (path, content) => { assert(!files.has(path), `duplicate output path ${path}`); files.set(path, content); };
  for (const relativePath of allFiles(design)) add(`research-team/design/${relativePath}`, readFileSync(join(design, relativePath)));
  for (const relativePath of allFiles(tooling)) add(`builder-tooling/${relativePath}`, readFileSync(join(tooling, relativePath)));
  const publicContract = ['PARTICIPANT_INSTRUCTIONS.md'];
  for (const name of publicContract) assert(existsSync(join(design, name)), `Missing participant-facing design/${name}`);
  for (const packet of data.allocations.packets) {
    const prefix = `participants/${packet.agentId}`;
    const ownIds = new Set(packet.cardIds);
    const participantWorld = {
      schemaVersion: data.world.schemaVersion,
      worldId: data.world.worldId,
      cutoffTick: data.world.cutoffTick,
      statusSemantics: data.world.statusSemantics,
      rules: data.world.rules,
      entities: data.world.entities,
      plans: data.world.plans,
      commonFieldBoundary: data.world.commonFieldBoundary,
      cards: data.world.cards.filter(card => ownIds.has(card.id)),
    };
    assert(participantWorld.cards.length === 6, `${packet.agentId}: filtered card count`);
    add(`${prefix}/world.json`, encoded(participantWorld));
    add(`${prefix}/allocation.json`, encoded({ schemaVersion: data.allocations.schemaVersion, worldId: data.allocations.worldId, sharedCardIds: data.allocations.sharedCardIds, packet }));
    add(`${prefix}/snapshot.schema.json`, readFileSync(join(design, 'snapshot.schema.json')));
    // Development material requires an explicit initial-access marker. The author
    // may leave private dev cases researcher-only without risking a union leak.
    const publicTasks = data.development.tasks.filter(task => task.initialAccess === true);
    add(`${prefix}/development-tasks.json`, encoded({ schemaVersion: data.development.schemaVersion, worldId: data.development.worldId, initialTaskIds: data.development.initialTaskIds, tasks: publicTasks }));
    for (const name of publicContract) add(`${prefix}/${name}`, readFileSync(join(design, name)));
    const initialSection = data.initialTemplate.split('## Initial snapshot\n')[1]?.split('\n## Union solver')[0]?.trim();
    assert(initialSection?.includes('{OWN_FILTERED_WORLD}') && initialSection.includes('{RUN_IDENTITY_AND_MANIFESTS}'), 'Authored initial prompt section missing required placeholders');
    add(`${prefix}/INITIAL_PROMPT_TEMPLATE.txt`, Buffer.from(`${initialSection}\n`));
    const proposal = data.executionPlan.modelProposal;
    const initialStage = data.executionPlan.stages.find(stage => stage.id === 'I');
    assert(data.executionPlan.status === 'PROPOSED_NOT_RATIFIED_NOT_EXECUTED' && initialStage?.calls === 4, 'Authored execution proposal/initial stage mismatch');
    assert(Array.isArray(proposal.tools) && proposal.tools.length === 0 && proposal.network === false, 'Authored initial proposal must disable tools/network');
    add(`${prefix}/proposed-run-settings.json`, encoded({ schemaVersion: 'initial-settings-proposal/1', status: data.executionPlan.status, agentId: packet.agentId, modelId: proposal.participantModelId, modelVersion: null, reasoningEffort: proposal.reasoningEffort, maxGeneratedTokens: initialStage.maxGeneratedTokensPerCall, minimumContextTokens: proposal.minimumContextTokens, tools: proposal.tools, network: proposal.network, actualSettingsMustBeFrozenAtFutureLaunch: true }));
    const inputFiles = new Map([...files].filter(([path]) => path.startsWith(prefix + '/')).map(([path, content]) => [path.slice(prefix.length + 1), content]));
    add(`${prefix}/input-manifest.json`, encoded({ schemaVersion: 'initial-input-manifest/1', agentId: packet.agentId, status: 'PROPOSED_NOT_EXECUTED', files: manifestFor(inputFiles) }));
  }
  // Transfer is a separate, phase-bound researcher resource. No initial packet
  // path includes it; future release must follow the authored freeze policy.
  add('transfer-phase-bound/withheld-tasks.json', readFileSync(join(design, 'withheld-tasks.json')));
  add('transfer-phase-bound/RELEASE_RULE.txt', Buffer.from(`${data.withheld.releasePolicy}\nNo materials are released or research records collected by this package.\n`));
  add('review/index.html', Buffer.from(reviewHtml(data.world, data.allocations, data.development, data.withheld, data.inputs)));
  for (const prefix of ['research-team/', 'transfer-phase-bound/', ...data.allocations.packets.map(packet => `participants/${packet.agentId}/`)]) {
    const sub = new Map([...files].filter(([path]) => path.startsWith(prefix)).map(([path, content]) => [path.slice(prefix.length), content]));
    add(`${prefix}MANIFEST.json`, encoded({ schemaVersion: 'materials-package-manifest-v1', files: manifestFor(sub) }));
  }
  add('MANIFEST.json', encoded({ schemaVersion: 'materials-package-manifest-v1', scope: 'preparation-only', inputs: data.inputs, files: manifestFor(files) }));
  return files;
}

function verifyCandidate(files) {
  const errors = [];
  for (const [path, expected] of files) {
    const actualPath = join(candidate, path);
    if (!existsSync(actualPath)) { errors.push(`${path}: missing`); continue; }
    if (!readFileSync(actualPath).equals(Buffer.isBuffer(expected) ? expected : Buffer.from(expected))) errors.push(`${path}: deterministic bytes differ`);
  }
  const actualPaths = allFiles(candidate);
  for (const path of actualPaths) if (!files.has(path)) errors.push(`${path}: unexpected output`);
  const manifest = readJson(join(candidate, 'MANIFEST.json'));
  errors.push(...verifyFiles(candidate, manifest.files));
  const allocations = readJson(join(design, 'allocations.json'));
  const world = readJson(join(design, 'world.json'));
  const withheld = readJson(join(design, 'withheld-tasks.json'));
  const allowedNames = new Set(['world.json', 'allocation.json', 'development-tasks.json', 'snapshot.schema.json', 'PARTICIPANT_INSTRUCTIONS.md', 'INITIAL_PROMPT_TEMPLATE.txt', 'proposed-run-settings.json', 'input-manifest.json', 'MANIFEST.json']);
  for (const packet of allocations.packets) {
    const prefix = `participants/${packet.agentId}/`;
    const paths = actualPaths.filter(path => path.startsWith(prefix));
    if (paths.length !== allowedNames.size || paths.some(path => !allowedNames.has(path.slice(prefix.length)))) errors.push(`${packet.agentId}: participant file allowlist violation`);
    const participantWorld = readJson(join(candidate, prefix, 'world.json'));
    if (JSON.stringify(participantWorld.cards.map(card => card.id)) !== JSON.stringify(world.cards.filter(card => packet.cardIds.includes(card.id)).map(card => card.id))) errors.push(`${packet.agentId}: card filter mismatch`);
    const combined = Buffer.concat(paths.map(path => readFileSync(join(candidate, path)))).toString('utf8');
    for (const card of world.cards.filter(card => !packet.cardIds.includes(card.id))) {
      if (combined.includes(`"${card.id}"`)) errors.push(`${packet.agentId}: peer card ID ${card.id} leaked`);
      for (const claim of card.claims ?? []) if (combined.includes(claim.id)) errors.push(`${packet.agentId}: peer claim ${claim.id} leaked`);
    }
    for (const context of withheld.contexts) {
      if (combined.includes(`"${context.id}"`)) errors.push(`${packet.agentId}: withheld context ID ${context.id} leaked`);
      for (const fact of context.facts ?? []) if (combined.includes(fact.id)) errors.push(`${packet.agentId}: withheld fact ${fact.id} leaked`);
    }
    const tasks = readJson(join(candidate, prefix, 'development-tasks.json'));
    if (tasks.tasks.some(task => task.initialAccess !== true)) errors.push(`${packet.agentId}: non-initial development task leaked`);
    if (combined.includes('AUTHOR_ANSWER_KEY.json') || combined.includes('withheld-tasks.json') || combined.includes('DESIGN_CONTRACT.md') || combined.includes('PROMPT_TEMPLATES.md')) errors.push(`${packet.agentId}: researcher-only filename leaked`);
    const inputManifest = readJson(join(candidate, prefix, 'input-manifest.json'));
    errors.push(...verifyFiles(join(candidate, prefix), inputManifest.files).map(error => `${packet.agentId}: ${error}`));
  }
  return errors;
}

function main() {
  const mode = process.argv[2] ?? 'build';
  assert(['check', 'build', 'verify'].includes(mode), 'Usage: node build-package.mjs check|build|verify');
  const data = load();
  const errors = validateDesign(data);
  if (errors.length) fail(`Design validation failed:\n${errors.join('\n')}`);
  if (mode === 'check') {
    const expected = makeFiles(data);
    process.stdout.write(`source/design and in-memory package check passed: ${data.world.cards.length} cards, ${data.allocations.packets.length} packets, ${data.development.initialTaskIds.length} initial tasks, ${expected.size} output files; both authored freezes matched\n`);
    return;
  }
  const files = makeFiles(data);
  if (mode === 'build') writeNewDirectory(candidate, files);
  const verification = verifyCandidate(files);
  if (verification.length) fail(`Candidate verification failed:\n${verification.join('\n')}`);
  process.stdout.write(`${mode} passed: ${files.size} files; 18 cards; four six-card participant packets; candidate ${relative(base, candidate)}\n`);
}
if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) main();
