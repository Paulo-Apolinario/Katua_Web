import { apiRequest, getStoredUser } from "./apiClient";
const catalogCache = new Map();
const query = (params = {}) =>
  new URLSearchParams(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== undefined && value !== null,
    ),
  ).toString();
export const getWasteCollections = (params) =>
  apiRequest("/waste-workspace/collections?" + query(params));
export const getWorkspaceInventory = (params) =>
  apiRequest("/waste-workspace/inventory?" + query(params));
export const getWorkspaceLots = (id, params) =>
  apiRequest(
    `/waste-workspace/items/${encodeURIComponent(id)}/lots?` + query(params),
  );
export const getWorkspaceLot = (id) =>
  apiRequest(`/waste-workspace/lots/${encodeURIComponent(id)}`);
export function clearWasteCatalogCache() {
  catalogCache.clear();
}
export async function getWorkspaceCatalog(params = {}) {
  const key = (getStoredUser()?.id || "") + ":" + query(params),
    previous = catalogCache.get(key);
  if (previous && Date.now() - previous.time < 30000) return previous.promise;
  const promise = apiRequest("/waste-workspace/catalog?" + query(params));
  catalogCache.set(key, { time: Date.now(), promise });
  try {
    return await promise;
  } catch (error) {
    catalogCache.delete(key);
    throw error;
  }
}
export async function classifyWasteEntry(id, payload) {
  const result = await apiRequest(
    `/waste-workspace/entries/${encodeURIComponent(id)}/catalog`,
    { method: "POST", body: payload },
  );
  clearWasteCatalogCache();
  return result;
}
export function mutationIdentity(ref, payload) {
  const signature = JSON.stringify(payload);
  if (ref.current?.signature !== signature)
    ref.current = { signature, id: crypto.randomUUID() };
  return ref.current.id;
}

export const getFieldCollections = (params) =>
  apiRequest("/waste-workspace/field-collections?" + query(params));
export const getFieldOptions = () =>
  apiRequest("/waste-workspace/field-options");

export const getFieldRoutes = (params) =>
  apiRequest("/waste-workspace/field-routes?" + query(params));
export const getFieldRoutePoints = (id, params) =>
  apiRequest(
    `/waste-workspace/field-routes/${encodeURIComponent(id)}/collections?` +
      query(params),
  );
