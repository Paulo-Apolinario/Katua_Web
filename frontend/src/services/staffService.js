const API =  `${import.meta.env.VITE_API_BASE_URL}/api/staff`;

/**
 * Fetch all staff
 * GET /api/staff
 */

export const getAllStaff = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(API, {
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

/**
 * Create a new staff entry
 * POST /api/staff
 * @param {object} payload - staff data
 */
export const createStaff = async (payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(API, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    method: 'POST',
    credentials: 'include',
    body:payload,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * Update existing staff
 * PUT /api/staff/:id
 * @param {number|string} id - staff ID
 * @param {object} payload - updated data
 */
export const updateStaff = async (id, payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API}/${id}`, {
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
 * Delete a staff entry
 * DELETE /api/staff/:id
 * @param {number|string} id - staff ID
 */
export const deleteStaff = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API}/${id}`, {
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
 * Get staff by ID
 * GET /api/staff/:id
 * @param {number|string} id - staff ID
 */
export const getStaffById = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API}/${id}`, {
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
