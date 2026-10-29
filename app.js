import { parseRoute, routeHref } from "./route.js";

const app = document.getElementById("app");
const SITE = "Artellum handcraft";
let categories = [];
let shown = "";

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

function render() {
  const route = parseRoute(location.hash, categories.map((c) => c.slug));
  const key = route.view === "home" ? "home" : route.slug;
  if (key !== shown) {
    const category = categories.find((c) => c.slug === route.slug);
    app.replaceChildren(...(category ? wallView(category) : homeView()));
    window.scrollTo(0, 0);
    shown = key;
  }
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
