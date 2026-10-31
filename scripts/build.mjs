import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { frameColour } from "./frame.mjs";
import { categoryLabel, colourFromFilename, orderCategories, slugify, titleFromFilename, titleFromName } from "./names.mjs";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);
const LARGE_EDGE = 1600;
const THUMB_WIDTH = 600;
const QUALITY = 80;

async function readCategoriesFile(file) {
  if (!file || !existsSync(file)) return { order: [], names: {} };
  const parsed = JSON.parse(await readFile(file, "utf8"));
  return { order: parsed.order ?? [], names: parsed.names ?? {} };
}

const visibleEntries = async (dir) =>
  (await readdir(dir, { withFileTypes: true })).filter((e) => !e.name.startsWith(".")).sort((a, b) => a.name.localeCompare(b.name));

const isPhoto = (entry) => entry.isFile() && IMAGE_EXTS.has(path.extname(entry.name).toLowerCase());

function uniqueId(used, name) {
  const stem = slugify(name) || "photo";
  let id = stem;
  for (let n = 2; used.has(id); n++) id = `${stem}-${n}`;
  used.add(id);
  return id;
}

async function isFresh(source, outputs) {
  if (!outputs.every(existsSync)) return false;
  const srcTime = (await stat(source)).mtimeMs;
  return (await Promise.all(outputs.map((o) => stat(o)))).every((s) => s.mtimeMs >= srcTime);
}

// sharp's prebuilt libvips cannot read HEIC (iPhone photos); macOS can convert them with sips.
async function decodableInput(file) {
  if (!/\.(heic|heif)$/i.test(file)) return { input: file, cleanup: async () => {} };
  if (process.platform !== "darwin") throw new Error("HEIC photos need converting to JPEG first (only macOS can do it automatically)");
  const dir = await mkdtemp(path.join(tmpdir(), "heic-"));
  const jpg = path.join(dir, "converted.jpg");
  execFileSync("sips", ["-s", "format", "jpeg", file, "--out", jpg], { stdio: "ignore" });
  return { input: jpg, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

async function resizeBoth(file, largePath, thumbPath) {
  const { input, cleanup } = await decodableInput(file);
  try {
    const jpeg = { quality: QUALITY, progressive: true };
    await sharp(input).rotate().resize({ width: LARGE_EDGE, height: LARGE_EDGE, fit: "inside", withoutEnlargement: true }).jpeg(jpeg).toFile(largePath);
    await sharp(input).rotate().resize({ width: THUMB_WIDTH, withoutEnlargement: true }).jpeg(jpeg).toFile(thumbPath);
  } finally {
    await cleanup();
  }
}

// Read from the thumbnail on every run, so frames stay correct for photos that were skipped as unchanged.
async function frameFor(thumbPath) {
  const { channels, dominant } = await sharp(thumbPath).stats();
  const luminance = (0.2126 * channels[0].mean + 0.7152 * channels[1].mean + 0.0722 * channels[2].mean) / 255;
  return frameColour({ dominant, luminance });
}

async function removeStale(imgDir, keep) {
  let removed = 0;
  if (!existsSync(imgDir)) return removed;
  for (const entry of await readdir(imgDir, { withFileTypes: true })) {
    const dir = path.join(imgDir, entry.name);
    if (!entry.isDirectory()) continue;
    const wanted = keep.get(entry.name);
    for (const file of await readdir(dir)) {
      if (wanted?.has(file)) continue;
      await rm(path.join(dir, file));
      removed++;
    }
    if (!wanted) await rm(dir, { recursive: true });
  }
  return removed;
}

export async function build({ src, out, categoriesFile }) {
  if (!existsSync(src)) throw new Error(`No photos folder at ${src}. Create it with one sub-folder per category.`);
  const config = await readCategoriesFile(categoriesFile);
  const report = { processed: 0, skipped: 0, removed: 0, warnings: [] };
  const imgDir = path.join(out, "img");
  const keep = new Map();
  const bySlug = new Map();

  for (const dirEntry of await visibleEntries(src)) {
    if (!dirEntry.isDirectory()) continue;
    const slug = slugify(dirEntry.name);
    if (!slug) continue;
    const photos = [];
    const files = new Set();
    const usedIds = new Set();

    // Makes img/<slug>/<name>-l.jpg and -t.jpg from one original; null, with a warning, if it cannot be read.
    const resized = async (relative, name) => {
      const source = path.join(src, dirEntry.name, relative);
      const largePath = path.join(imgDir, slug, `${name}-l.jpg`);
      const thumbPath = path.join(imgDir, slug, `${name}-t.jpg`);
      try {
        if (await isFresh(source, [largePath, thumbPath])) {
          report.skipped++;
        } else {
          await mkdir(path.dirname(largePath), { recursive: true });
          await resizeBoth(source, largePath, thumbPath);
          report.processed++;
        }
        const { width, height } = await sharp(thumbPath).metadata();
        files.add(`${name}-l.jpg`).add(`${name}-t.jpg`);
        return { thumb: `img/${slug}/${name}-t.jpg`, large: `img/${slug}/${name}-l.jpg`, w: width, h: height, frame: await frameFor(thumbPath) };
      } catch (err) {
        report.warnings.push(`${dirEntry.name}/${relative}: ${err.message}`);
        return null;
      }
    };

    for (const entry of await visibleEntries(path.join(src, dirEntry.name))) {
      if (entry.isDirectory()) {
        // A folder is one design; each photo in it is the design in one colour, and the first is the one on the wall.
        const id = uniqueId(usedIds, entry.name);
        const variants = [];
        const usedColours = new Set();
        let first = null;
        for (const file of await visibleEntries(path.join(src, dirEntry.name, entry.name))) {
          if (!isPhoto(file)) continue;
          const colourId = uniqueId(usedColours, path.parse(file.name).name);
          // Slugs never hold "--", so this cannot clash with a single photo's files.
          const image = await resized(path.join(entry.name, file.name), `${id}--${colourId}`);
          if (!image) continue;
          first ??= image;
          variants.push({ id: colourId, colour: colourFromFilename(file.name), ...image });
        }
        if (first) photos.push({ id, title: titleFromName(entry.name), ...first, variants });
      } else if (isPhoto(entry)) {
        const id = uniqueId(usedIds, path.parse(entry.name).name);
        const image = await resized(entry.name, id);
        if (image) photos.push({ id, title: titleFromFilename(entry.name), ...image });
      }
    }
    if (photos.length) {
      bySlug.set(slug, { slug, name: categoryLabel(slug, config.names), photos });
      keep.set(slug, files);
    }
  }

  report.removed = await removeStale(imgDir, keep);
  const categories = orderCategories([...bySlug.keys()], config.order).map((s) => bySlug.get(s));
  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, "photos.json"), JSON.stringify({ categories }, null, 2) + "\n");
  return report;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : fallback;
  };
  const report = await build({ src: arg("src", "originals"), out: arg("out", "."), categoriesFile: arg("categories", "categories.json") });
  console.log(`Built: ${report.processed} new, ${report.skipped} unchanged, ${report.removed} stale files removed.`);
  for (const w of report.warnings) console.warn(`Skipped ${w}`);
}
