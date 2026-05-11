import { apiRequest } from "./apiClient";

const normalizeDriverPayload = (payload = {}) => {
  const data = {
    name: payload.name?.trim(),
    email: payload.email?.trim().toLowerCase(),
    status: payload.status || "AVAILABLE",
  };

  if (payload.phone?.trim()) {
    data.phone = payload.phone.trim();
  }

  if (payload.cpf?.trim()) {
    data.cpf = payload.cpf.trim();
  }

  if (payload.cnh?.trim()) {
    data.cnh = payload.cnh.trim();
  }

  if (payload.cnhCategory?.trim()) {
    data.cnhCategory = payload.cnhCategory.trim().toUpperCase();
  }

  if (payload.notes?.trim()) {
    data.notes = payload.notes.trim();
  }

  return data;
};

export const getAllDrivers = async () => {
  return apiRequest("/drivers", {
    method: "GET",
  });
};

export const getDriverById = async (id) => {
  return apiRequest(`/drivers/${id}`, {
    method: "GET",
  });
};

export const createDriver = async (payload) => {
  return apiRequest("/drivers", {
    method: "POST",
    body: JSON.stringify(normalizeDriverPayload(payload)),
  });
};

export const updateDriverStatus = async (id, status) => {
  return apiRequest(`/drivers/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
};

export const updateDriver = async (id, payload) => {
  return updateDriverStatus(id, payload.status);
};