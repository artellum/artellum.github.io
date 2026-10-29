import { test } from "node:test";
import assert from "node:assert/strict";
import {
  titleFromFilename,
  slugify,
  categoryLabel,
  orderCategories,
} from "../scripts/names.mjs";

test("titleFromFilename drops extension and capitalises first letter", () => {
  assert.equal(titleFromFilename("before-the-rain.JPG"), "Before the rain");
  assert.equal(titleFromFilename("a_b-c.png"), "A b c");
});

test("slugify lowercases and collapses separators", () => {
  assert.equal(slugify("Tea Lights!"), "tea-lights");
  assert.equal(slugify("  --Fridge  Magnets--"), "fridge-magnets");
});

test("categoryLabel prefers configured names", () => {
  assert.equal(categoryLabel("tea-lights", {}), "Tea lights");
  assert.equal(categoryLabel("tea-lights", { "tea-lights": "Tea Lights ✦" }), "Tea Lights ✦");
});

test("orderCategories puts listed slugs first, rest alphabetical", () => {
  assert.deepEqual(orderCategories(["z", "a", "m"], ["m", "nope"]), ["m", "a", "z"]);
});
