import { apiRequest } from "./apiClient";

const WASTE_TYPE_ENDPOINT = "/waste-stock/items";

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
};

const normalizeNcm = (value) => {
  const normalized = normalizeText(value).replace(/\D/g, "");
  return normalized || "";
};

const normalizeInternalCode = (value) => {
  const normalized = normalizeText(value);

  return normalized ? normalized.toUpperCase() : "";
};

const normalizeWasteTypePayload = (payload = {}) => {
  const source = payload?.item || payload;

  const data = {
    name: normalizeText(source.name),
    category: normalizeText(source.category),
    unit: normalizeText(source.unit || "KG").toUpperCase(),
    wasteClass: normalizeText(
      source.wasteClass || "NOT_INFORMED"
    ).toUpperCase(),
    status: normalizeText(source.status || "ACTIVE").toUpperCase(),
  };

  const subcategory = normalizeText(source.subcategory);
  const ncm = normalizeNcm(source.ncm);
  const internalCode = normalizeInternalCode(source.internalCode);
  const description = normalizeText(source.description);

  if (subcategory) {
    data.subcategory = subcategory;
  }

  if (ncm) {
    data.ncm = ncm;
  }

  if (internalCode) {
    data.internalCode = internalCode;
  }

  if (description) {
    data.description = description;
  }

  return data;
};

const buildQueryString = (filters = {}) => {
  const params = new URLSearchParams();

  const status = normalizeText(filters.status);
  const category = normalizeText(filters.category);
  const search = normalizeText(filters.search);

  if (status) {
    params.set("status", status.toUpperCase());
  }

  if (category) {
    params.set("category", category);
  }

  if (search) {
    params.set("search", search);
  }

  const query = params.toString();

  return query ? `?${query}` : "";
};

/**
 * Lista os tipos de resíduos pertencentes à cooperativa autenticada.
 *
 * GET /waste-stock/items
 */
export const getAllWasteTypes = async (filters = {}) => {
  const queryString = buildQueryString(filters);

  return apiRequest(`${WASTE_TYPE_ENDPOINT}${queryString}`, {
    method: "GET",
  });
};

/**
 * Alias semântico para telas que usam a nomenclatura
 * "Gestão de Resíduos".
 */
export const getWasteCatalog = async (filters = {}) => {
  return getAllWasteTypes(filters);
};

/**
 * Busca um tipo de resíduo pelo ID.
 *
 * GET /waste-stock/items/:id
 */
export const getWasteTypeById = async (id) => {
  if (!id) {
    throw new Error("ID do tipo de resíduo não informado.");
  }

  return apiRequest(`${WASTE_TYPE_ENDPOINT}/${id}`, {
    method: "GET",
  });
};

/**
 * Cadastra somente o tipo de resíduo.
 *
 * Não cria lote nem quantidade de estoque.
 *
 * POST /waste-stock/items
 */
export const createWasteType = async (payload = {}) => {
  const data = normalizeWasteTypePayload(payload);

  return apiRequest(WASTE_TYPE_ENDPOINT, {
    method: "POST",
    body: data,
  });
};

/**
 * Atualiza os dados do tipo de resíduo.
 *
 * PUT /waste-stock/items/:id
 */
export const updateWasteType = async (id, payload = {}) => {
  if (!id) {
    throw new Error("ID do tipo de resíduo não informado.");
  }

  const data = normalizeWasteTypePayload(payload);

  return apiRequest(`${WASTE_TYPE_ENDPOINT}/${id}`, {
    method: "PUT",
    body: data,
  });
};

/**
 * Atualiza parcialmente os dados do tipo de resíduo.
 *
 * PATCH /waste-stock/items/:id
 */
export const patchWasteType = async (id, payload = {}) => {
  if (!id) {
    throw new Error("ID do tipo de resíduo não informado.");
  }

  const data = normalizeWasteTypePayload(payload);

  return apiRequest(`${WASTE_TYPE_ENDPOINT}/${id}`, {
    method: "PATCH",
    body: data,
  });
};

/**
 * Inativa um tipo de resíduo.
 *
 * O backend não remove definitivamente para preservar
 * coletas, lotes, relatórios e histórico.
 *
 * DELETE /waste-stock/items/:id
 */
export const deleteWasteType = async (id) => {
  if (!id) {
    throw new Error("ID do tipo de resíduo não informado.");
  }

  return apiRequest(`${WASTE_TYPE_ENDPOINT}/${id}`, {
    method: "DELETE",
  });
};

/**
 * Ativa novamente um tipo de resíduo inativo.
 */
export const activateWasteType = async (id) => {
  if (!id) {
    throw new Error("ID do tipo de resíduo não informado.");
  }

  return patchWasteType(id, {
    status: "ACTIVE",
  });
};

/**
 * Inativa explicitamente um tipo de resíduo.
 */
export const deactivateWasteType = async (id) => {
  if (!id) {
    throw new Error("ID do tipo de resíduo não informado.");
  }

  return patchWasteType(id, {
    status: "INACTIVE",
  });
};

export const WASTE_UNIT_OPTIONS = [
  {
    value: "KG",
    label: "Quilograma (kg)",
    shortLabel: "kg",
  },
  {
    value: "TON",
    label: "Tonelada (t)",
    shortLabel: "t",
  },
  {
    value: "LITER",
    label: "Litro (L)",
    shortLabel: "L",
  },
  {
    value: "UNIT",
    label: "Unidade",
    shortLabel: "un.",
  },
  {
    value: "CUBIC_METER",
    label: "Metro cúbico (m³)",
    shortLabel: "m³",
  },
];

export const WASTE_CLASS_OPTIONS = [
  {
    value: "NOT_INFORMED",
    label: "Não informado",
  },
  {
    value: "CLASS_I",
    label: "Classe I — Perigoso",
  },
  {
    value: "CLASS_II_A",
    label: "Classe II A — Não inerte",
  },
  {
    value: "CLASS_II_B",
    label: "Classe II B — Inerte",
  },
];

export const WASTE_STATUS_OPTIONS = [
  {
    value: "ACTIVE",
    label: "Ativo",
  },
  {
    value: "INACTIVE",
    label: "Inativo",
  },
];

export const getWasteUnitLabel = (unit) => {
  return (
    WASTE_UNIT_OPTIONS.find((item) => item.value === unit)?.label ||
    unit ||
    "Não informado"
  );
};

export const getWasteUnitShortLabel = (unit) => {
  return (
    WASTE_UNIT_OPTIONS.find((item) => item.value === unit)
      ?.shortLabel ||
    unit ||
    ""
  );
};

export const getWasteClassLabel = (wasteClass) => {
  return (
    WASTE_CLASS_OPTIONS.find(
      (item) => item.value === wasteClass
    )?.label ||
    wasteClass ||
    "Não informado"
  );
};

export default {
  getAllWasteTypes,
  getWasteCatalog,
  getWasteTypeById,
  createWasteType,
  updateWasteType,
  patchWasteType,
  deleteWasteType,
  activateWasteType,
  deactivateWasteType,
};