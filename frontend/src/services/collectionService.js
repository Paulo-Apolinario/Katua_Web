import { apiRequest } from "./apiClient";

/*
==========================================================
COLLECTION SERVICE
Nova arquitetura KATUÁ Enterprise
==========================================================
*/

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
};

const requireId = (id, label = "coleta") => {
  const normalizedId = normalizeText(id);

  if (!normalizedId) {
    throw new Error(`ID da ${label} não informado.`);
  }

  return encodeURIComponent(normalizedId);
};

const normalizeCollectionPayload = (payload = {}) => {
  const data = {
    scheduleId: payload.scheduleId,
    collectorId: payload.collectorId,
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

  const notes = normalizeText(payload.notes);

  if (notes) {
    data.notes = notes;
  }

  return data;
};

export const getAllCollections = async () => {
  return apiRequest("/collections", {
    method: "GET",
  });
};

export const getCollectionById = async (id) => {
  return apiRequest(`/collections/${requireId(id)}`, {
    method: "GET",
  });
};

export const createCollectionFromSchedule = async (payload = {}) => {
  return apiRequest("/collections", {
    method: "POST",
    body: normalizeCollectionPayload(payload),
  });
};

export const startCollection = async (id, payload = {}) => {
  return apiRequest(`/collections/${requireId(id)}/start`, {
    method: "POST",
    body: payload,
  });
};

export const completeCollectionField = async (id, payload = {}) => {
  return apiRequest(`/collections/${requireId(id)}/complete-field`, {
    method: "POST",
    body: payload,
  });
};

export const receiveCollection = async (id, payload = {}) => {
  return apiRequest(`/collections/${requireId(id)}/receive`, {
    method: "POST",
    body: payload,
  });
};

export const startCollectionSorting = async (id, payload = {}) => {
  return apiRequest(`/collections/${requireId(id)}/start-sorting`, {
    method: "POST",
    body: payload,
  });
};

export const completeCollection = async (id, payload = {}) => {
  return apiRequest(`/collections/${requireId(id)}/complete`, {
    method: "POST",
    body: payload,
  });
};

export const cancelCollection = async (id, payload = {}) => {
  return apiRequest(`/collections/${requireId(id)}/cancel`, {
    method: "POST",
    body: payload,
  });
};

export const updateCollectionStatus = async (id, payload = {}) => {
  return apiRequest(`/collections/${requireId(id)}/status`, {
    method: "PATCH",
    body: payload,
  });
};

export default {
  getAllCollections,
  getCollectionById,
  createCollectionFromSchedule,
  startCollection,
  completeCollectionField,
  receiveCollection,
  startCollectionSorting,
  completeCollection,
  cancelCollection,
  updateCollectionStatus,
};
