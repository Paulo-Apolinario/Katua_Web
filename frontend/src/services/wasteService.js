import { apiRequest } from "./apiClient";

const normalizeMaterials = (materials = []) => {
  if (!Array.isArray(materials)) return [];

  return materials
    .map((item) => ({
      type: String(item.type || "").trim(),
      quantityKg: Number(item.quantityKg || 0),
    }))
    .filter((item) => item.type && item.quantityKg >= 0);
};

export const getAllWastes = async () => {
  return apiRequest("/collections", {
    method: "GET",
  });
};

export const getWasteById = async (id) => {
  return apiRequest(`/collections/${id}`, {
    method: "GET",
  });
};

export const createWaste = async (payload = {}) => {
  const data = {
    scheduleId: payload.scheduleId,
    collectorId: payload.collectorId,
  };

  if (payload.driverId) data.driverId = payload.driverId;
  if (payload.vehicleId) data.vehicleId = payload.vehicleId;
  if (payload.routeId) data.routeId = payload.routeId;
  if (payload.collectedAt) data.collectedAt = payload.collectedAt;
  if (payload.notes?.trim()) data.notes = payload.notes.trim();

  const materials = normalizeMaterials(payload.materials);

  if (materials.length > 0) {
    data.materials = materials;
    data.totalWeightKg = materials.reduce(
      (sum, item) => sum + Number(item.quantityKg || 0),
      0
    );
  }

  return apiRequest("/collections", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updateWaste = async (id, payload = {}) => {
  const data = {
    status: payload.status,
  };

  if (payload.collectedAt) data.collectedAt = payload.collectedAt;
  if (payload.notes?.trim()) data.notes = payload.notes.trim();

  const materials = normalizeMaterials(payload.materials);

  if (materials.length > 0) {
    data.materials = materials;
    data.totalWeightKg = materials.reduce(
      (sum, item) => sum + Number(item.quantityKg || 0),
      0
    );
  }

  return apiRequest(`/collections/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const deleteWaste = async () => {
  throw new Error("O backend KATUÁ não possui exclusão de coletas. Use status CANCELLED.");
};