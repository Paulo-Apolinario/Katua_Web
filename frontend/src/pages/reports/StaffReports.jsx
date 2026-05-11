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
  Users,
  UserCheck,
  Truck,
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
  AVAILABLE: "Disponível",
  ON_ROUTE: "Em rota",
  INACTIVE: "Inativo",
};

const ROLE_LABELS = {
  DRIVER: "Motorista",
  COLLECTOR: "Catador",
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
  if (status === "AVAILABLE") return "status status-success";
  if (status === "ON_ROUTE") return "status status-warning";
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

const StaffReports = () => {
  const [drivers, setDrivers] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [collections, setCollections] = useState([]);
  const [routes, setRoutes] = useState([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);

    try {
      const [driversPayload, collectorsPayload, collectionsPayload, routesPayload] =
        await Promise.all([
          fetchJson("/drivers"),
          fetchJson("/collectors"),
          fetchJson("/collections"),
          fetchJson("/routes"),
        ]);

      setDrivers(normalizeArrayResponse(driversPayload, ["drivers"]));
      setCollectors(normalizeArrayResponse(collectorsPayload, ["collectors"]));
      setCollections(normalizeArrayResponse(collectionsPayload, ["collections"]));
      setRoutes(normalizeArrayResponse(routesPayload, ["routes"]));
    } catch (error) {
      toast.error(error.message || "Erro ao carregar relatórios de equipe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const staffRows = useMemo(() => {
    const driverRows = drivers.map((driver) => {
      const driverRoutes = routes.filter(
        (routeItem) =>
          routeItem.driverId === driver.id ||
          routeItem.driver?.id === driver.id
      );

      return {
        id: `driver-${driver.id}`,
        rawId: driver.id,
        name: driver.name || driver.user?.displayName || "-",
        email: driver.email || driver.user?.email || "-",
        phone: driver.phone || "-",
        role: "DRIVER",
        roleLabel: ROLE_LABELS.DRIVER,
        status: driver.status || "AVAILABLE",
        statusLabel: STATUS_LABELS[driver.status] || driver.status || "-",

        // Motorista é equipe logística. Não entra em métricas de coleta.
        totalKg: 0,
        collectionsCount: 0,

        routesCount: driverRoutes.length,
        document: driver.cpf || driver.cnh || "-",
        createdAt: driver.createdAt,
      };
    });

    const collectorRows = collectors.map((collector) => {
      const collectorCollections = collections.filter(
        (collection) =>
          collection.collectorId === collector.id ||
          collection.collector?.id === collector.id
      );

      const totalKgFromCollections = collectorCollections.reduce(
        (sum, collection) => sum + Number(collection.totalWeightKg || 0),
        0
      );

      const totalKg =
        totalKgFromCollections > 0
          ? totalKgFromCollections
          : Number(collector.totalKg || 0);

      return {
        id: `collector-${collector.id}`,
        rawId: collector.id,
        name: collector.name || collector.user?.displayName || "-",
        email: collector.email || collector.user?.email || "-",
        phone: collector.phone || "-",
        role: "COLLECTOR",
        roleLabel: ROLE_LABELS.COLLECTOR,
        status: collector.status || "AVAILABLE",
        statusLabel: STATUS_LABELS[collector.status] || collector.status || "-",
        totalKg,
        collectionsCount:
          collectorCollections.length || Number(collector.collectionsToday || 0),
        routesCount: 0,
        document: collector.rg || "-",
        createdAt: collector.createdAt,
      };
    });

    return [...collectorRows, ...driverRows].map((item, index) => ({
      ...item,
      sn: index + 1,
    }));
  }, [drivers, collectors, collections, routes]);

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();

    return staffRows.filter((item) => {
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.phone.toLowerCase().includes(term) ||
        item.roleLabel.toLowerCase().includes(term);

      const matchesRole = !roleFilter || item.role === roleFilter;
      const matchesStatus = !statusFilter || item.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staffRows, search, roleFilter, statusFilter]);

  const collectorRowsOnly = useMemo(() => {
    return staffRows.filter((item) => item.role === "COLLECTOR");
  }, [staffRows]);

  const stats = useMemo(() => {
    const totalStaff = staffRows.length;
    const totalCollectors = staffRows.filter((item) => item.role === "COLLECTOR").length;
    const activeStaff = staffRows.filter((item) => item.status !== "INACTIVE").length;
    const onRouteStaff = staffRows.filter((item) => item.status === "ON_ROUTE").length;

    const totalKg = collectorRowsOnly.reduce(
      (sum, item) => sum + Number(item.totalKg || 0),
      0
    );

    return {
      totalStaff,
      totalCollectors,
      activeStaff,
      onRouteStaff,
      totalKg,
    };
  }, [staffRows, collectorRowsOnly]);

  const statusChartData = useMemo(() => {
    return Object.keys(STATUS_LABELS).map((status) => ({
      name: STATUS_LABELS[status],
      value: staffRows.filter((item) => item.status === status).length,
    }));
  }, [staffRows]);

  const productivityChartData = useMemo(() => {
    return collectorRowsOnly
      .sort((a, b) => Number(b.totalKg || 0) - Number(a.totalKg || 0))
      .slice(0, 8)
      .map((item) => ({
        name: item.name,
        kg: Number(item.totalKg || 0),
        coletas: Number(item.collectionsCount || 0),
      }));
  }, [collectorRowsOnly]);

  const columns = [
    { key: "sn", label: "Nº" },
    { key: "name", label: "Nome" },
    { key: "roleLabel", label: "Função" },
    {
      key: "totalKg",
      label: "Total coletado",
      render: (value, row) => (row.role === "COLLECTOR" ? formatKg(value) : "-"),
    },
    {
      key: "collectionsCount",
      label: "Coletas",
      render: (value, row) => (row.role === "COLLECTOR" ? value : "-"),
    },
    { key: "routesCount", label: "Rotas" },
    { key: "email", label: "E-mail" },
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
    Nome: item.name,
    Funcao: item.roleLabel,
    Status: item.statusLabel,
    Email: item.email,
    Telefone: item.phone,
    Documento: item.document,
    TotalKg: item.role === "COLLECTOR" ? item.totalKg : "",
    Coletas: item.role === "COLLECTOR" ? item.collectionsCount : "",
    Rotas: item.routesCount,
    Cadastro: safeDate(item.createdAt),
  }));

  return (
    <>
      <HeadTags title="Relatórios de Equipe" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Relatórios de Equipe</h3>

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
                  <li className="breadcrumb-item active">Relatórios de Equipe</li>
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
                  <Users color="#1A7E00" size={30} />
                </div>
                <div className="content">
                  <p className="title text-muted mb-1">Total da equipe</p>
                  <h3>{stats.totalStaff}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <div className="card p-25">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <UserCheck color="#1A7E00" size={30} />
                </div>
                <div className="content">
                  <p className="title text-muted mb-1">Catadores</p>
                  <h3>{stats.totalCollectors}</h3>
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
                  <p className="title text-muted mb-1">Em rota</p>
                  <h3>{stats.onRouteStaff}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <div className="card p-25">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <Truck color="#1A7E00" size={30} />
                </div>
                <div className="content">
                  <p className="title text-muted mb-1">Produção dos catadores</p>
                  <h3>{formatKg(stats.totalKg)}</h3>
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
              <h4 className="fw-600 fs-20 mb-0">
                Produtividade dos catadores
              </h4>
              <BarChart3 size={22} color="#1A7E00" />
            </div>

            <div style={{ width: "100%", height: 330 }}>
              <ResponsiveContainer>
                <BarChart data={productivityChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "kg" ? formatKg(value) : value,
                      name === "kg" ? "Kg coletados" : "Coletas",
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="kg"
                    name="Kg coletados"
                    fill="#1A7E00"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="coletas"
                    name="Coletas"
                    fill="#64B000"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-xl-5">
          <div className="card p-25 h-100">
            <h4 className="fw-600 fs-20 mb-3">Status da equipe</h4>

            <div style={{ width: "100%", height: 330 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
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
            <h4 className="fw-600 fs-20 mb-1">Tabela analítica da equipe</h4>
            <p className="text-muted mb-0">
              Catadores com produção de coleta e motoristas apenas com dados logísticos.
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
                placeholder="Buscar por nome, e-mail ou função..."
              />
            </div>

            <select
              className="form-control"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Todas as funções</option>
              <option value="COLLECTOR">Catadores</option>
              <option value="DRIVER">Motoristas</option>
            </select>

            <select
              className="form-control"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Todos os status</option>
              <option value="AVAILABLE">Disponível</option>
              <option value="ON_ROUTE">Em rota</option>
              <option value="INACTIVE">Inativo</option>
            </select>

            <button
              className="btn btn-outline-success d-flex align-items-center gap-8"
              onClick={() =>
                exportToExcel({
                  fileName: "relatorio-equipe-katua",
                  sheetName: "Equipe",
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
                  fileName: "relatorio-equipe-katua",
                  title: "Relatório de Equipe",
                  subtitle:
                    "Catadores com métricas de coleta e motoristas com dados logísticos",
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

export default StaffReports;