// Picks a muted frame colour for a photo: light for dark photos, dark for bright ones,
// tinted toward the photo's main colour but never vivid and never pure white.
const LIGHT_BELOW = 0.42; // photo luminance under this gets a light frame
const LIGHT = { l: 0.74, maxS: 0.22 };
const DARK = { l: 0.2, maxS: 0.3 };
const WARM = { h: 38, s: 0.1 }; // for near-grey photos, so the frame is not a cold grey

function rgbToHsl({ r, g, b }) {
  const [R, G, B] = [r, g, b].map((v) => v / 255);
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h / 60) % 6];
  return "#" + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}

export function frameColour({ dominant, luminance }) {
  const tone = luminance < LIGHT_BELOW ? LIGHT : DARK;
  const { h, s } = rgbToHsl(dominant);
  return s < 0.08 ? hslToHex(WARM.h, WARM.s, tone.l) : hslToHex(h, Math.min(s, tone.maxS), tone.l);
}
