import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  PackageCheck,
  Route,
  Search,
  Truck,
  UserRound,
  Weight,
  RefreshCcw,
} from "lucide-react";
import moment from "moment";
import toast from "react-hot-toast";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";
import { getAllCollectors } from "../../services/collectorService";
import { getAllCollections } from "../../services/collectionService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const COLLECTOR_STATUS_OPTIONS = [
  {
    value: "AVAILABLE",
    label: "Disponível",
  },
  {
    value: "ON_ROUTE",
    label: "Em rota",
  },
  {
    value: "INACTIVE",
    label: "Inativo",
  },
];

const getToken = () => localStorage.getItem("auth_token");

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.collectors)) return response.collectors;
  if (Array.isArray(response?.collections)) return response.collections;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const getStatusLabel = (status) => {
  const labels = {
    AVAILABLE: "Disponível",
    ON_ROUTE: "Em rota",
    INACTIVE: "Inativo",
  };

  return labels[status] || status || "N/A";
};

const getStatusClass = (status) => {
  const classes = {
    AVAILABLE: "success",
    ON_ROUTE: "info",
    INACTIVE: "secondary",
  };

  return classes[status] || "secondary";
};

const getCollectionStatusLabel = (status) => {
  const labels = {
    PENDING: "Pendente",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
  };

  return labels[status] || status || "N/A";
};

const getCollectionStatusClass = (status) => {
  const classes = {
    PENDING: "warning",
    IN_PROGRESS: "info",
    COMPLETED: "success",
    CANCELLED: "danger",
  };

  return classes[status] || "secondary";
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

const calculateMaterialsTotal = (materials) => {
  return normalizeMaterials(materials).reduce((total, item) => {
    return total + Number(item?.quantityKg || 0);
  }, 0);
};

const getCollectionWeight = (collection) => {
  const totalWeightKg = Number(collection?.totalWeightKg || 0);
  const materialsTotal = calculateMaterialsTotal(collection?.materials);

  return totalWeightKg > 0 ? totalWeightKg : materialsTotal;
};

const getCollectorCollections = (collections, collectorId) => {
  return collections.filter((collection) => {
    return (
      collection?.collectorId === collectorId ||
      collection?.collector?.id === collectorId
    );
  });
};

const isToday = (date) => {
  if (!date) return false;

  return moment(date).isSame(moment(), "day");
};

const isCurrentMonth = (date) => {
  if (!date) return false;

  return moment(date).isSame(moment(), "month");
};

const getCollectionDate = (collection) => {
  return collection?.collectedAt || collection?.createdAt || null;
};

const formatMaterials = (materials) => {
  const items = normalizeMaterials(materials);

  if (items.length === 0) {
    return "Materiais não informados";
  }

  return items
    .map((item) => {
      const type = item?.type || "Material";
      const quantity = Number(item?.quantityKg || 0);

      if (quantity > 0) {
        return `${type} (${quantity.toLocaleString("pt-BR")} kg)`;
      }

      return type;
    })
    .join(", ");
};

const getGeneratorName = (collection) => {
  return (
    collection?.generator?.companyName ||
    collection?.generator?.name ||
    collection?.schedule?.generator?.companyName ||
    collection?.schedule?.generator?.name ||
    "Gerador não informado"
  );
};

const getRouteName = (collection) => {
  return collection?.route?.name || "Sem rota vinculada";
};

const getVehicleName = (collection) => {
  if (!collection?.vehicle) return "Sem veículo";

  const plate = collection.vehicle.plate || "";
  const model = collection.vehicle.model || "";

  return [plate, model].filter(Boolean).join(" - ") || "Sem veículo";
};

const CollectorDocuments = () => {
  const [searchParams] = useSearchParams();
  const selectedCollectorId = searchParams.get("id");

  const [collectors, setCollectors] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [searchText, setSearchText] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);

      const [collectorsResponse, collectionsResponse] = await Promise.all([
        getAllCollectors(),
        getAllCollections(),
      ]);

      setCollectors(getArray(collectorsResponse));
      setCollections(getArray(collectionsResponse));
    } catch (error) {
      console.error("Erro ao carregar documentos dos catadores:", error);
      toast.error(
        error?.error ||
          error?.message ||
          "Não foi possível carregar os documentos dos catadores."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateCollectorStatus = async (collectorId, newStatus) => {
    const token = getToken();

    if (!collectorId || !newStatus) {
      toast.error("Status inválido para atualização.");
      return;
    }

    try {
      setStatusUpdatingId(collectorId);

      const response = await fetch(
        `${API_BASE_URL}/collectors/${collectorId}/status`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            payload?.error ||
            "Não foi possível atualizar o status do catador."
        );
      }

      setCollectors((currentCollectors) =>
        currentCollectors.map((collector) =>
          collector.id === collectorId
            ? {
                ...collector,
                status: newStatus,
                ...(payload?.collector || payload?.data || {}),
              }
            : collector
        )
      );

      toast.success("Status do catador atualizado com sucesso.");
    } catch (error) {
      console.error("Erro ao atualizar status do catador:", error);
      toast.error(
        error?.message || "Não foi possível atualizar o status do catador."
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const filteredCollectors = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    let items = collectors;

    if (selectedCollectorId) {
      items = items.filter((item) => item.id === selectedCollectorId);
    }

    if (!term) return items;

    return items.filter((collector) => {
      const values = [
        collector.name,
        collector.email,
        collector.phone,
        collector.rg,
        collector.status,
        getStatusLabel(collector.status),
      ];

      return values.some((value) =>
        String(value || "").toLowerCase().includes(term)
      );
    });
  }, [collectors, searchText, selectedCollectorId]);

  const collectorStats = useMemo(() => {
    const stats = {};

    collectors.forEach((collector) => {
      const collectorCollections = getCollectorCollections(
        collections,
        collector.id
      );

      const completedCollections = collectorCollections.filter(
        (collection) => collection.status === "COMPLETED"
      );

      const totalKg = collectorCollections.reduce((total, collection) => {
        return total + getCollectionWeight(collection);
      }, 0);

      const kgMonth = collectorCollections.reduce((total, collection) => {
        const date = getCollectionDate(collection);

        if (!isCurrentMonth(date)) return total;

        return total + getCollectionWeight(collection);
      }, 0);

      const collectionsToday = collectorCollections.filter((collection) => {
        const date = getCollectionDate(collection);
        return isToday(date);
      }).length;

      stats[collector.id] = {
        totalCollections: collectorCollections.length,
        completedCollections: completedCollections.length,
        totalKg,
        kgMonth,
        collectionsToday,
      };
    });

    return stats;
  }, [collectors, collections]);

  return (
    <>
      <HeadTags title="Documentos dos Catadores" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
            <div>
              <h3 className="fs-30">Documentos dos Catadores</h3>
              <p className="mb-0 text-muted">
                Histórico cadastral, documental, operacional e controle de status
                dos catadores.
              </p>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-success btn-sm d-flex align-items-center gap-2"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCcw size={16} />
                Atualizar
              </button>

              <Link to="/collector-list" className="secondary-btn btn-sm">
                <ArrowLeft size={16} />
                Voltar
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-25 mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h4 className="mb-1 fw-600">Catadores</h4>
            <p className="text-muted mb-0">
              Altere o status operacional do catador sem sair da tela.
            </p>
          </div>

          <div
            className="d-flex align-items-center gap-2"
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "8px 12px",
              minWidth: "280px",
            }}
          >
            <Search size={18} />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Buscar catador..."
              style={{
                border: "none",
                outline: "none",
                width: "100%",
                background: "transparent",
              }}
            />
          </div>
        </div>

        <div className="row g-4">
          {filteredCollectors.length === 0 ? (
            <div className="col-12">
              <p className="text-muted mb-0">
                {loading
                  ? "Carregando catadores..."
                  : "Nenhum catador encontrado."}
              </p>
            </div>
          ) : (
            filteredCollectors.map((collector) => {
              const currentCollections = getCollectorCollections(
                collections,
                collector.id
              );

              const stats = collectorStats[collector.id] || {
                totalCollections: 0,
                completedCollections: 0,
                totalKg: 0,
                kgMonth: 0,
                collectionsToday: 0,
              };

              const updatingThisCollector = statusUpdatingId === collector.id;

              return (
                <div className="col-12" key={collector.id}>
                  <div className="card p-20 h-100 border">
                    <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-3">
                      <div className="d-flex align-items-start gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center"
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: "#ecfdf5",
                          }}
                        >
                          <UserRound size={22} />
                        </div>

                        <div>
                          <h5 className="mb-1">
                            {collector.name || "Sem nome"}
                          </h5>
                          <p className="mb-0 text-muted small">
                            {collector.email || "E-mail não informado"}
                          </p>
                        </div>
                      </div>

                      <div className="d-flex align-items-center flex-wrap gap-2">
                        <span
                          className={`badge text-bg-${getStatusClass(
                            collector.status
                          )}`}
                        >
                          {getStatusLabel(collector.status)}
                        </span>

                        <select
                          className="form-control form-control-sm"
                          value={collector.status || "AVAILABLE"}
                          disabled={updatingThisCollector}
                          onChange={(event) =>
                            updateCollectorStatus(
                              collector.id,
                              event.target.value
                            )
                          }
                          style={{
                            minWidth: 160,
                            height: 36,
                          }}
                        >
                          {COLLECTOR_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        {updatingThisCollector ? (
                          <small className="text-muted">Salvando...</small>
                        ) : null}
                      </div>
                    </div>

                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <p className="mb-1">
                          <strong>Telefone:</strong>{" "}
                          {collector.phone || "N/A"}
                        </p>
                        <p className="mb-1">
                          <strong>RG:</strong> {collector.rg || "N/A"}
                        </p>
                        <p className="mb-0">
                          <strong>Nascimento:</strong>{" "}
                          {collector.birthDate || "N/A"}
                        </p>
                      </div>

                      <div className="col-md-4">
                        <p className="mb-1">
                          <strong>Kg no mês:</strong>{" "}
                          {stats.kgMonth.toLocaleString("pt-BR")} kg
                        </p>
                        <p className="mb-1">
                          <strong>Coletas hoje:</strong>{" "}
                          {stats.collectionsToday}
                        </p>
                        <p className="mb-0">
                          <strong>Total cadastral:</strong>{" "}
                          {stats.totalKg.toLocaleString("pt-BR")} kg
                        </p>
                      </div>

                      <div className="col-md-4">
                        <div className="row g-2">
                          <div className="col-4">
                            <div className="p-2 rounded bg-light h-100">
                              <PackageCheck size={18} />
                              <p className="mb-0 small text-muted">Coletas</p>
                              <strong>{stats.totalCollections}</strong>
                            </div>
                          </div>

                          <div className="col-4">
                            <div className="p-2 rounded bg-light h-100">
                              <BadgeCheck size={18} />
                              <p className="mb-0 small text-muted">
                                Concluídas
                              </p>
                              <strong>{stats.completedCollections}</strong>
                            </div>
                          </div>

                          <div className="col-4">
                            <div className="p-2 rounded bg-light h-100">
                              <Weight size={18} />
                              <p className="mb-0 small text-muted">Kg</p>
                              <strong>
                                {stats.totalKg.toLocaleString("pt-BR")}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className="p-3 rounded mb-4"
                      style={{
                        background: "#f9fafb",
                        border: "1px dashed #d1d5db",
                      }}
                    >
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <FileText size={18} />
                        <strong>Documentos</strong>
                      </div>

                      <p className="text-muted small mb-0">
                        Área preparada para documentos futuros do catador, como
                        RG, comprovantes, termos, contratos, autorizações e
                        registros internos da cooperativa.
                      </p>
                    </div>

                    <div>
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                        <div>
                          <h5 className="mb-1">Histórico de coletas</h5>
                          <p className="text-muted small mb-0">
                            Coletas vinculadas a este catador, incluindo
                            gerador, rota, veículo, materiais e quantidade.
                          </p>
                        </div>
                      </div>

                      {currentCollections.length === 0 ? (
                        <div className="alert alert-light border mb-0">
                          Nenhuma coleta registrada para este catador até o
                          momento.
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table nowrap w-100 mb-0">
                            <thead>
                              <tr>
                                <th>Data</th>
                                <th>Status</th>
                                <th>Gerador</th>
                                <th>Motorista</th>
                                <th>Rota</th>
                                <th>Veículo</th>
                                <th>Materiais</th>
                                <th>Quantidade</th>
                              </tr>
                            </thead>

                            <tbody>
                              {currentCollections.map((collection) => {
                                const total = getCollectionWeight(collection);
                                const collectionDate =
                                  getCollectionDate(collection);

                                return (
                                  <tr key={collection.id}>
                                    <td>
                                      {collectionDate
                                        ? moment(collectionDate).format(
                                            "DD/MM/YYYY"
                                          )
                                        : "Sem data"}
                                    </td>

                                    <td>
                                      <span
                                        className={`badge text-bg-${getCollectionStatusClass(
                                          collection.status
                                        )}`}
                                      >
                                        {getCollectionStatusLabel(
                                          collection.status
                                        )}
                                      </span>
                                    </td>

                                    <td>{getGeneratorName(collection)}</td>

                                    <td>
                                      {collection?.driver?.name ||
                                        "Sem motorista"}
                                    </td>

                                    <td>
                                      <div className="d-flex align-items-center gap-2">
                                        <Route size={16} />
                                        {getRouteName(collection)}
                                      </div>
                                    </td>

                                    <td>
                                      <div className="d-flex align-items-center gap-2">
                                        <Truck size={16} />
                                        {getVehicleName(collection)}
                                      </div>
                                    </td>

                                    <td>
                                      {formatMaterials(collection.materials)}
                                    </td>

                                    <td>
                                      <strong>
                                        {total.toLocaleString("pt-BR")} kg
                                      </strong>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default CollectorDocuments;