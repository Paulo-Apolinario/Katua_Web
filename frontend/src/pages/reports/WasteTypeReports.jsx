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
import { getAllWasteTypes } from "../../services/wasteTypeService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const LOT_STATUS_LABELS = {
  AVAILABLE: "Disponível",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  DISCARDED: "Descartado",
};

const ITEM_STATUS_LABELS = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};

const STAGE_LABELS = {
  TRIADO: "Triado",
  TRITURADO: "Triturado",
  PRENSADO: "Prensado",
  ENFARDADO: "Enfardado",
  ARMAZENADO: "Armazenado",
  DESTINADO: "Destinado",
};

const SOURCE_LABELS = {
  STOCK: "Estoque",
  COLLECTION: "Coletas",
  BOTH: "Estoque + Coletas",
};

const CHART_COLORS = [
  "#1A7E00",
  "#64B000",
  "#2563EB",
  "#F59E0B",
  "#DC2626",
  "#0F766E",
  "#16A34A",
  "#84CC16",
];

const getToken = () => localStorage.getItem("auth_token");

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
    throw new Error(
      payload?.message || payload?.error || "Erro ao buscar dados."
    );
  }

  return payload;
};

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.stock)) return response.stock;
  if (Array.isArray(response?.collections)) return response.collections;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;

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

const getLotsTotalKg = (lots = []) => {
  return lots.reduce((sum, lot) => {
    if (lot?.status === "DISCARDED") return sum;
    return sum + Number(lot?.quantityKg || 0);
  }, 0);
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

const getMaterialName = (material) => {
  return (
    material?.type ||
    material?.name ||
    material?.materialName ||
    material?.category ||
    "Material"
  );
};

const getMaterialCategory = (material) => {
  return material?.category || material?.type || "Coletas";
};

const getMaterialQuantity = (material) => {
  return Number(
    material?.quantityKg ||
      material?.quantity ||
      material?.kg ||
      material?.weightKg ||
      0
  );
};

const getUniqueText = (items = []) => {
  const values = items
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  const unique = Array.from(new Set(values));

  return unique.length ? unique.join(", ") : "-";
};

const getStatusClass = (status) => {
  if (status === "ACTIVE" || status === "AVAILABLE" || status === "SOLD") {
    return "status status-success";
  }

  if (status === "RESERVED") return "status status-info";

  if (status === "DISCARDED" || status === "INACTIVE") {
    return "status status-danger";
  }

  return "status";
};

const getDominantStage = (lots = []) => {
  if (!lots.length) return "-";

  const map = new Map();

  lots.forEach((lot) => {
    const stage = lot?.processingStage || "-";
    const current = map.get(stage) || 0;

    map.set(stage, current + Number(lot?.quantityKg || 0));
  });

  return (
    Array.from(map.entries()).sort((a, b) => b[1] - a[1])?.[0]?.[0] || "-"
  );
};

const getLastDate = (item, lots = []) => {
  const dates = [
    item?.updatedAt,
    item?.createdAt,
    ...lots.map((lot) => lot?.updatedAt || lot?.createdAt),
  ]
    .filter(Boolean)
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (!dates.length) return null;

  return new Date(
    Math.max(...dates.map((date) => date.getTime()))
  ).toISOString();
};

const WasteTypeReports = () => {
  const [wasteTypes, setWasteTypes] = useState([]);
  const [collections, setCollections] = useState([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [lotStatusFilter, setLotStatusFilter] = useState("");
  const [itemStatusFilter, setItemStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    try {
      setLoading(true);

      const [stockResponse, collectionsResponse] = await Promise.all([
        getAllWasteTypes(),
        fetchJson("/collections"),
      ]);

      const stock = getArray(stockResponse);
      const collectionRows = getArray(collectionsResponse);

      const normalizedStock = stock.map((item, index) => {
        const lots = Array.isArray(item?.lots) ? item.lots : [];

        const totalQuantityKg =
          item?.totalQuantityKg !== undefined
            ? Number(item.totalQuantityKg || 0)
            : getLotsTotalKg(lots);

        const availableLots = lots.filter(
          (lot) => lot.status === "AVAILABLE"
        ).length;

        const reservedLots = lots.filter(
          (lot) => lot.status === "RESERVED"
        ).length;

        const soldLots = lots.filter((lot) => lot.status === "SOLD").length;

        const discardedLots = lots.filter(
          (lot) => lot.status === "DISCARDED"
        ).length;

        const dominantStage = getDominantStage(lots);

        return {
          ...item,
          sn: index + 1,
          lots,
          source: "STOCK",
          sourceLabel: SOURCE_LABELS.STOCK,
          totalStockKg: totalQuantityKg,
          totalCollectedKg: 0,
          totalKg: totalQuantityKg,
          totalQuantityKg,
          collectionsCount: 0,
          lotsCount:
            item?.lotsCount !== undefined ? item.lotsCount : lots.length,
          availableLots,
          reservedLots,
          soldLots,
          discardedLots,
          dominantStage,
          dominantStageLabel:
            STAGE_LABELS[dominantStage] || dominantStage || "-",
          storageLocation: getUniqueText(
            lots.map((lot) => lot?.storageLocation)
          ),
          origin: getUniqueText(lots.map((lot) => lot?.origin)),
          lotCodes: getUniqueText(lots.map((lot) => lot?.lotCode)),
          lastDate: getLastDate(item, lots),
          status: item?.status || "ACTIVE",
        };
      });

      setWasteTypes(normalizedStock);
      setCollections(collectionRows);
    } catch (error) {
      console.error("Erro ao carregar relatório de tipos de resíduos:", error);
      toast.error(
        error?.message || "Erro ao carregar relatório de tipos de resíduos."
      );
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
      const materials = normalizeMaterials(collection.materials);

      materials.forEach((material) => {
        const name = getMaterialName(material);
        const normalizedName = String(name || "Material").toLowerCase();
        const quantity = getMaterialQuantity(material);

        if (!quantity || quantity <= 0) return;

        const category = getMaterialCategory(material);
        const collectionDate =
          collection.collectedAt || collection.updatedAt || collection.createdAt;

        const generatorName =
          collection?.generator?.companyName ||
          collection?.generator?.name ||
          collection?.schedule?.generator?.companyName ||
          collection?.schedule?.generator?.name ||
          "Gerador não informado";

        const collectorName =
          collection?.collector?.name || "Catador não informado";

        const current =
          map.get(normalizedName) || {
            id: `collection-${normalizedName}`,
            name,
            category,
            description: "Material registrado em coletas realizadas.",
            lots: [],
            source: "COLLECTION",
            sourceLabel: SOURCE_LABELS.COLLECTION,
            totalStockKg: 0,
            totalCollectedKg: 0,
            totalKg: 0,
            totalQuantityKg: 0,
            collectionsCount: 0,
            lotsCount: 0,
            availableLots: 0,
            reservedLots: 0,
            soldLots: 0,
            discardedLots: 0,
            dominantStage: "-",
            dominantStageLabel: "-",
            storageLocation: "-",
            origin: "Coletas realizadas",
            lotCodes: "-",
            status: "ACTIVE",
            generators: new Set(),
            collectors: new Set(),
            lastDate: collectionDate,
          };

        current.totalCollectedKg += quantity;
        current.totalKg += quantity;
        current.totalQuantityKg += quantity;
        current.collectionsCount += 1;

        current.generators.add(generatorName);
        current.collectors.add(collectorName);

        const currentDate = current.lastDate ? new Date(current.lastDate) : null;
        const newDate = collectionDate ? new Date(collectionDate) : null;

        if (
          newDate &&
          !Number.isNaN(newDate.getTime()) &&
          (!currentDate || newDate > currentDate)
        ) {
          current.lastDate = collectionDate;
        }

        map.set(normalizedName, current);
      });
    });

    return Array.from(map.values()).map((item) => ({
      ...item,
      generatorsText: getUniqueText(Array.from(item.generators || [])),
      collectorsText: getUniqueText(Array.from(item.collectors || [])),
    }));
  }, [collections]);

  const mergedRows = useMemo(() => {
    const map = new Map();

    wasteTypes.forEach((item) => {
      const key = String(item.name || "Material").toLowerCase();

      map.set(key, {
        ...item,
        source: "STOCK",
        sourceLabel: SOURCE_LABELS.STOCK,
        generatorsText: "-",
        collectorsText: "-",
      });
    });

    collectionMaterialRows.forEach((collectionItem) => {
      const key = String(collectionItem.name || "Material").toLowerCase();
      const existing = map.get(key);

      if (!existing) {
        map.set(key, collectionItem);
        return;
      }

      const mergedSource =
        Number(existing.totalStockKg || 0) > 0 &&
        Number(collectionItem.totalCollectedKg || 0) > 0
          ? "BOTH"
          : existing.source || collectionItem.source;

      map.set(key, {
        ...existing,
        source: mergedSource,
        sourceLabel: SOURCE_LABELS[mergedSource],
        totalStockKg: Number(existing.totalStockKg || 0),
        totalCollectedKg: Number(collectionItem.totalCollectedKg || 0),
        totalKg:
          Number(existing.totalStockKg || 0) +
          Number(collectionItem.totalCollectedKg || 0),
        totalQuantityKg:
          Number(existing.totalStockKg || 0) +
          Number(collectionItem.totalCollectedKg || 0),
        collectionsCount:
          Number(existing.collectionsCount || 0) +
          Number(collectionItem.collectionsCount || 0),
        generatorsText: collectionItem.generatorsText || "-",
        collectorsText: collectionItem.collectorsText || "-",
        lastDate:
          new Date(collectionItem.lastDate || 0) >
          new Date(existing.lastDate || 0)
            ? collectionItem.lastDate
            : existing.lastDate,
      });
    });

    return Array.from(map.values()).map((item, index) => ({
      ...item,
      sn: index + 1,
    }));
  }, [wasteTypes, collectionMaterialRows]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(mergedRows.map((item) => item.category).filter(Boolean))
    ).sort();
  }, [mergedRows]);

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();

    return mergedRows.filter((item) => {
      const lotsText = (item?.lots || [])
        .map((lot) =>
          [
            lot?.lotCode,
            lot?.storageLocation,
            lot?.origin,
            lot?.processingStage,
            lot?.status,
          ]
            .filter(Boolean)
            .join(" ")
        )
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !term ||
        String(item?.name || "").toLowerCase().includes(term) ||
        String(item?.category || "").toLowerCase().includes(term) ||
        String(item?.description || "").toLowerCase().includes(term) ||
        String(item?.storageLocation || "").toLowerCase().includes(term) ||
        String(item?.origin || "").toLowerCase().includes(term) ||
        String(item?.lotCodes || "").toLowerCase().includes(term) ||
        String(item?.generatorsText || "").toLowerCase().includes(term) ||
        String(item?.collectorsText || "").toLowerCase().includes(term) ||
        lotsText.includes(term);

      const matchesCategory =
        !categoryFilter || item.category === categoryFilter;

      const matchesStage =
        !stageFilter ||
        item.dominantStage === stageFilter ||
        (item?.lots || []).some((lot) => lot.processingStage === stageFilter);

      const matchesLotStatus =
        !lotStatusFilter ||
        (item?.lots || []).some((lot) => lot.status === lotStatusFilter);

      const matchesItemStatus =
        !itemStatusFilter || item.status === itemStatusFilter;

      const matchesSource =
        !sourceFilter || item.source === sourceFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStage &&
        matchesLotStatus &&
        matchesItemStatus &&
        matchesSource
      );
    });
  }, [
    mergedRows,
    search,
    categoryFilter,
    stageFilter,
    lotStatusFilter,
    itemStatusFilter,
    sourceFilter,
  ]);

  const stats = useMemo(() => {
    const totalMaterials = filteredData.length;

    const totalStockKg = filteredData.reduce(
      (sum, item) => sum + Number(item.totalStockKg || 0),
      0
    );

    const totalCollectedKg = filteredData.reduce(
      (sum, item) => sum + Number(item.totalCollectedKg || 0),
      0
    );

    const totalKg = totalStockKg + totalCollectedKg;

    const totalLots = filteredData.reduce(
      (sum, item) => sum + Number(item.lotsCount || 0),
      0
    );

    const totalCategories = new Set(
      filteredData.map((item) => item.category).filter(Boolean)
    ).size;

    const totalCollections = filteredData.reduce(
      (sum, item) => sum + Number(item.collectionsCount || 0),
      0
    );

    return {
      totalMaterials,
      totalStockKg,
      totalCollectedKg,
      totalKg,
      totalLots,
      totalCategories,
      totalCollections,
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

      const current = map.get(key) || {
        name: key,
        estoque: 0,
        coletado: 0,
        total: 0,
        materiais: 0,
      };

      current.estoque += Number(item.totalStockKg || 0);
      current.coletado += Number(item.totalCollectedKg || 0);
      current.total += Number(item.totalKg || 0);
      current.materiais += 1;

      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredData]);

  const stageChartData = useMemo(() => {
    const map = new Map();

    filteredData.forEach((item) => {
      const lots = Array.isArray(item.lots) ? item.lots : [];

      if (!lots.length) {
        const key = item.dominantStageLabel || "Sem etapa";

        const current = map.get(key) || {
          name: key,
          kg: 0,
        };

        current.kg += Number(item.totalStockKg || 0);

        map.set(key, current);
        return;
      }

      lots.forEach((lot) => {
        const stage = lot.processingStage || "-";
        const key = STAGE_LABELS[stage] || stage || "Sem etapa";

        const current = map.get(key) || {
          name: key,
          kg: 0,
        };

        current.kg += Number(lot.quantityKg || 0);

        map.set(key, current);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.kg - a.kg);
  }, [filteredData]);

  const lotStatusChartData = useMemo(() => {
    const map = new Map();

    Object.keys(LOT_STATUS_LABELS).forEach((status) => {
      map.set(status, {
        name: LOT_STATUS_LABELS[status],
        value: 0,
        status,
      });
    });

    filteredData.forEach((item) => {
      (item.lots || []).forEach((lot) => {
        const status = lot.status || "AVAILABLE";

        const current =
          map.get(status) || {
            name: LOT_STATUS_LABELS[status] || status,
            value: 0,
            status,
          };

        current.value += 1;

        map.set(status, current);
      });
    });

    return Array.from(map.values());
  }, [filteredData]);
    const sourceChartData = useMemo(() => {
    return [
      {
        name: "Estoque",
        value: filteredData.filter((item) => item.source === "STOCK").length,
      },
      {
        name: "Coletas",
        value: filteredData.filter((item) => item.source === "COLLECTION").length,
      },
      {
        name: "Estoque + Coletas",
        value: filteredData.filter((item) => item.source === "BOTH").length,
      },
    ];
  }, [filteredData]);

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setStageFilter("");
    setLotStatusFilter("");
    setItemStatusFilter("");
    setSourceFilter("");
    setCurrentPage(1);
  };

  const columns = [
    { key: "sn", label: "Nº" },
    {
      key: "name",
      label: "Material",
      render: (value, row) => (
        <div>
          <strong>{value || "N/A"}</strong>

          {row?.description ? (
            <p className="text-muted small mb-0">{row.description}</p>
          ) : null}

          <p className="text-muted small mb-0">
            Origem: <strong>{row.sourceLabel || "-"}</strong>
          </p>
        </div>
      ),
    },
    { key: "category", label: "Categoria" },
    {
      key: "totalStockKg",
      label: "Estoque",
      render: (value) => <strong>{formatKg(value)}</strong>,
    },
    {
      key: "totalCollectedKg",
      label: "Coletado",
      render: (value) => <strong>{formatKg(value)}</strong>,
    },
    {
      key: "totalKg",
      label: "Total geral",
      render: (value) => <strong>{formatKg(value)}</strong>,
    },
    { key: "lotsCount", label: "Lotes" },
    {
      key: "collectionsCount",
      label: "Coletas",
      render: (value) => Number(value || 0),
    },
    {
      key: "lotSituation",
      label: "Situação dos lotes",
      render: (_, row) => (
        <div>
          <p className="mb-0 small">
            Disponíveis: <strong>{row.availableLots || 0}</strong>
          </p>
          <p className="mb-0 small">
            Reservados: <strong>{row.reservedLots || 0}</strong>
          </p>
          <p className="mb-0 small">
            Vendidos: <strong>{row.soldLots || 0}</strong>
          </p>
          <p className="mb-0 small">
            Descartados: <strong>{row.discardedLots || 0}</strong>
          </p>
        </div>
      ),
    },
    { key: "dominantStageLabel", label: "Etapa principal" },
    { key: "storageLocation", label: "Armazenamento" },
    { key: "origin", label: "Origem" },
    {
      key: "generatorsText",
      label: "Geradores",
      render: (value) => value || "-",
    },
    {
      key: "collectorsText",
      label: "Catadores",
      render: (value) => value || "-",
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <span className={getStatusClass(value)}>
          {ITEM_STATUS_LABELS[value] || value || "-"}
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
    Descricao: item.description || "",
    OrigemDoDado: item.sourceLabel,
    EstoqueKg: item.totalStockKg,
    ColetadoKg: item.totalCollectedKg,
    TotalKg: item.totalKg,
    Lotes: item.lotsCount,
    Coletas: item.collectionsCount,
    Disponiveis: item.availableLots,
    Reservados: item.reservedLots,
    Vendidos: item.soldLots,
    Descartados: item.discardedLots,
    EtapaPrincipal: item.dominantStageLabel,
    Armazenamento: item.storageLocation,
    Origem: item.origin,
    CodigosLote: item.lotCodes,
    Geradores: item.generatorsText,
    Catadores: item.collectorsText,
    Status: ITEM_STATUS_LABELS[item.status] || item.status,
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
              disabled={loading}
            >
              <RefreshCcw size={17} />
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>
      </div>

      <div className="widget mb-4">
        <div className="row g-4">
          <div className="col-md-6 col-xl-3">
            <div className="card p-25 h-100">
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
            <div className="card p-25 h-100">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <Package color="#1A7E00" size={30} />
                </div>

                <div className="content">
                  <p className="title text-muted mb-1">Estoque</p>
                  <h3>{formatKg(stats.totalStockKg)}</h3>
                </div>
              </div>
            </div>
          </div>
                    <div className="col-md-6 col-xl-3">
            <div className="card p-25 h-100">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <Boxes color="#1A7E00" size={30} />
                </div>

                <div className="content">
                  <p className="title text-muted mb-1">Coletado</p>
                  <h3>{formatKg(stats.totalCollectedKg)}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <div className="card p-25 h-100">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <PieChartIcon color="#1A7E00" size={30} />
                </div>

                <div className="content">
                  <p className="title text-muted mb-1">Total geral</p>
                  <h3>{formatKg(stats.totalKg)}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4 mt-1">
          <div className="col-md-6 col-xl-3">
            <div className="card p-25 h-100">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <Package color="#1A7E00" size={30} />
                </div>

                <div className="content">
                  <p className="title text-muted mb-1">Lotes</p>
                  <h3>{stats.totalLots}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <div className="card p-25 h-100">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <Trash2 color="#1A7E00" size={30} />
                </div>

                <div className="content">
                  <p className="title text-muted mb-1">Coletas vinculadas</p>
                  <h3>{stats.totalCollections}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <div className="card p-25 h-100">
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

          <div className="col-md-6 col-xl-3">
            <div className="card p-25 h-100">
              <div className="d-flex align-items-center gap-15">
                <div className="icon">
                  <BarChart3 color="#1A7E00" size={30} />
                </div>

                <div className="content">
                  <p className="title text-muted mb-1">Fontes de dados</p>
                  <h3>{sourceChartData.filter((item) => item.value > 0).length}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="card p-25 mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-15 mb-3">
          <div>
            <h4 className="fw-600 fs-20 mb-1">Filtros de materiais</h4>
            <p className="text-muted mb-0">
              Analise resíduos por categoria, etapa, status de lote, status do material e origem dos dados.
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
                placeholder="Buscar material, lote, origem, gerador..."
              />
            </div>
          </div>

          <div className="col-md-6 col-xl-2">
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

          <div className="col-md-6 col-xl-2">
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

          <div className="col-md-6 col-xl-2">
            <select
              className="form-control"
              value={lotStatusFilter}
              onChange={(event) => {
                setLotStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Status dos lotes</option>
              <option value="AVAILABLE">Disponível</option>
              <option value="RESERVED">Reservado</option>
              <option value="SOLD">Vendido</option>
              <option value="DISCARDED">Descartado</option>
            </select>
          </div>

          <div className="col-md-6 col-xl-2">
            <select
              className="form-control"
              value={itemStatusFilter}
              onChange={(event) => {
                setItemStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Status material</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </div>

          <div className="col-md-6 col-xl-1">
            <select
              className="form-control"
              value={sourceFilter}
              onChange={(event) => {
                setSourceFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Fonte</option>
              <option value="STOCK">Estoque</option>
              <option value="COLLECTION">Coletas</option>
              <option value="BOTH">Ambos</option>
            </select>
          </div>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="row g-4 mb-4">
        <div className="col-xl-5">
          <div className="card p-25 h-100">
            <h4 className="fw-600 fs-20 mb-3">Participação por material</h4>

            <div style={{ width: "100%", height: 330 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={materialPieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {materialPieData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
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
              <h4 className="fw-600 fs-20 mb-0">Estoque x Coletado por categoria</h4>
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
                      name === "estoque" ||
                      name === "coletado" ||
                      name === "total"
                        ? formatKg(value)
                        : value,
                      name === "estoque"
                        ? "Estoque"
                        : name === "coletado"
                        ? "Coletado"
                        : name === "total"
                        ? "Total"
                        : "Materiais",
                    ]}
                  />
                  <Legend />

                  <Bar
                    dataKey="estoque"
                    name="Estoque"
                    fill="#1A7E00"
                    radius={[8, 8, 0, 0]}
                  />

                  <Bar
                    dataKey="coletado"
                    name="Coletado"
                    fill="#2563EB"
                    radius={[8, 8, 0, 0]}
                  />

                  <Bar
                    dataKey="materiais"
                    name="Materiais"
                    fill="#64B000"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
            <div className="row g-4 mb-4">
        <div className="col-xl-7">
          <div className="card p-25 h-100">
            <h4 className="fw-600 fs-20 mb-3">
              Volume por etapa de processamento
            </h4>

            <div style={{ width: "100%", height: 330 }}>
              <ResponsiveContainer>
                <BarChart data={stageChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatKg(value)} />
                  <Legend />
                  <Bar
                    dataKey="kg"
                    name="Kg por etapa"
                    fill="#1A7E00"
                    radius={[8, 8, 0, 0]}
                  />
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
                  <Pie
                    data={lotStatusChartData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {lotStatusChartData.map((entry, index) => (
                      <Cell
                        key={entry.status}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
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

        <div className="col-xl-5">
          <div className="card p-25 h-100">
            <h4 className="fw-600 fs-20 mb-3">Origem das informações</h4>

            <div style={{ width: "100%", height: 330 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={sourceChartData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {sourceChartData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
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

        <div className="col-xl-7">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h4 className="fw-600 fs-20 mb-1">
                  Visão consolidada por categoria
                </h4>
                <p className="text-muted mb-0">
                  Comparativo total considerando estoque e resíduos coletados.
                </p>
              </div>

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
                      name === "total" ? formatKg(value) : value,
                      name === "total" ? "Total geral" : "Materiais",
                    ]}
                  />
                  <Legend />

                  <Bar
                    dataKey="total"
                    name="Total geral"
                    fill="#1A7E00"
                    radius={[8, 8, 0, 0]}
                  />

                  <Bar
                    dataKey="materiais"
                    name="Materiais"
                    fill="#64B000"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* TABELA */}
      <div className="card p-25 mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-15 mb-3">
          <div>
            <h4 className="fw-600 fs-20 mb-1">
              Tabela analítica de tipos de resíduos
            </h4>
            <p className="text-muted mb-0">
              Material, estoque, coletado, total geral, lotes, coletas,
              geradores, catadores e origem dos dados.
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
                  subtitle:
                    "Estoque, lotes, resíduos coletados e consolidação operacional",
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
