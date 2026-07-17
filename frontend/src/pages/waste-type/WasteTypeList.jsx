import { useEffect, useMemo, useState } from "react";
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
  Tags,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";

import DataTable from "../../components/DataTable";
import DeleteModal from "../../components/modal/DeleteModal";
import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

import {
  activateWasteType,
  deleteWasteType,
  getAllWasteTypes,
  getWasteClassLabel,
  getWasteUnitShortLabel,
} from "../../services/wasteTypeService";

const extractItems = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.stock)) return response.stock;
  if (Array.isArray(response?.data)) return response.data;

  return [];
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("pt-BR");
};

const getStatusLabel = (status) => {
  if (status === "ACTIVE") return "Ativo";
  if (status === "INACTIVE") return "Inativo";

  return status || "N/A";
};

const getStatusClass = (status) => {
  return status === "ACTIVE"
    ? "status status-success"
    : "status status-danger";
};

const getTotalQuantity = (item) => {
  if (item?.totalQuantity !== undefined) {
    return Number(item.totalQuantity || 0);
  }

  if (item?.totalQuantityKg !== undefined) {
    return Number(item.totalQuantityKg || 0);
  }

  return 0;
};

const WasteTypeList = () => {
  const [wasteTypes, setWasteTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const loadWasteTypes = async () => {
    try {
      setLoading(true);

      const response = await getAllWasteTypes();
      const items = extractItems(response);

      const normalizedItems = items.map((item, index) => ({
        ...item,
        sn: index + 1,
        totalQuantity: getTotalQuantity(item),
        lotsCount:
          item?.lotsCount !== undefined
            ? Number(item.lotsCount || 0)
            : Array.isArray(item?.lots)
              ? item.lots.length
              : 0,
      }));

      setWasteTypes(normalizedItems);
    } catch (error) {
      console.error("Erro ao carregar tipos de resíduos:", error);

      toast.error(
        error?.error ||
          error?.message ||
          "Erro ao carregar a gestão de resíduos."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWasteTypes();
  }, []);

  const categories = useMemo(() => {
    return [...new Set(wasteTypes.map((item) => item.category))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [wasteTypes]);

  const units = useMemo(() => {
    return [...new Set(wasteTypes.map((item) => item.unit))]
      .filter(Boolean)
      .sort();
  }, [wasteTypes]);

  const filteredData = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");

    return wasteTypes.filter((item) => {
      const searchableText = [
        item?.name,
        item?.category,
        item?.subcategory,
        item?.internalCode,
        item?.ncm,
        item?.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      const matchesCategory =
        !categoryFilter ||
        item.category === categoryFilter;

      const matchesUnit =
        !unitFilter ||
        item.unit === unitFilter;

      const matchesStatus =
        !statusFilter ||
        item.status === statusFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesUnit &&
        matchesStatus
      );
    });
  }, [
    wasteTypes,
    search,
    categoryFilter,
    unitFilter,
    statusFilter,
  ]);

  const stats = useMemo(() => {
    const activeItems = wasteTypes.filter(
      (item) => item.status === "ACTIVE"
    ).length;

    const inactiveItems = wasteTypes.filter(
      (item) => item.status === "INACTIVE"
    ).length;

    const totalLots = wasteTypes.reduce(
      (sum, item) => sum + Number(item.lotsCount || 0),
      0
    );

    return {
      totalItems: wasteTypes.length,
      activeItems,
      inactiveItems,
      totalCategories: categories.length,
      totalLots,
    };
  }, [wasteTypes, categories]);

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setUnitFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setProcessingId(deleteId);

      const response = await deleteWasteType(deleteId);

      if (response?.success === false) {
        toast.error(
          response?.error ||
            response?.message ||
            "Não foi possível inativar o tipo de resíduo."
        );
        return;
      }

      setWasteTypes((current) =>
        current.map((item) =>
          item.id === deleteId
            ? {
                ...item,
                status: "INACTIVE",
              }
            : item
        )
      );

      toast.success(
        response?.message ||
          "Tipo de resíduo inativado com sucesso."
      );

      setDeleteId(null);
    } catch (error) {
      console.error("Erro ao inativar tipo de resíduo:", error);

      toast.error(
        error?.error ||
          error?.message ||
          "Erro ao inativar tipo de resíduo."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleActivate = async (id) => {
    if (!id) return;

    try {
      setProcessingId(id);

      const response = await activateWasteType(id);

      if (response?.success === false) {
        toast.error(
          response?.error ||
            response?.message ||
            "Não foi possível reativar o tipo de resíduo."
        );
        return;
      }

      setWasteTypes((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "ACTIVE",
              }
            : item
        )
      );

      toast.success(
        response?.message ||
          "Tipo de resíduo reativado com sucesso."
      );
    } catch (error) {
      console.error("Erro ao reativar tipo de resíduo:", error);

      toast.error(
        error?.error ||
          error?.message ||
          "Erro ao reativar tipo de resíduo."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const columns = [
    {
      key: "sn",
      label: "SN",
    },
    {
      key: "name",
      label: "Tipo de resíduo",
      render: (value, row) => (
        <div>
          <strong>{value || "N/A"}</strong>

          {row?.subcategory && (
            <p className="text-muted small mb-0">
              Subcategoria: {row.subcategory}
            </p>
          )}

          {row?.description && (
            <p className="text-muted small mb-0">
              {row.description}
            </p>
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
      key: "unit",
      label: "Unidade",
      render: (value) =>
        value
          ? getWasteUnitShortLabel(value)
          : "N/A",
    },
    {
      key: "internalCode",
      label: "Código interno",
      render: (value) => value || "N/A",
    },
    {
      key: "ncm",
      label: "NCM",
      render: (value) => value || "N/A",
    },
    {
      key: "wasteClass",
      label: "Classe",
      render: (value) => getWasteClassLabel(value),
    },
    {
      key: "lotsCount",
      label: "Lotes vinculados",
      render: (value) => Number(value || 0),
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
        <span className={getStatusClass(value)}>
          {getStatusLabel(value)}
        </span>
      ),
    },
  ];

  return (
    <>
      <HeadTags title="Gestão de Resíduos | KATUÁ" />

      <TopProgressBar
        loading={loading || Boolean(processingId)}
      />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Gestão de Resíduos</h3>

          <p className="text-muted mb-0">
            Cadastre e administre os materiais coletados pela cooperativa,
            incluindo categoria, unidade, NCM e classificação.
          </p>
        </div>

        <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
          <div className="breadcrumb-wrap">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb pb-0 mb-0">
                <li className="breadcrumb-item">
                  <Link
                    to="/"
                    className="d-flex align-items-center gap-8"
                  >
                    <House /> Painel
                  </Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li className="breadcrumb-item">
                  Estoque de Resíduos
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li
                  className="breadcrumb-item active"
                  aria-current="page"
                >
                  Gestão de Resíduos
                </li>
              </ol>
            </nav>
          </div>

          <Link
            to="/create-type"
            className="primary-btn btn-sm"
          >
            <CirclePlus />
            Cadastrar Tipo de Resíduo
          </Link>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <div>
                <p className="text-muted mb-1">
                  Tipos cadastrados
                </p>

                <h4 className="mb-0">
                  {stats.totalItems}
                </h4>
              </div>

              <Package color="#028C56" size={34} />
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <div>
                <p className="text-muted mb-1">
                  Tipos ativos
                </p>

                <h4 className="mb-0">
                  {stats.activeItems}
                </h4>
              </div>

              <Tags color="#028C56" size={34} />
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <div>
                <p className="text-muted mb-1">
                  Categorias
                </p>

                <h4 className="mb-0">
                  {stats.totalCategories}
                </h4>
              </div>

              <Layers color="#028C56" size={34} />
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <div>
                <p className="text-muted mb-1">
                  Lotes vinculados
                </p>

                <h4 className="mb-0">
                  {stats.totalLots}
                </h4>
              </div>

              <Scale color="#028C56" size={34} />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-25">
        <div className="filter row g-3 mb-4">
          <div className="col-xl-4 col-lg-6">
            <div className="filter-section search w-100">
              <div className="icon">
                <Search />
              </div>

              <input
                className="form-control"
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por nome, categoria, NCM ou código..."
              />
            </div>
          </div>

          <div className="col-xl-2 col-lg-3 col-md-6">
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">
                Todas as categorias
              </option>

              {categories.map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="col-xl-2 col-lg-3 col-md-6">
            <select
              className="form-select"
              value={unitFilter}
              onChange={(event) => {
                setUnitFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">
                Todas as unidades
              </option>

              {units.map((unit) => (
                <option
                  key={unit}
                  value={unit}
                >
                  {getWasteUnitShortLabel(unit)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-xl-2 col-lg-3 col-md-6">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">
                Todos os status
              </option>

              <option value="ACTIVE">
                Ativo
              </option>

              <option value="INACTIVE">
                Inativo
              </option>
            </select>
          </div>

          <div className="col-xl-2 col-lg-3 col-md-6">
            <button
              type="button"
              className="outline-btn btn-sm w-100"
              onClick={clearFilters}
              disabled={
                !search &&
                !categoryFilter &&
                !unitFilter &&
                !statusFilter
              }
            >
              Limpar filtros
            </button>
          </div>
        </div>

        <DataTable
          data={filteredData}
          columns={columns}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(value) => {
            setRowsPerPage(value);
            setCurrentPage(1);
          }}
          renderActions={(row) => (
            <div className="actions d-flex align-items-center gap-10">
              <Link
                to={`/edit-waste-type/${row.id}`}
                className="action-button edit"
                title="Editar tipo de resíduo"
              >
                <Pencil />
              </Link>

              {row.status === "ACTIVE" ? (
                <button
                  type="button"
                  className="action-button delete"
                  title="Inativar tipo de resíduo"
                  data-bs-toggle="modal"
                  data-bs-target="#deleteModal"
                  onClick={() => setDeleteId(row.id)}
                  disabled={processingId === row.id}
                >
                  <Trash2 />
                </button>
              ) : (
                <button
                  type="button"
                  className="action-button edit"
                  title="Reativar tipo de resíduo"
                  onClick={() => handleActivate(row.id)}
                  disabled={processingId === row.id}
                >
                  <RotateCcw />
                </button>
              )}
            </div>
          )}
        />
      </div>

      <DeleteModal handleDelete={handleDelete} />
    </>
  );
};

export default WasteTypeList;