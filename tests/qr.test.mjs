import { test } from "node:test";
import assert from "node:assert/strict";
import { qrCardSvg } from "../scripts/qr.mjs";

const url = "https://pranjalagg.github.io/artellum-gallery/";

test("card is a 1200px square svg with the url as plain text", () => {
  const svg = qrCardSvg(url);
  assert.match(svg, /^<svg[^>]*width="1200"[^>]*height="1200"/);
  assert.ok(svg.includes(">pranjalagg.github.io/artellum-gallery<"), "shows the short url without scheme or trailing slash");
  assert.ok(svg.includes(">Artellum<"));
});

test("card draws the qr modules", () => {
  assert.ok((qrCardSvg(url).match(/<rect /g) ?? []).length > 100);
});

test("url text is xml-escaped", () => {
  const svg = qrCardSvg("https://example.com/?a=1&b=<2>");
  assert.ok(svg.includes("a=1&amp;b=&lt;2&gt;"));
  assert.ok(!svg.includes("<2>"));
});
