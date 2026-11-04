import { createContext, useContext, useEffect, useState } from "react";
import {
  SESSION_EXPIRED_EVENT,
  clearAuthData,
  getStoredToken,
  getStoredUser,
  saveAuthData,
} from "../services/apiClient";
import { getMe } from "../services/authService";

const AdminAuthContext = createContext();

const isPanelUser = (user) => {
  return ["COOPERATIVE", "MUNICIPAL_MANAGER"].includes(user?.role);
};

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);
  const [token, setToken] = useState(() => getStoredToken());

  useEffect(() => {
    const expire = () => { setBootstrapError(""); setToken(null); setAdmin(null); setLoading(false); };
    const changed = (event) => {
      if (event.key !== "auth_token") return;
      if (!event.newValue) expire();
      else { setBootstrapError(""); setAdmin(null); setLoading(true); setToken(event.newValue); }
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    window.addEventListener("storage", changed);
    return () => { window.removeEventListener(SESSION_EXPIRED_EVENT, expire); window.removeEventListener("storage", changed); };
  }, []);

  useEffect(() => {
    let active = true;
    const bootstrapAuth = async () => {
      setBootstrapError("");
      setLoading(true);
      if (!token) {
        clearAuthData();
        setAdmin(null);
        setLoading(false);
        return;
      }

      try {
        const response = await getMe();

        if (!active || token !== getStoredToken()) return;
        const user = response?.user || response;

        if (!isPanelUser(user)) {
          clearAuthData();
          setToken(null);
          setAdmin(null);
          return;
        }

        saveAuthData({
          token,
          user,
        });

        setAdmin(user);
      } catch (error) {
        if (!active || (getStoredToken() && token !== getStoredToken())) return;
        console.error("Auth error:", error);
        if (error?.status === 401 || error?.status === 403) {
          clearAuthData(); setToken(null); setAdmin(null);
        } else setBootstrapError(error?.message || "Não foi possível confirmar sua sessão. Tente novamente.");
      } finally {
        if (active) setLoading(false);
      }
    };

    bootstrapAuth();
    return () => { active = false; };
  }, [token, retryVersion]);

  const login = ({ token: newToken, user }) => {
    if (!newToken || !user) {
      throw new Error("Resposta de login inválida.");
    }

    if (!isPanelUser(user)) {
      throw new Error(
        "Acesso permitido para cooperativas e gestores municipais designados.",
      );
    }

    saveAuthData({
      token: newToken,
      user,
    });

    setBootstrapError("");
    setToken(newToken);
    setAdmin(user);
  };

  const updateAdmin = (user) => {
    if (!user || user.id !== admin?.id)
      throw new Error("Perfil inválido para esta sessão.");
    saveAuthData({ user });
    setAdmin(user);
  };

  const logout = () => {
    setBootstrapError("");
    clearAuthData();
    setToken(null);
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        token,
        loading,
        login,
        logout,
        updateAdmin,
        bootstrapError,
        retryBootstrap: () => setRetryVersion(value => value + 1),
        isAuthenticated: Boolean(admin && token) && !bootstrapError && !loading,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }

  return context;
};
