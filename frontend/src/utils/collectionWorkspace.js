export const COLLECTION_STAGES = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  COLLECTED: "Finalizada em campo",
  RECEIVED: "Recebida",
  SORTING: "Em triagem",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};
export const STAGE_COLORS = {
  PENDING: "warning",
  IN_PROGRESS: "primary",
  COLLECTED: "info",
  RECEIVED: "info",
  SORTING: "primary",
  COMPLETED: "success",
  CANCELLED: "secondary",
};
export const UNIT_LABELS = {
  KG: "kg",
  TON: "t",
  LITER: "L",
  L: "L",
  UNIT: "un.",
  CUBIC_METER: "m³",
};
export const text = (value) => String(value ?? "").trim();
export const searchText = (value) =>
  text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
export const shortId = (id) => text(id).slice(-8).toUpperCase();
export const personName = (person) =>
  person?.companyName ||
  person?.tradeName ||
  person?.name ||
  person?.displayName ||
  person?.user?.displayName ||
  person?.user?.name ||
  "Não informado";
const originPev = (item) => item.bin || item.collection?.bin;
export const generatorName = (item) => {
  const bin = originPev(item);
  return bin
    ? `PEV · ${bin.name || bin.binId || "Ponto de entrega"}`
    : personName(
        item.generator ||
          item.schedule?.generator ||
          item.requestedBy ||
          item.schedule?.requestedBy,
      );
};
export const location = (item) => {
  const bin = originPev(item);
  if (bin)
    return (
      [bin.street, bin.number, bin.neighborhood, bin.city, bin.state]
        .filter(Boolean)
        .join(", ") ||
      bin.location ||
      "Endereço do PEV não informado"
    );
  const g = item.generator || item.schedule?.generator || {};
  return (
    [
      g.address ||
        [g.street, g.number, g.neighborhood].filter(Boolean).join(", "),
      g.city,
      g.state,
    ]
      .filter(Boolean)
      .join(" · ") || "Endereço não informado"
  );
};
export const city = (item) =>
  text((originPev(item) || item.generator || item.schedule?.generator)?.city);
export const neighborhood = (item) =>
  text(
    (originPev(item) || item.generator || item.schedule?.generator)
      ?.neighborhood,
  );
export function dateKey(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-");
}
export function dateLabel(value, time = false) {
  if (!dateKey(value)) return "Não informada";
  return new Intl.DateTimeFormat(
    "pt-BR",
    time ? { dateStyle: "short", timeStyle: "short" } : {},
  ).format(new Date(value));
}
export const scheduledDate = (item) =>
  item.schedule?.scheduledDate || item.scheduledDate || null;
export function quantity(value, unit) {
  const n =
    value === null || value === undefined || value === "" ? NaN : Number(value);
  return Number.isFinite(n) && n >= 0
    ? `${n.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${UNIT_LABELS[unit] || text(unit) || "(unidade não informada)"}`
    : "Não informada";
}
export function materials(item, estimated = false) {
  const source = estimated
    ? item.requestedMaterials
    : item.collectionMaterials?.length
      ? item.collectionMaterials
      : item.materials;
  if (!Array.isArray(source)) return [];
  return source
    .filter((m) => m && typeof m === "object")
    .map((m) => ({
      id: m.id,
      name:
        m.nameSnapshot ||
        m.wasteType?.name ||
        m.proposedMaterial?.name ||
        m.name ||
        "Material não informado",
      value: estimated
        ? (m.estimatedQuantity ?? m.quantity ?? m.quantityKg)
        : (m.quantity ?? m.quantityKg),
      unit:
        m.unit ||
        m.proposedMaterial?.unit ||
        m.wasteType?.defaultUnit ||
        (m.quantityKg != null ? "KG" : ""),
      proposed: !m.wasteTypeId,
      entryId: m.wasteEntry?.id,
      entryStatus: m.wasteEntry?.status,
      destinations: m.wasteEntry?.destinations || [],
    }));
}
export function unitTotals(items) {
  const sums = new Map();
  for (const c of items) {
    if (c.status === "CANCELLED") continue;
    for (const m of materials(c)) {
      const n =
        m.value === null || m.value === undefined || m.value === ""
          ? NaN
          : Number(m.value);
      if (!m.unit || !Number.isFinite(n) || n < 0) continue;
      sums.set(m.unit, (sums.get(m.unit) || 0) + n);
    }
  }
  return [...sums].map(([unit, value]) => quantity(value, unit));
}
export const requestGroup = (s) =>
  s.collections?.length
    ? "DELEGATED"
    : ["REQUESTED", "SCHEDULED"].includes(s.status)
      ? s.status
      : s.status === "IN_PROGRESS"
        ? "IN_PROGRESS"
        : "CLOSED";
export const REQUEST_LABELS = {
  REQUESTED: "Aguardando análise",
  SCHEDULED: "Agendada",
  DELEGATED: "Delegada",
  IN_PROGRESS: "Em atendimento",
  CLOSED: "Encerrada",
};
export function inPeriod(value, start, end) {
  const key = dateKey(value);
  return (
    !(start || end) ||
    (!!key && (!start || key >= start) && (!end || key <= end))
  );
}
export function assignmentProblem(form, options) {
  const r = options.routes.find((r) => r.id === form.routeId),
    d = options.drivers.find((d) => d.id === form.driverId),
    v = options.vehicles.find((v) => v.id === form.vehicleId);
  if (
    form.collectorId &&
    !options.collectors.some(
      (c) => c.id === form.collectorId && c.status === "AVAILABLE",
    )
  )
    return "O catador não está disponível. Atualize as opções.";
  if (form.routeId && (!r || !["SCHEDULED", "IN_PROGRESS"].includes(r.status)))
    return "A rota não está disponível.";
  if (
    form.driverId &&
    (!d ||
      d.status === "INACTIVE" ||
      (d.status === "ON_ROUTE" && r?.driverId !== d.id))
  )
    return "O motorista não está disponível para esta atribuição.";
  if (form.vehicleId && (!v || v.status !== "ACTIVE"))
    return "O veículo está inativo, em manutenção ou indisponível.";
  if (
    (r?.driverId && r.driverId !== form.driverId) ||
    (r?.vehicleId && r.vehicleId !== form.vehicleId)
  )
    return "A equipe deve corresponder à rota selecionada.";
  if (v?.driverId && form.driverId && v.driverId !== form.driverId)
    return "Este veículo está vinculado a outro motorista.";
  return "";
}
