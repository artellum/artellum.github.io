// Printable QR card: npm run qr -- <url> [photo]  ->  qr/artellum-qr.svg and qr/artellum-qr.png
// The code is painted from a photo (qr/photo.jpg by default) and hangs in a dark frame on a sage wall,
// with an italic line beneath it. All lettering is converted to outlines from the font files in fonts/,
// so the card prints the same anywhere, with or without the fonts installed.
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import QRCode from "qrcode";
import sharp from "sharp";

const W = 1200;
const H = 1500;
const INK = "#3a2f28";
const PAPER = "#ece7db";
const SOFT_INK = "#6a6358";
const FRAME = { x: 220, y: 250, w: 760, h: 860, border: 36 };
const CODE = { x: 316, y: 346, size: 568 };
const PHOTO = fileURLToPath(new URL("../qr/photo.jpg", import.meta.url));

// Each module is drawn as 3x3 round dots of the photo, with the cream mat showing between them. Only the
// middle dot carries the data: it is forced dark or light and drawn a little larger. The eight around it
// are nudged gently toward the same value (dark ones no lighter than NUDGE[0], light ones no darker than
// NUDGE[1]), which helps the code read without turning each module into one blocky pixel.
const NUDGE = [0.6, 0.4];
// Dot radius as a fraction of its third of a module.
const PHOTO_DOT = 0.5;
const DATA_DOT = 0.62;
// A short url fits in a 33-module code, which paints the photo too coarsely; 41 keeps its detail.
const MIN_VERSION = 6;

function loadFont(file) {
  const buf = readFileSync(new URL(`../fonts/${file}`, import.meta.url));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}
const SIGN = loadFont("HomemadeApple-Regular.ttf");
const SERIF_ITALIC = loadFont("Spectral-Italic.ttf");

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

const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const hex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
// Scale a colour toward black or white just enough to reach the target brightness, keeping its hue.
const darken = (c, max) => c.map((v) => v * Math.min(1, max / Math.max(lum(c), 1e-3)));
const lighten = (c, min) => c.map((v) => 255 - (255 - v) * Math.min(1, (1 - min) / Math.max(1 - lum(c), 1e-3)));

async function codeModules(url, photo) {
  const fitted = QRCode.create(url, { errorCorrectionLevel: "H" });
  const { modules } = fitted.version >= MIN_VERSION ? fitted : QRCode.create(url, { errorCorrectionLevel: "H", version: MIN_VERSION });
  const n = modules.size;
  const cell = CODE.size / n;
  const sub = cell / 3;
  const S = n * 3;
  const { data } = await sharp(photo).resize(S, S, { fit: "cover" }).modulate({ saturation: 1.3 }).linear(1.15, -12).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (i, j) => [...data.subarray((j * S + i) * 3, (j * S + i) * 3 + 3)];
  const eye = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  // Scanners need the small alignment square near the bottom-right drawn solid, like the eyes.
  const align = (r, c) => Math.abs(r - (n - 7)) <= 2 && Math.abs(c - (n - 7)) <= 2;
  const out = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (eye(r, c) || align(r, c)) continue;
      const dark = modules.get(r, c);
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
          const col = px(c * 3 + i, r * 3 + j);
          const data = i === 1 && j === 1;
          const fill = data ? (dark ? darken(col, 0.2) : lighten(col, 0.86)) : dark ? darken(col, NUDGE[0]) : lighten(col, NUDGE[1]);
          out.push(`<circle cx="${fmt(CODE.x + c * cell + (i + 0.5) * sub)}" cy="${fmt(CODE.y + r * cell + (j + 0.5) * sub)}" r="${fmt(sub * (data ? DATA_DOT : PHOTO_DOT))}" fill="${hex(fill)}"/>`);
        }
      }
    }
  }
  // Softened corner eyes. Their centres stay square: scanners reject round ones.
  for (const [r, c] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    const x = CODE.x + c * cell;
    const y = CODE.y + r * cell;
    out.push(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(7 * cell)}" height="${fmt(7 * cell)}" rx="${fmt(cell * 0.96)}" fill="${INK}"/>`);
    out.push(`<rect x="${fmt(x + cell)}" y="${fmt(y + cell)}" width="${fmt(5 * cell)}" height="${fmt(5 * cell)}" rx="${fmt(cell * 0.66)}" fill="${PAPER}"/>`);
    out.push(`<rect x="${fmt(x + 2 * cell)}" y="${fmt(y + 2 * cell)}" width="${fmt(3 * cell)}" height="${fmt(3 * cell)}" rx="${fmt(cell * 0.4)}" fill="${INK}"/>`);
  }
  const ax = CODE.x + (n - 9) * cell;
  const ay = CODE.y + (n - 9) * cell;
  out.push(`<rect x="${fmt(ax)}" y="${fmt(ay)}" width="${fmt(5 * cell)}" height="${fmt(5 * cell)}" rx="${fmt(cell * 0.35)}" fill="${INK}"/>`);
  out.push(`<rect x="${fmt(ax + cell)}" y="${fmt(ay + cell)}" width="${fmt(3 * cell)}" height="${fmt(3 * cell)}" rx="${fmt(cell * 0.2)}" fill="${PAPER}"/>`);
  out.push(`<rect x="${fmt(ax + 2 * cell)}" y="${fmt(ay + 2 * cell)}" width="${fmt(cell)}" height="${fmt(cell)}" fill="${INK}"/>`);
  return `<g>${out.join("")}</g>`;
}

// Centred italic lines straight on the wall: one larger line, then two quieter ones.
function caption() {
  const lines = [
    ["scan to see the rest of the collection", 50, 1235, INK],
    // ["paint, mirror, clay and thread", 38, 1305, SOFT_INK],
    // ["scan to step inside", 38, 1360, SOFT_INK],
  ];
  return lines.map(([text, size, baseline, fill]) => lettering(SERIF_ITALIC, text, size, W / 2, baseline, fill, "middle")).join("\n");
}

export async function qrCardSvg(url, photo = PHOTO) {
  const mat = { x: FRAME.x + FRAME.border, y: FRAME.y + FRAME.border, w: FRAME.w - FRAME.border * 2, h: FRAME.h - FRAME.border * 2 };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<title>Artellum: scan to step inside</title>
<defs>
  <radialGradient id="light" cx="50%" cy="0%" r="80%"><stop offset="0" stop-color="#e2e4dc"/><stop offset="1" stop-color="#c7cbbf"/></radialGradient>
  <filter id="hang" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="22" stdDeviation="18" flood-color="#000" flood-opacity="0.35"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#light)"/>
<path d="M600 110 L310 280 M600 110 L890 280" stroke="#6b5a48" stroke-width="3" fill="none"/>
<circle cx="600" cy="108" r="11" fill="#5a4a3c"/>
<g filter="url(#hang)"><rect x="${FRAME.x}" y="${FRAME.y}" width="${FRAME.w}" height="${FRAME.h}" fill="${INK}"/></g>
<rect x="${mat.x}" y="${mat.y}" width="${mat.w}" height="${mat.h}" fill="${PAPER}"/>
${await codeModules(url, photo)}
${lettering(SIGN, "Artellum", 52, W / 2, 1010, INK, "middle")}
${caption()}
</svg>
`;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  const [url, photo] = process.argv.slice(2);
  if (!url) {
    console.error("Usage: npm run qr -- https://your-site-url/ [photo.jpg]");
    process.exit(1);
  }
  const svg = await qrCardSvg(url, photo);
  await mkdir("qr", { recursive: true });
  await writeFile("qr/artellum-qr.svg", svg);
  await sharp(Buffer.from(svg), { density: 144 }).resize(W * 2).png().toFile("qr/artellum-qr.png");
  console.log("Wrote qr/artellum-qr.svg and qr/artellum-qr.png (2400 x 3000, print-ready)");
}
