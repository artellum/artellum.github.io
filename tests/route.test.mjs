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
