import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRoute, routeHref } from "../route.js";

const slugs = ["a"];

test("empty hash and bare slash are home", () => {
  assert.deepEqual(parseRoute("", slugs), { view: "home" });
  assert.deepEqual(parseRoute("#/", slugs), { view: "home" });
});

test("known category is a category route", () => {
  assert.deepEqual(parseRoute("#/a", slugs), { view: "category", slug: "a" });
});

test("unknown category falls back to home", () => {
  assert.deepEqual(parseRoute("#/nope", slugs), { view: "home" });
  assert.deepEqual(parseRoute("#/nope/x", slugs), { view: "home" });
});

test("category plus id is a photo route", () => {
  assert.deepEqual(parseRoute("#/a/x", slugs), { view: "photo", slug: "a", id: "x" });
});

test("routeHref is the inverse of parseRoute", () => {
  for (const hash of ["#/", "#/a", "#/a/x"]) {
    assert.equal(routeHref(parseRoute(hash, slugs)), hash);
  }
});

import { neighbours } from "../route.js";

test("neighbours finds previous and next without wrapping", () => {
  const photos = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(neighbours(photos, "b"), { index: 1, prev: photos[0], next: photos[2] });
  assert.deepEqual(neighbours(photos, "a"), { index: 0, prev: null, next: photos[1] });
  assert.deepEqual(neighbours(photos, "c"), { index: 2, prev: photos[1], next: null });
});

test("neighbours returns null for an unknown id", () => {
  assert.equal(neighbours([{ id: "a" }], "zzz"), null);
});

import { interleave } from "../route.js";

test("interleave takes one photo from each category in turn", () => {
  const categories = [
    { slug: "a", photos: [{ id: "a1" }, { id: "a2" }, { id: "a3" }] },
    { slug: "b", photos: [{ id: "b1" }] },
    { slug: "c", photos: [{ id: "c1" }, { id: "c2" }] },
  ];
  assert.deepEqual(
    interleave(categories).map((item) => `${item.slug}/${item.photo.id}`),
    ["a/a1", "b/b1", "c/c1", "a/a2", "c/c2", "a/a3"],
  );
});

test("interleave of no categories is empty", () => {
  assert.deepEqual(interleave([]), []);
});
