import { routeOverdue, routeOutcomeLabel } from "../../utils/routeLifecycle";
import "../../components/routes/routePlanner.css";
import { ManagementHeader } from "../../components/management/ManagementWorkspace";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { House, ChevronRight, CirclePlus, Search, Pencil } from "lucide-react";
import RouteAssignmentSummary from "../../components/RouteAssignmentSummary";
import DataTable from "../../components/DataTable";
import { getAllRoutes } from "../../services/routeService";
import toast from "react-hot-toast";
import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.routes)) return response.routes;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const getStatusLabel = (status) => {
  const labels = {
    SCHEDULED: "Agendada",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
  };

  return labels[status] || status || "N/A";
};

const getStatusClass = (status) => {
  if (status === "SCHEDULED") return "status status-warning";
  if (status === "IN_PROGRESS") return "status status-info";
  if (status === "COMPLETED") return "status status-success";
  return "status status-danger";
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("pt-BR");
};

const RouteList = () => {
  const [params] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState("");
  const [routes, setRoutes] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  const loadRoutes = async () => {
    try {
      setLoading(true);

      const response = await getAllRoutes();
      const list = getArray(response);

      setRoutes(
        list.map((item, index) => ({
          ...item,
          sn: index + 1,
        })),
      );
    } catch (error) {
      toast.error(error?.error || error?.message || "Erro ao carregar rotas.");
      console.error("Fetch routes error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const filteredData = routes.filter((item) => {
    const term = search.toLowerCase();

    const history = params.get("view") === "history";
    if (history !== ["COMPLETED", "CANCELLED"].includes(item.status))
      return false;
    if (params.get("plan") && item.planId !== params.get("plan")) return false;
    if (statusFilter && item.status !== statusFilter) return false;
    return (
      item.name?.toLowerCase().includes(term) ||
      item.driver?.name?.toLowerCase().includes(term) ||
      item.vehicle?.plate?.toLowerCase().includes(term) ||
      item.status?.toLowerCase().includes(term)
    );
  });

  const columns = [
    { key: "sn", label: "SN" },
    {
      key: "name",
      label: "Rota",
      render: (value, row) => (
        <div>
          <strong>{value || "N/A"}</strong>
          <RouteAssignmentSummary route={row} />
        </div>
      ),
    },
    {
      key: "scheduledDate",
      label: "Data Programada",
      render: (value) => formatDate(value),
    },
    {
      key: "stops",
      label: "Paradas",
      render: (value) =>
        `${Array.isArray(value) ? value.length : 0} de apoio em texto`,
    },
    {
      key: "stats",
      label: "Coletas",
      render: (value) => value?.totalCollections ?? 0,
    },
    {
      key: "status",
      label: "Status",
      render: (value, row) => (
        <span className={getStatusClass(value)}>{routeOutcomeLabel(row)}{routeOverdue(row) ? " · Programação vencida" : ""}</span>
      ),
    },
  ];

  return (
    <>
      <HeadTags
        title={
          params.get("view") === "history"
            ? "Histórico de rotas"
            : "Programação de rotas"
        }
      />
      <TopProgressBar loading={loading} />

      <ManagementHeader
        title={
          params.get("view") === "history"
            ? "Histórico de rotas"
            : "Programação de rotas"
        }
        actions={
          <>
            <Link to="/create-route" className="primary-btn btn-sm">
              <CirclePlus /> Criar Rota
            </Link>
          </>
        }
      />

      <nav className="route-plan-nav">
        <Link className="btn btn-outline-success" to="/route-list">
          Programação
        </Link>
        <Link className="btn btn-outline-success" to="/route-plans">
          Rotas fixas
        </Link>
        <Link className="btn btn-outline-success" to="/route-list?view=history">
          Histórico
        </Link>
      </nav>
      <label className="mb-3">
        Situação
        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">Todas</option>
          {(params.get("view") === "history"
            ? ["COMPLETED", "CANCELLED"]
            : ["SCHEDULED", "IN_PROGRESS"]
          ).map((s) => (
            <option key={s} value={s}>
              {getStatusLabel(s)}
            </option>
          ))}
        </select>
      </label>
      <div className="row">
        <div className="col-12">
          <div className="card p-25">
            <div className="filter d-flex justify-content-end mb-3">
              <div className="filter-section search">
                <div className="icon">
                  <Search />
                </div>

                <input
                  className="form-control"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por rota, motorista, veículo ou status..."
                  aria-label="Buscar por rota, motorista, veículo ou status..."
                />
              </div>
            </div>

            <DataTable
              data={filteredData}
              columns={columns}
              currentPage={currentPage}
              rowsPerPage={rowsPerPage}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={(n) => {
                setRowsPerPage(n);
                setCurrentPage(1);
              }}
              renderActions={(row) => (
                <div className="actions d-flex align-items-center gap-10">
                  <Link
                    to={`/edit-route/${row.id}`}
                    className="d-inline-flex align-items-center gap-2"
                    title="Editar rota, motorista e veículo"
                    aria-label="Editar rota, motorista e veículo"
                  >
                    <Pencil size={16} />{" "}
                    <span className="small">Editar equipe e rota</span>
                  </Link>
                </div>
              )}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default RouteList;
