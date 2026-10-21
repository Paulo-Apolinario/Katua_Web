import { apiRequest } from "./apiClient";
export const reportService = {
  context: async (signal) =>
    (await apiRequest("/reports/context", { signal })).data,
  report: async (kind, filters, signal) =>
    (
      await apiRequest(
        "/reports/" +
          kind +
          "?" +
          new URLSearchParams(
            Object.entries(filters).filter(([, v]) => v !== "" && v != null),
          ),
        { signal },
      )
    ).data,
  detail: async (id) =>
    (await apiRequest("/reports/collections/" + encodeURIComponent(id))).data,
  saveConfig: async (body) =>
    (await apiRequest("/reports/config", { method: "PUT", body })).data,
};
export default reportService;
