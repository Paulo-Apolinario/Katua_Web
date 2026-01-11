const WASTE_API =`${import.meta.env.VITE_API_BASE_URL}/api/wastes`;

/**
 * Get all waste records
 * GET /api/wastes
 */
export const getAllWastes = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(WASTE_API, {
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
 *  Create new waste entry
 * POST /api/wastes
 * @param {object} payload
 */
export const createWaste = async (payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(WASTE_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' ,
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
 * Update waste
 * PUT /api/wastes/:id
 * @param {number|string} id
 * @param {object} payload
 */
export const updateWaste = async (id, payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${WASTE_API}/${id}`, {
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
 * Delete waste record
 * DELETE /api/wastes/:id
 * @param {number|string} id
 */
export const deleteWaste = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${WASTE_API}/${id}`, {
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
 * Get a specific waste by ID
 * GET /api/wastes/:id
 * @param {number|string} id
 */
export const getWasteById = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${WASTE_API}/${id}`, {
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
