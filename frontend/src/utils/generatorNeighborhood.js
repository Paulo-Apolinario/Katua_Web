export const normalizeSearchText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
    .replace(/\s+/g, " ");
export const matchesNeighborhood = (generator, query) =>
  !normalizeSearchText(query) ||
  normalizeSearchText(generator?.neighborhood).includes(
    normalizeSearchText(query),
  );
export function neighborhoodOptions(generators) {
  const options = new Map();
  for (const generator of generators) {
    const label = String(generator.neighborhood || "")
      .trim()
      .replace(/\s+/g, " ");
    const key = normalizeSearchText(label);
    if (!key) continue;
    if (!options.has(key)) options.set(key, { label, count: 0 });
    options.get(key).count++;
  }
  return [...options.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }),
  );
}
