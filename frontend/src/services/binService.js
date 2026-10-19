import { apiRequest } from "./apiClient";
const path = (id) => `/bins/${encodeURIComponent(id)}`;
export const getAllBins = () => apiRequest("/bins");
export const getBinById = (id) => apiRequest(path(id));
export const createBin = (payload) =>
  apiRequest("/bins", { method: "POST", body: payload });
export const updateBin = (id, payload) =>
  apiRequest(path(id), { method: "PUT", body: payload });
export const deleteBin = (id) => apiRequest(path(id), { method: "DELETE" });
export const getBinEvents = (id, page = 1) =>
  apiRequest(`${path(id)}/events?page=${page}`);
export const createBinEvent = (id, payload) =>
  apiRequest(`${path(id)}/events`, { method: "POST", body: payload });
export const resolveBinEvent = (id, eventId) =>
  apiRequest(`${path(id)}/events/${encodeURIComponent(eventId)}/resolve`, {
    method: "POST",
  });
export const requestBinPickup = (id, payload) =>
  apiRequest(`${path(id)}/withdrawals`, { method: "POST", body: payload });
export const getBinWithdrawals = (id, page = 1) =>
  apiRequest(`${path(id)}/withdrawals?page=${page}`);
export const uploadBinPhoto = (id, file) => {
  const data = new FormData();
  data.append("photo", file);
  return apiRequest(`${path(id)}/photo`, { method: "PUT", body: data });
};
export const removeBinPhoto = (id) =>
  apiRequest(`${path(id)}/photo`, { method: "DELETE" });
