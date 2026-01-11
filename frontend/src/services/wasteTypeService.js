const WASTE_TYPE_API =  `${import.meta.env.VITE_API_BASE_URL}/api/waste-types`;

/**
 * Get all waste types
 * GET /api/waste-types
 */
export const getAllWasteTypes = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(WASTE_TYPE_API, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    credentials: 'include' 
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * Create a new waste type
 * POST /api/waste-types
 * @param {object} payload
 */
export const createWasteType = async (payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(WASTE_TYPE_API, {
    method: 'POST',
    headers: {
    'Authorization': `Bearer ${token}`, 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * Update a waste type
 * PUT /api/waste-types/:id
 * @param {number|string} id
 * @param {object} payload
 */
export const updateWasteType = async (id, payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${WASTE_TYPE_API}/${id}`, {
    method: 'PUT',
    headers: {
    'Authorization': `Bearer ${token}`, 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
   },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * Delete a waste type
 * DELETE /api/waste-types/:id
 * @param {number|string} id
 */
export const deleteWasteType = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${WASTE_TYPE_API}/${id}`, {
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
 * Get a specific waste type by ID
 * GET /api/waste-types/:id
 * @param {number|string} id
 */
export const getWasteTypeById = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${WASTE_TYPE_API}/${id}`, {
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
