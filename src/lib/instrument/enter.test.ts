import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { WorkshopDirector } from "../../workshop/director.ts";

const store = readFileSync(new URL("./store.ts", import.meta.url), "utf8");

describe("looking does not Explore", () => {
  it("pressEnter, skipIntro, and setWorld never call explore", () => {
    assert.match(store, /pressEnter:/);
    assert.match(store, /Camera did not Explore/);
    assert.match(store, /skipIntro: \(\) => \{\n    const s = get\(\);\n    landInRoom/);
    assert.equal((store.match(/director\.explore/g) ?? []).length, 0);
  });

  it("a fresh director has not Explored", () => {
    const dir = new WorkshopDirector();
    assert.equal(dir.at("V0").explored, false);
    assert.equal(dir.displayMatchesProtocol("V0"), false);
  });
});
