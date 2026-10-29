// Printable QR card: npm run qr -- <url>  ->  qr/artellum-qr.svg and qr/artellum-qr.png
import { mkdir, writeFile } from "node:fs/promises";
import QRCode from "qrcode";
import sharp from "sharp";

const SIZE = 1200;
const PANEL = { x: 190, y: 230, size: 820, pad: 50 };
const escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function qrCardSvg(url) {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
  const inner = PANEL.size - PANEL.pad * 2;
  const cell = inner / modules.size;
  const rects = [];
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (!modules.get(row, col)) continue;
      const x = (PANEL.x + PANEL.pad + col * cell).toFixed(2);
      const y = (PANEL.y + PANEL.pad + row * cell).toFixed(2);
      rects.push(`<rect x="${x}" y="${y}" width="${(cell + 0.4).toFixed(2)}" height="${(cell + 0.4).toFixed(2)}"/>`);
    }
  }
  const shortUrl = escapeXml(url.replace(/^https?:\/\//, "").replace(/\/$/, ""));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
<rect width="${SIZE}" height="${SIZE}" fill="#e9e8e2"/>
<text x="${SIZE / 2}" y="170" text-anchor="middle" font-family="'Homemade Apple', Georgia, serif" font-style="italic" font-size="96" fill="#2c2a25">Artellum</text>
<rect x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.size}" height="${PANEL.size}" rx="12" fill="#ffffff"/>
<g fill="#2c2a25" shape-rendering="crispEdges">${rects.join("")}</g>
<text x="${SIZE / 2}" y="1110" text-anchor="middle" font-family="Karla, Helvetica, Arial, sans-serif" font-size="40" fill="#4a473f">${shortUrl}</text>
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
  await sharp(Buffer.from(svg)).png().toFile("qr/artellum-qr.png");
  console.log("Wrote qr/artellum-qr.svg and qr/artellum-qr.png");
}
