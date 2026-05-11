import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  Download,
  FileSpreadsheet,
  House,
  Package,
  PieChart as PieChartIcon,
  RefreshCcw,
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

const LOT_STATUS_LABELS = {
  AVAILABLE: "Disponível",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  DISCARDED: "Descartado",
};

const STAGE_LABELS = {
  TRIADO: "Triado",
  TRITURADO: "Triturado",
  PRENSADO: "Prensado",
  ENFARDADO: "Enfardado",
  ARMAZENADO: "Armazenado",
  DESTINADO: "Destinado",
};

const STATUS_COLORS = {
  AVAILABLE: "#1A7E00",
  RESERVED: "#2563EB",
  SOLD: "#64B000",
  DISCARDED: "#DC2626",
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

const getMaterialName = (material) =>
  material.type ||
  material.name ||
  material.materialName ||
  material.category ||
  "Material";

const getMaterialQuantity = (material) =>
  Number(material.quantityKg || material.quantity || material.kg || 0);

const lotStatusBadgeClass = (status) => {
  if (status === "AVAILABLE") return "status status-success";
  if (status === "RESERVED") return "status status-info";
  if (status === "SOLD") return "status status-success";
  if (status === "DISCARDED") return "status status-danger";
  return "status";
};

const WasteTypeReports = () => {
  const [collections, setCollections] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [stockLots, setStockLots] = useState([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [lotStatusFilter, setLotStatusFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);

    try {
      const [collectionsPayload, stockPayload] = await Promise.all([
        fetchJson("/collections"),
        fetchJson("/waste-stock"),
      ]);

      const collectionRows = normalizeArrayResponse(collectionsPayload, ["collections"]);

      const items =
        normalizeArrayResponse(stockPayload, ["items", "stockItems", "wasteStockItems"]) ||
        [];

      const lots =
        normalizeArrayResponse(stockPayload, ["lots", "stockLots", "wasteStockLots"]) ||
        [];

      const stockPayloadData = stockPayload?.data || {};

      setCollections(collectionRows);
      setStockItems(
        items.length
          ? items
          : normalizeArrayResponse(stockPayloadData, [
              "items",
              "stockItems",
              "wasteStockItems",
            ])
      );
      setStockLots(
        lots.length
          ? lots
          : normalizeArrayResponse(stockPayloadData, [
              "lots",
              "stockLots",
              "wasteStockLots",
            ])
      );
    } catch (error) {
      toast.error(error.message || "Erro ao carregar relatórios de tipos de resíduos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const collectionMaterialRows = useMemo(() => {
    const map = new Map();

    collections.forEach((collection) => {
      const materials = getMaterialEntries(collection.materials);

      materials.forEach((material) => {
        const name = getMaterialName(material);
        const quantity = getMaterialQuantity(material);

        const current =
          map.get(name) || {
            id: `collection-${name}`,
            name,
            category: material.category || "Coletas",
            totalKg: 0,
            lotsCount: 0,
            collectionsCount: 0,
            stage: "-",
            lotStatus: "-",
            origin: "Coletas realizadas",
            storageLocation: "-",
            lastDate: collection.collectedAt || collection.updatedAt || collection.createdAt,
          };

        current.totalKg += quantity;
        current.collectionsCount += 1;

        const currentDate = current.lastDate ? new Date(current.lastDate) : null;
        const newDate = collection.collectedAt
          ? new Date(collection.collectedAt)
          : new Date(collection.updatedAt || collection.createdAt);

        if (!currentDate || newDate > currentDate) {
          current.lastDate = collection.collectedAt || collection.updatedAt || collection.createdAt;
        }

        map.set(name, current);
      });
    });

    return Array.from(map.values());
  }, [collections]);

  const stockRows = useMemo(() => {
    if (stockLots.length) {
      return stockLots.map((lot) => {
        const item =
          lot.stockItem ||
          stockItems.find((stockItem) => stockItem.id === lot.stockItemId) ||
          {};

        return {
          id: lot.id,
          name: item.name || lot.materialName || "Material",
          category: item.category || lot.category || "-",
          totalKg: Number(lot.quantityKg || 0),
          lotsCount: 1,
          collectionsCount: 0,
          stage: lot.processingStage || "-",
          lotStatus: lot.status || "-",
          origin: lot.origin || "-",
          storageLocation: lot.storageLocation || "-",
          lotCode: lot.lotCode || "-",
          lastDate: lot.updatedAt || lot.createdAt,
        };
      });
    }

    return stockItems.map((item) => ({
      id: item.id,
      name: item.name || "Material",
      category: item.category || "-",
      totalKg: 0,
      lotsCount: Array.isArray(item.lots) ? item.lots.length : 0,
      collectionsCount: 0,
      stage: "-",
      lotStatus: item.status || "-",
      origin: "-",
      storageLocation: "-",
      lotCode: "-",
      lastDate: item.updatedAt || item.createdAt,
    }));
  }, [stockItems, stockLots]);

  const rows = useMemo(() => {
    const merged = [...stockRows];

    collectionMaterialRows.forEach((collectionMaterial) => {
      const existingIndex = merged.findIndex(
        (item) => item.name?.toLowerCase() === collectionMaterial.name?.toLowerCase()
      );

      if (existingIndex >= 0) {
        merged[existingIndex] = {
          ...merged[existingIndex],
          totalKg:
            Number(merged[existingIndex].totalKg || 0) +
            Number(collectionMaterial.totalKg || 0),
          collectionsCount:
            Number(merged[existingIndex].collectionsCount || 0) +
            Number(collectionMaterial.collectionsCount || 0),
        };
      } else {
        merged.push(collectionMaterial);
      }
    });

    return merged.map((item, index) => ({
      ...item,
      sn: index + 1,
      stageLabel: STAGE_LABELS[item.stage] || item.stage || "-",
      lotStatusLabel: LOT_STATUS_LABELS[item.lotStatus] || item.lotStatus || "-",
    }));
  }, [stockRows, collectionMaterialRows]);

  const categories = useMemo(() => {
    return Array.from(new Set(rows.map((item) => item.category).filter(Boolean)));
  }, [rows]);

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((item) => {
      const matchesSearch =
        !term ||
        String(item.name || "").toLowerCase().includes(term) ||
        String(item.category || "").toLowerCase().includes(term) ||
        String(item.origin || "").toLowerCase().includes(term) ||
        String(item.storageLocation || "").toLowerCase().includes(term) ||
        String(item.lotCode || "").toLowerCase().includes(term);

      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      const matchesStage = !stageFilter || item.stage === stageFilter;
      const matchesLotStatus = !lotStatusFilter || item.lotStatus === lotStatusFilter;

      return matchesSearch && matchesCategory && matchesStage && matchesLotStatus;
    });
  }, [rows, search, categoryFilter, stageFilter, lotStatusFilter]);

  const stats = useMemo(() => {
    const totalMaterials = filteredData.length;

    const totalKg = filteredData.reduce(
      (sum, item) => sum + Number(item.totalKg || 0),
      0
    );

    const totalLots = filteredData.reduce(
      (sum, item) => sum + Number(item.lotsCount || 0),
      0
    );

    const totalCategories = new Set(filteredData.map((item) => item.category).filter(Boolean)).size;

    return {
      totalMaterials,
      totalKg,
      totalLots,
      totalCategories,
    };
  }, [filteredData]);

  const materialPieData = useMemo(() => {
    return filteredData
      .filter((item) => Number(item.totalKg || 0) > 0)
      .sort((a, b) => Number(b.totalKg || 0) - Number(a.totalKg || 0))
      .slice(0, 8)
      .map((item) => ({
        name: item.name,
        value: Number(item.totalKg || 0),
      }));
  }, [filteredData]);

  const categoryChartData = useMemo(() => {
    const map = new Map();

    filteredData.forEach((item) => {
      const key = item.category || "Sem categoria";
      const current = map.get(key) || { name: key, kg: 0, materiais: 0 };

      current.kg += Number(item.totalKg || 0);
      current.materiais += 1;

      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.kg - a.kg);
  }, [filteredData]);

  const stageChartData = useMemo(() => {
    const map = new Map();

    filteredData.forEach((item) => {
      const key = item.stageLabel || "Sem etapa";
      const current = map.get(key) || { name: key, kg: 0 };

      current.kg += Number(item.totalKg || 0);

      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.kg - a.kg);
  }, [filteredData]);

  const lotStatusChartData = useMemo(() => {
    return Object.keys(LOT_STATUS_LABELS).map((status) => ({
      name: LOT_STATUS_LABELS[status],
      value: filteredData.filter((item) => item.lotStatus === status).length,
      status,
    }));
  }, [filteredData]);

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setStageFilter("");
    setLotStatusFilter("");
    setCurrentPage(1);
  };

  const columns = [
    { key: "sn", label: "Nº" },
    { key: "name", label: "Material" },
    { key: "category", label: "Categoria" },
    {
      key: "totalKg",
      label: "Quantidade",
      render: (value) => formatKg(value),
    },
    { key: "lotsCount", label: "Lotes" },
    { key: "collectionsCount", label: "Coletas" },
    { key: "stageLabel", label: "Etapa" },
    { key: "storageLocation", label: "Armazenamento" },
    { key: "origin", label: "Origem" },
    {
      key: "lotStatus",
      label: "Status",
      render: (value) => (
        <span className={lotStatusBadgeClass(value)}>
          {LOT_STATUS_LABELS[value] || value || "-"}
        </span>
      ),
    },
    {
      key: "lastDate",
      label: "Atualização",
      render: (value) => safeDate(value),
    },
  ];

  const exportRows = filteredData.map((item) => ({
    Material: item.name,
    Categoria: item.category,
    QuantidadeKg: item.totalKg,
    Lotes: item.lotsCount,
    Coletas: item.collectionsCount,
    Etapa: item.stageLabel,
    Armazenamento: item.storageLocation,
    Origem: item.origin,
    CodigoLote: item.lotCode,
    Status: item.lotStatusLabel,
    Atualizacao: safeDate(item.lastDate),
  }));

  return (
    <>
      <HeadTags title="Relatórios de Tipos de Resíduos" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Relatórios de Tipos de Resíduos</h3>

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
                    Relatórios de Tipos de Resíduos
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
                  <p className="title text-muted mb-1">Materiais</p>
                  <h3>{stats.totalMaterials}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <div className="card p-25">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <Package color="#1A7E00" size={30} />
                </div>
                <div className="content">
                  <p className="title text-muted mb-1">Volume total</p>
                  <h3>{formatKg(stats.totalKg)}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <div className="card p-25">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <Boxes color="#1A7E00" size={30} />
                </div>
                <div className="content">
                  <p className="title text-muted mb-1">Lotes</p>
                  <h3>{stats.totalLots}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <div className="card p-25">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <PieChartIcon color="#1A7E00" size={30} />
                </div>
                <div className="content">
                  <p className="title text-muted mb-1">Categorias</p>
                  <h3>{stats.totalCategories}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-25 mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-15 mb-3">
          <div>
            <h4 className="fw-600 fs-20 mb-1">Filtros de materiais</h4>
            <p className="text-muted mb-0">
              Analise resíduos por categoria, etapa, status de lote e origem.
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
                placeholder="Buscar material, categoria, origem..."
              />
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <select
              className="form-control"
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Todas as categorias</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6 col-xl-3">
            <select
              className="form-control"
              value={stageFilter}
              onChange={(event) => {
                setStageFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Todas as etapas</option>
              <option value="TRIADO">Triado</option>
              <option value="TRITURADO">Triturado</option>
              <option value="PRENSADO">Prensado</option>
              <option value="ENFARDADO">Enfardado</option>
              <option value="ARMAZENADO">Armazenado</option>
              <option value="DESTINADO">Destinado</option>
            </select>
          </div>

          <div className="col-md-6 col-xl-3">
            <select
              className="form-control"
              value={lotStatusFilter}
              onChange={(event) => {
                setLotStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Todos os status</option>
              <option value="AVAILABLE">Disponível</option>
              <option value="RESERVED">Reservado</option>
              <option value="SOLD">Vendido</option>
              <option value="DISCARDED">Descartado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-5">
          <div className="card p-25 h-100">
            <h4 className="fw-600 fs-20 mb-3">Participação por material</h4>

            <div style={{ width: "100%", height: 330 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={materialPieData} dataKey="value" nameKey="name" outerRadius={110} label>
                    {materialPieData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={
                          [
                            "#1A7E00",
                            "#64B000",
                            "#2563EB",
                            "#F59E0B",
                            "#0F766E",
                            "#16A34A",
                            "#84CC16",
                            "#22C55E",
                          ][index % 8]
                        }
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

        <div className="col-xl-7">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h4 className="fw-600 fs-20 mb-0">Volume por categoria</h4>
              <BarChart3 size={22} color="#1A7E00" />
            </div>

            <div style={{ width: "100%", height: 330 }}>
              <ResponsiveContainer>
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "kg" ? formatKg(value) : value,
                      name === "kg" ? "Kg" : "Materiais",
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="kg" name="Kg" fill="#1A7E00" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="materiais" name="Materiais" fill="#64B000" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-xl-7">
          <div className="card p-25 h-100">
            <h4 className="fw-600 fs-20 mb-3">Volume por etapa de processamento</h4>

            <div style={{ width: "100%", height: 330 }}>
              <ResponsiveContainer>
                <BarChart data={stageChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatKg(value)} />
                  <Legend />
                  <Bar dataKey="kg" name="Kg por etapa" fill="#1A7E00" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-xl-5">
          <div className="card p-25 h-100">
            <h4 className="fw-600 fs-20 mb-3">Status dos lotes</h4>

            <div style={{ width: "100%", height: 330 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={lotStatusChartData} dataKey="value" nameKey="name" outerRadius={110} label>
                    {lotStatusChartData.map((entry) => (
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
      </div>

      <div className="card p-25 mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-15 mb-3">
          <div>
            <h4 className="fw-600 fs-20 mb-1">Tabela analítica de tipos de resíduos</h4>
            <p className="text-muted mb-0">
              Material, categoria, quantidade, lotes, etapa, origem e status.
            </p>
          </div>

          <div className="d-flex align-items-center flex-wrap gap-10">
            <button
              className="btn btn-outline-success d-flex align-items-center gap-8"
              onClick={() =>
                exportToExcel({
                  fileName: "relatorio-tipos-residuos-katua",
                  sheetName: "Residuos",
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
                  fileName: "relatorio-tipos-residuos-katua",
                  title: "Relatório de Tipos de Resíduos",
                  subtitle: "Materiais, lotes e processamento",
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

export default WasteTypeReports;