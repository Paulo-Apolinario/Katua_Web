import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import {
  House,
  ChevronRight,
  CirclePlus,
  Pencil,
  Trash2,
  Search,
  Package,
  Layers,
  Scale,
  Archive,
} from "lucide-react";
import DataTable from "../../components/DataTable";
import DeleteModal from "../../components/modal/DeleteModal";
import {
  getAllWasteTypes,
  deleteWasteType,
} from "../../services/wasteTypeService";
import toast from "react-hot-toast";
import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.stock)) return response.stock;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("pt-BR");
};

const formatKg = (value) => `${Number(value || 0).toFixed(2)} KG`;

const getStatusLabel = (status) => {
  const labels = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
  };

  return labels[status] || status || "N/A";
};

const getStatusClass = (status) => {
  if (status === "ACTIVE") return "status status-success";
  return "status status-danger";
};


const getLotsTotalKg = (lots = []) => {
  return lots.reduce((sum, lot) => {
    if (lot?.status === "DISCARDED") return sum;
    return sum + Number(lot?.quantityKg || 0);
  }, 0);
};

const WasteTypeList = () => {
  const [wasteTypes, setWasteTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStock = async () => {
    try {
      setLoading(true);

      const response = await getAllWasteTypes();
      const stock = getArray(response);

      const dataWithSn = stock.map((item, index) => {
        const lots = Array.isArray(item?.lots) ? item.lots : [];
        const totalQuantityKg =
          item?.totalQuantityKg !== undefined
            ? Number(item.totalQuantityKg || 0)
            : getLotsTotalKg(lots);

        return {
          ...item,
          sn: index + 1,
          lots,
          totalQuantityKg,
          lotsCount:
            item?.lotsCount !== undefined ? item.lotsCount : lots.length,
        };
      });

      setWasteTypes(dataWithSn);
    } catch (error) {
      toast.error(
        error?.message || "Erro ao carregar estoque de resíduos."
      );
      console.error("Fetch stock error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

  const categories = useMemo(() => {
    return [...new Set(wasteTypes.map((item) => item.category))]
      .filter(Boolean)
      .sort();
  }, [wasteTypes]);

  const filteredData = useMemo(() => {
    const term = search.toLowerCase().trim();

    return wasteTypes.filter((item) => {
      const name = String(item?.name || "").toLowerCase();
      const category = String(item?.category || "").toLowerCase();
      const description = String(item?.description || "").toLowerCase();

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
        name.includes(term) ||
        category.includes(term) ||
        description.includes(term) ||
        lotsText.includes(term);

      const matchesCategory =
        !categoryFilter || item.category === categoryFilter;

      const matchesStatus = !statusFilter || item.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [wasteTypes, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const totalKg = wasteTypes.reduce(
      (sum, item) => sum + Number(item.totalQuantityKg || 0),
      0
    );

    const totalLots = wasteTypes.reduce(
      (sum, item) => sum + Number(item.lotsCount || 0),
      0
    );

    const activeItems = wasteTypes.filter(
      (item) => item.status === "ACTIVE"
    ).length;

    return {
      totalKg,
      totalLots,
      activeItems,
      categories: categories.length,
    };
  }, [wasteTypes, categories]);

  const columns = [
    { key: "sn", label: "SN" },
    {
      key: "name",
      label: "Material",
      render: (value, row) => (
        <div>
          <strong>{value || "N/A"}</strong>
          {row?.description && (
            <p className="text-muted small mb-0">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "category",
      label: "Categoria",
      render: (value) => value || "N/A",
    },
    {
      key: "totalQuantityKg",
      label: "Quantidade em estoque",
      render: (value) => <strong>{formatKg(value)}</strong>,
    },
    {
      key: "lotsCount",
      label: "Lotes",
      render: (value, row) => (
        <div>
          <strong>{value || 0}</strong>
          {row?.lots?.[0]?.lotCode && (
            <p className="text-muted small mb-0">
              Último: {row.lots[0].lotCode}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "lotStatus",
      label: "Situação dos lotes",
      render: (value, row) => {
        const lots = Array.isArray(row?.lots) ? row.lots : [];
        const available = lots.filter(
          (lot) => lot.status === "AVAILABLE"
        ).length;
        const reserved = lots.filter((lot) => lot.status === "RESERVED").length;
        const sold = lots.filter((lot) => lot.status === "SOLD").length;

        return (
          <div>
            <p className="mb-0 small">
              Disponíveis: <strong>{available}</strong>
            </p>
            <p className="mb-0 small">
              Reservados: <strong>{reserved}</strong>
            </p>
            <p className="mb-0 small">
              Vendidos: <strong>{sold}</strong>
            </p>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      label: "Criado em",
      render: (value) => formatDate(value),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <span className={getStatusClass(value)}>{getStatusLabel(value)}</span>
      ),
    },
  ];

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await deleteWasteType(deleteId);

      if (response?.success === false) {
        toast.error(response.message || "Erro ao inativar material.");
        return;
      }

      setWasteTypes((prev) =>
        prev
          .map((item) =>
            item.id === deleteId ? { ...item, status: "INACTIVE" } : item
          )
          .map((item, index) => ({
            ...item,
            sn: index + 1,
          }))
      );

      toast.success(
        response?.message || "Material de estoque inativado com sucesso."
      );

      setDeleteId(null);
    } catch (error) {
      toast.error(error?.message || "Erro ao inativar material de estoque.");
      console.error("Delete stock error:", error);
    }
  };

  return (
    <>
      <HeadTags title="Estoque de Resíduos" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Estoque de Resíduos</h3>

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
                    Estoque de Resíduos
                  </li>
                </ol>
              </nav>
            </div>

            <Link to="/create-type" className="primary-btn btn-sm">
              <CirclePlus /> Novo material/lote
            </Link>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <div>
                <p className="text-muted mb-1">Total em estoque</p>
                <h4 className="mb-0">{formatKg(stats.totalKg)}</h4>
              </div>
              <Scale color="#028C56" size={34} />
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <div>
                <p className="text-muted mb-1">Materiais ativos</p>
                <h4 className="mb-0">{stats.activeItems}</h4>
              </div>
              <Package color="#028C56" size={34} />
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <div>
                <p className="text-muted mb-1">Categorias</p>
                <h4 className="mb-0">{stats.categories}</h4>
              </div>
              <Layers color="#028C56" size={34} />
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <div>
                <p className="text-muted mb-1">Lotes registrados</p>
                <h4 className="mb-0">{stats.totalLots}</h4>
              </div>
              <Archive color="#028C56" size={34} />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-25">
        <div className="filter row g-3 mb-4">
          <div className="col-lg-4 col-md-6">
            <div className="filter-section search w-100">
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
                placeholder="Buscar por material, lote, local ou origem..."
              />
            </div>
          </div>

          <div className="col-lg-3 col-md-6">
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
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

          <div className="col-lg-3 col-md-6">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Todos os status</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </div>

          {(search || categoryFilter || statusFilter) && (
            <div className="col-lg-2 col-md-6">
              <button className="clear-filter w-100" onClick={clearFilters}>
                Limpar filtros
              </button>
            </div>
          )}
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
                to={`/edit-waste-type/${row.id}`}
                className="action-button edit"
                title="Editar material"
              >
                <Pencil />
              </Link>

              <button
                className="action-button delete"
                onClick={() => setDeleteId(row.id)}
                data-bs-toggle="modal"
                data-bs-target="#deleteModal"
                title="Inativar material"
              >
                <Trash2 />
              </button>
            </div>
          )}
        />
      </div>

      <DeleteModal handleDelete={handleDelete} />
    </>
  );
};

export default WasteTypeList;