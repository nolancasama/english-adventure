import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = join(projectRoot, "src", "content");
const outputRoot = join(projectRoot, "public", "art", "emoji");
const manifestPath = join(projectRoot, "src", "art", "emojiManifest.ts");

const repository = "microsoft/fluentui-emoji";
const ref = "main";
const githubHeaders = {
  Accept: "application/vnd.github+json",
  "User-Agent": "my-english-adventure-art-pipeline",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
};

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

function splitEmojiGlyphs(value) {
  return [...segmenter.segment(value)]
    .map(({ segment }) => segment)
    .filter((segment) => /\p{Extended_Pictographic}/u.test(segment));
}

function codepointName(glyph) {
  return [...glyph]
    .map((character) => character.codePointAt(0).toString(16))
    .join("-");
}

function comparableGlyph(glyph) {
  return glyph.replace(/[\uFE0E\uFE0F]/gu, "");
}

function rawUrl(path) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${repository}/${ref}/${encodedPath}`;
}

async function fetchOk(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return response;
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (extname(path) !== ".ts" || path.endsWith(".test.ts")) return [];
    return [path];
  }));
  return files.flat();
}

async function collectAuthoredGlyphs() {
  const files = await sourceFiles(contentRoot);
  const glyphs = new Set();
  for (const path of files) {
    const source = await readFile(path, "utf8");
    for (const glyph of splitEmojiGlyphs(source)) glyphs.add(glyph);
  }
  return [...glyphs].sort((a, b) => codepointName(a).localeCompare(codepointName(b)));
}

async function loadRepositoryTree() {
  const url = `https://api.github.com/repos/${repository}/git/trees/${ref}?recursive=1`;
  const tree = await (await fetchOk(url, { headers: githubHeaders })).json();
  if (tree.truncated) throw new Error("GitHub returned a truncated Fluent Emoji tree.");
  return tree.tree.map(({ path }) => path).filter(Boolean);
}

async function buildGlyphAssetMap(paths, wantedGlyphs) {
  const wantedComparable = new Set(wantedGlyphs.map(comparableGlyph));
  const metadataPaths = paths.filter((path) => path.startsWith("assets/") && path.endsWith("/metadata.json"));
  const pngPaths = paths.filter((path) => /\/(?:Default\/)?3D\/[^/]+\.png$/u.test(path));
  const pngsByFolder = new Map();

  for (const path of pngPaths) {
    const marker = path.includes("/Default/3D/") ? "/Default/3D/" : "/3D/";
    const folder = path.slice(0, path.indexOf(marker));
    const entries = pngsByFolder.get(folder) ?? [];
    entries.push(path);
    pngsByFolder.set(folder, entries);
  }

  const found = new Map();
  const failures = [];
  await mapWithConcurrency(metadataPaths, 24, async (metadataPath) => {
    try {
      const metadata = await (await fetchOk(rawUrl(metadataPath))).json();
      const candidates = [metadata.glyph];
      for (const unicode of metadata.unicodeSkintones ?? []) {
        const codepoints = unicode.match(/[0-9a-f]{4,6}/giu) ?? [];
        candidates.push(String.fromCodePoint(...codepoints.map((value) => Number.parseInt(value, 16))));
      }

      const matched = candidates.find((glyph) => wantedComparable.has(comparableGlyph(glyph)));
      if (!matched) return;
      const folder = metadataPath.slice(0, -"/metadata.json".length);
      const assets = pngsByFolder.get(folder) ?? [];
      const asset = assets.find((path) => path.includes("/Default/3D/")) ?? assets[0];
      if (asset) found.set(comparableGlyph(matched), asset);
    } catch (error) {
      failures.push(`${metadataPath}: ${error.message}`);
    }
  });

  if (failures.length) {
    console.warn(`Skipped ${failures.length} unreadable metadata file(s).`);
  }
  return found;
}

function manifestSource(entries) {
  const rows = entries
    .map(([glyph, path]) => `  ${JSON.stringify(glyph)}: ${JSON.stringify(path)},`)
    .join("\n");
  return `// Generated by scripts/fetch-emoji-art.mjs. Do not edit by hand.\n` +
    `export const emojiManifest: Readonly<Record<string, string>> = {\n${rows}\n};\n`;
}

async function clearGeneratedAssets() {
  await mkdir(outputRoot, { recursive: true });
  const entries = await readdir(outputRoot, { withFileTypes: true });
  await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".webp"))
    .map((entry) => rm(join(outputRoot, entry.name))));
}

async function main() {
  const glyphs = await collectAuthoredGlyphs();
  console.log(`Found ${glyphs.length} authored emoji glyphs.`);

  const tree = await loadRepositoryTree();
  const assetsByGlyph = await buildGlyphAssetMap(tree, glyphs);
  await clearGeneratedAssets();

  const manifestEntries = [];
  const missing = [];
  for (const glyph of glyphs) {
    const sourcePath = assetsByGlyph.get(comparableGlyph(glyph));
    if (!sourcePath) {
      missing.push(glyph);
      continue;
    }

    const filename = `${codepointName(glyph)}.webp`;
    const source = Buffer.from(await (await fetchOk(rawUrl(sourcePath))).arrayBuffer());
    await sharp(source)
      .resize(192, 192, { fit: "contain", withoutEnlargement: true })
      .webp({ quality: 86, alphaQuality: 100, effort: 6 })
      .toFile(join(outputRoot, filename));
    manifestEntries.push([glyph, `/art/emoji/${filename}`]);
  }

  manifestEntries.sort(([left], [right]) => codepointName(left).localeCompare(codepointName(right)));
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, manifestSource(manifestEntries), "utf8");

  const outputDisplay = relative(projectRoot, outputRoot).split(sep).join("/");
  console.log(`Wrote ${manifestEntries.length} WebP assets to ${outputDisplay}.`);
  if (missing.length) {
    console.warn(`No Fluent Emoji 3D asset found (text fallback): ${missing.join(" ")}`);
  } else {
    console.log("All authored emoji glyphs have Fluent Emoji 3D art.");
  }
}

await main();
