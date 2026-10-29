const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const SESSION_EXPIRED_EVENT = "katua:session-expired";

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

  const { timeoutMs = 20000, signal, ...fetchOptions } = options;
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort(signal?.reason);
  if (signal?.aborted) cancel();
  else signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions, headers, signal: controller.signal,
      body: shouldStringifyBody ? JSON.stringify(options.body) : options.body,
    });
    const data = await response.json().catch(() => null);
    if (controller.signal.aborted) throw new DOMException("Requisição interrompida", "AbortError");
    if (response.status === 401 && token && token === getStoredToken() && !endpoint.startsWith("/auth/login")) {
      clearAuthData();
      sessionStorage.setItem("katua:session-expired", "1");
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    if (!response.ok) {
      const message = response.status === 401 ? "Sua sessão expirou. Entre novamente."
        : data?.message || data?.error || (response.status === 409 ? "Este registro foi alterado. Atualize antes de tentar novamente." : "Não foi possível concluir a solicitação.");
      throw Object.assign(new Error(message), data && typeof data === "object" ? data : {}, {
        message, status: response.status, statusCode: response.status,
      });
    }
    return data;
  } catch (error) {
    if (error.status) throw error;
    if (signal?.aborted) throw error;
    throw Object.assign(new Error(timedOut
      ? "O servidor demorou para responder. Atualize para conferir o resultado antes de repetir a operação."
      : "Não foi possível conectar ao servidor. Verifique sua conexão e tente atualizar."), { code: timedOut ? "TIMEOUT" : "NETWORK_ERROR" });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
};
