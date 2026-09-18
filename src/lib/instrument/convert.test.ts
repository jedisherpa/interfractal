import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CONVERT_FINE_PRINT,
  CONVERT_PATH,
  CONVERT_SUCCESS,
  CONVERT_TITLE,
  convertMatterHref,
  convertSearchFromFunnel,
  deliverConvertLead,
  isConvertEmail,
  parseConvertInput,
} from "./convert.ts";
import { FUNNEL_SOURCE, parseFunnelSearch } from "./funnel.ts";

const page = readFileSync(new URL("../../components/instrument/convert-page.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../../routes/convert.tsx", import.meta.url), "utf8");
const submit = readFileSync(new URL("./convert-submit.ts", import.meta.url), "utf8");
const kitchen = [
  page,
  route,
  submit,
  readFileSync(new URL("./convert.ts", import.meta.url), "utf8"),
  readFileSync(new URL("../../components/instrument/formation-panel.tsx", import.meta.url), "utf8"),
].join("\n");

describe("convert paycheck", () => {
  it("title is Make it matter, never Checkout, and carries the goal", () => {
    assert.equal(CONVERT_TITLE, "Make it matter");
    assert.equal(CONVERT_TITLE.toLowerCase().includes("checkout"), false);
    assert.match(page, /CONVERT_TITLE/);
    assert.match(page, /data-testid="convert-title"/);
    assert.doesNotMatch(page, /Checkout/);
    assert.match(route, /CONVERT_TITLE/);

    const href = convertMatterHref("Plant trees", { from: "cloudburst", funnel: "1" });
    assert.equal(href.startsWith(CONVERT_PATH), true);
    assert.match(href, /door=matter/);
    assert.match(href, /from=cloudburst/);
    assert.match(href, /funnel=1/);
    assert.match(href, /goal=Plant(\+|%20)trees/);
    assert.equal(href.includes("stripe"), false);
    assert.equal(href.toLowerCase().includes("checkout"), false);
    assert.equal(convertMatterHref("").startsWith(`${CONVERT_PATH}?`), true);

    const search = convertSearchFromFunnel(parseFunnelSearch("?from=cloudburst&funnel=1&door=matter&goal=Hold"));
    assert.deepEqual(search, { from: "cloudburst", funnel: "1", door: "matter", goal: "Hold" });
  });

  it("fields are goal, name, email, hidden door+source — no card, Stripe, or Apple Pay", () => {
    assert.match(page, /data-testid="convert-goal"/);
    assert.match(page, /data-testid="convert-name"/);
    assert.match(page, /data-testid="convert-email"/);
    assert.match(page, /data-testid="convert-door"/);
    assert.match(page, /type="hidden"/);
    assert.match(page, /FUNNEL_SOURCE/);
    assert.match(page, /CONVERT_FINE_PRINT/);
    assert.match(page, /CONVERT_SUCCESS/);
    assert.equal(CONVERT_FINE_PRINT.includes("No charge today"), true);
    assert.equal(CONVERT_SUCCESS.includes("You’re in"), true);
    assert.doesNotMatch(page, /stripe/i);
    assert.doesNotMatch(page, /apple pay/i);
    assert.doesNotMatch(page, /card number/i);
    assert.doesNotMatch(page, /payment/i);
    assert.doesNotMatch(submit, /authMiddleware/);
    assert.doesNotMatch(submit, /sk_live|pk_live|stripe\.com/i);
  });

  it("parses the CRM payload and stubs the webhook", async () => {
    const payload = parseConvertInput({
      email: " joe@example.com ",
      name: " Joe ",
      goal: " Hold the well ",
      door: "chamber",
      source: FUNNEL_SOURCE,
    });
    assert.deepEqual(
      { email: payload.email, name: payload.name, goal: payload.goal, door: payload.door, source: payload.source },
      {
        email: "joe@example.com",
        name: "Joe",
        goal: "Hold the well",
        door: "chamber",
        source: "kyj-funnel",
      },
    );
    assert.ok(payload.ts);
    assert.equal(isConvertEmail("nope"), false);

    const logs: unknown[] = [];
    const unset = await deliverConvertLead(payload, {}, async () => {
      throw new Error("should not fetch");
    }, {
      info: (...args) => {
        logs.push(args);
      },
      warn: () => {},
    });
    assert.deepEqual(unset, { ok: true, delivered: false });
    assert.equal(logs.length, 1);

    const posted: Array<{ url: string; body: string }> = [];
    const sent = await deliverConvertLead(payload, { CONVERT_WEBHOOK_URL: "https://crm.example/hook" }, async (url, init) => {
      posted.push({ url: String(url), body: String(init && typeof init === "object" && "body" in init ? init.body : "") });
      return new Response("ok", { status: 200 });
    });
    assert.deepEqual(sent, { ok: true, delivered: true });
    assert.equal(posted[0]?.url, "https://crm.example/hook");
    const body = JSON.parse(posted[0]?.body ?? "{}") as Record<string, string>;
    assert.equal(body.email, "joe@example.com");
    assert.equal(body.door, "chamber");
    assert.equal(body.source, "kyj-funnel");

    const failed = await deliverConvertLead(payload, { CONVERT_WEBHOOK_URL: "https://crm.example/hook" }, async () => {
      return new Response("no", { status: 500 });
    }, { info: () => {}, warn: () => {} });
    assert.deepEqual(failed, { ok: true, delivered: false });
  });

  it("kitchen cell does not play or require closer voice clips", () => {
    assert.doesNotMatch(kitchen, /000009/);
    assert.doesNotMatch(kitchen, /000010/);
    assert.doesNotMatch(kitchen, /AudioContext/);
    assert.doesNotMatch(kitchen, /\.mp3/);
    assert.doesNotMatch(kitchen, /voice\/joe/);
    assert.match(kitchen, /does not play Cloudburst closer clips/);
  });
});
