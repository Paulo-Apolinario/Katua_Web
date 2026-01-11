const ZONE_API = `${import.meta.env.VITE_API_BASE_URL}/api/zones`;

/**
 * Get all zones
 * GET /api/zones
 */
export const getAllZones = async () => {
   const token = localStorage.getItem('auth_token');
  const res = await fetch(ZONE_API, {
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
 * Create a new zone
 * POST /api/zones
 * @param {object} payload
 */
export const createZone = async (payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(ZONE_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json',
       'Accept': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * Update a zone
 * PUT /api/zones/:id
 * @param {number|string} id
 * @param {object} payload
 */
export const updateZone = async (id, payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${ZONE_API}/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json',
       'Accept': 'application/json',
      },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * Delete a zone
 * DELETE /api/zones/:id
 * @param {number|string} id
 */
export const deleteZone = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${ZONE_API}/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * Get a zone by ID
 * GET /api/zones/:id
 * @param {number|string} id
 */
export const getZoneById = async (id) => {
   const token = localStorage.getItem('auth_token');
  const res = await fetch(`${ZONE_API}/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};
