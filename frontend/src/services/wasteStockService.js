import { apiRequest } from "./apiClient";

const WASTE_STOCK_ENDPOINT = "/waste-stock";

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
};

const normalizeQuantity = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const normalized =
    typeof value === "string"
      ? value.trim().replace(",", ".")
      : value;

  const quantity = Number(normalized);

  return Number.isFinite(quantity) ? quantity : null;
};

const normalizeLotPayload = (payload = {}) => {
  const quantity = normalizeQuantity(
    payload.quantity ?? payload.quantityKg
  );

  const data = {
    lotCode: normalizeText(payload.lotCode),
    quantity,
    processingStage: normalizeText(
      payload.processingStage || "TRIADO"
    ).toUpperCase(),
    status: normalizeText(
      payload.status || "AVAILABLE"
    ).toUpperCase(),
  };

  const unit = normalizeText(payload.unit);
  const storageLocation = normalizeText(payload.storageLocation);
  const origin = normalizeText(payload.origin);
  const notes = normalizeText(payload.notes);

  if (unit) {
    data.unit = unit.toUpperCase();
  }

  if (storageLocation) {
    data.storageLocation = storageLocation;
  }

  if (origin) {
    data.origin = origin;
  }

  if (notes) {
    data.notes = notes;
  }

  return data;
};

const extractArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.stock)) return response.stock;
  if (Array.isArray(response?.lots)) return response.lots;
  if (Array.isArray(response?.data)) return response.data;

  return [];
};

/**
 * Lista o catálogo com seus lotes e totais.
 *
 * Esta função é usada pela visão geral do estoque.
 *
 * GET /waste-stock/items
 */
export const getWasteStockOverview = async (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  const query = params.toString();
  const endpoint = query
    ? `${WASTE_STOCK_ENDPOINT}/items?${query}`
    : `${WASTE_STOCK_ENDPOINT}/items`;

  return apiRequest(endpoint, {
    method: "GET",
  });
};

/**
 * Retorna uma lista normalizada para componentes que precisam
 * diretamente de um array.
 */
export const getWasteStockItemsArray = async (filters = {}) => {
  const response = await getWasteStockOverview(filters);
  return extractArray(response);
};

/**
 * Busca o material e seus lotes.
 *
 * GET /waste-stock/items/:itemId
 */
export const getWasteStockItemById = async (itemId) => {
  if (!itemId) {
    throw new Error("ID do tipo de resíduo não informado.");
  }

  return apiRequest(
    `${WASTE_STOCK_ENDPOINT}/items/${itemId}`,
    {
      method: "GET",
    }
  );
};

/**
 * Lista os lotes de um tipo de resíduo.
 *
 * GET /waste-stock/items/:itemId/lots
 */
export const getWasteStockLots = async (itemId) => {
  if (!itemId) {
    throw new Error("ID do tipo de resíduo não informado.");
  }

  return apiRequest(
    `${WASTE_STOCK_ENDPOINT}/items/${itemId}/lots`,
    {
      method: "GET",
    }
  );
};

/**
 * Cria um novo lote para um tipo de resíduo já cadastrado.
 *
 * POST /waste-stock/items/:itemId/lots
 */
export const createWasteStockLot = async (
  itemId,
  payload = {}
) => {
  if (!itemId) {
    throw new Error("Selecione o tipo de resíduo do lote.");
  }

  const data = normalizeLotPayload(payload);

  return apiRequest(
    `${WASTE_STOCK_ENDPOINT}/items/${itemId}/lots`,
    {
      method: "POST",
      body: data,
    }
  );
};

/**
 * Atualiza completamente um lote.
 *
 * PUT /waste-stock/lots/:lotId
 */
export const updateWasteStockLot = async (
  lotId,
  payload = {}
) => {
  if (!lotId) {
    throw new Error("ID do lote não informado.");
  }

  const data = normalizeLotPayload(payload);

  return apiRequest(
    `${WASTE_STOCK_ENDPOINT}/lots/${lotId}`,
    {
      method: "PUT",
      body: data,
    }
  );
};

/**
 * Atualiza parcialmente um lote.
 *
 * PATCH /waste-stock/lots/:lotId
 */
export const patchWasteStockLot = async (
  lotId,
  payload = {}
) => {
  if (!lotId) {
    throw new Error("ID do lote não informado.");
  }

  const data = {};

  if (payload.lotCode !== undefined) {
    data.lotCode = normalizeText(payload.lotCode);
  }

  if (
    payload.quantity !== undefined ||
    payload.quantityKg !== undefined
  ) {
    data.quantity = normalizeQuantity(
      payload.quantity ?? payload.quantityKg
    );
  }

  if (payload.unit !== undefined) {
    data.unit = normalizeText(payload.unit).toUpperCase();
  }

  if (payload.storageLocation !== undefined) {
    data.storageLocation = normalizeText(
      payload.storageLocation
    );
  }

  if (payload.processingStage !== undefined) {
    data.processingStage = normalizeText(
      payload.processingStage
    ).toUpperCase();
  }

  if (payload.origin !== undefined) {
    data.origin = normalizeText(payload.origin);
  }

  if (payload.notes !== undefined) {
    data.notes = normalizeText(payload.notes);
  }

  if (payload.status !== undefined) {
    data.status = normalizeText(payload.status).toUpperCase();
  }

  return apiRequest(
    `${WASTE_STOCK_ENDPOINT}/lots/${lotId}`,
    {
      method: "PATCH",
      body: data,
    }
  );
};

/**
 * Descarta ou inativa um lote.
 *
 * DELETE /waste-stock/lots/:lotId
 */
export const deleteWasteStockLot = async (lotId) => {
  if (!lotId) {
    throw new Error("ID do lote não informado.");
  }

  return apiRequest(
    `${WASTE_STOCK_ENDPOINT}/lots/${lotId}`,
    {
      method: "DELETE",
    }
  );
};

/**
 * Alias semântico para descarte de lote.
 */
export const discardWasteStockLot = async (lotId) => {
  return deleteWasteStockLot(lotId);
};

export const WASTE_PROCESSING_STAGE_OPTIONS = [
  {
    value: "TRIADO",
    label: "Triado",
  },
  {
    value: "TRITURADO",
    label: "Triturado",
  },
  {
    value: "PRENSADO",
    label: "Prensado",
  },
  {
    value: "ENFARDADO",
    label: "Enfardado",
  },
  {
    value: "ARMAZENADO",
    label: "Armazenado",
  },
  {
    value: "DESTINADO",
    label: "Destinado",
  },
];

export const WASTE_LOT_STATUS_OPTIONS = [
  {
    value: "AVAILABLE",
    label: "Disponível",
  },
  {
    value: "RESERVED",
    label: "Reservado",
  },
  {
    value: "SOLD",
    label: "Vendido/Destinado",
  },
  {
    value: "DISCARDED",
    label: "Descartado",
  },
];

export const getProcessingStageLabel = (value) => {
  return (
    WASTE_PROCESSING_STAGE_OPTIONS.find(
      (item) => item.value === value
    )?.label ||
    value ||
    "Não informado"
  );
};

export const getWasteLotStatusLabel = (value) => {
  return (
    WASTE_LOT_STATUS_OPTIONS.find(
      (item) => item.value === value
    )?.label ||
    value ||
    "Não informado"
  );
};

export default {
  getWasteStockOverview,
  getWasteStockItemsArray,
  getWasteStockItemById,
  getWasteStockLots,
  createWasteStockLot,
  updateWasteStockLot,
  patchWasteStockLot,
  deleteWasteStockLot,
  discardWasteStockLot,
};