/** KYJ → Cloudburst → Interfractal close-room query + postMessage contract. */

export const FUNNEL_SOURCE = "kyj-funnel";
export const FUNNEL_VERSION = 1;
export const CLOUD6_HREF = "https://boulderjoe.com";
export const KYJ_ORIGIN = "https://keep-your-judgment.vercel.app";
export const FUNNEL_GOAL_STORAGE_KEY = "kyj-funnel-goal";
export const FUNNEL_DOORS = ["chamber", "matter"] as const;

export type FunnelDoor = (typeof FUNNEL_DOORS)[number];

export type FunnelSearch = {
  from?: string;
  funnel?: string;
  warmup?: string;
  door?: FunnelDoor;
  goal?: string;
};

export type GoalStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export type FunnelEvent = "stage-warming" | "stage-ready" | "close-ready" | "wake";

export type FunnelMessage = {
  source: typeof FUNNEL_SOURCE;
  version: typeof FUNNEL_VERSION;
  event: FunnelEvent;
};

export type FunnelPostHost = {
  parent?: {
    postMessage: (message: unknown, targetOrigin: string) => void;
    location?: { origin?: string };
  } | null;
  location?: { ancestorOrigins?: ArrayLike<string> };
  document?: { referrer?: string };
};

/**
 * Same class of unwrap as Cloudburst #3: TanStack’s default search serializer
 * JSON-encodes strings, so inbound `funnel=1` can arrive as `funnel="1"` /
 * `%221%22`. Strip leftover percent-encoding and wrapping quotes.
 */
export function normalizeQueryToken(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "boolean") return value ? "1" : undefined;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return undefined;

  let s = value.trim();
  if (s.includes("%")) {
    try {
      s = decodeURIComponent(s).trim();
    } catch {
      /* keep the raw token */
    }
  }

  while (s.length >= 2) {
    const open = s[0];
    const close = s[s.length - 1];
    if ((open === '"' && close === '"') || (open === "'" && close === "'")) {
      s = s.slice(1, -1).trim();
      continue;
    }
    break;
  }

  return s.length ? s : undefined;
}

export function tokenOn(value: unknown): boolean {
  const token = normalizeQueryToken(value);
  return token === "1" || token === "true";
}

function readParam(input: URLSearchParams | string, key: string): unknown {
  const params = typeof input === "string" ? new URLSearchParams(input.startsWith("?") ? input.slice(1) : input) : input;
  return params.get(key);
}

/** Accept route search, URLSearchParams, or a raw query string. */
export function parseFunnelSearch(
  input:
    | { from?: unknown; funnel?: unknown; warmup?: unknown; door?: unknown; goal?: unknown }
    | URLSearchParams
    | string
    | undefined
    | null,
): FunnelSearch {
  if (input == null) return {};
  let from: unknown;
  let funnel: unknown;
  let warmup: unknown;
  let door: unknown;
  let goal: unknown;
  if (typeof input === "string" || input instanceof URLSearchParams) {
    from = readParam(input, "from");
    funnel = readParam(input, "funnel");
    warmup = readParam(input, "warmup");
    door = readParam(input, "door");
    goal = readParam(input, "goal");
  } else {
    from = input.from;
    funnel = input.funnel;
    warmup = input.warmup;
    door = input.door;
    goal = input.goal;
  }
  const parsed: FunnelSearch = {};
  const fromToken = normalizeQueryToken(from);
  if (fromToken) parsed.from = fromToken;
  if (tokenOn(funnel)) parsed.funnel = "1";
  if (tokenOn(warmup)) parsed.warmup = "1";
  const doorToken = normalizeQueryToken(door)?.toLowerCase();
  if (doorToken === "chamber" || doorToken === "matter") parsed.door = doorToken;
  const goalToken = normalizeQueryToken(goal);
  if (goalToken) parsed.goal = goalToken;
  return parsed;
}

/** `?from=cloudburst` or `?funnel=1` — skip Light / Whole and show the close rail. */
export function isFunnelArrival(search: FunnelSearch): boolean {
  return search.from === "cloudburst" || search.funnel === "1";
}

export function isWarmup(search: FunnelSearch): boolean {
  return search.warmup === "1";
}

/** Slide 7 paycheck. Cloudburst primary and the chamber chip land here, not on the table. */
export function isMatterDoor(search: FunnelSearch): boolean {
  return search.door === "matter";
}

/** Slide 6 chamber cell: funnel land + `door=chamber` (quoted tokens already normalized). */
export function isFunnelChamberCell(search: FunnelSearch): boolean {
  return isFunnelArrival(search) && search.door === "chamber";
}

/** After Commit with a named goal — optional convert chip, still no charge. */
export function showMakeItMatterChip(search: FunnelSearch, committed: boolean, goal: string): boolean {
  return isFunnelChamberCell(search) && committed && goal.trim().length > 0;
}

/** Live funnel land: skip pulse / gate / FirstPage via skipIntro(). Matter goes to /convert. */
export function shouldSkipIntro(search: FunnelSearch): boolean {
  return isFunnelArrival(search) && !isWarmup(search) && !isMatterDoor(search);
}

export function readCarriedGoal(storage?: GoalStorage | null, searchGoal?: string): string {
  const fromQuery = normalizeQueryToken(searchGoal)?.trim();
  if (fromQuery) return fromQuery;
  try {
    return storage?.getItem(FUNNEL_GOAL_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeCarriedGoal(goal: string, storage?: GoalStorage | null) {
  if (!storage) return;
  const trimmed = goal.trim();
  try {
    if (trimmed) storage.setItem(FUNNEL_GOAL_STORAGE_KEY, trimmed);
    else storage.removeItem(FUNNEL_GOAL_STORAGE_KEY);
  } catch {
    /* private mode / opaque storage */
  }
}

/** Warm iframe: parse and cache. Do not start the live renderer. */
export function shouldHoldRenderer(search: FunnelSearch): boolean {
  return isWarmup(search);
}

export function funnelMessage(event: FunnelEvent): FunnelMessage {
  return { source: FUNNEL_SOURCE, version: FUNNEL_VERSION, event };
}

export function isFunnelMessage(data: unknown, event?: FunnelEvent): data is FunnelMessage {
  if (!data || typeof data !== "object") return false;
  const body = data as Record<string, unknown>;
  if (body.source !== FUNNEL_SOURCE || body.version !== FUNNEL_VERSION) return false;
  if (typeof body.event !== "string") return false;
  if (event && body.event !== event) return false;
  return true;
}

export function isAllowedFunnelParentOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.origin === KYJ_ORIGIN) return true;
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return false;
  }
}

function originFromCandidate(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).origin;
  } catch {
    return null;
  }
}

function hasForeignParent(host: FunnelPostHost): boolean {
  return Boolean(host.parent) && (host.parent as object) !== host;
}

function safeParentOrigin(host: FunnelPostHost): string | null {
  try {
    return host.parent?.location?.origin ?? null;
  } catch {
    return null;
  }
}

/** First allowlisted parent origin, or null — never fall back to "*". */
export function resolveFunnelParentOrigin(host: FunnelPostHost): string | null {
  if (!hasForeignParent(host)) return null;
  const ancestor = host.location?.ancestorOrigins?.[0];
  const candidates = [
    safeParentOrigin(host),
    originFromCandidate(typeof ancestor === "string" ? ancestor : null),
    originFromCandidate(host.document?.referrer),
  ];
  for (const origin of candidates) {
    if (origin && isAllowedFunnelParentOrigin(origin)) return origin;
  }
  return null;
}

export function postFunnelEvent(
  event: Exclude<FunnelEvent, "wake">,
  host: FunnelPostHost | undefined = typeof window === "undefined" ? undefined : window,
) {
  if (!host || !hasForeignParent(host)) return;
  const target = resolveFunnelParentOrigin(host);
  if (!target) return;
  try {
    host.parent?.postMessage(funnelMessage(event), target);
  } catch {
    /* parent may be missing or cross-origin opaque */
  }
}
