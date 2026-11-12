const DAY = 86400000;
const validDay = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value + "T12:00:00Z")) &&
  new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value;
// Civil date strings already belong to Fortaleza: never parse them as midnight UTC.
export function operationHeatSeries(series, start, end, unit) {
  const points = new Map();
  const from = validDay(start) ? Date.parse(start + "T12:00:00Z") : NaN,
    until = validDay(end) ? Date.parse(end + "T12:00:00Z") : NaN;
  if (until >= from && (until - from) / DAY <= 366) {
    for (let date = from; date <= until; date += DAY)
      points.set(new Date(date).toISOString().slice(0, 10), 0);
  }
  for (const row of series) {
    const value = Number(row.units?.[unit] || 0);
    points.set(
      row.date,
      (points.get(row.date) || 0) + (Number.isFinite(value) ? value : 0),
    );
  }
  return [...points]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      key: date,
      name: validDay(date) ? date.split("-").reverse().join("/") : date,
      value,
    }));
}
