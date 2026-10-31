import { interleave, neighbours, parseRoute, routeHref } from "./route.js";

const app = document.getElementById("app");
const SITE = "Artellum handcraft";
let categories = [];
let shown = "";
let prevView = null;
let openedFromWall = false;
let lightbox = null;
let current = null;
const itemsOf = (category) => category.photos.map((photo) => ({ slug: category.slug, photo }));
const listFor = (view) => (view === "home" ? interleave(categories) : itemsOf(categories.find((c) => c.slug === view)));
let under = "home"; // the view kept beneath an open photo: "home" or a category slug
const TILTS = [-1.4, 1.1, -0.8, 1.5, -1.1];
// Used for photos built before frame colours existed; `npm run build` picks one per photo.
const FALLBACK_FRAMES = ["#3a2f28", "#3a2f28", "#c9c3b2", "#3a2f28", "#c9c3b2", "#3a2f28", "#3a2f28"];
const frameOf = (photo, i) => photo.frame ?? FALLBACK_FRAMES[i % FALLBACK_FRAMES.length];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

const message = (text) => el("p", { className: "message" }, text);

function cover(category, i) {
  const photo = category.photos[0];
  const img = el("img", { className: "cat-cover", src: photo.thumb, alt: "", width: 96, height: 96, decoding: "async" });
  img.style.setProperty("--frame", frameOf(photo, i));
  return img;
}

function homeView() {
  document.title = SITE;
  return [
    el("p", { className: "intro" }, "a small collection of handmade things."),
    el(
      "ul",
      { className: "categories" },
      ...categories.map((c, i) => {
        const li = el(
          "li",
          {},
          el(
            "a",
            { href: routeHref({ view: "category", slug: c.slug }) },
            cover(c, i),
            el("span", { className: "cat-name" }, c.name),
            el("span", { className: "cat-count" }, String(c.photos.length)),
          ),
        );
        li.style.setProperty("--i", String(i));
        return li;
      }),
    ),
    el("h2", { className: "all-title" }, "all pieces"),
    wall(interleave(categories)),
  ];
}

function wall(items) {
  const node = el("div", { className: "wall" });
  items.forEach(({ slug, photo }, i) => {
    const colours = photo.variants?.length ?? 1;
    const alt = colours > 1 ? `${photo.title}, in ${colours} colours` : photo.title;
    const img = el("img", { src: photo.thumb, alt, width: photo.w, height: photo.h, loading: "lazy", decoding: "async" });
    const piece = el("a", { className: "piece", href: routeHref({ view: "photo", slug, id: photo.id }) }, img);
    piece.style.setProperty("--d", String(i % 4));
    piece.style.setProperty("--frame", frameOf(photo, i));
    if (colours > 1) {
      // The other colours' frames peek out behind this one, with a tag saying how many there are.
      piece.dataset.stack = String(Math.min(colours, 3));
      // Hang it in the design's shape, which the first colour's photo may not share.
      img.style.aspectRatio = `${photo.w} / ${photo.h}`;
      photo.variants.slice(1, 3).forEach((v, n) => piece.style.setProperty(`--frame-${n + 2}`, v.frame));
      const tag = el("span", { className: "colours" }, `${colours} colours`);
      tag.setAttribute("aria-hidden", "true");
      piece.append(tag);
    }
    const reveal = () => piece.classList.add("in");
    img.addEventListener("load", reveal, { once: true });
    img.addEventListener("error", reveal, { once: true });
    node.append(piece);
  });
  return node;
}

function wallView(category) {
  document.title = `${category.name.toLowerCase()} · ${SITE}`;
  const count = category.photos.length;
  return [
    el("a", { className: "back", href: "#/" }, "← all pieces"),
    el("h1", { className: "cat-title" }, category.name),
    el("p", { className: "cat-meta" }, `${count} ${count === 1 ? "piece" : "pieces"}`),
    wall(itemsOf(category)),
  ];
}

function buildLightbox() {
  const button = (className, label, text) => {
    const b = el("button", { className, type: "button" }, text);
    b.setAttribute("aria-label", label);
    return b;
  };
  const img = el("img", { alt: "" });
  const title = el("span", { className: "lb-title" });
  const colour = el("span", { className: "lb-colour" });
  const swatches = el("div", { className: "swatches" });
  swatches.setAttribute("role", "group");
  swatches.setAttribute("aria-label", "Colours");
  const parts = {
    img,
    title,
    colour,
    swatches,
    close: button("lb-close", "Close", "×"),
    prev: button("lb-prev", "Previous photo", "‹"),
    next: button("lb-next", "Next photo", "›"),
  };
  const figure = el("figure", {}, img, el("figcaption", {}, title, colour), swatches);
  const root = el("div", { className: "lightbox" }, parts.close, parts.prev, figure, parts.next);
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Photo viewer");
  return { root, ...parts };
}

function closeLightbox() {
  if (!current) return;
  if (openedFromWall) history.back();
  else location.replace(under === "home" ? routeHref({ view: "home" }) : routeHref({ view: "category", slug: under }));
}

function goTo(item) {
  if (!item) return;
  history.replaceState(null, "", routeHref({ view: "photo", slug: item.slug, id: item.photo.id }));
  render();
}

function wireLightbox(lb) {
  lb.close.addEventListener("click", closeLightbox);
  lb.prev.addEventListener("click", () => goTo(current?.nb.prev));
  lb.next.addEventListener("click", () => goTo(current?.nb.next));
  lb.root.addEventListener("click", (e) => {
    if (e.target === lb.root) closeLightbox();
  });
  addEventListener("keydown", (e) => {
    if (!current) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") goTo(current.nb.prev);
    else if (e.key === "ArrowRight") goTo(current.nb.next);
  });
  let start = null;
  lb.root.addEventListener("touchstart", (e) => { start = e.touches.length === 1 ? e.touches[0] : null; }, { passive: true });
  lb.root.addEventListener("touchend", (e) => {
    if (!start || !current) return;
    const dx = e.changedTouches[0].clientX - start.clientX;
    const dy = e.changedTouches[0].clientY - start.clientY;
    start = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(dx < 0 ? current.nb.next : current.nb.prev);
  }, { passive: true });
}

function showPhoto(slug, id) {
  if (!lightbox) {
    lightbox = buildLightbox();
    wireLightbox(lightbox);
    document.body.append(lightbox.root);
  }
  // Arrows browse whatever the photo was opened from: the whole home wall, or its own category.
  const items = listFor(under);
  const nb = neighbours(items, slug, id);
  const photo = items[nb.index].photo;
  const category = categories.find((c) => c.slug === slug);
  const variants = photo.variants ?? [];
  current = { items, nb, photo, variant: null };
  document.documentElement.classList.add("lb-open");
  lightbox.root.hidden = false;
  const frame = lightbox.root.querySelector("figure");
  frame.style.setProperty("--tilt", `${TILTS[nb.index % TILTS.length]}deg`);
  frame.style.animation = "none";
  void frame.offsetWidth;
  frame.style.animation = "";
  frame.classList.toggle("has-colours", variants.length > 1);
  // Room under the photo for the swatches; a narrow frame fits about 9 to a row.
  frame.style.setProperty("--swatch-rows", String(Math.ceil(variants.length / 9)));
  lightbox.title.textContent = photo.title;
  // One frame for the whole design, so switching colours never resizes it; other shapes are cropped to fit.
  lightbox.img.style.setProperty("--ratio", String(photo.w / photo.h));
  lightbox.swatches.replaceChildren(...(variants.length > 1 ? variants.map(swatch) : []));
  showVariant(variants[0] ?? photo);
  if (nb.next) new Image().src = nb.next.photo.large;
  lightbox.prev.hidden = !nb.prev;
  lightbox.next.hidden = !nb.next;
  document.title = `${photo.title} · ${category.name.toLowerCase()} · ${SITE}`;
  lightbox.close.focus({ preventScroll: true });
}

// One colour of a design, or a single photo (which has no colour of its own).
function showVariant(variant) {
  current.variant = variant;
  // The thumbnail is already cached from the wall or the swatch; swap in the large file once it arrives.
  lightbox.img.src = variant.thumb;
  lightbox.img.alt = variant.colour ? `${current.photo.title}, ${variant.colour.toLowerCase()}` : current.photo.title;
  const large = new Image();
  large.onload = () => { if (current?.variant === variant) lightbox.img.src = variant.large; };
  large.src = variant.large;
  lightbox.colour.textContent = variant.colour ?? "";
  for (const b of lightbox.swatches.children) b.setAttribute("aria-pressed", String(b.dataset.id === variant.id));
}

function swatch(variant) {
  const crop = el("span", {}, el("img", { src: variant.swatch, alt: "", decoding: "async" }));
  const b = el("button", { className: "swatch", type: "button", title: variant.colour }, crop);
  b.dataset.id = variant.id;
  b.setAttribute("aria-label", variant.colour);
  b.addEventListener("click", () => {
    if (current?.variant === variant) return;
    showVariant(variant);
    if (!reducedMotion.matches) lightbox.img.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 280, easing: "ease-out" });
  });
  return b;
}

function hideLightbox() {
  if (lightbox) lightbox.root.hidden = true;
  document.documentElement.classList.remove("lb-open");
  current = null;
}

function render() {
  let route = parseRoute(location.hash, categories.map((c) => c.slug));
  const category = categories.find((c) => c.slug === route.slug);
  if (route.view === "photo" && !neighbours(itemsOf(category), route.slug, route.id)) {
    route = { view: "category", slug: route.slug };
    history.replaceState(null, "", routeHref(route));
  }
  if (route.view === "photo" && prevView !== "photo") {
    openedFromWall = prevView !== null;
    under = prevView === null ? route.slug : shown;
  } else if (route.view === "photo" && !neighbours(listFor(under), route.slug, route.id)) {
    // Address edited to a photo outside the list we were browsing: treat it as a fresh direct link.
    openedFromWall = false;
    under = route.slug;
  }
  const key = route.view === "photo" ? under : route.view === "home" ? "home" : route.slug;
  if (key !== shown) {
    const beneath = categories.find((c) => c.slug === key);
    const nodes = beneath ? wallView(beneath) : homeView();
    const swap = () => {
      app.replaceChildren(...nodes);
      window.scrollTo(0, 0);
    };
    const fade = prevView !== null && prevView !== "photo" && route.view !== "photo" && document.startViewTransition && !reducedMotion.matches;
    if (fade) document.startViewTransition(swap);
    else swap();
    shown = key;
  }
  if (route.view === "photo") {
    showPhoto(route.slug, route.id);
  } else {
    hideLightbox();
    if (category) document.title = `${category.name.toLowerCase()} · ${SITE}`;
    else document.title = SITE;
  }
  prevView = route.view;
}

async function start() {
  try {
    const res = await fetch("photos.json");
    if (!res.ok) throw new Error(res.statusText);
    categories = (await res.json()).categories;
  } catch {
    app.replaceChildren(message("couldn't load the gallery. please refresh."));
    return;
  }
  if (!categories.length) {
    app.replaceChildren(message("pieces are on their way."));
    return;
  }
  render();
  addEventListener("hashchange", render);
}

start();
