import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MapPin,
  PackageCheck,
  Recycle,
  RefreshCcw,
  Route,
  Scale,
  Sparkles,
  Truck,
  Warehouse,
} from "lucide-react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import moment from "moment";

import HeadTags from "../components/HeadTags";
import TopProgressBar from "../components/TopProgressBar";
import { apiRequest } from "../services/apiClient";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const DEFAULT_CENTER = {
  lat: -3.7319,
  lng: -38.5267,
};

const MATERIAL_COLORS = [
  "#028C56",
  "#10B981",
  "#34D399",
  "#6EE7B7",
  "#047857",
  "#059669",
  "#065F46",
  "#22C55E",
];

const COLLECTION_OPERATIONAL_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COLLECTED",
  "RECEIVED",
  "SORTING",
  "COMPLETED",
  "CANCELLED",
];

const REALIZED_COLLECTION_STATUSES = [
  "COLLECTED",
  "RECEIVED",
  "SORTING",
  "COMPLETED",
];

const getArray = (response, keys = []) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;

  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
    if (Array.isArray(response?.data?.[key])) return response.data[key];
  }

  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data?.items)) return response.data.items;

  return [];
};

const normalizeText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value, maximumFractionDigits = 2) => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(normalizeNumber(value));
};

const formatWeight = (value) => `${formatNumber(value, 2)} kg`;

const UNIT_LABELS = {
  KG: "kg",
  TON: "t",
  UNIT: "un.",
  LITER: "L",
  CUBIC_METER: "m³",
};

const formatQuantity = (quantity, unit) => {
  const normalizedUnit = normalizeText(unit).toUpperCase() || "KG";
  return `${formatNumber(quantity, 3)} ${UNIT_LABELS[normalizedUnit] || normalizedUnit.toLowerCase()}`;
};

const isSameDay = (value, reference = new Date()) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
};

const getCollectionStatusLabel = (status) => {
  const labels = {
    PENDING: "Pendente",
    IN_PROGRESS: "Em campo",
    COLLECTED: "Coletada",
    RECEIVED: "Recebida",
    SORTING: "Em triagem",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
  };

  return labels[status] || status || "Não informado";
};

const getCollectionStatusClass = (status) => {
  const classes = {
    PENDING: "warning",
    IN_PROGRESS: "info",
    COLLECTED: "primary",
    RECEIVED: "secondary",
    SORTING: "warning",
    COMPLETED: "success",
    CANCELLED: "danger",
  };

  return classes[status] || "secondary";
};

const getScheduleStatusLabel = (status) => {
  const labels = {
    REQUESTED: "Solicitada",
    SCHEDULED: "Agendada",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
    PENDING: "Pendente",
  };

  return labels[status] || status || "Não informado";
};

const getEntryStatus = (entry) =>
  normalizeText(entry?.status || entry?.destinationStatus).toUpperCase() ||
  "PENDING_DESTINATION";

const getEntryRemainingQuantity = (entry) => {
  const explicit =
    entry?.remainingQuantity ??
    entry?.availableQuantity ??
    entry?.balanceQuantity;

  if (explicit !== undefined && explicit !== null) {
    return Math.max(normalizeNumber(explicit), 0);
  }

  const total = normalizeNumber(
    entry?.quantity ??
      entry?.totalQuantity ??
      entry?.collectedQuantity ??
      entry?.originalQuantity ??
      entry?.collectionMaterial?.quantity ??
      entry?.collectionMaterial?.quantityKg
  );

  const destined = normalizeNumber(
    entry?.destinedQuantity ??
      entry?.allocatedQuantity ??
      entry?.processedQuantity ??
      entry?.totalDestinedQuantity
  );

  return Math.max(total - destined, 0);
};

const getEntryUnit = (entry) =>
  normalizeText(
    entry?.unit || entry?.collectionMaterial?.unit || entry?.wasteType?.unit
  ).toUpperCase() || "KG";


const convertToKg = (quantity, unit) => {
  if (unit === "TON") return quantity * 1000;
  if (unit === "KG") return quantity;
  return 0;
};

const getMaterialName = (material) => {
  return (
    normalizeText(
      material?.materialNameSnapshot ||
        material?.nameSnapshot ||
        material?.wasteType?.name ||
        material?.materialType?.name ||
        material?.name ||
        material?.type ||
        material?.wasteName
    ) || "Não informado"
  );
};

const getMaterialUnit = (material) =>
  normalizeText(material?.unit || material?.wasteType?.unit).toUpperCase() ||
  "KG";

const getMaterialQuantity = (material) => {
  return normalizeNumber(
    material?.quantityKg ??
      material?.weightKg ??
      material?.quantity ??
      material?.totalKg ??
      material?.collectedQuantity ??
      material?.originalQuantity
  );
};

const parseMaterials = (value) => {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const getCollectionMaterials = (collection) => {
  const candidates = [
    collection?.collectionWasteEntries,
    collection?.wasteEntries,
    collection?.collectionMaterials,
    collection?.materials,
  ];

  for (const candidate of candidates) {
    const materials = parseMaterials(candidate);
    if (materials.length > 0) return materials;
  }

  return [];
};

const getCollectionWeight = (collection) => {
  const directWeight = normalizeNumber(collection?.totalWeightKg);
  if (directWeight > 0) return directWeight;

  return getCollectionMaterials(collection).reduce((total, material) => {
    const quantity = getMaterialQuantity(material);
    const unit = getMaterialUnit(material);
    return total + convertToKg(quantity, unit);
  }, 0);
};

const buildMaterialStats = ({ entries = [], collections = [] }) => {
  const sourceMaterials = entries.length > 0
    ? entries
    : collections.flatMap((collection) => getCollectionMaterials(collection));

  const totals = new Map();

  sourceMaterials.forEach((material) => {
    const name = getMaterialName(material);
    const quantity = getMaterialQuantity(material);
    const unit = getMaterialUnit(material);

    if (!name || quantity <= 0) return;

    const key = `${name}::${unit}`;
    const current = totals.get(key) || { name, unit, quantity: 0 };
    current.quantity += quantity;
    totals.set(key, current);
  });

  const items = Array.from(totals.values())
    .map((item, index) => ({
      ...item,
      quantityKg: convertToKg(item.quantity, item.unit),
      color: MATERIAL_COLORS[index % MATERIAL_COLORS.length],
    }))
    .sort((first, second) => {
      if (first.unit === second.unit) return second.quantity - first.quantity;
      if (["KG", "TON"].includes(first.unit)) return -1;
      if (["KG", "TON"].includes(second.unit)) return 1;
      return first.name.localeCompare(second.name, "pt-BR");
    });

  return {
    weightItems: items.filter((item) => item.quantityKg > 0),
    otherItems: items.filter((item) => item.quantityKg <= 0),
    allItems: items,
  };
};

const getEntryCollectionId = (entry) =>
  normalizeText(
    entry?.collectionId ||
      entry?.collection?.id ||
      entry?.collectionMaterial?.collectionId ||
      entry?.collectionMaterial?.collection?.id
  );

const buildEntriesByCollection = (entries) => {
  const map = new Map();

  entries.forEach((entry) => {
    const collectionId = getEntryCollectionId(entry);
    if (!collectionId) return;

    const current = map.get(collectionId) || [];
    current.push(entry);
    map.set(collectionId, current);
  });

  return map;
};

const getCollectionQuantitySummary = (collection, entriesByCollection) => {
  const collectionId = normalizeText(collection?.id);
  const entries = collectionId ? entriesByCollection.get(collectionId) || [] : [];
  const sourceMaterials = entries.length > 0 ? entries : getCollectionMaterials(collection);
  const totals = new Map();

  sourceMaterials.forEach((material) => {
    const quantity = getMaterialQuantity(material);
    const unit = getMaterialUnit(material);
    if (quantity <= 0) return;
    totals.set(unit, (totals.get(unit) || 0) + quantity);
  });

  if (totals.size === 0) {
    const weight = getCollectionWeight(collection);
    return weight > 0 ? [formatWeight(weight)] : ["Quantidade não informada"];
  }

  return Array.from(totals.entries()).map(([unit, quantity]) =>
    formatQuantity(quantity, unit)
  );
};

const getGeneratorName = (collection) => {
  const generator = collection?.generator || collection?.schedule?.generator || {};

  return (
    generator?.companyName ||
    generator?.tradeName ||
    generator?.name ||
    generator?.user?.name ||
    "Gerador não informado"
  );
};

const getResponsibleName = (collection) => {
  return (
    collection?.collector?.name ||
    collection?.collector?.user?.name ||
    collection?.driver?.name ||
    collection?.driver?.user?.name ||
    "Não informado"
  );
};

const getRouteName = (collection) => {
  return collection?.route?.name || collection?.route?.code || "Sem rota";
};

const getCollectionDate = (collection) => {
  return (
    collection?.collectedAt ||
    collection?.completedAt ||
    collection?.receivedAt ||
    collection?.sortingStartedAt ||
    collection?.scheduledDate ||
    collection?.createdAt ||
    null
  );
};

const getScheduleDate = (schedule) => {
  return (
    schedule?.scheduledDate ||
    schedule?.preferredDate ||
    schedule?.collectionDate ||
    schedule?.createdAt ||
    null
  );
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

const loadGoogleMapsScript = () => {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve(window.google.maps);
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      reject(new Error("VITE_GOOGLE_MAPS_API_KEY não configurada."));
      return;
    }

    const existingScript = document.getElementById("google-maps-script");

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google.maps));
      existingScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

const DashboardStyles = () => (
  <style>{`
    .katua-dashboard {
      --katua-green: #028C56;
      --katua-green-dark: #047857;
      --katua-green-soft: #ECFDF5;
      --katua-bg: #F8FAFC;
      --katua-border: #E5E7EB;
      --katua-text: #111827;
      --katua-muted: #64748B;
      padding: 0 8px 32px;
    }

    .katua-dashboard .dashboard-hero {
      background: linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%);
      border: 1px solid var(--katua-border);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 12px 35px rgba(15, 23, 42, 0.05);
    }

    .katua-dashboard .dashboard-card {
      background: #FFFFFF;
      border: 1px solid var(--katua-border);
      border-radius: 18px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.045);
    }

    .katua-dashboard .metric-card {
      position: relative;
      overflow: hidden;
      min-height: 158px;
      padding: 20px;
      transition: transform 160ms ease, box-shadow 160ms ease;
    }

    .katua-dashboard .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
    }

    .katua-dashboard .metric-card::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 4px;
      background: var(--metric-color, var(--katua-green));
    }

    .katua-dashboard .metric-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--metric-soft, var(--katua-green-soft));
      color: var(--metric-color, var(--katua-green));
    }

    .katua-dashboard .metric-value {
      font-size: clamp(1.7rem, 2.2vw, 2.3rem);
      line-height: 1;
      font-weight: 800;
      color: var(--katua-text);
    }

    .katua-dashboard .section-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--katua-text);
    }

    .katua-dashboard .section-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--katua-green);
      background: var(--katua-green-soft);
    }

    .katua-dashboard .alert-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #EEF2F7;
    }

    .katua-dashboard .alert-row:last-child {
      border-bottom: 0;
    }

    .katua-dashboard .operation-item {
      padding: 14px;
      border: 1px solid #E8EDF3;
      border-radius: 14px;
      background: #FBFDFC;
    }

    .katua-dashboard .flow-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 13px 0;
      border-bottom: 1px solid #EEF2F7;
    }

    .katua-dashboard .flow-item:last-child {
      border-bottom: 0;
    }

    .katua-dashboard .map-shell {
      width: 100%;
      height: 360px;
      border-radius: 15px;
      overflow: hidden;
      border: 1px solid #E5E7EB;
      background: #F3F4F6;
    }

    .katua-dashboard .materials-chart {
      max-width: 240px;
      margin: 0 auto;
    }

    .katua-dashboard .quick-link {
      color: var(--katua-green);
      font-weight: 700;
      text-decoration: none;
    }

    .katua-dashboard .quick-link:hover {
      color: var(--katua-green-dark);
    }

    .katua-dashboard .table thead th {
      color: #64748B;
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.025em;
      white-space: nowrap;
      border-bottom: 1px solid #E5E7EB;
    }

    .katua-dashboard .table tbody td {
      vertical-align: middle;
      border-bottom-color: #EEF2F7;
    }

    .katua-dashboard .katua-spin {
      animation: katua-dashboard-spin 0.8s linear infinite;
    }

    @keyframes katua-dashboard-spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 767.98px) {
      .katua-dashboard {
        padding-inline: 0;
      }

      .katua-dashboard .dashboard-hero {
        padding: 18px;
      }

      .katua-dashboard .map-shell {
        height: 300px;
      }
    }
  `}</style>
);

const MetricCard = ({
  icon,
  title,
  value,
  subtitle,
  link,
  linkLabel,
  color = "#028C56",
  softColor = "#ECFDF5",
}) => (
  <div
    className="dashboard-card metric-card h-100"
    style={{
      "--metric-color": color,
      "--metric-soft": softColor,
    }}
  >
    <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
      <div>
        <span className="text-muted small fw-semibold d-block mb-2">{title}</span>
        <div className="metric-value">{value}</div>
      </div>

      <div className="metric-icon">
        {createElement(icon, { size: 21, "aria-hidden": true })}
      </div>
    </div>

    <div className="d-flex align-items-end justify-content-between gap-3">
      <span className="text-muted small">{subtitle}</span>

      <Link className="quick-link d-inline-flex align-items-center gap-1" to={link}>
        {linkLabel}
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </div>
  </div>
);

const SectionHeader = ({ icon, title, subtitle, action }) => (
  <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
    <div className="d-flex align-items-start gap-3">
      <div className="section-icon flex-shrink-0">
        {createElement(icon, { size: 20, "aria-hidden": true })}
      </div>

      <div>
        <h2 className="section-title mb-1">{title}</h2>
        {subtitle && <p className="text-muted small mb-0">{subtitle}</p>}
      </div>
    </div>

    {action}
  </div>
);

const MaterialsDonut = ({ data = [], otherData = [] }) => {
  const [hovered, setHovered] = useState(null);
  const total = data.reduce((sum, item) => sum + item.quantityKg, 0);
  const hasAnyMaterial = data.length > 0 || otherData.length > 0;

  if (!hasAnyMaterial) {
    return (
      <div className="text-center py-5 px-3 bg-light rounded-4 border">
        <Recycle size={34} className="text-muted mb-3" aria-hidden="true" />
        <h6 className="mb-1">Nenhum material no período</h6>
        <p className="text-muted small mb-0">
          Os materiais aparecerão após o registro das coletas.
        </p>
      </div>
    );
  }

  let currentAngle = 0;

  const polarToCartesian = (cx, cy, radius, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(angleInRadians),
      y: cy + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (cx, cy, radius, startAngle, endAngle) => {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      `M ${cx} ${cy}`,
      `L ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
      "Z",
    ].join(" ");
  };

  return (
    <div className="row g-4 align-items-center">
      <div className="col-md-5">
        {total > 0 ? (
          <div className="materials-chart position-relative">
            <svg viewBox="0 0 220 220" width="100%" role="img">
              {data.map((item) => {
                const angle = (item.quantityKg / total) * 360;
                const startAngle = currentAngle;
                const endAngle = currentAngle + angle;
                currentAngle = endAngle;

                return (
                  <path
                    key={`${item.name}-${item.unit}`}
                    d={describeArc(110, 110, 95, startAngle, endAngle)}
                    fill={item.color}
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHovered(item)}
                    onMouseLeave={() => setHovered(null)}
                  />
                );
              })}

              <circle cx="110" cy="110" r="55" fill="#FFFFFF" />
              <text
                x="110"
                y="104"
                textAnchor="middle"
                style={{ fontSize: 17, fontWeight: 800, fill: "#028C56" }}
              >
                {formatNumber(total, 1)}
              </text>
              <text
                x="110"
                y="126"
                textAnchor="middle"
                style={{ fontSize: 12, fontWeight: 700, fill: "#64748B" }}
              >
                kg
              </text>
            </svg>

            {hovered && (
              <div
                className="position-absolute start-50 translate-middle-x bg-dark text-white rounded-3 px-3 py-2 small fw-semibold"
                style={{ bottom: 6, whiteSpace: "nowrap" }}
              >
                {hovered.name}: {formatQuantity(hovered.quantity, hovered.unit)}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 px-3 bg-light rounded-4 border">
            <PackageCheck size={34} className="text-success mb-3" aria-hidden="true" />
            <h6 className="mb-1">Materiais registrados</h6>
            <p className="text-muted small mb-0">
              Há materiais contabilizados em unidades diferentes de peso.
            </p>
          </div>
        )}
      </div>

      <div className="col-md-7">
        {[...data, ...otherData].slice(0, 10).map((item) => (
          <div
            key={`${item.name}-${item.unit}`}
            className="d-flex align-items-center justify-content-between gap-3 mb-3"
          >
            <div className="d-flex align-items-center gap-2 min-w-0">
              <span
                className="flex-shrink-0"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: item.color,
                }}
              />
              <span className="fw-semibold text-truncate">{item.name}</span>
            </div>
            <span className="text-muted small fw-semibold">
              {formatQuantity(item.quantity, item.unit)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const GeneratorsMap = ({ generators }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let mounted = true;

    const initOrUpdateMap = async () => {
      try {
        setMapError("");
        const maps = await loadGoogleMapsScript();
        if (!mounted || !mapRef.current) return;

        const validGenerators = generators.filter(
          (generator) =>
            Number.isFinite(Number(generator?.latitude)) &&
            Number.isFinite(Number(generator?.longitude)) &&
            Number(generator?.latitude) !== 0 &&
            Number(generator?.longitude) !== 0
        );

        const center = validGenerators.length
          ? {
              lat: Number(validGenerators[0].latitude),
              lng: Number(validGenerators[0].longitude),
            }
          : DEFAULT_CENTER;

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new maps.Map(mapRef.current, {
            center,
            zoom: validGenerators.length ? 12 : 11,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
        }

        const map = mapInstanceRef.current;
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        if (!validGenerators.length) {
          map.setCenter(DEFAULT_CENTER);
          map.setZoom(11);
          return;
        }

        const bounds = new maps.LatLngBounds();

        validGenerators.forEach((generator) => {
          const position = {
            lat: Number(generator.latitude),
            lng: Number(generator.longitude),
          };

          const generatorName =
            generator?.companyName ||
            generator?.tradeName ||
            generator?.name ||
            "Gerador";

          const marker = new maps.Marker({
            position,
            map,
            title: generatorName,
          });

          const infoWindow = new maps.InfoWindow({
            content: `
              <div style="font-family: Arial, sans-serif; max-width: 240px; padding: 3px;">
                <strong style="display:block;margin-bottom:4px;">${generatorName}</strong>
                <span>${generator?.email || ""}</span><br />
                <span>${generator?.city || ""}${generator?.state ? `/${generator.state}` : ""}</span>
              </div>
            `,
          });

          marker.addListener("click", () => infoWindow.open(map, marker));
          markersRef.current.push(marker);
          bounds.extend(position);
        });

        map.fitBounds(bounds);
      } catch (error) {
        console.error("Erro ao carregar mapa:", error);
        if (mounted) {
          setMapError(
            error?.message || "Não foi possível carregar o mapa operacional."
          );
        }
      }
    };

    initOrUpdateMap();

    return () => {
      mounted = false;
    };
  }, [generators]);

  if (mapError) {
    return (
      <div className="map-shell d-flex flex-column align-items-center justify-content-center text-center px-4">
        <MapPin size={34} className="text-muted mb-3" aria-hidden="true" />
        <h6 className="mb-1">Mapa indisponível</h6>
        <p className="text-muted small mb-0">{mapError}</p>
      </div>
    );
  }

  return <div ref={mapRef} className="map-shell" />;
};

const Dashboard = () => {
  const [data, setData] = useState({
    collections: [],
    generators: [],
    schedules: [],
    entries: [],
    profile: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [receivingCollectionId, setReceivingCollectionId] = useState("");

  const loadDashboard = useCallback(async ({ manual = false } = {}) => {
    try {
      manual ? setRefreshing(true) : setLoading(true);
      setError("");

      const [collectionsRes, generatorsRes, schedulesRes, entriesRes, profileRes] =
        await Promise.allSettled([
          apiRequest("/collections"),
          apiRequest("/generators"),
          apiRequest("/schedules"),
          apiRequest("/collection-entries?limit=200&sortBy=createdAt&sortOrder=desc"),
          apiRequest("/auth/me"),
        ]);

      const nextData = {
        collections:
          collectionsRes.status === "fulfilled"
            ? getArray(collectionsRes.value, ["collections"])
            : [],
        generators:
          generatorsRes.status === "fulfilled"
            ? getArray(generatorsRes.value, ["generators"])
            : [],
        schedules:
          schedulesRes.status === "fulfilled"
            ? getArray(schedulesRes.value, ["schedules"])
            : [],
        entries:
          entriesRes.status === "fulfilled"
            ? getArray(entriesRes.value, ["entries"])
            : [],
        profile:
          profileRes.status === "fulfilled"
            ? profileRes.value?.data || profileRes.value
            : null,
      };

      setData(nextData);
      setLastUpdatedAt(new Date());

      const failedRequests = [
        collectionsRes,
        generatorsRes,
        schedulesRes,
        entriesRes,
      ].filter((result) => result.status === "rejected");

      if (failedRequests.length === 4) {
        setError("Não foi possível carregar os dados do painel.");
      } else if (failedRequests.length > 0) {
        setError(
          "Algumas informações não puderam ser carregadas. Os demais indicadores continuam disponíveis."
        );
      }
    } catch (requestError) {
      console.error("Erro ao carregar dashboard:", requestError);
      setError(
        requestError?.message || "Não foi possível carregar os dados do painel."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);


  const handleReceiveCollection = useCallback(
    async (collection) => {
      const collectionId = normalizeText(collection?.id);

      if (!collectionId) {
        setError("Não foi possível identificar a coleta para recebimento.");
        return;
      }

      const generatorName =
        normalizeText(collection?.generator?.companyName) ||
        normalizeText(collection?.generator?.tradeName) ||
        normalizeText(collection?.generator?.name) ||
        normalizeText(collection?.schedule?.generator?.companyName) ||
        normalizeText(collection?.schedule?.generator?.name) ||
        "o gerador informado";

      const confirmed = window.confirm(
        `Confirmar o recebimento da coleta de ${generatorName}?`
      );

      if (!confirmed) {
        return;
      }

      try {
        setReceivingCollectionId(collectionId);
        setError("");

        await apiRequest(`/collections/${encodeURIComponent(collectionId)}/receive`, {
          method: "POST",
          body: {},
        });

        await loadDashboard({ manual: true });
      } catch (requestError) {
        setError(
          requestError?.response?.data?.error ||
            requestError?.response?.data?.message ||
            requestError?.data?.error ||
            requestError?.data?.message ||
            requestError?.error ||
            requestError?.message ||
            "Não foi possível registrar o recebimento da coleta."
        );
      } finally {
        setReceivingCollectionId("");
      }
    },
    [loadDashboard]
  );

  const stats = useMemo(() => {
    const now = new Date();

    const requestedSchedules = data.schedules.filter((schedule) =>
      ["REQUESTED", "PENDING"].includes(
        normalizeText(schedule?.status).toUpperCase()
      )
    );

    const scheduledToday = data.schedules.filter((schedule) => {
      const status = normalizeText(schedule?.status).toUpperCase();
      return status === "SCHEDULED" && isSameDay(getScheduleDate(schedule), now);
    });

    const inProgressCollections = data.collections.filter(
      (collection) =>
        normalizeText(collection?.status).toUpperCase() === "IN_PROGRESS"
    );

    const awaitingReceiptCollections = data.collections.filter(
      (collection) =>
        normalizeText(collection?.status).toUpperCase() === "COLLECTED"
    );

    const sortingCollections = data.collections.filter(
      (collection) =>
        normalizeText(collection?.status).toUpperCase() === "SORTING"
    );

    const receivedCollections = data.collections.filter(
      (collection) =>
        normalizeText(collection?.status).toUpperCase() === "RECEIVED"
    );

    const completedCollections = data.collections.filter(
      (collection) =>
        normalizeText(collection?.status).toUpperCase() === "COMPLETED"
    );

    const realizedCollections = data.collections.filter((collection) =>
      REALIZED_COLLECTION_STATUSES.includes(
        normalizeText(collection?.status).toUpperCase()
      )
    );

    const pendingDestinationEntries = data.entries.filter((entry) => {
      const status = getEntryStatus(entry);
      return (
        getEntryRemainingQuantity(entry) > 0 &&
        !["FULLY_DESTINED", "CANCELLED"].includes(status)
      );
    });

    const pendingDestinationWeightKg = pendingDestinationEntries.reduce(
      (total, entry) => {
        const quantity = getEntryRemainingQuantity(entry);
        const unit = getEntryUnit(entry);
        return total + convertToKg(quantity, unit);
      },
      0
    );

    const totalCollectedKg = realizedCollections.reduce(
      (total, collection) => total + getCollectionWeight(collection),
      0
    );

    const mappedGenerators = data.generators.filter(
      (generator) =>
        Number.isFinite(Number(generator?.latitude)) &&
        Number.isFinite(Number(generator?.longitude)) &&
        Number(generator?.latitude) !== 0 &&
        Number(generator?.longitude) !== 0
    );

    const todayCollections = data.collections
      .filter((collection) => isSameDay(getCollectionDate(collection), now))
      .sort(
        (first, second) =>
          new Date(getCollectionDate(first) || 0).getTime() -
          new Date(getCollectionDate(second) || 0).getTime()
      );

    const entriesByCollection = buildEntriesByCollection(data.entries);

    const recentCollections = [...data.collections]
      .sort(
        (first, second) =>
          new Date(getCollectionDate(second) || 0).getTime() -
          new Date(getCollectionDate(first) || 0).getTime()
      )
      .slice(0, 10);

    return {
      requestedSchedules,
      scheduledToday,
      inProgressCollections,
      awaitingReceiptCollections,
      sortingCollections,
      receivedCollections,
      completedCollections,
      realizedCollections,
      pendingDestinationEntries,
      pendingDestinationWeightKg,
      totalCollectedKg,
      mappedGenerators,
      todayCollections,
      recentCollections,
      entriesByCollection,
      materialStats: buildMaterialStats({
        entries: data.entries,
        collections: realizedCollections,
      }),
    };
  }, [data]);

  const alerts = useMemo(() => {
    const items = [];

    if (stats.requestedSchedules.length > 0) {
      items.push({
        icon: ClipboardCheck,
        title: `${stats.requestedSchedules.length} solicitação(ões) aguardando análise`,
        description: "Revise e programe as novas solicitações de coleta.",
        link: "/collection-requests",
        label: "Analisar",
        color: "#D97706",
      });
    }

    if (stats.awaitingReceiptCollections.length > 0) {
      items.push({
        icon: Truck,
        title: `${stats.awaitingReceiptCollections.length} coleta(s) aguardando recebimento`,
        description: "Confirme a chegada dos materiais à cooperativa.",
        onClick: () =>
          handleReceiveCollection(
            stats.awaitingReceiptCollections[0]
          ),
        label:
          receivingCollectionId
            ? "Recebendo..."
            : "Receber",
        disabled: Boolean(receivingCollectionId),
        color: "#2563EB",
      });
    }

    if (stats.pendingDestinationEntries.length > 0) {
      items.push({
        icon: Warehouse,
        title: `${stats.pendingDestinationEntries.length} entrada(s) com saldo sem destinação`,
        description: `${formatWeight(
          stats.pendingDestinationWeightKg
        )} aguardam estoque, triagem ou outra destinação.`,
        link: "/collected-waste",
        label: "Gerenciar",
        color: "#028C56",
      });
    }

    if (stats.sortingCollections.length > 0) {
      items.push({
        icon: Recycle,
        title: `${stats.sortingCollections.length} coleta(s) em triagem`,
        description: "Acompanhe a classificação e a preparação dos materiais.",
        link: "/collected-waste",
        label: "Acompanhar",
        color: "#7C3AED",
      });
    }

    return items;
  }, [
    stats,
    handleReceiveCollection,
    receivingCollectionId,
  ]);

  const cooperativeName = useMemo(() => {
    const profile = data.profile || {};
    const user = profile?.user || profile;
    const cooperative =
      profile?.cooperative ||
      user?.cooperative ||
      profile?.organization ||
      user?.organization ||
      {};

    return (
      cooperative?.companyName ||
      cooperative?.tradeName ||
      cooperative?.name ||
      profile?.cooperativeName ||
      user?.cooperativeName ||
      user?.companyName ||
      "Painel KATUÁ"
    );
  }, [data.profile]);

  const todayDateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <>
      <HeadTags title="Painel Administrativo" />
      <TopProgressBar loading={loading || refreshing} />
      <DashboardStyles />

      <main className="katua-dashboard">
        <section className="dashboard-hero mb-4">
          <div className="d-flex align-items-start justify-content-between flex-wrap gap-4">
            <div>
              <div className="d-inline-flex align-items-center gap-2 text-success fw-semibold small mb-2">
                <Sparkles size={16} aria-hidden="true" />
                Centro operacional da cooperativa
              </div>

              <h1 className="fs-3 fw-bold mb-2">{getGreeting()}! {cooperativeName}</h1>
              <p className="text-muted mb-2 text-capitalize">{todayDateLabel}</p>
              <p className="text-muted mb-0">
                Acompanhe solicitações, coletas, recebimentos e a movimentação dos resíduos.
              </p>
            </div>

            <div className="d-flex flex-column align-items-md-end gap-2">
              <button
                type="button"
                className="btn btn-outline-success d-inline-flex align-items-center gap-2"
                disabled={refreshing}
                onClick={() => loadDashboard({ manual: true })}
              >
                <RefreshCcw
                  size={17}
                  className={refreshing ? "katua-spin" : ""}
                  aria-hidden="true"
                />
                {refreshing ? "Atualizando..." : "Atualizar dados"}
              </button>

              <span className="text-muted small">
                Última atualização: {lastUpdatedAt ? moment(lastUpdatedAt).format("HH:mm") : "--:--"}
              </span>
            </div>
          </div>
        </section>

        {error && (
          <div className="alert alert-warning d-flex align-items-start gap-2 mb-4" role="alert">
            <AlertTriangle size={19} className="flex-shrink-0 mt-1" aria-hidden="true" />
            <div>{error}</div>
          </div>
        )}

        <section className="row g-4 mb-4">
          <div className="col-sm-6 col-xl-3">
            <MetricCard
              icon={ClipboardCheck}
              title="Solicitações pendentes"
              value={stats.requestedSchedules.length}
              subtitle="Aguardando análise da cooperativa"
              link="/collection-requests"
              linkLabel="Analisar"
              color="#D97706"
              softColor="#FFFBEB"
            />
          </div>

          <div className="col-sm-6 col-xl-3">
            <MetricCard
              icon={Activity}
              title="Operações em campo"
              value={stats.inProgressCollections.length}
              subtitle={`${stats.scheduledToday.length} programada(s) para hoje`}
              link="/waste-list"
              linkLabel="Acompanhar"
              color="#028C56"
              softColor="#ECFDF5"
            />
          </div>

          <div className="col-sm-6 col-xl-3">
            <MetricCard
              icon={Truck}
              title="Aguardando recebimento"
              value={stats.awaitingReceiptCollections.length}
              subtitle="Coletas finalizadas em campo"
              link="/waste-list"
              linkLabel="Receber"
              color="#2563EB"
              softColor="#EFF6FF"
            />
          </div>

          <div className="col-sm-6 col-xl-3">
            <MetricCard
              icon={Warehouse}
              title="Aguardando destinação"
              value={stats.pendingDestinationEntries.length}
              subtitle={`${formatWeight(stats.pendingDestinationWeightKg)} em saldo disponível`}
              link="/collected-waste"
              linkLabel="Gerenciar"
              color="#7C3AED"
              softColor="#F5F3FF"
            />
          </div>
        </section>

        <section className="dashboard-card p-4 mb-4">
          <SectionHeader
            icon={AlertTriangle}
            title="Atenção necessária"
            subtitle="Pendências que merecem acompanhamento da administração."
          />

          {alerts.length === 0 ? (
            <div className="d-flex align-items-center gap-3 rounded-4 bg-success-subtle p-3">
              <CheckCircle2 size={24} className="text-success flex-shrink-0" aria-hidden="true" />
              <div>
                <strong className="d-block">Operação sem pendências críticas</strong>
                <span className="text-muted small">
                  Não identificamos ações urgentes neste momento.
                </span>
              </div>
            </div>
          ) : (
            alerts.map((alert) => {
              return (
                <div className="alert-row" key={alert.title}>
                  <div
                    className="section-icon flex-shrink-0"
                    style={{ color: alert.color, background: `${alert.color}12` }}
                  >
                    {createElement(alert.icon, { size: 19, "aria-hidden": true })}
                  </div>

                  <div className="flex-grow-1 min-w-0">
                    <strong className="d-block">{alert.title}</strong>
                    <span className="text-muted small">{alert.description}</span>
                  </div>

                  {alert.onClick ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={alert.onClick}
                      disabled={alert.disabled}
                    >
                      {alert.label}
                    </button>
                  ) : (
                    <Link
                      className="btn btn-sm btn-outline-secondary"
                      to={alert.link}
                    >
                      {alert.label}
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </section>

        <section className="row g-4 mb-4">
          <div className="col-xl-7">
            <div className="dashboard-card p-4 h-100">
              <SectionHeader
                icon={CalendarClock}
                title="Operação de hoje"
                subtitle="Programação e movimentações registradas no dia."
                action={
                  <Link className="quick-link" to="/collection-requests">
                    Ver programação
                  </Link>
                }
              />

              {stats.todayCollections.length === 0 && stats.scheduledToday.length === 0 ? (
                <div className="text-center py-5 px-3 rounded-4 bg-light">
                  <CalendarClock size={34} className="text-muted mb-3" aria-hidden="true" />
                  <h6 className="mb-1">Nenhuma operação registrada hoje</h6>
                  <p className="text-muted small mb-0">
                    As coletas programadas e em execução aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="row g-3">
                  {stats.todayCollections.slice(0, 5).map((collection, index) => (
                    <div className="col-12" key={collection?.id || index}>
                      <div className="operation-item d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <div className="d-flex align-items-start gap-3 min-w-0">
                          <div className="section-icon flex-shrink-0">
                            <Route size={19} aria-hidden="true" />
                          </div>

                          <div className="min-w-0">
                            <strong className="d-block text-truncate">
                              {getGeneratorName(collection)}
                            </strong>
                            <span className="text-muted small d-block">
                              {getRouteName(collection)} • {getResponsibleName(collection)}
                            </span>
                            <span className="text-muted small">
                              {getCollectionDate(collection)
                                ? moment(getCollectionDate(collection)).format("HH:mm")
                                : "Horário não informado"}
                            </span>
                          </div>
                        </div>

                        <div className="text-end">
                          <span
                            className={`badge text-bg-${getCollectionStatusClass(
                              collection?.status
                            )} mb-2`}
                          >
                            {getCollectionStatusLabel(collection?.status)}
                          </span>
                          <strong className="d-block small">
                            {formatWeight(getCollectionWeight(collection))}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}

                  {stats.todayCollections.length === 0 &&
                    stats.scheduledToday.slice(0, 5).map((schedule, index) => (
                      <div className="col-12" key={schedule?.id || index}>
                        <div className="operation-item d-flex align-items-center justify-content-between flex-wrap gap-3">
                          <div>
                            <strong className="d-block">
                              {schedule?.generator?.companyName ||
                                schedule?.generator?.name ||
                                "Gerador não informado"}
                            </strong>
                            <span className="text-muted small">
                              Coleta programada para hoje
                            </span>
                          </div>
                          <span className="badge text-bg-primary">
                            {getScheduleStatusLabel(schedule?.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-xl-5">
            <div className="dashboard-card p-4 h-100">
              <SectionHeader
                icon={Recycle}
                title="Fluxo dos resíduos"
                subtitle="Visão rápida das etapas após a coleta."
              />

              <div className="flow-item">
                <div className="d-flex align-items-center gap-3">
                  <Truck size={19} className="text-primary" aria-hidden="true" />
                  <div>
                    <strong className="d-block">Aguardando recebimento</strong>
                    <span className="text-muted small">Coletas concluídas em campo</span>
                  </div>
                </div>
                <strong className="fs-5">{stats.awaitingReceiptCollections.length}</strong>
              </div>

              <div className="flow-item">
                <div className="d-flex align-items-center gap-3">
                  <PackageCheck size={19} className="text-secondary" aria-hidden="true" />
                  <div>
                    <strong className="d-block">Recebidas</strong>
                    <span className="text-muted small">Disponíveis para triagem</span>
                  </div>
                </div>
                <strong className="fs-5">{stats.receivedCollections.length}</strong>
              </div>

              <div className="flow-item">
                <div className="d-flex align-items-center gap-3">
                  <Recycle size={19} className="text-warning" aria-hidden="true" />
                  <div>
                    <strong className="d-block">Em triagem</strong>
                    <span className="text-muted small">Separação e classificação</span>
                  </div>
                </div>
                <strong className="fs-5">{stats.sortingCollections.length}</strong>
              </div>

              <div className="flow-item">
                <div className="d-flex align-items-center gap-3">
                  <Warehouse size={19} className="text-success" aria-hidden="true" />
                  <div>
                    <strong className="d-block">Saldo sem destinação</strong>
                    <span className="text-muted small">
                      {formatWeight(stats.pendingDestinationWeightKg)} disponíveis
                    </span>
                  </div>
                </div>
                <strong className="fs-5">{stats.pendingDestinationEntries.length}</strong>
              </div>

              <div className="rounded-4 bg-success-subtle p-3 mt-4">
                <span className="text-muted small d-block mb-1">Total coletado registrado</span>
                <strong className="fs-4 text-success">
                  {formatWeight(stats.totalCollectedKg)}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section className="row g-4 mb-4">
          <div className="col-xl-7">
            <div className="dashboard-card p-4 h-100">
              <SectionHeader
                icon={MapPin}
                title="Mapa operacional"
                subtitle={`${stats.mappedGenerators.length} de ${data.generators.length} geradores possuem localização.`}
              />

              <div className="row g-3 mb-3">
                <div className="col-4">
                  <div className="rounded-3 bg-light p-3 text-center">
                    <strong className="d-block fs-5">{stats.mappedGenerators.length}</strong>
                    <span className="text-muted small">Mapeados</span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="rounded-3 bg-light p-3 text-center">
                    <strong className="d-block fs-5">{stats.scheduledToday.length}</strong>
                    <span className="text-muted small">Agendadas hoje</span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="rounded-3 bg-light p-3 text-center">
                    <strong className="d-block fs-5">{stats.inProgressCollections.length}</strong>
                    <span className="text-muted small">Em campo</span>
                  </div>
                </div>
              </div>

              <GeneratorsMap generators={data.generators} />
            </div>
          </div>

          <div className="col-xl-5">
            <div className="dashboard-card p-4 h-100">
              <SectionHeader
                icon={Scale}
                title="Materiais coletados"
                subtitle="Distribuição dos materiais registrados nas coletas realizadas."
                action={
                  <Link className="quick-link" to="/collected-waste">
                    Ver resíduos
                  </Link>
                }
              />

              <MaterialsDonut
                data={stats.materialStats.weightItems}
                otherData={stats.materialStats.otherItems}
              />
            </div>
          </div>
        </section>

        <section className="dashboard-card p-4">
          <SectionHeader
            icon={Clock3}
            title="Últimas movimentações operacionais"
            subtitle="Coletas recentes e seus estados no fluxo da cooperativa."
            action={
              <Link className="quick-link" to="/waste-list">
                Ver todas
              </Link>
            }
          />

          <SimpleBar forceVisible="x" autoHide>
            <table className="table align-middle mb-0 nowrap w-100">
              <thead>
                <tr>
                  <th>Gerador</th>
                  <th>Responsável</th>
                  <th>Rota</th>
                  <th>Quantidade</th>
                  <th>Data e hora</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {stats.recentCollections.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      Nenhuma movimentação encontrada.
                    </td>
                  </tr>
                ) : (
                  stats.recentCollections.map((collection, index) => {
                    const date = getCollectionDate(collection);
                    const status = normalizeText(collection?.status).toUpperCase();

                    return (
                      <tr key={collection?.id || index}>
                        <td>
                          <strong>{getGeneratorName(collection)}</strong>
                        </td>
                        <td>{getResponsibleName(collection)}</td>
                        <td>{getRouteName(collection)}</td>
                        <td>
                          <div className="d-flex flex-column gap-1">
                            {getCollectionQuantitySummary(
                              collection,
                              stats.entriesByCollection
                            ).map((quantityLabel) => (
                              <strong key={quantityLabel}>{quantityLabel}</strong>
                            ))}
                          </div>
                        </td>
                        <td>
                          {date ? moment(date).format("DD/MM/YYYY HH:mm") : "Não informada"}
                        </td>
                        <td>
                          <span
                            className={`badge text-bg-${getCollectionStatusClass(status)}`}
                          >
                            {COLLECTION_OPERATIONAL_STATUSES.includes(status)
                              ? getCollectionStatusLabel(status)
                              : status || "Não informado"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </SimpleBar>
        </section>
      </main>
    </>
  );
};

export default Dashboard;
