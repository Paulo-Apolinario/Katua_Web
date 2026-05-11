import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  MapPin,
  MoveUpRight,
  PackageCheck,
  Recycle,
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

const PIE_COLORS = [
  "#028C56",
  "#10B981",
  "#34D399",
  "#6EE7B7",
  "#047857",
  "#059669",
  "#065F46",
  "#22C55E",
];

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.collections)) return response.collections;
  if (Array.isArray(response?.generators)) return response.generators;
  if (Array.isArray(response?.schedules)) return response.schedules;
  return [];
};

const getStatusLabel = (status) => {
  const labels = {
    REQUESTED: "Solicitada",
    SCHEDULED: "Agendada",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
    PENDING: "Pendente",
  };

  return labels[status] || status || "N/A";
};

const getStatusClass = (status) => {
  const classes = {
    REQUESTED: "warning",
    SCHEDULED: "primary",
    PENDING: "warning",
    IN_PROGRESS: "info",
    COMPLETED: "success",
    CANCELLED: "danger",
  };

  return classes[status] || "secondary";
};

function loadGoogleMapsScript() {
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
      existingScript.addEventListener("load", () =>
        resolve(window.google.maps)
      );
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
}

function getCollectionMaterials(collection) {
  const materials = collection.materials;

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
}

function getCollectionWeight(collection) {
  const directWeight = Number(collection?.totalWeightKg || 0);

  if (directWeight > 0) return directWeight;

  return getCollectionMaterials(collection).reduce((total, material) => {
    return (
      total +
      Number(
        material.quantityKg ||
          material.weightKg ||
          material.quantity ||
          material.totalKg ||
          0
      )
    );
  }, 0);
}

function buildMaterialStats(collections) {
  const map = new Map();

  collections.forEach((collection) => {
    getCollectionMaterials(collection).forEach((material) => {
      const type = String(
        material.type || material.name || "Não informado"
      ).trim();

      const quantity = Number(
        material.quantityKg ||
          material.weightKg ||
          material.quantity ||
          material.totalKg ||
          0
      );

      if (!type || quantity <= 0) return;

      map.set(type, (map.get(type) || 0) + quantity);
    });
  });

  return Array.from(map.entries())
    .map(([type, quantityKg], index) => ({
      type,
      quantityKg,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }))
    .sort((a, b) => b.quantityKg - a.quantityKg);
}

function PieChart({ data }) {
  const [hovered, setHovered] = useState(null);
  const total = data.reduce((sum, item) => sum + item.quantityKg, 0);

  if (!data.length || total <= 0) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{
          minHeight: 220,
          border: "1px dashed #D1D5DB",
          borderRadius: 18,
          background: "#F9FAFB",
          color: "#6B7280",
          fontWeight: 600,
        }}
      >
        Nenhum material informado nas coletas.
      </div>
    );
  }

  let currentAngle = 0;

  function polarToCartesian(cx, cy, radius, angleInDegrees) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

    return {
      x: cx + radius * Math.cos(angleInRadians),
      y: cy + radius * Math.sin(angleInRadians),
    };
  }

  function describeArc(cx, cy, radius, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      `M ${cx} ${cy}`,
      `L ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
      "Z",
    ].join(" ");
  }

  return (
    <div className="row g-4 align-items-center">
      <div className="col-md-6">
        <div style={{ position: "relative", width: "100%", maxWidth: 260 }}>
          <svg viewBox="0 0 220 220" width="100%" height="100%">
            {data.map((item) => {
              const angle = (item.quantityKg / total) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              currentAngle = endAngle;

              return (
                <path
                  key={item.type}
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

            <circle cx="110" cy="110" r="52" fill="#FFFFFF" />

            <text
              x="110"
              y="104"
              textAnchor="middle"
              style={{
                fontSize: 16,
                fontWeight: 800,
                fill: "#028C56",
              }}
            >
              {total.toFixed(1)}
            </text>

            <text
              x="110"
              y="124"
              textAnchor="middle"
              style={{
                fontSize: 12,
                fontWeight: 700,
                fill: "#6B7280",
              }}
            >
              KG
            </text>
          </svg>

          {hovered && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: 10,
                transform: "translateX(-50%)",
                background: "#111827",
                color: "#FFFFFF",
                padding: "8px 12px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {hovered.type}: {hovered.quantityKg.toFixed(2)} KG
            </div>
          )}
        </div>
      </div>

      <div className="col-md-6">
        {data.slice(0, 6).map((item) => (
          <div
            key={item.type}
            className="d-flex align-items-center justify-content-between mb-3"
          >
            <div className="d-flex align-items-center gap-2">
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: item.color,
                  display: "inline-block",
                }}
              />
              <strong>{item.type}</strong>
            </div>

            <span className="text-muted">{item.quantityKg.toFixed(2)} KG</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeneratorsMap({ generators }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    let mounted = true;

    async function initOrUpdateMap() {
      try {
        const maps = await loadGoogleMapsScript();

        if (!mounted || !mapRef.current) return;

        const validGenerators = generators.filter(
          (generator) => Number(generator.latitude) && Number(generator.longitude)
        );

        const center =
          validGenerators.length > 0
            ? {
                lat: Number(validGenerators[0].latitude),
                lng: Number(validGenerators[0].longitude),
              }
            : DEFAULT_CENTER;

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new maps.Map(mapRef.current, {
            center,
            zoom: validGenerators.length > 0 ? 12 : 11,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
        }

        const map = mapInstanceRef.current;

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        if (validGenerators.length === 0) {
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

          const marker = new maps.Marker({
            position,
            map,
            title: generator.companyName || generator.name || "Gerador",
          });

          const infoWindow = new maps.InfoWindow({
            content: `
              <div style="font-family: Arial; max-width: 220px;">
                <strong>${generator.companyName || generator.name || "Gerador"}</strong>
                <br />
                <span>${generator.email || ""}</span>
                <br />
                <span>${generator.city || ""}${generator.state ? `/${generator.state}` : ""}</span>
              </div>
            `,
          });

          marker.addListener("click", () => {
            infoWindow.open(map, marker);
          });

          markersRef.current.push(marker);
          bounds.extend(position);
        });

        map.fitBounds(bounds);
      } catch (error) {
        console.error("Erro ao carregar mapa:", error);
      }
    }

    initOrUpdateMap();

    return () => {
      mounted = false;
    };
  }, [generators]);

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "380px",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid #e5e7eb",
        background: "#f3f4f6",
      }}
    />
  );
}

const Dashboard = () => {
  const [data, setData] = useState({
    collections: [],
    generators: [],
    schedules: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);

        const [collectionsRes, generatorsRes, schedulesRes] =
          await Promise.allSettled([
            apiRequest("/collections"),
            apiRequest("/generators"),
            apiRequest("/schedules"),
          ]);

        setData({
          collections:
            collectionsRes.status === "fulfilled"
              ? getArray(collectionsRes.value)
              : [],
          generators:
            generatorsRes.status === "fulfilled"
              ? getArray(generatorsRes.value)
              : [],
          schedules:
            schedulesRes.status === "fulfilled"
              ? getArray(schedulesRes.value)
              : [],
        });
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const stats = useMemo(() => {
    const requestedSchedules = data.schedules.filter((schedule) =>
      ["REQUESTED", "SCHEDULED", "PENDING"].includes(schedule.status)
    );

    const inProgressCollections = data.collections.filter(
      (collection) => collection.status === "IN_PROGRESS"
    );

    const completedCollections = data.collections.filter(
      (collection) => collection.status === "COMPLETED"
    );

    const wasteCollected = completedCollections.reduce((sum, collection) => {
      return sum + getCollectionWeight(collection);
    }, 0);

    const mappedGenerators = data.generators.filter(
      (generator) => Number(generator.latitude) && Number(generator.longitude)
    );

    return {
      requestedSchedules,
      inProgressCollections,
      completedCollections,
      wasteCollected,
      mappedGenerators,
      materialStats: buildMaterialStats(completedCollections),
      recentCollections: [...data.collections]
        .sort((a, b) => {
          const dateA = new Date(a.collectedAt || a.createdAt || 0).getTime();
          const dateB = new Date(b.collectedAt || b.createdAt || 0).getTime();

          return dateB - dateA;
        })
        .slice(0, 8),
    };
  }, [data]);

  return (
    <>
      <HeadTags title="Painel Administrativo" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
            <div>
              <h3 className="fs-30">Painel KATUÁ</h3>
              <p className="text-muted mb-0">
                Visão rápida da operação da cooperativa: solicitações,
                coletas, resíduos e geradores mapeados.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="row gy-4 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="card p-25 h-100">
            <div className="content">
              <p className="title">Solicitações pendentes</p>
              <h3>{stats.requestedSchedules.length}</h3>
              <div className="link">
                <Link to="/collection-requests">analisar solicitações</Link>
                <div className="arrow-icon">
                  <MoveUpRight />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-25 h-100">
            <div className="content">
              <p className="title">Coletas em campo</p>
              <h3>{stats.inProgressCollections.length}</h3>
              <div className="link">
                <Link to="/waste-list">acompanhar coletas</Link>
                <div className="arrow-icon">
                  <MoveUpRight />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-25 h-100">
            <div className="content">
              <p className="title">Coletas concluídas</p>
              <h3>{stats.completedCollections.length}</h3>
              <div className="link">
                <Link to="/waste-list">ver histórico</Link>
                <div className="arrow-icon">
                  <MoveUpRight />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-25 h-100">
            <div className="content">
              <p className="title">Resíduos coletados</p>
              <h3>
                {stats.wasteCollected.toFixed(2)}
                <span> KG</span>
              </h3>
              <div className="link">
                <Link to="/waste-list">ver resíduos</Link>
                <div className="arrow-icon">
                  <MoveUpRight />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row gy-4 mb-4">
        <div className="col-xl-6">
          <div className="card p-25 h-100">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
              <div>
                <h3 className="fw-600 mb-1">Mapa dos Geradores</h3>
                <p className="text-muted mb-0">
                  {stats.mappedGenerators.length} de {data.generators.length}{" "}
                  geradores com localização.
                </p>
              </div>

              <MapPin color="#028C56" />
            </div>

            <GeneratorsMap generators={data.generators} />
          </div>
        </div>

        <div className="col-xl-6">
          <div className="card p-25 h-100">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
              <div>
                <h3 className="fw-600 mb-1">Materiais Coletados</h3>
                <p className="text-muted mb-0">
                  Distribuição dos materiais registrados nas coletas concluídas.
                </p>
              </div>

              <Recycle color="#028C56" />
            </div>

            <PieChart data={stats.materialStats} />
          </div>
        </div>

        <div className="col-12">
          <div className="card p-25 h-100">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
              <div>
                <h3 className="fw-600 mb-1">Últimas Coletas</h3>
                <p className="text-muted mb-0">
                  Movimentações recentes da operação.
                </p>
              </div>

              <PackageCheck color="#028C56" />
            </div>

            <SimpleBar forceVisible="x" autoHide>
              <table className="table nowrap w-100">
                <thead>
                  <tr>
                    <th>Gerador</th>
                    <th>Responsável</th>
                    <th>Rota</th>
                    <th>Quantidade</th>
                    <th>Data</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {stats.recentCollections.length === 0 ? (
                    <tr>
                      <td colSpan="6">Nenhuma coleta encontrada.</td>
                    </tr>
                  ) : (
                    stats.recentCollections.map((collection, index) => {
                      const generator =
                        collection.generator?.companyName ||
                        collection.generator?.name ||
                        collection.schedule?.generator?.companyName ||
                        collection.schedule?.generator?.name ||
                        "N/A";

                      const responsible =
                        collection.collector?.name ||
                        collection.driver?.name ||
                        "Não informado";

                      const routeName =
                        collection.route?.name || "Sem rota vinculada";

                      const weight = getCollectionWeight(collection);
                      const date =
                        collection.collectedAt || collection.createdAt || null;

                      return (
                        <tr key={collection.id || index}>
                          <td>{generator}</td>
                          <td>{responsible}</td>
                          <td>{routeName}</td>
                          <td>
                            <strong>{weight.toFixed(2)} KG</strong>
                          </td>
                          <td>
                            {date ? moment(date).format("DD/MM/YYYY") : "N/A"}
                          </td>
                          <td>
                            <span
                              className={`badge text-bg-${getStatusClass(
                                collection.status
                              )}`}
                            >
                              {getStatusLabel(collection.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </SimpleBar>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;