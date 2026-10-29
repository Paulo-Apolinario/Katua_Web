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
  const [token, setToken] = useState(() => getStoredToken());

  useEffect(() => {
    const expire = () => { setToken(null); setAdmin(null); setLoading(false); };
    const changed = (event) => {
      if (event.key !== "auth_token") return;
      if (!event.newValue) expire();
      else { setAdmin(null); setLoading(true); setToken(event.newValue); }
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    window.addEventListener("storage", changed);
    return () => { window.removeEventListener(SESSION_EXPIRED_EVENT, expire); window.removeEventListener("storage", changed); };
  }, []);

  useEffect(() => {
    let active = true;
    const bootstrapAuth = async () => {
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
        clearAuthData();
        setToken(null);
        setAdmin(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    bootstrapAuth();
    return () => { active = false; };
  }, [token]);

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
        isAuthenticated: Boolean(admin && token),
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
