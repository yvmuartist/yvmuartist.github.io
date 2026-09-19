import sharp from "sharp";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = "src/images";

// The justified layout needs each photograph's aspect ratio in the CSS, and it
// has to be there before the images load or the rows would jump into place.
// So it is measured at build time and written onto each figure as --ar.
export default async function () {
  if (!existsSync(DIR)) return {};

  const files = readdirSync(DIR).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));
  const out = {};

  for (const file of files) {
    const { width, height } = await sharp(join(DIR, file)).metadata();
    out[file] = { width, height, ar: +(width / height).toFixed(4) };
  }

  return out;
}
