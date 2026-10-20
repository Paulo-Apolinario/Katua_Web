import { apiRequest, getStoredToken } from "./apiClient";
const root = "/environmental";
const id = encodeURIComponent;
const data = async (path, options) =>
  (await apiRequest(root + path, options)).data;
export const environmentalService = {
  sinirStatus: (unitId) => data("/units/" + id(unitId) + "/sinir/status"),
  sinirCheck: (unitId) =>
    data("/units/" + id(unitId) + "/sinir/check", { method: "POST" }),
  sinirCatalog: (unitId, catalog, filter) =>
    data(
      "/units/" +
        id(unitId) +
        "/sinir/catalogs/" +
        id(catalog) +
        (filter ? "?filter=" + id(filter) : ""),
    ),
  sinirPreview: (docId, version) =>
    data("/documents/" + id(docId) + "/sinir-preview", {
      method: "POST",
      body: { version },
    }),
  context: () => data("/context"),
  units: () => data("/units"),
  saveUnit: (unitId, body) =>
    data("/units" + (unitId ? "/" + id(unitId) : ""), {
      method: unitId ? "PUT" : "POST",
      body,
    }),
  list: (params) =>
    data(
      "/documents?" +
        new URLSearchParams(
          Object.entries(params).filter(([, v]) => v !== "" && v != null),
        ),
    ),
  create: (body) => data("/documents", { method: "POST", body }),
  detail: (docId) => data("/documents/" + id(docId)),
  update: (docId, body) =>
    data("/documents/" + id(docId), { method: "PUT", body }),
  transition: (docId, body) =>
    data("/documents/" + id(docId) + "/transition", { method: "POST", body }),
  history: (docId, page = 1) =>
    data("/documents/" + id(docId) + "/history?page=" + page),
  submit: (docId, version) =>
    data("/documents/" + id(docId) + "/submit", {
      method: "POST",
      body: { version },
    }),
  source: (unitId, collectionId) =>
    data("/units/" + id(unitId) + "/collection-source/" + id(collectionId)),
  upload: (docId, version, file) => {
    const body = new FormData();
    body.append("file", file);
    return data("/documents/" + id(docId) + "/attachments?version=" + version, {
      method: "POST",
      body,
    });
  },
  async download(docId, file) {
    const r = await fetch(
      (import.meta.env.VITE_API_BASE_URL || "") +
        root +
        "/documents/" +
        id(docId) +
        "/attachments/" +
        id(file.id),
      { headers: { Authorization: "Bearer " + getStoredToken() } },
    );
    if (!r.ok) {
      const e = await r
        .json()
        .catch(() => ({ error: "Arquivo indisponível." }));
      throw e;
    }
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
