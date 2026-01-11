const COMPANY_SETTINGS_API = `${import.meta.env.VITE_API_BASE_URL}/api/settings`;
const SMTP_CONFIG_API = `${import.meta.env.VITE_API_BASE_URL}/api/smtp-config`;
const SYSTEM_ALERT_API = `${import.meta.env.VITE_API_BASE_URL}/api/system-alert`;

/**
 * Get all Company Settings
 * GET /api/settings
 */
export const getAllCompanySettings = async () => {
  const res = await fetch(COMPANY_SETTINGS_API, {
    method: 'GET',
    headers: {
     'Content-Type': 'application/json'
    }
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * Create a new Company Settings entry
 * POST /api/settings
 * @param {object} payload - Attendance data
 */
export const saveCompanySettings = async (payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(COMPANY_SETTINGS_API, {
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
 * Get all Smtp Config 
 * GET /api/smtp-config 
 */
export const getAllSmtpConfig = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(SMTP_CONFIG_API, {
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
 * Create a new Company Settings entry
 * POST /api/settings
 * @param {object} payload - Attendance data
 */
export const saveSmtpConfig = async (payload) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(SMTP_CONFIG_API, {
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
 * Get all System Alert
 * GET /api/system-alert
 */
export const getAllSystemAlert = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${SYSTEM_ALERT_API}`, {
    headers: { 'Authorization': `Bearer ${token}`},
    credentials: 'include',
  });

  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * Delete a system alert
 * DELETE /api/system-alert/:id
 * @param {number|string} id
 */
export const deleteSystemAlert = async (id) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${SYSTEM_ALERT_API}/${id}`, {
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
