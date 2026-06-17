const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const BIN_API = `${API_BASE_URL}/bins`;

const getAuthHeaders = (isFormData = false) => {
  const token = localStorage.getItem('auth_token');

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

const parseResponse = async (res) => {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw data;
  }

  return data;
};

export const getAllBins = async () => {
  const res = await fetch(BIN_API, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  return parseResponse(res);
};

export const getBinById = async (id) => {
  const res = await fetch(`${BIN_API}/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  return parseResponse(res);
};

export const createBin = async (payload) => {
  const isFormData = payload instanceof FormData;

  const res = await fetch(BIN_API, {
    method: 'POST',
    headers: getAuthHeaders(isFormData),
    credentials: 'include',
    body: isFormData ? payload : JSON.stringify(payload),
  });

  return parseResponse(res);
};

export const updateBin = async (id, payload) => {
  const isFormData = payload instanceof FormData;

  const res = await fetch(`${BIN_API}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(isFormData),
    credentials: 'include',
    body: isFormData ? payload : JSON.stringify(payload),
  });

  return parseResponse(res);
};

export const deleteBin = async (id) => {
  const res = await fetch(`${BIN_API}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  return parseResponse(res);
};