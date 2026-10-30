import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import jsQR from "jsqr";
import { qrCardSvg } from "../scripts/qr.mjs";

const url = "https://artellum.github.io/";
const svg = await qrCardSvg(url);

test("card is a 1200 by 1500 svg", () => {
  assert.match(svg, /^<svg[^>]*width="1200"[^>]*height="1500"/);
});

test("the code is painted from a photo, in its colours", () => {
  const colours = new Set(svg.match(/fill="#[0-9a-f]{6}"/g));
  assert.ok(colours.size > 500, `only ${colours.size} colours`);
});

test("a short url still gets 41 modules across, so the photo keeps its detail", () => {
  // 41 x 41 modules, less the three eyes and the alignment square, at nine dots each.
  const dots = (svg.match(/<circle /g) ?? []).length;
  assert.ok(dots >= (41 * 41 - 3 * 49 - 25) * 9, `${dots} dots`);
});

test("the photo is drawn in round dots, each data dot a little larger than the eight around it", () => {
  const radii = {};
  for (const [, r] of svg.matchAll(/<circle [^>]*r="([\d.]+)"/g)) radii[r] = (radii[r] ?? 0) + 1;
  const [photo, data] = Object.entries(radii).sort((a, b) => b[1] - a[1]);
  assert.equal(photo[1], data[1] * 8, "eight photo dots around each data dot");
  assert.ok(Number(data[0]) > Number(photo[0]), "data dots are larger");
});

test("no web address is printed on the card", () => {
  assert.ok(!svg.includes("pranjalagg"));
  assert.ok(!svg.includes("github.io"));
});

test("all lettering is drawn as outlines, so it prints without the fonts installed", () => {
  assert.ok(!svg.includes("<text"));
  assert.ok((svg.match(/<path /g) ?? []).length >= 2, "wordmark and caption");
});

test("card has a readable title for screen readers", () => {
  assert.ok(svg.includes("<title>Artellum: scan to step inside</title>"));
});

test("the rendered card scans back to the url, even small and slightly blurred", async () => {
  // A camera always softens a little. jsQR misreads the dots in a perfectly sharp render, which Apple's
  // Vision scanner reads fine, so each size is blurred at least as much as a phone photo would be.
  for (const [width, blur] of [[800, 1], [450, 1.2]]) {
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
