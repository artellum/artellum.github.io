# Artellum exhibition gallery: design

## Why

Pranjal is exhibiting handcrafted pieces and cannot bring the whole collection. A QR code on the counter opens a website where visitors browse the work on their phones. The full artellum store site is not ready yet, so this is a quick, standalone gallery for the exhibition. It lives in its own GitHub repo and at its own URL, separate from `boxofgoodies` (the care-package site) and from `artellum` (the store site). Neither of those is touched.

## What visitors get

- Scan QR, land on a quiet, museum-like page: the **Artellum** name, a one-line description, then a large list of categories (for example paintings, tea lights, fridge magnets, crochet). Each row shows how many pieces it holds.
- Tap a category: its photos hang as an uneven wall (two-column masonry, each photo at its own proportions).
- Tap a photo: it opens large, with swipe or arrows to the next and previous photo in that category, and a way back.
- Photos only. No prices, no cart, no ordering, no box-opening animation.

## Look (chosen by Pranjal: "B, gallery wall")

- Off-white page, thin divider lines between category rows, large serif category names, small sans count on the right, photos with no borders or shadows.
- Fonts match the artellum store site: "Artellum" in Homemade Apple (handwritten, with a small "handcraft" beside it), category names and titles in Spectral, small text in Karla.
- Colours borrowed from artellum: sage, warm paper, brown ink. Builder to read artellum's `src/styles/tokens.css` for exact values.
- Mobile first. Phones at an exhibition counter are the main use. Desktop just needs to look fine.

## Photos and storage

- Hundreds of high-resolution photos, not yet taken. They arrive over time.
- **Decision (Pranjal):** shrink each photo to phone-friendly size and keep only those in the repo. Originals stay on Pranjal's laptop. No database and no external storage.
- A category is a folder. Adding a piece means dropping a photo into a category folder, running one script, and pushing.
- The script resizes photos (about 1600px on the long edge, a few hundred KB each) and generates the list of categories and photos the page reads. It also makes small thumbnails for the wall so the wall loads fast, and the large image loads only when a photo is opened.
- Repo size must stay well under GitHub Pages' limits (1 GB site) for roughly 500 photos.

## Goals

- Works on a cheap phone on exhibition wifi: wall loads fast, images load lazily.
- Pranjal can add a category or photos without editing code.
- A QR code for the final URL, ready to print.

## Non-goals

- Prices, cart, checkout, WhatsApp ordering, search, user accounts, an admin screen, a database.
- Any change to `artellum` or `boxofgoodies`.

## Anti-goals (a failure even if it technically works)

- Slow wall that stalls on hundreds of photos.
- Reading as a generic template instead of Artellum.
- Needing Pranjal to hand-write a list of photos.

## Constraints

- Static site, hosted on GitHub Pages under Pranjal's account (`pranjalagg.github.io/<repo-name>`).
- Exhibition is soon, so the first working version should come quickly. Polish can follow.

## My calls (not yet agreed, please check)

1. **Repo and folder name:** `artellum-gallery`, so the URL would be `pranjalagg.github.io/artellum-gallery`. A shorter name makes a simpler QR code.
2. **No framework:** plain HTML, CSS and a little JavaScript for the page, plus one Node script (using `sharp`) for resizing and generating the photo list. The built output is committed so GitHub Pages serves it from the main branch.
3. **Captions:** each photo can have an optional short title taken from its filename (for example `before-the-rain.jpg` shows "Before the rain"). No title is shown otherwise. No prices anywhere.
4. **Category names and order:** taken from folder names, with an optional small file to set display names and order. The default order is alphabetical.
5. **Counter fallback:** the short URL is printed in text under the QR code.
6. **Placeholder photos:** the builder uses a few generated sample photos to test with until the real ones exist.

## Left to the builder

- Exact breakpoints, spacing and animation timing for the wall and the large view.
- Thumbnail and large image sizes within the limits above.
- File and script layout, and how the QR code image is generated.
- Accessibility basics: alt text from titles, keyboard arrows in the large view.
