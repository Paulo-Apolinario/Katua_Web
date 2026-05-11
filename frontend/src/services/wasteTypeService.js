const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const WASTE_STOCK_API = `${API_BASE_URL}/api/waste-stock`;

const getToken = () => localStorage.getItem("auth_token");

const parseResponse = async (res) => {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw data;
  }

  return data;
};

const buildHeaders = () => {
  const token = getToken();

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
};

/**
 * Lista estoque de resíduos/lotes da cooperativa
 * GET /api/waste-stock
 */
export const getAllWasteTypes = async () => {
  const res = await fetch(WASTE_STOCK_API, {
    method: "GET",
    headers: buildHeaders(),
    credentials: "include",
  });

  return parseResponse(res);
};

/**
 * Cria material e lote de estoque
 * POST /api/waste-stock
 */
export const createWasteType = async (payload) => {
  const res = await fetch(WASTE_STOCK_API, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return parseResponse(res);
};

/**
 * Busca material/lote de estoque por ID
 * GET /api/waste-stock/:id
 */
export const getWasteTypeById = async (id) => {
  const res = await fetch(`${WASTE_STOCK_API}/${id}`, {
    method: "GET",
    headers: buildHeaders(),
    credentials: "include",
  });

  return parseResponse(res);
};

/**
 * Atualiza material/lote de estoque
 * PUT /api/waste-stock/:id
 */
export const updateWasteType = async (id, payload) => {
  const res = await fetch(`${WASTE_STOCK_API}/${id}`, {
    method: "PUT",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return parseResponse(res);
};

/**
 * Remove/inativa material/lote de estoque
 * DELETE /api/waste-stock/:id
 */
export const deleteWasteType = async (id) => {
  const res = await fetch(`${WASTE_STOCK_API}/${id}`, {
    method: "DELETE",
    headers: buildHeaders(),
    credentials: "include",
  });

  return parseResponse(res);
};

/**
 * Lista somente lotes de um material específico
 * GET /api/waste-stock/:id/lots
 */
export const getWasteStockLots = async (id) => {
  const res = await fetch(`${WASTE_STOCK_API}/${id}/lots`, {
    method: "GET",
    headers: buildHeaders(),
    credentials: "include",
  });

  return parseResponse(res);
};

/**
 * Cria um novo lote para um material já existente
 * POST /api/waste-stock/:id/lots
 */
export const createWasteStockLot = async (id, payload) => {
  const res = await fetch(`${WASTE_STOCK_API}/${id}/lots`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return parseResponse(res);
};

/**
 * Atualiza um lote específico
 * PUT /api/waste-stock/lots/:lotId
 */
export const updateWasteStockLot = async (lotId, payload) => {
  const res = await fetch(`${WASTE_STOCK_API}/lots/${lotId}`, {
    method: "PUT",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return parseResponse(res);
};

/**
 * Remove/inativa um lote específico
 * DELETE /api/waste-stock/lots/:lotId
 */
export const deleteWasteStockLot = async (lotId) => {
  const res = await fetch(`${WASTE_STOCK_API}/lots/${lotId}`, {
    method: "DELETE",
    headers: buildHeaders(),
    credentials: "include",
  });

  return parseResponse(res);
};