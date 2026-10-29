// Hash routes: "#/" home, "#/<category>" wall, "#/<category>/<photo>" large view.
export function parseRoute(hash, slugs) {
  const [slug, id] = hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  if (!slug || !slugs.includes(slug)) return { view: "home" };
  if (!id) return { view: "category", slug };
  return { view: "photo", slug, id };
}

export function routeHref(route) {
  if (route.view === "home") return "#/";
  if (route.view === "category") return `#/${encodeURIComponent(route.slug)}`;
  return `#/${encodeURIComponent(route.slug)}/${encodeURIComponent(route.id)}`;
}

// items are { slug, photo }; the same photo id may appear in two categories, so match on both.
export function neighbours(items, slug, id) {
  const index = items.findIndex((item) => item.slug === slug && item.photo.id === id);
  if (index === -1) return null;
  return { index, prev: items[index - 1] ?? null, next: items[index + 1] ?? null };
}

// One photo from each category in turn, so a mixed wall does not start with 100 of the same thing.
export function interleave(categories) {
  const items = [];
  const longest = Math.max(0, ...categories.map((c) => c.photos.length));
  for (let i = 0; i < longest; i++) {
    for (const c of categories) {
      if (c.photos[i]) items.push({ slug: c.slug, photo: c.photos[i] });
    }
  }
  return items;
}
