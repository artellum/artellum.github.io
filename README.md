# Artellum gallery

A phone-first photo gallery for the exhibition. Visitors scan a QR code, pick a category and browse the pieces. No database: each category is a folder, and a script shrinks the photos for the web.

## Add photos

1. Put photos in `originals/<category>/`, one folder per category (for example `originals/paintings/`, `originals/tea-lights/`). Create the `originals` folder yourself; it is never uploaded to GitHub, so the full-size files stay on this laptop.
2. The filename becomes the caption: `before-the-rain.jpg` shows as "Before the rain".
3. Run `npm run build`. It makes a small and a large copy of each new photo in `img/` and writes `photos.json`. Photos you have already built are skipped, and deleted ones are cleaned up.
4. Commit and push. This updates the test site only:
   ```sh
   git add -A && git commit -m "add photos" && git push
   ```
5. Check it on your phone at `https://pranjalagg.github.io/artellum-gallery/`, then put it live with `npm run release`.

iPhone photos (HEIC) are converted automatically on a Mac. Anything the script cannot read is listed by name when it finishes, and the rest still builds.

### Category names and order

Folder names become the category names ("tea-lights" shows as "Tea lights"), in alphabetical order. To change either, edit `categories.json`:

```json
{ "order": ["paintings", "tea-lights"], "names": { "tea-lights": "Tea Lights ✦" } }
```

Categories listed in `order` come first; the rest follow alphabetically.

## Try it locally

```sh
npm install
npm run samples     # makes 40 stand-in photos in .samples/ (npm run samples -- 500 for a stress test)
npm run preview     # builds them into .preview/ and serves http://localhost:4173
```

Preview never touches your real `img/` or `photos.json`.

## QR code

```sh
npm run qr -- https://artellum.github.io/
```

Writes `qr/artellum-qr.png` (2400 × 3000, ready to print) and `qr/artellum-qr.svg`: the code hanging in a dark frame on a sage wall, with "Artellum" in its handwritten font and a few italic lines underneath. The lettering is drawn from the font files in `fonts/` (Homemade Apple, Apache 2.0; Spectral, OFL), so the card prints the same anywhere. The lines under the frame live in `caption()` in `scripts/qr.mjs`.

`npm test` checks that the card still scans back to the URL, including small and slightly blurred. Still scan the printed card with a phone before the exhibition.

## Publish on GitHub Pages

Two copies of the site, each published from its repo's `main` branch (Settings -> Pages -> Deploy from a branch -> `main` / root):

- **Test:** `pranjalagg/artellum-gallery` (the `origin` remote) at `https://pranjalagg.github.io/artellum-gallery/`. Every `git push` lands here.
- **Live:** `artellum/artellum.github.io` (the `prod` remote) at `https://artellum.github.io/`, which the QR code opens. Only `npm run release` updates it.

`npm run release` runs the tests, then copies exactly what is on the test site to the live one, so unpushed local changes never go live.

## Tests

`npm test`
