// Stamps "© YV MACIEL" onto the photos in src/photos/ and writes the results
// to src/images/, which is what the site build consumes.
//
//   npm run watermark            only the photos that are new or changed
//   npm run watermark -- --force re-stamp everything (after changing the style)
//   npm run watermark -- --prune also delete images whose original is gone
//
// The originals in src/photos/ are never modified, and never committed — this
// repository is public, so only the stamped src/images/ goes to GitHub.
//
// Every file written is recorded in tools/watermark-manifest.json with the
// SHA-256 of both the original and the result. `npm run verify` (and the same
// check in CI) uses that to prove nothing un-watermarked reached src/images/.

import sharp from "sharp";
import {
  readdirSync, mkdirSync, existsSync, readFileSync, writeFileSync, unlinkSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const SRC = "src/photos";
const OUT = "src/images";
const MANIFEST = "tools/watermark-manifest.json";

const MARK = "© YV MACIEL";
const SIZE_RATIO = 0.026; // cap height as a fraction of image width
const PAD_RATIO = 0.032; // inset from the bottom-right corner
const OPACITY = 0.62;

// Photos that already carry a mark of their own. These are copied through
// untouched rather than stamped twice in the same corner.
const ALREADY_MARKED = new Set(["runway-finale.jpg"]);

const force = process.argv.includes("--force");
const prune = process.argv.includes("--prune");

const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const toOutputName = (name) => name.replace(/\.(jpe?g|png|webp)$/i, ".jpg");
const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function overlay(width, height) {
  const size = Math.max(13, Math.round(width * SIZE_RATIO));
  const pad = Math.round(width * PAD_RATIO);
  const font = "Helvetica, 'DejaVu Sans', Arial, sans-serif";
  const common = `x="${width - pad}" y="${height - pad}" text-anchor="end" font-family="${font}" font-size="${size}" font-weight="600" letter-spacing="${(size * 0.14).toFixed(2)}"`;
  const nudge = Math.max(1, Math.round(size * 0.05));

  // Drawn twice — a dark pass offset by a pixel keeps the mark legible on pale
  // skin and bright backgrounds without needing an SVG filter.
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <text ${common} fill="#000000" fill-opacity="${(OPACITY * 0.5).toFixed(2)}" transform="translate(${nudge},${nudge})">${escape(MARK)}</text>
      <text ${common} fill="#ffffff" fill-opacity="${OPACITY}">${escape(MARK)}</text>
    </svg>`
  );
}

if (!existsSync(SRC)) {
  console.error(`[watermark] ${SRC} does not exist.`);
  console.error("[watermark] That folder holds your un-watermarked originals and is");
  console.error("[watermark] deliberately not in git — restore it from your own backup.");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const manifest = existsSync(MANIFEST)
  ? JSON.parse(readFileSync(MANIFEST, "utf8"))
  : {};

const photos = readdirSync(SRC)
  .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
  .sort();

let stamped = 0;
let skipped = 0;

for (const name of photos) {
  const output = toOutputName(name);
  const outPath = join(OUT, output);
  const sourceHash = sha(readFileSync(join(SRC, name)));
  const passthrough = ALREADY_MARKED.has(name);
  const known = manifest[output];

  const unchanged =
    !force &&
    known &&
    known.source === sourceHash &&
    known.passthrough === passthrough &&
    existsSync(outPath) &&
    sha(readFileSync(outPath)) === known.output;

  if (unchanged) {
    skipped++;
    continue;
  }

  // .rotate() with no argument applies any EXIF orientation and bakes it in,
  // so a phone photo never ends up sideways once the metadata is dropped.
  const base = sharp(join(SRC, name)).rotate();
  const { width, height } = await base.metadata();

  await (passthrough
    ? base
    : base.composite([{ input: overlay(width, height), top: 0, left: 0 }])
  )
    .jpeg({ quality: 94, mozjpeg: true })
    .toFile(outPath);

  manifest[output] = {
    source: sourceHash,
    output: sha(readFileSync(outPath)),
    passthrough,
  };

  stamped++;
  console.log(
    `  stamped  ${name} → ${outPath} (${width}×${height})${passthrough ? "  [already marked, passed through]" : ""}`
  );
}

// Images whose original is no longer in src/photos/.
const live = new Set(photos.map(toOutputName));
const orphans = Object.keys(manifest).filter((f) => !live.has(f));

for (const orphan of orphans) {
  if (prune) {
    if (existsSync(join(OUT, orphan))) unlinkSync(join(OUT, orphan));
    delete manifest[orphan];
    console.log(`  pruned   ${orphan}`);
  } else {
    console.log(`  orphan   ${orphan} — no original in ${SRC}/ (use --prune to remove)`);
  }
}

writeFileSync(
  MANIFEST,
  JSON.stringify(
    Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))),
    null,
    2
  ) + "\n"
);

console.log(
  `[watermark] ${stamped} stamped, ${skipped} unchanged, ${orphans.length} orphaned. Manifest: ${MANIFEST}`
);

if (stamped > 0) {
  console.log(`[watermark] Next: add the new entries to src/_data/gallery.json, then commit src/images/ and the manifest.`);
}
