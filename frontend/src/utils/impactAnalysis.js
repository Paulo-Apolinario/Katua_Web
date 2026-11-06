export function periodFor(mode, reference) {
  const day = new Date(`${reference}T12:00:00Z`);
  if (Number.isNaN(day.getTime())) return null;
  const iso = (d) => d.toISOString().slice(0, 10);
  if (mode === "year")
    return {
      start: `${reference.slice(0, 4)}-01-01`,
      end: `${reference.slice(0, 4)}-12-31`,
    };
  if (mode === "month")
    return {
      start: `${reference.slice(0, 7)}-01`,
      end: iso(
        new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0, 12)),
      ),
    };
  const start = new Date(day);
  start.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start: iso(start), end: iso(end) };
}
export const todayFortaleza = () =>
  new Date(Date.now() - 10800000).toISOString().slice(0, 10);
export const formatQuantity = (n) =>
  Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
export const unitLabels = {
  KG: "kg",
  TON: "t",
  LITER: "L",
  UNIT: "un.",
  CUBIC_METER: "m³",
};
export const formatUnits = (units = {}) =>
  Object.entries(units)
    .map(([u, q]) => `${formatQuantity(q)} ${unitLabels[u] || u}`)
    .join(" · ") || "Nenhuma quantidade";
export const formatEstimate = (value, unit = "") =>
  value == null ? "Sem estimativa" : `${formatQuantity(value)} ${unit}`.trim();
