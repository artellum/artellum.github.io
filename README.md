# Artellum gallery

A phone-first photo gallery for the exhibition. Visitors scan a QR code, pick a category and browse the pieces. No database: each category is a folder, and a script shrinks the photos for the web.

## Add photos

1. Put photos in `originals/<category>/`, one folder per category (for example `originals/paintings/`, `originals/tea-lights/`). Create the `originals` folder yourself; it is never uploaded to GitHub, so the full-size files stay on this laptop.
2. The filename becomes the caption: `before-the-rain.jpg` shows as "Before the rain".
3. Run `npm run build`. It makes a small and a large copy of each new photo in `img/` and writes `photos.json`. Photos you have already built are skipped, and deleted ones are cleaned up.
4. Commit and push:
   ```sh
   git add -A && git commit -m "add photos" && git push
   ```

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
npm run qr -- https://pranjalagg.github.io/artellum-gallery/
```

Writes `qr/artellum-qr.png` (2400 × 3000, ready to print) and `qr/artellum-qr.svg`: the code hanging in a dark frame on a sage wall, with "Artellum" in its handwritten font and a small museum label underneath. The lettering is drawn from the font files in `fonts/` (Homemade Apple, Apache 2.0; Spectral, OFL), so the card prints the same anywhere. The label text lives in `museumLabel()` in `scripts/qr.mjs`.

`npm test` checks that the card still scans back to the URL, including small and slightly blurred. Still scan the printed card with a phone before the exhibition.

## Publish on GitHub Pages

Repo Settings -> Pages -> Deploy from a branch -> `main` / root. The site is then at `https://pranjalagg.github.io/<repo-name>/`.

## Tests

`npm test`
