export function calendarDateKey(value) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return Number.isFinite(+new Date(value)) &&
      new Date(value).toISOString().slice(0, 10) === value
      ? value
      : null;
  const date = new Date(value);
  if (!Number.isFinite(+date)) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Fortaleza",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export const calendarDateLabel = (value) =>
  calendarDateKey(value)?.split("-").reverse().join("/") ||
  "Sem data programada";
export const collectionCalendarDate = (c) =>
  c.collectedAt ||
  c.schedule?.scheduledDate ||
  c.route?.scheduledDate ||
  c.scheduledDate ||
  c.schedule?.preferredDate ||
  null;
export const scheduleCalendarDate = (s) =>
  s.scheduledDate || s.preferredDate || null;
export const calendarEventLink = (event) =>
  event.type === "COLLECTION"
    ? `/waste-list?coleta=${encodeURIComponent(event.raw.id)}`
    : `/collection-requests?solicitacao=${encodeURIComponent(event.raw.id)}`;
export function unlinkedSchedules(schedules, collections) {
  const linked = new Set(
    collections.map((c) => c.scheduleId || c.schedule?.id).filter(Boolean),
  );
  const ids = new Set(collections.map((c) => c.id));
  return schedules.filter(
    (s) =>
      !linked.has(s.id) &&
      !s.collections?.some((c) => ids.has(c.id)) &&
      !ids.has(s.collection?.id),
  );
}
export function collectionMassKg(c) {
  if (Number.isFinite(Number(c.totalWeightKg)) && Number(c.totalWeightKg) > 0)
    return Number(c.totalWeightKg);
  const rows = c.collectionMaterials?.length
    ? c.collectionMaterials
    : c.materials;
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((sum, m) => {
    if (!m || (m.unit && !["KG", "TON"].includes(m.unit))) return sum;
    const n = Number(m.quantityKg ?? m.weightKg ?? (m.unit ? m.quantity : 0));
    return (
      sum +
      (Number.isFinite(n) && n > 0 ? n * (m.unit === "TON" ? 1000 : 1) : 0)
    );
  }, 0);
}
