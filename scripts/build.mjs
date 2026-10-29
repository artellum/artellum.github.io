import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { categoryLabel, orderCategories, slugify, titleFromFilename } from "./names.mjs";

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

    for (const entry of await visibleEntries(path.join(src, dirEntry.name))) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!entry.isFile() || !IMAGE_EXTS.has(ext)) continue;
      const stem = slugify(path.parse(entry.name).name) || "photo";
      let id = stem;
      for (let n = 2; usedIds.has(id); n++) id = `${stem}-${n}`;
      usedIds.add(id);

      const source = path.join(src, dirEntry.name, entry.name);
      const largePath = path.join(imgDir, slug, `${id}-l.jpg`);
      const thumbPath = path.join(imgDir, slug, `${id}-t.jpg`);
      try {
        if (await isFresh(source, [largePath, thumbPath])) {
          report.skipped++;
        } else {
          await mkdir(path.dirname(largePath), { recursive: true });
          await resizeBoth(source, largePath, thumbPath);
          report.processed++;
        }
        const { width, height } = await sharp(thumbPath).metadata();
        files.add(`${id}-l.jpg`).add(`${id}-t.jpg`);
        photos.push({
          id,
          title: titleFromFilename(entry.name),
          thumb: `img/${slug}/${id}-t.jpg`,
          large: `img/${slug}/${id}-l.jpg`,
          w: width,
          h: height,
        });
      } catch (err) {
        report.warnings.push(`${dirEntry.name}/${entry.name}: ${err.message}`);
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
