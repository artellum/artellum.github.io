// Hash routes: "#/" closed book, "#/contents", "#/<category>" chapter opener, "#/<category>/<photo>" a plate, "#/end".
// A category folder named "contents" or "end" wins over the page of the same name.
const PAGES = ["contents", "end"];

export function parseRoute(hash, slugs) {
  const [slug, id] = hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  if (slug && slugs.includes(slug)) return id ? { view: "photo", slug, id } : { view: "category", slug };
  if (PAGES.includes(slug) && !id) return { view: slug };
  return { view: "cover" };
}

export function routeHref(route) {
  if (route.view === "cover") return "#/";
  if (route.view === "category") return `#/${encodeURIComponent(route.slug)}`;
  if (route.view === "photo") return `#/${encodeURIComponent(route.slug)}/${encodeURIComponent(route.id)}`;
  return `#/${route.view}`;
}

// The book in reading order: contents, then each category as a chapter opener followed by one plate per photo, then a last page.
export function bookPages(categories) {
  const pages = [{ view: "contents" }];
  let plate = 0;
  categories.forEach((category, chapter) => {
    pages.push({ view: "category", slug: category.slug, chapter });
    for (const photo of category.photos) pages.push({ view: "photo", slug: category.slug, id: photo.id, chapter, plate: ++plate, photo });
  });
  pages.push({ view: "end" });
  return pages;
}

// Where a route opens the book: -1 for the closed cover and for photos that are not in it.
// The same photo id may appear in two categories, so photos match on both.
export function pageIndex(pages, route) {
  return pages.findIndex((page) => page.view === route.view && page.slug === route.slug && page.id === route.id);
}
