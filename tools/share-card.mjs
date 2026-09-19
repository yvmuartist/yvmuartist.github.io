// Builds src/static/share-card.jpg — the 1200×630 image that appears when the
// site's link is pasted into a text, an email, Instagram or LinkedIn.
//
// Run with `npm run share-card`. Not part of the normal build, so a card made
// by hand in Photoshop can simply be dropped in and left alone.
//
// Change SOURCE to crop the card from a different photo.

import sharp from "sharp";

const SOURCE = "src/images/lilac-glitter.jpg";
const OUT = "src/static/share-card.jpg";
const NAME = "YV MACIEL";
const ROLE = "MAKEUP ARTIST";

const photo = await sharp(SOURCE)
  .rotate()
  // 'attention' picks the most visually salient crop, which on a beauty
  // portrait lands on the face rather than the ceiling.
  .resize(1200, 630, { fit: "cover", position: sharp.strategy.attention })
  .toBuffer();

const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="scrim" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="rgba(0,0,0,0.78)"/>
      <stop offset="55%" stop-color="rgba(0,0,0,0)"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#scrim)"/>
  <text x="64" y="530" font-family="Helvetica, 'DejaVu Sans', Arial, sans-serif"
        font-weight="700" font-size="62" letter-spacing="5" fill="#ffffff">${NAME}</text>
  <text x="67" y="572" font-family="Helvetica, 'DejaVu Sans', Arial, sans-serif"
        font-weight="500" font-size="20" letter-spacing="11" fill="rgba(255,255,255,0.82)">${ROLE}</text>
</svg>`);

await sharp(photo).composite([{ input: label }]).jpeg({ quality: 86 }).toFile(OUT);

console.log(`[share-card] ${SOURCE} → ${OUT}`);
