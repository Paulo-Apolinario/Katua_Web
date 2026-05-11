import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ChevronRight,
  Eye,
  House,
  Pencil,
  RefreshCw,
  Route,
  Search,
  Truck,
  UserRound,
} from "lucide-react";
import moment from "moment";
import toast from "react-hot-toast";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";
import { getAllRoutes } from "../../services/routeService";

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.routes)) return response.routes;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const getRouteStatusLabel = (status) => {
  const labels = {
    SCHEDULED: "Agendada",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
  };

  return labels[status] || status || "N/A";
};

const getRouteStatusClass = (status) => {
  const classes = {
    SCHEDULED: "primary",
    IN_PROGRESS: "info",
    COMPLETED: "success",
    CANCELLED: "danger",
  };

  return classes[status] || "secondary";
};

const getDriverName = (route) => {
  return route?.driver?.name || "Sem motorista";
};

const getVehicleName = (route) => {
  if (!route?.vehicle) return "Sem veículo";

  const plate = route.vehicle.plate || "";
  const model = route.vehicle.model || "";

  return [plate, model].filter(Boolean).join(" - ") || "Sem veículo";
};

const getRouteCollectionsCount = (route) => {
  if (typeof route?.stats?.totalCollections === "number") {
    return route.stats.totalCollections;
  }

  if (Array.isArray(route?.collections)) {
    return route.collections.length;
  }

  if (Array.isArray(route?.activeCollections)) {
    return route.activeCollections.length;
  }

  return 0;
};

const getCompletedCollectionsCount = (route) => {
  if (typeof route?.stats?.completedCollections === "number") {
    return route.stats.completedCollections;
  }

  if (Array.isArray(route?.collections)) {
    return route.collections.filter(
      (collection) => collection.status === "COMPLETED"
    ).length;
  }

  return 0;
};

const AssignRouteList = () => {
  const [routes, setRoutes] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  const loadRoutes = async () => {
    try {
      setLoading(true);

      const response = await getAllRoutes();
      setRoutes(getArray(response));
    } catch (error) {
      console.error("Erro ao carregar rotas delegadas:", error);
      toast.error(
        error?.error ||
          error?.message ||
          "Não foi possível carregar as rotas delegadas."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const delegatedRoutes = useMemo(() => {
    return routes.filter((route) => {
      return route.driverId || route.vehicleId || route.driver || route.vehicle;
    });
  }, [routes]);

  const filteredRoutes = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    if (!term) return delegatedRoutes;

    return delegatedRoutes.filter((route) => {
      const values = [
        route.name,
        route.description,
        route.status,
        route.driver?.name,
        route.driver?.email,
        route.driver?.phone,
        route.vehicle?.plate,
        route.vehicle?.model,
        route.vehicle?.brand,
      ];

      return values.some((value) =>
        String(value || "").toLowerCase().includes(term)
      );
    });
  }, [delegatedRoutes, searchText]);

  return (
    <>
      <HeadTags title="Rotas Delegadas" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Rotas Delegadas</h3>
          <p className="text-muted mb-0">
            Acompanhe as rotas que já possuem motorista ou veículo vinculado.
          </p>
        </div>

        <div className="page-tool d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="breadcrumb-wrap">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb pb-0 mb-0">
                <li className="breadcrumb-item">
                  <Link to="/" className="d-flex align-items-center gap-8">
                    <House /> Painel
                  </Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li className="breadcrumb-item active" aria-current="page">
                  Rotas Delegadas
                </li>
              </ol>
            </nav>
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="secondary-btn btn-sm border-0"
              onClick={loadRoutes}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Atualizar
            </button>

            <Link to="/route-list" className="primary-btn btn-sm border-0">
              <Route size={16} />
              Ver Rotas
            </Link>
          </div>
        </div>
      </div>

      <div className="row gy-4 mb-4">
        <div className="col-md-4">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-3">
              <Route color="#028C56" size={32} />

              <div>
                <p className="mb-1 text-muted">Rotas delegadas</p>
                <h3 className="mb-0">{delegatedRoutes.length}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-3">
              <UserRound color="#028C56" size={32} />

              <div>
                <p className="mb-1 text-muted">Em andamento</p>
                <h3 className="mb-0">
                  {
                    delegatedRoutes.filter(
                      (route) => route.status === "IN_PROGRESS"
                    ).length
                  }
                </h3>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-3">
              <Truck color="#028C56" size={32} />

              <div>
                <p className="mb-1 text-muted">Concluídas</p>
                <h3 className="mb-0">
                  {
                    delegatedRoutes.filter(
                      (route) => route.status === "COMPLETED"
                    ).length
                  }
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-25">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h4 className="fw-600 mb-1">Lista de Rotas Delegadas</h4>
            <p className="text-muted mb-0">
              Rotas com motorista, veículo e coletas vinculadas.
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
              placeholder="Buscar rota, motorista ou veículo..."
              style={{
                border: "none",
                outline: "none",
                width: "100%",
                background: "transparent",
              }}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table nowrap w-100">
            <thead>
              <tr>
                <th>Rota</th>
                <th>Data</th>
                <th>Motorista</th>
                <th>Veículo</th>
                <th>Coletas</th>
                <th>Concluídas</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {filteredRoutes.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    {loading
                      ? "Carregando rotas delegadas..."
                      : "Nenhuma rota delegada encontrada."}
                  </td>
                </tr>
              ) : (
                filteredRoutes.map((route) => (
                  <tr key={route.id}>
                    <td>
                      <strong>{route.name || "Rota sem nome"}</strong>
                      <div className="text-muted small">
                        {route.description || "Sem descrição"}
                      </div>
                    </td>

                    <td>
                      {route.scheduledDate
                        ? moment(route.scheduledDate).format("DD/MM/YYYY")
                        : "Sem data"}
                    </td>

                    <td>{getDriverName(route)}</td>

                    <td>{getVehicleName(route)}</td>

                    <td>
                      <strong>{getRouteCollectionsCount(route)}</strong>
                    </td>

                    <td>
                      <strong>{getCompletedCollectionsCount(route)}</strong>
                    </td>

                    <td>
                      <span
                        className={`badge text-bg-${getRouteStatusClass(
                          route.status
                        )}`}
                      >
                        {getRouteStatusLabel(route.status)}
                      </span>
                    </td>

                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <Link
                          to={`/route-list`}
                          className="secondary-btn btn-sm"
                        >
                          <Eye size={16} />
                          Ver
                        </Link>

                        <Link
                          to={`/edit-route/${route.id}`}
                          className="primary-btn btn-sm border-0"
                        >
                          <Pencil size={16} />
                          Editar
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default AssignRouteList;