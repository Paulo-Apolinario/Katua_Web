import { apiRequest } from "./apiClient";

const normalizeRoutePayload = (payload = {}) => {
  const data = {
    name: payload.name?.trim(),
    stops: Array.isArray(payload.stops)
      ? payload.stops.map((item) => item.trim()).filter(Boolean)
      : [],
  };

  if (payload.driverId) data.driverId = payload.driverId;
  if (payload.vehicleId) data.vehicleId = payload.vehicleId;
  if (payload.description?.trim()) data.description = payload.description.trim();
  if (payload.scheduledDate?.trim()) data.scheduledDate = payload.scheduledDate.trim();
  if (payload.status) data.status = payload.status;

  return data;
};

export const getAllRoutes = async () => {
  return apiRequest("/routes", {
    method: "GET",
  });
};

export const getRouteById = async (id) => {
  return apiRequest(`/routes/${id}`, {
    method: "GET",
  });
};

export const createRoute = async (payload) => {
  return apiRequest("/routes", {
    method: "POST",
    body: JSON.stringify(normalizeRoutePayload(payload)),
  });
};

export const updateRoute = async (id, payload) => {
  return apiRequest(`/routes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(normalizeRoutePayload(payload)),
  });
};

export const updateRouteStatus = async (id, status) => {
  return apiRequest(`/routes/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
};

export const getAvailableCollections = async () => {
  return apiRequest("/routes/available-collections", {
    method: "GET",
  });
};

export const addCollectionToRoute = async (routeId, collectionId) => {
  return apiRequest(`/routes/${routeId}/collections/${collectionId}`, {
    method: "POST",
  });
};

export const removeCollectionFromRoute = async (routeId, collectionId) => {
  return apiRequest(`/routes/${routeId}/collections/${collectionId}`, {
    method: "DELETE",
  });
};