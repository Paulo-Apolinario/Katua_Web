const VEHICLE_DOCUMENT_API = `${import.meta.env.VITE_API_BASE_URL}/api/vehicle-documents`;

/**
 * Get all vehicle documents
 * GET /api/vehicle-documents
 */
export const getVehicleDocuments = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(VEHICLE_DOCUMENT_API, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    credentials: 'include' 
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * Upload a new vehicle document
 * POST /api/vehicle-documents
 * @param {FormData} payload
 */
export const createVehicleDocument = async (payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(VEHICLE_DOCUMENT_API, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    method: 'POST',
    credentials: 'include',
    body: payload,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * Update a vehicle document
 * POST /api/vehicle-documents/:id
 * @param {number|string} id
 * @param {FormData} payload
 */
export const updateVehicleDocument = async (id, payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${VEHICLE_DOCUMENT_API}/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    method: 'POST',
    body: payload,
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * Delete a vehicle document
 * DELETE /api/vehicle-documents/:id
 * @param {number|string} id
 */
export const deleteVehicleDocument = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${VEHICLE_DOCUMENT_API}/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * Get a vehicle document by ID
 * GET /api/vehicle-documents/:id
 * @param {number|string} id
 */
export const getVehicleDocumentById = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${VEHICLE_DOCUMENT_API}/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};
