import { apiRequest } from "./apiClient";
const request = async (path, options) =>
  (await apiRequest("/settings/" + path, options)).data;
export const settingsApi = {
  context: (signal) => request("context", { signal }),
  company: (body) => request("company", { method: "PUT", body }),
  preferences: (body) => request("preferences", { method: "PUT", body }),
  smtp: (body) => request("smtp", { method: "PUT", body }),
  verify: () => request("smtp/verify", { method: "POST" }),
  test: () => request("smtp/test", { method: "POST" }),
  passwordRequest: () => request("password/request", { method: "POST" }),
  passwordConfirm: (body) =>
    request("password/confirm", { method: "POST", body }),
  alerts: (signal) => request("alerts", { signal }),
  alert: (id, body) =>
    request("alerts/" + encodeURIComponent(id), { method: "PATCH", body }),
  history: (page = 1, signal) => request("history?page=" + page, { signal }),
  mailHistory: (signal) => request("mail-history", { signal }),
  retry: (id) =>
    request("mail-history/" + encodeURIComponent(id) + "/retry", {
      method: "POST",
    }),
};
