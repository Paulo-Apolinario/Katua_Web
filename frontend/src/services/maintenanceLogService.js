const MAINTENANCE_API = `${import.meta.env.VITE_API_BASE_URL}/api/maintenance-logs`;

/**
 * Get all maintenance logs
 * GET /api/maintenance-logs
 */
export const getAllMaintenanceLogs = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(MAINTENANCE_API, {
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
 * Create a new maintenance log
 * POST /api/maintenance-logs
 * @param {object} payload
 */
export const createMaintenanceLog = async (payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(MAINTENANCE_API, {
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
 * Update a maintenance log
 * PUT /api/maintenance-logs/:id
 * @param {number|string} id
 * @param {object} payload
 */
export const updateMaintenanceLog = async (id, payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${MAINTENANCE_API}/${id}`, {
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
 * Delete a maintenance log
 * DELETE /api/maintenance-logs/:id
 * @param {number|string} id
 */
export const deleteMaintenanceLog = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${MAINTENANCE_API}/${id}`, {
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
 * Get maintenance log by ID
 * GET /api/maintenance-logs/:id
 * @param {number|string} id
 */
export const getMaintenanceLogById = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${MAINTENANCE_API}/${id}`, {
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
