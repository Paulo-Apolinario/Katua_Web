import { apiRequest } from "./apiClient";

const WASTE_DESTINATION_ENDPOINT = "/collection-waste-destinations";

const normalizeText = (value) => (value === null || value === undefined) ? "" : String(value).trim();
const normalizeUppercase = (value) => normalizeText(value).toUpperCase();
const normalizeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const normalizePositiveNumber = (value, fieldLabel) => { const n = normalizeNumber(value); if (n <= 0) throw new Error(`${fieldLabel} deve ser maior que zero.`); return n; };
const normalizePositiveInteger = (value, fallback) => (Number.isInteger(Number(value)) && Number(value) > 0) ? Number(value) : fallback;
const normalizeDate = (value) => { const n = normalizeText(value); if (!n) return undefined; const d = new Date(n); return Number.isNaN(d.getTime()) ? undefined : d.toISOString(); };

const appendTextParam = (params, key, value) => { const n = normalizeText(value); if (n) params.set(key, n); };
const appendUppercaseParam = (params, key, value) => { const n = normalizeUppercase(value); if (n) params.set(key, n); };
const appendDateParam = (params, key, value) => { const n = normalizeDate(value); if (n) params.set(key, n); };

const buildWasteDestinationQueryString = (filters = {}) => {
  const params = new URLSearchParams();
  params.set("page", String(normalizePositiveInteger(filters.page, 1)));
  params.set("limit", String(normalizePositiveInteger(filters.limit, 20)));
  
  appendTextParam(params, "search", filters.search);
  appendUppercaseParam(params, "type", filters.type);
  appendUppercaseParam(params, "unit", filters.unit);
  appendUppercaseParam(params, "status", filters.status);
  appendTextParam(params, "collectionWasteEntryId", filters.collectionWasteEntryId || filters.entryId);
  appendTextParam(params, "collectionId", filters.collectionId);
  appendTextParam(params, "collectionMaterialId", filters.collectionMaterialId);
  appendTextParam(params, "stockItemId", filters.stockItemId);
  appendTextParam(params, "stockLotId", filters.stockLotId);
  appendTextParam(params, "destinationName", filters.destinationName);
  appendTextParam(params, "generatorId", filters.generatorId);
  appendTextParam(params, "collectorId", filters.collectorId);
  appendTextParam(params, "driverId", filters.driverId);
  appendTextParam(params, "vehicleId", filters.vehicleId);
  appendTextParam(params, "routeId", filters.routeId);
  appendDateParam(params, "dateFrom", filters.dateFrom);
  appendDateParam(params, "dateTo", filters.dateTo);

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
};

const normalizeMetadata = (metadata) => (metadata !== null && metadata !== undefined && typeof metadata === "object" && !Array.isArray(metadata)) ? metadata : undefined;
const addOptionalTextField = (data, key, value) => { const n = normalizeText(value); if (n) data[key] = n; };

const normalizeCreatePayload = (payload = {}) => {
  const collectionWasteEntryId = normalizeText(payload.collectionWasteEntryId || payload.entryId);
  if (!collectionWasteEntryId) throw new Error("Entrada de resíduo não informada.");
  const type = normalizeUppercase(payload.type);
  if (!type) throw new Error("Tipo de destinação não informado.");
  const quantity = normalizePositiveNumber(payload.quantity, "A quantidade destinada");
  const unit = normalizeUppercase(payload.unit);
  if (!unit) throw new Error("Unidade da destinação não informada.");

  const data = { collectionWasteEntryId, type, quantity, unit };
  addOptionalTextField(data, "stockItemId", payload.stockItemId);
  addOptionalTextField(data, "destinationName", payload.destinationName);
  addOptionalTextField(data, "destinationDocument", payload.destinationDocument);
  addOptionalTextField(data, "destinationAddress", payload.destinationAddress);
  addOptionalTextField(data, "destinationContact", payload.destinationContact);
  addOptionalTextField(data, "transportDocument", payload.transportDocument);
  addOptionalTextField(data, "environmentalDocument", payload.environmentalDocument);
  addOptionalTextField(data, "notes", payload.notes);

  const destinationDate = normalizeDate(payload.destinationDate);
  if (destinationDate) data.destinationDate = destinationDate;
  const metadata = normalizeMetadata(payload.metadata);
  if (metadata) data.metadata = metadata;

  return data;
};

// ==========================================
// AQUI ESTÁ A CORREÇÃO PRINCIPAL
// ==========================================
const normalizeUpdatePayload = (payload = {}) => {
  const data = {};
  
  // Adicionado stockItemId na lista de campos de texto opcionais
  const optionalTextFields = ["destinationName", "destinationDocument", "destinationAddress", "destinationContact", "transportDocument", "environmentalDocument", "notes", "stockItemId"];
  
  for (const field of optionalTextFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      data[field] = payload[field] === null ? null : normalizeText(payload[field]) || null;
    }
  }

  // Permite enviar o tipo alterado
  if (Object.prototype.hasOwnProperty.call(payload, "type")) {
    const type = normalizeUppercase(payload.type);
    if (type) data.type = type;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "destinationDate")) {
    data.destinationDate = normalizeDate(payload.destinationDate) || null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "metadata")) {
    data.metadata = payload.metadata === null ? null : normalizeMetadata(payload.metadata);
  }
  
  return data;
};

const normalizeCancelPayload = (payload = {}) => {
  const reason = normalizeText(payload.reason);
  if (!reason) throw new Error("Informe o motivo do cancelamento.");
  const data = { reason };
  const cancelledAt = normalizeDate(payload.cancelledAt);
  if (cancelledAt) data.cancelledAt = cancelledAt;
  return data;
};

export const extractWasteDestinations = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.destinations)) return response.destinations;
  if (Array.isArray(response?.data?.destinations)) return response.data.destinations;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

export const extractWasteDestination = (response) => {
  if (!response) return null;
  if (response.destination) return response.destination;
  if (response.data?.destination) return response.data.destination;
  if (response.id && (response.collectionWasteEntryId || response.entryId)) return response;
  return null;
};

export const extractWasteDestinationEntry = (response) => response?.entry || response?.data?.entry || null;
export const extractWasteDestinationStockLot = (response) => response?.stockLot || response?.data?.stockLot || null;

export const extractWasteDestinationPagination = (response) => {
  const pagination = response?.pagination || response?.data?.pagination;
  return {
    page: Number(pagination?.page || 1),
    limit: Number(pagination?.limit || 20),
    total: Number(pagination?.total || 0),
    totalPages: Number(pagination?.totalPages || 0),
    hasNextPage: Boolean(pagination?.hasNextPage),
    hasPreviousPage: Boolean(pagination?.hasPreviousPage),
  };
};

export const extractWasteDestinationTotals = (response) => response?.totalsByUnit || response?.data?.totalsByUnit || {};

export const pingWasteDestinations = async () => apiRequest(`${WASTE_DESTINATION_ENDPOINT}/ping`, { method: "GET" });
export const getWasteDestinations = async (filters = {}) => apiRequest(`${WASTE_DESTINATION_ENDPOINT}${buildWasteDestinationQueryString(filters)}`, { method: "GET" });
export const getWasteDestinationsByEntry = async (entryId, filters = {}) => {
  const normalizedEntryId = normalizeText(entryId);
  if (!normalizedEntryId) throw new Error("ID da entrada de resíduo não informado.");
  return apiRequest(`${WASTE_DESTINATION_ENDPOINT}/entry/${normalizedEntryId}${buildWasteDestinationQueryString(filters)}`, { method: "GET" });
};
export const getWasteDestinationById = async (destinationId) => {
  const normalizedId = normalizeText(destinationId);
  if (!normalizedId) throw new Error("ID da destinação não informado.");
  return apiRequest(`${WASTE_DESTINATION_ENDPOINT}/${normalizedId}`, { method: "GET" });
};
export const createWasteDestination = async (payload = {}) => apiRequest(WASTE_DESTINATION_ENDPOINT, { method: "POST", body: normalizeCreatePayload(payload) });
export const updateWasteDestination = async (destinationId, payload = {}) => {
  const normalizedId = normalizeText(destinationId);
  if (!normalizedId) throw new Error("ID da destinação não informado.");
  return apiRequest(`${WASTE_DESTINATION_ENDPOINT}/${normalizedId}`, { method: "PATCH", body: normalizeUpdatePayload(payload) });
};
export const cancelWasteDestination = async (destinationId, payload = {}) => {
  const normalizedId = normalizeText(destinationId);
  if (!normalizedId) throw new Error("ID da destinação não informado.");
  return apiRequest(`${WASTE_DESTINATION_ENDPOINT}/${normalizedId}/cancel`, { method: "POST", body: normalizeCancelPayload(payload) });
};

export const WASTE_DESTINATION_TYPE_OPTIONS = [
  { value: "", label: "Todos os tipos" },
  { value: "STOCK", label: "Adicionar ao estoque", shortLabel: "Estoque" },
  { value: "TRIAGE", label: "Enviar para triagem", shortLabel: "Triagem" },
  { value: "REJECT", label: "Registrar como rejeito", shortLabel: "Rejeito" },
  { value: "DISPOSAL", label: "Enviar para descarte", shortLabel: "Descarte" },
  { value: "DIRECT_DESTINATION", label: "Destinação direta", shortLabel: "Destino direto" },
  { value: "RESERVATION", label: "Reservar material", shortLabel: "Reserva" },
];

export const getWasteDestinationTypeLabel = (type) => WASTE_DESTINATION_TYPE_OPTIONS.find((o) => o.value === normalizeUppercase(type))?.label || type || "Não informado";
export const getWasteDestinationTypeShortLabel = (type) => WASTE_DESTINATION_TYPE_OPTIONS.find((o) => o.value === normalizeUppercase(type))?.shortLabel || type || "Não informado";

export const WASTE_DESTINATION_STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "ACTIVE", label: "Ativa" },
  { value: "CANCELLED", label: "Cancelada" },
];

export const getWasteDestinationStatusLabel = (status) => WASTE_DESTINATION_STATUS_OPTIONS.find((o) => o.value === normalizeUppercase(status))?.label || status || "Não informado";

export const getWasteDestinationRequirements = (type) => {
  switch (normalizeUppercase(type)) {
    case "STOCK": return { stockItemId: true, destinationName: false, notes: false };
    case "TRIAGE": return { stockItemId: false, destinationName: true, notes: false };
    case "REJECT": return { stockItemId: false, destinationName: false, notes: true };
    case "DISPOSAL": return { stockItemId: false, destinationName: true, notes: true };
    case "DIRECT_DESTINATION": return { stockItemId: false, destinationName: true, notes: false };
    case "RESERVATION": return { stockItemId: false, destinationName: true, notes: false };
    default: return { stockItemId: false, destinationName: false, notes: false };
  }
};

export default {
  pingWasteDestinations, getWasteDestinations, getWasteDestinationsByEntry, getWasteDestinationById, createWasteDestination, updateWasteDestination, cancelWasteDestination,
  extractWasteDestinations, extractWasteDestination, extractWasteDestinationEntry, extractWasteDestinationStockLot, extractWasteDestinationPagination, extractWasteDestinationTotals,
  getWasteDestinationTypeLabel, getWasteDestinationTypeShortLabel, getWasteDestinationStatusLabel, getWasteDestinationRequirements,
};