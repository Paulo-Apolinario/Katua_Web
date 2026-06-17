const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const VEHICLE_DOCUMENT_API = `${API_BASE_URL}/vehicle-documents`;

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

export const getVehicleDocuments = async () => {
  const res = await fetch(VEHICLE_DOCUMENT_API, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  return parseResponse(res);
};

export const getVehicleDocumentById = async (id) => {
  const res = await fetch(`${VEHICLE_DOCUMENT_API}/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  return parseResponse(res);
};

export const createVehicleDocument = async (payload) => {
  const res = await fetch(VEHICLE_DOCUMENT_API, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: payload,
  });

  return parseResponse(res);
};

export const updateVehicleDocument = async (id, payload) => {
  const res = await fetch(`${VEHICLE_DOCUMENT_API}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: payload,
  });

  return parseResponse(res);
};

export const deleteVehicleDocument = async (id) => {
  const res = await fetch(`${VEHICLE_DOCUMENT_API}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  return parseResponse(res);
};