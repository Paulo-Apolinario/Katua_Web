import { useEffect, useState } from "react";
import { apiRequest } from "../../services/apiClient";

// Read current server data, never the login snapshot in localStorage.
export function useHeadquarters(enabled = true) {
  const [state, setState] = useState({ base: null, loading: enabled, error: "" });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    apiRequest("/auth/me", { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) setState({ base: result.user?.cooperative || null, loading: false, error: "" });
    }).catch((error) => {
      if (!controller.signal.aborted) setState({ base: null, loading: false, error: error.message || "Falha na consulta" });
    });
    return () => controller.abort();
  }, [enabled]);
  return state;
}
