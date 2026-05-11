import { useState, useEffect } from "react";
import { Link } from "react-router";
import { House, ChevronRight, CirclePlus, Search, Pencil } from "lucide-react";
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

const getVehicleLabel = (vehicle) => {
  if (!vehicle) return "Não vinculado";

  const brand = vehicle.brand ? `${vehicle.brand} ` : "";
  const model = vehicle.model || "";
  const plate = vehicle.plate ? ` • ${vehicle.plate}` : "";

  return `${brand}${model}${plate}` || "Não vinculado";
};

const ZoneList = () => {
  const [zones, setZones] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  const loadRoutes = async () => {
    try {
      setLoading(true);

      const response = await getAllRoutes();
      const routes = getArray(response);

      setZones(
        routes.map((item, index) => ({
          ...item,
          sn: index + 1,
        }))
      );
    } catch (error) {
      toast.error(
        error?.error || error?.message || "Erro ao carregar zonas/rotas."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const filteredData = zones.filter((item) => {
    const term = search.toLowerCase();

    return (
      item.name?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.driver?.name?.toLowerCase().includes(term) ||
      item.vehicle?.plate?.toLowerCase().includes(term) ||
      item.status?.toLowerCase().includes(term)
    );
  });

  const columns = [
    { key: "sn", label: "SN" },
    {
      key: "name",
      label: "Zona/Rota",
      render: (value) => value || "N/A",
    },
    {
      key: "scheduledDate",
      label: "Data Programada",
      render: (value) => formatDate(value),
    },
    {
      key: "stops",
      label: "Áreas/Paradas",
      render: (value) => {
        if (!Array.isArray(value) || value.length === 0) return "N/A";
        return `${value.length} área(s)/parada(s)`;
      },
    },
    {
      key: "driver",
      label: "Motorista",
      render: (value, row) => row.driver?.name || "Não vinculado",
    },
    {
      key: "vehicle",
      label: "Veículo",
      render: (value, row) => getVehicleLabel(row.vehicle),
    },
    {
      key: "stats",
      label: "Coletas",
      render: (value) => value?.totalCollections ?? 0,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <span className={getStatusClass(value)}>{getStatusLabel(value)}</span>
      ),
    },
  ];

  return (
    <>
      <HeadTags title="Lista de Zonas/Rotas" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Lista de Zonas/Rotas</h3>

          <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
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

                  <li className="breadcrumb-item active">
                    Lista de Zonas/Rotas
                  </li>
                </ol>
              </nav>
            </div>

            <Link to="/create-zone" className="primary-btn btn-sm">
              <CirclePlus /> Criar Zona/Rota
            </Link>
          </div>
        </div>
      </div>

      <div className="row mb-4">
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
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar por zona, rota, motorista ou veículo..."
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
                    to={`/edit-zone/${row.id}`}
                    className="action-button edit"
                    title="Editar zona/rota"
                  >
                    <Pencil />
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

export default ZoneList;