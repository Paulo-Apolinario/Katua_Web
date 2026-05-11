import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Download,
  FileSpreadsheet,
  House,
  PackageCheck,
  RefreshCcw,
  Route,
  Search,
  Trash2,
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
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

const STATUS_COLORS = {
  PENDING: "#F59E0B",
  IN_PROGRESS: "#2563EB",
  COMPLETED: "#1A7E00",
  CANCELLED: "#DC2626",
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

const getDateKey = (value) => {
  if (!value) return "Sem data";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Sem data";

  return date.toLocaleDateString("pt-BR", {
    month: "2-digit",
    year: "2-digit",
  });
};

const getMaterialEntries = (materials) => {
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

const getMaterialsLabel = (materials) => {
  const entries = getMaterialEntries(materials);

  if (!entries.length) return "-";

  return entries
    .map((material) => {
      const name =
        material.type ||
        material.name ||
        material.materialName ||
        material.category ||
        "Material";

      const kg = Number(material.quantityKg || material.quantity || material.kg || 0);

      return `${name}${kg ? ` (${formatKg(kg)})` : ""}`;
    })
    .join(", ");
};

const getMaterialQuantity = (material) =>
  Number(material.quantityKg || material.quantity || material.kg || 0);

const statusBadgeClass = (status) => {
  if (status === "COMPLETED") return "status status-success";
  if (status === "IN_PROGRESS") return "status status-info";
  if (status === "PENDING") return "status status-warning";
  if (status === "CANCELLED") return "status status-danger";
  return "status";
};

const WasteCollectionReports = () => {
  const [collections, setCollections] = useState([]);
  const [generators, setGenerators] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [generatorFilter, setGeneratorFilter] = useState("");
  const [collectorFilter, setCollectorFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);

    try {
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

      setCollections(normalizeArrayResponse(collectionsPayload, ["collections"]));
      setGenerators(normalizeArrayResponse(generatorsPayload, ["generators"]));
      setCollectors(normalizeArrayResponse(collectorsPayload, ["collectors"]));
      setDrivers(normalizeArrayResponse(driversPayload, ["drivers"]));
      setVehicles(normalizeArrayResponse(vehiclesPayload, ["vehicles"]));
      setRoutes(normalizeArrayResponse(routesPayload, ["routes"]));
    } catch (error) {
      toast.error(error.message || "Erro ao carregar relatórios de coleta.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const rows = useMemo(() => {
    return collections.map((collection, index) => {
      const generator =
        collection.generator ||
        generators.find((item) => item.id === collection.generatorId);

      const collector =
        collection.collector ||
        collectors.find((item) => item.id === collection.collectorId);

      const driver =
        collection.driver ||
        drivers.find((item) => item.id === collection.driverId);

      const vehicle =
        collection.vehicle ||
        vehicles.find((item) => item.id === collection.vehicleId);

      const route =
        collection.route ||
        routes.find((item) => item.id === collection.routeId);

      const collectedDate = collection.collectedAt || collection.updatedAt || collection.createdAt;

      return {
        sn: index + 1,
        id: collection.id,
        generatorId: generator?.id || "",
        generatorName: generator?.companyName || generator?.name || "-",
        generatorType: generator?.type || "-",
        collectorId: collector?.id || "",
        collectorName: collector?.name || "-",
        driverId: driver?.id || "",
        driverName: driver?.name || "-",
        vehicleId: vehicle?.id || "",
        vehiclePlate: vehicle?.plate || "-",
        routeId: route?.id || "",
        routeName: route?.name || "-",
        totalWeightKg: Number(collection.totalWeightKg || 0),
        materials: getMaterialsLabel(collection.materials),
        rawMaterials: getMaterialEntries(collection.materials),
        status: collection.status || "PENDING",
        statusLabel: STATUS_LABELS[collection.status] || collection.status || "-",
        collectedAt: collectedDate,
        notes: collection.notes || "-",
      };
    });
  }, [collections, generators, collectors, drivers, vehicles, routes]);

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();

    const startDate = startDateFilter ? new Date(`${startDateFilter}T00:00:00`) : null;
    const endDate = endDateFilter ? new Date(`${endDateFilter}T23:59:59`) : null;

    return rows.filter((item) => {
      const itemDate = item.collectedAt ? new Date(item.collectedAt) : null;

      const matchesSearch =
        !term ||
        item.generatorName.toLowerCase().includes(term) ||
        item.collectorName.toLowerCase().includes(term) ||
        item.driverName.toLowerCase().includes(term) ||
        item.vehiclePlate.toLowerCase().includes(term) ||
        item.routeName.toLowerCase().includes(term) ||
        item.materials.toLowerCase().includes(term);

      const matchesStatus = !statusFilter || item.status === statusFilter;
      const matchesGenerator = !generatorFilter || item.generatorId === generatorFilter;
      const matchesCollector = !collectorFilter || item.collectorId === collectorFilter;
      const matchesDriver = !driverFilter || item.driverId === driverFilter;
      const matchesRoute = !routeFilter || item.routeId === routeFilter;

      const matchesStart =
        !startDate || (itemDate && itemDate.getTime() >= startDate.getTime());

      const matchesEnd =
        !endDate || (itemDate && itemDate.getTime() <= endDate.getTime());

      return (
        matchesSearch &&
        matchesStatus &&
        matchesGenerator &&
        matchesCollector &&
        matchesDriver &&
        matchesRoute &&
        matchesStart &&
        matchesEnd
      );
    });
  }, [
    rows,
    search,
    statusFilter,
    generatorFilter,
    collectorFilter,
    driverFilter,
    routeFilter,
    startDateFilter,
    endDateFilter,
  ]);

  const stats = useMemo(() => {
    const totalCollections = filteredData.length;

    const totalKg = filteredData.reduce(
      (sum, item) => sum + Number(item.totalWeightKg || 0),
      0
    );

    const completedCollections = filteredData.filter(
      (item) => item.status === "COMPLETED"
    ).length;

    const activeRoutes = new Set(
      filteredData.filter((item) => item.routeId).map((item) => item.routeId)
    ).size;

    return {
      totalCollections,
      totalKg,
      completedCollections,
      activeRoutes,
    };
  }, [filteredData]);

  const collectionsByMonth = useMemo(() => {
    const map = new Map();

    filteredData.forEach((item) => {
      const key = getDateKey(item.collectedAt);
      const current = map.get(key) || { name: key, kg: 0, coletas: 0 };

      current.kg += Number(item.totalWeightKg || 0);
      current.coletas += 1;

      map.set(key, current);
    });

    return Array.from(map.values());
  }, [filteredData]);

  const statusChartData = useMemo(() => {
    return Object.keys(STATUS_LABELS).map((status) => ({
      name: STATUS_LABELS[status],
      value: filteredData.filter((item) => item.status === status).length,
      status,
    }));
  }, [filteredData]);

  const generatorChartData = useMemo(() => {
    const map = new Map();

    filteredData.forEach((item) => {
      const key = item.generatorName || "Sem gerador";
      const current = map.get(key) || { name: key, kg: 0 };

      current.kg += Number(item.totalWeightKg || 0);

      map.set(key, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 8);
  }, [filteredData]);

  const materialChartData = useMemo(() => {
    const map = new Map();

    filteredData.forEach((item) => {
      item.rawMaterials.forEach((material) => {
        const name =
          material.type ||
          material.name ||
          material.materialName ||
          material.category ||
          "Material";

        const quantity = getMaterialQuantity(material);

        const current = map.get(name) || { name, kg: 0 };
        current.kg += quantity;

        map.set(name, current);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 8);
  }, [filteredData]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setGeneratorFilter("");
    setCollectorFilter("");
    setDriverFilter("");
    setRouteFilter("");
    setStartDateFilter("");
    setEndDateFilter("");
    setCurrentPage(1);
  };

  const columns = [
    { key: "sn", label: "Nº" },
    { key: "generatorName", label: "Gerador" },
    { key: "collectorName", label: "Catador" },
    { key: "driverName", label: "Motorista" },
    { key: "vehiclePlate", label: "Veículo" },
    { key: "routeName", label: "Rota" },
    {
      key: "totalWeightKg",
      label: "Peso",
      render: (value) => formatKg(value),
    },
    { key: "materials", label: "Materiais" },
    {
      key: "collectedAt",
      label: "Data",
      render: (value) => safeDate(value),
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
  ];

  const exportRows = filteredData.map((item) => ({
    Gerador: item.generatorName,
    TipoGerador: item.generatorType,
    Catador: item.collectorName,
    Motorista: item.driverName,
    Veiculo: item.vehiclePlate,
    Rota: item.routeName,
    PesoKg: item.totalWeightKg,
    Materiais: item.materials,
    Status: item.statusLabel,
    Data: safeDate(item.collectedAt),
    Observacoes: item.notes,
  }));

  return (
    <>
      <HeadTags title="Relatórios de Coleta de Resíduos" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Relatórios de Coleta de Resíduos</h3>

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
                  <li className="breadcrumb-item active">
                    Relatórios de Coleta de Resíduos
                  </li>
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
                  <Trash2 color="#1A7E00" size={30} />
                </div>
                <div className="content">
                  <p className="title text-muted mb-1">Total de coletas</p>
                  <h3>{stats.totalCollections}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <div className="card p-25">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <PackageCheck color="#1A7E00" size={30} />
                </div>
                <div className="content">
                  <p className="title text-muted mb-1">Total coletado</p>
                  <h3>{formatKg(stats.totalKg)}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <div className="card p-25">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <CalendarDays color="#1A7E00" size={30} />
                </div>
                <div className="content">
                  <p className="title text-muted mb-1">Concluídas</p>
                  <h3>{stats.completedCollections}</h3>
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
                  <p className="title text-muted mb-1">Rotas vinculadas</p>
                  <h3>{stats.activeRoutes}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-25 mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-15 mb-3">
          <div>
            <h4 className="fw-600 fs-20 mb-1">Filtros operacionais</h4>
            <p className="text-muted mb-0">
              Refine os relatórios por período, status, gerador, equipe e rota.
            </p>
          </div>

          <button className="btn btn-outline-success" onClick={clearFilters}>
            Limpar filtros
          </button>
        </div>

        <div className="row g-3">
          <div className="col-md-6 col-xl-3">
            <div className="filter-section search w-100">
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
                placeholder="Buscar por gerador, equipe, rota..."
              />
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <select
              className="form-control"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Todos os status</option>
              <option value="PENDING">Pendente</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="COMPLETED">Concluída</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>

          <div className="col-md-6 col-xl-3">
            <select
              className="form-control"
              value={generatorFilter}
              onChange={(event) => {
                setGeneratorFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Todos os geradores</option>
              {generators.map((generator) => (
                <option key={generator.id} value={generator.id}>
                  {generator.companyName || generator.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6 col-xl-3">
            <select
              className="form-control"
              value={collectorFilter}
              onChange={(event) => {
                setCollectorFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Todos os catadores</option>
              {collectors.map((collector) => (
                <option key={collector.id} value={collector.id}>
                  {collector.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6 col-xl-3">
            <select
              className="form-control"
              value={driverFilter}
              onChange={(event) => {
                setDriverFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Todos os motoristas</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6 col-xl-3">
            <select
              className="form-control"
              value={routeFilter}
              onChange={(event) => {
                setRouteFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Todas as rotas</option>
              {routes.map((routeItem) => (
                <option key={routeItem.id} value={routeItem.id}>
                  {routeItem.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6 col-xl-3">
            <input
              className="form-control"
              type="date"
              value={startDateFilter}
              onChange={(event) => {
                setStartDateFilter(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="col-md-6 col-xl-3">
            <input
              className="form-control"
              type="date"
              value={endDateFilter}
              onChange={(event) => {
                setEndDateFilter(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-7">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h4 className="fw-600 fs-20 mb-0">Evolução de coletas por período</h4>
              <BarChart3 size={22} color="#1A7E00" />
            </div>

            <div style={{ width: "100%", height: 330 }}>
              <ResponsiveContainer>
                <BarChart data={collectionsByMonth}>
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
                  <Bar dataKey="kg" name="Kg coletados" fill="#1A7E00" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="coletas" name="Coletas" fill="#64B000" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-xl-5">
          <div className="card p-25 h-100">
            <h4 className="fw-600 fs-20 mb-3">Coletas por status</h4>

            <div style={{ width: "100%", height: 330 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusChartData} dataKey="value" nameKey="name" outerRadius={110} label>
                    {statusChartData.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#1A7E00"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="card p-25 h-100">
            <h4 className="fw-600 fs-20 mb-3">Maiores geradores por volume</h4>

            <div style={{ width: "100%", height: 330 }}>
              <ResponsiveContainer>
                <BarChart data={generatorChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatKg(value)} />
                  <Legend />
                  <Bar dataKey="kg" name="Kg coletados" fill="#1A7E00" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="card p-25 h-100">
            <h4 className="fw-600 fs-20 mb-3">Materiais coletados</h4>

            <div style={{ width: "100%", height: 330 }}>
              <ResponsiveContainer>
                <BarChart data={materialChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatKg(value)} />
                  <Legend />
                  <Bar dataKey="kg" name="Kg por material" fill="#64B000" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-25 mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-15 mb-3">
          <div>
            <h4 className="fw-600 fs-20 mb-1">Tabela analítica de coletas</h4>
            <p className="text-muted mb-0">
              Gerador, catador, motorista, veículo, rota, materiais, peso e status.
            </p>
          </div>

          <div className="d-flex align-items-center flex-wrap gap-10">
            <button
              className="btn btn-outline-success d-flex align-items-center gap-8"
              onClick={() =>
                exportToExcel({
                  fileName: "relatorio-coletas-katua",
                  sheetName: "Coletas",
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
                  fileName: "relatorio-coletas-katua",
                  title: "Relatório de Coletas",
                  subtitle: "Coletas operacionais",
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

export default WasteCollectionReports;