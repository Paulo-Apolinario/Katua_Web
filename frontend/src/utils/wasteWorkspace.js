import { quantity } from "./collectionWorkspace.js";
export const errorMessage = (e) =>
  e?.error || e?.message || "Não foi possível concluir a operação.";
export const numeric = (value) =>
  value === null ||
  value === undefined ||
  value === "" ||
  !Number.isFinite(Number(value))
    ? null
    : Number(value);
export const lotQuantity = (lot) => {
  const q = numeric(lot.quantity),
    legacy = numeric(lot.quantityKg);
  if (q !== null && q > 0) return q;
  if ((!lot.unit || lot.unit === "KG") && legacy !== null && legacy > 0)
    return legacy;
  return q;
};
export function stockBalances(items) {
  const byUnit = {};
  for (const item of items)
    for (const lot of item.lots || []) {
      const unit = lot.unit,
        n = lotQuantity(lot);
      if (!unit || n === null || n < 0) continue;
      const b = (byUnit[unit] ||= {
        available: 0,
        reserved: 0,
        sold: 0,
        discarded: 0,
      });
      const key = {
        AVAILABLE: "available",
        RESERVED: "reserved",
        SOLD: "sold",
        DISCARDED: "discarded",
      }[lot.status];
      if (key) {
        const available = numeric(lot.availableQuantity);
        b[key] +=
          key === "available" &&
          available !== null &&
          (traceableLot(lot) || available > 0)
            ? available
            : n;
      }
    }
  return byUnit;
}
export function unitSummary(totals, field) {
  const values = Object.entries(totals || {}).map(([unit, row]) =>
    quantity(row[field], unit),
  );
  return values.length ? values.join(" · ") : "Sem quantidades informadas";
}
export const traceableLot = (lot) =>
  !!(
    lot?.originCollectionWasteEntryId ||
    lot?.originCollectionId ||
    lot?.originCollectionMaterialId
  );
export function validPeriod(filters) {
  return !(
    filters.dateFrom &&
    filters.dateTo &&
    filters.dateFrom > filters.dateTo
  );
}
export function optionalFields(source, fields) {
  return Object.fromEntries(
    fields
      .filter((key) => Object.hasOwn(source, key) && source[key] !== undefined)
      .map((key) => [
        key,
        typeof source[key] === "string"
          ? source[key].trim() || null
          : source[key],
      ]),
  );
}
export function calendarIso(value, endOfDay = false) {
  const s = String(value ?? "").trim();
  if (!s) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number),
      date = new Date(y, m - 1, d);
    if (
      date.getFullYear() !== y ||
      date.getMonth() !== m - 1 ||
      date.getDate() !== d
    )
      return undefined;
    if (endOfDay) date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }
  const date = new Date(s);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
