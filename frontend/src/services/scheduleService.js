import { apiRequest } from "./apiClient";

export const getAllSchedules = async () => {
  return apiRequest("/schedules", {
    method: "GET",
  });
};

export const getScheduleById = async (id) => {
  return apiRequest(`/schedules/${id}`, {
    method: "GET",
  });
};

export const updateScheduleStatus = async (id, status) => {
  return apiRequest(`/schedules/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
};