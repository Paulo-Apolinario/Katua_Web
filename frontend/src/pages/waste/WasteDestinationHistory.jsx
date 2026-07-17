import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  Filter,
  History,
  Loader2,
  PackageSearch,
  RefreshCcw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Warehouse,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router";

import {
  getCollectionEntryUnitShortLabel,
} from "../../services/collectionEntryService";

import {
  extractWasteDestinationPagination,
  extractWasteDestinations,
  getWasteDestinations,
  getWasteDestinationStatusLabel,
  getWasteDestinationTypeLabel,
} from "../../services/collectionWasteDestinationService";

/*
 * ============================================================
 * CONFIGURAÇÕES
 * ============================================================
 */

const DEFAULT_FILTERS = {
  search: "",
  entryId: "",
  type: "",
  status: "",
  destinationName: "",
  dateFrom: "",
  dateTo: "",
  includeCancelled: true,
  page: 1,
  limit: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
};

const DESTINATION_TYPE_OPTIONS = [
  {
    value: "",
    label: "Todos os tipos",
  },
  {
    value: "STOCK",
    label: "Adicionado ao estoque",
  },
  {
    value: "TRIAGE",
    label: "Enviado para triagem",
  },
  {
    value: "REJECT",
    label: "Rejeito",
  },
  {
    value: "DISPOSAL",
    label: "Descarte",
  },
  {
    value: "DIRECT_DESTINATION",
    label: "Destinação direta",
  },
  {
    value: "RESERVATION",
    label: "Reserva",
  },
];

const DESTINATION_STATUS_OPTIONS = [
  {
    value: "",
    label: "Todos os status",
  },
  {
    value: "ACTIVE",
    label: "Ativa",
  },
  {
    value: "CANCELLED",
    label: "Cancelada",
  },
];

const LIMIT_OPTIONS = [
  10,
  20,
  50,
  100,
];

/*
 * ============================================================
 * HELPERS GERAIS
 * ============================================================
 */

const normalizeNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
};

const normalizeText = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
};

const formatNumber = (
  value,
  maximumFractionDigits = 3
) => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(normalizeNumber(value));
};

const formatDate = (value) => {
  if (!value) {
    return "Não informada";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Não informada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) {
    return "Não informado";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getErrorMessage = (
  error,
  fallbackMessage
) => {
  return (
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.message ||
    fallbackMessage
  );
};

/*
 * ============================================================
 * HELPERS DA DESTINAÇÃO
 * ============================================================
 */

const getDestinationId = (
  destination
) => {
  return (
    destination?.id ||
    destination
      ?.collectionWasteDestinationId ||
    ""
  );
};

const getDestinationEntry = (
  destination
) => {
  return (
    destination?.collectionWasteEntry ||
    destination?.entry ||
    {}
  );
};

const getDestinationEntryId = (
  destination
) => {
  const entry =
    getDestinationEntry(destination);

  return (
    destination?.collectionWasteEntryId ||
    destination?.entryId ||
    entry?.id ||
    ""
  );
};

const getDestinationType = (
  destination
) => {
  return (
    destination?.type ||
    destination?.destinationType ||
    ""
  );
};

const getDestinationStatus = (
  destination
) => {
  if (
    destination?.cancelledAt ||
    destination?.isCancelled === true
  ) {
    return "CANCELLED";
  }

  return (
    destination?.status ||
    "ACTIVE"
  );
};

const getDestinationQuantity = (
  destination
) => {
  return normalizeNumber(
    destination?.quantity ??
      destination?.destinedQuantity ??
      0
  );
};

const getDestinationUnit = (
  destination
) => {
  const entry =
    getDestinationEntry(destination);

  return (
    destination?.unit ||
    entry?.unit ||
    entry?.collectionMaterial?.unit ||
    entry?.wasteType?.unit ||
    "KG"
  );
};

const getDestinationDate = (
  destination
) => {
  return (
    destination?.destinationDate ||
    destination?.processedAt ||
    destination?.createdAt ||
    null
  );
};

const getDestinationName = (
  destination
) => {
  return (
    destination?.destinationName ||
    destination?.stockLot?.code ||
    destination?.wasteStockLot?.code ||
    destination?.stockItem?.name ||
    destination?.wasteStockItem?.name ||
    destination?.recipient?.name ||
    "Não informado"
  );
};

const getDestinationDocument = (
  destination
) => {
  return (
    destination?.destinationDocument ||
    destination?.recipient?.document ||
    ""
  );
};

const getDestinationAddress = (
  destination
) => {
  return (
    destination?.destinationAddress ||
    destination?.recipient?.address ||
    ""
  );
};

const getWasteName = (
  destination
) => {
  const entry =
    getDestinationEntry(destination);

  return (
    entry?.materialNameSnapshot ||
    entry?.wasteType?.name ||
    entry?.collectionMaterial?.nameSnapshot ||
    entry?.materialName ||
    entry?.wasteName ||
    "Resíduo não identificado"
  );
};

const getWasteCode = (
  destination
) => {
  const entry =
    getDestinationEntry(destination);

  return (
    entry?.wasteType?.internalCode ||
    entry?.wasteType?.code ||
    entry?.stockItem?.internalCode ||
    entry?.stockItem?.code ||
    entry?.wasteStockItem
      ?.internalCode ||
    entry?.wasteStockItem?.code ||
    entry?.collectionMaterial?.wasteType
      ?.internalCode ||
    entry?.collectionMaterial?.wasteType
      ?.code ||
    entry?.materialCode ||
    ""
  );
};

const getCollection = (
  destination
) => {
  const entry =
    getDestinationEntry(destination);

  return (
    entry?.collection ||
    entry?.collectionMaterial
      ?.collection ||
    destination?.collection ||
    {}
  );
};

const getCollectionReference = (
  destination
) => {
  const collection =
    getCollection(destination);

  return (
    collection?.code ||
    collection?.reference ||
    collection?.protocol ||
    destination?.collectionCode ||
    destination?.collectionId ||
    "Não informada"
  );
};

const getGeneratorName = (
  destination
) => {
  const collection =
    getCollection(destination);

  const entry =
    getDestinationEntry(destination);

  const generator =
    collection?.generator ||
    entry?.generator ||
    destination?.generator ||
    {};

  return (
    generator?.companyName ||
    generator?.tradeName ||
    generator?.name ||
    generator?.user?.name ||
    "Gerador não informado"
  );
};

const getResponsibleName = (
  destination
) => {
  return (
    destination?.createdBy?.name ||
    destination?.createdByUser?.name ||
    destination?.responsible?.name ||
    destination?.user?.name ||
    "Não informado"
  );
};

const getStockLotCode = (
  destination
) => {
  return (
    destination?.stockLot?.lotCode ||
    destination?.stockLot?.code ||
    destination?.wasteStockLot?.lotCode ||
    destination?.wasteStockLot?.code ||
    ""
  );
};

const getTransportDocument = (
  destination
) => {
  return (
    destination?.transportDocument ||
    destination?.mtrNumber ||
    ""
  );
};

const getEnvironmentalDocument = (
  destination
) => {
  return (
    destination?.environmentalDocument ||
    destination?.certificateNumber ||
    ""
  );
};

/*
 * ============================================================
 * COMPONENTES INTERNOS
 * ============================================================
 */

const SummaryCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  loading = false,
}) => {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body">
        <div className="d-flex align-items-start justify-content-between gap-3">
          <div className="min-w-0">
            <span className="text-muted small d-block mb-2">
              {title}
            </span>

            {loading ? (
              <div
                className="placeholder-glow"
                aria-label="Carregando indicador"
              >
                <span className="placeholder col-8 rounded" />
              </div>
            ) : (
              <h4 className="fw-bold mb-1">
                {value}
              </h4>
            )}

            {subtitle && (
              <span className="text-muted small">
                {subtitle}
              </span>
            )}
          </div>

          <div
            className="d-flex align-items-center justify-content-center rounded-3 bg-light flex-shrink-0"
            style={{
              width: 44,
              height: 44,
            }}
          >
            {Icon && (
              <Icon
                size={22}
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({
  hasFilters,
  onReset,
}) => {
  return (
    <div className="text-center py-5 px-3">
      <div
        className="d-inline-flex align-items-center justify-content-center rounded-circle bg-light mb-3"
        style={{
          width: 72,
          height: 72,
        }}
      >
        <History
          size={32}
          aria-hidden="true"
        />
      </div>

      <h5 className="mb-2">
        Nenhuma destinação encontrada
      </h5>

      <p className="text-muted mb-3">
        {hasFilters
          ? "Não existem registros compatíveis com os filtros selecionados."
          : "As destinações registradas serão exibidas neste histórico."}
      </p>

      {hasFilters && (
        <button
          type="button"
          className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
          onClick={onReset}
        >
          <RotateCcw
            size={17}
            aria-hidden="true"
          />

          Limpar filtros
        </button>
      )}
    </div>
  );
};

const DestinationStatusBadge = ({
  status,
}) => {
  const normalizedStatus =
    normalizeText(status).toUpperCase();

  const className =
    normalizedStatus === "CANCELLED"
      ? "text-bg-danger"
      : "text-bg-success";

  return (
    <span
      className={`badge ${className}`}
    >
      {getWasteDestinationStatusLabel(
        normalizedStatus
      )}
    </span>
  );
};

/*
 * ============================================================
 * PÁGINA
 * ============================================================
 */

const WasteDestinationHistory = () => {
  const navigate = useNavigate();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const queryEntryId =
    searchParams.get("entryId") || "";

  const [
    filters,
    setFilters,
  ] = useState(() => ({
    ...DEFAULT_FILTERS,
    entryId: queryEntryId,
  }));

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState(() => ({
    ...DEFAULT_FILTERS,
    entryId: queryEntryId,
  }));

  const [
    destinations,
    setDestinations,
  ] = useState([]);

  const [
    pagination,
    setPagination,
  ] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    filtersExpanded,
    setFiltersExpanded,
  ] = useState(
    Boolean(queryEntryId)
  );

  /*
   * ==========================================================
   * SINCRONIZAÇÃO COM A URL
   * ==========================================================
   */

  useEffect(() => {
    const entryIdFromUrl =
      searchParams.get("entryId") || "";

    setFilters((current) => {
      if (
        current.entryId ===
        entryIdFromUrl
      ) {
        return current;
      }

      return {
        ...current,
        entryId: entryIdFromUrl,
        page: 1,
      };
    });

    setAppliedFilters((current) => {
      if (
        current.entryId ===
        entryIdFromUrl
      ) {
        return current;
      }

      return {
        ...current,
        entryId: entryIdFromUrl,
        page: 1,
      };
    });

    if (entryIdFromUrl) {
      setFiltersExpanded(true);
    }
  }, [searchParams]);

  /*
   * ==========================================================
   * FILTROS
   * ==========================================================
   */

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        appliedFilters.search ||
          appliedFilters.entryId ||
          appliedFilters.type ||
          appliedFilters.status ||
          appliedFilters.destinationName ||
          appliedFilters.dateFrom ||
          appliedFilters.dateTo
      ),
    [appliedFilters]
  );

  const activeFilterCount = useMemo(
    () => {
      const keys = [
        "search",
        "entryId",
        "type",
        "status",
        "destinationName",
        "dateFrom",
        "dateTo",
      ];

      return keys.reduce(
        (total, key) =>
          appliedFilters[key]
            ? total + 1
            : total,
        0
      );
    },
    [appliedFilters]
  );

  /*
   * ==========================================================
   * CARREGAMENTO
   * ==========================================================
   */

  const loadDestinations =
    useCallback(
      async ({
        showPageLoader = true,
      } = {}) => {
        try {
          if (showPageLoader) {
            setLoading(true);
          } else {
            setRefreshing(true);
          }

          setError("");

          const response =
            await getWasteDestinations(
              appliedFilters
            );

          const extractedDestinations =
            extractWasteDestinations(
              response
            );

          const extractedPagination =
            extractWasteDestinationPagination(
              response
            );

          setDestinations(
            extractedDestinations
          );

          setPagination(
            extractedPagination
          );
        } catch (requestError) {
          setDestinations([]);

          setError(
            getErrorMessage(
              requestError,
              "Não foi possível carregar o histórico de destinações."
            )
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [appliedFilters]
    );

  useEffect(() => {
    loadDestinations();
  }, [loadDestinations]);

  /*
   * ==========================================================
   * RESUMOS LOCAIS
   * ==========================================================
   */

  const summary = useMemo(() => {
    return destinations.reduce(
      (
        accumulator,
        destination
      ) => {
        const status =
          getDestinationStatus(
            destination
          );

        const type =
          getDestinationType(
            destination
          );

        const quantity =
          getDestinationQuantity(
            destination
          );

        accumulator.total += 1;

        if (
          status === "CANCELLED"
        ) {
          accumulator.cancelled += 1;
        } else {
          accumulator.active += 1;
          accumulator.quantity +=
            quantity;
        }

        if (type === "STOCK") {
          accumulator.stock += 1;
        }

        return accumulator;
      },
      {
        total: 0,
        active: 0,
        cancelled: 0,
        stock: 0,
        quantity: 0,
      }
    );
  }, [destinations]);

  /*
   * ==========================================================
   * EVENTOS DOS FILTROS
   * ==========================================================
   */

  const handleFilterChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFilters((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const handleApplyFilters = (
    event
  ) => {
    event?.preventDefault();

    const nextFilters = {
      ...filters,
      page: 1,
    };

    setFilters(nextFilters);
    setAppliedFilters(nextFilters);

    if (nextFilters.entryId) {
      setSearchParams({
        entryId:
          nextFilters.entryId,
      });
    } else {
      setSearchParams({});
    }
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(
      DEFAULT_FILTERS
    );
    setSearchParams({});
  };

  const handleSearchKeyDown = (
    event
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleApplyFilters();
    }
  };

  /*
   * ==========================================================
   * PAGINAÇÃO
   * ==========================================================
   */

  const changePage = (page) => {
    const lastPage = Math.max(
      pagination.totalPages,
      1
    );

    if (
      page < 1 ||
      page > lastPage
    ) {
      return;
    }

    setFilters((current) => ({
      ...current,
      page,
    }));

    setAppliedFilters(
      (current) => ({
        ...current,
        page,
      })
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleLimitChange = (
    event
  ) => {
    const limit =
      Number(event.target.value) ||
      20;

    setFilters((current) => ({
      ...current,
      limit,
      page: 1,
    }));

    setAppliedFilters(
      (current) => ({
        ...current,
        limit,
        page: 1,
      })
    );
  };

  /*
   * ==========================================================
   * NAVEGAÇÃO
   * ==========================================================
   */

  const handleViewEntry = (
    destination
  ) => {
    const entryId =
      getDestinationEntryId(
        destination
      );

    if (!entryId) {
      setError(
        "Não foi possível identificar a entrada de resíduo desta destinação."
      );

      return;
    }

    navigate(
      `/collected-waste/${entryId}`
    );
  };

  /*
   * ==========================================================
   * JSX
   * ==========================================================
   */

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-xl-row align-items-xl-start justify-content-between gap-3 mb-4">
        <div>
          <button
            type="button"
            className="btn btn-link text-decoration-none px-0 d-inline-flex align-items-center gap-2 mb-2"
            onClick={() =>
              navigate(
                "/collected-waste"
              )
            }
          >
            <ArrowLeft
              size={17}
              aria-hidden="true"
            />

            Voltar para resíduos coletados
          </button>

          <div className="d-flex align-items-center gap-2 mb-1">
            <History
              size={27}
              aria-hidden="true"
            />

            <h2 className="mb-0">
              Histórico de destinações
            </h2>
          </div>

          <p className="text-muted mb-0">
            Consulte todas as movimentações
            realizadas nos resíduos coletados.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
          disabled={
            loading ||
            refreshing
          }
          onClick={() =>
            loadDestinations({
              showPageLoader: false,
            })
          }
        >
          {refreshing ? (
            <Loader2
              size={17}
              className="spinner-border spinner-border-sm"
              aria-hidden="true"
            />
          ) : (
            <RefreshCcw
              size={17}
              aria-hidden="true"
            />
          )}

          Atualizar
        </button>
      </div>

      {error && (
        <div
          className="alert alert-danger d-flex align-items-start justify-content-between gap-3"
          role="alert"
        >
          <div className="d-flex align-items-start gap-2">
            <AlertCircle
              size={20}
              className="flex-shrink-0 mt-1"
              aria-hidden="true"
            />

            <div>{error}</div>
          </div>

          <button
            type="button"
            className="btn-close"
            aria-label="Fechar mensagem"
            onClick={() =>
              setError("")
            }
          />
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <SummaryCard
            icon={History}
            title="Registros encontrados"
            value={formatNumber(
              pagination.total ||
                summary.total
            )}
            subtitle="Conforme os filtros aplicados"
            loading={loading}
          />
        </div>

        <div className="col-sm-6 col-xl-3">
          <SummaryCard
            icon={CheckCircle2}
            title="Destinações ativas"
            value={formatNumber(
              summary.active
            )}
            subtitle="Movimentações não canceladas"
            loading={loading}
          />
        </div>

        <div className="col-sm-6 col-xl-3">
          <SummaryCard
            icon={Warehouse}
            title="Movimentações para estoque"
            value={formatNumber(
              summary.stock
            )}
            subtitle="Destinações que geraram estoque"
            loading={loading}
          />
        </div>

        <div className="col-sm-6 col-xl-3">
          <SummaryCard
            icon={XCircle}
            title="Destinações canceladas"
            value={formatNumber(
              summary.cancelled
            )}
            subtitle="Movimentações anuladas"
            loading={loading}
          />
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <form
            onSubmit={
              handleApplyFilters
            }
          >
            <div className="row g-3 align-items-end">
              <div className="col-xl-6">
                <label
                  htmlFor="history-search"
                  className="form-label"
                >
                  Buscar
                </label>

                <div className="input-group">
                  <span className="input-group-text">
                    <Search
                      size={18}
                      aria-hidden="true"
                    />
                  </span>

                  <input
                    id="history-search"
                    name="search"
                    type="search"
                    className="form-control"
                    placeholder="Busque por resíduo, destino, gerador, lote ou coleta"
                    value={filters.search}
                    onChange={
                      handleFilterChange
                    }
                    onKeyDown={
                      handleSearchKeyDown
                    }
                  />
                </div>
              </div>

              <div className="col-sm-6 col-xl-2">
                <label
                  htmlFor="history-type"
                  className="form-label"
                >
                  Tipo
                </label>

                <select
                  id="history-type"
                  name="type"
                  className="form-select"
                  value={filters.type}
                  onChange={
                    handleFilterChange
                  }
                >
                  {DESTINATION_TYPE_OPTIONS.map(
                    (option) => (
                      <option
                        key={
                          option.value ||
                          "all"
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="col-sm-6 col-xl-2">
                <label
                  htmlFor="history-status"
                  className="form-label"
                >
                  Status
                </label>

                <select
                  id="history-status"
                  name="status"
                  className="form-select"
                  value={
                    filters.status
                  }
                  onChange={
                    handleFilterChange
                  }
                >
                  {DESTINATION_STATUS_OPTIONS.map(
                    (option) => (
                      <option
                        key={
                          option.value ||
                          "all"
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="col-xl-2">
                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary flex-grow-1 d-inline-flex align-items-center justify-content-center gap-2"
                  >
                    <Filter
                      size={17}
                      aria-hidden="true"
                    />

                    Filtrar
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary position-relative"
                    aria-label="Filtros avançados"
                    title="Filtros avançados"
                    onClick={() =>
                      setFiltersExpanded(
                        (current) =>
                          !current
                      )
                    }
                  >
                    <SlidersHorizontal
                      size={18}
                      aria-hidden="true"
                    />

                    {activeFilterCount >
                      0 && (
                      <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                        {
                          activeFilterCount
                        }
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {filtersExpanded && (
              <div className="border-top mt-4 pt-4">
                <div className="row g-3">
                  <div className="col-md-6 col-xl-3">
                    <label
                      htmlFor="history-entry-id"
                      className="form-label"
                    >
                      ID da entrada
                    </label>

                    <input
                      id="history-entry-id"
                      name="entryId"
                      type="text"
                      className="form-control"
                      value={
                        filters.entryId
                      }
                      onChange={
                        handleFilterChange
                      }
                      placeholder="Entrada de resíduo"
                    />
                  </div>

                  <div className="col-md-6 col-xl-3">
                    <label
                      htmlFor="history-destination-name"
                      className="form-label"
                    >
                      Nome do destino
                    </label>

                    <input
                      id="history-destination-name"
                      name="destinationName"
                      type="text"
                      className="form-control"
                      value={
                        filters.destinationName
                      }
                      onChange={
                        handleFilterChange
                      }
                      placeholder="Empresa ou unidade"
                    />
                  </div>

                  <div className="col-md-6 col-xl-2">
                    <label
                      htmlFor="history-date-from"
                      className="form-label"
                    >
                      Data inicial
                    </label>

                    <div className="input-group">
                      <span className="input-group-text">
                        <CalendarDays
                          size={17}
                          aria-hidden="true"
                        />
                      </span>

                      <input
                        id="history-date-from"
                        name="dateFrom"
                        type="date"
                        className="form-control"
                        value={
                          filters.dateFrom
                        }
                        onChange={
                          handleFilterChange
                        }
                      />
                    </div>
                  </div>

                  <div className="col-md-6 col-xl-2">
                    <label
                      htmlFor="history-date-to"
                      className="form-label"
                    >
                      Data final
                    </label>

                    <div className="input-group">
                      <span className="input-group-text">
                        <CalendarDays
                          size={17}
                          aria-hidden="true"
                        />
                      </span>

                      <input
                        id="history-date-to"
                        name="dateTo"
                        type="date"
                        className="form-control"
                        value={
                          filters.dateTo
                        }
                        onChange={
                          handleFilterChange
                        }
                      />
                    </div>
                  </div>

                  <div className="col-md-6 col-xl-2">
                    <div className="form-check mt-xl-4 pt-xl-2">
                      <input
                        id="include-cancelled"
                        name="includeCancelled"
                        type="checkbox"
                        className="form-check-input"
                        checked={
                          filters.includeCancelled
                        }
                        onChange={
                          handleFilterChange
                        }
                      />

                      <label
                        htmlFor="include-cancelled"
                        className="form-check-label"
                      >
                        Incluir canceladas
                      </label>
                    </div>
                  </div>

                  <div className="col-12">
                    <button
                      type="button"
                      className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
                      onClick={
                        handleResetFilters
                      }
                    >
                      <RotateCcw
                        size={17}
                        aria-hidden="true"
                      />

                      Restaurar filtros
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom py-3">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div>
              <h5 className="mb-1">
                Movimentações registradas
              </h5>

              <span className="text-muted small">
                {pagination.total} registro
                {pagination.total === 1
                  ? ""
                  : "s"}{" "}
                encontrado
                {pagination.total === 1
                  ? ""
                  : "s"}
              </span>
            </div>

            <div className="d-flex align-items-center gap-2">
              <label
                htmlFor="history-limit"
                className="text-muted small"
              >
                Exibir:
              </label>

              <select
                id="history-limit"
                className="form-select form-select-sm"
                style={{
                  width: 90,
                }}
                value={
                  appliedFilters.limit
                }
                onChange={
                  handleLimitChange
                }
              >
                {LIMIT_OPTIONS.map(
                  (limit) => (
                    <option
                      key={limit}
                      value={limit}
                    >
                      {limit}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="d-flex flex-column align-items-center justify-content-center py-5">
              <Loader2
                size={32}
                className="spinner-border"
                aria-hidden="true"
              />

              <span className="text-muted mt-3">
                Carregando histórico...
              </span>
            </div>
          ) : destinations.length ===
            0 ? (
            <EmptyState
              hasFilters={
                hasActiveFilters
              }
              onReset={
                handleResetFilters
              }
            />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th
                      scope="col"
                      style={{
                        minWidth: 210,
                      }}
                    >
                      Resíduo
                    </th>

                    <th
                      scope="col"
                      style={{
                        minWidth: 180,
                      }}
                    >
                      Tipo
                    </th>

                    <th
                      scope="col"
                      style={{
                        minWidth: 140,
                      }}
                    >
                      Quantidade
                    </th>

                    <th
                      scope="col"
                      style={{
                        minWidth: 220,
                      }}
                    >
                      Destino
                    </th>

                    <th
                      scope="col"
                      style={{
                        minWidth: 190,
                      }}
                    >
                      Origem
                    </th>

                    <th
                      scope="col"
                      style={{
                        minWidth: 150,
                      }}
                    >
                      Data
                    </th>

                    <th
                      scope="col"
                      style={{
                        minWidth: 130,
                      }}
                    >
                      Status
                    </th>

                    <th
                      scope="col"
                      style={{
                        minWidth: 190,
                      }}
                    >
                      Documentos
                    </th>

                    <th
                      scope="col"
                      className="text-end"
                      style={{
                        minWidth: 100,
                      }}
                    >
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {destinations.map(
                    (
                      destination,
                      index
                    ) => {
                      const destinationId =
                        getDestinationId(
                          destination
                        );

                      const entryId =
                        getDestinationEntryId(
                          destination
                        );

                      const lotCode =
                        getStockLotCode(
                          destination
                        );

                      const transportDocument =
                        getTransportDocument(
                          destination
                        );

                      const environmentalDocument =
                        getEnvironmentalDocument(
                          destination
                        );

                      return (
                        <tr
                          key={
                            destinationId ||
                            `${entryId}-${index}`
                          }
                        >
                          <td>
                            <div className="d-flex align-items-start gap-2">
                              <div
                                className="d-flex align-items-center justify-content-center rounded-3 bg-light flex-shrink-0"
                                style={{
                                  width: 38,
                                  height: 38,
                                }}
                              >
                                <PackageSearch
                                  size={19}
                                  aria-hidden="true"
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="fw-semibold">
                                  {getWasteName(
                                    destination
                                  )}
                                </div>

                                {getWasteCode(
                                  destination
                                ) && (
                                  <div className="text-muted small mt-1">
                                    Código:{" "}
                                    {getWasteCode(
                                      destination
                                    )}
                                  </div>
                                )}

                                <div className="text-muted small mt-1 text-break">
                                  Entrada:{" "}
                                  {entryId ||
                                    "Não informada"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="fw-semibold">
                              {getWasteDestinationTypeLabel(
                                getDestinationType(
                                  destination
                                )
                              )}
                            </div>

                            {lotCode && (
                              <div className="text-muted small mt-1">
                                Lote:{" "}
                                {lotCode}
                              </div>
                            )}
                          </td>

                          <td>
                            <strong>
                              {formatNumber(
                                getDestinationQuantity(
                                  destination
                                )
                              )}{" "}
                              {getCollectionEntryUnitShortLabel(
                                getDestinationUnit(
                                  destination
                                )
                              )}
                            </strong>
                          </td>

                          <td>
                            <div className="fw-semibold">
                              {getDestinationName(
                                destination
                              )}
                            </div>

                            {getDestinationDocument(
                              destination
                            ) && (
                              <div className="text-muted small mt-1">
                                {getDestinationDocument(
                                  destination
                                )}
                              </div>
                            )}

                            {getDestinationAddress(
                              destination
                            ) && (
                              <div className="text-muted small mt-1">
                                {getDestinationAddress(
                                  destination
                                )}
                              </div>
                            )}
                          </td>

                          <td>
                            <div className="fw-semibold">
                              {getGeneratorName(
                                destination
                              )}
                            </div>

                            <div className="text-muted small mt-1">
                              Coleta:{" "}
                              {getCollectionReference(
                                destination
                              )}
                            </div>

                            <div className="text-muted small">
                              Responsável:{" "}
                              {getResponsibleName(
                                destination
                              )}
                            </div>
                          </td>

                          <td>
                            <div>
                              {formatDate(
                                getDestinationDate(
                                  destination
                                )
                              )}
                            </div>

                            <div className="text-muted small mt-1">
                              Criado em{" "}
                              {formatDateTime(
                                destination?.createdAt
                              )}
                            </div>
                          </td>

                          <td>
                            <DestinationStatusBadge
                              status={getDestinationStatus(
                                destination
                              )}
                            />

                            {(destination?.cancelledReason ||
                              destination?.cancelReason) && (
                              <div className="text-muted small mt-2">
                                {destination?.cancelledReason ||
                                  destination?.cancelReason}
                              </div>
                            )}
                          </td>

                          <td>
                            {transportDocument ||
                            environmentalDocument ? (
                              <div className="d-grid gap-1 small">
                                {transportDocument && (
                                  <div>
                                    <strong>
                                      Transporte:
                                    </strong>{" "}
                                    {
                                      transportDocument
                                    }
                                  </div>
                                )}

                                {environmentalDocument && (
                                  <div>
                                    <strong>
                                      Ambiental:
                                    </strong>{" "}
                                    {
                                      environmentalDocument
                                    }
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted small">
                                Não informados
                              </span>
                            )}

                            {destination?.notes && (
                              <div className="text-muted small mt-2">
                                <FileText
                                  size={13}
                                  className="me-1"
                                  aria-hidden="true"
                                />

                                {destination.notes}
                              </div>
                            )}
                          </td>

                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                              disabled={
                                !entryId
                              }
                              onClick={() =>
                                handleViewEntry(
                                  destination
                                )
                              }
                            >
                              <Eye
                                size={15}
                                aria-hidden="true"
                              />

                              Ver
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading &&
          destinations.length > 0 && (
            <div className="card-footer bg-white border-top py-3">
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                <span className="text-muted small">
                  Página{" "}
                  <strong>
                    {pagination.page}
                  </strong>{" "}
                  de{" "}
                  <strong>
                    {Math.max(
                      pagination.totalPages,
                      1
                    )}
                  </strong>
                  , com{" "}
                  <strong>
                    {pagination.total}
                  </strong>{" "}
                  registro
                  {pagination.total === 1
                    ? ""
                    : "s"}{" "}
                  no total.
                </span>

                <nav aria-label="Paginação do histórico">
                  <ul className="pagination pagination-sm mb-0">
                    <li
                      className={`page-item ${
                        !pagination.hasPreviousPage
                          ? "disabled"
                          : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="page-link d-inline-flex align-items-center gap-1"
                        disabled={
                          !pagination.hasPreviousPage
                        }
                        onClick={() =>
                          changePage(
                            pagination.page -
                              1
                          )
                        }
                      >
                        <ChevronLeft
                          size={15}
                          aria-hidden="true"
                        />

                        Anterior
                      </button>
                    </li>

                    <li className="page-item active">
                      <span className="page-link">
                        {pagination.page}
                      </span>
                    </li>

                    <li
                      className={`page-item ${
                        !pagination.hasNextPage
                          ? "disabled"
                          : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="page-link d-inline-flex align-items-center gap-1"
                        disabled={
                          !pagination.hasNextPage
                        }
                        onClick={() =>
                          changePage(
                            pagination.page +
                              1
                          )
                        }
                      >
                        Próxima

                        <ChevronRight
                          size={15}
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          )}
      </div>

      <div className="card border-0 shadow-sm mt-4">
        <div className="card-body">
          <div className="d-flex align-items-start gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 bg-light flex-shrink-0"
              style={{
                width: 44,
                height: 44,
              }}
            >
              <ClipboardList
                size={22}
                aria-hidden="true"
              />
            </div>

            <div>
              <h6 className="mb-1">
                Rastreabilidade das movimentações
              </h6>

              <p className="text-muted small mb-0">
                Este histórico mantém o vínculo
                entre a coleta, o material
                coletado, a entrada intermediária,
                a destinação registrada e o lote
                criado no estoque, quando
                aplicável.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WasteDestinationHistory;