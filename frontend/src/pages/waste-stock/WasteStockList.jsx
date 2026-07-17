import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  House,
  Layers,
  MapPin,
  Package,
  Search,
  Scale,
} from "lucide-react";
import toast from "react-hot-toast";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

import {
  getWasteStockOverview,
  getProcessingStageLabel,
  getWasteLotStatusLabel,
} from "../../services/wasteStockService";

import {
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
  if (!value) return "Não informado";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Não informado";
  }

  return date.toLocaleDateString("pt-BR");
};

const formatQuantity = (value) => {
  const quantity = Number(value || 0);

  return quantity.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const getEffectiveLotQuantity = (lot) => {
  const quantity = Number(lot?.quantity || 0);

  if (quantity > 0) {
    return quantity;
  }

  return Number(lot?.quantityKg || 0);
};

const getItemTotalQuantity = (item) => {
  if (item?.totalQuantity !== undefined) {
    return Number(item.totalQuantity || 0);
  }

  const lots = Array.isArray(item?.lots)
    ? item.lots
    : [];

  return lots.reduce((sum, lot) => {
    if (lot.status === "DISCARDED") {
      return sum;
    }

    return sum + getEffectiveLotQuantity(lot);
  }, 0);
};

const getItemLotsCount = (item) => {
  if (item?.lotsCount !== undefined) {
    return Number(item.lotsCount || 0);
  }

  return Array.isArray(item?.lots)
    ? item.lots.length
    : 0;
};

const getAvailableLotsCount = (item) => {
  const lots = Array.isArray(item?.lots)
    ? item.lots
    : [];

  return lots.filter(
    (lot) => lot.status === "AVAILABLE"
  ).length;
};

const getLotStatusClass = (status) => {
  switch (status) {
    case "AVAILABLE":
      return "status status-success";

    case "RESERVED":
      return "status status-warning";

    case "SOLD":
      return "status status-info";

    case "DISCARDED":
      return "status status-danger";

    default:
      return "status";
  }
};

const WasteStockList = () => {
  const [items, setItems] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const loadStock = async () => {
    try {
      setLoading(true);

      const response = await getWasteStockOverview();
      const stockItems = extractItems(response);

      setItems(
        stockItems.map((item) => ({
          ...item,
          lots: Array.isArray(item?.lots)
            ? item.lots
            : [],
          totalQuantity:
            getItemTotalQuantity(item),
          lotsCount:
            getItemLotsCount(item),
          availableLotsCount:
            getAvailableLotsCount(item),
        }))
      );
    } catch (error) {
      console.error(
        "Erro ao carregar estoque de resíduos:",
        error
      );

      toast.error(
        error?.error ||
          error?.message ||
          "Não foi possível carregar o estoque de resíduos."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

  const categories = useMemo(() => {
    return [
      ...new Set(
        items
          .map((item) => item.category)
          .filter(Boolean)
      ),
    ].sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase("pt-BR");

    return items.filter((item) => {
      const searchableText = [
        item.name,
        item.category,
        item.subcategory,
        item.internalCode,
        item.ncm,
        item.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(
          normalizedSearch
        );

      const matchesCategory =
        !categoryFilter ||
        item.category === categoryFilter;

      const matchesStatus =
        !statusFilter ||
        item.status === statusFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );
    });
  }, [
    items,
    search,
    categoryFilter,
    statusFilter,
  ]);

  const totals = useMemo(() => {
    const activeItems = items.filter(
      (item) => item.status === "ACTIVE"
    );

    const totalLots = items.reduce(
      (sum, item) =>
        sum + Number(item.lotsCount || 0),
      0
    );

    const availableLots = items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.availableLotsCount || 0
        ),
      0
    );

    return {
      types: items.length,
      activeTypes: activeItems.length,
      totalLots,
      availableLots,
    };
  }, [items]);

  const toggleExpanded = (itemId) => {
    setExpandedItems((current) => ({
      ...current,
      [itemId]: !current[itemId],
    }));
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setStatusFilter("");
  };

  return (
    <>
      <HeadTags title="Estoque de Resíduos | KATUÁ" />

      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">
            Estoque de Resíduos
          </h3>

          <p className="text-muted mb-0">
            Acompanhe os materiais armazenados, lotes,
            quantidades, unidades e locais de estoque.
          </p>
        </div>

        <div className="page-tool d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="breadcrumb-wrap">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb pb-0 mb-0">
                <li className="breadcrumb-item">
                  <Link
                    to="/"
                    className="d-flex align-items-center gap-8"
                  >
                    <House />
                    Painel
                  </Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li
                  className="breadcrumb-item active"
                  aria-current="page"
                >
                  Estoque de Resíduos
                </li>
              </ol>
            </nav>
          </div>

          <Link
            to="/waste-stock/create"
            className="primary-btn btn-sm"
          >
            <CirclePlus />
            Adicionar Lote
          </Link>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex justify-content-between align-items-center gap-3">
              <div>
                <p className="text-muted mb-1">
                  Tipos cadastrados
                </p>

                <h4 className="mb-0">
                  {totals.types}
                </h4>
              </div>

              <Package
                size={34}
                color="#028C56"
              />
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex justify-content-between align-items-center gap-3">
              <div>
                <p className="text-muted mb-1">
                  Tipos ativos
                </p>

                <h4 className="mb-0">
                  {totals.activeTypes}
                </h4>
              </div>

              <Layers
                size={34}
                color="#028C56"
              />
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex justify-content-between align-items-center gap-3">
              <div>
                <p className="text-muted mb-1">
                  Total de lotes
                </p>

                <h4 className="mb-0">
                  {totals.totalLots}
                </h4>
              </div>

              <Boxes
                size={34}
                color="#028C56"
              />
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex justify-content-between align-items-center gap-3">
              <div>
                <p className="text-muted mb-1">
                  Lotes disponíveis
                </p>

                <h4 className="mb-0">
                  {totals.availableLots}
                </h4>
              </div>

              <Scale
                size={34}
                color="#028C56"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-25 mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-xl-5 col-lg-6">
            <label className="form-label">
              Buscar no estoque
            </label>

            <div className="filter-section search w-100">
              <div className="icon">
                <Search />
              </div>

              <input
                type="text"
                className="form-control"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar material, categoria, código ou NCM..."
              />
            </div>
          </div>

          <div className="col-xl-3 col-lg-3 col-md-6">
            <label className="form-label">
              Categoria
            </label>

            <select
              className="form-select"
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value
                )
              }
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
            <label className="form-label">
              Status
            </label>

            <select
              className="form-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="">
                Todos
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
                !statusFilter
              }
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="d-flex flex-column gap-3 mb-5">
        {!loading &&
          filteredItems.length === 0 && (
            <div className="card p-5 text-center">
              <Package
                size={48}
                className="mx-auto mb-3 text-muted"
              />

              <h4 className="mb-2">
                Nenhum material encontrado
              </h4>

              <p className="text-muted mb-3">
                Cadastre tipos de resíduos e adicione
                lotes para iniciar o controle de estoque.
              </p>

              <div>
                <Link
                  to="/create-type"
                  className="primary-btn btn-sm"
                >
                  <CirclePlus />
                  Cadastrar Tipo de Resíduo
                </Link>
              </div>
            </div>
          )}

        {filteredItems.map((item) => {
          const isExpanded =
            Boolean(
              expandedItems[item.id]
            );

          const unit =
            item.unit || "KG";

          const lots = Array.isArray(item.lots)
            ? item.lots
            : [];

          return (
            <div
              key={item.id}
              className="card p-25"
            >
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                <div className="d-flex align-items-start gap-3">
                  <button
                    type="button"
                    className="btn btn-light d-flex align-items-center justify-content-center"
                    style={{
                      width: 42,
                      height: 42,
                      padding: 0,
                    }}
                    onClick={() =>
                      toggleExpanded(item.id)
                    }
                    title={
                      isExpanded
                        ? "Ocultar lotes"
                        : "Exibir lotes"
                    }
                  >
                    {isExpanded ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </button>

                  <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <h4 className="mb-0">
                        {item.name}
                      </h4>

                      <span
                        className={
                          item.status === "ACTIVE"
                            ? "status status-success"
                            : "status status-danger"
                        }
                      >
                        {item.status === "ACTIVE"
                          ? "Ativo"
                          : "Inativo"}
                      </span>
                    </div>

                    <p className="text-muted mb-0 mt-1">
                      {item.category || "Sem categoria"}

                      {item.subcategory
                        ? ` • ${item.subcategory}`
                        : ""}
                    </p>

                    {(item.internalCode ||
                      item.ncm) && (
                      <p className="text-muted small mb-0 mt-1">
                        {item.internalCode
                          ? `Código: ${item.internalCode}`
                          : ""}

                        {item.internalCode &&
                        item.ncm
                          ? " • "
                          : ""}

                        {item.ncm
                          ? `NCM: ${item.ncm}`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>

                <div className="d-flex gap-2 flex-wrap">
                  <Link
                    to={`/waste-stock/create?itemId=${item.id}`}
                    className="primary-btn btn-sm"
                  >
                    <CirclePlus size={16} />
                    Novo Lote
                  </Link>

                  <Link
                    to={`/edit-waste-type/${item.id}`}
                    className="outline-btn btn-sm"
                  >
                    Editar Material
                  </Link>
                </div>
              </div>

              <div className="row g-3 mt-2">
                <div className="col-lg-3 col-md-6">
                  <div
                    className="rounded-3 p-3 h-100"
                    style={{
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <small className="text-muted d-block">
                      Quantidade registrada
                    </small>

                    <strong className="fs-18">
                      {formatQuantity(
                        item.totalQuantity
                      )}{" "}
                      {getWasteUnitShortLabel(unit)}
                    </strong>
                  </div>
                </div>

                <div className="col-lg-3 col-md-6">
                  <div
                    className="rounded-3 p-3 h-100"
                    style={{
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <small className="text-muted d-block">
                      Lotes vinculados
                    </small>

                    <strong className="fs-18">
                      {item.lotsCount}
                    </strong>
                  </div>
                </div>

                <div className="col-lg-3 col-md-6">
                  <div
                    className="rounded-3 p-3 h-100"
                    style={{
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <small className="text-muted d-block">
                      Lotes disponíveis
                    </small>

                    <strong className="fs-18">
                      {item.availableLotsCount}
                    </strong>
                  </div>
                </div>

                <div className="col-lg-3 col-md-6">
                  <div
                    className="rounded-3 p-3 h-100"
                    style={{
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <small className="text-muted d-block">
                      Unidade padrão
                    </small>

                    <strong className="fs-18">
                      {getWasteUnitShortLabel(
                        unit
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <h5 className="mb-0">
                      Lotes do material
                    </h5>

                    <span className="text-muted small">
                      {lots.length} lote(s)
                    </span>
                  </div>

                  {lots.length === 0 ? (
                    <div
                      className="rounded-3 p-4 text-center"
                      style={{
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      <Boxes
                        size={38}
                        className="mb-2 text-muted"
                      />

                      <p className="text-muted mb-3">
                        Nenhum lote cadastrado para este
                        material.
                      </p>

                      <Link
                        to={`/waste-stock/create?itemId=${item.id}`}
                        className="primary-btn btn-sm"
                      >
                        <CirclePlus size={16} />
                        Adicionar Primeiro Lote
                      </Link>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Quantidade</th>
                            <th>Etapa</th>
                            <th>Armazenamento</th>
                            <th>Origem</th>
                            <th>Status</th>
                            <th>Criado em</th>
                            <th>Ações</th>
                          </tr>
                        </thead>

                        <tbody>
                          {lots.map((lot) => {
                            const lotUnit =
                              lot.unit ||
                              unit;

                            return (
                              <tr key={lot.id}>
                                <td>
                                  <strong>
                                    {lot.lotCode}
                                  </strong>
                                </td>

                                <td>
                                  {formatQuantity(
                                    getEffectiveLotQuantity(
                                      lot
                                    )
                                  )}{" "}
                                  {getWasteUnitShortLabel(
                                    lotUnit
                                  )}
                                </td>

                                <td>
                                  {getProcessingStageLabel(
                                    lot.processingStage
                                  )}
                                </td>

                                <td>
                                  <div className="d-flex align-items-center gap-2">
                                    <MapPin size={15} />

                                    <span>
                                      {lot.storageLocation ||
                                        "Não informado"}
                                    </span>
                                  </div>
                                </td>

                                <td>
                                  {lot.origin ||
                                    "Não informado"}
                                </td>

                                <td>
                                  <span
                                    className={getLotStatusClass(
                                      lot.status
                                    )}
                                  >
                                    {getWasteLotStatusLabel(
                                      lot.status
                                    )}
                                  </span>
                                </td>

                                <td>
                                  {formatDate(
                                    lot.createdAt
                                  )}
                                </td>

                                <td>
                                  <Link
                                    to={`/waste-stock/lots/${lot.id}/edit`}
                                    className="outline-btn btn-sm"
                                  >
                                    Editar
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default WasteStockList;