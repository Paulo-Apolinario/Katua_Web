import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  History,
  Loader2,
  MapPin,
  PackagePlus,
  RefreshCcw,
  Route,
  Scale,
  Truck,
  UserRound,
  Warehouse,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router";

import {
  extractCollectionEntry,
  getCollectionEntryById,
  getCollectionEntryStatusLabel,
  getCollectionEntryUnitShortLabel,
} from "../../services/collectionEntryService";

import {
  extractWasteDestinations,
  getWasteDestinationsByEntry,
  getWasteDestinationStatusLabel,
  getWasteDestinationTypeLabel,
} from "../../services/collectionWasteDestinationService";

import {
  getWasteCatalog,
} from "../../services/wasteTypeService";

import CollectionEntryStatusBadge from "../../components/waste/CollectionEntryStatusBadge";
import WasteDestinationModal from "../../components/waste/WasteDestinationModal";
import WasteQuantitySummary from "../../components/waste/WasteQuantitySummary";

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
 * EXTRAÇÃO DO CATÁLOGO
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

const getWasteName = (entry) => {
  return (
    entry?.wasteType?.name ||
    entry?.wasteStockItem?.name ||
    entry?.stockItem?.name ||
    entry?.collectionMaterial?.wasteType
      ?.name ||
    entry?.collectionMaterial
      ?.materialType?.name ||
    entry?.collectionMaterial?.type ||
    entry?.materialName ||
    entry?.wasteName ||
    "Resíduo não identificado"
  );
};

const getWasteCode = (entry) => {
  return (
    entry?.wasteType?.internalCode ||
    entry?.wasteType?.code ||
    entry?.wasteStockItem
      ?.internalCode ||
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

const getWasteCategory = (entry) => {
  return (
    entry?.wasteType?.category?.name ||
    entry?.wasteType?.category ||
    entry?.collectionMaterial?.wasteType
      ?.category?.name ||
    entry?.collectionMaterial?.wasteType
      ?.category ||
    entry?.collectionMaterial?.category ||
    entry?.category ||
    "Não informada"
  );
};

const getWasteDescription = (entry) => {
  return (
    entry?.wasteType?.description ||
    entry?.stockItem?.description ||
    entry?.wasteStockItem?.description ||
    entry?.collectionMaterial
      ?.description ||
    entry?.description ||
    ""
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

const getTotalQuantity = (entry) => {
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

const getDestinedQuantity = (entry) => {
  return normalizeNumber(
    entry?.destinedQuantity ??
      entry?.allocatedQuantity ??
      entry?.processedQuantity ??
      entry?.totalDestinedQuantity ??
      0
  );
};

const getRemainingQuantity = (entry) => {
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
    getTotalQuantity(entry) -
      getDestinedQuantity(entry),
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

const getCollection = (entry) => {
  return (
    entry?.collection ||
    entry?.collectionMaterial
      ?.collection ||
    {}
  );
};

const getGenerator = (entry) => {
  const collection =
    getCollection(entry);

  return (
    collection?.generator ||
    entry?.generator ||
    {}
  );
};

const getGeneratorName = (entry) => {
  const generator =
    getGenerator(entry);

  return (
    generator?.companyName ||
    generator?.tradeName ||
    generator?.name ||
    generator?.user?.name ||
    "Gerador não informado"
  );
};

const getGeneratorDocument = (
  entry
) => {
  const generator =
    getGenerator(entry);

  return (
    generator?.cnpj ||
    generator?.cpf ||
    generator?.document ||
    ""
  );
};

const getGeneratorAddress = (
  entry
) => {
  const generator =
    getGenerator(entry);

  const directAddress =
    generator?.fullAddress ||
    generator?.address;

  if (
    directAddress &&
    typeof directAddress === "string"
  ) {
    return directAddress;
  }

  return [
    generator?.street,
    generator?.number,
    generator?.complement,
    generator?.neighborhood,
    generator?.city,
    generator?.state,
    generator?.zipCode,
  ]
    .filter(Boolean)
    .join(", ");
};

const getCollectorName = (entry) => {
  const collection =
    getCollection(entry);

  const collector =
    collection?.collector ||
    entry?.collector ||
    {};

  return (
    collector?.name ||
    collector?.user?.name ||
    "Não informado"
  );
};

const getDriverName = (entry) => {
  const collection =
    getCollection(entry);

  const driver =
    collection?.driver ||
    entry?.driver ||
    {};

  return (
    driver?.name ||
    driver?.user?.name ||
    "Não informado"
  );
};

const getVehicleName = (entry) => {
  const collection =
    getCollection(entry);

  const vehicle =
    collection?.vehicle ||
    entry?.vehicle ||
    {};

  const description =
    vehicle?.name ||
    [
      vehicle?.brand,
      vehicle?.model,
    ]
      .filter(Boolean)
      .join(" ") ||
    "";

  const plate =
    vehicle?.plate ||
    vehicle?.licensePlate ||
    "";

  if (description && plate) {
    return `${description} • ${plate}`;
  }

  return (
    description ||
    plate ||
    "Não informado"
  );
};

const getRouteName = (entry) => {
  const collection =
    getCollection(entry);

  const route =
    collection?.route ||
    entry?.route ||
    {};

  return (
    route?.name ||
    route?.code ||
    "Sem rota"
  );
};

const getCollectionReference = (
  entry
) => {
  const collection =
    getCollection(entry);

  return (
    collection?.code ||
    collection?.reference ||
    collection?.protocol ||
    entry?.collectionCode ||
    entry?.collectionId ||
    "Não informada"
  );
};

const getCollectionDate = (entry) => {
  const collection =
    getCollection(entry);

  return (
    collection?.collectedAt ||
    collection?.completedAt ||
    collection?.collectionDate ||
    entry?.collectedAt ||
    entry?.createdAt ||
    null
  );
};

const getCollectionNotes = (entry) => {
  const collection =
    getCollection(entry);

  return (
    entry?.notes ||
    entry?.collectionMaterial?.notes ||
    collection?.notes ||
    ""
  );
};

const canCreateDestination = (entry) => {
  if (!entry) {
    return false;
  }

  const status = normalizeText(
    getEntryStatus(entry)
  ).toUpperCase();

  if (
    getRemainingQuantity(entry) <= 0
  ) {
    return false;
  }

  return ![
    "FULLY_DESTINED",
    "CANCELLED",
  ].includes(status);
};

/*
 * ============================================================
 * HELPERS DAS DESTINAÇÕES
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
  destination,
  entry
) => {
  return (
    destination?.unit ||
    getEntryUnit(entry)
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

const getDestinationResponsible = (
  destination
) => {
  return (
    destination?.createdBy?.name ||
    destination?.createdByUser?.name ||
    destination?.user?.name ||
    destination?.responsible?.name ||
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

const getDestinationStockLotCode = (
  destination
) => {
  return (
    destination?.stockLot?.code ||
    destination?.wasteStockLot?.code ||
    destination?.stockLotCode ||
    ""
  );
};

/*
 * ============================================================
 * COMPONENTES INTERNOS
 * ============================================================
 */

const InformationItem = ({
  icon: Icon,
  label,
  value,
  fullWidth = false,
}) => {
  return (
    <div
      className={
        fullWidth
          ? "col-12"
          : "col-md-6 col-xl-4"
      }
    >
      <div className="d-flex align-items-start gap-2 h-100">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 bg-light flex-shrink-0"
          style={{
            width: 36,
            height: 36,
          }}
        >
          {Icon ? (
            <Icon
              size={18}
              aria-hidden="true"
            />
          ) : (
            <ClipboardList
              size={18}
              aria-hidden="true"
            />
          )}
        </div>

        <div className="min-w-0">
          <span className="text-muted small d-block">
            {label}
          </span>

          <span className="fw-semibold text-break">
            {value || "Não informado"}
          </span>
        </div>
      </div>
    </div>
  );
};

const EmptyDestinations = ({
  canDestination,
  onCreate,
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
        Nenhuma destinação registrada
      </h5>

      <p className="text-muted mb-3">
        Esta entrada de resíduo ainda não
        possui movimentações de destinação.
      </p>

      {canDestination && (
        <button
          type="button"
          className="btn btn-primary d-inline-flex align-items-center gap-2"
          onClick={onCreate}
        >
          <PackagePlus
            size={17}
            aria-hidden="true"
          />

          Registrar primeira destinação
        </button>
      )}
    </div>
  );
};

/*
 * ============================================================
 * PÁGINA
 * ============================================================
 */

const WasteDestinationForm = () => {
  const navigate = useNavigate();

  const {
    id: entryId,
  } = useParams();

  const [entry, setEntry] =
    useState(null);

  const [
    destinations,
    setDestinations,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    destinationModalOpen,
    setDestinationModalOpen,
  ] = useState(false);

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
   * CARREGAMENTO DA PÁGINA
   * ==========================================================
   */

  const loadPageData = useCallback(
    async ({
      showPageLoader = true,
    } = {}) => {
      if (!entryId) {
        setError(
          "O identificador da entrada de resíduo não foi informado."
        );

        setEntry(null);
        setDestinations([]);
        setLoading(false);
        return;
      }

      try {
        if (showPageLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        const [
          entryResult,
          destinationsResult,
        ] = await Promise.allSettled([
          getCollectionEntryById(
            entryId
          ),

          getWasteDestinationsByEntry(
            entryId,
            {
              page: 1,
              limit: 100,
              includeCancelled: true,
            }
          ),
        ]);

        if (entryResult.status === "rejected") {
          throw entryResult.reason;
        }

        const extractedEntry =
          extractCollectionEntry(
            entryResult.value
          );

        const extractedDestinations =
          destinationsResult.status === "fulfilled"
            ? extractWasteDestinations(
                destinationsResult.value
              )
            : [];

        if (!extractedEntry) {
          throw new Error(
            "A entrada de resíduo não foi encontrada."
          );
        }

        setEntry(extractedEntry);

        setDestinations(
          extractedDestinations
        );
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            "Não foi possível carregar os dados da entrada de resíduo."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [entryId]
  );

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

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
   * DADOS CALCULADOS
   * ==========================================================
   */

  const totalQuantity = useMemo(
    () => getTotalQuantity(entry),
    [entry]
  );

  const destinedQuantity = useMemo(
    () => getDestinedQuantity(entry),
    [entry]
  );

  const remainingQuantity = useMemo(
    () => getRemainingQuantity(entry),
    [entry]
  );

  const unit = useMemo(
    () => getEntryUnit(entry),
    [entry]
  );

  const activeDestinations =
    useMemo(
      () =>
        destinations.filter(
          (destination) =>
            getDestinationStatus(
              destination
            ) !== "CANCELLED"
        ),
      [destinations]
    );

  const cancelledDestinations =
    useMemo(
      () =>
        destinations.filter(
          (destination) =>
            getDestinationStatus(
              destination
            ) === "CANCELLED"
        ),
      [destinations]
    );

  const destinationsTotal =
    useMemo(
      () =>
        activeDestinations.reduce(
          (
            accumulator,
            destination
          ) =>
            accumulator +
            getDestinationQuantity(
              destination
            ),
          0
        ),
      [activeDestinations]
    );

  const sortedDestinations =
    useMemo(() => {
      return [
        ...destinations,
      ].sort((first, second) => {
        const firstDate = new Date(
          getDestinationDate(first) ||
            0
        ).getTime();

        const secondDate = new Date(
          getDestinationDate(second) ||
            0
        ).getTime();

        return secondDate - firstDate;
      });
    }, [destinations]);

  /*
   * ==========================================================
   * AÇÕES
   * ==========================================================
   */

  const handleDestinationCreated =
    async () => {
      setSuccessMessage(
        "Destinação registrada com sucesso."
      );

      setDestinationModalOpen(false);

      await loadPageData({
        showPageLoader: false,
      });
    };

  const handleOpenHistory = () => {
    if (!entryId) {
      setError(
        "Não foi possível identificar a entrada de resíduo."
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
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div
          className="d-flex flex-column align-items-center justify-content-center"
          style={{
            minHeight: 420,
          }}
        >
          <Loader2
            size={34}
            className="spinner-border"
            aria-hidden="true"
          />

          <span className="text-muted mt-3">
            Carregando entrada de resíduo...
          </span>
        </div>
      </div>
    );
  }

  /*
   * ==========================================================
   * ERRO SEM ENTRADA
   * ==========================================================
   */

  if (error && !entry) {
    return (
      <div className="container-fluid py-4">
        <button
          type="button"
          className="btn btn-outline-secondary d-inline-flex align-items-center gap-2 mb-4"
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

        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <AlertCircle
              size={48}
              className="mb-3"
              aria-hidden="true"
            />

            <h4>
              Não foi possível carregar a
              entrada
            </h4>

            <p className="text-muted mb-4">
              {error}
            </p>

            <button
              type="button"
              className="btn btn-primary d-inline-flex align-items-center gap-2"
              onClick={() =>
                loadPageData()
              }
            >
              <RefreshCcw
                size={17}
                aria-hidden="true"
              />

              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

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

          <div className="d-flex align-items-start gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 bg-light flex-shrink-0"
              style={{
                width: 52,
                height: 52,
              }}
            >
              <Scale
                size={26}
                aria-hidden="true"
              />
            </div>

            <div>
              <h2 className="mb-1">
                {getWasteName(entry)}
              </h2>

              <div className="d-flex flex-wrap align-items-center gap-2">
                <CollectionEntryStatusBadge
                  status={getEntryStatus(
                    entry
                  )}
                />

                {getWasteCode(entry) && (
                  <span className="badge text-bg-light">
                    Código:{" "}
                    {getWasteCode(entry)}
                  </span>
                )}

                <span className="text-muted small text-break">
                  Entrada:{" "}
                  {getEntryId(entry)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
            disabled={refreshing}
            onClick={() =>
              loadPageData({
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
            onClick={
              handleOpenHistory
            }
          >
            <History
              size={17}
              aria-hidden="true"
            />

            Histórico completo
          </button>

          <button
            type="button"
            className="btn btn-primary d-inline-flex align-items-center gap-2"
            disabled={
              !canCreateDestination(
                entry
              )
            }
            title={
              canCreateDestination(entry)
                ? "Registrar uma nova destinação"
                : "Não existe saldo disponível para destinação"
            }
            onClick={() =>
              setDestinationModalOpen(
                true
              )
            }
          >
            <PackagePlus
              size={17}
              aria-hidden="true"
            />

            Registrar destinação
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

      <div className="row g-4">
        <div className="col-12">
          <WasteQuantitySummary
            totalQuantity={
              totalQuantity
            }
            destinedQuantity={
              destinedQuantity
            }
            remainingQuantity={
              remainingQuantity
            }
            unit={unit}
          />
        </div>

        <div className="col-xl-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3">
              <div className="d-flex align-items-center gap-2">
                <ClipboardList
                  size={20}
                  aria-hidden="true"
                />

                <h5 className="mb-0">
                  Dados do material
                </h5>
              </div>
            </div>

            <div className="card-body">
              <div className="row g-4">
                <InformationItem
                  icon={Scale}
                  label="Tipo de resíduo"
                  value={getWasteName(
                    entry
                  )}
                />

                <InformationItem
                  icon={ClipboardList}
                  label="Categoria"
                  value={getWasteCategory(
                    entry
                  )}
                />

                <InformationItem
                  icon={Warehouse}
                  label="Unidade de medida"
                  value={getCollectionEntryUnitShortLabel(
                    unit
                  )}
                />

                <InformationItem
                  icon={CalendarDays}
                  label="Data da coleta"
                  value={formatDate(
                    getCollectionDate(
                      entry
                    )
                  )}
                />

                <InformationItem
                  icon={FileText}
                  label="Referência da coleta"
                  value={getCollectionReference(
                    entry
                  )}
                />

                <InformationItem
                  icon={CheckCircle2}
                  label="Status operacional"
                  value={getCollectionEntryStatusLabel(
                    getEntryStatus(
                      entry
                    )
                  )}
                />

                {getWasteDescription(
                  entry
                ) && (
                  <InformationItem
                    icon={FileText}
                    label="Descrição"
                    value={getWasteDescription(
                      entry
                    )}
                    fullWidth
                  />
                )}

                {getCollectionNotes(
                  entry
                ) && (
                  <InformationItem
                    icon={FileText}
                    label="Observações"
                    value={getCollectionNotes(
                      entry
                    )}
                    fullWidth
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="mb-0">
                Resumo das destinações
              </h5>
            </div>

            <div className="card-body">
              <div className="d-grid gap-3">
                <div className="border rounded-3 p-3">
                  <span className="text-muted small d-block">
                    Destinações ativas
                  </span>

                  <strong className="fs-4">
                    {
                      activeDestinations.length
                    }
                  </strong>
                </div>

                <div className="border rounded-3 p-3">
                  <span className="text-muted small d-block">
                    Quantidade destinada
                  </span>

                  <strong className="fs-4">
                    {formatNumber(
                      destinationsTotal
                    )}{" "}
                    {getCollectionEntryUnitShortLabel(
                      unit
                    )}
                  </strong>
                </div>

                <div className="border rounded-3 p-3">
                  <span className="text-muted small d-block">
                    Destinações canceladas
                  </span>

                  <strong className="fs-4">
                    {
                      cancelledDestinations.length
                    }
                  </strong>
                </div>

                <div className="border rounded-3 p-3">
                  <span className="text-muted small d-block">
                    Saldo disponível
                  </span>

                  <strong className="fs-4">
                    {formatNumber(
                      remainingQuantity
                    )}{" "}
                    {getCollectionEntryUnitShortLabel(
                      unit
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <div className="d-flex align-items-center gap-2">
                <MapPin
                  size={20}
                  aria-hidden="true"
                />

                <h5 className="mb-0">
                  Origem da coleta
                </h5>
              </div>
            </div>

            <div className="card-body">
              <div className="row g-4">
                <InformationItem
                  icon={Warehouse}
                  label="Gerador"
                  value={getGeneratorName(
                    entry
                  )}
                />

                <InformationItem
                  icon={FileText}
                  label="Documento"
                  value={
                    getGeneratorDocument(
                      entry
                    ) ||
                    "Não informado"
                  }
                />

                <InformationItem
                  icon={MapPin}
                  label="Endereço"
                  value={
                    getGeneratorAddress(
                      entry
                    ) ||
                    "Não informado"
                  }
                />

                <InformationItem
                  icon={UserRound}
                  label="Catador"
                  value={getCollectorName(
                    entry
                  )}
                />

                <InformationItem
                  icon={UserRound}
                  label="Motorista"
                  value={getDriverName(
                    entry
                  )}
                />

                <InformationItem
                  icon={Truck}
                  label="Veículo"
                  value={getVehicleName(
                    entry
                  )}
                />

                <InformationItem
                  icon={Route}
                  label="Rota"
                  value={getRouteName(
                    entry
                  )}
                />

                <InformationItem
                  icon={CalendarDays}
                  label="Registro criado em"
                  value={formatDateTime(
                    entry?.createdAt
                  )}
                />

                <InformationItem
                  icon={RefreshCcw}
                  label="Última atualização"
                  value={formatDateTime(
                    entry?.updatedAt
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <History
                      size={20}
                      aria-hidden="true"
                    />

                    <h5 className="mb-0">
                      Destinações registradas
                    </h5>
                  </div>

                  <span className="text-muted small">
                    Histórico operacional desta
                    entrada de resíduo
                  </span>
                </div>

                {canCreateDestination(
                  entry
                ) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary d-inline-flex align-items-center gap-2"
                    onClick={() =>
                      setDestinationModalOpen(
                        true
                      )
                    }
                  >
                    <PackagePlus
                      size={16}
                      aria-hidden="true"
                    />

                    Nova destinação
                  </button>
                )}
              </div>
            </div>

            <div className="card-body p-0">
              {sortedDestinations.length ===
              0 ? (
                <EmptyDestinations
                  canDestination={canCreateDestination(
                    entry
                  )}
                  onCreate={() =>
                    setDestinationModalOpen(
                      true
                    )
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
                            minWidth: 180,
                          }}
                        >
                          Tipo
                        </th>

                        <th
                          scope="col"
                          style={{
                            minWidth: 150,
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
                            minWidth: 150,
                          }}
                        >
                          Data
                        </th>

                        <th
                          scope="col"
                          style={{
                            minWidth: 150,
                          }}
                        >
                          Status
                        </th>

                        <th
                          scope="col"
                          style={{
                            minWidth: 180,
                          }}
                        >
                          Responsável
                        </th>

                        <th
                          scope="col"
                          style={{
                            minWidth: 220,
                          }}
                        >
                          Documentos
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {sortedDestinations.map(
                        (
                          destination,
                          index
                        ) => {
                          const destinationStatus =
                            getDestinationStatus(
                              destination
                            );

                          const destinationId =
                            getDestinationId(
                              destination
                            );

                          const destinationDocument =
                            getDestinationDocument(
                              destination
                            );

                          const destinationAddress =
                            getDestinationAddress(
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

                          const stockLotCode =
                            getDestinationStockLotCode(
                              destination
                            );

                          return (
                            <tr
                              key={
                                destinationId ||
                                `${destination?.type}-${index}`
                              }
                            >
                              <td>
                                <div className="fw-semibold">
                                  {getWasteDestinationTypeLabel(
                                    destination?.type ||
                                      destination
                                        ?.destinationType
                                  )}
                                </div>

                                {stockLotCode && (
                                  <div className="text-muted small mt-1">
                                    Lote:{" "}
                                    {
                                      stockLotCode
                                    }
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
                                      destination,
                                      entry
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

                                {destinationDocument && (
                                  <div className="text-muted small mt-1">
                                    {
                                      destinationDocument
                                    }
                                  </div>
                                )}

                                {destinationAddress && (
                                  <div className="text-muted small mt-1">
                                    {
                                      destinationAddress
                                    }
                                  </div>
                                )}
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
                                  Registrado em{" "}
                                  {formatDateTime(
                                    destination?.createdAt
                                  )}
                                </div>
                              </td>

                              <td>
                                <span
                                  className={[
                                    "badge",
                                    destinationStatus ===
                                    "CANCELLED"
                                      ? "text-bg-danger"
                                      : destinationStatus ===
                                          "COMPLETED"
                                        ? "text-bg-primary"
                                        : "text-bg-success",
                                  ].join(" ")}
                                >
                                  {getWasteDestinationStatusLabel(
                                    destinationStatus
                                  )}
                                </span>

                                {destination?.cancelReason && (
                                  <div className="text-muted small mt-2">
                                    {
                                      destination
                                        .cancelReason
                                    }
                                  </div>
                                )}
                              </td>

                              <td>
                                {getDestinationResponsible(
                                  destination
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
                                    {
                                      destination.notes
                                    }
                                  </div>
                                )}
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

            {sortedDestinations.length >
              0 && (
              <div className="card-footer bg-white border-top py-3">
                <button
                  type="button"
                  className="btn btn-outline-primary d-inline-flex align-items-center gap-2"
                  onClick={
                    handleOpenHistory
                  }
                >
                  <History
                    size={17}
                    aria-hidden="true"
                  />

                  Abrir histórico completo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <WasteDestinationModal
        open={destinationModalOpen}
        entry={entry}
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
        onClose={() =>
          setDestinationModalOpen(
            false
          )
        }
        onSuccess={
          handleDestinationCreated
        }
      />
    </div>
  );
};

export default WasteDestinationForm;