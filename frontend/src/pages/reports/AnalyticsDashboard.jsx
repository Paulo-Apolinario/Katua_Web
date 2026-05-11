import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  ExternalLink,
  Factory,
  Fuel,
  Leaf,
  MapPin,
  Navigation,
  PackageCheck,
  RefreshCcw,
  Route,
  TrendingUp,
  Truck,
  Users,
  Weight,
  Droplets,
  Zap,
  TreePine,
  Cloud,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import toast from "react-hot-toast";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const COLORS = [
  "#1A7E00",
  "#64B000",
  "#2563EB",
  "#F59E0B",
  "#DC2626",
  "#7C3AED",
  "#0EA5E9",
  "#15803D",
];

const ROUTE_STATUS_LABELS = {
  SCHEDULED: "Agendada",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

const PRIORITY_LABELS = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

const PRIORITY_BADGES = {
  HIGH: "bg-danger",
  MEDIUM: "bg-warning",
  LOW: "bg-success",
};

const DEFAULT_CENTER = {
  lat: -3.7319,
  lng: -38.5267,
};

const AVERAGE_SPEED_KMH = 28;
const FUEL_CONSUMPTION_KM_PER_LITER = 8;
const FUEL_PRICE_PER_LITER = 6.2;

/**
 * Fatores ambientais estimados por kg de resíduo reciclado/coletado.
 * Esses fatores permitem sair do cálculo genérico totalKg * 0.87
 * e passar para um modelo ESG por tipo de material.
 */
const ENVIRONMENTAL_FACTORS = {
  PAPEL: {
    aliases: ["PAPEL", "PAPELAO", "PAPELÃO", "PAPER", "CARDBOARD"],
    co2PerKg: 3.5,
    waterLitersPerKg: 26,
    energyKwhPerKg: 4.1,
    treesPerKg: 0.017,
  },
  PLASTICO: {
    aliases: ["PLASTICO", "PLÁSTICO", "PLASTIC", "PET"],
    co2PerKg: 5.8,
    waterLitersPerKg: 12,
    energyKwhPerKg: 6.2,
    treesPerKg: 0,
  },
  METAL: {
    aliases: ["METAL", "ALUMINIO", "ALUMÍNIO", "FERRO", "ACO", "AÇO", "STEEL"],
    co2PerKg: 9.1,
    waterLitersPerKg: 18,
    energyKwhPerKg: 14,
    treesPerKg: 0,
  },
  VIDRO: {
    aliases: ["VIDRO", "GLASS"],
    co2PerKg: 0.8,
    waterLitersPerKg: 4,
    energyKwhPerKg: 0.9,
    treesPerKg: 0,
  },
  ELETRONICO: {
    aliases: ["ELETRONICO", "ELETRÔNICO", "ELETROELETRONICO", "E-WASTE", "EWASTE"],
    co2PerKg: 7.2,
    waterLitersPerKg: 35,
    energyKwhPerKg: 9.8,
    treesPerKg: 0,
  },
  ORGANICO: {
    aliases: ["ORGANICO", "ORGÂNICO", "ORGANIC"],
    co2PerKg: 0.6,
    waterLitersPerKg: 2,
    energyKwhPerKg: 0.3,
    treesPerKg: 0,
  },
  OUTROS: {
    aliases: ["OUTROS", "OUTRO", "MISTO", "RESIDUO", "RESÍDUO", "MATERIAL"],
    co2PerKg: 0.87,
    waterLitersPerKg: 5,
    energyKwhPerKg: 1,
    treesPerKg: 0,
  },
};

const getToken = () => localStorage.getItem("auth_token");

const fetchJson = async (endpoint) => {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.message || payload?.error || "Erro ao carregar dashboard."
    );
  }

  return payload;
};

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

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const normalizeText = (value) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
};

const formatKg = (value) => {
  return `${toNumber(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} kg`;
};

const formatTons = (value) => {
  return `${toNumber(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} t`;
};

const formatLiters = (value) => {
  return `${toNumber(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })} L`;
};

const formatKwh = (value) => {
  return `${toNumber(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })} kWh`;
};

const formatTrees = (value) => {
  return `${toNumber(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} árvores`;
};

const formatKm = (value) => {
  return `${toNumber(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`;
};

const formatCurrency = (value) => {
  return toNumber(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const formatMinutes = (value) => {
  const minutes = Math.round(toNumber(value));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!remainingMinutes) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
};

const getCollectionDate = (collection) => {
  return collection?.collectedAt || collection?.createdAt || null;
};

const getMonthKey = (date) => {
  if (!date) return "Sem data";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Sem data";
  }

  return parsedDate.toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
};

const normalizeMaterials = (materials) => {
  if (!materials) return [];

  if (Array.isArray(materials)) return materials;

  if (typeof materials === "string") {
    try {
      const parsed = JSON.parse(materials);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const getMaterialName = (material) => {
  return (
    material?.type ||
    material?.name ||
    material?.materialName ||
    material?.category ||
    "OUTROS"
  );
};

const getMaterialWeight = (material) => {
  return toNumber(material?.quantityKg || material?.quantity || material?.kg);
};

const getEnvironmentalFactor = (materialName) => {
  const normalizedName = normalizeText(materialName);

  const foundKey = Object.keys(ENVIRONMENTAL_FACTORS).find((key) => {
    const factor = ENVIRONMENTAL_FACTORS[key];

    return factor.aliases.some((alias) => {
      const normalizedAlias = normalizeText(alias);
      return (
        normalizedName === normalizedAlias ||
        normalizedName.includes(normalizedAlias) ||
        normalizedAlias.includes(normalizedName)
      );
    });
  });

  return ENVIRONMENTAL_FACTORS[foundKey || "OUTROS"];
};

const getCollectionWeight = (collection) => {
  const totalWeightKg = toNumber(collection?.totalWeightKg);

  if (totalWeightKg > 0) return totalWeightKg;

  return normalizeMaterials(collection?.materials).reduce((total, material) => {
    return total + getMaterialWeight(material);
  }, 0);
};

const calculateCollectionEnvironmentalImpact = (collection) => {
  const materials = normalizeMaterials(collection?.materials);

  if (!materials.length) {
    const fallbackKg = getCollectionWeight(collection);
    const fallbackFactor = ENVIRONMENTAL_FACTORS.OUTROS;

    return {
      co2Kg: fallbackKg * fallbackFactor.co2PerKg,
      waterLiters: fallbackKg * fallbackFactor.waterLitersPerKg,
      energyKwh: fallbackKg * fallbackFactor.energyKwhPerKg,
      trees: fallbackKg * fallbackFactor.treesPerKg,
    };
  }

  return materials.reduce(
    (acc, material) => {
      const materialName = getMaterialName(material);
      const quantityKg = getMaterialWeight(material);
      const factor = getEnvironmentalFactor(materialName);

      acc.co2Kg += quantityKg * factor.co2PerKg;
      acc.waterLiters += quantityKg * factor.waterLitersPerKg;
      acc.energyKwh += quantityKg * factor.energyKwhPerKg;
      acc.trees += quantityKg * factor.treesPerKg;

      return acc;
    },
    {
      co2Kg: 0,
      waterLiters: 0,
      energyKwh: 0,
      trees: 0,
    }
  );
};

const getGeneratorFromCollection = (collection) => {
  return collection?.generator || collection?.schedule?.generator || null;
};
const getGeneratorName = (collection) => {
  const generator = getGeneratorFromCollection(collection);

  return (
    generator?.companyName ||
    generator?.name ||
    collection?.generatorName ||
    "Gerador não informado"
  );
};

const getCollectorName = (collection) => {
  return (
    collection?.collector?.user?.displayName ||
    collection?.collector?.name ||
    collection?.collector?.displayName ||
    collection?.collectorName ||
    "Catador não informado"
  );
};

const getGeneratorAddress = (generator) => {
  if (!generator) return "Endereço não informado";

  const fullAddress = [
    generator.street,
    generator.number,
    generator.neighborhood,
    generator.city,
    generator.state,
  ]
    .filter(Boolean)
    .join(", ");

  return generator.address || fullAddress || "Endereço não informado";
};

const getLat = (item) => {
  return toNumber(
    item?.latitude ||
      item?.lat ||
      item?.location?.latitude ||
      item?.location?.lat,
    null
  );
};

const getLng = (item) => {
  return toNumber(
    item?.longitude ||
      item?.lng ||
      item?.location?.longitude ||
      item?.location?.lng,
    null
  );
};

const hasCoordinates = (item) => {
  return getLat(item) !== null && getLng(item) !== null;
};

const calculateDistanceKm = (origin, destination) => {
  const lat1 = getLat(origin);
  const lon1 = getLng(origin);
  const lat2 = getLat(destination);
  const lon2 = getLng(destination);

  if ([lat1, lon1, lat2, lon2].some((value) => value === null)) {
    return 0;
  }

  const earthRadiusKm = 6371;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

const calculateOperationalPriority = ({
  totalKg,
  collectionsCount,
  distanceKm,
}) => {
  if (totalKg >= 500 || collectionsCount >= 10 || distanceKm >= 20) {
    return "HIGH";
  }

  if (totalKg >= 150 || collectionsCount >= 4 || distanceKm >= 8) {
    return "MEDIUM";
  }

  return "LOW";
};

const getRouteDriverName = (routeItem) => {
  return (
    routeItem?.driver?.user?.displayName ||
    routeItem?.driver?.name ||
    routeItem?.driver?.displayName ||
    routeItem?.driverName ||
    "Motorista não informado"
  );
};

const getRouteVehicleName = (routeItem) => {
  const vehicle = routeItem?.vehicle;

  if (!vehicle) {
    return routeItem?.vehicleName || "Veículo não informado";
  }

  return (
    vehicle.plate ||
    [vehicle.brand, vehicle.model].filter(Boolean).join(" ") ||
    vehicle.name ||
    "Veículo não informado"
  );
};

const getRouteStops = (routeItem) => {
  if (Array.isArray(routeItem?.stops)) return routeItem.stops.length;
  if (Array.isArray(routeItem?.collections)) return routeItem.collections.length;

  if (Array.isArray(routeItem?.routeCollections)) {
    return routeItem.routeCollections.length;
  }

  return toNumber(routeItem?.stopsCount || routeItem?.totalStops);
};

const getRouteCollections = (routeItem) => {
  if (Array.isArray(routeItem?.collections)) return routeItem.collections;

  if (Array.isArray(routeItem?.routeCollections)) {
    return routeItem.routeCollections
      .map((item) => item?.collection || item)
      .filter(Boolean);
  }

  return [];
};

const buildMapsQuery = (points) => {
  const firstValidPoint = points.find((point) => point.lat && point.lng);

  if (!firstValidPoint) {
    return `${DEFAULT_CENTER.lat},${DEFAULT_CENTER.lng}`;
  }

  return `${firstValidPoint.lat},${firstValidPoint.lng}`;
};

const buildGoogleMapsDirectionsUrl = (points) => {
  const validPoints = points
    .filter((point) => point.lat && point.lng)
    .slice(0, 8);

  if (!validPoints.length) {
    return `https://www.google.com/maps/search/?api=1&query=${DEFAULT_CENTER.lat},${DEFAULT_CENTER.lng}`;
  }

  if (validPoints.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${validPoints[0].lat},${validPoints[0].lng}`;
  }

  const origin = validPoints[0];
  const destination = validPoints[validPoints.length - 1];

  const waypoints = validPoints
    .slice(1, -1)
    .map((point) => `${point.lat},${point.lng}`)
    .join("|");

  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}${
    waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""
  }`;
};
const EmptyState = ({ title, description }) => (
  <div
    className="text-center p-4"
    style={{
      border: "1px dashed #d1d5db",
      borderRadius: 16,
      background: "#f9fafb",
    }}
  >
    <p className="fw-700 mb-1">{title}</p>
    <p className="text-muted mb-0">{description}</p>
  </div>
);

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);

  const [collections, setCollections] = useState([]);
  const [generators, setGenerators] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);

  const [selectedGeneratorId, setSelectedGeneratorId] = useState(null);
  const [mapViewMode, setMapViewMode] = useState("overview");

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [
        collectionsPayload,
        generatorsPayload,
        collectorsPayload,
        driversPayload,
        vehiclesPayload,
        routesPayload,
      ] = await Promise.all([
        fetchJson("/collections"),
        fetchJson("/generators"),
        fetchJson("/collectors"),
        fetchJson("/drivers"),
        fetchJson("/vehicles"),
        fetchJson("/routes"),
      ]);

      setCollections(
        normalizeArrayResponse(collectionsPayload, ["collections"])
      );
      setGenerators(
        normalizeArrayResponse(generatorsPayload, ["generators"])
      );
      setCollectors(
        normalizeArrayResponse(collectorsPayload, ["collectors"])
      );
      setDrivers(normalizeArrayResponse(driversPayload, ["drivers"]));
      setVehicles(normalizeArrayResponse(vehiclesPayload, ["vehicles"]));
      setRoutes(normalizeArrayResponse(routesPayload, ["routes"]));
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Erro ao carregar analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleGeneratorSelect = (event) => {
    const generatorId = event.target.value;

    if (generatorId) {
      setSelectedGeneratorId(generatorId);
      setMapViewMode("generator");
      return;
    }

    handleClearSelection();
  };

  const handleClearSelection = () => {
    setSelectedGeneratorId(null);
    setMapViewMode("overview");
  };

  const environmentalImpact = useMemo(() => {
    return collections.reduce(
      (acc, collection) => {
        const impact = calculateCollectionEnvironmentalImpact(collection);

        acc.co2Kg += impact.co2Kg;
        acc.waterLiters += impact.waterLiters;
        acc.energyKwh += impact.energyKwh;
        acc.trees += impact.trees;

        return acc;
      },
      {
        co2Kg: 0,
        waterLiters: 0,
        energyKwh: 0,
        trees: 0,
      }
    );
  }, [collections]);

  const analytics = useMemo(() => {
    const totalCollections = collections.length;

    const completedCollections = collections.filter(
      (item) => item.status === "COMPLETED"
    ).length;

    const activeRoutes = routes.filter(
      (item) => item.status === "IN_PROGRESS" || item.status === "SCHEDULED"
    ).length;

    const activeVehicles = vehicles.filter(
      (item) => item.status === "ACTIVE"
    ).length;

    const activeCollectors = collectors.filter(
      (item) => item.status !== "INACTIVE"
    ).length;

    const activeDrivers = drivers.filter(
      (item) => item.status !== "INACTIVE"
    ).length;

    const activeGenerators = generators.filter(
      (item) =>
        item.accessReleased === true ||
        item.accessStatus === "ACTIVE" ||
        item.isActive === true ||
        !item.accessStatus
    ).length;

    const totalKg = collections.reduce((sum, collection) => {
      return sum + getCollectionWeight(collection);
    }, 0);

    const efficiency = totalCollections
      ? (completedCollections / totalCollections) * 100
      : 0;

    return {
      totalCollections,
      completedCollections,
      activeRoutes,
      activeVehicles,
      activeCollectors,
      activeDrivers,
      activeGenerators,
      totalKg,
      environmentalImpactKg: environmentalImpact.co2Kg,
      waterSavedLiters: environmentalImpact.waterLiters,
      energySavedKwh: environmentalImpact.energyKwh,
      treesPreserved: environmentalImpact.trees,
      efficiency,
    };
  }, [
    collections,
    routes,
    vehicles,
    collectors,
    drivers,
    generators,
    environmentalImpact,
  ]);

  const collectionsByMonth = useMemo(() => {
    const map = new Map();

    collections.forEach((collection) => {
      const key = getMonthKey(getCollectionDate(collection));

      const current = map.get(key) || {
        name: key,
        kg: 0,
        coletas: 0,
        co2: 0,
      };

      const impact = calculateCollectionEnvironmentalImpact(collection);

      current.kg += getCollectionWeight(collection);
      current.coletas += 1;
      current.co2 += impact.co2Kg;

      map.set(key, current);
    });

    return Array.from(map.values());
  }, [collections]);
    const materialChart = useMemo(() => {
    const map = new Map();

    collections.forEach((collection) => {
      normalizeMaterials(collection.materials).forEach((material) => {
        const name = getMaterialName(material);
        const quantityKg = getMaterialWeight(material);
        const factor = getEnvironmentalFactor(name);

        const current = map.get(name) || {
          name,
          value: 0,
          co2: 0,
          water: 0,
          energy: 0,
        };

        current.value += quantityKg;
        current.co2 += quantityKg * factor.co2PerKg;
        current.water += quantityKg * factor.waterLitersPerKg;
        current.energy += quantityKg * factor.energyKwhPerKg;

        map.set(name, current);
      });
    });

    return Array.from(map.values())
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [collections]);

  const environmentalChart = useMemo(() => {
    return materialChart.map((material) => ({
      name: material.name,
      co2: material.co2,
      kg: material.value,
    }));
  }, [materialChart]);

  const generatorRanking = useMemo(() => {
    const map = new Map();

    collections.forEach((collection) => {
      const generator = getGeneratorFromCollection(collection);
      const generatorName = getGeneratorName(collection);
      const impact = calculateCollectionEnvironmentalImpact(collection);

      const current = map.get(generatorName) || {
        id: generator?.id,
        name: generatorName,
        address: getGeneratorAddress(generator),
        latitude: getLat(generator),
        longitude: getLng(generator),
        kg: 0,
        coletas: 0,
        co2: 0,
      };

      current.kg += getCollectionWeight(collection);
      current.coletas += 1;
      current.co2 += impact.co2Kg;

      map.set(generatorName, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 10);
  }, [collections]);

  const collectorRanking = useMemo(() => {
    const map = new Map();

    collections.forEach((collection) => {
      const collectorName = getCollectorName(collection);
      const impact = calculateCollectionEnvironmentalImpact(collection);

      const current = map.get(collectorName) || {
        name: collectorName,
        kg: 0,
        coletas: 0,
        co2: 0,
      };

      current.kg += getCollectionWeight(collection);
      current.coletas += 1;
      current.co2 += impact.co2Kg;

      map.set(collectorName, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 10);
  }, [collections]);

  const routeStatusChart = useMemo(() => {
    return Object.entries(ROUTE_STATUS_LABELS).map(([status, label]) => ({
      name: label,
      value: routes.filter((routeItem) => routeItem.status === status).length,
    }));
  }, [routes]);

  const strategicGenerators = useMemo(() => {
    return generatorRanking.map((generator) => {
      const distanceKm = calculateDistanceKm(DEFAULT_CENTER, {
        latitude: generator.latitude,
        longitude: generator.longitude,
      });

      const estimatedMinutes =
        distanceKm > 0 ? (distanceKm / AVERAGE_SPEED_KMH) * 60 : 0;

      const estimatedFuel =
        distanceKm > 0 ? distanceKm / FUEL_CONSUMPTION_KM_PER_LITER : 0;

      const priority = calculateOperationalPriority({
        totalKg: generator.kg,
        collectionsCount: generator.coletas,
        distanceKm,
      });

      return {
        ...generator,
        distanceKm,
        estimatedMinutes,
        estimatedFuel,
        estimatedFuelCost: estimatedFuel * FUEL_PRICE_PER_LITER,
        priority,
      };
    });
  }, [generatorRanking]);

  const strategicRoutes = useMemo(() => {
    return routes.map((routeItem) => {
      const collectionsList = getRouteCollections(routeItem);

      const routeGenerators = collectionsList
        .map((collection) => getGeneratorFromCollection(collection))
        .filter(Boolean);

      let totalDistanceKm = 0;

      routeGenerators.forEach((generator, index) => {
        if (index === 0) {
          totalDistanceKm += calculateDistanceKm(DEFAULT_CENTER, generator);
        } else {
          totalDistanceKm += calculateDistanceKm(
            routeGenerators[index - 1],
            generator
          );
        }
      });

      const estimatedMinutes =
        totalDistanceKm > 0
          ? (totalDistanceKm / AVERAGE_SPEED_KMH) * 60
          : 0;

      const estimatedFuel =
        totalDistanceKm > 0
          ? totalDistanceKm / FUEL_CONSUMPTION_KM_PER_LITER
          : 0;

      return {
        ...routeItem,
        driverName: getRouteDriverName(routeItem),
        vehicleName: getRouteVehicleName(routeItem),
        stops: getRouteStops(routeItem),
        distanceKm: totalDistanceKm,
        estimatedMinutes,
        estimatedFuel,
        estimatedFuelCost: estimatedFuel * FUEL_PRICE_PER_LITER,
      };
    });
  }, [routes]);
    const operationalInsights = useMemo(() => {
    const longestRoute = [...strategicRoutes].sort(
      (a, b) => b.distanceKm - a.distanceKm
    )[0];

    const mostExpensiveRoute = [...strategicRoutes].sort(
      (a, b) => b.estimatedFuelCost - a.estimatedFuelCost
    )[0];

    const highestVolumeGenerator = [...strategicGenerators].sort(
      (a, b) => b.kg - a.kg
    )[0];

    const farthestGenerator = [...strategicGenerators].sort(
      (a, b) => b.distanceKm - a.distanceKm
    )[0];

    const delayedRoutes = strategicRoutes.filter(
      (routeItem) =>
        routeItem.status === "IN_PROGRESS" && routeItem.estimatedMinutes > 180
    );

    return {
      longestRoute,
      mostExpensiveRoute,
      highestVolumeGenerator,
      farthestGenerator,
      delayedRoutes,
    };
  }, [strategicRoutes, strategicGenerators]);

  const mapPoints = useMemo(() => {
    return strategicGenerators
      .filter((item) =>
        hasCoordinates({
          latitude: item.latitude,
          longitude: item.longitude,
        })
      )
      .map((item) => ({
        lat: item.latitude,
        lng: item.longitude,
        name: item.name,
        kg: item.kg,
      }));
  }, [strategicGenerators]);

  const mapQuery = useMemo(() => {
    return buildMapsQuery(mapPoints);
  }, [mapPoints]);

  const selectedGenerator = useMemo(() => {
    if (!selectedGeneratorId) return null;

    return strategicGenerators.find(
      (generator) =>
        String(generator.id) === String(selectedGeneratorId) ||
        String(generator.name) === String(selectedGeneratorId)
    );
  }, [selectedGeneratorId, strategicGenerators]);

  const mapEmbedUrl = useMemo(() => {
    if (
      mapViewMode === "generator" &&
      selectedGenerator &&
      hasCoordinates(selectedGenerator)
    ) {
      return `https://maps.google.com/maps?q=${selectedGenerator.latitude},${selectedGenerator.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    }

    return `https://maps.google.com/maps?q=${encodeURIComponent(
      mapQuery
    )}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
  }, [mapViewMode, selectedGenerator, mapQuery]);

  const directionsUrl = useMemo(() => {
    if (
      mapViewMode === "generator" &&
      selectedGenerator &&
      hasCoordinates(selectedGenerator)
    ) {
      return `https://www.google.com/maps/dir/?api=1&origin=${DEFAULT_CENTER.lat},${DEFAULT_CENTER.lng}&destination=${selectedGenerator.latitude},${selectedGenerator.longitude}`;
    }

    return buildGoogleMapsDirectionsUrl(mapPoints);
  }, [mapViewMode, selectedGenerator, mapPoints]);

  const operationalRows = useMemo(() => {
    const fallbackRoute = strategicRoutes[0];

    return strategicGenerators.map((generator, index) => {
      const routeItem =
        strategicRoutes.find((item) => {
          const routeCollections = getRouteCollections(item);

          return routeCollections.some((collection) => {
            const collectionGenerator = getGeneratorFromCollection(collection);

            return (
              collectionGenerator?.id && collectionGenerator.id === generator.id
            );
          });
        }) || fallbackRoute;

      return {
        id: `${generator.id || generator.name}-${index}`,
        generatorName: generator.name,
        routeName:
          routeItem?.name ||
          routeItem?.title ||
          routeItem?.description ||
          `Rota ${index + 1}`,
        vehicleName: routeItem?.vehicleName || "Veículo não informado",
        driverName: routeItem?.driverName || "Motorista não informado",
        distanceKm: generator.distanceKm,
        estimatedFuel: generator.estimatedFuel,
        estimatedMinutes: generator.estimatedMinutes,
        priority: generator.priority,
      };
    });
  }, [strategicGenerators, strategicRoutes]);

  return (
    <>
      <HeadTags title="Analytics Dashboard" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-20">
            <div>
              <h3 className="fs-30 mb-1">Analytics Dashboard</h3>
              <p className="text-muted mb-0">
                Central executiva de BI, produtividade, logística e indicadores
                ambientais.
              </p>
            </div>

            <button
              className="btn btn-success d-flex align-items-center gap-8"
              onClick={loadDashboard}
              disabled={loading}
            >
              <RefreshCcw size={18} />
              {loading ? "Atualizando..." : "Atualizar dashboard"}
            </button>
          </div>
        </div>
      </div>
            <div className="row g-4 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-15">
              <PackageCheck color="#1A7E00" size={34} />
              <div>
                <p className="text-muted mb-1">Total de coletas</p>
                <h3>{analytics.totalCollections}</h3>
                <small className="text-muted">
                  {analytics.completedCollections} concluídas
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-15">
              <Weight color="#1A7E00" size={34} />
              <div>
                <p className="text-muted mb-1">Total coletado</p>
                <h3>{formatKg(analytics.totalKg)}</h3>
                <small className="text-muted">
                  Volume operacional dos catadores
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-15">
              <Route color="#1A7E00" size={34} />
              <div>
                <p className="text-muted mb-1">Rotas ativas</p>
                <h3>{analytics.activeRoutes}</h3>
                <small className="text-muted">Agendadas ou em andamento</small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-15">
              <Cloud color="#1A7E00" size={34} />
              <div>
                <p className="text-muted mb-1">CO₂ evitado</p>
                <h3>{formatKg(analytics.environmentalImpactKg)}</h3>
                <small className="text-muted">
                  Calculado por tipo de resíduo
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-15">
              <Droplets color="#2563EB" size={34} />
              <div>
                <p className="text-muted mb-1">Água economizada</p>
                <h3>{formatLiters(analytics.waterSavedLiters)}</h3>
                <small className="text-muted">Estimativa ambiental ESG</small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-15">
              <Zap color="#F59E0B" size={34} />
              <div>
                <p className="text-muted mb-1">Energia economizada</p>
                <h3>{formatKwh(analytics.energySavedKwh)}</h3>
                <small className="text-muted">Com base nos materiais</small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-15">
              <TreePine color="#15803D" size={34} />
              <div>
                <p className="text-muted mb-1">Árvores preservadas</p>
                <h3>{formatTrees(analytics.treesPreserved)}</h3>
                <small className="text-muted">Principalmente por papel</small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-15">
              <Leaf color="#16A34A" size={34} />
              <div>
                <p className="text-muted mb-1">Impacto ambiental</p>
                <h3>{formatTons(analytics.environmentalImpactKg / 1000)}</h3>
                <small className="text-muted">Toneladas de CO₂ evitadas</small>
              </div>
            </div>
          </div>
        </div>
      </div>
            <div className="row g-4 mb-4">
        <div className="col-xl-8">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h4 className="fw-600 fs-20 mb-1">
                  Comparativo mensal de coletas
                </h4>
                <p className="text-muted mb-0">
                  Evolução mensal de volume coletado, coletas e CO₂ evitado.
                </p>
              </div>

              <TrendingUp size={22} color="#1A7E00" />
            </div>

            <div style={{ width: "100%", height: 360 }}>
              <ResponsiveContainer>
                <LineChart data={collectionsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="kg"
                    stroke="#1A7E00"
                    strokeWidth={3}
                    name="Kg coletados"
                  />
                  <Line
                    type="monotone"
                    dataKey="coletas"
                    stroke="#2563EB"
                    strokeWidth={3}
                    name="Coletas"
                  />
                  <Line
                    type="monotone"
                    dataKey="co2"
                    stroke="#F59E0B"
                    strokeWidth={3}
                    name="CO₂ evitado"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h4 className="fw-600 fs-20 mb-1">Materiais coletados</h4>
                <p className="text-muted mb-0">
                  Distribuição por tipo de resíduo.
                </p>
              </div>

              <Leaf size={22} color="#1A7E00" />
            </div>

            <div style={{ width: "100%", height: 360 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={materialChart}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={120}
                    label
                  >
                    {materialChart.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatKg(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-12">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h4 className="fw-600 fs-20 mb-1">
                  Impacto ambiental por material
                </h4>
                <p className="text-muted mb-0">
                  Comparativo entre volume coletado e CO₂ evitado por resíduo.
                </p>
              </div>

              <Cloud size={22} color="#1A7E00" />
            </div>

            <div style={{ width: "100%", height: 360 }}>
              <ResponsiveContainer>
                <BarChart data={environmentalChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "CO₂ evitado") return formatKg(value);
                      return formatKg(value);
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="kg"
                    fill="#1A7E00"
                    name="Kg coletados"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="co2"
                    fill="#F59E0B"
                    name="CO₂ evitado"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
            <div className="row g-4 mb-4">
        <div className="col-xl-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h4 className="fw-600 fs-20 mb-1">Ranking de geradores</h4>
                <p className="text-muted mb-0">
                  Geradores com maior volume coletado e impacto ambiental.
                </p>
              </div>

              <Factory size={22} color="#1A7E00" />
            </div>

            <div style={{ width: "100%", height: 350 }}>
              <ResponsiveContainer>
                <BarChart data={generatorRanking} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip formatter={(value) => formatKg(value)} />
                  <Legend />
                  <Bar
                    dataKey="kg"
                    fill="#1A7E00"
                    name="Kg coletados"
                    radius={[0, 8, 8, 0]}
                  />
                  <Bar
                    dataKey="co2"
                    fill="#F59E0B"
                    name="CO₂ evitado"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h4 className="fw-600 fs-20 mb-1">Ranking de catadores</h4>
                <p className="text-muted mb-0">
                  Catadores com maior produtividade e impacto ambiental.
                </p>
              </div>

              <Users size={22} color="#1A7E00" />
            </div>

            <div style={{ width: "100%", height: 350 }}>
              <ResponsiveContainer>
                <BarChart data={collectorRanking} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip formatter={(value) => formatKg(value)} />
                  <Legend />
                  <Bar
                    dataKey="kg"
                    fill="#2563EB"
                    name="Kg coletados"
                    radius={[0, 8, 8, 0]}
                  />
                  <Bar
                    dataKey="co2"
                    fill="#F59E0B"
                    name="CO₂ evitado"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-15 mb-3">
              <Truck size={28} color="#1A7E00" />
              <div>
                <p className="text-muted mb-1">Veículos ativos</p>
                <h3>{analytics.activeVehicles}</h3>
                <small className="text-muted">
                  {vehicles.length} cadastrados
                </small>
              </div>
            </div>

            <div className="progress" style={{ height: 8 }}>
              <div
                className="progress-bar bg-success"
                style={{
                  width: vehicles.length
                    ? `${(analytics.activeVehicles / vehicles.length) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-15 mb-3">
              <Users size={28} color="#2563EB" />
              <div>
                <p className="text-muted mb-1">Catadores ativos</p>
                <h3>{analytics.activeCollectors}</h3>
                <small className="text-muted">
                  {collectors.length} cadastrados
                </small>
              </div>
            </div>

            <div className="progress" style={{ height: 8 }}>
              <div
                className="progress-bar bg-primary"
                style={{
                  width: collectors.length
                    ? `${(analytics.activeCollectors / collectors.length) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>
        </div>
      </div>
            <div className="row g-4 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-15 mb-3">
              <Activity size={28} color="#F59E0B" />
              <div>
                <p className="text-muted mb-1">Eficiência logística</p>
                <h3>{analytics.efficiency.toFixed(1)}%</h3>
                <small className="text-muted">Coletas concluídas</small>
              </div>
            </div>

            <div className="progress" style={{ height: 8 }}>
              <div
                className="progress-bar bg-warning"
                style={{ width: `${analytics.efficiency}%` }}
              />
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-15 mb-3">
              <Factory size={28} color="#7C3AED" />
              <div>
                <p className="text-muted mb-1">Geradores ativos</p>
                <h3>{analytics.activeGenerators}</h3>
                <small className="text-muted">
                  {generators.length} cadastrados
                </small>
              </div>
            </div>

            <div className="progress" style={{ height: 8 }}>
              <div
                className="progress-bar"
                style={{
                  width: generators.length
                    ? `${(analytics.activeGenerators / generators.length) * 100}%`
                    : "0%",
                  background: "#7C3AED",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-12">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-20 mb-4">
              <div>
                <h4 className="fw-600 fs-22 mb-1">
                  Mapa e Análise de Geradores
                </h4>
                <p className="text-muted mb-0">
                  Selecione um gerador para visualizar sua localização e detalhes
                  operacionais.
                </p>
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-success">
                  {strategicGenerators.length} geradores
                </span>
                <span className="badge bg-primary">
                  {strategicRoutes.length} rotas
                </span>
              </div>
            </div>

            <div className="row g-4">
              <div className="col-lg-7">
                <div
                  style={{
                    width: "100%",
                    height: 500,
                    borderRadius: 18,
                    overflow: "hidden",
                    border: "1px solid #e5e7eb",
                    position: "relative",
                  }}
                >
                  <iframe
                    title="Mapa Operacional Estratégico"
                    width="100%"
                    height="100%"
                    loading="lazy"
                    allowFullScreen
                    src={mapEmbedUrl}
                    style={{ border: 0 }}
                  />

                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-light btn-sm fw-700 d-flex align-items-center gap-1"
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      zIndex: 5,
                      boxShadow: "0 8px 20px rgba(15,23,42,0.15)",
                    }}
                  >
                    <ExternalLink size={14} />
                    Abrir rota no Maps
                  </a>
                </div>
              </div>
                            <div className="col-lg-5">
                <div
                  className="p-3 h-100"
                  style={{
                    borderRadius: 18,
                    background: "#F8FAFC",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <div className="mb-4">
                    <label
                      htmlFor="generatorSelect"
                      className="form-label fw-700 mb-2"
                    >
                      Selecione um gerador para análise:
                    </label>

                    <div className="d-flex gap-2">
                      <select
                        id="generatorSelect"
                        className="form-select"
                        value={selectedGeneratorId || ""}
                        onChange={handleGeneratorSelect}
                        style={{ flex: 1 }}
                      >
                        <option value="">-- Escolha um gerador --</option>

                        {strategicGenerators.map((generator) => (
                          <option
                            key={generator.id || generator.name}
                            value={generator.id || generator.name}
                          >
                            {generator.name} - {formatKg(generator.kg)}
                          </option>
                        ))}
                      </select>

                      <button
                        className="btn btn-outline-secondary d-flex align-items-center gap-1"
                        onClick={handleClearSelection}
                        title="Limpar seleção e voltar à visão geral"
                        type="button"
                      >
                        <RefreshCcw size={16} />
                        Limpar
                      </button>
                    </div>

                    <small className="text-muted mt-1 d-block">
                      O mapa será centralizado no gerador escolhido.
                    </small>
                  </div>

                  {selectedGenerator ? (
                    <div>
                      <h5 className="fw-700 mb-3 pb-2 border-bottom">
                        Informações da geradora
                      </h5>

                      <div className="row g-3">
                        <div className="col-12">
                          <div
                            className="card p-3 shadow-sm border-0"
                            style={{ background: "#FFFFFF" }}
                          >
                            <div className="d-flex align-items-start gap-2">
                              <div className="bg-success bg-opacity-10 p-2 rounded">
                                <Factory size={24} color="#1A7E00" />
                              </div>

                              <div>
                                <strong className="d-block fs-6 mb-1">
                                  {selectedGenerator.name}
                                </strong>

                                <small className="text-muted d-flex align-items-center gap-1">
                                  <MapPin size={12} />
                                  {selectedGenerator.address}
                                </small>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="col-6">
                          <div
                            className="card p-3 text-center shadow-sm border-0 h-100"
                            style={{ background: "#F0FDF4" }}
                          >
                            <Weight
                              size={28}
                              className="mx-auto mb-2"
                              color="#15803D"
                            />
                            <span className="text-muted small text-uppercase">
                              Volume total
                            </span>
                            <strong className="fs-5 mt-1">
                              {formatKg(selectedGenerator.kg)}
                            </strong>
                          </div>
                        </div>

                        <div className="col-6">
                          <div
                            className="card p-3 text-center shadow-sm border-0 h-100"
                            style={{ background: "#EFF6FF" }}
                          >
                            <PackageCheck
                              size={28}
                              className="mx-auto mb-2"
                              color="#2563EB"
                            />
                            <span className="text-muted small text-uppercase">
                              Total de coletas
                            </span>
                            <strong className="fs-5 mt-1">
                              {selectedGenerator.coletas}
                            </strong>
                          </div>
                        </div>

                        <div className="col-6">
                          <div
                            className="card p-3 text-center shadow-sm border-0 h-100"
                            style={{ background: "#FFFBEB" }}
                          >
                            <Navigation
                              size={28}
                              className="mx-auto mb-2"
                              color="#D97706"
                            />
                            <span className="text-muted small text-uppercase">
                              Distância
                            </span>
                            <strong className="fs-5 mt-1">
                              {formatKm(selectedGenerator.distanceKm)}
                            </strong>
                          </div>
                        </div>
                                                <div className="col-6">
                          <div
                            className="card p-3 text-center shadow-sm border-0 h-100"
                            style={{ background: "#FEF2F2" }}
                          >
                            <Fuel
                              size={28}
                              className="mx-auto mb-2"
                              color="#DC2626"
                            />
                            <span className="text-muted small text-uppercase">
                              Combustível
                            </span>
                            <strong className="fs-5 mt-1">
                              {formatLiters(selectedGenerator.estimatedFuel)}
                            </strong>
                          </div>
                        </div>

                        <div className="col-6">
                          <div
                            className="card p-3 text-center shadow-sm border-0 h-100"
                            style={{ background: "#ECFEFF" }}
                          >
                            <Cloud
                              size={28}
                              className="mx-auto mb-2"
                              color="#0891B2"
                            />
                            <span className="text-muted small text-uppercase">
                              CO₂ evitado
                            </span>
                            <strong className="fs-5 mt-1">
                              {formatKg(selectedGenerator.co2)}
                            </strong>
                          </div>
                        </div>

                        <div className="col-6">
                          <div
                            className="card p-3 text-center shadow-sm border-0 h-100"
                            style={{ background: "#FAF5FF" }}
                          >
                            <Clock
                              size={28}
                              className="mx-auto mb-2"
                              color="#7C3AED"
                            />
                            <span className="text-muted small text-uppercase">
                              Tempo estimado
                            </span>
                            <strong className="fs-5 mt-1">
                              {formatMinutes(selectedGenerator.estimatedMinutes)}
                            </strong>
                          </div>
                        </div>

                        <div className="col-12">
                          <div
                            className="card p-3 shadow-sm border-0"
                            style={{ background: "#FFFFFF" }}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <span className="text-muted small text-uppercase">
                                  Prioridade operacional
                                </span>
                                <br />
                                <strong className="fs-6">
                                  {PRIORITY_LABELS[selectedGenerator.priority] ||
                                    "Não definida"}
                                </strong>
                              </div>

                              <div
                                className={`badge ${
                                  PRIORITY_BADGES[selectedGenerator.priority] ||
                                  "bg-secondary"
                                } p-2 px-3`}
                              >
                                {selectedGenerator.priority || "NORMAL"}
                              </div>
                            </div>
                          </div>
                        </div>
                                                <div className="col-12">
                          <div
                            className="card p-3 shadow-sm border-0"
                            style={{ background: "#FAF5FF" }}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="text-muted small">
                                Custo estimado de combustível
                              </span>

                              <strong className="text-primary">
                                {formatCurrency(
                                  selectedGenerator.estimatedFuelCost
                                )}
                              </strong>
                            </div>

                            <div className="d-flex justify-content-between align-items-center mt-2 pt-1 border-top">
                              <span className="text-muted small">
                                Tempo estimado de viagem
                              </span>

                              <strong>
                                {formatMinutes(
                                  selectedGenerator.estimatedMinutes
                                )}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-5 text-muted">
                      <MapPin
                        size={64}
                        strokeWidth={1}
                        className="mb-3 opacity-25"
                      />

                      <p className="mt-2 mb-1 fw-500">
                        Nenhum gerador selecionado
                      </p>

                      <small className="text-muted">
                        Escolha um gerador no menu acima para visualizar seus
                        detalhes operacionais.
                      </small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas e Status de Rotas */}
      <div className="row g-4 mb-4">
        <div className="col-xl-4">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-2 mb-3">
              <AlertTriangle size={22} color="#DC2626" />

              <div>
                <h4 className="fw-600 fs-20 mb-1">Alerta operacional</h4>

                <p className="text-muted mb-0">
                  Pontos que exigem atenção logística.
                </p>
              </div>
            </div>

            {operationalInsights.delayedRoutes.length > 0 ? (
              <div>
                <p className="fw-700 mb-2 text-danger">
                  {operationalInsights.delayedRoutes.length} rota(s) em
                  andamento com tempo estimado acima de 3h.
                </p>

                <small className="text-muted">
                  Reavalie sequência de paradas, veículo disponível e
                  proximidade dos geradores.
                </small>
              </div>
            ) : (
              <div>
                <p className="fw-700 mb-2 text-success">
                  Nenhum alerta crítico identificado.
                </p>

                <small className="text-muted">
                  As rotas calculadas estão dentro da margem operacional
                  esperada.
                </small>
              </div>
            )}

            <hr />

            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted">Velocidade média usada</span>
              <strong>{AVERAGE_SPEED_KMH} km/h</strong>
            </div>

            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted">Consumo estimado</span>
              <strong>{FUEL_CONSUMPTION_KM_PER_LITER} km/L</strong>
            </div>

            <div className="d-flex align-items-center justify-content-between">
              <span className="text-muted">Preço combustível</span>
              <strong>{formatCurrency(FUEL_PRICE_PER_LITER)}</strong>
            </div>
          </div>
        </div>

        <div className="col-xl-8">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-20 mb-3">
              <div>
                <h4 className="fw-600 fs-20 mb-1">Status das rotas</h4>

                <p className="text-muted mb-0">
                  Distribuição operacional das rotas.
                </p>
              </div>

              <BarChart3 size={22} color="#1A7E00" />
            </div>
                        <div style={{ width: "100%", height: 330 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={routeStatusChart}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {routeStatusChart.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Geradores Estratégicos */}
      <div className="row g-4 mb-4">
        <div className="col-xl-12">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-20 mb-3">
              <div>
                <h4 className="fw-600 fs-20 mb-1">
                  Geradores estratégicos
                </h4>

                <p className="text-muted mb-0">
                  Priorização operacional por volume, distância, recorrência e
                  impacto ambiental.
                </p>
              </div>

              <MapPin size={22} color="#1A7E00" />
            </div>

            {strategicGenerators.length ? (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Gerador</th>
                      <th>Endereço</th>
                      <th>Coletas</th>
                      <th>Volume</th>
                      <th>CO₂ evitado</th>
                      <th>Distância</th>
                      <th>Prioridade</th>
                    </tr>
                  </thead>

                  <tbody>
                    {strategicGenerators.slice(0, 8).map((generator) => (
                      <tr key={generator.id || generator.name}>
                        <td>
                          <strong>{generator.name}</strong>
                          <br />
                          <small className="text-muted">
                            {generator.latitude && generator.longitude
                              ? `${generator.latitude}, ${generator.longitude}`
                              : "Sem coordenadas"}
                          </small>
                        </td>

                        <td style={{ minWidth: 220 }}>{generator.address}</td>

                        <td>{generator.coletas}</td>

                        <td>{formatKg(generator.kg)}</td>

                        <td>{formatKg(generator.co2)}</td>

                        <td>{formatKm(generator.distanceKm)}</td>

                        <td>
                          <span
                            className={`badge ${
                              PRIORITY_BADGES[generator.priority]
                            }`}
                          >
                            {PRIORITY_LABELS[generator.priority]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Nenhum gerador estratégico encontrado"
                description="Quando houver coletas vinculadas a geradores, o painel calculará prioridade, volume, impacto ambiental e distância."
              />
            )}
          </div>
        </div>
      </div>
            {/* Tabela de Rotas Estratégicas */}
      <div className="row g-4 mb-4">
        <div className="col-xl-12">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-20 mb-3">
              <div>
                <h4 className="fw-600 fs-20 mb-1">Rotas estratégicas</h4>

                <p className="text-muted mb-0">
                  Estimativa de distância, tempo e consumo por rota operacional.
                </p>
              </div>

              <Route size={22} color="#1A7E00" />
            </div>

            {strategicRoutes.length ? (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Rota</th>
                      <th>Motorista</th>
                      <th>Veículo</th>
                      <th>Paradas</th>
                      <th>Status</th>
                      <th>Distância</th>
                      <th>Tempo</th>
                      <th>Combustível</th>
                      <th>Custo</th>
                    </tr>
                  </thead>

                  <tbody>
                    {strategicRoutes.slice(0, 10).map((routeItem, index) => (
                      <tr key={routeItem.id || index}>
                        <td>
                          <strong>
                            {routeItem.name ||
                              routeItem.title ||
                              routeItem.description ||
                              `Rota ${index + 1}`}
                          </strong>
                        </td>

                        <td>{routeItem.driverName}</td>

                        <td>{routeItem.vehicleName}</td>

                        <td>{routeItem.stops}</td>

                        <td>
                          <span className="badge bg-light text-dark">
                            {ROUTE_STATUS_LABELS[routeItem.status] ||
                              routeItem.status ||
                              "Sem status"}
                          </span>
                        </td>

                        <td>{formatKm(routeItem.distanceKm)}</td>

                        <td>{formatMinutes(routeItem.estimatedMinutes)}</td>

                        <td>{formatLiters(routeItem.estimatedFuel)}</td>

                        <td>{formatCurrency(routeItem.estimatedFuelCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Nenhuma rota estratégica encontrada"
                description="Cadastre rotas com coletas vinculadas para visualizar distância, tempo e consumo estimado."
              />
            )}
          </div>
        </div>
      </div>

      {/* Tabela Operacional Estratégica */}
      <div className="row g-4 mb-4">
        <div className="col-xl-12">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-20 mb-3">
              <div>
                <h4 className="fw-600 fs-20 mb-1">
                  Tabela operacional estratégica
                </h4>

                <p className="text-muted mb-0">
                  Cruzamento entre geradores, rotas, motoristas, veículos,
                  custos logísticos e prioridade ambiental.
                </p>
              </div>

              <Clock size={22} color="#1A7E00" />
            </div>

            {operationalRows.length ? (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Gerador</th>
                      <th>Rota</th>
                      <th>Veículo</th>
                      <th>Motorista</th>
                      <th>Distância</th>
                      <th>Combustível</th>
                      <th>Tempo estimado</th>
                      <th>Prioridade</th>
                    </tr>
                  </thead>

                  <tbody>
                    {operationalRows.slice(0, 12).map((row) => (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.generatorName}</strong>
                        </td>

                        <td>{row.routeName}</td>

                        <td>{row.vehicleName}</td>

                        <td>{row.driverName}</td>

                        <td>{formatKm(row.distanceKm)}</td>

                        <td>{formatLiters(row.estimatedFuel)}</td>

                        <td>{formatMinutes(row.estimatedMinutes)}</td>

                        <td>
                          <span
                            className={`badge ${
                              PRIORITY_BADGES[row.priority]
                            }`}
                          >
                            {PRIORITY_LABELS[row.priority]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Tabela operacional sem dados"
                description="As informações aparecerão quando existirem coletas com geradores vinculados."
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AnalyticsDashboard;