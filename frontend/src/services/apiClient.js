const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const TOKEN_KEY = "auth_token";
export const USER_KEY = "auth_user";

export const getStoredToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const getStoredUser = () => {
  const user = localStorage.getItem(USER_KEY);

  if (!user) return null;

  try {
    return JSON.parse(user);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

export const saveAuthData = ({ token, user }) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

export const clearAuthData = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  // limpeza do padrão antigo do Trashsync
  localStorage.removeItem("user");
};

const isPlainObject = (value) => {
  return (
    value !== null &&
    typeof value === "object" &&
    !(value instanceof FormData) &&
    !(value instanceof Blob) &&
    !(value instanceof ArrayBuffer)
  );
};

export const apiRequest = async (endpoint, options = {}) => {
  const token = getStoredToken();

  const hasBody = options.body !== undefined && options.body !== null;
  const shouldStringifyBody = hasBody && isPlainObject(options.body);

  const headers = {
    Accept: "application/json",
    ...(hasBody && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    body: shouldStringifyBody ? JSON.stringify(options.body) : options.body,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw (
      data || {
        message: "Erro ao se comunicar com o servidor.",
        statusCode: response.status,
      }
    );
  }

  return data;
};