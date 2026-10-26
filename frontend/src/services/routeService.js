import { apiRequest } from "./apiClient";

export const normalizeRoutePayload = (payload = {}) => {
  const data = {};
  if (payload.name !== undefined) data.name = payload.name?.trim();
  if (payload.stops !== undefined)
    data.stops = Array.isArray(payload.stops)
      ? payload.stops.map((item) => item.trim()).filter(Boolean)
      : payload.stops;
  for (const field of [
    "driverId",
    "vehicleId",
    "description",
    "scheduledDate",
  ]) {
    if (payload[field] !== undefined)
      data[field] = payload[field]?.trim() || null;
  }
  if (payload.collectionIds !== undefined)
    data.collectionIds = payload.collectionIds;
  for (const key of [
    "pointUpdates",
    "plannedPoints",
    "visitOrder",
    "collectorIds",
    "startPoint",
    "endPoint",
    "departureTime",
    "estimatedMinutes",
    "expectedRevision",
  ])
    if (payload[key] !== undefined) data[key] = payload[key];
  if (payload.status !== undefined) data.status = payload.status;
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
    body: JSON.stringify(
      Object.fromEntries(
        Object.entries(normalizeRoutePayload(payload)).filter(
          ([, value]) => value !== null,
        ),
      ),
    ),
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
