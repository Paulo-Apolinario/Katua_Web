const VEHICLE_API =  `${import.meta.env.VITE_API_BASE_URL}/api/vehicles`;

/**
 * Get all vehicles
 * GET /api/vehicles
 */
export const getAllVehicles = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(VEHICLE_API, {
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
 * Create a new vehicle
 * POST /api/vehicles
 * @param {object} payload
 */
export const createVehicle = async (payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(VEHICLE_API, {
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
 * Update a vehicle
 * PUT /api/vehicles/:id
 * @param {number|string} id
 * @param {object} payload
 */
export const updateVehicle = async (id, payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${VEHICLE_API}/${id}`, {
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
 * Delete a vehicle
 * DELETE /api/vehicles/:id
 * @param {number|string} id
 */
export const deleteVehicle = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${VEHICLE_API}/${id}`, {
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
 * Get a vehicle by ID
 * GET /api/vehicles/:id
 * @param {number|string} id
 */
export const getVehicleById = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${VEHICLE_API}/${id}`, {
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
