import { interleave, neighbours, parseRoute, routeHref } from "./route.js";

const app = document.getElementById("app");
const SITE = "Artellum handcraft";
let categories = [];
let shown = "";
let prevView = null;
let openedFromWall = false;
let lightbox = null;
let current = null;
let under = "home"; // the view kept beneath an open photo: "home" or a category slug
const TILTS = [-1.4, 1.1, -0.8, 1.5, -1.1];
const FRAMES = ["frame-dark", "frame-dark", "frame-light", "frame-dark", "frame-light", "frame-dark", "frame-dark"];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

const message = (text) => el("p", { className: "message" }, text);

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
    const img = el("img", { src: photo.thumb, alt: photo.title, width: photo.w, height: photo.h, loading: "lazy", decoding: "async" });
    const piece = el("a", { className: `piece ${FRAMES[i % FRAMES.length]}`, href: routeHref({ view: "photo", slug, id: photo.id }) }, img);
    piece.style.setProperty("--d", String(i % 4));
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
    wall(category.photos.map((photo) => ({ slug: category.slug, photo }))),
  ];
}

function buildLightbox() {
  const button = (className, label, text) => {
    const b = el("button", { className, type: "button" }, text);
    b.setAttribute("aria-label", label);
    return b;
  };
  const img = el("img", { alt: "" });
  const caption = el("figcaption");
  const parts = {
    img,
    caption,
    close: button("lb-close", "Close", "×"),
    prev: button("lb-prev", "Previous photo", "‹"),
    next: button("lb-next", "Next photo", "›"),
  };
  const root = el("div", { className: "lightbox" }, parts.close, parts.prev, el("figure", {}, img, caption), parts.next);
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

function goTo(photo) {
  if (!photo) return;
  history.replaceState(null, "", routeHref({ view: "photo", slug: current.category.slug, id: photo.id }));
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

function showPhoto(category, id) {
  if (!lightbox) {
    lightbox = buildLightbox();
    wireLightbox(lightbox);
    document.body.append(lightbox.root);
  }
  const nb = neighbours(category.photos, id);
  const photo = category.photos[nb.index];
  current = { category, nb };
  document.documentElement.classList.add("lb-open");
  lightbox.root.hidden = false;
  // The thumbnail is already cached from the wall; swap in the large file once it arrives.
  lightbox.img.src = photo.thumb;
  lightbox.img.alt = photo.title;
  // Size from the known ratio so the thumbnail and the large file fill the same frame.
  lightbox.img.style.setProperty("--ratio", String(photo.w / photo.h));
  const frame = lightbox.root.querySelector("figure");
  frame.style.setProperty("--tilt", `${TILTS[nb.index % TILTS.length]}deg`);
  frame.style.animation = "none";
  void frame.offsetWidth;
  frame.style.animation = "";
  const large = new Image();
  large.onload = () => { if (current?.category === category && current.nb.index === nb.index) lightbox.img.src = photo.large; };
  large.src = photo.large;
  if (nb.next) new Image().src = nb.next.large;
  lightbox.caption.textContent = photo.title;
  lightbox.prev.hidden = !nb.prev;
  lightbox.next.hidden = !nb.next;
  document.title = `${photo.title} · ${category.name.toLowerCase()} · ${SITE}`;
  lightbox.close.focus({ preventScroll: true });
}

function hideLightbox() {
  if (lightbox) lightbox.root.hidden = true;
  document.documentElement.classList.remove("lb-open");
  current = null;
}

function render() {
  let route = parseRoute(location.hash, categories.map((c) => c.slug));
  const category = categories.find((c) => c.slug === route.slug);
  if (route.view === "photo" && !neighbours(category.photos, route.id)) {
    route = { view: "category", slug: route.slug };
    history.replaceState(null, "", routeHref(route));
  }
  if (route.view === "photo" && prevView !== "photo") {
    openedFromWall = prevView !== null;
    under = prevView === null ? route.slug : shown;
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
    showPhoto(category, route.id);
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
