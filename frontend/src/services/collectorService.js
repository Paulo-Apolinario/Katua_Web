import { apiRequest } from "./apiClient";

const normalizeCollectorPayload = (payload = {}) => {
  const data = {
    name: payload.name?.trim(),
    email: payload.email?.trim().toLowerCase(),
    status: payload.status || "AVAILABLE",
  };

  if (payload.phone?.trim()) {
    data.phone = payload.phone.trim();
  }

  if (payload.rg?.trim()) {
    data.rg = payload.rg.trim();
  }

  if (payload.birthDate?.trim()) {
    data.birthDate = payload.birthDate.trim();
  }

  return data;
};

export const getAllCollectors = async () => {
  return apiRequest("/collectors", {
    method: "GET",
  });
};

export const getCollectorById = async (id) => {
  return apiRequest(`/collectors/${id}`, {
    method: "GET",
  });
};

export const createCollector = async (payload) => {
  return apiRequest("/collectors", {
    method: "POST",
    body: normalizeCollectorPayload(payload),
  });
};

export const updateCollectorStatus = async (id, status) => {
  return apiRequest(`/collectors/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
};

export const updateCollector = async (id, payload) => {
  return updateCollectorStatus(id, payload.status);
};