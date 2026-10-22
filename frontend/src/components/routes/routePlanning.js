export const array = (r, key) => Array.isArray(r) ? r : r?.[key] || r?.data || [];
export const origin = (c) => c.bin || c.generator || c.schedule?.generator || {};
export const title = (c) => { const o = origin(c); return o.companyName || o.name || o.binId || "Origem não informada"; };
export const address = (c) => { const o = origin(c); return [o.street, o.number, o.neighborhood, o.city, o.state].filter(Boolean).join(", ") || o.address || "Endereço não informado"; };
export const status = (s) => ({ SCHEDULED: "Agendada", IN_PROGRESS: "Em andamento", COMPLETED: "Concluída", CANCELLED: "Cancelada", PENDING: "Pendente", COLLECTED: "Finalizada em campo", RECEIVED: "Recebida", SORTING: "Em triagem" })[s] || s;
export const editableCollection = (c) => ["PENDING", "IN_PROGRESS"].includes(c.status);
export const units = { KG: "kg", TON: "t", LITER: "L", UNIT: "un", CUBIC_METER: "m³" };
export function quantities(c) {
  if (c.collectionMaterials?.length) return c.collectionMaterials.reduce((a, m) => {
    if (m.quantity != null && Number.isFinite(Number(m.quantity))) a[m.unit] = (a[m.unit] || 0) + Number(m.quantity);
    return a;
  }, {});
  return Number(c.totalWeightKg) > 0 ? { KG: Number(c.totalWeightKg) } : {};
}
export const quantitiesLabel = (q) => Object.entries(q).sort(([a], [b]) => (Object.keys(units).indexOf(a) < 0 ? 99 : Object.keys(units).indexOf(a)) - (Object.keys(units).indexOf(b) < 0 ? 99 : Object.keys(units).indexOf(b))).map(([u, n]) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 3 }) + " " + (units[u] || u)).join(" · ") || "Quantidade não informada";
export const dateKey = (v) => v ? new Date(v).toLocaleDateString("en-CA", { timeZone: "America/Fortaleza" }) : "";
export function toBr(value) { return value ? value.split("-").reverse().join("/") : null; }
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T12:00:00-03:00");
  return Number.isFinite(d.getTime()) && dateKey(d) === value;
}

export const materialsLabel = (c) => [...new Set((c.collectionMaterials || []).map((m) => m.nameSnapshot).filter(Boolean))].join(", ") || "Materiais não informados";
