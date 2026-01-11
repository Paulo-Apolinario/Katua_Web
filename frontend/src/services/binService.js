const BIN_API = `${import.meta.env.VITE_API_BASE_URL}/api/bins`;

/**
 * Get all bins
 * GET /api/bins
 */
export const getAllBins = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(BIN_API, {
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
 * Create a new bin
 * POST /api/bins
 * @param {object} payload
 */
export const createBin = async (payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(BIN_API, {
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
 * Update an existing bin
 * PUT /api/bins/:id
 * @param {number|string} id
 * @param {object} payload
 */
export const updateBin = async (id, payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${BIN_API}/${id}`, {
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
 * Delete a bin
 * DELETE /api/bins/:id
 * @param {number|string} id
 */
export const deleteBin = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${BIN_API}/${id}`, {
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
 * Get a bin by ID
 * GET /api/bins/:id
 * @param {number|string} id
 */
export const getBinById = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${BIN_API}/${id}`, {
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
