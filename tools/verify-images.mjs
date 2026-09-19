// Gate that runs before every deploy, and locally via `npm run verify`.
//
// It answers one question the build cannot: did everything in src/images/
// actually come out of tools/watermark.mjs? A photo uploaded straight into
// src/images/ through the GitHub web UI would otherwise be published
// un-watermarked, and nothing else would notice.
//
// It deliberately does NOT need src/photos/ — those originals are not in the
// repository, so CI has no access to them. The manifest is the proof instead.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const OUT = "src/images";
const MANIFEST = "tools/watermark-manifest.json";
const GALLERY = "src/_data/gallery.json";

const sha = (buf) => createHash("sha256").update(buf).digest("hex");

const problems = [];
const notes = [];

if (!existsSync(MANIFEST)) {
  problems.push(`${MANIFEST} is missing. Run \`npm run watermark\` and commit it.`);
}
if (!existsSync(OUT)) {
  problems.push(`${OUT}/ is missing. Run \`npm run watermark\` and commit the result.`);
}

if (problems.length === 0) {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const gallery = JSON.parse(readFileSync(GALLERY, "utf8"));
  const images = readdirSync(OUT).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();

  // 1. Every published image must match what the watermark tool recorded.
  for (const file of images) {
    const known = manifest[file];
    if (!known) {
      problems.push(
        `${OUT}/${file} is not in the manifest — it never went through \`npm run watermark\`, ` +
          `so it is probably un-watermarked. Put the original in src/photos/ and re-run.`
      );
      continue;
    }
    const actual = sha(readFileSync(join(OUT, file)));
    if (actual !== known.output) {
      problems.push(
        `${OUT}/${file} does not match the manifest — it was edited or replaced after stamping. ` +
          `Re-run \`npm run watermark -- --force\`.`
      );
    }
  }

  // 2. Every photo the gallery references must exist.
  const present = new Set(images);
  for (const item of gallery) {
    if (!item.file) {
      problems.push(`An entry in ${GALLERY} has no "file" key.`);
    } else if (!present.has(item.file)) {
      problems.push(`${GALLERY} references ${item.file}, which is not in ${OUT}/.`);
    }
  }

  // 3. Images nobody put on the page. Not fatal — just easy to forget.
  const referenced = new Set(gallery.map((i) => i.file));
  for (const file of images) {
    if (!referenced.has(file)) {
      notes.push(`${OUT}/${file} is stamped but has no entry in ${GALLERY}, so it is not on the site.`);
    }
  }

  console.log(
    `[verify] ${images.length} images, ${gallery.length} gallery entries, ${Object.keys(manifest).length} in the manifest.`
  );
}

for (const note of notes) console.log(`[verify] note: ${note}`);

if (problems.length) {
  console.error("");
  for (const problem of problems) console.error(`[verify] FAIL: ${problem}`);
  console.error("");
  process.exit(1);
}

console.log("[verify] OK — every published image is accounted for.");
