import { apiRequest, getStoredToken } from "./apiClient";
export const ownerKinds = {
  generator: {
    title: "Geradores",
    singular: "gerador",
    endpoint: "/generators",
    key: "generators",
    list: "/generator-list",
  },
  collector: {
    title: "Catadores",
    singular: "catador",
    endpoint: "/collectors",
    key: "collectors",
    list: "/collector-list",
  },
  driver: {
    title: "Motoristas",
    singular: "motorista",
    endpoint: "/drivers",
    key: "drivers",
    list: "/staff-list",
  },
  vehicle: {
    title: "Veículos",
    singular: "veículo",
    endpoint: "/vehicles",
    key: "vehicles",
    list: "/vehicle-list",
  },
};
export function ownerRows(r, key) {
  const rows = Array.isArray(r) ? r : r?.[key] || r?.data;
  if (!Array.isArray(rows))
    throw Error("Resposta inválida ao carregar os cadastros. Tente novamente.");
  return rows;
}
export const ownerLabel = (o) =>
  o.plate
    ? [o.plate, o.brand, o.model].filter(Boolean).join(" · ")
    : o.companyName || o.name || o.displayName || o.id;
export const loadOwners = async (kind) =>
  ownerRows(await apiRequest(ownerKinds[kind].endpoint), ownerKinds[kind].key);
export const listOwnerDocuments = (kind, ownerId) =>
  apiRequest(`/owner-documents?${new URLSearchParams({ kind, ownerId })}`);
export const uploadOwnerDocument = (body) =>
  apiRequest("/owner-documents", { method: "POST", body });
export async function downloadOwnerDocument(doc) {
  if (
    !/^\/owner-documents\/(owner|collector|vehicle|maintenance)\/[^/?#]+\/file$/.test(
      doc.download || "",
    )
  )
    throw Error("Este registro não possui anexo disponível.");
  const r = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || ""}${doc.download}`,
    { headers: { Authorization: `Bearer ${getStoredToken()}` } },
  );
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw Error(e.error || "Não foi possível baixar o arquivo.");
  }
  const url = URL.createObjectURL(await r.blob()),
    a = document.createElement("a"),
    encoded = /filename\*=UTF-8''([^;]+)/i.exec(
      r.headers.get("Content-Disposition") || "",
    )?.[1];
  a.href = url;
  try {
    a.download = encoded
      ? decodeURIComponent(encoded)
      : doc.originalName || "documento";
  } catch {
    a.download = "documento";
  }
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
