import {
  AlertCircle,
  ArrowDownUp,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Filter,
  History,
  Loader2,
  PackagePlus,
  RefreshCcw,
  RotateCcw,
  Scale,
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

import { useNavigate } from "react-router";

import {
  extractCollectionEntries,
  extractCollectionEntryPagination,
  extractCollectionEntrySummary,
  getCollectionEntries,
  getCollectionEntryStatusLabel,
  getCollectionEntryUnitShortLabel,
} from "../../services/collectionEntryService";

import {
  getWasteDestinationTypeLabel,
} from "../../services/collectionWasteDestinationService";

import {
  getWasteCatalog,
} from "../../services/wasteTypeService";

import CollectionEntryStatusBadge from "../../components/waste/CollectionEntryStatusBadge";
import WasteDestinationModal from "../../components/waste/WasteDestinationModal";

/*
 * ============================================================
 * CONFIGURAÇÕES
 * ============================================================
 */

const DEFAULT_FILTERS = {
  search: "",
  status: "",
  unit: "",
  wasteTypeId: "",
  generatorId: "",
  collectorId: "",
  routeId: "",
  dateFrom: "",
  dateTo: "",
  page: 1,
  limit: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
};

const STATUS_FILTER_OPTIONS = [
  {
    value: "",
    label: "Todos os status",
  },
  {
    value: "PENDING_DESTINATION",
    label: "Aguardando destinação",
  },
  {
    value: "PARTIALLY_DESTINED",
    label: "Parcialmente destinado",
  },
  {
    value: "FULLY_DESTINED",
    label: "Totalmente destinado",
  },
  {
    value: "SENT_TO_TRIAGE",
    label: "Enviado para triagem",
  },
  {
    value: "ADDED_TO_STOCK",
    label: "Adicionado ao estoque",
  },
  {
    value: "REJECTED",
    label: "Rejeito",
  },
  {
    value: "DISCARDED",
    label: "Descartado",
  },
  {
    value: "DIRECTLY_DESTINED",
    label: "Destinação direta",
  },
  {
    value: "RESERVED",
    label: "Reservado",
  },
  {
    value: "CANCELLED",
    label: "Cancelado",
  },
];

const UNIT_FILTER_OPTIONS = [
  {
    value: "",
    label: "Todas as unidades",
  },
  {
    value: "KG",
    label: "Quilogramas",
  },
  {
    value: "TON",
    label: "Toneladas",
  },
  {
    value: "UNIT",
    label: "Unidades",
  },
  {
    value: "LITER",
    label: "Litros",
  },
  {
    value: "CUBIC_METER",
    label: "Metros cúbicos",
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
 * HELPERS DE EXTRAÇÃO
 * ============================================================
 */

const extractWasteCatalogItems = (
  response
) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (
    Array.isArray(response?.data?.items)
  ) {
    return response.data.items;
  }

  if (
    Array.isArray(response?.wasteTypes)
  ) {
    return response.wasteTypes;
  }

  if (
    Array.isArray(
      response?.data?.wasteTypes
    )
  ) {
    return response.data.wasteTypes;
  }

  return [];
};

/*
 * ============================================================
 * HELPERS DA ENTRADA
 * ============================================================
 */

const getEntryId = (entry) => {
  return (
    entry?.id ||
    entry?.collectionWasteEntryId ||
    ""
  );
};

const getEntryWasteName = (entry) => {
  return (
    entry?.materialNameSnapshot ||
    entry?.wasteType?.name ||
    entry?.collectionMaterial?.nameSnapshot ||
    entry?.materialName ||
    entry?.wasteName ||
    "Resíduo não identificado"
  );
};

const getEntryWasteCode = (entry) => {
  return (
    entry?.wasteType?.internalCode ||
    entry?.wasteType?.code ||
    entry?.wasteStockItem?.internalCode ||
    entry?.wasteStockItem?.code ||
    entry?.stockItem?.internalCode ||
    entry?.stockItem?.code ||
    entry?.collectionMaterial?.wasteType
      ?.internalCode ||
    entry?.collectionMaterial?.wasteType
      ?.code ||
    entry?.collectionMaterial?.code ||
    entry?.materialCode ||
    ""
  );
};

const getEntryWasteCategory = (
  entry
) => {
  return (
    entry?.categorySnapshot ||
    entry?.wasteType?.category ||
    entry?.collectionMaterial?.categorySnapshot ||
    entry?.category ||
    ""
  );
};

const getEntryGeneratorName = (
  entry
) => {
  return (
    entry?.collection?.generator
      ?.companyName ||
    entry?.collection?.generator
      ?.tradeName ||
    entry?.collection?.generator?.name ||
    entry?.collection?.generator?.user
      ?.name ||
    entry?.generator?.companyName ||
    entry?.generator?.tradeName ||
    entry?.generator?.name ||
    entry?.generator?.user?.name ||
    "Gerador não informado"
  );
};

const getEntryGeneratorDocument = (
  entry
) => {
  return (
    entry?.collection?.generator?.cnpj ||
    entry?.collection?.generator?.cpf ||
    entry?.collection?.generator
      ?.document ||
    entry?.generator?.cnpj ||
    entry?.generator?.cpf ||
    entry?.generator?.document ||
    ""
  );
};

const getEntryCollectorName = (
  entry
) => {
  return (
    entry?.collection?.collector?.name ||
    entry?.collection?.collector?.user
      ?.name ||
    entry?.collector?.name ||
    entry?.collector?.user?.name ||
    "Não informado"
  );
};

const getEntryRouteName = (entry) => {
  return (
    entry?.collection?.route?.name ||
    entry?.collection?.route?.code ||
    entry?.route?.name ||
    entry?.route?.code ||
    "Sem rota"
  );
};

const getEntryCollectionReference = (
  entry
) => {
  return (
    entry?.collection?.code ||
    entry?.collection?.reference ||
    entry?.collection?.protocol ||
    entry?.collectionCode ||
    entry?.collectionId ||
    "Não informada"
  );
};

const getEntryCollectionDate = (
  entry
) => {
  return (
    entry?.collection?.collectedAt ||
    entry?.collection?.completedAt ||
    entry?.collection?.collectionDate ||
    entry?.collectedAt ||
    entry?.createdAt ||
    null
  );
};

const getEntryCreatedAt = (entry) => {
  return (
    entry?.createdAt ||
    entry?.collection?.createdAt ||
    null
  );
};

const getEntryUnit = (entry) => {
  return (
    entry?.unit ||
    entry?.collectionMaterial?.unit ||
    entry?.wasteType?.unit ||
    "KG"
  );
};

const getEntryTotalQuantity = (
  entry
) => {
  return normalizeNumber(
    entry?.quantity ??
      entry?.totalQuantity ??
      entry?.collectedQuantity ??
      entry?.originalQuantity ??
      entry?.collectionMaterial
        ?.quantity ??
      entry?.collectionMaterial
        ?.quantityKg ??
      0
  );
};

const getEntryDestinedQuantity = (
  entry
) => {
  return normalizeNumber(
    entry?.destinedQuantity ??
      entry?.allocatedQuantity ??
      entry?.processedQuantity ??
      entry?.totalDestinedQuantity ??
      0
  );
};

const getEntryRemainingQuantity = (
  entry
) => {
  const explicitValue =
    entry?.remainingQuantity ??
    entry?.availableQuantity ??
    entry?.balanceQuantity;

  if (
    explicitValue !== undefined &&
    explicitValue !== null
  ) {
    return Math.max(
      normalizeNumber(explicitValue),
      0
    );
  }

  return Math.max(
    getEntryTotalQuantity(entry) -
      getEntryDestinedQuantity(entry),
    0
  );
};

const getEntryStatus = (entry) => {
  return (
    entry?.status ||
    entry?.destinationStatus ||
    "PENDING_DESTINATION"
  );
};

const getEntryDestinations = (
  entry
) => {
  if (
    Array.isArray(entry?.destinations)
  ) {
    return entry.destinations;
  }

  if (
    Array.isArray(
      entry?.collectionWasteDestinations
    )
  ) {
    return (
      entry.collectionWasteDestinations
    );
  }

  return [];
};

const canCreateDestination = (
  entry
) => {
  const status = String(
    getEntryStatus(entry)
  )
    .trim()
    .toUpperCase();

  const remainingQuantity =
    getEntryRemainingQuantity(entry);

  if (remainingQuantity <= 0) {
    return false;
  }

  return ![
    "FULLY_DESTINED",
    "CANCELLED",
  ].includes(status);
};

/*
 * ============================================================
 * COMPONENTES INTERNOS
 * ============================================================
 */

const SummaryCard = ({
  // icon: Icon,
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
              <h4 className="mb-1 fw-bold">
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
            className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-3 bg-light"
            style={{
              width: 44,
              height: 44,
            }}
          >
            <Icon
              size={22}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({
  hasFilters,
  onResetFilters,
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
        <ClipboardList
          size={32}
          aria-hidden="true"
        />
      </div>

      <h5 className="mb-2">
        Nenhum resíduo coletado encontrado
      </h5>

      <p className="text-muted mb-3">
        {hasFilters
          ? "Não existem registros compatíveis com os filtros aplicados."
          : "As entradas serão exibidas quando as coletas concluídas gerarem materiais para destinação."}
      </p>

      {hasFilters && (
        <button
          type="button"
          className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
          onClick={onResetFilters}
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

const DestinationHistoryPreview = ({
  destinations,
}) => {
  if (!destinations.length) {
    return (
      <span className="text-muted small">
        Nenhuma destinação registrada.
      </span>
    );
  }

  const sortedDestinations = [
    ...destinations,
  ].sort((first, second) => {
    const firstDate = new Date(
      first?.destinationDate ||
        first?.createdAt ||
        0
    ).getTime();

    const secondDate = new Date(
      second?.destinationDate ||
        second?.createdAt ||
        0
    ).getTime();

    return secondDate - firstDate;
  });

  const latestDestination =
    sortedDestinations[0];

  return (
    <div className="small">
      <div className="fw-semibold">
        {getWasteDestinationTypeLabel(
          latestDestination?.type ||
            latestDestination
              ?.destinationType
        )}
      </div>

      <div className="text-muted">
        {formatNumber(
          latestDestination?.quantity ??
            latestDestination
              ?.destinedQuantity
        )}{" "}
        {getCollectionEntryUnitShortLabel(
          latestDestination?.unit
        )}

        {(latestDestination
          ?.destinationDate ||
          latestDestination?.createdAt) && (
          <>
            {" "}
            •{" "}
            {formatDate(
              latestDestination
                ?.destinationDate ||
                latestDestination
                  ?.createdAt
            )}
          </>
        )}
      </div>

      {sortedDestinations.length > 1 && (
        <div className="text-muted mt-1">
          +{" "}
          {sortedDestinations.length - 1}{" "}
          outra
          {sortedDestinations.length - 1 >
          1
            ? "s"
            : ""}
        </div>
      )}
    </div>
  );
};

/*
 * ============================================================
 * PÁGINA
 * ============================================================
 */

const CollectedWasteList = () => {
  const navigate = useNavigate();

  const [entries, setEntries] =
    useState([]);

  const [summary, setSummary] =
    useState(null);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });

  const [filters, setFilters] =
    useState(DEFAULT_FILTERS);

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState(DEFAULT_FILTERS);

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    filtersExpanded,
    setFiltersExpanded,
  ] = useState(false);

  const [
    selectedEntry,
    setSelectedEntry,
  ] = useState(null);

  const [
    destinationModalOpen,
    setDestinationModalOpen,
  ] = useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    stockItems,
    setStockItems,
  ] = useState([]);

  const [
    loadingStockItems,
    setLoadingStockItems,
  ] = useState(false);

  const [
    stockItemsError,
    setStockItemsError,
  ] = useState("");

  /*
   * ==========================================================
   * FILTROS ATIVOS
   * ==========================================================
   */

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        appliedFilters.search ||
          appliedFilters.status ||
          appliedFilters.unit ||
          appliedFilters.wasteTypeId ||
          appliedFilters.generatorId ||
          appliedFilters.collectorId ||
          appliedFilters.routeId ||
          appliedFilters.dateFrom ||
          appliedFilters.dateTo
      ),
    [appliedFilters]
  );

  const activeFilterCount = useMemo(
    () => {
      const keys = [
        "search",
        "status",
        "unit",
        "wasteTypeId",
        "generatorId",
        "collectorId",
        "routeId",
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
   * CARREGAMENTO DO CATÁLOGO
   * ==========================================================
   */

  const loadStockItems =
    useCallback(async () => {
      try {
        setLoadingStockItems(true);
        setStockItemsError("");

        const response =
          await getWasteCatalog({
            status: "ACTIVE",
          });

        setStockItems(
          extractWasteCatalogItems(
            response
          )
        );
      } catch (requestError) {
        setStockItems([]);

        setStockItemsError(
          getErrorMessage(
            requestError,
            "Não foi possível carregar o catálogo de resíduos."
          )
        );
      } finally {
        setLoadingStockItems(false);
      }
    }, []);

  /*
   * ==========================================================
   * CARREGAMENTO DAS ENTRADAS
   * ==========================================================
   */

  const loadEntries = useCallback(
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
          await getCollectionEntries(
            appliedFilters
          );

        const extractedEntries =
          extractCollectionEntries(
            response
          );

        const extractedPagination =
          extractCollectionEntryPagination(
            response
          );

        const extractedSummary =
          extractCollectionEntrySummary(
            response
          );

        setEntries(extractedEntries);

        setPagination(
          extractedPagination
        );

        setSummary(extractedSummary);
      } catch (requestError) {
        setEntries([]);

        setError(
          getErrorMessage(
            requestError,
            "Não foi possível carregar os resíduos coletados."
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
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    loadStockItems();
  }, [loadStockItems]);

  /*
   * ==========================================================
   * MENSAGEM TEMPORÁRIA
   * ==========================================================
   */

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timeoutId =
      window.setTimeout(() => {
        setSuccessMessage("");
      }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [successMessage]);

  /*
   * ==========================================================
   * RESUMO LOCAL
   * ==========================================================
   */

  const localSummary = useMemo(() => {
    return entries.reduce(
      (accumulator, entry) => {
        const total =
          getEntryTotalQuantity(entry);

        const destined =
          getEntryDestinedQuantity(
            entry
          );

        const remaining =
          getEntryRemainingQuantity(
            entry
          );

        accumulator.totalEntries += 1;
        accumulator.totalQuantity +=
          total;
        accumulator.destinedQuantity +=
          destined;
        accumulator.remainingQuantity +=
          remaining;

        if (
          getEntryStatus(entry) ===
          "PENDING_DESTINATION"
        ) {
          accumulator.pendingEntries +=
            1;
        }

        return accumulator;
      },
      {
        totalEntries: 0,
        pendingEntries: 0,
        totalQuantity: 0,
        destinedQuantity: 0,
        remainingQuantity: 0,
      }
    );
  }, [entries]);

  const resolvedSummary =
    summary || localSummary;

  /*
   * ==========================================================
   * FILTROS
   * ==========================================================
   */

  const handleFilterChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
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
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(
      DEFAULT_FILTERS
    );
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
   * ORDENAÇÃO
   * ==========================================================
   */

  const handleSort = (sortBy) => {
    const nextSortOrder =
      appliedFilters.sortBy ===
        sortBy &&
      appliedFilters.sortOrder ===
        "asc"
        ? "desc"
        : "asc";

    const nextFilters = {
      ...filters,
      sortBy,
      sortOrder: nextSortOrder,
      page: 1,
    };

    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
  };

  /*
   * ==========================================================
   * PAGINAÇÃO
   * ==========================================================
   */

  const changePage = (page) => {
    const totalPages = Math.max(
      pagination.totalPages,
      1
    );

    if (
      page < 1 ||
      page > totalPages
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
   * DESTINAÇÃO
   * ==========================================================
   */

  const handleOpenDestinationModal = (
    entry
  ) => {
    setSelectedEntry(entry);
    setDestinationModalOpen(true);
  };

  const handleCloseDestinationModal =
    () => {
      setDestinationModalOpen(false);
      setSelectedEntry(null);
    };

  const handleDestinationCreated =
    async () => {
      setSuccessMessage(
        "Destinação registrada com sucesso. A lista foi atualizada."
      );

      await loadEntries({
        showPageLoader: false,
      });
    };

  /*
   * ==========================================================
   * NAVEGAÇÃO
   * ==========================================================
   */

  const handleViewEntry = (entry) => {
    const entryId =
      getEntryId(entry);

    if (!entryId) {
      setError(
        "Não foi possível identificar a entrada selecionada."
      );

      return;
    }

    navigate(
      `/collected-waste/${entryId}`
    );
  };

  const handleViewHistory = (
    entry
  ) => {
    const entryId =
      getEntryId(entry);

    if (!entryId) {
      setError(
        "Não foi possível identificar a entrada selecionada."
      );

      return;
    }

    navigate(
      `/waste-destinations?entryId=${encodeURIComponent(
        entryId
      )}`
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
          <div className="d-flex align-items-center gap-2 mb-1">
            <ClipboardList
              size={26}
              aria-hidden="true"
            />

            <h2 className="mb-0">
              Resíduos coletados
            </h2>
          </div>

          <p className="text-muted mb-0">
            Gerencie os materiais provenientes
            das coletas antes de sua destinação
            ou inclusão no estoque.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
            disabled={
              loading || refreshing
            }
            onClick={() =>
              loadEntries({
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

          <button
            type="button"
            className="btn btn-outline-primary d-inline-flex align-items-center gap-2"
            onClick={() =>
              navigate(
                "/waste-destinations"
              )
            }
          >
            <History
              size={17}
              aria-hidden="true"
            />

            Histórico de destinações
          </button>
        </div>
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

      {successMessage && (
        <div
          className="alert alert-success d-flex align-items-start justify-content-between gap-3"
          role="status"
        >
          <div className="d-flex align-items-start gap-2">
            <CheckCircle2
              size={20}
              className="flex-shrink-0 mt-1"
              aria-hidden="true"
            />

            <div>
              {successMessage}
            </div>
          </div>

          <button
            type="button"
            className="btn-close"
            aria-label="Fechar mensagem"
            onClick={() =>
              setSuccessMessage("")
            }
          />
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <SummaryCard
            icon={ClipboardList}
            title="Entradas encontradas"
            value={formatNumber(
              resolvedSummary?.totalEntries ??
                resolvedSummary?.total ??
                pagination.total
            )}
            subtitle="Registros conforme os filtros"
            loading={loading}
          />
        </div>

        <div className="col-sm-6 col-xl-3">
          <SummaryCard
            icon={Scale}
            title="Quantidade coletada"
            value={formatNumber(
              resolvedSummary?.totalQuantity
            )}
            subtitle="Somatório dos registros exibidos"
            loading={loading}
          />
        </div>

        <div className="col-sm-6 col-xl-3">
          <SummaryCard
            icon={PackagePlus}
            title="Quantidade destinada"
            value={formatNumber(
              resolvedSummary
                ?.destinedQuantity
            )}
            subtitle="Material já encaminhado"
            loading={loading}
          />
        </div>

        <div className="col-sm-6 col-xl-3">
          <SummaryCard
            icon={Warehouse}
            title="Saldo disponível"
            value={formatNumber(
              resolvedSummary
                ?.remainingQuantity
            )}
            subtitle={`${
              resolvedSummary?.pendingEntries ??
              0
            } entrada(s) pendente(s)`}
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
              <div className="col-xl-7">
                <label
                  htmlFor="waste-search"
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
                    id="waste-search"
                    type="search"
                    name="search"
                    className="form-control"
                    placeholder="Busque por resíduo, coleta, gerador, rota ou catador"
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
                  htmlFor="waste-status"
                  className="form-label"
                >
                  Status
                </label>

                <select
                  id="waste-status"
                  name="status"
                  className="form-select"
                  value={filters.status}
                  onChange={
                    handleFilterChange
                  }
                >
                  {STATUS_FILTER_OPTIONS.map(
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

              <div className="col-sm-6 col-xl-3">
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
                    title="Filtros avançados"
                    aria-label="Filtros avançados"
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

                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      title="Limpar filtros"
                      aria-label="Limpar filtros"
                      onClick={
                        handleResetFilters
                      }
                    >
                      <XCircle
                        size={18}
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {filtersExpanded && (
              <div className="border-top mt-4 pt-4">
                <div className="row g-3">
                  <div className="col-md-6 col-xl-3">
                    <label
                      htmlFor="waste-unit"
                      className="form-label"
                    >
                      Unidade
                    </label>

                    <select
                      id="waste-unit"
                      name="unit"
                      className="form-select"
                      value={filters.unit}
                      onChange={
                        handleFilterChange
                      }
                    >
                      {UNIT_FILTER_OPTIONS.map(
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
                            {
                              option.label
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="col-md-6 col-xl-3">
                    <label
                      htmlFor="waste-type-id"
                      className="form-label"
                    >
                      ID do tipo de resíduo
                    </label>

                    <input
                      id="waste-type-id"
                      name="wasteTypeId"
                      type="text"
                      className="form-control"
                      value={
                        filters.wasteTypeId
                      }
                      onChange={
                        handleFilterChange
                      }
                      placeholder="Filtrar pelo catálogo"
                    />
                  </div>

                  <div className="col-md-6 col-xl-3">
                    <label
                      htmlFor="generator-id"
                      className="form-label"
                    >
                      ID do gerador
                    </label>

                    <input
                      id="generator-id"
                      name="generatorId"
                      type="text"
                      className="form-control"
                      value={
                        filters.generatorId
                      }
                      onChange={
                        handleFilterChange
                      }
                      placeholder="Gerador específico"
                    />
                  </div>

                  <div className="col-md-6 col-xl-3">
                    <label
                      htmlFor="collector-id"
                      className="form-label"
                    >
                      ID do catador
                    </label>

                    <input
                      id="collector-id"
                      name="collectorId"
                      type="text"
                      className="form-control"
                      value={
                        filters.collectorId
                      }
                      onChange={
                        handleFilterChange
                      }
                      placeholder="Catador específico"
                    />
                  </div>

                  <div className="col-md-6 col-xl-3">
                    <label
                      htmlFor="route-id"
                      className="form-label"
                    >
                      ID da rota
                    </label>

                    <input
                      id="route-id"
                      name="routeId"
                      type="text"
                      className="form-control"
                      value={
                        filters.routeId
                      }
                      onChange={
                        handleFilterChange
                      }
                      placeholder="Rota específica"
                    />
                  </div>

                  <div className="col-md-6 col-xl-3">
                    <label
                      htmlFor="date-from"
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
                        id="date-from"
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

                  <div className="col-md-6 col-xl-3">
                    <label
                      htmlFor="date-to"
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
                        id="date-to"
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

                  <div className="col-md-6 col-xl-3 d-flex align-items-end">
                    <button
                      type="button"
                      className="btn btn-outline-secondary w-100 d-inline-flex align-items-center justify-content-center gap-2"
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
          <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
            <div>
              <h5 className="mb-1">
                Materiais disponíveis para
                gestão
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

            <div className="d-flex flex-wrap align-items-center gap-2">
              <label
                htmlFor="results-limit"
                className="text-muted small"
              >
                Exibir:
              </label>

              <select
                id="results-limit"
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
                Carregando resíduos
                coletados...
              </span>
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              hasFilters={
                hasActiveFilters
              }
              onResetFilters={
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
                        minWidth: 220,
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-link text-decoration-none text-dark p-0 d-inline-flex align-items-center gap-1 fw-semibold"
                        onClick={() =>
                          handleSort(
                            "wasteType"
                          )
                        }
                      >
                        Resíduo

                        <ArrowDownUp
                          size={14}
                          aria-hidden="true"
                        />
                      </button>
                    </th>

                    <th
                      scope="col"
                      style={{
                        minWidth: 200,
                      }}
                    >
                      Origem
                    </th>

                    <th
                      scope="col"
                      style={{
                        minWidth: 190,
                      }}
                    >
                      Quantidades
                    </th>

                    <th
                      scope="col"
                      style={{
                        minWidth: 160,
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
                      Última destinação
                    </th>

                    <th
                      scope="col"
                      style={{
                        minWidth: 140,
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-link text-decoration-none text-dark p-0 d-inline-flex align-items-center gap-1 fw-semibold"
                        onClick={() =>
                          handleSort(
                            "createdAt"
                          )
                        }
                      >
                        Data

                        <ArrowDownUp
                          size={14}
                          aria-hidden="true"
                        />
                      </button>
                    </th>

                    <th
                      scope="col"
                      className="text-end"
                      style={{
                        minWidth: 210,
                      }}
                    >
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {entries.map(
                    (entry, index) => {
                      const entryId =
                        getEntryId(entry);

                      const unit =
                        getEntryUnit(entry);

                      const totalQuantity =
                        getEntryTotalQuantity(
                          entry
                        );

                      const destinedQuantity =
                        getEntryDestinedQuantity(
                          entry
                        );

                      const remainingQuantity =
                        getEntryRemainingQuantity(
                          entry
                        );

                      const destinations =
                        getEntryDestinations(
                          entry
                        );

                      const wasteCode =
                        getEntryWasteCode(
                          entry
                        );

                      const wasteCategory =
                        getEntryWasteCategory(
                          entry
                        );

                      const percentage =
                        totalQuantity > 0
                          ? Math.min(
                              Math.max(
                                (destinedQuantity /
                                  totalQuantity) *
                                  100,
                                0
                              ),
                              100
                            )
                          : 0;

                      return (
                        <tr
                          key={
                            entryId ||
                            `${getEntryWasteName(
                              entry
                            )}-${index}`
                          }
                        >
                          <td>
                            <div className="d-flex align-items-start gap-3">
                              <div
                                className="d-flex align-items-center justify-content-center rounded-3 bg-light flex-shrink-0"
                                style={{
                                  width: 42,
                                  height: 42,
                                }}
                              >
                                <Scale
                                  size={20}
                                  aria-hidden="true"
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="fw-semibold">
                                  {getEntryWasteName(
                                    entry
                                  )}
                                </div>

                                {(wasteCode ||
                                  wasteCategory) && (
                                  <div className="text-muted small mt-1">
                                    {wasteCode && (
                                      <span>
                                        Código:{" "}
                                        {
                                          wasteCode
                                        }
                                      </span>
                                    )}

                                    {wasteCode &&
                                      wasteCategory && (
                                        <span>
                                          {" "}
                                          •{" "}
                                        </span>
                                      )}

                                    {wasteCategory && (
                                      <span>
                                        {
                                          wasteCategory
                                        }
                                      </span>
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
                              {getEntryGeneratorName(
                                entry
                              )}
                            </div>

                            {getEntryGeneratorDocument(
                              entry
                            ) && (
                              <div className="text-muted small">
                                {getEntryGeneratorDocument(
                                  entry
                                )}
                              </div>
                            )}

                            <div className="text-muted small mt-1">
                              Coleta:{" "}
                              {getEntryCollectionReference(
                                entry
                              )}
                            </div>

                            <div className="text-muted small">
                              Rota:{" "}
                              {getEntryRouteName(
                                entry
                              )}
                            </div>

                            <div className="text-muted small">
                              Catador:{" "}
                              {getEntryCollectorName(
                                entry
                              )}
                            </div>
                          </td>

                          <td>
                            <div
                              className="d-grid gap-1"
                              style={{
                                fontSize: 13,
                              }}
                            >
                              <div className="d-flex justify-content-between gap-3">
                                <span className="text-muted">
                                  Coletado:
                                </span>

                                <strong>
                                  {formatNumber(
                                    totalQuantity
                                  )}{" "}
                                  {getCollectionEntryUnitShortLabel(
                                    unit
                                  )}
                                </strong>
                              </div>

                              <div className="d-flex justify-content-between gap-3">
                                <span className="text-muted">
                                  Destinado:
                                </span>

                                <strong>
                                  {formatNumber(
                                    destinedQuantity
                                  )}{" "}
                                  {getCollectionEntryUnitShortLabel(
                                    unit
                                  )}
                                </strong>
                              </div>

                              <div className="d-flex justify-content-between gap-3">
                                <span className="text-muted">
                                  Disponível:
                                </span>

                                <strong>
                                  {formatNumber(
                                    remainingQuantity
                                  )}{" "}
                                  {getCollectionEntryUnitShortLabel(
                                    unit
                                  )}
                                </strong>
                              </div>
                            </div>

                            <div className="mt-2">
                              <div
                                className="progress"
                                style={{
                                  height: 5,
                                }}
                                role="progressbar"
                                aria-label="Percentual destinado"
                                aria-valuenow={
                                  percentage
                                }
                                aria-valuemin="0"
                                aria-valuemax="100"
                              >
                                <div
                                  className="progress-bar"
                                  style={{
                                    width: `${percentage}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          <td>
                            <CollectionEntryStatusBadge
                              status={getEntryStatus(
                                entry
                              )}
                            />

                            <div className="text-muted small mt-2">
                              {getCollectionEntryStatusLabel(
                                getEntryStatus(
                                  entry
                                )
                              )}
                            </div>
                          </td>

                          <td>
                            <DestinationHistoryPreview
                              destinations={
                                destinations
                              }
                            />
                          </td>

                          <td>
                            <div>
                              {formatDate(
                                getEntryCollectionDate(
                                  entry
                                )
                              )}
                            </div>

                            <div className="text-muted small mt-1">
                              Criado em{" "}
                              {formatDateTime(
                                getEntryCreatedAt(
                                  entry
                                )
                              )}
                            </div>
                          </td>

                          <td className="text-end">
                            <div className="d-flex flex-wrap justify-content-end gap-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                                title="Visualizar entrada"
                                disabled={
                                  !entryId
                                }
                                onClick={() =>
                                  handleViewEntry(
                                    entry
                                  )
                                }
                              >
                                <Eye
                                  size={15}
                                  aria-hidden="true"
                                />

                                Ver
                              </button>

                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                                title="Ver histórico"
                                disabled={
                                  !entryId
                                }
                                onClick={() =>
                                  handleViewHistory(
                                    entry
                                  )
                                }
                              >
                                <History
                                  size={15}
                                  aria-hidden="true"
                                />

                                Histórico
                              </button>

                              <button
                                type="button"
                                className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                                disabled={
                                  !canCreateDestination(
                                    entry
                                  )
                                }
                                title={
                                  canCreateDestination(
                                    entry
                                  )
                                    ? "Registrar nova destinação"
                                    : "Não há saldo disponível para destinação"
                                }
                                onClick={() =>
                                  handleOpenDestinationModal(
                                    entry
                                  )
                                }
                              >
                                <PackagePlus
                                  size={15}
                                  aria-hidden="true"
                                />

                                Destinar
                              </button>
                            </div>
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
          entries.length > 0 && (
            <div className="card-footer bg-white border-top py-3">
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                <div className="text-muted small">
                  Exibindo página{" "}
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
                </div>

                <nav
                  aria-label="Paginação dos resíduos coletados"
                >
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
              <Warehouse
                size={22}
                aria-hidden="true"
              />
            </div>

            <div>
              <h6 className="mb-1">
                Fluxo de gestão dos resíduos
              </h6>

              <p className="text-muted small mb-0">
                Os materiais apresentados nesta
                página foram coletados e estão
                disponíveis para definição
                operacional. Cada entrada pode
                ser destinada integralmente ou
                parcialmente para estoque,
                triagem, rejeito, descarte,
                reserva ou destinação direta.
              </p>
            </div>
          </div>
        </div>
      </div>

      <WasteDestinationModal
        open={destinationModalOpen}
        entry={selectedEntry}
        stockItems={stockItems}
        loadingStockItems={
          loadingStockItems
        }
        stockItemsError={
          stockItemsError
        }
        onReloadStockItems={
          loadStockItems
        }
        onClose={
          handleCloseDestinationModal
        }
        onSuccess={
          handleDestinationCreated
        }
      />
    </div>
  );
};

export default CollectedWasteList;