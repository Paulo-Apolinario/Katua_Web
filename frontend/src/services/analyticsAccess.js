import { apiRequest, getStoredToken } from "./apiClient";

export const ANALYTICS_LOCKED_EVENT = "katua:analytics-locked";
let access = null;
export function analyticsAccessHeaders() {
  if (
    !access ||
    access.login !== getStoredToken() ||
    access.expiresAt <= Date.now()
  )
    return {};
  return { "X-Analytics-Access": access.token };
}
export function clearAnalyticsAccess() {
  const headers = analyticsAccessHeaders();
  access = null;
  window.dispatchEvent(new Event(ANALYTICS_LOCKED_EVENT));
  if (headers["X-Analytics-Access"])
    void apiRequest("/analytics/access/lock", {
      method: "POST",
      headers,
      suppressReadNotice: true,
    }).catch(() => {});
}
export async function unlockAnalytics(password, signal) {
  const login = getStoredToken();
  const response = await apiRequest("/analytics/access/unlock", {
    method: "POST",
    body: { password },
    signal,
    suppressReadNotice: true,
  });
  if (signal?.aborted || login !== getStoredToken())
    throw new DOMException("Requisição interrompida", "AbortError");
  access = {
    ...response.data,
    expiresAt: Date.parse(response.data.expiresAt),
    login,
  };
  return access.expiresAt;
}
