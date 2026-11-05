import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
const js = await readFile(new URL("../dist/app.js", import.meta.url), "utf8");

test("uses capped Bring Your Own Pollen", () => {
  assert.match(html, /<polli-connect/);
  assert.match(html, /budget="1\.5"/);
  assert.match(html, /Quest #19180/);
});

test("offers local and AI analysis without authorship claims", () => {
  assert.match(js, /localAnalyze/);
  assert.match(js, /openai\/gpt-5\.4-nano/);
  assert.match(js, /never claim to detect whether AI authored/);
});

test("ships an offline specimen and rewrite view", () => {
  assert.match(js, /In today'?s rapidly evolving digital landscape/);
  assert.match(html, /After Voiceprint/);
});

