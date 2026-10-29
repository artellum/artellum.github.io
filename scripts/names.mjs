const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function titleFromFilename(file) {
  const base = file.replace(/\.[^.]+$/, "");
  return capitalise(base.replace(/[-_]+/g, " ").trim());
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function categoryLabel(slug, names) {
  return names[slug] ?? capitalise(slug.replace(/-/g, " "));
}

export function orderCategories(slugs, order) {
  const listed = order.filter((s) => slugs.includes(s));
  const rest = slugs.filter((s) => !listed.includes(s)).sort();
  return [...listed, ...rest];
}
