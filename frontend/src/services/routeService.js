const ROUTE_API =`${import.meta.env.VITE_API_BASE_URL}/api/routes`;

/**
 * Get all routes
 * GET /api/routes
 */
export const getAllRoutes = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(ROUTE_API, {
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
 * Create a new route
 * POST /api/routes
 * @param {object} payload
 */
export const createRoute = async (payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(ROUTE_API, {
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
 * Update an existing route
 * PUT /api/routes/:id
 * @param {number|string} id
 * @param {object} payload
 */
export const updateRoute = async (id, payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${ROUTE_API}/${id}`, {
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
 * Delete a route
 * DELETE /api/routes/:id
 * @param {number|string} id
 */
export const deleteRoute = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${ROUTE_API}/${id}`, {
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
 * Get a specific route by ID
 * GET /api/routes/:id
 * @param {number|string} id
 */
export const getRouteById = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${ROUTE_API}/${id}`, {
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
