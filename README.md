# yvmuartist.github.io

Portfolio site for **Yv Maciel**, makeup artist. Static site, built with [Eleventy](https://www.11ty.dev/), deployed to GitHub Pages by GitHub Actions on every push to `main`.

Design: "The Index" — fixed sidebar, staggered grid, strict monochrome. The photographs supply all the colour.

---

## One-time setup

1. **Yv creates a GitHub account named `yvmuartist`.** The account name has to match the URL — GitHub only serves `yvmuartist.github.io` from a repository owned by an account called `yvmuartist`.
2. On that account, create a **public** repository named exactly **`yvmuartist.github.io`**.
3. Add Og as a collaborator: *Settings → Collaborators → Add people*.
4. Push this project to it:
   ```sh
   git init -b main
   git add .
   git commit -m "Initial site"
   git remote add origin git@github.com:yvmuartist/yvmuartist.github.io.git
   git push -u origin main
   ```
5. **Turn on Pages:** *Settings → Pages → Build and deployment → Source: **GitHub Actions***. This is the step people forget; without it the workflow builds and nothing publishes.
6. Wait about a minute. The site is live at <https://yvmuartist.github.io>.

## Running it locally

```sh
npm install
npm start          # http://localhost:8080, rebuilds as you edit
npm run build      # one-off build into _site/
npm run watermark  # stamp any new photos in src/photos/
npm run verify     # same check CI runs before deploying
```

Requires Node 22 or newer.

---

## Adding a photo

Everything on the page comes from two places: the image files, and one JSON file that lists them.

The watermarking step runs **on your machine**, not in CI, because this repository is public and the un-watermarked originals must not go into it.

1. Drop the original into `src/photos/` on your Mac and run `npm run watermark`. That stamps it, turns it upright if the phone shot it sideways, and writes the result to `src/images/`.
2. Commit the new file in `src/images/` — either with git, or through the GitHub website: *src/images/* → **Add file → Upload files**.
3. Go to `src/_data/gallery.json` → click the pencil → add an entry at the position you want it to appear:

   ```json
   {
     "file": "smoke-and-satin.jpg",
     "title": "Smoke & Satin",
     "category": "editorial",
     "alt": "Close-up beauty portrait with a smoked dark eye and a deep matte lip.",
     "credit": "ph. Photographer Name"
   }
   ```

   `category` must be `beauty` or `editorial` (add more in `src/_data/site.json`).
   `alt` is a real description of the photo — it's what screen readers announce and it's most of the site's SEO. Don't skip it.
   `credit` shows under the image; leave it out and the category shows instead.

4. Commit. The Actions tab shows the build; the site updates in about a minute.

**Order on the page** is the order in `gallery.json`.

**To remove a photo**, delete its entry from `gallery.json`. (Deleting the file too is optional — an unreferenced image is simply not built.)

---

## What the build does to images

**Locally, by hand:** `npm run watermark` reads every file in `src/photos/`, turns any sideways phone photo upright, stamps `© YV MACIEL` into the bottom-right corner, and writes the result to `src/images/`. The originals are never modified.

It only touches what changed, so running it again after adding one photo costs a second:

```sh
npm run watermark              # new and changed photos only
npm run watermark -- --force   # re-stamp everything, after changing the style
npm run watermark -- --prune   # also delete images whose original is gone
```

Change the size, position or opacity at the top of `tools/watermark.mjs` and run `--force`; every photo is re-stamped from clean sources. Filenames in `ALREADY_MARKED` there are passed through unstamped — that's for photos that arrive with a mark of their own.

`src/photos/` is git-ignored and **never leaves your machine**. `src/images/` is what gets committed. Pages requires a public repository on a Free organization, so anything committed here is downloadable by anyone — keep your own backup of `src/photos/`, because GitHub is not holding a copy.

**Then in CI**, `eleventy.config.js` runs every `<img>` through `@11ty/eleventy-img`:

- generates **640 / 1280 / 2000px** wide versions in **AVIF, WebP and JPEG**, and writes the `srcset` so a phone downloads the small one
- sets `loading="lazy"`, `decoding="async"` and explicit `width`/`height` so the page doesn't jump as images load
- **strips EXIF** — Sharp discards metadata by default, so GPS coordinates, timestamps and camera serial numbers never reach the published site

Only the watermark step is manual. Everything after it happens on every push.

## The gate in CI

Watermarking can't run in the Action — the runner would need the un-watermarked originals, and putting those in a public repository is the thing the watermark exists to prevent. So CI verifies instead of producing.

Every run of `npm run watermark` records what it wrote in `tools/watermark-manifest.json`: the SHA-256 of each original and of each stamped result. Before the build, `npm run verify` checks that

- every file in `src/images/` appears in the manifest with a matching hash — a photo uploaded straight into `src/images/` through the GitHub web UI fails here rather than being published un-watermarked
- every `file` in `gallery.json` actually exists
- (a note, not a failure) nothing is stamped but missing from `gallery.json`

A failure stops the workflow before anything deploys, so the live site keeps serving the last good version. Run `npm run verify` yourself before pushing to see the same result.

**Commit the manifest** along with `src/images/` — CI has no other way to know what's legitimate.

---

## The share card

`src/static/share-card.jpg` (1200×630) is what appears when the link is pasted into a text, an email, Instagram or LinkedIn. It's built from the Lilac Glitter frame by `npm run share-card` — change `SOURCE` at the top of `tools/share-card.mjs` to crop it from a different photo, or drop a hand-made card in and never run the script again. It's the most-seen image on the site and the only one most people will ever look at.

## A custom domain, later

Buy `yvmaciel.com` (~$12/yr), put a file named `CNAME` in `src/static/` containing just the domain, and add the DNS records GitHub lists under *Settings → Pages*. GitHub issues the HTTPS certificate free. Worth doing **before** she starts handing the link out — changing it later breaks every link she's already shared.

---

## Layout of the project

```
.
├── .github/workflows/deploy.yml   build + publish on push to main
├── eleventy.config.js             image pipeline and directory config
├── tools/watermark.mjs            src/photos → src/images, stamped (run by hand)
├── tools/verify-images.mjs        the CI gate — proves nothing skipped the stamp
├── tools/watermark-manifest.json  hashes of every original and result; commit it
├── tools/share-card.mjs           builds the Open Graph card
├── src/
│   ├── _data/
│   │   ├── site.json              name, email, Instagram, categories
│   │   ├── gallery.json           the portfolio — edit this to add work
│   │   └── year.js                current year for the footer
│   ├── _includes/base.njk         <head>, meta tags, share card
│   ├── css/site.css               the whole design
│   ├── photos/                    full-size originals — LOCAL ONLY, git-ignored
│   ├── images/                    watermarked, committed, published
│   ├── static/                    robots.txt, favicon, share card, CNAME
│   ├── index.njk                  the page
│   └── 404.njk
└── package.json
```

## Notes on the current set

Ten photos: six `beauty`, four `editorial`. The category filter appears because both categories have work in them — `src/_data/categories.js` hides it whenever only one does, so a button never sits over an empty page.

Every image carries a `© YV MACIEL` watermark, since these are all her own photographs — except `runway-finale.jpg`, which already had her *Yv Scarlett Photography* mark in the same corner. Files listed in `ALREADY_MARKED` at the top of `tools/watermark.mjs` are passed through unstamped; add a filename there if another photo arrives pre-marked.

There's no `credit` field on any entry; if a photographer needs crediting later, add `"credit": "ph. Name"` and it replaces the category in that image's caption.

`glitter-freckles.jpg` arrived rotated a quarter turn and was corrected in `src/photos/` before stamping. It's also the softest frame in the set.

Source sizes range from 1080×1620 to 4032×3024, so the build tops out at whatever each photo actually has — it never upscales. Higher-resolution replacements can be dropped into `src/photos/` over the same filenames with no other changes.
