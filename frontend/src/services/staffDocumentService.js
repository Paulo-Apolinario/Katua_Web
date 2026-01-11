const STAFF_DOCUMENT_API = `${import.meta.env.VITE_API_BASE_URL}/api/staff-documents`;

/**
 * Get all staff documents
 * GET /api/staff-documents
 */
export const getStaffDocuments = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(STAFF_DOCUMENT_API, {
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
 * Upload a staff document
 * POST /api/staff-documents
 * @param {FormData} payload
 */
export const createDocument = async (payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(STAFF_DOCUMENT_API, {
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
 * Update a staff document
 * PUT /api/staff-documents/:id
 * @param {number|string} id
 * @param {FormData} payload
 */
export const updateDocument = async (id, payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${STAFF_DOCUMENT_API}/${id}`, {
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
 * Delete a staff document
 * DELETE /api/staff-documents/:id
 * @param {number|string} id
 */
export const deleteDocument = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${STAFF_DOCUMENT_API}/${id}`, {
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
 * Get a specific staff document by ID
 * GET /api/staff-documents/:id
 * @param {number|string} id
 */
export const getDocumentById = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${STAFF_DOCUMENT_API}/${id}`, {
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
