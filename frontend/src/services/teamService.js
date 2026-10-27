import { apiRequest } from "./apiClient";
export const listTeams = () =>
  apiRequest("/collector-teams").then((r) => r.teams);
export const saveTeam = (id, body) =>
  apiRequest(`/collector-teams${id ? "/" + id : ""}`, {
    method: id ? "PATCH" : "POST",
    body,
  });
export const assignTeam = (id, body) =>
  apiRequest(`/collections/${id}/team`, { method: "POST", body });
export const allocateMaterials = (id, body) =>
  apiRequest(`/collections/${id}/allocate-materials`, { method: "POST", body });
