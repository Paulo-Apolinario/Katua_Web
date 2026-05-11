import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  BarChart3,
  ChevronRight,
  Download,
  FileSpreadsheet,
  House,
  RefreshCcw,
  Search,
  Truck,
  Wrench,
  AlertTriangle,
  Route,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import DataTable from "../../components/DataTable";
import { exportToExcel } from "../../utils/exportExcel";
import { exportToPdf } from "../../utils/exportPdf";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const STATUS_LABELS = {
  ACTIVE: "Ativo",
  MAINTENANCE: "Manutenção",
  INACTIVE: "Inativo",
};

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

const formatKg = (value) => {
  const number = Number(value || 0);
  return `${number.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} kg`;
};

const safeDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
};

const statusBadgeClass = (status) => {
  if (status === "ACTIVE") return "status status-success";
  if (status === "MAINTENANCE") return "status status-warning";
  if (status === "INACTIVE") return "status status-danger";
  return "status";
};

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
    throw new Error(payload?.message || payload?.error || "Erro ao buscar dados.");
  }

  return payload;
};

const VehicleReports = () => {
  const [vehicles, setVehicles] = useState([]);
  const [collections, setCollections] = useState([]);
  const [routes, setRoutes] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);

    try {
      const [vehiclesPayload, collectionsPayload, routesPayload] = await Promise.all([
        fetchJson("/vehicles"),
        fetchJson("/collections"),
        fetchJson("/routes"),
      ]);

      setVehicles(normalizeArrayResponse(vehiclesPayload, ["vehicles"]));
      setCollections(normalizeArrayResponse(collectionsPayload, ["collections"]));
      setRoutes(normalizeArrayResponse(routesPayload, ["routes"]));
    } catch (error) {
      toast.error(error.message || "Erro ao carregar relatórios de veículos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const vehicleRows = useMemo(() => {
    return vehicles.map((vehicle, index) => {
      const vehicleCollections = collections.filter(
        (collection) =>
          collection.vehicleId === vehicle.id || collection.vehicle?.id === vehicle.id
      );

      const vehicleRoutes = routes.filter(
        (routeItem) => routeItem.vehicleId === vehicle.id || routeItem.vehicle?.id === vehicle.id
      );

      const totalKg = vehicleCollections.reduce(
        (sum, collection) => sum + Number(collection.totalWeightKg || 0),
        0
      );

      return {
        sn: index + 1,
        id: vehicle.id,
        plate: vehicle.plate || "-",
        model: vehicle.model || "-",
        brand: vehicle.brand || "-",
        year: vehicle.year || "-",
        capacityKg: Number(vehicle.capacityKg || 0),
        status: vehicle.status || "ACTIVE",
        statusLabel: STATUS_LABELS[vehicle.status] || vehicle.status || "-",
        driverName: vehicle.driver?.name || "-",
        driverEmail: vehicle.driver?.email || "-",
        routesCount: vehicleRoutes.length,
        collectionsCount: vehicleCollections.length,
        totalKg,
        createdAt: vehicle.createdAt,
      };
    });
  }, [vehicles, collections, routes]);

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();

    return vehicleRows.filter((item) => {
      const matchesSearch =
        !term ||
        item.plate.toLowerCase().includes(term) ||
        item.model.toLowerCase().includes(term) ||
        item.brand.toLowerCase().includes(term) ||
        item.driverName.toLowerCase().includes(term);

      const matchesStatus = !statusFilter || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vehicleRows, search, statusFilter]);

  const stats = useMemo(() => {
    const activeVehicles = vehicleRows.filter((item) => item.status === "ACTIVE").length;
    const maintenanceVehicles = vehicleRows.filter((item) => item.status === "MAINTENANCE").length;
    const inactiveVehicles = vehicleRows.filter((item) => item.status === "INACTIVE").length;
    const totalCapacity = vehicleRows.reduce((sum, item) => sum + Number(item.capacityKg || 0), 0);

    return {
      activeVehicles,
      maintenanceVehicles,
      inactiveVehicles,
      totalCapacity,
    };
  }, [vehicleRows]);

  const statusChartData = useMemo(() => {
    return Object.keys(STATUS_LABELS).map((status) => ({
      name: STATUS_LABELS[status],
      value: vehicleRows.filter((item) => item.status === status).length,
    }));
  }, [vehicleRows]);

  const vehicleKgChartData = useMemo(() => {
    return [...vehicleRows]
      .sort((a, b) => Number(b.totalKg || 0) - Number(a.totalKg || 0))
      .slice(0, 8)
      .map((item) => ({
        name: item.plate,
        kg: Number(item.totalKg || 0),
        rotas: Number(item.routesCount || 0),
      }));
  }, [vehicleRows]);

  const columns = [
    { key: "sn", label: "Nº" },
    { key: "plate", label: "Placa" },
    { key: "brand", label: "Marca" },
    { key: "model", label: "Modelo" },
    { key: "year", label: "Ano" },
    {
      key: "capacityKg",
      label: "Capacidade",
      render: (value) => formatKg(value),
    },
    { key: "driverName", label: "Motorista" },
    { key: "routesCount", label: "Rotas" },
    { key: "collectionsCount", label: "Coletas" },
    {
      key: "totalKg",
      label: "Kg transportado",
      render: (value) => formatKg(value),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <span className={statusBadgeClass(value)}>
          {STATUS_LABELS[value] || value || "-"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Cadastro",
      render: (value) => safeDate(value),
    },
  ];

  const exportRows = filteredData.map((item) => ({
    Placa: item.plate,
    Marca: item.brand,
    Modelo: item.model,
    Ano: item.year,
    CapacidadeKg: item.capacityKg,
    Status: item.statusLabel,
    Motorista: item.driverName,
    EmailMotorista: item.driverEmail,
    Rotas: item.routesCount,
    Coletas: item.collectionsCount,
    KgTransportado: item.totalKg,
    Cadastro: safeDate(item.createdAt),
  }));

  return (
    <>
      <HeadTags title="Relatórios de Veículos" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Relatórios de Veículos</h3>

          <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
            <div className="breadcrumb-wrap">
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb pb-0 mb-0">
                  <li className="breadcrumb-item">
                    <Link to="/" className="d-flex align-items-center gap-8">
                      <House size={18} />
                      Dashboard
                    </Link>
                  </li>
                  <li className="breadcrumb-item">
                    <ChevronRight size={18} />
                  </li>
                  <li className="breadcrumb-item active">Relatórios de Veículos</li>
                </ol>
              </nav>
            </div>

            <button
              className="btn btn-success d-flex align-items-center gap-8"
              onClick={loadReports}
            >
              <RefreshCcw size={17} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="widget mb-4">
        <div className="row g-4">
          <div className="col-md-6 col-xl-3">
            <div className="card p-25">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <Truck color="#1A7E00" size={30} />
                </div>
                <div className="content">
                  <p className="title text-muted mb-1">Veículos ativos</p>
                  <h3>{stats.activeVehicles}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <div className="card p-25">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <Wrench color="#1A7E00" size={30} />
                </div>
                <div className="content">
                  <p className="title text-muted mb-1">Em manutenção</p>
                  <h3>{stats.maintenanceVehicles}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <div className="card p-25">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <AlertTriangle color="#1A7E00" size={30} />
                </div>
                <div className="content">
                  <p className="title text-muted mb-1">Inativos</p>
                  <h3>{stats.inactiveVehicles}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <div className="card p-25">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <Route color="#1A7E00" size={30} />
                </div>
                <div className="content">
                  <p className="title text-muted mb-1">Capacidade total</p>
                  <h3>{formatKg(stats.totalCapacity)}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-7">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h4 className="fw-600 fs-20 mb-0">Kg transportado por veículo</h4>
              <BarChart3 size={22} color="#1A7E00" />
            </div>

            <div style={{ width: "100%", height: 330 }}>
              <ResponsiveContainer>
                <BarChart data={vehicleKgChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "kg" ? formatKg(value) : value,
                      name,
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="kg" name="Kg transportado" fill="#1A7E00" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="rotas" name="Rotas" fill="#64B000" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-xl-5">
          <div className="card p-25 h-100">
            <h4 className="fw-600 fs-20 mb-3">Distribuição por status</h4>

            <div style={{ width: "100%", height: 330 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusChartData} dataKey="value" nameKey="name" outerRadius={110} label>
                    {statusChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={["#1A7E00", "#F59E0B", "#DC2626"][index % 3]}
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

      <div className="card p-25 mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-15 mb-3">
          <div>
            <h4 className="fw-600 fs-20 mb-1">Tabela analítica de veículos</h4>
            <p className="text-muted mb-0">
              Capacidade, motorista vinculado, coletas, rotas e status operacional.
            </p>
          </div>

          <div className="d-flex align-items-center flex-wrap gap-10">
            <div className="filter-section search">
              <div className="icon">
                <Search size={18} />
              </div>
              <input
                className="form-control"
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por placa, modelo, marca ou motorista..."
              />
            </div>

            <select
              className="form-control"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Todos os status</option>
              <option value="ACTIVE">Ativo</option>
              <option value="MAINTENANCE">Manutenção</option>
              <option value="INACTIVE">Inativo</option>
            </select>

            <button
              className="btn btn-outline-success d-flex align-items-center gap-8"
              onClick={() =>
                exportToExcel({
                  fileName: "relatorio-veiculos-katua",
                  sheetName: "Veiculos",
                  rows: exportRows,
                })
              }
            >
              <FileSpreadsheet size={17} />
              Excel
            </button>

            <button
              className="btn btn-success d-flex align-items-center gap-8"
              onClick={() =>
                exportToPdf({
                  fileName: "relatorio-veiculos-katua",
                  title: "Relatório de Veículos",
                  subtitle: "Veículos operacionais",
                  rows: exportRows,
                })
              }
            >
              <Download size={17} />
              PDF
            </button>
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
        />
      </div>
    </>
  );
};

export default VehicleReports;