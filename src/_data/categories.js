import { readFileSync } from "node:fs";

// Only offer a filter for categories that actually have work in them —
// an "Editorial" button that shows an empty page makes the site look broken.
// Add one editorial photo to gallery.json and the filter appears on its own.
export default () => {
  const here = new URL(".", import.meta.url).pathname;
  const gallery = JSON.parse(readFileSync(here + "gallery.json", "utf8"));
  const site = JSON.parse(readFileSync(here + "site.json", "utf8"));

  const used = new Set(gallery.map((item) => item.category));
  const shown = site.categories.filter(
    (cat) => cat.slug === "all" || used.has(cat.slug)
  );

  // "All" plus a single category is just a label, not a filter.
  return shown.length > 2 ? shown : [];
};
