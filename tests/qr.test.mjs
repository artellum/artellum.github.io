import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import jsQR from "jsqr";
import { qrCardSvg } from "../scripts/qr.mjs";

const url = "https://pranjalagg.github.io/artellum-gallery/";
const svg = qrCardSvg(url);

test("card is a 1200 by 1500 svg", () => {
  assert.match(svg, /^<svg[^>]*width="1200"[^>]*height="1500"/);
});

test("no web address is printed on the card", () => {
  assert.ok(!svg.includes("pranjalagg"));
  assert.ok(!svg.includes("github.io"));
});

test("all lettering is drawn as outlines, so it prints without the fonts installed", () => {
  assert.ok(!svg.includes("<text"));
  assert.ok((svg.match(/<path /g) ?? []).length >= 4, "wordmark and three label lines");
});

test("card has a readable title for screen readers", () => {
  assert.ok(svg.includes("<title>Artellum: scan to step inside</title>"));
});

test("the rendered card scans back to the url, even small and slightly blurred", async () => {
  for (const [width, blur] of [[900, 0], [400, 1.2]]) {
    let img = sharp(Buffer.from(svg)).resize(width);
    if (blur) img = img.blur(blur);
    const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data, url, `at ${width}px`);
  }
});

test("lettering outlines contain only real numbers", () => {
  // opentype.js 2.0.0's toPathData emits NaN at some positions, which cuts letters off.
  assert.ok(!svg.includes("NaN"));
});

test("the lines under the frame sit on the wall, with no label card", () => {
  assert.equal((svg.match(/filter="url\(#hang\)"/g) ?? []).length, 1, "only the frame casts a shadow");
});
