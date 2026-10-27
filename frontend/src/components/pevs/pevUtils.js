import { searchText, quantity } from "../../utils/collectionWorkspace.js";
export const MATERIALS = [
  "Papel e papelão",
  "Plástico",
  "Metal",
  "Vidro",
  "Óleo de cozinha",
  "Eletroeletrônicos",
  "Madeira",
  "Poda",
  "Volumosos",
  "Entulho",
  "Orgânicos",
  "Outros",
];
export const KINDS = {
  PEV: "Ponto de entrega voluntária",
  ECOPONTO: "Ecoponto",
  PARTNER: "Ponto parceiro",
  COOPERATIVE: "Unidade da cooperativa",
};
export const STATES = {
  active: "Ativo",
  inactive: "Inativo",
  maintenance: "Em manutenção",
};
export const EVENTS = {
  CREATED: "Cadastro",
  UPDATED: "Alteração cadastral",
  PHOTO: "Foto",
  INSPECTION: "Vistoria",
  INCIDENT: "Ocorrência",
  PICKUP_REQUESTED: "Retirada solicitada",
  APP_REQUEST: "Solicitação recebida pelo App",
  PICKUP_COLLECTED: "Retirada em campo",
};
export const DAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
export const hasPosition = (b) =>
  b.latitude !== null &&
  b.latitude !== undefined &&
  b.latitude !== "" &&
  b.longitude !== null &&
  b.longitude !== undefined &&
  b.longitude !== "" &&
  Number.isFinite(Number(b.latitude)) &&
  Number.isFinite(Number(b.longitude)) &&
  Math.abs(Number(b.latitude)) <= 90 &&
  Math.abs(Number(b.longitude)) <= 180;
export const title = (b) => b.name || b.bin_id || b.binId || "PEV";
export const address = (b) =>
  [b.street, b.number, b.neighborhood, b.city, b.state]
    .filter(Boolean)
    .join(", ") ||
  b.location ||
  "Endereço não informado";
export const capacity = (b) =>
  b.capacityValue != null && b.capacityUnit
    ? quantity(b.capacityValue, b.capacityUnit)
    : b.capacity_kg > 0
      ? quantity(b.capacity_kg, "KG")
      : "Não informada";
export const photoUrl = (value) => {
  if (!value) return "";
  try {
    const url = new URL(
      value,
      import.meta.env.VITE_API_BASE_URL || window.location.origin,
    );
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};
export const accepted = (b) =>
  b.acceptedMaterials?.length
    ? b.acceptedMaterials
    : {
        recyclable: ["Recicláveis (cadastro legado)"],
        organic: ["Orgânicos (cadastro legado)"],
        electronic: ["Eletrônicos (cadastro legado)"],
        hazardous: ["Resíduos especiais (cadastro legado)"],
        mixed: ["Mistos (cadastro legado)"],
        "non-recyclable": ["Não recicláveis (cadastro legado)"],
      }[b.bin_type] || [];
export function filterPevs(items, filters) {
  const term = searchText(filters.search);
  return items.filter(
    (b) =>
      (!term ||
        searchText(
          [
            title(b),
            b.bin_id,
            address(b),
            b.reference,
            b.responsibleName,
            b.vehicle?.plate,
            ...accepted(b),
          ].join(" "),
        ).includes(term)) &&
      (!filters.status || b.status === filters.status) &&
      (!filters.city || b.city === filters.city) &&
      (!filters.neighborhood || b.neighborhood === filters.neighborhood) &&
      (!filters.material || accepted(b).includes(filters.material)) &&
      (!filters.pickup || b.needsPickup) &&
      (!filters.unmapped || !hasPosition(b)),
  );
}
export const cleanText = (v) => String(v ?? "").trim() || null;
export function formPayload(form) {
  const latitude = cleanText(form.latitude),
    longitude = cleanText(form.longitude);
  if ((latitude === null) !== (longitude === null))
    throw Error("Informe latitude e longitude juntas, ou limpe ambas.");
  if (latitude !== null && !hasPosition(form))
    throw Error(
      "Confira as coordenadas: latitude de -90 a 90 e longitude de -180 a 180.",
    );
  const cap = cleanText(form.capacityValue);
  if (cap !== null && (!Number.isFinite(Number(cap)) || Number(cap) <= 0))
    throw Error("Informe uma capacidade positiva.");
  if (!form.bin_id.trim()) throw Error("Informe o código do PEV.");
  const fields = [
    "name",
    "street",
    "number",
    "neighborhood",
    "city",
    "state",
    "regional",
    "reference",
    "restrictions",
    "hoursExceptions",
    "responsibleName",
    "responsibleContact",
    "notes",
    "pickupReason",
    "vehicle_id",
    "location",
  ];
  const p = Object.fromEntries(fields.map((k) => [k, cleanText(form[k])]));
  if (String(form.city).trim().toLocaleLowerCase("pt-BR") !== "fortaleza")
    p.regional = null;
  return {
    ...p,
    bin_id: form.bin_id.trim(),
    pointKind: form.pointKind,
    publicAccess: Boolean(form.publicAccess),
    status: form.status,
    zipCode: form.zipCode.replace(/\D/g, "") || null,
    latitude: latitude === null ? null : Number(latitude),
    longitude: longitude === null ? null : Number(longitude),
    capacityValue: cap === null ? null : Number(cap),
    capacityUnit: cap === null ? null : form.capacityUnit,
    acceptedMaterials: form.acceptedMaterials,
    openingHours: form.openingHours,
    needsPickup: form.needsPickup,
  };
}
