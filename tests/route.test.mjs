import { test } from "node:test";
import assert from "node:assert/strict";
import { bookPages, pageIndex, parseRoute, routeHref } from "../route.js";

const slugs = ["a"];

test("empty hash and bare slash are the closed cover", () => {
  assert.deepEqual(parseRoute("", slugs), { view: "cover" });
  assert.deepEqual(parseRoute("#/", slugs), { view: "cover" });
});

test("known category is a category route", () => {
  assert.deepEqual(parseRoute("#/a", slugs), { view: "category", slug: "a" });
});

test("unknown category falls back to the cover", () => {
  assert.deepEqual(parseRoute("#/nope", slugs), { view: "cover" });
  assert.deepEqual(parseRoute("#/nope/x", slugs), { view: "cover" });
});

test("category plus id is a photo route", () => {
  assert.deepEqual(parseRoute("#/a/x", slugs), { view: "photo", slug: "a", id: "x" });
});

test("contents and end are pages of their own", () => {
  assert.deepEqual(parseRoute("#/contents", slugs), { view: "contents" });
  assert.deepEqual(parseRoute("#/end", slugs), { view: "end" });
  assert.deepEqual(parseRoute("#/contents/x", slugs), { view: "cover" });
});

test("a category named contents wins over the contents page", () => {
  assert.deepEqual(parseRoute("#/contents", ["contents"]), { view: "category", slug: "contents" });
});

test("routeHref is the inverse of parseRoute", () => {
  for (const hash of ["#/", "#/a", "#/a/x", "#/contents", "#/end"]) {
    assert.equal(routeHref(parseRoute(hash, slugs)), hash);
  }
});

const categories = [
  { slug: "a", photos: [{ id: "1" }, { id: "2" }] },
  { slug: "b", photos: [{ id: "1" }] },
];

test("bookPages runs contents, each chapter with its plates, then the end", () => {
  assert.deepEqual(
    bookPages(categories).map((page) => [page.view, page.slug, page.id, page.plate].filter(Boolean).join(" ")),
    ["contents", "category a", "photo a 1 1", "photo a 2 2", "category b", "photo b 1 3", "end"],
  );
});

test("pageIndex finds every route and tells apart the same photo id in different categories", () => {
  const pages = bookPages(categories);
  assert.equal(pageIndex(pages, { view: "contents" }), 0);
  assert.equal(pageIndex(pages, { view: "category", slug: "b" }), 4);
  assert.equal(pageIndex(pages, { view: "photo", slug: "a", id: "1" }), 2);
  assert.equal(pageIndex(pages, { view: "photo", slug: "b", id: "1" }), 5);
  assert.equal(pageIndex(pages, { view: "end" }), 6);
});

test("pageIndex is -1 for the cover and for photos not in the book", () => {
  const pages = bookPages(categories);
  assert.equal(pageIndex(pages, { view: "cover" }), -1);
  assert.equal(pageIndex(pages, { view: "photo", slug: "a", id: "zzz" }), -1);
});

test("bookPages of no categories is just contents and the end", () => {
  assert.deepEqual(bookPages([]).map((page) => page.view), ["contents", "end"]);
});
