// Stamps "© YV MACIEL" onto every photo in src/photos/ and writes the result
// to src/images/, which is what the site build consumes.
//
// The originals in src/photos/ are never modified — change the styling below,
// re-run, and every image is re-stamped from clean sources. src/images/ is
// generated and git-ignored; GitHub Actions rebuilds it on every deploy.
//
// Runs automatically before `npm run build` and `npm start`.

import sharp from "sharp";
import { readdirSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC = "src/photos";
const OUT = "src/images";

const MARK = "© YV MACIEL";
const SIZE_RATIO = 0.026; // cap height as a fraction of image width
const PAD_RATIO = 0.032; // inset from the bottom-right corner
const OPACITY = 0.62;

const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function overlay(width, height) {
  const size = Math.max(13, Math.round(width * SIZE_RATIO));
  const pad = Math.round(width * PAD_RATIO);
  const x = width - pad;
  const y = height - pad;
  const font = "Helvetica, 'DejaVu Sans', Arial, sans-serif";
  const common = `x="${x}" y="${y}" text-anchor="end" font-family="${font}" font-size="${size}" font-weight="600" letter-spacing="${(size * 0.14).toFixed(2)}"`;

  // Drawn twice — a dark pass offset by a pixel keeps it legible on pale skin
  // and bright backgrounds without needing an SVG filter.
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <text ${common} fill="#000000" fill-opacity="${(OPACITY * 0.5).toFixed(2)}" transform="translate(${Math.max(1, Math.round(size * 0.05))},${Math.max(1, Math.round(size * 0.05))})">${escape(MARK)}</text>
      <text ${common} fill="#ffffff" fill-opacity="${OPACITY}">${escape(MARK)}</text>
    </svg>`
  );
}

if (!existsSync(SRC)) {
  console.error(`[watermark] ${SRC} does not exist — nothing to do.`);
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });

const photos = readdirSync(SRC).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));

for (const name of photos) {
  // .rotate() with no argument applies any EXIF orientation and bakes it in,
  // so a phone photo never ends up sideways once the metadata is dropped.
  const base = sharp(join(SRC, name)).rotate();
  const { width, height } = await base.metadata();
  const out = join(OUT, name.replace(/\.(jpe?g|png|webp)$/i, ".jpg"));

  await base
    .composite([{ input: overlay(width, height), top: 0, left: 0 }])
    .jpeg({ quality: 94, mozjpeg: true })
    .toFile(out);

  console.log(`[watermark] ${name} → ${out} (${width}×${height})`);
}

console.log(`[watermark] ${photos.length} photo${photos.length === 1 ? "" : "s"} stamped.`);
