const ROUTE_ASSIGN_API = `${import.meta.env.VITE_API_BASE_URL}/api/route-assignments`;

/**
 * Get all route assignments
 * GET /api/route-assignments
 */
export const getAllAssignments = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(ROUTE_ASSIGN_API, { 
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
 * Create a new route assignment
 * POST /api/route-assignments
 * @param {object} payload
 */
export const createAssignment = async (payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(ROUTE_ASSIGN_API, {
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
 * Update route assignment
 * PUT /api/route-assignments/:id
 * @param {number|string} id
 * @param {object} payload
 */
export const updateAssignment = async (id, payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${ROUTE_ASSIGN_API}/${id}`, {
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
 * Delete route assignment
 * DELETE /api/route-assignments/:id
 * @param {number|string} id
 */
export const deleteAssignment = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${ROUTE_ASSIGN_API}/${id}`, {
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
 * Get route assignment by ID
 * GET /api/route-assignments/:id
 * @param {number|string} id
 */
export const getAssignmentById = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${ROUTE_ASSIGN_API}/${id}`, {
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
