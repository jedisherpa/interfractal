/**
 * Paycheck convert — Interfractal owns this surface.
 * Kitchen / chamber cell does not play Cloudburst closer clips.
 * Spoken lines live in Cloudburst. This page never charges.
 */

import {
  FUNNEL_SOURCE,
  type FunnelDoor,
  type FunnelSearch,
} from "./funnel.ts";

export const CONVERT_TITLE = "Make it matter";
export const CONVERT_FINE_PRINT = "No charge today. This holds your place. We’ll send the next step.";
export const CONVERT_SUCCESS = "You’re in. Check your email.";
export const CONVERT_PATH = "/convert";

export type ConvertPayload = {
  email: string;
  name: string;
  goal: string;
  door: FunnelDoor;
  source: typeof FUNNEL_SOURCE;
  ts: string;
};

export type ConvertResult = {
  ok: true;
  delivered: boolean;
};

export type ConvertEnv = {
  CONVERT_WEBHOOK_URL?: string;
};

export type ConvertLogger = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isConvertEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Same destination as the Gate 2 primary. Still no charge. */
export function convertMatterHref(goal = "", search: FunnelSearch = {}): string {
  const params = new URLSearchParams();
  if (search.from) params.set("from", search.from);
  if (search.funnel) params.set("funnel", search.funnel);
  params.set("door", "matter");
  const trimmed = goal.trim();
  if (trimmed) params.set("goal", trimmed);
  return `${CONVERT_PATH}?${params.toString()}`;
}

export function convertSearchFromFunnel(search: FunnelSearch): {
  from: string | undefined;
  funnel: string | undefined;
  door: FunnelDoor;
  goal: string | undefined;
} {
  return {
    from: search.from,
    funnel: search.funnel,
    door: search.door === "chamber" ? "chamber" : "matter",
    goal: search.goal,
  };
}

export function parseConvertInput(input: unknown): ConvertPayload {
  if (!input || typeof input !== "object") {
    throw new Error("Name a goal and leave an email.");
  }
  const body = input as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const goal = typeof body.goal === "string" ? body.goal.trim() : "";
  const door = body.door === "chamber" || body.door === "matter" ? body.door : "matter";
  const source = FUNNEL_SOURCE;
  const ts = typeof body.ts === "string" && body.ts.trim() ? body.ts.trim() : new Date().toISOString();
  if (!goal) throw new Error("Name a goal first.");
  if (!name) throw new Error("Leave a name.");
  if (!isConvertEmail(email)) throw new Error("Leave a working email.");
  return { email, name, goal, door, source, ts };
}

/**
 * Stub CRM. POST JSON to CONVERT_WEBHOOK_URL when set.
 * Unset or failed delivery still returns ok so the success UI can stand.
 */
export async function deliverConvertLead(
  payload: ConvertPayload,
  env: ConvertEnv = {},
  fetchFn: typeof fetch = fetch,
  log: ConvertLogger = console,
): Promise<ConvertResult> {
  const url = env.CONVERT_WEBHOOK_URL?.trim();
  const body = parseConvertInput(payload);
  if (!url) {
    log.info("[convert] webhook unset; local log", body);
    return { ok: true, delivered: false };
  }
  try {
    const res = await fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      log.warn("[convert] webhook failed", res.status);
      return { ok: true, delivered: false };
    }
    return { ok: true, delivered: true };
  } catch (err) {
    log.warn("[convert] webhook error", err);
    return { ok: true, delivered: false };
  }
}
