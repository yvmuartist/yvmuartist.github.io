import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

export default function (eleventyConfig) {
  // Every <img> in the output HTML is rewritten into a <picture> with
  // AVIF / WebP / JPEG at three widths. Sharp drops EXIF by default, so
  // GPS coordinates and camera data never reach the published site.
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    extensions: "html",
    formats: ["avif", "webp", "jpeg"],
    widths: [640, 1280, 2000],
    outputDir: "./_site/img/",
    urlPath: "/img/",
    failOnError: true,
    defaultAttributes: {
      loading: "lazy",
      decoding: "async",
      sizes: "(max-width: 420px) 100vw, (max-width: 900px) 50vw, 33vw",
    },
    sharpJpegOptions: { quality: 82, mozjpeg: true },
    sharpWebpOptions: { quality: 80 },
    sharpAvifOptions: { quality: 62 },
  });

  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/static": "." });

  // Lets templates say {{ gallery | byCategory("beauty") }}
  eleventyConfig.addFilter("byCategory", (items, category) =>
    !category || category === "all"
      ? items
      : items.filter((item) => item.category === category)
  );

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
