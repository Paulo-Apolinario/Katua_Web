import { normalizeSearchText } from "../../utils/generatorNeighborhood.js";
export const sourceAddress = (p) =>
  p.street || !p.address
    ? [p.street, p.number, p.neighborhood, p.city, p.state]
        .filter(Boolean)
        .join(", ")
    : p.address || "";
const identity = (p) => `${p.kind}:${p.sourceId}`;
export function neighborhoodGroups(generators) {
  const groups = new Map();
  for (const g of generators) {
    const neighborhood = normalizeSearchText(g.neighborhood);
    if (!neighborhood) continue;
    const key = JSON.stringify([
      normalizeSearchText(g.city),
      normalizeSearchText(g.state),
      neighborhood,
    ]);
    if (!groups.has(key))
      groups.set(key, {
        key,
        label: [g.neighborhood.trim(), g.city, g.state]
          .filter(Boolean)
          .join(" · "),
        generators: [],
      });
    groups.get(key).generators.push(g);
  }
  return [...groups.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR"),
  );
}
export function validGeneratorPoint(g) {
  const name = String(g.companyName || g.name || "").trim();
  return (
    !!g.id &&
    !!String(g.street || g.address || "").trim() &&
    name.length >= 2 &&
    name.length <= 150 &&
    sourceAddress(g).length >= 5 &&
    sourceAddress(g).length <= 500 &&
    g.latitude !== null &&
    g.latitude !== undefined &&
    String(g.latitude).trim() !== "" &&
    g.longitude !== null &&
    g.longitude !== undefined &&
    String(g.longitude).trim() !== "" &&
    Number.isFinite(Number(g.latitude)) &&
    Math.abs(Number(g.latitude)) <= 90 &&
    Number.isFinite(Number(g.longitude)) &&
    Math.abs(Number(g.longitude)) <= 180
  );
}
export function neighborhoodPreview(generators, points, occupiedSources = []) {
  const used = new Set(
    [...points, ...occupiedSources].filter((p) => p.sourceId).map(identity),
  );
  const ready = [],
    invalid = [],
    existing = [];
  for (const g of generators) {
    const key = `GENERATOR:${g.id}`;
    if (used.has(key)) existing.push(g);
    else if (!validGeneratorPoint(g)) invalid.push(g);
    else {
      ready.push(g);
      used.add(key);
    }
  }
  return { ready, invalid, existing };
}
export function appendNeighborhoodPoints(
  points,
  generators,
  occupiedSources = [],
  maxPoints = 100,
  makeKey = () => crypto.randomUUID(),
) {
  const preview = neighborhoodPreview(generators, points, occupiedSources);
  if (points.length + preview.ready.length > maxPoints)
    throw Error(
      `Este bairro ultrapassa o limite de ${maxPoints} novos pontos neste planejamento. Adicione os geradores individualmente ou divida em rotas.`,
    );
  return [
    ...points,
    ...preview.ready.map((g) => ({
      key: makeKey(),
      kind: "GENERATOR",
      sourceId: g.id,
      name: String(g.companyName || g.name).trim(),
      address: sourceAddress(g),
      zipCode: g.zipCode || "",
      latitude: Number(g.latitude),
      longitude: Number(g.longitude),
      notes: "",
      materials: "",
      phone: "",
      collectorId: "",
      weekdays: [],
    })),
  ];
}
