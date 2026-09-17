import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CLOUD6_HREF,
  FUNNEL_SOURCE,
  FUNNEL_VERSION,
  KYJ_ORIGIN,
  funnelMessage,
  isAllowedFunnelParentOrigin,
  isFunnelArrival,
  isFunnelMessage,
  isWarmup,
  parseFunnelSearch,
  postFunnelEvent,
  resolveFunnelParentOrigin,
  shouldHoldRenderer,
  shouldSkipIntro,
  tokenOn,
} from "./funnel.ts";

const app = readFileSync(new URL("../../components/instrument/app.tsx", import.meta.url), "utf8");
const rail = readFileSync(new URL("../../components/instrument/close-rail.tsx", import.meta.url), "utf8");
const firstPage = readFileSync(new URL("../../components/instrument/first-page.tsx", import.meta.url), "utf8");

describe("funnel query contract", () => {
  it("from=cloudburst or funnel=1 skips Light/Whole when not warming", () => {
    assert.equal(shouldSkipIntro(parseFunnelSearch("?from=cloudburst&funnel=1")), true);
    assert.equal(shouldSkipIntro(parseFunnelSearch("from=cloudburst")), true);
    assert.equal(shouldSkipIntro(parseFunnelSearch({ funnel: "1" })), true);
    assert.equal(shouldSkipIntro(parseFunnelSearch({ funnel: 1 })), true);
    assert.equal(isFunnelArrival(parseFunnelSearch("?from=cloudburst&funnel=1")), true);
  });

  it("tokenOn accepts 1, \"1\", true, \"true\", and JSON-quoted \"%221%22\"", () => {
    assert.equal(tokenOn(1), true);
    assert.equal(tokenOn("1"), true);
    assert.equal(tokenOn(true), true);
    assert.equal(tokenOn("true"), true);
    assert.equal(tokenOn('"1"'), true);
    assert.equal(tokenOn("%221%22"), true);
    assert.equal(tokenOn('"true"'), true);
    assert.equal(tokenOn(0), false);
    assert.equal(tokenOn("0"), false);
    assert.equal(tokenOn(false), false);
    assert.equal(tokenOn("no"), false);
  });

  it("quoted from/funnel from a poisoned Continue still skip Light/Whole", () => {
    const encoded = parseFunnelSearch("?from=%22cloudburst%22&funnel=%221%22");
    assert.deepEqual(encoded, { from: "cloudburst", funnel: "1" });
    assert.equal(shouldSkipIntro(encoded), true);

    const quoted = parseFunnelSearch('?from="cloudburst"&funnel="1"');
    assert.equal(quoted.from, "cloudburst");
    assert.equal(quoted.funnel, "1");
    assert.equal(shouldSkipIntro(quoted), true);

    assert.equal(shouldSkipIntro(parseFunnelSearch({ from: '"cloudburst"', funnel: '"1"' })), true);
    assert.equal(shouldSkipIntro(parseFunnelSearch({ from: "cloudburst", funnel: '"1"' })), true);
    assert.equal(parseFunnelSearch({ from: '"cloudburst"' }).from, "cloudburst");
    assert.equal(isFunnelArrival(parseFunnelSearch({ from: '"cloudburst"' })), true);
  });

  it("warmup=1 parses and holds the renderer", () => {
    const warm = parseFunnelSearch("?from=cloudburst&funnel=1&warmup=1");
    assert.equal(isWarmup(warm), true);
    assert.equal(shouldHoldRenderer(warm), true);
    assert.equal(shouldSkipIntro(warm), false);
    assert.equal(shouldHoldRenderer(parseFunnelSearch({ warmup: "1" })), true);
    assert.equal(shouldHoldRenderer(parseFunnelSearch({ warmup: '"1"' })), true);
    assert.equal(shouldHoldRenderer(parseFunnelSearch("?warmup=%221%22")), true);
  });

  it("no funnel params keep today’s intro", () => {
    const empty = parseFunnelSearch("");
    const stray = parseFunnelSearch("?from=kyj");
    assert.deepEqual(empty, {});
    assert.equal(isFunnelArrival(empty), false);
    assert.equal(shouldSkipIntro(empty), false);
    assert.equal(shouldHoldRenderer(empty), false);
    assert.equal(isFunnelArrival(stray), false);
    assert.equal(shouldSkipIntro(stray), false);
  });

  it("does not invent a checkout URL; Cloud 6 is boulderjoe.com", () => {
    assert.equal(CLOUD6_HREF, "https://boulderjoe.com");
    assert.equal(CLOUD6_HREF.includes("stripe"), false);
    assert.equal(CLOUD6_HREF.includes("checkout"), false);
  });

  it("close-ready postMessage matches the KYJ contract", () => {
    const ready = funnelMessage("close-ready");
    assert.deepEqual(ready, { source: FUNNEL_SOURCE, version: FUNNEL_VERSION, event: "close-ready" });
    assert.equal(isFunnelMessage(ready, "close-ready"), true);
    assert.equal(isFunnelMessage({ source: "other", version: 1, event: "close-ready" }), false);
    assert.equal(isFunnelMessage({ source: FUNNEL_SOURCE, version: 1, event: "wake" }, "wake"), true);
  });

  it("funnel boot reuses skipIntro and does not invent a second lander", () => {
    assert.match(app, /instrument\.skipIntro\(\)/);
    assert.equal((app.match(/landInRoom/g) ?? []).length, 0);
    assert.match(app, /holdRenderer/);
    assert.match(firstPage, />Light</);
    assert.match(firstPage, />Whole</);
    assert.match(firstPage, /Skip intro/);
  });

  it("close rail labels later-exits without a fake payment URL", () => {
    assert.match(rail, /Checkout — later/);
    assert.match(rail, /disabled/);
    assert.equal(rail.includes("http"), false);
    assert.match(rail, /Cloud 6 — later/);
    assert.match(rail, /CLOUD6_HREF/);
    assert.match(rail, /target="_blank"/);
    assert.match(rail, /rel="noopener"/);
    assert.equal(rail.includes("stripe"), false);
    assert.match(rail, /Geometry is not permission/);
    assert.match(rail, /EVIDENCE_STAMP/);
  });

  it("postMessage never uses target origin * and only sends to the allowlist", () => {
    const source = readFileSync(new URL("./funnel.ts", import.meta.url), "utf8");
    assert.match(source, /keep-your-judgment\.vercel\.app/);
    assert.doesNotMatch(source, /postMessage\([^)]*,\s*["']\*["']\)/);

    assert.equal(isAllowedFunnelParentOrigin(KYJ_ORIGIN), true);
    assert.equal(isAllowedFunnelParentOrigin("http://localhost:5173"), true);
    assert.equal(isAllowedFunnelParentOrigin("http://127.0.0.1:8080"), true);
    assert.equal(isAllowedFunnelParentOrigin("https://evil.example"), false);
    assert.equal(isAllowedFunnelParentOrigin("https://cloudburst-2.vercel.app"), false);

    const sent: Array<{ data: unknown; origin: string }> = [];
    const parent = {
      postMessage(data: unknown, origin: string) {
        sent.push({ data, origin });
      },
    };

    const kyjHost = {
      parent,
      location: { ancestorOrigins: [KYJ_ORIGIN] },
      document: { referrer: `${KYJ_ORIGIN}/` },
    };
    assert.equal(resolveFunnelParentOrigin(kyjHost), KYJ_ORIGIN);
    postFunnelEvent("close-ready", kyjHost);
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.origin, KYJ_ORIGIN);
    assert.deepEqual(sent[0]?.data, funnelMessage("close-ready"));

    const localHost = {
      parent,
      location: { ancestorOrigins: ["http://127.0.0.1:4173"] },
    };
    postFunnelEvent("stage-ready", localHost);
    assert.equal(sent[1]?.origin, "http://127.0.0.1:4173");

    const unknown = {
      parent,
      location: { ancestorOrigins: ["https://evil.example"] },
      document: { referrer: "https://evil.example/embed" },
    };
    assert.equal(resolveFunnelParentOrigin(unknown), null);
    postFunnelEvent("close-ready", unknown);
    assert.equal(sent.length, 2);

    const topLevel = { parent: undefined as undefined, document: { referrer: KYJ_ORIGIN } };
    postFunnelEvent("close-ready", topLevel);
    assert.equal(sent.length, 2);
  });
});
