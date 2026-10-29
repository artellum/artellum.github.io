import { neighbours, parseRoute, routeHref } from "./route.js";

const app = document.getElementById("app");
const SITE = "Artellum handcraft";
let categories = [];
let shown = "";
let prevView = null;
let openedFromWall = false;
let lightbox = null;
let current = null;

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

const message = (text) => el("p", { className: "message" }, text);

function homeView() {
  document.title = SITE;
  return [
    el("p", { className: "intro" }, "A small collection of handmade things."),
    el(
      "ul",
      { className: "categories" },
      ...categories.map((c) =>
        el(
          "li",
          {},
          el(
            "a",
            { href: routeHref({ view: "category", slug: c.slug }) },
            el("span", { className: "cat-name" }, c.name),
            el("span", { className: "cat-count" }, String(c.photos.length)),
          ),
        ),
      ),
    ),
  ];
}

function wallView(category) {
  document.title = `${category.name} · ${SITE}`;
  const wall = el("div", { className: "wall" });
  for (const p of category.photos) {
    const img = el("img", { src: p.thumb, alt: p.title, width: p.w, height: p.h, loading: "lazy", decoding: "async" });
    const reveal = () => img.classList.add("in");
    img.addEventListener("load", reveal, { once: true });
    img.addEventListener("error", reveal, { once: true });
    wall.append(el("a", { href: routeHref({ view: "photo", slug: category.slug, id: p.id }) }, img));
  }
  const count = category.photos.length;
  return [
    el("a", { className: "back", href: "#/" }, "← All pieces"),
    el("h1", { className: "cat-title" }, category.name),
    el("p", { className: "cat-meta" }, `${count} ${count === 1 ? "piece" : "pieces"}`),
    wall,
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
  else location.replace(routeHref({ view: "category", slug: current.category.slug }));
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
    if (e.target === lb.root || e.target.tagName === "FIGURE") closeLightbox();
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
  const large = new Image();
  large.onload = () => { if (current?.category === category && current.nb.index === nb.index) lightbox.img.src = photo.large; };
  large.src = photo.large;
  if (nb.next) new Image().src = nb.next.large;
  lightbox.caption.textContent = photo.title;
  lightbox.prev.hidden = !nb.prev;
  lightbox.next.hidden = !nb.next;
  document.title = `${photo.title} · ${category.name} · ${SITE}`;
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
  const key = route.view === "home" ? "home" : route.slug;
  if (key !== shown) {
    app.replaceChildren(...(category ? wallView(category) : homeView()));
    window.scrollTo(0, 0);
    shown = key;
  }
  if (route.view === "photo") {
    if (prevView !== "photo") openedFromWall = prevView !== null;
    showPhoto(category, route.id);
  } else {
    hideLightbox();
    if (category) document.title = `${category.name} · ${SITE}`;
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
    app.replaceChildren(message("Couldn't load the gallery. Please refresh."));
    return;
  }
  if (!categories.length) {
    app.replaceChildren(message("Pieces are on their way."));
    return;
  }
  render();
  addEventListener("hashchange", render);
}

start();
