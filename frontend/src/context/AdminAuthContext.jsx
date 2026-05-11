import { createContext, useContext, useEffect, useState } from "react";
import {
  clearAuthData,
  getStoredToken,
  getStoredUser,
  saveAuthData,
} from "../services/apiClient";
import { getMe } from "../services/authService";

const AdminAuthContext = createContext();

const isCooperativeUser = (user) => {
  return user?.role === "COOPERATIVE";
};

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => getStoredToken());

  useEffect(() => {
    const bootstrapAuth = async () => {
      if (!token) {
        clearAuthData();
        setAdmin(null);
        setLoading(false);
        return;
      }

      try {
        const response = await getMe();

        const user = response?.user || response;

        if (!isCooperativeUser(user)) {
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
        console.error("Auth error:", error);
        clearAuthData();
        setToken(null);
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, [token]);

  const login = ({ token: newToken, user }) => {
    if (!newToken || !user) {
      throw new Error("Resposta de login inválida.");
    }

    if (!isCooperativeUser(user)) {
      throw new Error("Acesso permitido apenas para cooperativas.");
    }

    saveAuthData({
      token: newToken,
      user,
    });

    setToken(newToken);
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