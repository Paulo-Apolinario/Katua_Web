import { apiRequest } from "./apiClient";

const normalizeMaterialItem = (item = {}) => {
  return {
    type: String(item.type || "").trim(),
    quantityKg: Number(item.quantityKg || 0),
  };
};

const normalizeMaterials = (materials = []) => {
  if (!Array.isArray(materials)) return [];

  return materials
    .map(normalizeMaterialItem)
    .filter((item) => item.type && item.quantityKg >= 0);
};

const normalizeCollectionPayload = (payload = {}) => {
  const data = {
    scheduleId: payload.scheduleId,
    collectorId: payload.collectorId,
    materials: normalizeMaterials(payload.materials),
    totalWeightKg: Number(payload.totalWeightKg || 0),
  };

  if (payload.driverId) {
    data.driverId = payload.driverId;
  }

  if (payload.vehicleId) {
    data.vehicleId = payload.vehicleId;
  }

  if (payload.routeId) {
    data.routeId = payload.routeId;
  }

  if (payload.collectedAt) {
    data.collectedAt = payload.collectedAt;
  }

  if (payload.notes?.trim()) {
    data.notes = payload.notes.trim();
  }

  return data;
};

export const getAllCollections = async () => {
  return apiRequest("/collections", {
    method: "GET",
  });
};

export const getCollectionById = async (id) => {
  return apiRequest(`/collections/${id}`, {
    method: "GET",
  });
};

export const createCollectionFromSchedule = async (payload) => {
  return apiRequest("/collections", {
    method: "POST",
    body: normalizeCollectionPayload(payload),
  });
};

export const updateCollectionStatus = async (id, payload) => {
  return apiRequest(`/collections/${id}/status`, {
    method: "PATCH",
    body: payload,
  });
};