import { apiRequest } from "./apiClient";
export const INBOX_CHANGED = "katua:inbox-changed";
export const loadInbox = (cursor) => apiRequest(`/notifications${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
export async function markNoticeRead(id) {
  await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH", body: {} });
  window.dispatchEvent(new Event(INBOX_CHANGED));
}
export async function markAllRead() {
  await apiRequest("/notifications/read-all", { method: "POST", body: {} });
  window.dispatchEvent(new Event(INBOX_CHANGED));
}
export function noticeTarget(notice) {
  const data = notice.data || {};
  if (data.routeId) return `/edit-route/${encodeURIComponent(data.routeId)}`;
  if (data.extraOrderId) return `/extra-collection-orders?ordem=${encodeURIComponent(data.extraOrderId)}`;
  if (data.scheduleId) return `/collection-requests?solicitacao=${encodeURIComponent(data.scheduleId)}`;
  if (data.binId) return `/bin-list/${encodeURIComponent(data.binId)}`;
  if (notice.collectionId || data.collectionId) return `/waste-list?coleta=${encodeURIComponent(notice.collectionId || data.collectionId)}`;
  return null;
}
