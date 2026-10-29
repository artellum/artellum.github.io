// Builds the sample photos into .preview/ with the page files and serves it. The committed site is untouched.
import { copyFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { build } from "./build.mjs";

const DIR = path.resolve(".preview");
const PORT = Number(process.env.PORT) || 4173;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".jpg": "image/jpeg" };

if (!existsSync(".samples/originals")) {
  console.error("No sample photos yet. Run: npm run samples");
  process.exit(1);
}
const report = await build({ src: ".samples/originals", out: DIR, categoriesFile: "categories.json" });
for (const w of report.warnings) console.warn(`Skipped ${w}`);
for (const page of ["index.html", "style.css", "app.js", "route.js"]) {
  if (existsSync(page)) await copyFile(page, path.join(DIR, page));
}

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const file = path.join(DIR, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname));
  if (!file.startsWith(DIR + path.sep) || !existsSync(file)) {
    res.writeHead(404).end("Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Preview: http://localhost:${PORT}`));
