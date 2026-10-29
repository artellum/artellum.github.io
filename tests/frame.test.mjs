import { test } from "node:test";
import assert from "node:assert/strict";
import { frameColour } from "../scripts/frame.mjs";

function hsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { s, l };
}

const teal = { r: 40, g: 140, b: 150 };

test("returns a #rrggbb colour", () => {
  assert.match(frameColour({ dominant: teal, luminance: 0.5 }), /^#[0-9a-f]{6}$/);
});

test("a dark photo gets a muted light frame, never close to white", () => {
  const { l } = hsl(frameColour({ dominant: teal, luminance: 0.15 }));
  assert.ok(l > 0.6 && l < 0.85, `lightness ${l}`);
});

test("a bright photo gets a dark frame", () => {
  const { l } = hsl(frameColour({ dominant: teal, luminance: 0.7 }));
  assert.ok(l < 0.3, `lightness ${l}`);
});

test("frames are muted even for a vivid dominant colour", () => {
  const vivid = { r: 255, g: 0, b: 0 };
  for (const luminance of [0.1, 0.8]) {
    assert.ok(hsl(frameColour({ dominant: vivid, luminance })).s <= 0.31);
  }
});

test("a neutral grey photo gets a warm frame, not a cold grey", () => {
  const hex = frameColour({ dominant: { r: 120, g: 120, b: 120 }, luminance: 0.15 });
  const [r, , b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  assert.ok(r > b, hex);
});
