import { apiRequest } from "./apiClient";
const send = (path, method, body) =>
  apiRequest(path, { method, body: JSON.stringify(body) });
export const getPlanningSources = () => apiRequest("/route-planning/sources");
export const getRoutePlans = () => apiRequest("/route-plans");
export const saveRoutePlan = (id, data) =>
  send(id ? `/route-plans/${id}` : "/route-plans", id ? "PATCH" : "POST", data);
export const generateRoutePlan = (id) =>
  send(`/route-plans/${id}/generate`, "POST", {});
export const optimizeRoute = (data) =>
  send("/route-planning/optimize", "POST", data);
export const pointCollection = (p) => ({
  id: `point:${p.key}`,
  routePoint: p,
  status: "PENDING",
});
