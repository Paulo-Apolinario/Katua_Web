const ATTENDANCE_API = `${import.meta.env.VITE_API_BASE_URL}/api/staff-attendance`;

/**
 *  Get all staff attendance records
 * GET /api/staff-attendance
 */
export const getAllAttendances = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(ATTENDANCE_API, {
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
 * Create a new attendance entry
 * POST /api/staff-attendance
 * @param {object} payload - Attendance data
 */
export const createAttendance = async (payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(ATTENDANCE_API, {
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
 * Update attendance
 * PUT /api/staff-attendance/:id
 * @param {number|string} id
 * @param {object} payload
 */
export const updateAttendance = async (id, payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${ATTENDANCE_API}/${id}`, {
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
 * Delete attendance
 * DELETE /api/staff-attendance/:id
 * @param {number|string} id
 */
export const deleteAttendance = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${ATTENDANCE_API}/${id}`, {
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
 * Get single attendance by ID
 * GET /api/staff-attendance/:id
 * @param {number|string} id
 */
export const getAttendanceById = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${ATTENDANCE_API}/${id}`, {
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
