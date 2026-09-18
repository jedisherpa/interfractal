import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CLOUD6_HREF,
  FUNNEL_GOAL_STORAGE_KEY,
  FUNNEL_SOURCE,
  FUNNEL_VERSION,
  KYJ_ORIGIN,
  funnelMessage,
  isAllowedFunnelParentOrigin,
  isFunnelArrival,
  isFunnelChamberCell,
  isFunnelMessage,
  isMatterDoor,
  isWarmup,
  parseFunnelSearch,
  postFunnelEvent,
  readCarriedGoal,
  resolveFunnelParentOrigin,
  shouldHoldRenderer,
  shouldSkipIntro,
  showMakeItMatterChip,
  tokenOn,
  writeCarriedGoal,
} from "./funnel.ts";

const app = readFileSync(new URL("../../components/instrument/app.tsx", import.meta.url), "utf8");
const rail = readFileSync(new URL("../../components/instrument/close-rail.tsx", import.meta.url), "utf8");
const panel = readFileSync(new URL("../../components/instrument/formation-panel.tsx", import.meta.url), "utf8");
const firstPage = readFileSync(new URL("../../components/instrument/first-page.tsx", import.meta.url), "utf8");
const index = readFileSync(new URL("../../routes/index.tsx", import.meta.url), "utf8");

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

  it("accepts inbound door=chamber|matter from Cloudburst (quoted tokens unwrap)", () => {
    const chamber = parseFunnelSearch("?from=cloudburst&funnel=1&door=chamber");
    assert.deepEqual(chamber, { from: "cloudburst", funnel: "1", door: "chamber" });
    assert.equal(isFunnelArrival(chamber), true);
    assert.equal(shouldSkipIntro(chamber), true);
    assert.equal(isFunnelChamberCell(chamber), true);
    assert.equal(isMatterDoor(chamber), false);

    const matter = parseFunnelSearch("?from=cloudburst&funnel=1&door=matter");
    assert.equal(isMatterDoor(matter), true);
    assert.equal(isFunnelChamberCell(matter), false);
    assert.equal(shouldSkipIntro(matter), false);

    const quoted = parseFunnelSearch('?from="cloudburst"&funnel="1"&door="chamber"');
    assert.equal(quoted.door, "chamber");
    assert.equal(isFunnelChamberCell(quoted), true);

    const encoded = parseFunnelSearch("?from=%22cloudburst%22&funnel=%221%22&door=%22matter%22");
    assert.equal(encoded.door, "matter");
    assert.equal(isMatterDoor(encoded), true);

    assert.equal(isFunnelChamberCell(parseFunnelSearch({ from: "cloudburst", funnel: "1" })), false);
    assert.equal(isFunnelChamberCell(parseFunnelSearch("?door=chamber")), false);
    assert.equal(index.includes("door: raw.door"), true);
    assert.equal(index.includes("goal: raw.goal"), true);
    assert.match(index, /isMatterDoor/);
    assert.match(index, /\/convert/);
  });

  it("carries a named goal via ?goal= and sessionStorage", () => {
    const planted = parseFunnelSearch("?from=cloudburst&funnel=1&door=chamber&goal=Plant%20trees");
    assert.equal(planted.goal, "Plant trees");
    assert.equal(parseFunnelSearch({ goal: '"Plant"' }).goal, "Plant");

    const store = new Map<string, string>();
    const memory = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
    assert.equal(readCarriedGoal(memory, planted.goal), "Plant trees");
    writeCarriedGoal("  Hold the well  ", memory);
    assert.equal(store.get(FUNNEL_GOAL_STORAGE_KEY), "Hold the well");
    assert.equal(readCarriedGoal(memory), "Hold the well");
    writeCarriedGoal("   ", memory);
    assert.equal(store.has(FUNNEL_GOAL_STORAGE_KEY), false);

    assert.match(app, /readCarriedGoal/);
    assert.match(app, /setFormGoal/);
    assert.match(panel, /placeholder="Name a goal"/);
    assert.match(panel, /Set this goal/);
  });

  it("chamber cell hides Gold, Not a fit, Weather, lodge, seat Yes, and Checkout — later", () => {
    assert.match(panel, /isFunnelChamberCell/);
    assert.match(panel, /const walk = !chamber/);
    assert.match(panel, /Preferred lodge/);
    assert.match(panel, /seat-yes-/);
    assert.match(panel, /table-gold/);
    assert.match(panel, /not-a-fit/);
    assert.match(panel, /weather/);
    assert.match(panel, /walk && sitting/);
    assert.match(panel, /walk && \(sitting \|\| committed\)/);
    assert.match(panel, /EVIDENCE_STAMP/);

    assert.match(rail, /isFunnelChamberCell/);
    assert.match(rail, /chamber \? null/);
    assert.match(rail, /Checkout — later/);
    assert.equal(rail.includes("stripe"), false);
    assert.doesNotMatch(rail, /apple pay/i);
  });

  it("Make it matter after Commit is optional and still no charge", () => {
    const cell = parseFunnelSearch("?from=cloudburst&funnel=1&door=chamber");
    assert.equal(showMakeItMatterChip(cell, true, "Plant"), true);
    assert.equal(showMakeItMatterChip(cell, true, "   "), false);
    assert.equal(showMakeItMatterChip(cell, false, "Plant"), false);
    assert.equal(showMakeItMatterChip(parseFunnelSearch("?from=cloudburst&funnel=1"), true, "Plant"), false);
    assert.match(panel, /Make it matter/);
    assert.match(panel, /convertMatterHref/);
    assert.match(panel, /No charge today/);
    assert.equal(panel.includes("stripe"), false);
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
