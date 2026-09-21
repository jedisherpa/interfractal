import type { Allocation, ChapterId, Command, Commitment, ConditionEvidence, Context, CreateGameOptions, Envelope, GameEvent, GameState, Goal, Id, LearningSupport, Lens, Mode, PlanItem, Player, PrivateNote, ProjectClaim, Proposal, Result, ScenarioId, Support, Threshold } from './types.ts';
import { CHAPTERS, festivalSeed, KITCHEN_DRAFT, learningCommunitySeed, resolveCreateOptions, SCENARIO_IDS } from './scenarios.ts';

/** Pure WeOpoly playtest kernel. Identity authentication belongs to the room transport. */
export const BASE_CAPACITY = 4;
const PHASES = ['PLAY', 'COORDINATE', 'ACT'];
const MODES = ['practice', 'sandbox', 'group'];
const idOK = (x: unknown): x is string => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(x);
const textOK = (x: unknown, max = 2000): x is string => typeof x === 'string' && x.trim().length > 0 && x.length <= max;
const integer = (x: unknown, min = 0, max = 1_000_000): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= min && x <= max;
const finite = (x: unknown, min: number, max: number): x is number => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const timestamp = (x: unknown): x is string => typeof x === 'string' && x.length <= 40 && /^\d{4}-\d{2}-\d{2}T/.test(x) && Number.isFinite(Date.parse(x));
const object = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x);
const keysOnly = (value: object, allowed: string[]) => Reflect.ownKeys(value).every((key) => typeof key === 'string' && allowed.includes(key));
const unique = <T>(values: T[]) => new Set(values).size === values.length;
const norm = (value: string) => value.trim().toLocaleLowerCase('en-US');
const listOK = (x: unknown, min = 0, max = 32): x is string[] => Array.isArray(x) && x.length >= min && x.length <= max && x.every((v) => textOK(v, 200)) && unique(x.map(norm));
const idsOK = (x: unknown, min = 0, max = 32): x is string[] => Array.isArray(x) && x.length >= min && x.length <= max && x.every(idOK) && unique(x);
const player = (s: GameState, id: Id) => s.players.find((p) => p.id === id);
const lens = (s: GameState, id: Id) => s.lenses.find((l) => l.id === id);
const support = (s: GameState, id?: Id) => s.supports.find((item) => item.id === id);
const liveCommitment = (c: Commitment) => c.status === 'accepted';
function unsupervisedLearning(state: GameState, work: Commitment): boolean {
  if (work.workKind !== 'learning' || !liveCommitment(work)) return false;
  return !state.learningSupports.some((s) => s.commitmentId === work.id && s.learnerId === work.ownerId && s.status === 'accepted');
}
function applyEndangered(state: GameState, work: Commitment): void {
  if (!liveCommitment(work) && work.status !== 'failed') return;
  const ownerActive = !!player(state, work.ownerId)?.active;
  const tribeEndangered = !!work.supportId && support(state, work.supportId)?.status !== 'active';
  work.endangered = !ownerActive || tribeEndangered || unsupervisedLearning(state, work);
}
const activeAllocations = (s: GameState, playerId?: Id) => s.allocations.filter((a) => a.status === 'active' && (!playerId || a.playerId === playerId));

export function capacityFor(state: GameState, playerId: Id): number {
  if (!player(state, playerId)?.active) return 0;
  return BASE_CAPACITY + state.supports.filter((s) => s.beneficiaryId === playerId && s.status === 'active').length * state.config.tribeMultiplier;
}

/** Effort is a separate budget. Support changes allocations, never effort units. */
export function activeEffort(state: GameState, playerId: Id): number {
  return state.commitments.filter((c) => c.ownerId === playerId && liveCommitment(c)).reduce((sum, c) => sum + c.effort, 0);
}

function unreportedMisses(state: GameState, playerId: Id): Commitment[] {
  return state.commitments.filter((c) => c.ownerId === playerId && liveCommitment(c) && c.dueRound < state.round && !c.transferTo && !state.outcomes.some((o) => o.commitmentId === c.id));
}

export function eligibleForSupport(state: GameState, playerId: Id): boolean {
  const p = player(state, playerId);
  if (!p?.active) return false;
  const actual = derivedReliability(state, playerId);
  return Object.keys(actual).every((key) => actual[key as keyof Player['reliability']] === p.reliability[key as keyof Player['reliability']]) && actual.completed >= state.config.reliabilityCompletions && actual.responses >= state.config.reliabilityResponses && actual.hiddenMisses === 0 && activeEffort(state, playerId) <= p.effortBudget;
}

function adviceActors(state: GameState, p: Proposal): Id[] {
  return [...new Set([...p.affectedLensIds, ...p.expertLensIds].map((id) => lens(state, id)!.playerId))];
}

function relevantOpenProposals(state: GameState, c: Commitment): Proposal[] {
  // A new owner/Lens does not erase the responsibility's former impact scope.
  // Transfer events retain every previous Lens so repeated transfers preserve lineage.
  const scope = new Set([c.lensId, ...state.events.filter((e) => e.type === 'ACCEPT_TRANSFER' && e.payload.commitmentId === c.id).map((e) => e.payload.previousLensId).filter((id): id is string => typeof id === 'string')]);
  const linked = new Set([c.proposalId, ...state.events.filter((e) => ['PROPOSE', 'PROPOSE_COMMITMENT'].includes(e.type) && e.payload.commitmentId === c.id).map((e) => e.payload.proposalId).filter((id): id is string => typeof id === 'string')]);
  return state.proposals.filter((p) => p.status === 'open' && (linked.has(p.id) || (p.goalId === c.goalId && p.affectedLensIds.some((id) => scope.has(id)))));
}

function dependencyCycle(state: Pick<GameState, 'dependencies'>): Id[] {
  const edges = state.dependencies;
  const visiting = new Set<Id>();
  const done = new Set<Id>();
  let cycle: Id[] = [];
  const visit = (id: Id, path: Id[]): void => {
    if (cycle.length || done.has(id)) return;
    if (visiting.has(id)) { cycle = [...path.slice(path.indexOf(id)), id]; return; }
    visiting.add(id);
    for (const d of edges.filter((d) => d.from === id)) visit(d.to, [...path, id]);
    visiting.delete(id); done.add(id);
  };
  for (const d of edges) visit(d.from, []);
  return cycle;
}

function supportCycle(state: Pick<GameState, 'supports'>): boolean {
  const edges = state.supports.filter((s) => s.status !== 'withdrawn').flatMap((s) => s.members.filter((id) => id !== s.beneficiaryId).map((id) => ({ id: `${s.id}:${id}`, from: s.beneficiaryId, to: id })));
  return dependencyCycle({ dependencies: edges }).length > 0;
}

/** Each distinct need must be matched by a different triangular contribution. */
function matchNeeds(state: GameState, goal: Goal, allocations: Allocation[]): string[] {
  let best: string[] = [];
  const visit = (index: number, used: Set<number>, matched: string[]) => {
    if (matched.length > best.length) best = matched;
    if (index >= goal.needs.length) return;
    const need = goal.needs[index];
    visit(index + 1, used, matched);
    allocations.forEach((a, i) => {
      if (!used.has(i) && lens(state, a.lensId)?.perspectives.some((p) => norm(p) === norm(need))) visit(index + 1, new Set([...used, i]), [...matched, need]);
    });
  };
  visit(0, new Set(), []);
  return goal.needs.filter((need) => !best.includes(need));
}

export function goalStatus(state: GameState, goalId: Id): { covered: boolean; coherent: boolean; ready: boolean; activated: boolean; missing: string[]; blockedBy: string[] } {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) return { covered: false, coherent: false, ready: false, activated: false, missing: ['Unknown goal'], blockedBy: [goalId] };
  const allocations = activeAllocations(state).filter((a) => a.goalId === goalId);
  const covered = new Set(allocations.map((a) => a.slot)).size === 4;
  const missing = matchNeeds(state, goal, allocations);
  // Four different people is a transparent Festival playtest rule, not a universal Lens taxonomy.
  const coherent = covered && missing.length === 0 && new Set(allocations.map((a) => a.playerId)).size === 4;
  const blockedBy = state.dependencies.filter((d) => d.to === goalId && !state.goals.find((g) => g.id === d.from)?.activated).map((d) => d.from);
  const commitments = state.commitments.filter((c) => c.goalId === goalId && liveCommitment(c));
  const actionable = commitments.some((c) => !c.endangered && relevantOpenProposals(state, c).length === 0 && activeEffort(state, c.ownerId) <= player(state, c.ownerId)!.effortBudget);
  return { covered, coherent, ready: coherent && !blockedBy.length && actionable, activated: goal.activated, missing, blockedBy };
}

export function goalsInChapter(state: GameState): Goal[] {
  if (state.scenario.id !== 'learning-community') return state.goals;
  return state.goals.filter((g) => (g.chapter ?? state.scenario.chapter) === state.scenario.chapter);
}

export function countedConditions(state: GameState, goalId: Id) {
  return state.conditions.filter((c) => c.goalId === goalId && c.id !== 'cond-launch-blocked');
}

export function evaluateSystem(state: GameState): PlanItem[] {
  const plan: PlanItem[] = [];
  const visible = new Set(goalsInChapter(state).map((g) => g.id));
  for (const p of state.proposals.filter((p) => p.status === 'open')) {
    if (!visible.has(p.goalId)) continue;
    const waiting = adviceActors(state, p).filter((id) => !state.advice.some((a) => a.proposalId === p.id && a.actorId === id));
    plan.push({ id: `plan:advice:${p.id}`, kind: 'advice', title: waiting.length ? 'Advice still needed' : 'Responsible decision still needed', reason: waiting.length ? `${p.title}: ${waiting.map((id) => player(state, id)!.name).join(', ')} can contribute their own advice.` : `${p.title}: the owner must record a separate decision. Advice is not a vote.`, playerIds: [...new Set([p.ownerId, ...waiting])], goalId: p.goalId, sourceId: p.id, blocking: true });
  }
  for (const t of state.thresholds.filter((t) => t.status === 'open')) {
    if (t.goalId && !visible.has(t.goalId)) continue;
    plan.push({ id: `plan:threshold:${t.id}`, kind: t.kind === 'governance' ? 'governance' : 'threshold', title: t.kind === 'relational' ? 'Relational Threshold' : t.kind === 'support' ? 'Support repair' : t.kind === 'governance' ? 'Governance requested' : 'Expansion Threshold', reason: t.title, playerIds: [t.playerId], ...(t.goalId ? { goalId: t.goalId } : {}), sourceId: t.id, blocking: t.kind === 'expansion' || t.kind === 'support' });
  }
  for (const g of goalsInChapter(state)) {
    const status = goalStatus(state, g.id);
    const entries = activeAllocations(state).filter((a) => a.goalId === g.id);
    if (!status.covered) plan.push({ id: `plan:staffing:${g.id}`, kind: 'staffing', title: entries.length ? 'Open contribution edges' : 'No contributors yet', reason: `${g.name} has ${entries.length}/4 edges staffed. Missing perspectives: ${status.missing.join(', ') || 'additional distinct contributors'}.`, playerIds: [...new Set(entries.map((a) => a.playerId))], goalId: g.id, sourceId: g.id, blocking: false });
    else if (!status.coherent) plan.push({ id: `plan:overlap:${g.id}`, kind: 'overlap', title: 'Full edges, incomplete complementarity', reason: `${g.name} needs four people and separate contributions matching its needs. Missing: ${status.missing.join(', ') || 'distinct participants'}.`, playerIds: [...new Set(entries.map((a) => a.playerId))], goalId: g.id, sourceId: g.id, blocking: false });
    for (const upstream of status.blockedBy) {
      const d = state.dependencies.find((d) => d.from === upstream && d.to === g.id)!;
      plan.push({ id: `plan:dependency:${d.id}`, kind: 'dependency', title: 'Prerequisite not activated', reason: `${g.name} awaits evidenced activation of ${state.goals.find((g) => g.id === upstream)!.name}.`, playerIds: [], goalId: g.id, sourceId: d.id, blocking: true });
    }
  }
  const cycle = dependencyCycle(state);
  if (cycle.length) plan.push({ id: 'plan:dependency:cycle', kind: 'dependency', title: 'Dependency cycle', reason: cycle.join(' → '), playerIds: [], sourceId: state.dependencies.find((d) => d.from === cycle[0])!.id, blocking: true });
  for (const c of state.commitments.filter((c) => liveCommitment(c) && c.dueRound < state.round && visible.has(c.goalId))) plan.push({ id: `plan:overdue:${c.id}`, kind: 'overdue', title: 'Commitment is overdue', reason: `${c.title} was due in round ${c.dueRound}; its owner can report, withdraw, or offer transfer.`, playerIds: [c.ownerId], goalId: c.goalId, sourceId: c.id, blocking: false });
  for (const p of state.players.filter((p) => p.active && p.attentionGoalId && visible.has(p.attentionGoalId))) {
    if (!activeAllocations(state, p.id).some((a) => a.goalId === p.attentionGoalId)) plan.push({ id: `plan:attention:${p.id}`, kind: 'attention', title: 'Focus and involvement differ', reason: `${p.name}'s primary focus has no current Lens contribution. This is an invitation to inspect, not an obligation to volunteer.`, playerIds: [p.id], goalId: p.attentionGoalId!, sourceId: p.id, blocking: false });
  }
  for (const s of state.learningSupports.filter((s) => s.status === 'requested' || s.status === 'endangered')) {
    const work = state.commitments.find((c) => c.id === s.commitmentId);
    if (work && !visible.has(work.goalId)) continue;
    plan.push({ id: `plan:supervision:${s.id}`, kind: 'supervision', title: s.status === 'endangered' ? 'Required supervision is endangered' : 'Named supervisor has not accepted', reason: s.status === 'endangered' ? 'Losing the required supervisor makes this learning work unready. The beginner is not auto-qualified.' : 'Wanting to help does not satisfy the experienced-supervision requirement.', playerIds: [s.learnerId, s.supervisorId], goalId: work?.goalId, sourceId: s.id, blocking: true });
  }
  if (state.scenario.id === 'learning-community' && state.scenario.chapter === 'organize') {
    const launchGate = state.conditions.find((c) => c.id === 'cond-launch-blocked');
    const launchPrereqs = ['cond-place-permission', 'cond-faculty-accept', 'cond-agreements-visible', 'cond-operation-coverage'].every((id) => {
      const item = state.conditions.find((c) => c.id === id);
      return !!item && conditionAccepted(state, item);
    });
    if (launchGate && !launchPrereqs) {
      plan.push({ id: 'plan:readiness:launch', kind: 'readiness', title: 'Launch remains unconfirmed', reason: 'A green board is not permission to recruit people. Completed simulation conditions may unlock a fictional chapter celebration only.', playerIds: [], goalId: 'g-enroll', sourceId: launchGate.id, blocking: false });
    }
  }
  return plan;
}

function evidenceFor(state: GameState, commitmentId: Id) {
  const all = state.outcomes.filter((o) => o.commitmentId === commitmentId && o.appliedRound !== undefined);
  return all.findLast((o) => !all.some((later) => later.corrects === o.id));
}

function derivedReliability(state: GameState, playerId: Id): Player['reliability'] {
  const effective = state.commitments.filter((c) => c.ownerId === playerId).map((c) => evidenceFor(state, c.id));
  return {
    completed: effective.filter((o) => o?.result === 'completed').length,
    communicatedMisses: effective.filter((o) => o?.result === 'failed').length,
    hiddenMisses: unreportedMisses(state, playerId).length,
    responses: state.advice.filter((a) => a.actorId === playerId).length + state.decisions.filter((d) => d.actorId === playerId).length,
    surfaced: state.events.filter((e) => e.actorId === playerId && e.type === 'SURFACE_THRESHOLD').length,
    overcommits: state.events.filter((e) => e.actorId === playerId && e.type === 'ACCEPT_COMMITMENT' && e.payload.overcommitted === true).length,
  };
}

function conditionAccepted(state: GameState, condition: { id: Id; status: string }): boolean {
  if (condition.status !== 'accepted') return false;
  const all = state.conditionEvidence.filter((e) => e.conditionId === condition.id);
  const latest = all.findLast((e) => !all.some((later) => later.corrects === e.id));
  return latest?.status === 'accepted';
}

/** Activation is supported by effective, applied evidence and the complete dependency chain. */
function expectedActivation(state: GameState): Map<Id, boolean> {
  const result = new Map<Id, boolean>();
  for (const g of state.goals) result.set(g.id, false);
  for (let pass = 0; pass < state.goals.length; pass++) {
    for (const g of state.goals) {
      const named = state.scenario.progressPolicy === 'named-conditions' ? state.conditions.filter((c) => c.goalId === g.id && c.id !== 'cond-launch-blocked') : [];
      const hasEvidence = named.length
        ? named.every((c) => conditionAccepted(state, c))
        : state.commitments.some((c) => c.goalId === g.id && evidenceFor(state, c.id)?.result === 'completed');
      const coherent = goalStatus(state, g.id).coherent;
      const prerequisites = state.dependencies.filter((d) => d.to === g.id).every((d) => result.get(d.from));
      result.set(g.id, coherent && hasEvidence && prerequisites);
    }
  }
  return result;
}

function namedConditionProgress(state: GameState, goalId: Id): number {
  const conditions = countedConditions(state, goalId);
  if (!conditions.length) return 0;
  const met = conditions.filter((c) => c.status === 'accepted').length;
  return Math.min(100, Math.round((met / conditions.length) * 100));
}

function refreshProgress(state: GameState): void {
  for (const g of state.goals) {
    if (state.scenario.progressPolicy === 'named-conditions') g.progress = namedConditionProgress(state, g.id);
    else g.progress = Math.min(100, state.commitments.filter((c) => c.goalId === g.id && evidenceFor(state, c.id)?.result === 'completed').length * 25);
  }
  const activated = expectedActivation(state);
  for (const g of state.goals) g.activated = activated.get(g.id) ?? false;
}

export function createGame(mode: Mode = 'practice', options: CreateGameOptions = {}): GameState {
  if (!MODES.includes(mode)) throw new Error('Unknown game mode');
  const { scenarioId, chapter } = resolveCreateOptions(mode, options);
  const seed = scenarioId === 'festival' ? festivalSeed(mode) : learningCommunitySeed(mode, chapter);
  const state: GameState = {
    version: 2, id: `weopoly-${mode}-${scenarioId}-v2`, revision: 0, mode, round: 1, phase: 'PLAY',
    scenario: seed.scenario, players: seed.players, lenses: seed.lenses, goals: seed.goals,
    allocations: seed.allocations, commitments: seed.commitments, supports: [], proposals: [], advice: [],
    decisions: [], thresholds: [], outcomes: seed.outcomes, dependencies: seed.dependencies,
    readyPlayerIds: [], plan: [], events: seed.events, lastReturn: null,
    config: { tribeMultiplier: 4, reliabilityCompletions: 1, reliabilityResponses: 1 }, processedCommands: [],
    claims: seed.claims, conditions: seed.conditions, conditionEvidence: [], learningSupports: [], aiDrafts: [], privateNotes: [],
  };
  if (mode !== 'group') refreshProgress(state);
  state.plan = evaluateSystem(state);
  return state;
}

const STATE_KEYS = ['version', 'id', 'revision', 'mode', 'round', 'phase', 'scenario', 'players', 'lenses', 'goals', 'allocations', 'commitments', 'supports', 'proposals', 'advice', 'decisions', 'thresholds', 'outcomes', 'dependencies', 'readyPlayerIds', 'plan', 'events', 'lastReturn', 'config', 'processedCommands', 'claims', 'conditions', 'conditionEvidence', 'learningSupports', 'aiDrafts', 'privateNotes'];

export function migrateGameState(value: unknown): GameState | { error: string } {
  if (!object(value)) return { error: 'state must be an object' };
  if (value.version !== 2) return { error: 'unsupported or future state version' };
  if (value.scenario === undefined) {
    const migrated = {
      ...value,
      scenario: { id: 'festival', version: 1, chapter: 'festival', projectId: 'festival-highland-lake', timezone: 'America/New_York', progressPolicy: 'festival-increments' },
      claims: [], conditions: [], conditionEvidence: [], learningSupports: [], aiDrafts: [], privateNotes: [],
      goals: Array.isArray(value.goals) ? (value.goals as Goal[]).map((g) => ({ ...g, chapter: g.chapter ?? 'festival' })) : value.goals,
    };
    const errors = validateState(migrated as unknown as GameState);
    if (errors.length) return { error: errors.slice(0, 8).join('; ') };
    return migrated as unknown as GameState;
  }
  const errors = validateState(value as unknown as GameState);
  if (errors.length) return { error: errors.slice(0, 8).join('; ') };
  return value as unknown as GameState;
}

/** Runtime validation also defends save imports and untyped room payloads. */
export function validateState(value: GameState): string[] {
  try { return validateStateInner(value); }
  catch { return ['malformed state fields or cyclic data']; }
}

function validateStateInner(value: GameState): string[] {
  const errors: string[] = [];
  const s = value as unknown as Record<string, unknown>;
  if (!object(s)) return ['state must be an object'];
  const check = (condition: unknown, message: string) => { if (!condition) errors.push(message); };
  check(jsonSafe(s, new Set(), true), 'state contains data that cannot be safely serialized as JSON');
  check(keysOnly(s, STATE_KEYS), 'unknown state field');
  check(s.version === 2, 'unsupported state version'); check(idOK(s.id), 'invalid state id'); check(integer(s.revision), 'invalid revision'); check(integer(s.round, 1), 'invalid round'); check(PHASES.includes(s.phase as string), 'invalid phase'); check(MODES.includes(s.mode as string), 'invalid mode');
  const scenario = object(s.scenario) ? s.scenario : null;
  check(scenario && SCENARIO_IDS.includes(scenario.id as ScenarioId) && scenario.version === 1 && CHAPTERS.includes(scenario.chapter as ChapterId) && idOK(scenario.projectId) && textOK(scenario.timezone, 80) && ['festival-increments', 'named-conditions'].includes(scenario.progressPolicy as string) && keysOnly(scenario, ['id', 'version', 'chapter', 'projectId', 'timezone', 'progressPolicy']), 'invalid scenario identity');
  check(!!scenario && (scenario.id === 'festival') === (scenario.chapter === 'festival'), 'scenario chapter mismatch');
  const collectionKeys = ['players', 'lenses', 'goals', 'allocations', 'commitments', 'supports', 'proposals', 'advice', 'decisions', 'thresholds', 'outcomes', 'dependencies', 'plan', 'events', 'processedCommands', 'claims', 'conditions', 'conditionEvidence', 'learningSupports', 'aiDrafts', 'privateNotes'];
  for (const key of collectionKeys) check(Array.isArray(s[key]) && (s[key] as unknown[]).every(object), `${key} must contain objects`);
  check(idsOK(s.readyPlayerIds, 0, 100), 'invalid ready player ids');
  check(object(s.config) && integer(s.config.tribeMultiplier, 1, 16) && integer(s.config.reliabilityCompletions, 0, 1000) && integer(s.config.reliabilityResponses, 0, 1000), 'invalid support configuration');
  if (errors.length) return errors;
  const state = value;
  const fields: Record<string, string[]> = {
    players: ['id', 'name', 'color', 'active', 'attentionGoalId', 'effortBudget', 'reliability'],
    lenses: ['id', 'playerId', 'title', 'vision', 'territory', 'duties', 'perspectives', 'resources', 'supportId', 'history'],
    goals: ['id', 'name', 'description', 'x', 'z', 'needs', 'required', 'progress', 'activated', 'chapter'],
    allocations: ['id', 'playerId', 'lensId', 'goalId', 'slot', 'status', 'supportId'],
    commitments: ['id', 'ownerId', 'lensId', 'goalId', 'title', 'effort', 'dueRound', 'status', 'supportId', 'proposalId', 'endangered', 'transferTo', 'acceptedAt', 'workKind', 'dueAt', 'learningSupportId'],
    claims: ['id', 'goalId', 'title', 'detail', 'status', 'sourceRef', 'responsibleId', 'evidence', 'unresolved', 'simulated', 'kind'],
    conditions: ['id', 'goalId', 'title', 'evidenceRequired', 'reviewerId', 'status'],
    conditionEvidence: ['id', 'conditionId', 'actorId', 'summary', 'category', 'simulated', 'at', 'status', 'corrects', 'acceptedBy'],
    learningSupports: ['id', 'learnerId', 'commitmentId', 'requestedLevel', 'supervisorId', 'acceptedBy', 'evidenceRequired', 'status'],
    aiDrafts: ['id', 'actorId', 'goalId', 'title', 'body', 'at', 'source', 'labeledDraft'],
    privateNotes: ['id', 'ownerId', 'text', 'visibility'],
    supports: ['id', 'beneficiaryId', 'face', 'members', 'acceptedBy', 'duty', 'status', 'createdAt'],
    proposals: ['id', 'ownerId', 'goalId', 'kind', 'title', 'reason', 'affectedLensIds', 'expertLensIds', 'status'],
    advice: ['id', 'proposalId', 'actorId', 'note', 'at', 'simulated', 'stance'],
    decisions: ['id', 'proposalId', 'actorId', 'text', 'at', 'simulated', 'adviceIds'],
    thresholds: ['id', 'playerId', 'goalId', 'kind', 'title', 'status', 'visibility', 'resolution'],
    outcomes: ['id', 'commitmentId', 'actorId', 'result', 'evidence', 'at', 'simulated', 'appliedRound', 'corrects'],
    dependencies: ['id', 'from', 'to'],
    plan: ['id', 'kind', 'title', 'reason', 'playerIds', 'goalId', 'sourceId', 'blocking'],
    events: ['id', 'type', 'actorId', 'at', 'simulated', 'payload'],
    processedCommands: ['id', 'actorId', 'fingerprint'],
  };
  for (const key of collectionKeys) for (const item of s[key] as Record<string, unknown>[]) check(keysOnly(item, fields[key]), `unknown ${key} field ${String(item.id)}`);
  check(keysOnly(state.config, ['tribeMultiplier', 'reliabilityCompletions', 'reliabilityResponses']), 'unknown configuration field');
  const allIds = new Set<string>();
  for (const key of collectionKeys.filter((k) => k !== 'processedCommands')) for (const item of s[key] as Record<string, unknown>[]) {
    check(idOK(item.id), `invalid ${key} id`);
    check(!allIds.has(item.id as string), `duplicate entity id ${String(item.id)}`); allIds.add(item.id as string);
  }
  const refs = (key: 'players' | 'lenses' | 'goals' | 'commitments' | 'supports' | 'proposals' | 'thresholds' | 'outcomes', id: unknown) => idOK(id) && state[key].some((v) => v.id === id);
  for (const p of state.players) {
    check(textOK(p.name, 80) && /^#[0-9a-fA-F]{6}$/.test(p.color) && typeof p.active === 'boolean', `invalid player ${p.id}`);
    check(p.attentionGoalId === null || refs('goals', p.attentionGoalId), `missing attention goal ${p.id}`);
    check(finite(p.effortBudget, 1, 100), `invalid effort budget ${p.id}`);
    check(object(p.reliability) && keysOnly(p.reliability, ['completed', 'communicatedMisses', 'hiddenMisses', 'responses', 'surfaced', 'overcommits']) && ['completed', 'communicatedMisses', 'hiddenMisses', 'responses', 'surfaced', 'overcommits'].every((k) => integer((p.reliability as unknown as Record<string, unknown>)[k])), `invalid reliability ${p.id}`);
  }
  for (const l of state.lenses) {
    check(refs('players', l.playerId), `missing lens owner ${l.id}`); check(textOK(l.title, 160) && textOK(l.vision) && textOK(l.territory) && textOK(l.duties) && listOK(l.perspectives, 1, 16) && listOK(l.resources), `invalid lens fields ${l.id}`);
    check(l.history === undefined || (Array.isArray(l.history) && l.history.length <= 20 && l.history.every((h) => textOK(h.title, 160) && textOK(h.vision) && textOK(h.territory) && textOK(h.duties) && listOK(h.perspectives, 1, 16) && timestamp(h.at))), `invalid lens history ${l.id}`);
    check(l.supportId === undefined || (refs('supports', l.supportId) && support(state, l.supportId)?.beneficiaryId === l.playerId), `invalid lens support ${l.id}`);
  }
  for (const g of state.goals) check(textOK(g.name, 160) && textOK(g.description) && finite(g.x, -10000, 10000) && finite(g.z, -10000, 10000) && listOK(g.needs, 1, 4) && finite(g.progress, 0, 100) && typeof g.activated === 'boolean' && typeof g.required === 'boolean' && (g.chapter === undefined || CHAPTERS.includes(g.chapter)), `invalid goal ${g.id}`);
  for (const a of state.allocations) {
    check(refs('players', a.playerId) && refs('lenses', a.lensId) && refs('goals', a.goalId), `missing allocation reference ${a.id}`);
    check(lens(state, a.lensId)?.playerId === a.playerId, `allocation ownership mismatch ${a.id}`); check(integer(a.slot, 0, 3) && ['active', 'endangered'].includes(a.status), `invalid allocation ${a.id}`);
    check(a.supportId === undefined || (refs('supports', a.supportId) && support(state, a.supportId)?.beneficiaryId === a.playerId), `invalid allocation support ${a.id}`);
    if (a.status === 'active') check(player(state, a.playerId)?.active && (!a.supportId || support(state, a.supportId)?.status === 'active') && (!lens(state, a.lensId)?.supportId || support(state, lens(state, a.lensId)?.supportId)?.status === 'active'), `unsupported active allocation ${a.id}`);
  }
  const active = activeAllocations(state);
  check(unique(active.map((a) => a.lensId)), 'one lens has multiple active allocations'); check(unique(active.map((a) => `${a.goalId}:${a.slot}`)), 'two active allocations share a goal edge');
  for (const p of state.players) {
    const own = active.filter((a) => a.playerId === p.id);
    check(own.length <= capacityFor(state, p.id), `allocation capacity exceeded ${p.id}`);
    check(own.filter((a) => !a.supportId).length <= BASE_CAPACITY, `base allocation capacity exceeded ${p.id}`);
    for (const agreement of state.supports.filter((s) => s.beneficiaryId === p.id)) check(own.filter((a) => a.supportId === agreement.id).length <= state.config.tribeMultiplier, `support allocation capacity exceeded ${agreement.id}`);
  }
  for (const c of state.commitments) {
    check(refs('players', c.ownerId) && refs('lenses', c.lensId) && refs('goals', c.goalId), `missing commitment reference ${c.id}`);
    check(lens(state, c.lensId)?.playerId === c.ownerId, `commitment ownership mismatch ${c.id}`);
    check(textOK(c.title) && finite(c.effort, Number.MIN_VALUE, 100) && integer(c.dueRound, 1) && ['proposed', 'accepted', 'completed', 'failed', 'withdrawn'].includes(c.status) && typeof c.endangered === 'boolean', `invalid commitment ${c.id}`);
    check(c.acceptedAt === undefined || timestamp(c.acceptedAt), `invalid acceptance time ${c.id}`); check(c.status === 'proposed' || !!c.acceptedAt || c.status === 'withdrawn', `missing acceptance ${c.id}`);
    check(c.workKind === undefined || ['learning', 'operating', 'review'].includes(c.workKind), `invalid work kind ${c.id}`);
    check(c.dueAt === undefined || timestamp(c.dueAt), `invalid due date ${c.id}`);
    check(c.learningSupportId === undefined || state.learningSupports.some((s) => s.id === c.learningSupportId && s.commitmentId === c.id), `invalid learning support on commitment ${c.id}`);
    check(c.supportId === undefined || (refs('supports', c.supportId) && support(state, c.supportId)?.beneficiaryId === c.ownerId), `invalid commitment support ${c.id}`);
    check(c.transferTo === undefined || (refs('players', c.transferTo) && c.transferTo !== c.ownerId && player(state, c.transferTo)?.active && ['proposed', 'accepted'].includes(c.status)), `invalid transfer ${c.id}`);
    check(c.proposalId === undefined || (refs('proposals', c.proposalId) && state.proposals.find((p) => p.id === c.proposalId)?.goalId === c.goalId), `invalid commitment proposal ${c.id}`);
    if (liveCommitment(c) && (!player(state, c.ownerId)?.active || (c.supportId && support(state, c.supportId)?.status !== 'active') || unsupervisedLearning(state, c))) check(c.endangered, `unsupported commitment not endangered ${c.id}`);
  }
  for (const a of state.supports) {
    check(refs('players', a.beneficiaryId) && integer(a.face, 0, 3) && idsOK(a.members, 4, 4) && a.members.includes(a.beneficiaryId) && a.members.every((id) => refs('players', id)), `invalid support members ${a.id}`);
    check(idsOK(a.acceptedBy, 0, 4) && a.acceptedBy.every((id) => a.members.includes(id)) && textOK(a.duty) && ['proposed', 'active', 'withdrawn'].includes(a.status) && timestamp(a.createdAt), `invalid support ${a.id}`);
    if (a.status !== 'withdrawn') check(a.members.every((id) => player(state, id)?.active), `inactive support member ${a.id}`);
    if (a.status === 'active') check(a.acceptedBy.length === 4, `support lacks four acceptances ${a.id}`);
    if (a.status === 'proposed') check(a.acceptedBy.length < 4, `accepted support was not activated ${a.id}`);
  }
  check(unique(state.supports.filter((s) => s.status !== 'withdrawn').map((s) => `${s.beneficiaryId}:${s.face}`)), 'multiple support agreements occupy one lower face'); check(!supportCycle(state), 'cyclic support');
  for (const p of state.proposals) {
    check(refs('players', p.ownerId) && refs('goals', p.goalId) && ['action', 'resource', 'dependency', 'help', 'lens', 'goal'].includes(p.kind) && textOK(p.title) && textOK(p.reason) && ['open', 'decided'].includes(p.status), `invalid proposal ${p.id}`);
    check(idsOK(p.affectedLensIds, 0, 100) && idsOK(p.expertLensIds, 0, 100) && [...p.affectedLensIds, ...p.expertLensIds].every((id) => refs('lenses', id)), `missing proposal lens ${p.id}`);
  }
  for (const a of state.advice) check(refs('proposals', a.proposalId) && refs('players', a.actorId) && textOK(a.note) && timestamp(a.at) && a.simulated === (state.mode !== 'group') && (a.stance === undefined || a.stance === 'concern'), `invalid advice ${a.id}`);
  for (const d of state.decisions) check(refs('proposals', d.proposalId) && refs('players', d.actorId) && state.proposals.find((p) => p.id === d.proposalId)?.ownerId === d.actorId && textOK(d.text) && timestamp(d.at) && d.simulated === (state.mode !== 'group') && idsOK(d.adviceIds, 0, 10000) && d.adviceIds.every((id) => state.advice.some((a) => a.id === id && a.proposalId === d.proposalId)), `invalid decision ${d.id}`);
  check(unique(state.decisions.map((d) => d.proposalId)), 'duplicate proposal decision');
  for (const t of state.thresholds) check(refs('players', t.playerId) && (t.goalId === undefined || refs('goals', t.goalId)) && ['expansion', 'support', 'relational', 'governance'].includes(t.kind) && ['open', 'resolved'].includes(t.status) && ['private', 'shared'].includes(t.visibility) && textOK(t.title) && (t.resolution === undefined || textOK(t.resolution)) && (t.status !== 'resolved' || textOK(t.resolution)), `invalid threshold ${t.id}`);
  for (const o of state.outcomes) {
    const c = state.commitments.find((c) => c.id === o.commitmentId);
    check(!!c && refs('players', o.actorId) && c?.ownerId === o.actorId && ['completed', 'failed'].includes(o.result) && textOK(o.evidence) && timestamp(o.at) && o.simulated === (state.mode !== 'group'), `invalid outcome ${o.id}`);
    check(o.appliedRound === undefined || integer(o.appliedRound, 1, state.round), `invalid applied outcome round ${o.id}`);
    const prior = state.outcomes.find((prior) => prior.id === o.corrects);
    check(o.corrects === undefined || (!!prior && prior.id !== o.id && prior.commitmentId === o.commitmentId && prior.actorId === o.actorId && state.outcomes.indexOf(prior) < state.outcomes.indexOf(o)), `invalid outcome correction ${o.id}`);
  }
  for (const c of state.commitments) {
    const outcomes = state.outcomes.filter((o) => o.commitmentId === c.id);
    check(outcomes.filter((o) => !o.corrects).length <= 1 && unique(outcomes.map((o) => o.corrects).filter(Boolean)), `outcome history branches ${c.id}`);
    const latest = outcomes.at(-1);
    if (latest) check(c.status === (latest.appliedRound === undefined ? (outcomes.length === 1 ? 'accepted' : outcomes.at(-2)!.result) : latest.result), `commitment disagrees with outcome ${c.id}`);
    else check(c.status !== 'completed' && c.status !== 'failed', `closed commitment lacks evidence ${c.id}`);
  }
  for (const d of state.dependencies) check(refs('goals', d.from) && refs('goals', d.to) && d.from !== d.to, `invalid dependency ${d.id}`);
  check(unique(state.dependencies.map((d) => `${d.from}:${d.to}`)), 'duplicate dependency'); check(dependencyCycle(state).length === 0, 'dependency cycle');
  check(state.readyPlayerIds.every((id) => player(state, id)?.active), 'inactive or missing ready player');
  for (const p of state.plan) check(['advice', 'staffing', 'dependency', 'threshold', 'overdue', 'overlap', 'attention', 'governance', 'supervision', 'readiness'].includes(p.kind) && textOK(p.title) && textOK(p.reason, 10000) && idsOK(p.playerIds, 0, 100) && p.playerIds.every((id) => refs('players', id)) && (p.goalId === undefined || refs('goals', p.goalId)) && idOK(p.sourceId) && allIds.has(p.sourceId) && typeof p.blocking === 'boolean', `invalid plan item ${p.id}`);
  const CLAIM_STATUSES = ['discussed', 'proposed', 'accepted', 'declined', 'reported', 'disputed'];
  const CLAIM_KINDS = ['facility', 'faculty', 'enrollment', 'agreement', 'operation', 'project'];
  for (const c of state.claims) {
    check(refs('goals', c.goalId) && textOK(c.title) && textOK(c.detail) && CLAIM_STATUSES.includes(c.status) && textOK(c.sourceRef, 200) && textOK(c.unresolved) && typeof c.simulated === 'boolean' && CLAIM_KINDS.includes(c.kind), `invalid claim ${c.id}`);
    check(c.responsibleId === undefined || refs('players', c.responsibleId), `invalid claim owner ${c.id}`);
    check(c.evidence === undefined || textOK(c.evidence), `invalid claim evidence ${c.id}`);
    const recorded = state.events.some((e) => e.type === 'RECORD_CLAIM' && e.payload.claimId === c.id);
    if (state.mode !== 'group' || !recorded) check(c.simulated === true, `seed or practice claim must stay simulated ${c.id}`);
    else check(c.simulated === false, `group seat claim must be attested ${c.id}`);
  }
  for (const c of state.conditions) {
    check(refs('goals', c.goalId) && textOK(c.title) && textOK(c.evidenceRequired) && ['open', 'submitted', 'accepted', 'corrected'].includes(c.status), `invalid condition ${c.id}`);
    check(c.reviewerId === undefined || refs('players', c.reviewerId), `invalid condition reviewer ${c.id}`);
  }
  for (const e of state.conditionEvidence) {
    check(state.conditions.some((c) => c.id === e.conditionId) && refs('players', e.actorId) && textOK(e.summary) && ['produced', 'learned', 'open'].includes(e.category) && timestamp(e.at) && ['submitted', 'accepted', 'corrected'].includes(e.status) && e.simulated === (state.mode !== 'group'), `invalid condition evidence ${e.id}`);
    check(e.acceptedBy === undefined || refs('players', e.acceptedBy), `invalid evidence acceptor ${e.id}`);
    const prior = state.conditionEvidence.find((item) => item.id === e.corrects);
    check(e.corrects === undefined || (!!prior && prior.conditionId === e.conditionId && state.conditionEvidence.indexOf(prior) < state.conditionEvidence.indexOf(e)), `invalid evidence correction ${e.id}`);
  }
  for (const s of state.learningSupports) {
    check(refs('players', s.learnerId) && refs('commitments', s.commitmentId) && refs('players', s.supervisorId) && s.learnerId !== s.supervisorId && ['want-to-try', 'with-support', 'independent'].includes(s.requestedLevel) && textOK(s.evidenceRequired) && ['requested', 'accepted', 'withdrawn', 'endangered'].includes(s.status), `invalid learning support ${s.id}`);
    check(s.acceptedBy === undefined || s.acceptedBy === s.supervisorId, `learning support accepted by the wrong person ${s.id}`);
    if (s.status === 'accepted') check(s.acceptedBy === s.supervisorId, `accepted support lacks supervisor acceptance ${s.id}`);
  }
  for (const d of state.aiDrafts) check(refs('players', d.actorId) && refs('goals', d.goalId) && textOK(d.title) && textOK(d.body, 8000) && timestamp(d.at) && ['deterministic-sample', 'manual'].includes(d.source) && d.labeledDraft === true, `invalid AI draft ${d.id}`);
  for (const n of state.privateNotes) check(refs('players', n.ownerId) && textOK(n.text) && n.visibility === 'private', `invalid private note ${n.id}`);
  for (const e of state.events) {
    check(textOK(e.type, 100) && refs('players', e.actorId) && timestamp(e.at) && e.simulated === (state.mode !== 'group') && object(e.payload) && jsonSafe(e.payload), `invalid event ${e.id}`);
    if (e.type === 'ACCEPT_TRANSFER') check(refs('commitments', e.payload.commitmentId) && refs('lenses', e.payload.previousLensId) && refs('players', e.payload.previousOwnerId) && lens(state, e.payload.previousLensId as string)?.playerId === e.payload.previousOwnerId && lens(state, e.payload.lensId as string)?.playerId === e.actorId, `invalid transfer lineage ${e.id}`);
  }
  check(unique(state.processedCommands.map((c) => c.id)), 'duplicate command receipt');
  for (const c of state.processedCommands) check(idOK(c.id) && refs('players', c.actorId) && textOK(c.fingerprint, 30000) && state.events.some((e) => e.id === `event:${c.id}` && e.actorId === c.actorId), `invalid command receipt ${c.id}`);
  if (state.lastReturn !== null) check(object(state.lastReturn) && keysOnly(state.lastReturn, ['round', 'changes', 'appliedOutcomeIds', 'produced', 'learned', 'unfinished', 'nextResponsibleId']) && integer(state.lastReturn.round, 1, state.round) && Array.isArray(state.lastReturn.changes) && state.lastReturn.changes.every((c) => textOK(c, 1000)) && idsOK(state.lastReturn.appliedOutcomeIds, 0, 10000) && state.lastReturn.appliedOutcomeIds.every((id) => refs('outcomes', id)), 'invalid return summary');
  if (state.lastReturn?.produced) check(state.lastReturn.produced.every((c) => textOK(c, 1000)), 'invalid produced summary');
  if (state.lastReturn?.learned) check(state.lastReturn.learned.every((c) => textOK(c, 1000)), 'invalid learned summary');
  if (state.lastReturn?.unfinished) check(state.lastReturn.unfinished.every((c) => textOK(c, 1000)), 'invalid unfinished summary');
  if (state.lastReturn?.nextResponsibleId) check(refs('players', state.lastReturn.nextResponsibleId), 'invalid next responsible person');
  // Derived checks are safe only after structural and reference checks pass.
  if (!errors.length) {
    for (const p of state.players) {
      if (activeEffort(state, p.id) > p.effortBudget) check(state.thresholds.some((t) => t.playerId === p.id && t.kind === 'expansion' && t.status === 'open'), `effort overload lacks an open Threshold ${p.id}`);
      const actual = derivedReliability(state, p.id);
      for (const key of Object.keys(actual) as (keyof Player['reliability'])[]) check(p.reliability[key] === actual[key], `reliability ${key} lacks matching record history ${p.id}`);
    }
    for (const p of state.proposals) {
      const decision = state.decisions.find((d) => d.proposalId === p.id);
      check(p.status === 'decided' ? decision && adviceActors(state, p).every((actorId) => state.advice.some((a) => a.proposalId === p.id && a.actorId === actorId && decision.adviceIds.includes(a.id))) : !decision, `proposal decision/advice mismatch ${p.id}`);
    }
    const expected = expectedActivation(state);
    for (const g of state.goals) {
      const expectedProgress = state.scenario.progressPolicy === 'named-conditions'
        ? namedConditionProgress(state, g.id)
        : Math.min(100, state.commitments.filter((c) => c.goalId === g.id && evidenceFor(state, c.id)?.result === 'completed').length * 25);
      check(g.progress === expectedProgress, `progress lacks unique applied evidence ${g.id}`);
      check(g.activated === expected.get(g.id), `activation lacks coherence, evidence, or prerequisites ${g.id}`);
    }
  }
  return errors;
}

function jsonSafe(value: unknown, seen = new Set<object>(), allowUndefined = false): boolean {
  if (value === undefined) return allowUndefined;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || seen.has(value)) return false;
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return false;
  if (Object.getOwnPropertySymbols(value).length) return false;
  seen.add(value);
  const valid = (Array.isArray(value) ? value : Object.values(value)).every((v) => jsonSafe(v, seen, allowUndefined));
  seen.delete(value); return valid;
}

class Rejection extends Error { code: string; constructor(code: string, message: string) { super(message); this.code = code; } }
const requireThat: (condition: unknown, code: string, message: string) => asserts condition = (condition, code, message) => { if (!condition) throw new Rejection(code, message); };
const canonical = (value: unknown): string => JSON.stringify(value, (_key, v) => object(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v);

function conditionOpen(state: GameState, t: Threshold): boolean {
  if (t.kind === 'expansion') return activeEffort(state, t.playerId) > player(state, t.playerId)!.effortBudget;
  if (t.kind === 'support') return state.commitments.some((c) => c.ownerId === t.playerId && liveCommitment(c) && c.endangered) || state.allocations.some((a) => a.playerId === t.playerId && a.status === 'endangered' && !activeAllocations(state, t.playerId).some((live) => live.lensId === a.lensId));
  return false;
}

function automaticThreshold(state: GameState, playerId: Id, kind: 'support' | 'expansion', goalId?: Id) {
  // Separate system namespace prevents a chosen command ID from aliasing a manual Threshold.
  const id = `system-threshold:${kind}:${playerId}`;
  const existing = state.thresholds.find((t) => t.id === id);
  const title = kind === 'support' ? 'Support was lost; preserve and repair endangered work.' : 'Accepted commitment effort exceeds the separate effort budget.';
  if (existing) { existing.status = 'open'; existing.title = title; existing.resolution = undefined; if (goalId) existing.goalId = goalId; }
  else state.thresholds.push({ id, playerId, kind, title, status: 'open', visibility: 'shared', ...(goalId ? { goalId } : {}) });
}

function loseSupport(state: GameState, agreement: Support): void {
  agreement.status = 'withdrawn';
  for (const a of state.allocations.filter((a) => a.supportId === agreement.id)) a.status = 'endangered';
  for (const c of state.commitments.filter((c) => c.supportId === agreement.id && liveCommitment(c))) c.endangered = true;
  for (const s of state.learningSupports.filter((s) => s.supervisorId === agreement.beneficiaryId && s.status === 'accepted')) s.status = 'endangered';
  automaticThreshold(state, agreement.beneficiaryId, 'support');
}

function restoreSupportedWork(state: GameState, agreement: Support): void {
  for (const a of state.allocations.filter((a) => a.supportId === agreement.id && a.status === 'endangered')) {
    const active = activeAllocations(state);
    if (!active.some((other) => other.lensId === a.lensId || (other.goalId === a.goalId && other.slot === a.slot)) && active.filter((other) => other.supportId === agreement.id).length < state.config.tribeMultiplier) a.status = 'active';
  }
  for (const c of state.commitments.filter((c) => c.supportId === agreement.id && (liveCommitment(c) || c.status === 'failed'))) applyEndangered(state, c);
}

function allocationSupport(state: GameState, playerId: Id, exclude?: Id): Id | undefined {
  const own = activeAllocations(state, playerId).filter((a) => a.id !== exclude);
  if (own.filter((a) => !a.supportId).length < BASE_CAPACITY) return undefined;
  const available = state.supports.find((s) => s.beneficiaryId === playerId && s.status === 'active' && own.filter((a) => a.supportId === s.id).length < state.config.tribeMultiplier);
  requireThat(available, 'CAPACITY', 'All outward allocations are in use. Withdraw or move an allocation, or establish accepted support.');
  return available.id;
}

function validateCommand(command: unknown): asserts command is Command {
  requireThat(object(command) && jsonSafe(command, new Set(), true) && textOK(command.type, 80), 'COMMAND', 'Command must be a finite JSON object with a type.');
  const c = command as Record<string, unknown>;
  const txt = (...keys: string[]) => keys.every((k) => textOK(c[k]));
  const ids = (...keys: string[]) => keys.every((k) => idOK(c[k]));
  let valid = false;
  switch (c.type) {
    case 'AUTHOR_LENS': valid = (c.lensId === undefined || idOK(c.lensId)) && textOK(c.title, 160) && txt('vision', 'territory', 'duties') && listOK(c.perspectives, 1, 16); break;
    case 'ALLOCATE': valid = ids('lensId', 'goalId') && integer(c.slot, 0, 3); break;
    case 'WITHDRAW_ALLOCATION': valid = ids('allocationId'); break;
    case 'FOCUS': valid = c.goalId === null || idOK(c.goalId); break;
    case 'PROPOSE_COMMITMENT': valid = ids('ownerId', 'lensId', 'goalId') && txt('title') && finite(c.effort, Number.MIN_VALUE, 100) && integer(c.dueRound, 1) && (c.proposalId === undefined || idOK(c.proposalId)) && (c.workKind === undefined || ['learning', 'operating', 'review'].includes(c.workKind as string)) && (c.dueAt === undefined || timestamp(c.dueAt)); break;
    case 'ACCEPT_COMMITMENT': valid = ids('commitmentId'); break;
    case 'WITHDRAW_COMMITMENT': valid = ids('commitmentId') && txt('reason'); break;
    case 'OFFER_TRANSFER': valid = ids('commitmentId', 'toPlayerId'); break;
    case 'ACCEPT_TRANSFER': valid = ids('commitmentId', 'lensId'); break;
    case 'PROPOSE': valid = ids('goalId') && ['action', 'resource', 'dependency', 'help', 'lens', 'goal'].includes(c.kind as string) && txt('title', 'reason') && idsOK(c.affectedLensIds, 0, 100) && idsOK(c.expertLensIds, 0, 100) && (c.commitmentId === undefined || idOK(c.commitmentId)); break;
    case 'GIVE_ADVICE': valid = ids('proposalId') && txt('note') && (c.stance === undefined || c.stance === 'concern'); break;
    case 'DECIDE': valid = ids('proposalId') && txt('text'); break;
    case 'SURFACE_THRESHOLD': valid = (c.goalId === undefined || idOK(c.goalId)) && ['expansion', 'relational'].includes(c.kind as string) && txt('title') && ['private', 'shared'].includes(c.visibility as string); break;
    case 'REVIEW_THRESHOLD': valid = ids('thresholdId') && txt('resolution'); break;
    case 'REQUEST_GOVERNANCE': valid = ids('thresholdId') && txt('reason') && (c.reason as string).trim().length >= 20; break;
    case 'PROPOSE_SUPPORT': valid = integer(c.face, 0, 3) && idsOK(c.members, 4, 4) && txt('duty'); break;
    case 'ACCEPT_SUPPORT': valid = ids('supportId'); break;
    case 'WITHDRAW_SUPPORT': valid = ids('supportId') && txt('reason'); break;
    case 'READY': valid = typeof c.ready === 'boolean'; break;
    case 'CLOSE_ROUND': case 'BEGIN_ACT': case 'RETURN': valid = true; break;
    case 'RECORD_OUTCOME': valid = ids('commitmentId') && ['completed', 'failed'].includes(c.result as string) && txt('evidence') && (c.corrects === undefined || idOK(c.corrects)); break;
    case 'ADD_DEPENDENCY': valid = ids('from', 'to'); break;
    case 'ADD_GOAL': valid = txt('name', 'description') && listOK(c.needs, 1, 4); break;
    case 'LEAVE': valid = txt('reason'); break;
    case 'SET_GOAL_NEEDS': valid = ids('goalId') && listOK(c.needs, 1, 4); break;
    case 'SWITCH_CHAPTER': valid = CHAPTERS.includes(c.chapter as ChapterId); break;
    case 'RECORD_CLAIM': valid = ids('goalId') && txt('title', 'detail', 'sourceRef', 'unresolved') && ['discussed', 'proposed', 'accepted', 'declined', 'reported', 'disputed'].includes(c.status as string) && ['facility', 'faculty', 'enrollment', 'agreement', 'operation', 'project'].includes(c.kind as string) && (c.responsibleId === undefined || idOK(c.responsibleId)); break;
    case 'ACCEPT_CLAIM': valid = ids('claimId'); break;
    case 'DECLINE_CLAIM': valid = ids('claimId') && txt('reason'); break;
    case 'ADD_COMPLETION_CONDITION': valid = ids('goalId') && txt('title', 'evidenceRequired') && (c.reviewerId === undefined || idOK(c.reviewerId)); break;
    case 'SUBMIT_CONDITION_EVIDENCE': valid = ids('conditionId') && txt('summary') && ['produced', 'learned', 'open'].includes(c.category as string); break;
    case 'REVIEW_CONDITION_EVIDENCE': valid = ids('evidenceId') && typeof c.accept === 'boolean' && txt('note'); break;
    case 'REQUEST_LEARNING_SUPPORT': valid = ids('commitmentId', 'supervisorId') && ['want-to-try', 'with-support', 'independent'].includes(c.requestedLevel as string) && txt('evidenceRequired'); break;
    case 'ACCEPT_LEARNING_SUPPORT': valid = ids('supportId'); break;
    case 'WITHDRAW_LEARNING_SUPPORT': valid = ids('supportId') && txt('reason'); break;
    case 'RECORD_AI_DRAFT': valid = ids('goalId') && txt('title') && (c.body === undefined || textOK(c.body, 8000)); break;
    case 'ADD_PRIVATE_NOTE': valid = txt('text'); break;
  }
  requireThat(valid, 'COMMAND', 'Command fields are missing, invalid, empty, or outside their finite bounds.');
}

export function dispatch(input: GameState, envelope: Envelope, context: Context): Result {
  const reject = (code: string, error: string): Result => ({ ok: false, code, error, state: input });
  try {
    const inputErrors = validateState(input);
    requireThat(!inputErrors.length, 'INVALID_STATE', inputErrors.slice(0, 8).join('; '));
    requireThat(object(envelope) && idOK(envelope.id) && envelope.id.length <= 80 && integer(envelope.expectedRevision), 'ENVELOPE', 'A stable command ID and nonnegative expected revision are required.');
    validateCommand(envelope.command);
    requireThat(object(context) && idOK(context.actorId) && timestamp(context.now) && typeof context.simulated === 'boolean', 'CONTEXT', 'An actor, ISO clock value, and explicit simulation flag are required.');
    requireThat(context.simulated === (input.mode !== 'group'), 'SIMULATION', 'Practice and sandbox records must be simulated; group records must be attributed human seat actions.');
    const actor = player(input, context.actorId);
    requireThat(actor, 'ACTOR', 'The acting player does not exist.');
    const fingerprint = canonical(envelope.command);
    const receipt = input.processedCommands.find((r) => r.id === envelope.id);
    if (receipt) {
      requireThat(receipt.actorId === actor.id && receipt.fingerprint === fingerprint, 'DUPLICATE_CONFLICT', 'This command ID was already used by a different actor or payload.');
      return { ok: true, state: input, events: [], duplicate: true };
    }
    const inactiveRepair = ['WITHDRAW_ALLOCATION', 'WITHDRAW_COMMITMENT', 'OFFER_TRANSFER', 'REVIEW_THRESHOLD', 'RECORD_OUTCOME'].includes(envelope.command.type);
    requireThat(actor.active || inactiveRepair, 'INACTIVE_ACTOR', 'A departed seat may only report or repair its own retained responsibilities. Re-entry and new authority are not implied.');
    requireThat(envelope.expectedRevision === input.revision, 'STALE_REVISION', `Expected revision ${envelope.expectedRevision}; current revision is ${input.revision}. Refresh and review the change.`);
    const state = structuredClone(input);
    const c = envelope.command;
    const acting = player(state, actor.id)!;
    const payload: Record<string, unknown> = { ...c };
    delete payload.type;
    const newId = (kind: string) => `${kind}:${envelope.id}`;
    const phases = (...allowed: GameState['phase'][]) => requireThat(allowed.includes(state.phase), 'PHASE', `This action is available during ${allowed.join(' or ')}.`);
    const ownedLens = (id: Id, owner = actor.id): Lens => { const found = lens(state, id); requireThat(found && found.playerId === owner, 'OWNERSHIP', 'This Lens belongs to a different player or does not exist.'); return found; };
    const goal = (id: Id) => { const found = state.goals.find((g) => g.id === id); requireThat(found, 'REFERENCE', 'The goal does not exist.'); return found; };
    const commitment = (id: Id, owned = true) => { const found = state.commitments.find((item) => item.id === id); requireThat(found, 'REFERENCE', 'The commitment does not exist.'); requireThat(!owned || found.ownerId === actor.id, 'OWNERSHIP', 'Only the commitment owner can take this action.'); return found; };
    switch (c.type) {
      case 'AUTHOR_LENS': {
        const existing = c.lensId ? ownedLens(c.lensId) : undefined;
        // The holder revises their own Lens; prior definitions stay on the record so direction can change without losing why.
        const history = existing ? [...(existing.history ?? []), { title: existing.title, vision: existing.vision, territory: existing.territory, duties: existing.duties, perspectives: existing.perspectives, at: context.now }].slice(-20) : undefined;
        const item: Lens = { ...(existing ?? { id: newId('lens'), playerId: actor.id, resources: [] }), title: c.title.trim(), vision: c.vision.trim(), territory: c.territory.trim(), duties: c.duties.trim(), perspectives: c.perspectives.map((p) => p.trim()), ...(history ? { history } : {}) };
        if (existing) state.lenses[state.lenses.indexOf(existing)] = item; else state.lenses.push(item);
        payload.lensId = item.id; break;
      }
      case 'ALLOCATE': {
        phases('PLAY', 'COORDINATE'); const l = ownedLens(c.lensId); goal(c.goalId);
        const existing = activeAllocations(state, actor.id).find((a) => a.lensId === l.id);
        requireThat(!activeAllocations(state).some((a) => a.goalId === c.goalId && a.slot === c.slot && a.id !== existing?.id), 'OCCUPIED', 'This goal edge already has an active contribution.');
        const supportId = allocationSupport(state, actor.id, existing?.id);
        if (l.supportId) requireThat(l.supportId === supportId && support(state, l.supportId)?.status === 'active', 'SUPPORT', 'This Lens remains dependent on its support agreement.');
        const item: Allocation = { id: existing?.id ?? newId('allocation'), playerId: actor.id, lensId: l.id, goalId: c.goalId, slot: c.slot, status: 'active', ...(supportId ? { supportId } : {}) };
        if (existing) state.allocations[state.allocations.indexOf(existing)] = item; else state.allocations.push(item);
        for (const work of state.commitments.filter((work) => work.ownerId === actor.id && work.lensId === l.id && liveCommitment(work))) { work.supportId = supportId; applyEndangered(state, work); }
        payload.allocationId = item.id; if (supportId) payload.supportId = supportId; break;
      }
      case 'WITHDRAW_ALLOCATION': {
        const item = state.allocations.find((a) => a.id === c.allocationId);
        requireThat(item?.playerId === actor.id, 'OWNERSHIP', 'Only this allocation owner may withdraw it.');
        state.allocations = state.allocations.filter((a) => a.id !== item.id); break;
      }
      case 'FOCUS': if (c.goalId) goal(c.goalId); acting.attentionGoalId = c.goalId; break;
      case 'PROPOSE_COMMITMENT': {
        phases('PLAY', 'COORDINATE'); requireThat(player(state, c.ownerId)?.active, 'REFERENCE', 'The proposed owner must be an active player.'); const l = ownedLens(c.lensId, c.ownerId); goal(c.goalId);
        requireThat(c.dueRound >= state.round, 'DEADLINE', 'A new commitment needs a current or future round deadline.');
        if (c.proposalId) requireThat(state.proposals.some((p) => p.id === c.proposalId && p.goalId === c.goalId), 'REFERENCE', 'The linked proposal must concern this goal.');
        const a = activeAllocations(state, c.ownerId).find((a) => a.lensId === l.id);
        const supportId = a?.supportId ?? l.supportId;
        const item: Commitment = { id: newId('commitment'), ownerId: c.ownerId, lensId: l.id, goalId: c.goalId, title: c.title.trim(), effort: c.effort, dueRound: c.dueRound, status: 'proposed', endangered: !!supportId && support(state, supportId)?.status !== 'active', ...(supportId ? { supportId } : {}), ...(c.proposalId ? { proposalId: c.proposalId } : {}), ...(c.workKind ? { workKind: c.workKind } : {}), ...(c.dueAt ? { dueAt: c.dueAt } : {}) };
        state.commitments.push(item); payload.commitmentId = item.id; break;
      }
      case 'ACCEPT_COMMITMENT': {
        const item = commitment(c.commitmentId); requireThat(item.status === 'proposed', 'STATUS', 'Only a proposed commitment can be accepted.');
        requireThat(item.dueRound >= state.round, 'DEADLINE', 'This proposal is overdue; ask for a new commitment.');
        item.status = 'accepted'; item.acceptedAt = context.now;
        applyEndangered(state, item);
        payload.overcommitted = activeEffort(state, actor.id) > acting.effortBudget;
        if (payload.overcommitted) automaticThreshold(state, actor.id, 'expansion', item.goalId);
        break;
      }
      case 'WITHDRAW_COMMITMENT': {
        const item = commitment(c.commitmentId); requireThat(['proposed', 'accepted'].includes(item.status) && !state.outcomes.some((o) => o.commitmentId === item.id), 'STATUS', 'Only unfinished work without a recorded outcome can be withdrawn.');
        item.status = 'withdrawn'; item.endangered = false; delete item.transferTo; break;
      }
      case 'OFFER_TRANSFER': {
        const item = commitment(c.commitmentId); requireThat(['proposed', 'accepted'].includes(item.status) && !state.outcomes.some((o) => o.commitmentId === item.id), 'STATUS', 'Only unfinished work can be offered for transfer.');
        requireThat(c.toPlayerId !== actor.id && player(state, c.toPlayerId)?.active, 'REFERENCE', 'Choose another active recipient.');
        item.transferTo = c.toPlayerId; break;
      }
      case 'ACCEPT_TRANSFER': {
        const item = commitment(c.commitmentId, false); requireThat(item.transferTo === actor.id, 'OWNERSHIP', 'Only the offered recipient can accept this transfer.'); const l = ownedLens(c.lensId);
        requireThat(activeEffort(state, actor.id) + item.effort <= acting.effortBudget, 'EFFORT', 'The transfer would exceed your separate effort budget.');
        payload.previousOwnerId = item.ownerId; payload.previousLensId = item.lensId; if (item.supportId) payload.previousSupportId = item.supportId;
        const a = activeAllocations(state, actor.id).find((a) => a.lensId === l.id);
        item.ownerId = actor.id; item.lensId = l.id; item.supportId = a?.supportId ?? l.supportId; item.status = 'accepted'; item.acceptedAt = context.now; delete item.transferTo;
        applyEndangered(state, item);
        break;
      }
      case 'PROPOSE': {
        phases('PLAY', 'COORDINATE'); goal(c.goalId); requireThat([...c.affectedLensIds, ...c.expertLensIds].every((id) => lens(state, id) && player(state, lens(state, id)!.playerId)?.active), 'REFERENCE', 'Affected perspectives and expertise must belong to active, existing Lenses.');
        const work = c.commitmentId ? commitment(c.commitmentId) : undefined;
        if (work) requireThat(work.goalId === c.goalId && ['proposed', 'accepted'].includes(work.status), 'SCOPE', 'Link only your own unfinished commitment on this proposal’s goal.');
        const item: Proposal = { id: newId('proposal'), ownerId: actor.id, goalId: c.goalId, kind: c.kind, title: c.title.trim(), reason: c.reason.trim(), affectedLensIds: [...c.affectedLensIds], expertLensIds: [...c.expertLensIds], status: 'open' };
        state.proposals.push(item); if (work) work.proposalId = item.id; payload.proposalId = item.id; break;
      }
      case 'GIVE_ADVICE': {
        const p = state.proposals.find((p) => p.id === c.proposalId); requireThat(p?.status === 'open', 'STATUS', 'Advice requires an open proposal.');
        state.advice.push({ id: newId('advice'), proposalId: p.id, actorId: actor.id, note: c.note.trim(), at: context.now, simulated: context.simulated, ...(c.stance === 'concern' ? { stance: 'concern' as const } : {}) }); acting.reliability.responses += 1; payload.adviceId = newId('advice'); break;
      }
      case 'DECIDE': {
        const p = state.proposals.find((p) => p.id === c.proposalId); requireThat(p?.ownerId === actor.id && p.status === 'open', 'OWNERSHIP', 'Only the responsible proposal owner may record its decision.');
        const missing = adviceActors(state, p).filter((id) => !state.advice.some((a) => a.proposalId === p.id && a.actorId === id));
        requireThat(!missing.length, 'ADVICE_REQUIRED', `Advice is still missing from ${missing.map((id) => player(state, id)!.name).join(', ')}. A note by someone else is not their participation.`);
        state.decisions.push({ id: newId('decision'), proposalId: p.id, actorId: actor.id, text: c.text.trim(), at: context.now, simulated: context.simulated, adviceIds: state.advice.filter((a) => a.proposalId === p.id).map((a) => a.id) }); p.status = 'decided'; acting.reliability.responses += 1; payload.decisionId = newId('decision'); break;
      }
      case 'SURFACE_THRESHOLD': {
        if (c.goalId) goal(c.goalId);
        const t: Threshold = { id: newId('threshold'), playerId: actor.id, kind: c.kind, title: c.title.trim(), visibility: c.visibility, status: 'open', ...(c.goalId ? { goalId: c.goalId } : {}) };
        state.thresholds.push(t); acting.reliability.surfaced += 1; payload.thresholdId = t.id; break;
      }
      case 'REVIEW_THRESHOLD': {
        const t = state.thresholds.find((t) => t.id === c.thresholdId); requireThat(t?.playerId === actor.id && t.status === 'open', 'OWNERSHIP', 'Only the person who owns an open Threshold can resolve it.');
        requireThat(!conditionOpen(state, t), 'UNRESOLVED_CONDITION', 'The underlying overload or endangered work remains. Repair it before resolving this Threshold.');
        t.status = 'resolved'; t.resolution = c.resolution.trim(); break;
      }
      case 'REQUEST_GOVERNANCE': {
        const t = state.thresholds.find((t) => t.id === c.thresholdId); requireThat(t?.playerId === actor.id && t.status === 'open', 'OWNERSHIP', 'Request governance from your own open Threshold.');
        const item: Threshold = { id: newId('threshold'), playerId: actor.id, goalId: t.goalId, kind: 'governance', title: `Governance requested: ${c.reason.trim()}`, status: 'open', visibility: t.visibility };
        state.thresholds.push(item); payload.sourceThresholdId = t.id; payload.thresholdId = item.id; break;
      }
      case 'PROPOSE_SUPPORT': {
        requireThat(eligibleForSupport(state, actor.id), 'ELIGIBILITY', 'Support eligibility requires configured completed work and coordination responses, no hidden misses, and effort within budget. These are playtest criteria.');
        requireThat(c.members.includes(actor.id) && c.members.every((id) => player(state, id)?.active), 'MEMBERS', 'Name yourself and three other distinct active people. All four must accept.');
        requireThat(!state.supports.some((s) => s.beneficiaryId === actor.id && s.face === c.face && s.status !== 'withdrawn'), 'FACE', 'This lower face already has a pending or active support agreement.');
        const previous = state.supports.findLast((s) => s.beneficiaryId === actor.id && s.face === c.face && s.status === 'withdrawn');
        const item: Support = { id: previous?.id ?? newId('support'), beneficiaryId: actor.id, face: c.face, members: [...c.members], acceptedBy: [], duty: c.duty.trim(), status: 'proposed', createdAt: previous?.createdAt ?? context.now };
        if (previous) state.supports[state.supports.indexOf(previous)] = item; else state.supports.push(item);
        requireThat(!supportCycle(state), 'SUPPORT_CYCLE', 'This creates circular support. Supported capacity cannot recursively support itself.');
        payload.supportId = item.id; payload.restored = !!previous; break;
      }
      case 'ACCEPT_SUPPORT': {
        const item = support(state, c.supportId); requireThat(item?.status === 'proposed' && item.members.includes(actor.id), 'OWNERSHIP', 'Only a named member may accept a proposed support duty.');
        requireThat(!item.acceptedBy.includes(actor.id), 'STATUS', 'Your acceptance is already recorded.');
        requireThat(eligibleForSupport(state, item.beneficiaryId), 'ELIGIBILITY', 'The beneficiary no longer meets the configured support criteria.');
        item.acceptedBy.push(actor.id);
        if (item.acceptedBy.length === 4) { item.status = 'active'; restoreSupportedWork(state, item); }
        payload.active = item.status === 'active'; break;
      }
      case 'WITHDRAW_SUPPORT': {
        const item = support(state, c.supportId); requireThat(item && item.status !== 'withdrawn' && item.members.includes(actor.id), 'OWNERSHIP', 'A named support member may withdraw their support in any phase.');
        loseSupport(state, item); payload.beneficiaryId = item.beneficiaryId; break;
      }
      case 'READY': phases('PLAY'); state.readyPlayerIds = state.readyPlayerIds.filter((id) => id !== actor.id); if (c.ready) state.readyPlayerIds.push(actor.id); break;
      case 'CLOSE_ROUND': phases('PLAY'); requireThat(state.players.filter((p) => p.active).every((p) => state.readyPlayerIds.includes(p.id)), 'NOT_READY', 'Each active participant must record their own readiness. Leaving is explicit; absence is not consent.'); state.phase = 'COORDINATE'; break;
      case 'BEGIN_ACT': phases('COORDINATE'); state.phase = 'ACT'; break;
      case 'RECORD_OUTCOME': {
        phases('ACT'); const item = commitment(c.commitmentId); const latest = state.outcomes.filter((o) => o.commitmentId === item.id).at(-1);
        if (latest) requireThat(c.corrects === latest.id && latest.appliedRound !== undefined && ['completed', 'failed'].includes(item.status), 'OUTCOME_EXISTS', 'Use an explicit correction of the latest applied outcome. A pending outcome is applied on return.');
        else requireThat(item.status === 'accepted' && !c.corrects, 'STATUS', 'Only an accepted commitment can receive its first outcome.');
        if (c.result === 'completed') {
          const departureOnly = !acting.active && (!item.supportId || support(state, item.supportId)?.status === 'active');
          requireThat(!item.endangered || departureOnly, 'ENDANGERED', 'Repair, transfer, or withdraw unsupported work before claiming completion. Departure alone does not prevent an owner from attesting historical work.');
          requireThat(activeEffort(state, actor.id) <= acting.effortBudget, 'EFFORT', 'Resolve the owner’s effort overload before completing more work.');
          requireThat(!relevantOpenProposals(state, item).length, 'ADVICE_REQUIRED', 'This commitment is affected by an open proposal; record its relevant advice and separate decision first.');
          if (item.workKind === 'learning') {
            const supports = state.learningSupports.filter((s) => s.commitmentId === item.id && s.learnerId === item.ownerId && s.status !== 'withdrawn');
            requireThat(supports.some((s) => s.status === 'accepted'), 'SUPERVISION', 'Learning work needs accepted supervision for the current owner. Transfer does not auto-qualify a new beginner.');
          }
        }
        const itemId = newId('outcome'); state.outcomes.push({ id: itemId, commitmentId: item.id, actorId: actor.id, result: c.result, evidence: c.evidence.trim(), at: context.now, simulated: context.simulated, ...(c.corrects ? { corrects: c.corrects } : {}) }); payload.outcomeId = itemId; break;
      }
      case 'RETURN': {
        phases('ACT'); const before = new Map(state.goals.map((g) => [g.id, { progress: g.progress, activated: g.activated }])); const changes: string[] = []; const appliedOutcomeIds: Id[] = [];
        for (const o of state.outcomes.filter((o) => o.appliedRound === undefined)) {
          const item = state.commitments.find((c) => c.id === o.commitmentId)!; const owner = player(state, item.ownerId)!;
          const prior = evidenceFor(state, item.id);
          if (prior) { if (prior.result === 'completed') owner.reliability.completed = Math.max(0, owner.reliability.completed - 1); else owner.reliability.communicatedMisses = Math.max(0, owner.reliability.communicatedMisses - 1); }
          o.appliedRound = state.round; item.status = o.result; delete item.transferTo;
          if (o.result === 'completed') owner.reliability.completed += 1; else owner.reliability.communicatedMisses += 1;
          changes.push(`${item.title}: ${o.result}${o.corrects ? ' (corrected evidence)' : ''}.`); appliedOutcomeIds.push(o.id);
        }
        refreshProgress(state);
        for (const g of state.goals) { const previous = before.get(g.id)!; if (g.progress !== previous.progress) changes.push(`${g.name}: ${previous.progress}% → ${g.progress}% evidenced progress.`); if (g.activated !== previous.activated) changes.push(`${g.name}: ${g.activated ? 'activated by coherent staffing, evidence, and prerequisites' : 'activation paused; inspect evidence, staffing, and prerequisites'}.`); }
        if (!changes.length) changes.push('No new outcomes were applied. Unfinished work remains visible.');
        const chapterIds = new Set(goalsInChapter(state).map((g) => g.id));
        const evidenceGoal = (e: ConditionEvidence) => state.conditions.find((item) => item.id === e.conditionId)?.goalId;
        const produced = state.conditionEvidence.filter((e) => e.category === 'produced' && e.status === 'accepted' && chapterIds.has(evidenceGoal(e) ?? '')).map((e) => e.summary);
        const learned = state.conditionEvidence.filter((e) => e.category === 'learned' && e.status === 'accepted' && chapterIds.has(evidenceGoal(e) ?? '')).map((e) => e.summary);
        const unfinished = [
          ...state.commitments.filter((item) => ['proposed', 'accepted'].includes(item.status) && chapterIds.has(item.goalId)).map((item) => item.title),
          ...state.conditions.filter((item) => item.status !== 'accepted' && item.id !== 'cond-launch-blocked' && chapterIds.has(item.goalId)).map((item) => item.title),
          ...state.learningSupports.filter((item) => {
            const work = state.commitments.find((commitmentItem) => commitmentItem.id === item.commitmentId);
            return item.status !== 'accepted' && !!work && chapterIds.has(work.goalId);
          }).map((item) => `Supervision ${item.status} for ${item.learnerId}`),
        ];
        const nextResponsible = state.learningSupports.find((item) => {
          const work = state.commitments.find((commitmentItem) => commitmentItem.id === item.commitmentId);
          return (item.status === 'accepted' || item.status === 'endangered') && work && chapterIds.has(work.goalId);
        })?.supervisorId
          ?? state.conditions.find((item) => item.status !== 'accepted' && item.id !== 'cond-launch-blocked' && chapterIds.has(item.goalId))?.reviewerId;
        state.lastReturn = { round: state.round, changes, appliedOutcomeIds, produced, learned, unfinished, ...(nextResponsible ? { nextResponsibleId: nextResponsible } : {}) }; state.round += 1; state.phase = 'PLAY'; state.readyPlayerIds = [];
        const unreportedCommitmentIds = state.players.flatMap((p) => unreportedMisses(state, p.id).map((c) => c.id));
        if (unreportedCommitmentIds.length) changes.push(`${unreportedCommitmentIds.length} accepted commitment(s) are past their deadline without an outcome or transfer offer. Their owners can report, withdraw, or offer transfer.`);
        payload.changes = changes; payload.appliedOutcomeIds = appliedOutcomeIds; payload.openedRound = state.round; payload.unreportedCommitmentIds = unreportedCommitmentIds; break;
      }
      case 'ADD_DEPENDENCY': {
        phases('PLAY', 'COORDINATE'); goal(c.from); goal(c.to); requireThat(c.from !== c.to && !state.dependencies.some((d) => d.from === c.from && d.to === c.to), 'DEPENDENCY', 'Dependencies must be distinct and cannot point to themselves.');
        state.dependencies.push({ id: newId('dependency'), from: c.from, to: c.to }); requireThat(!dependencyCycle(state).length, 'DEPENDENCY_CYCLE', 'This dependency would create a cycle.'); payload.dependencyId = newId('dependency'); break;
      }
      case 'ADD_GOAL': phases('PLAY', 'COORDINATE'); state.goals.push({ id: newId('goal'), name: c.name.trim(), description: c.description.trim(), needs: c.needs.map((n) => n.trim()), required: false, x: ((state.goals.length % 3) - 1) * 5, z: 7 + Math.floor((state.goals.length - 6) / 3) * 5, progress: 0, activated: false, chapter: state.scenario.chapter }); payload.goalId = newId('goal'); break;
      case 'LEAVE': {
        acting.active = false; acting.attentionGoalId = null; state.readyPlayerIds = state.readyPlayerIds.filter((id) => id !== actor.id);
        for (const s of state.supports.filter((s) => s.status !== 'withdrawn' && s.members.includes(actor.id))) loseSupport(state, s);
        for (const a of state.allocations.filter((a) => a.playerId === actor.id)) a.status = 'endangered';
        for (const item of state.commitments.filter((c) => c.ownerId === actor.id && liveCommitment(c))) item.endangered = true;
        for (const item of state.commitments.filter((c) => c.transferTo === actor.id)) delete item.transferTo;
        for (const item of state.learningSupports.filter((s) => s.status !== 'withdrawn' && (s.supervisorId === actor.id || s.learnerId === actor.id))) item.status = 'endangered';
        break;
      }
      case 'SET_GOAL_NEEDS': {
        phases('PLAY', 'COORDINATE'); const g = goal(c.goalId);
        g.needs = c.needs.map((n) => n.trim());
        payload.needs = g.needs; break;
      }
      case 'SWITCH_CHAPTER': {
        requireThat(state.mode !== 'group', 'CHAPTER', 'Room chapter comes from the authoritative room, not a later client selector.');
        requireThat(state.scenario.id !== 'festival' || c.chapter === 'festival', 'CHAPTER', 'Festival has a single chapter.');
        requireThat(state.scenario.id !== 'learning-community' || c.chapter === 'organize' || c.chapter === 'learn', 'CHAPTER', 'Choose the organizer or learner chapter.');
        requireThat(c.chapter !== 'festival' || state.scenario.id === 'festival', 'CHAPTER', 'Cannot relabel a learning-community project as Festival.');
        state.scenario = { ...state.scenario, chapter: c.chapter };
        payload.warning = 'Exploring a chapter in practice is not authorization that a real program is ready.';
        break;
      }
      case 'RECORD_CLAIM': {
        phases('PLAY', 'COORDINATE'); goal(c.goalId);
        if (c.responsibleId) requireThat(player(state, c.responsibleId), 'REFERENCE', 'Responsible person must exist.');
        requireThat(c.status !== 'accepted', 'STATUS', 'Acceptance is a separate command by the responsible person. Recording cannot mint an accepted commitment.');
        const item: ProjectClaim = { id: newId('claim'), goalId: c.goalId, title: c.title.trim(), detail: c.detail.trim(), status: c.status, sourceRef: c.sourceRef.trim(), unresolved: c.unresolved.trim(), simulated: context.simulated, kind: c.kind, ...(c.responsibleId ? { responsibleId: c.responsibleId } : {}) };
        state.claims.push(item); payload.claimId = item.id; break;
      }
      case 'ACCEPT_CLAIM': {
        const item = state.claims.find((claim) => claim.id === c.claimId);
        requireThat(item, 'REFERENCE', 'The claim does not exist.');
        requireThat(item.status === 'proposed' || item.status === 'discussed' || item.status === 'reported', 'STATUS', 'Only a discussed, proposed, or reported claim can be accepted.');
        requireThat(!item.responsibleId || item.responsibleId === actor.id, 'OWNERSHIP', 'Only the named responsible person can accept this claim. A seat cannot impersonate them.');
        item.status = 'accepted'; item.responsibleId = actor.id; break;
      }
      case 'DECLINE_CLAIM': {
        const item = state.claims.find((claim) => claim.id === c.claimId);
        requireThat(item, 'REFERENCE', 'The claim does not exist.');
        requireThat(!item.responsibleId || item.responsibleId === actor.id, 'OWNERSHIP', 'Only the named responsible person can decline this claim.');
        item.status = 'declined'; item.unresolved = c.reason.trim(); break;
      }
      case 'ADD_COMPLETION_CONDITION': {
        phases('PLAY', 'COORDINATE'); goal(c.goalId);
        if (c.reviewerId) requireThat(player(state, c.reviewerId)?.active, 'REFERENCE', 'Reviewer must be an active participant.');
        const item: { id: Id; goalId: Id; title: string; evidenceRequired: string; reviewerId?: Id; status: 'open' } = { id: newId('condition'), goalId: c.goalId, title: c.title.trim(), evidenceRequired: c.evidenceRequired.trim(), status: 'open', ...(c.reviewerId ? { reviewerId: c.reviewerId } : {}) };
        state.conditions.push(item); payload.conditionId = item.id; break;
      }
      case 'SUBMIT_CONDITION_EVIDENCE': {
        const condition = state.conditions.find((item) => item.id === c.conditionId);
        requireThat(condition, 'REFERENCE', 'The completion condition does not exist.');
        const item: ConditionEvidence = { id: newId('condition-evidence'), conditionId: condition.id, actorId: actor.id, summary: c.summary.trim(), category: c.category, simulated: context.simulated, at: context.now, status: 'submitted' };
        state.conditionEvidence.push(item); condition.status = 'submitted'; payload.evidenceId = item.id; break;
      }
      case 'REVIEW_CONDITION_EVIDENCE': {
        const evidence = state.conditionEvidence.find((item) => item.id === c.evidenceId);
        requireThat(evidence, 'REFERENCE', 'The evidence record does not exist.');
        const condition = state.conditions.find((item) => item.id === evidence.conditionId)!;
        requireThat(!condition.reviewerId || condition.reviewerId === actor.id, 'OWNERSHIP', 'Only the identified reviewer can accept or correct this evidence.');
        requireThat(evidence.status === 'submitted' || evidence.status === 'accepted', 'STATUS', 'Review the latest submitted evidence.');
        if (c.accept) {
          evidence.status = 'accepted'; evidence.acceptedBy = actor.id; condition.status = 'accepted';
        } else {
          const correction: ConditionEvidence = { id: newId('condition-evidence'), conditionId: condition.id, actorId: actor.id, summary: c.note.trim(), category: evidence.category, simulated: context.simulated, at: context.now, status: 'corrected', corrects: evidence.id, acceptedBy: actor.id };
          state.conditionEvidence.push(correction); evidence.status = 'corrected'; condition.status = 'corrected'; payload.correctionId = correction.id;
        }
        break;
      }
      case 'REQUEST_LEARNING_SUPPORT': {
        const work = commitment(c.commitmentId); requireThat(work.ownerId === actor.id, 'OWNERSHIP', 'Only the learner who owns the task can request support for it.');
        requireThat(player(state, c.supervisorId)?.active && c.supervisorId !== actor.id, 'REFERENCE', 'Name a different active supervisor. Wanting to help is not their acceptance.');
        requireThat(c.requestedLevel !== 'independent', 'STATUS', 'Independence is a scoped claim after accepted evidence, not a request that skips supervision.');
        const item: LearningSupport = { id: newId('learning-support'), learnerId: actor.id, commitmentId: work.id, requestedLevel: c.requestedLevel, supervisorId: c.supervisorId, evidenceRequired: c.evidenceRequired.trim(), status: 'requested' };
        state.learningSupports.push(item); work.learningSupportId = item.id; work.workKind = work.workKind ?? 'learning'; payload.supportId = item.id; break;
      }
      case 'ACCEPT_LEARNING_SUPPORT': {
        const item = state.learningSupports.find((s) => s.id === c.supportId);
        requireThat(item && item.status === 'requested', 'STATUS', 'Only a requested learning-support record can be accepted.');
        requireThat(item.supervisorId === actor.id, 'OWNERSHIP', 'Only the named supervisor can accept this support. A facilitator or AI helper cannot impersonate them.');
        item.status = 'accepted'; item.acceptedBy = actor.id;
        const work = state.commitments.find((commitmentItem) => commitmentItem.id === item.commitmentId);
        if (work) applyEndangered(state, work);
        break;
      }
      case 'WITHDRAW_LEARNING_SUPPORT': {
        const item = state.learningSupports.find((s) => s.id === c.supportId);
        requireThat(item && item.status !== 'withdrawn' && (item.supervisorId === actor.id || item.learnerId === actor.id), 'OWNERSHIP', 'Only the learner or named supervisor may withdraw this support.');
        item.status = 'withdrawn';
        const work = state.commitments.find((commitmentItem) => commitmentItem.id === item.commitmentId);
        if (work && liveCommitment(work) && work.workKind === 'learning') work.endangered = true;
        break;
      }
      case 'RECORD_AI_DRAFT': {
        const g = goal(c.goalId);
        const body = (c.body?.trim() || KITCHEN_DRAFT);
        state.aiDrafts.push({ id: newId('ai-draft'), actorId: actor.id, goalId: g.id, title: c.title.trim(), body, at: context.now, source: c.body?.trim() ? 'manual' : 'deterministic-sample', labeledDraft: true });
        payload.draftId = newId('ai-draft'); payload.warning = 'AI output is a draft, not engineering approval.'; break;
      }
      case 'ADD_PRIVATE_NOTE': {
        const item: PrivateNote = { id: newId('private-note'), ownerId: actor.id, text: c.text.trim(), visibility: 'private' };
        state.privateNotes.push(item); payload.noteId = item.id; delete payload.text; break;
      }
    }
    if (state.phase === 'PLAY' && !['READY', 'RETURN', 'LEAVE'].includes(c.type)) state.readyPlayerIds = [];
    refreshProgress(state);
    state.plan = evaluateSystem(state);
    const event: GameEvent = { id: `event:${envelope.id}`, type: c.type, actorId: actor.id, at: context.now, simulated: context.simulated, payload: JSON.parse(JSON.stringify(payload)) as Record<string, unknown> };
    state.events.push(event); state.processedCommands.push({ id: envelope.id, actorId: actor.id, fingerprint }); state.revision += 1;
    for (const p of state.players) p.reliability = derivedReliability(state, p.id);
    const errors = validateState(state);
    requireThat(!errors.length, 'INVARIANT', errors.slice(0, 8).join('; '));
    return { ok: true, state, events: [event] };
  } catch (error) {
    if (error instanceof Rejection) return reject(error.code, error.message);
    return reject('MALFORMED', 'Malformed state or command was rejected without changing the original state.');
  }
}
