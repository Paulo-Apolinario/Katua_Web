import { apiRequest } from "./apiClient";

/**
 * Login no backend oficial KATUÁ
 * POST /auth/login
 */
export const login = async (credentials) => {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: credentials.email?.trim().toLowerCase(),
      password: credentials.password,
    }),
  });
};

/**
 * Buscar usuário autenticado
 * GET /auth/me
 */
export const getMe = async () => {
  return apiRequest("/auth/me", {
    method: "GET",
  });
};

/**
 * Solicitar recuperação de senha
 * POST /auth/forgot-password
 */
export const forgotPassword = async (payload) => {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email?.trim().toLowerCase(),
      audience: "PANEL",
    }),
  });
};

/**
 * Redefinir senha
 * POST /auth/reset-password
 */
export const resetPassword = async (payload) => {
  const temporaryPassword =
    payload.temporaryPassword || payload.temporary_password || "";

  const newPassword = payload.newPassword || payload.password || "";

  const confirmPassword =
    payload.confirmPassword || payload.password_confirmation || "";

  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email?.trim().toLowerCase(),
      token: payload.token?.trim(),

      temporaryPassword,
      temporary_password: temporaryPassword,

      newPassword,
      password: newPassword,

      confirmPassword,
      password_confirmation: confirmPassword,
    }),
  });
};

export const requestLoginLink = (email) =>
  apiRequest("/auth/login-link", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), audience: "PANEL" },
  });
export const consumeLoginLink = (token) =>
  apiRequest("/auth/login-link/consume", {
    method: "POST",
    body: { token, audience: "PANEL" },
  });

export const updateProfile = (body) =>
  apiRequest("/auth/profile", { method: "PATCH", body });
