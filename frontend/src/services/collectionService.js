import { apiRequest } from "./apiClient";

/*
==========================================================
COLLECTION SERVICE
Nova arquitetura KATUÁ Enterprise
==========================================================

A criação da coleta NÃO recebe mais:

- materials
- totalWeightKg

Os materiais reais serão informados posteriormente
pelo catador durante a execução da coleta.

Fluxo aprovado:

Schedule
    ↓
Create Collection
    ↓
Collector registra materiais
    ↓
CollectionWasteEntry
    ↓
Destinações
    ↓
Lotes
==========================================================
*/

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
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

  if (payload.notes) {
    const notes = normalizeText(payload.notes);

    if (notes) {
      data.notes = notes;
    }
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

/*
==========================================================
Cria a coleta operacional

IMPORTANTE

Não envia:

- materials
- totalWeightKg

Essas informações serão registradas posteriormente
durante a execução da coleta.
==========================================================
*/

export const createCollectionFromSchedule = async (payload = {}) => {
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

export default {
  getAllCollections,
  getCollectionById,
  createCollectionFromSchedule,
  updateCollectionStatus,
};