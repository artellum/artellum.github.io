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

export function neighbours(photos, id) {
  const index = photos.findIndex((p) => p.id === id);
  if (index === -1) return null;
  return { index, prev: photos[index - 1] ?? null, next: photos[index + 1] ?? null };
}
