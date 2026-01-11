/**
 * Login
 * @param {object} credentials { email, password }
 */
export const login = async (credentials) => {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    credentials: 'include', 
    body: JSON.stringify(credentials),
  });

  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * Forgot Password (send reset link)
 * @param {object} payload { email }
 */
export const forgotPassword = async (payload) => {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/forgot-password`, {
    method: 'POST',
    headers: {
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
 * Reset Password
 * @param {object} payload { email, token, password, password_confirmation }
 */
export const resetPassword = async (payload) => {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reset-password`, {
    method: 'POST',
    headers: {
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
