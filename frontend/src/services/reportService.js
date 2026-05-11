const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getToken = () => localStorage.getItem("auth_token");

const normalizeArrayResponse = (payload, possibleKeys = []) => {
  if (Array.isArray(payload)) return payload;

  for (const key of possibleKeys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
};

const request = async (endpoint, options = {}) => {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        payload?.error ||
        "Não foi possível carregar os dados do relatório."
    );
  }

  return payload;
};

export const reportService = {
  async getCollections() {
    const payload = await request("/collections");
    return normalizeArrayResponse(payload, ["collections"]);
  },

  async getGenerators() {
    const payload = await request("/generators");
    return normalizeArrayResponse(payload, ["generators"]);
  },

  async getCollectors() {
    const payload = await request("/collectors");
    return normalizeArrayResponse(payload, ["collectors"]);
  },

  async getDrivers() {
    const payload = await request("/drivers");
    return normalizeArrayResponse(payload, ["drivers"]);
  },

  async getVehicles() {
    const payload = await request("/vehicles");
    return normalizeArrayResponse(payload, ["vehicles"]);
  },

  async getRoutes() {
    const payload = await request("/routes");
    return normalizeArrayResponse(payload, ["routes"]);
  },

  async getWasteStock() {
    const payload = await request("/waste-stock");

    const data = payload?.data || payload || {};

    return {
      items:
        normalizeArrayResponse(payload, [
          "items",
          "stockItems",
          "wasteStockItems",
        ]) ||
        normalizeArrayResponse(data, ["items", "stockItems", "wasteStockItems"]),

      lots:
        normalizeArrayResponse(payload, ["lots", "stockLots", "wasteStockLots"]) ||
        normalizeArrayResponse(data, ["lots", "stockLots", "wasteStockLots"]),
    };
  },

  async getCollectionReportData() {
    const [collections, generators, collectors, drivers, vehicles, routes] =
      await Promise.all([
        this.getCollections(),
        this.getGenerators(),
        this.getCollectors(),
        this.getDrivers(),
        this.getVehicles(),
        this.getRoutes(),
      ]);

    return {
      collections,
      generators,
      collectors,
      drivers,
      vehicles,
      routes,
    };
  },

  async getStaffReportData() {
    const [drivers, collectors, collections, routes] = await Promise.all([
      this.getDrivers(),
      this.getCollectors(),
      this.getCollections(),
      this.getRoutes(),
    ]);

    return {
      drivers,
      collectors,
      collections,
      routes,
    };
  },

  async getVehicleReportData() {
    const [vehicles, collections, routes] = await Promise.all([
      this.getVehicles(),
      this.getCollections(),
      this.getRoutes(),
    ]);

    return {
      vehicles,
      collections,
      routes,
    };
  },

  async getWasteTypeReportData() {
    const [collections, wasteStock] = await Promise.all([
      this.getCollections(),
      this.getWasteStock(),
    ]);

    return {
      collections,
      stockItems: wasteStock.items,
      stockLots: wasteStock.lots,
    };
  },
};

export default reportService;