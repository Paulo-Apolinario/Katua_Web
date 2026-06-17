const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const MAINTENANCE_API = `${API_BASE_URL}/maintenance-logs`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');

  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
};

const parseResponse = async (res) => {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw data;

  return data;
};

export const getAllMaintenanceLogs = async () => {
  const res = await fetch(MAINTENANCE_API, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  return parseResponse(res);
};

export const getMaintenanceLogById = async (id) => {
  const res = await fetch(`${MAINTENANCE_API}/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  return parseResponse(res);
};

export const createMaintenanceLog = async (payload) => {
  const res = await fetch(MAINTENANCE_API, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: payload,
  });

  return parseResponse(res);
};

export const updateMaintenanceLog = async (id, payload) => {
  const res = await fetch(`${MAINTENANCE_API}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: payload,
  });

  return parseResponse(res);
};

export const deleteMaintenanceLog = async (id) => {
  const res = await fetch(`${MAINTENANCE_API}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  return parseResponse(res);
};