import { apiRequest } from "./apiClient";

function normalizeGenerator(generator = {}) {
  return {
    id: generator.id,
    type: generator.type,
    name: generator.name,
    companyName: generator.companyName || "",
    email: generator.email,
    phone: generator.phone || "",
    zipCode: generator.zipCode || "",
    street: generator.street || "",
    number: generator.number || "",
    neighborhood: generator.neighborhood || "",
    city: generator.city || "",
    state: generator.state || "",
    address: generator.address || "",
    latitude:
      generator.latitude === null || generator.latitude === undefined
        ? null
        : Number(generator.latitude),
    longitude:
      generator.longitude === null || generator.longitude === undefined
        ? null
        : Number(generator.longitude),
    status: generator.status || null,
    accessReleased: Boolean(generator.accessReleased),
    accessStatus: generator.accessStatus || "PENDING_ACTIVATION",
    totalKg: Number(generator.totalKg || 0),
    createdAt: generator.createdAt,
    updatedAt: generator.updatedAt,
  };
}

function getArray(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.generators)) return response.generators;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function cleanPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (value === undefined) return false;
      if (value === null) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      return true;
    })
  );
}

export const generatorService = {
  async list() {
    const response = await apiRequest("/generators");
    return getArray(response).map(normalizeGenerator);
  },

  async getById(id) {
    const response = await apiRequest(`/generators/${id}`);

    if (response?.generator) {
      return normalizeGenerator(response.generator);
    }

    return normalizeGenerator(response);
  },

  async create(payload) {
    const body = cleanPayload({
      type: payload.type || "SMALL",
      name: payload.name?.trim(),
      companyName: payload.companyName?.trim(),
      email: payload.email?.trim().toLowerCase(),
      phone: payload.phone?.trim(),

      zipCode: payload.zipCode?.trim(),
      street: payload.street?.trim(),
      number: payload.number?.trim(),
      neighborhood: payload.neighborhood?.trim(),
      city: payload.city?.trim(),
      state: payload.state?.trim().toUpperCase(),
      address: payload.address?.trim(),

      latitude:
        payload.latitude === undefined || payload.latitude === null
          ? undefined
          : Number(payload.latitude),
      longitude:
        payload.longitude === undefined || payload.longitude === null
          ? undefined
          : Number(payload.longitude),
    });

    const response = await apiRequest("/generators", {
      method: "POST",
      body,
    });

    if (response?.generator) {
      return normalizeGenerator(response.generator);
    }

    return normalizeGenerator(response);
  },

  async update(id, payload) {
    const body = cleanPayload({
      type: payload.type,
      name: payload.name?.trim(),
      companyName: payload.companyName?.trim(),
      phone: payload.phone?.trim(),

      zipCode: payload.zipCode?.trim(),
      street: payload.street?.trim(),
      number: payload.number?.trim(),
      neighborhood: payload.neighborhood?.trim(),
      city: payload.city?.trim(),
      state: payload.state?.trim().toUpperCase(),
      address: payload.address?.trim(),

      latitude:
        payload.latitude === undefined || payload.latitude === null
          ? undefined
          : Number(payload.latitude),
      longitude:
        payload.longitude === undefined || payload.longitude === null
          ? undefined
          : Number(payload.longitude),
    });

    const response = await apiRequest(`/generators/${id}`, {
      method: "PATCH",
      body,
    });

    if (response?.generator) {
      return normalizeGenerator(response.generator);
    }

    return normalizeGenerator(response);
  },

  async releaseAccess(id) {
    const response = await apiRequest(`/generators/${id}/release-access`, {
      method: "PATCH",
    });

    if (response?.generator) {
      return normalizeGenerator(response.generator);
    }

    return normalizeGenerator(response);
  },

  async updateAccessStatus(id, status) {
    const response = await apiRequest(`/generators/${id}/access-status`, {
      method: "PATCH",
      body: { status },
    });

    if (response?.generator) {
      return normalizeGenerator(response.generator);
    }

    return normalizeGenerator(response);
  },
};

export default generatorService;