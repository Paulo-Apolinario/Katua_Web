import { apiRequest } from "./apiClient";

const normalizeVehiclePayload = (payload = {}) => {
  const data = {
    plate: payload.plate?.trim().toUpperCase(),
    model: payload.model?.trim(),
    status: payload.status || "ACTIVE",
  };

  if (payload.brand?.trim()) {
    data.brand = payload.brand.trim();
  }

  if (payload.year) {
    data.year = Number(payload.year);
  }

  if (payload.capacityKg !== "" && payload.capacityKg !== undefined) {
    data.capacityKg = Number(payload.capacityKg);
  }

  if (payload.driverId) {
    data.driverId = payload.driverId;
  }

  return data;
};

export const getAllVehicles = async () => {
  return apiRequest("/vehicles", {
    method: "GET",
  });
};

export const getVehicleById = async (id) => {
  return apiRequest(`/vehicles/${id}`, {
    method: "GET",
  });
};

export const createVehicle = async (payload) => {
  return apiRequest("/vehicles", {
    method: "POST",
    body: JSON.stringify(normalizeVehiclePayload(payload)),
  });
};

export const updateVehicleStatus = async (id, status) => {
  return apiRequest(`/vehicles/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
};

export const updateVehicle = async (id, payload) => {
  return updateVehicleStatus(id, payload.status);
};

export const deleteVehicle = async (id) => {
  return apiRequest(`/vehicles/${id}`, {
    method: "DELETE",
  });
};