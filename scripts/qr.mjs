// Printable QR card: npm run qr -- <url>  ->  qr/artellum-qr.svg and qr/artellum-qr.png
// The code hangs in a dark frame on a sage wall, with a small museum label beneath it.
// All lettering is converted to outlines from the font files in fonts/, so the card
// prints the same anywhere, with or without the fonts installed.
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import opentype from "opentype.js";
import QRCode from "qrcode";
import sharp from "sharp";

const W = 1200;
const H = 1500;
const INK = "#3a2f28";
const PAPER = "#ece7db";
const LABEL_INK = "#5a534a";
const FRAME = { x: 240, y: 270, w: 720, h: 820, border: 36 };
const CODE = { x: 340, y: 370, size: 520 };
const LABEL = { top: 1180, pad: 30, height: 190 };

function loadFont(file) {
  const buf = readFileSync(new URL(`../fonts/${file}`, import.meta.url));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}
const SIGN = loadFont("HomemadeApple-Regular.ttf");
const SERIF = loadFont("Spectral-Regular.ttf");
const SERIF_ITALIC = loadFont("Spectral-Italic.ttf");
const SERIF_BOLD = loadFont("Spectral-SemiBold.ttf");

// Written out by hand: opentype.js 2.0.0's toPathData emits NaN at some positions.
const fmt = (v) => v.toFixed(2);
function pathData(commands) {
  return commands
    .map((c) => {
      if (c.type === "M" || c.type === "L") return `${c.type}${fmt(c.x)} ${fmt(c.y)}`;
      if (c.type === "Q") return `Q${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x)} ${fmt(c.y)}`;
      if (c.type === "C") return `C${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x2)} ${fmt(c.y2)} ${fmt(c.x)} ${fmt(c.y)}`;
      return "Z";
    })
    .join("");
}

function lettering(font, text, size, x, baseline, fill, anchor = "start") {
  const left = anchor === "middle" ? x - font.getAdvanceWidth(text, size) / 2 : x;
  return `<path d="${pathData(font.getPath(text, left, baseline, size).commands)}" fill="${fill}"/>`;
}

function codeModules(url) {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
  const n = modules.size;
  const cell = CODE.size / n;
  const eye = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const out = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!modules.get(r, c) || eye(r, c)) continue;
      out.push(`<rect x="${(CODE.x + c * cell).toFixed(2)}" y="${(CODE.y + r * cell).toFixed(2)}" width="${(cell + 0.4).toFixed(2)}" height="${(cell + 0.4).toFixed(2)}"/>`);
    }
  }
  // Softened corner eyes. Their centres stay square: scanners reject round ones.
  for (const [r, c] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    const x = CODE.x + c * cell;
    const y = CODE.y + r * cell;
    out.push(`<rect x="${x}" y="${y}" width="${7 * cell}" height="${7 * cell}" rx="${cell * 0.6}"/>`);
    out.push(`<rect x="${x + cell}" y="${y + cell}" width="${5 * cell}" height="${5 * cell}" rx="${cell * 0.4}" fill="${PAPER}"/>`);
    out.push(`<rect x="${x + 2 * cell}" y="${y + 2 * cell}" width="${3 * cell}" height="${3 * cell}" rx="${cell * 0.4}"/>`);
  }
  return `<g fill="${INK}" shape-rendering="crispEdges">${out.join("")}</g>`;
}

function museumLabel() {
  const lines = [
    [SERIF_BOLD, "The rest of the collection", 30, 60, INK],
    [SERIF_ITALIC, "paint, mirror, clay and thread", 25, 105, LABEL_INK],
    [SERIF, "scan to step inside", 23, 155, LABEL_INK],
  ];
  const width = Math.max(...lines.map(([font, text, size]) => font.getAdvanceWidth(text, size))) + LABEL.pad * 2;
  const x = (W - width) / 2;
  return `<g filter="url(#hang)"><rect x="${x.toFixed(1)}" y="${LABEL.top}" width="${width.toFixed(1)}" height="${LABEL.height}" fill="#f1ede3"/></g>
${lines.map(([font, text, size, dy, fill]) => lettering(font, text, size, x + LABEL.pad, LABEL.top + dy, fill)).join("\n")}`;
}

export function qrCardSvg(url) {
  const mat = { x: FRAME.x + FRAME.border, y: FRAME.y + FRAME.border, w: FRAME.w - FRAME.border * 2, h: FRAME.h - FRAME.border * 2 };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<title>Artellum: scan to step inside</title>
<defs>
  <radialGradient id="light" cx="50%" cy="0%" r="80%"><stop offset="0" stop-color="#e2e4dc"/><stop offset="1" stop-color="#c7cbbf"/></radialGradient>
  <filter id="hang" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="22" stdDeviation="18" flood-color="#000" flood-opacity="0.35"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#light)"/>
<path d="M600 120 L330 300 M600 120 L870 300" stroke="#6b5a48" stroke-width="3" fill="none"/>
<circle cx="600" cy="118" r="11" fill="#5a4a3c"/>
<g filter="url(#hang)"><rect x="${FRAME.x}" y="${FRAME.y}" width="${FRAME.w}" height="${FRAME.h}" fill="${INK}"/></g>
<rect x="${mat.x}" y="${mat.y}" width="${mat.w}" height="${mat.h}" fill="${PAPER}"/>
${codeModules(url)}
${lettering(SIGN, "Artellum", 56, W / 2, 990, INK, "middle")}
${museumLabel()}
</svg>
`;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: npm run qr -- https://your-site-url/");
    process.exit(1);
  }
  const svg = qrCardSvg(url);
  await mkdir("qr", { recursive: true });
  await writeFile("qr/artellum-qr.svg", svg);
  await sharp(Buffer.from(svg), { density: 144 }).resize(W * 2).png().toFile("qr/artellum-qr.png");
  console.log("Wrote qr/artellum-qr.svg and qr/artellum-qr.png (2400 x 3000, print-ready)");
}
