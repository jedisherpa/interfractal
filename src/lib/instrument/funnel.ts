/** KYJ → Cloudburst → Interfractal close-room query + postMessage contract. */

export const FUNNEL_SOURCE = "kyj-funnel";
export const FUNNEL_VERSION = 1;
export const CLOUD6_HREF = "https://boulderjoe.com";

export type FunnelSearch = {
  from?: string;
  funnel?: string;
  warmup?: string;
};

export type FunnelEvent = "stage-warming" | "stage-ready" | "close-ready" | "wake";

export type FunnelMessage = {
  source: typeof FUNNEL_SOURCE;
  version: typeof FUNNEL_VERSION;
  event: FunnelEvent;
};

function tokenOn(value: unknown): boolean {
  return value === "1" || value === 1 || value === true || value === "true";
}

function readParam(input: URLSearchParams | string, key: string): unknown {
  const params = typeof input === "string" ? new URLSearchParams(input.startsWith("?") ? input.slice(1) : input) : input;
  return params.get(key);
}

/** Accept route search, URLSearchParams, or a raw query string. */
export function parseFunnelSearch(
  input: { from?: unknown; funnel?: unknown; warmup?: unknown } | URLSearchParams | string | undefined | null,
): FunnelSearch {
  if (input == null) return {};
  let from: unknown;
  let funnel: unknown;
  let warmup: unknown;
  if (typeof input === "string" || input instanceof URLSearchParams) {
    from = readParam(input, "from");
    funnel = readParam(input, "funnel");
    warmup = readParam(input, "warmup");
  } else {
    from = input.from;
    funnel = input.funnel;
    warmup = input.warmup;
  }
  const parsed: FunnelSearch = {};
  if (typeof from === "string" && from.length > 0) parsed.from = from;
  if (tokenOn(funnel)) parsed.funnel = "1";
  if (tokenOn(warmup)) parsed.warmup = "1";
  return parsed;
}

/** `?from=cloudburst` or `?funnel=1` — skip Light / Whole and show the close rail. */
export function isFunnelArrival(search: FunnelSearch): boolean {
  return search.from === "cloudburst" || search.funnel === "1";
}

export function isWarmup(search: FunnelSearch): boolean {
  return search.warmup === "1";
}

/** Live funnel land: skip pulse / gate / FirstPage via skipIntro(). */
export function shouldSkipIntro(search: FunnelSearch): boolean {
  return isFunnelArrival(search) && !isWarmup(search);
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

export function postFunnelEvent(event: Exclude<FunnelEvent, "wake">) {
  if (typeof window === "undefined") return;
  const payload = funnelMessage(event);
  try {
    window.parent?.postMessage(payload, "*");
  } catch {
    /* parent may be missing or cross-origin opaque */
  }
}
