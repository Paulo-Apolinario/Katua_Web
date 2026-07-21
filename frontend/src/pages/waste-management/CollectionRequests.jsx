import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import {
  CalendarDays,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  House,
  Layers3,
  LoaderCircle,
  Mail,
  MapPin,
  PackageCheck,
  RefreshCw,
  Scale,
  Tag,
  Truck,
  User,
  Users,
  X,
} from "lucide-react";
import moment from "moment";
import toast from "react-hot-toast";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";
import {
  getAllSchedules,
} from "../../services/scheduleService";
import {
  createCollectionFromSchedule,
} from "../../services/collectionService";
import {
  getAllCollectors,
} from "../../services/collectorService";
import {
  getAllDrivers,
} from "../../services/driverService";
import {
  getAllVehicles,
} from "../../services/vehicleService";
import {
  getAllRoutes,
} from "../../services/routeService";

/*
 * ============================================================
 * CONSTANTES
 * ============================================================
 */

const OPEN_SCHEDULE_STATUSES = [
  "REQUESTED",
  "SCHEDULED",
];

const ACTIVE_ROUTE_STATUSES = [
  "SCHEDULED",
  "IN_PROGRESS",
];

const WASTE_UNIT_LABELS = {
  KG: "kg",
  TON: "t",
  LITER: "L",
  UNIT: "un.",
  CUBIC_METER: "m³",
};

const initialDelegationForm = {
  collectorId: "",
  driverId: "",
  vehicleId: "",
  routeId: "",
  notes: "",
};

/*
 * ============================================================
 * HELPERS GERAIS
 * ============================================================
 */

const getArray = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.schedules)) {
    return response.schedules;
  }

  if (Array.isArray(response?.collections)) {
    return response.collections;
  }

  if (Array.isArray(response?.collectors)) {
    return response.collectors;
  }

  if (Array.isArray(response?.drivers)) {
    return response.drivers;
  }

  if (Array.isArray(response?.vehicles)) {
    return response.vehicles;
  }

  if (Array.isArray(response?.routes)) {
    return response.routes;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  return [];
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

const normalizeNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const normalized =
    typeof value === "string"
      ? value.replace(",", ".")
      : value;

  const numeric = Number(normalized);

  return Number.isFinite(numeric)
    ? numeric
    : null;
};

const normalizeStatus = (value) =>
  normalizeText(value).toUpperCase();

const getErrorMessage = (
  error,
  fallback
) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.error ||
  error?.message ||
  fallback;

const getStatusLabel = (status) => {
  const labels = {
    REQUESTED: "Solicitada",
    SCHEDULED: "Agendada",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
  };

  return (
    labels[normalizeStatus(status)] ||
    normalizeText(status) ||
    "N/A"
  );
};

const getStatusClass = (status) => {
  const classes = {
    REQUESTED: "warning",
    SCHEDULED: "primary",
    IN_PROGRESS: "info",
    COMPLETED: "success",
    CANCELLED: "danger",
  };

  return (
    classes[normalizeStatus(status)] ||
    "secondary"
  );
};

const getGeneratorName = (schedule) =>
  normalizeText(
    schedule?.generator?.companyName
  ) ||
  normalizeText(
    schedule?.generator?.name
  ) ||
  normalizeText(
    schedule?.requestedBy?.displayName
  ) ||
  normalizeText(
    schedule?.requestedBy?.name
  ) ||
  "Solicitante não informado";

const getGeneratorContact = (schedule) =>
  normalizeText(
    schedule?.generator?.email
  ) ||
  normalizeText(
    schedule?.requestedBy?.email
  ) ||
  "E-mail não informado";

const getGeneratorLocation = (schedule) => {
  const generator = schedule?.generator;

  const city =
    normalizeText(generator?.city);

  const state =
    normalizeText(generator?.state);

  const address =
    normalizeText(generator?.address) ||
    [
      normalizeText(generator?.street),
      normalizeText(generator?.number),
      normalizeText(generator?.neighborhood),
    ]
      .filter(Boolean)
      .join(", ");

  const cityState =
    [city, state]
      .filter(Boolean)
      .join("/");

  return (
    [address, cityState]
      .filter(Boolean)
      .join(" - ") ||
    "Local não informado"
  );
};

const getScheduleDate = (schedule) =>
  schedule?.scheduledDate ||
  schedule?.preferredDate ||
  schedule?.createdAt ||
  null;

const formatDate = (value) => {
  if (!value) {
    return "Sem data";
  }

  const parsed = moment(value);

  return parsed.isValid()
    ? parsed.format("DD/MM/YYYY")
    : "Sem data";
};

const formatDateTime = (value) => {
  if (!value) {
    return "Não informado";
  }

  const parsed = moment(value);

  return parsed.isValid()
    ? parsed.format("DD/MM/YYYY [às] HH:mm")
    : "Não informado";
};

const formatQuantity = (value) => {
  const numeric = normalizeNumber(value);

  if (numeric === null) {
    return null;
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      maximumFractionDigits: 3,
    }
  ).format(numeric);
};

const getUnitLabel = (unit) => {
  const normalized =
    normalizeStatus(unit) || "KG";

  return (
    WASTE_UNIT_LABELS[normalized] ||
    normalizeText(unit) ||
    "kg"
  );
};

/*
 * ============================================================
 * MATERIAIS SOLICITADOS
 * ============================================================
 */

const normalizeRequestedMaterial = (
  material,
  index
) => {
  const wasteType =
    material?.wasteType ||
    material?.catalogItem ||
    material?.item ||
    null;

  const catalogSuggestion =
    material?.catalogSuggestion ||
    material?.suggestedWasteType ||
    null;

  const proposedMaterial =
    material?.proposedMaterial &&
    typeof material.proposedMaterial ===
      "object"
      ? material.proposedMaterial
      : null;

  const name =
    normalizeText(
      material?.nameSnapshot
    ) ||
    normalizeText(
      wasteType?.name
    ) ||
    normalizeText(
      catalogSuggestion?.name
    ) ||
    normalizeText(
      proposedMaterial?.name
    ) ||
    normalizeText(material?.name) ||
    normalizeText(material?.type) ||
    "Material não informado";

  const category =
    normalizeText(
      material?.categorySnapshot
    ) ||
    normalizeText(
      wasteType?.category
    ) ||
    normalizeText(
      catalogSuggestion?.category
    ) ||
    normalizeText(
      proposedMaterial?.category
    ) ||
    normalizeText(
      material?.category
    );

  const subcategory =
    normalizeText(
      material?.subcategorySnapshot
    ) ||
    normalizeText(
      wasteType?.subcategory
    ) ||
    normalizeText(
      catalogSuggestion?.subcategory
    ) ||
    normalizeText(
      proposedMaterial?.subcategory
    ) ||
    normalizeText(
      material?.subcategory
    );

  const unit =
    normalizeText(material?.unit) ||
    normalizeText(
      proposedMaterial?.unit
    ) ||
    normalizeText(
      wasteType?.defaultUnit
    ) ||
    normalizeText(
      wasteType?.unit
    ) ||
    "KG";

  const estimatedQuantity =
    material?.estimatedQuantity ??
    material?.quantity ??
    material?.quantityKg ??
    null;

  const wasteTypeId =
    normalizeText(
      material?.wasteTypeId
    ) ||
    normalizeText(
      wasteType?.id
    );

  const isProposed =
    !wasteTypeId ||
    Boolean(proposedMaterial) ||
    Boolean(
      normalizeText(
        material?.proposedMaterialName
      )
    );

  return {
    id:
      normalizeText(material?.id) ||
      `${name}-${index}`,

    name,
    category,
    subcategory,
    unit,
    estimatedQuantity,
    notes:
      normalizeText(material?.notes),
    isProposed,
  };
};

const getRequestedMaterials = (
  schedule
) => {
  const requestedMaterials =
    Array.isArray(
      schedule?.requestedMaterials
    )
      ? schedule.requestedMaterials
      : [];

  return requestedMaterials.map(
    normalizeRequestedMaterial
  );
};

/*
 * ============================================================
 * COMPONENTES AUXILIARES
 * ============================================================
 */

const StatusBadge = ({ status }) => (
  <span
    className={`badge text-bg-${getStatusClass(
      status
    )}`}
  >
    {getStatusLabel(status)}
  </span>
);

const RequestedMaterialList = ({
  schedule,
  compact = false,
}) => {
  const materials =
    getRequestedMaterials(schedule);

  if (materials.length === 0) {
    return (
      <div className="text-muted small">
        Material não informado
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className="d-flex flex-wrap gap-1"
        style={{
          minWidth: 220,
          maxWidth: 420,
        }}
      >
        {materials.map((material) => (
          <span
            key={material.id}
            className="badge text-bg-light border text-dark"
            title={[
              material.category,
              material.subcategory,
            ]
              .filter(Boolean)
              .join(" • ")}
          >
            {material.name}

            {material.estimatedQuantity !==
              null &&
              material.estimatedQuantity !==
                undefined && (
                <>
                  {" "}
                  ·{" "}
                  {formatQuantity(
                    material.estimatedQuantity
                  )}{" "}
                  {getUnitLabel(
                    material.unit
                  )}
                </>
              )}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      {materials.map((material) => (
        <div
          key={material.id}
          className="border rounded-3 p-3 bg-white"
        >
          <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <strong>
                  {material.name}
                </strong>

                <span
                  className={`badge ${
                    material.isProposed
                      ? "text-bg-warning"
                      : "text-bg-success"
                  }`}
                >
                  {material.isProposed
                    ? "Material proposto"
                    : "Catálogo"}
                </span>
              </div>

              {(material.category ||
                material.subcategory) && (
                <div className="text-muted small mt-2 d-flex align-items-center gap-2 flex-wrap">
                  <Tag size={14} />

                  {material.category && (
                    <span>
                      {material.category}
                    </span>
                  )}

                  {material.category &&
                    material.subcategory && (
                      <span>•</span>
                    )}

                  {material.subcategory && (
                    <span>
                      {material.subcategory}
                    </span>
                  )}
                </div>
              )}

              {material.notes && (
                <div className="text-muted small mt-2">
                  {material.notes}
                </div>
              )}
            </div>

            <div
              className="text-end"
              style={{
                minWidth: 120,
              }}
            >
              <div className="text-muted small">
                Quantidade estimada
              </div>

              <div className="fw-semibold mt-1">
                {material.estimatedQuantity !==
                  null &&
                material.estimatedQuantity !==
                  undefined
                  ? `${formatQuantity(
                      material.estimatedQuantity
                    )} ${getUnitLabel(
                      material.unit
                    )}`
                  : `Não informada (${getUnitLabel(
                      material.unit
                    )})`}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const MetricCard = ({
  icon,
  label,
  value,
}) => (
  <div className="col-md-4">
    <div className="card p-25 h-100">
      <div className="d-flex align-items-center gap-3">
        {icon}

        <div>
          <p className="mb-1 text-muted">
            {label}
          </p>

          <h3 className="mb-0">
            {value}
          </h3>
        </div>
      </div>
    </div>
  </div>
);

/*
 * ============================================================
 * MODAL DE DELEGAÇÃO
 * ============================================================
 */

const DelegationModal = ({
  schedule,
  form,
  collectors,
  drivers,
  vehicles,
  routes,
  loadingOptions,
  delegating,
  onChange,
  onClose,
  onSubmit,
}) => {
  if (
    !schedule ||
    typeof document === "undefined"
  ) {
    return null;
  }

  const date =
    getScheduleDate(schedule);

  return createPortal(
    <div
      className="modal fade show"
      style={{
        display: "block",
        position: "fixed",
        inset: 0,
        zIndex: 1080,
        overflowX: "hidden",
        overflowY: "auto",
        backgroundColor:
          "rgba(15, 23, 42, 0.62)",
        padding:
          "clamp(12px, 3vw, 32px)",
      }}
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-delegation-title"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !delegating
        ) {
          onClose();
        }
      }}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-lg"
        role="document"
        style={{
          width: "100%",
          maxWidth: 920,
          minHeight:
            "calc(100% - 2rem)",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
        }}
      >
        <form
          className="modal-content border-0 shadow-lg"
          onSubmit={onSubmit}
          style={{
            maxHeight:
              "calc(100vh - 32px)",
            overflow: "hidden",
            borderRadius: 18,
          }}
        >
          <div
            className="modal-header"
            style={{
              flexShrink: 0,
            }}
          >
            <div>
              <h5
                id="collection-delegation-title"
                className="modal-title mb-1"
              >
                Aceitar e delegar coleta
              </h5>

              <p className="text-muted mb-0 small">
                Transforme esta solicitação em
                uma coleta operacional.
              </p>
            </div>

            <button
              type="button"
              className="btn border-0"
              onClick={onClose}
              disabled={delegating}
              aria-label="Fechar modal"
            >
              <X size={20} />
            </button>
          </div>

          <div
            className="modal-body"
            style={{
              overflowY: "auto",
              overscrollBehavior:
                "contain",
            }}
          >
            <div className="alert alert-light border mb-4">
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div>
                  <strong>
                    {getGeneratorName(
                      schedule
                    )}
                  </strong>

                  <div className="text-muted small mt-2 d-flex align-items-center gap-2">
                    <Mail size={14} />
                    {getGeneratorContact(
                      schedule
                    )}
                  </div>

                  <div className="text-muted small mt-2 d-flex align-items-start gap-2">
                    <MapPin
                      size={14}
                      style={{
                        marginTop: 2,
                      }}
                    />

                    <span>
                      {getGeneratorLocation(
                        schedule
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-md-end">
                  <div className="text-muted small">
                    Data programada
                  </div>

                  <div className="fw-semibold mt-1">
                    {formatDate(date)}
                  </div>

                  <div className="mt-2">
                    <StatusBadge
                      status={
                        schedule.status
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <Layers3
                  size={19}
                  color="#028C56"
                />

                <h6 className="mb-0">
                  Materiais solicitados
                </h6>
              </div>

              <RequestedMaterialList
                schedule={schedule}
              />
            </div>

            {schedule.notes && (
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  Observações do solicitante
                </label>

                <div className="border rounded-3 p-3 bg-light">
                  {schedule.notes}
                </div>
              </div>
            )}

            <hr className="my-4" />

            <div className="d-flex align-items-center gap-2 mb-3">
              <ClipboardList
                size={19}
                color="#028C56"
              />

              <h6 className="mb-0">
                Definição operacional
              </h6>
            </div>

            <div className="row gy-3">
              <div className="col-md-6">
                <label className="form-label">
                  Catador responsável{" "}
                  <span className="text-danger">
                    *
                  </span>
                </label>

                <select
                  name="collectorId"
                  className="form-select"
                  value={form.collectorId}
                  onChange={onChange}
                  disabled={
                    delegating ||
                    loadingOptions
                  }
                  required
                >
                  <option value="">
                    Selecione um catador
                  </option>

                  {collectors.map(
                    (collector) => (
                      <option
                        key={collector.id}
                        value={collector.id}
                      >
                        {collector.name ||
                          collector.fullName ||
                          collector.user
                            ?.name ||
                          "Catador sem nome"}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">
                  Motorista
                </label>

                <select
                  name="driverId"
                  className="form-select"
                  value={form.driverId}
                  onChange={onChange}
                  disabled={
                    delegating ||
                    loadingOptions
                  }
                >
                  <option value="">
                    Sem motorista no momento
                  </option>

                  {drivers.map(
                    (driver) => (
                      <option
                        key={driver.id}
                        value={driver.id}
                      >
                        {driver.name ||
                          driver.fullName ||
                          driver.user
                            ?.name ||
                          "Motorista sem nome"}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">
                  Veículo
                </label>

                <select
                  name="vehicleId"
                  className="form-select"
                  value={form.vehicleId}
                  onChange={onChange}
                  disabled={
                    delegating ||
                    loadingOptions
                  }
                >
                  <option value="">
                    Sem veículo no momento
                  </option>

                  {vehicles.map(
                    (vehicle) => {
                      const plate =
                        normalizeText(
                          vehicle.plate
                        );

                      const model =
                        normalizeText(
                          vehicle.model
                        ) ||
                        normalizeText(
                          vehicle.name
                        );

                      return (
                        <option
                          key={vehicle.id}
                          value={vehicle.id}
                        >
                          {[plate, model]
                            .filter(Boolean)
                            .join(" - ") ||
                            "Veículo sem identificação"}
                        </option>
                      );
                    }
                  )}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">
                  Rota
                </label>

                <select
                  name="routeId"
                  className="form-select"
                  value={form.routeId}
                  onChange={onChange}
                  disabled={
                    delegating ||
                    loadingOptions
                  }
                >
                  <option value="">
                    Sem rota vinculada
                  </option>

                  {routes.map((route) => (
                    <option
                      key={route.id}
                      value={route.id}
                    >
                      {route.name ||
                        "Rota sem nome"}

                      {route.scheduledDate
                        ? ` - ${formatDate(
                            route.scheduledDate
                          )}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12">
                <label className="form-label">
                  Observações operacionais
                </label>

                <textarea
                  name="notes"
                  className="form-control"
                  rows="4"
                  value={form.notes}
                  onChange={onChange}
                  disabled={delegating}
                  placeholder="Inclua orientações para o catador, motorista ou equipe operacional."
                />
              </div>
            </div>

            {collectors.length === 0 &&
              !loadingOptions && (
                <div className="alert alert-warning mt-4 mb-0">
                  Nenhum catador disponível foi
                  encontrado. Cadastre ou ative
                  um catador antes de aceitar a
                  coleta.
                </div>
              )}
          </div>

          <div
            className="modal-footer"
            style={{
              flexShrink: 0,
              backgroundColor: "#fff",
            }}
          >
            <button
              type="button"
              className="btn btn-light"
              onClick={onClose}
              disabled={delegating}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="primary-btn border-0"
              disabled={
                delegating ||
                loadingOptions ||
                !form.collectorId
              }
            >
              {delegating ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="me-2"
                  />
                  Delegando...
                </>
              ) : (
                <>
                  <CheckCircle
                    size={17}
                    className="me-2"
                  />
                  Confirmar delegação
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/*
 * ============================================================
 * PÁGINA
 * ============================================================
 */

const CollectionRequests = () => {
  const [schedules, setSchedules] =
    useState([]);

  const [collectors, setCollectors] =
    useState([]);

  const [drivers, setDrivers] =
    useState([]);

  const [vehicles, setVehicles] =
    useState([]);

  const [routes, setRoutes] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    loadingOptions,
    setLoadingOptions,
  ] = useState(false);

  const [delegating, setDelegating] =
    useState(false);

  const [
    selectedSchedule,
    setSelectedSchedule,
  ] = useState(null);

  const [
    delegationForm,
    setDelegationForm,
  ] = useState(
    initialDelegationForm
  );

  /*
   * ==========================================================
   * CARREGAMENTO
   * ==========================================================
   */

  const loadSchedules =
    useCallback(async () => {
      try {
        setLoading(true);

        const response =
          await getAllSchedules();

        setSchedules(
          getArray(response)
        );
      } catch (error) {
        console.error(
          "Erro ao carregar solicitações:",
          error
        );

        toast.error(
          getErrorMessage(
            error,
            "Não foi possível carregar as coletas solicitadas."
          )
        );
      } finally {
        setLoading(false);
      }
    }, []);

  const loadOperationalOptions =
    useCallback(async () => {
      try {
        setLoadingOptions(true);

        const [
          collectorsResponse,
          driversResponse,
          vehiclesResponse,
          routesResponse,
        ] = await Promise.all([
          getAllCollectors(),
          getAllDrivers(),
          getAllVehicles(),
          getAllRoutes(),
        ]);

        setCollectors(
          getArray(
            collectorsResponse
          )
        );

        setDrivers(
          getArray(
            driversResponse
          )
        );

        setVehicles(
          getArray(
            vehiclesResponse
          )
        );

        setRoutes(
          getArray(routesResponse)
        );
      } catch (error) {
        console.error(
          "Erro ao carregar dados operacionais:",
          error
        );

        toast.error(
          getErrorMessage(
            error,
            "Não foi possível carregar catadores, motoristas, veículos e rotas."
          )
        );
      } finally {
        setLoadingOptions(false);
      }
    }, []);

  useEffect(() => {
    void loadSchedules();
    void loadOperationalOptions();
  }, [
    loadSchedules,
    loadOperationalOptions,
  ]);

  /*
   * Trava a rolagem da página enquanto o modal estiver aberto.
   * O conteúdo interno do modal permanece rolável.
   */
  useEffect(() => {
    if (
      !selectedSchedule ||
      typeof document === "undefined"
    ) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [selectedSchedule]);

  /*
   * Fecha o modal pela tecla ESC.
   */
  useEffect(() => {
    if (!selectedSchedule) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (
        event.key === "Escape" &&
        !delegating
      ) {
        setSelectedSchedule(null);
        setDelegationForm(
          initialDelegationForm
        );
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    selectedSchedule,
    delegating,
  ]);

  /*
   * ==========================================================
   * FILTROS OPERACIONAIS
   * ==========================================================
   */

  const requestedSchedules =
    useMemo(
      () =>
        schedules.filter(
          (schedule) =>
            OPEN_SCHEDULE_STATUSES.includes(
              normalizeStatus(
                schedule.status
              )
            )
        ),
      [schedules]
    );

  const availableCollectors =
    useMemo(
      () =>
        collectors.filter(
          (collector) => {
            const status =
              normalizeStatus(
                collector.status
              );

            return (
              !status ||
              status === "AVAILABLE" ||
              status === "ACTIVE"
            );
          }
        ),
      [collectors]
    );

  const availableDrivers =
    useMemo(
      () =>
        drivers.filter(
          (driver) =>
            normalizeStatus(
              driver.status
            ) !== "INACTIVE"
        ),
      [drivers]
    );

  const availableVehicles =
    useMemo(
      () =>
        vehicles.filter(
          (vehicle) =>
            normalizeStatus(
              vehicle.status
            ) !== "INACTIVE"
        ),
      [vehicles]
    );

  const availableRoutes =
    useMemo(
      () =>
        routes.filter((route) =>
          ACTIVE_ROUTE_STATUSES.includes(
            normalizeStatus(
              route.status
            )
          )
        ),
      [routes]
    );

  const scheduledCount =
    useMemo(
      () =>
        requestedSchedules.filter(
          (schedule) =>
            normalizeStatus(
              schedule.status
            ) === "SCHEDULED"
        ).length,
      [requestedSchedules]
    );

  const requestedCount =
    useMemo(
      () =>
        requestedSchedules.filter(
          (schedule) =>
            normalizeStatus(
              schedule.status
            ) === "REQUESTED"
        ).length,
      [requestedSchedules]
    );

  /*
   * ==========================================================
   * MODAL E FORMULÁRIO
   * ==========================================================
   */

  const closeDelegationModal =
    useCallback(() => {
      if (delegating) {
        return;
      }

      setSelectedSchedule(null);
      setDelegationForm(
        initialDelegationForm
      );
    }, [delegating]);

  const openDelegationModal =
    useCallback((schedule) => {
      setSelectedSchedule(schedule);

      /*
       * As observações originais do gerador permanecem no
       * schedule.notes e são exibidas separadamente.
       * O campo abaixo começa vazio para receber somente
       * orientações operacionais da cooperativa.
       */
      setDelegationForm(
        initialDelegationForm
      );
    }, []);

  const handleDelegationChange =
    useCallback((event) => {
      const { name, value } =
        event.target;

      setDelegationForm(
        (current) => ({
          ...current,
          [name]: value,
        })
      );
    }, []);

  const handleDelegateCollection =
    useCallback(
      async (event) => {
        event.preventDefault();

        if (!selectedSchedule?.id) {
          toast.error(
            "Solicitação inválida."
          );

          return;
        }

        if (
          !delegationForm.collectorId
        ) {
          toast.error(
            "Selecione um catador para delegar a coleta."
          );

          return;
        }

        try {
          setDelegating(true);

          /*
           * NOVA ARQUITETURA:
           *
           * A delegação cria apenas a coleta operacional.
           * Os materiais efetivamente coletados e o peso real
           * serão informados posteriormente pelo catador.
           *
           * Não enviamos:
           * - materials;
           * - totalWeightKg.
           */
          await createCollectionFromSchedule(
            {
              scheduleId:
                selectedSchedule.id,

              collectorId:
                delegationForm.collectorId,

              driverId:
                delegationForm.driverId ||
                undefined,

              vehicleId:
                delegationForm.vehicleId ||
                undefined,

              routeId:
                delegationForm.routeId ||
                undefined,

              notes:
                normalizeText(
                  delegationForm.notes
                ) ||
                undefined,
            }
          );

          toast.success(
            "Coleta aceita e delegada com sucesso."
          );

          setSelectedSchedule(null);
          setDelegationForm(
            initialDelegationForm
          );

          await loadSchedules();
        } catch (error) {
          console.error(
            "Erro ao aceitar coleta:",
            error
          );

          toast.error(
            getErrorMessage(
              error,
              "Não foi possível aceitar e delegar a coleta."
            )
          );
        } finally {
          setDelegating(false);
        }
      },
      [
        selectedSchedule,
        delegationForm,
        loadSchedules,
      ]
    );

  const handleRefresh =
    useCallback(() => {
      void Promise.all([
        loadSchedules(),
        loadOperationalOptions(),
      ]);
    }, [
      loadSchedules,
      loadOperationalOptions,
    ]);

  /*
   * ==========================================================
   * RENDERIZAÇÃO
   * ==========================================================
   */

  return (
    <>
      <HeadTags title="Coletas Solicitadas" />

      <TopProgressBar
        loading={
          loading ||
          loadingOptions ||
          delegating
        }
      />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">
            Coletas Solicitadas
          </h3>

          <p className="text-muted mb-0">
            Solicitações de coleta criadas pelos
            geradores e vinculadas à
            cooperativa.
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
                  Coletas Solicitadas
                </li>
              </ol>
            </nav>
          </div>

          <button
            type="button"
            className="primary-btn btn-sm border-0"
            onClick={handleRefresh}
            disabled={
              loading ||
              loadingOptions ||
              delegating
            }
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="row gy-4 mb-4">
        <MetricCard
          icon={
            <PackageCheck
              color="#028C56"
              size={32}
            />
          }
          label="Solicitações abertas"
          value={
            requestedSchedules.length
          }
        />

        <MetricCard
          icon={
            <CalendarDays
              color="#028C56"
              size={32}
            />
          }
          label="Agendadas"
          value={scheduledCount}
        />

        <MetricCard
          icon={
            <User
              color="#028C56"
              size={32}
            />
          }
          label="Pendentes"
          value={requestedCount}
        />
      </div>

      <div className="card p-25">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h3 className="fw-600 mb-1">
              Lista de Solicitações
            </h3>

            <p className="text-muted mb-0">
              Aceite uma solicitação para
              transformá-la em coleta
              operacional.
            </p>
          </div>
        </div>

        <SimpleBar
          forceVisible="x"
          autoHide
        >
          <table className="table nowrap w-100 align-middle">
            <thead>
              <tr>
                <th>
                  Solicitante / Gerador
                </th>
                <th>Contato</th>
                <th>
                  Materiais solicitados
                </th>
                <th>Data programada</th>
                <th>Status</th>
                <th>Observações</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {requestedSchedules.length ===
              0 ? (
                <tr>
                  <td colSpan="7">
                    {loading
                      ? "Carregando solicitações..."
                      : "Nenhuma coleta solicitada encontrada."}
                  </td>
                </tr>
              ) : (
                requestedSchedules.map(
                  (schedule) => {
                    const date =
                      getScheduleDate(
                        schedule
                      );

                    const alreadyDelegated =
                      Array.isArray(
                        schedule.collections
                      ) &&
                      schedule.collections
                        .length > 0;

                    return (
                      <tr key={schedule.id}>
                        <td>
                          <strong>
                            {getGeneratorName(
                              schedule
                            )}
                          </strong>

                          <div className="text-muted small mt-1">
                            {getGeneratorLocation(
                              schedule
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <Mail size={15} />
                            {getGeneratorContact(
                              schedule
                            )}
                          </div>
                        </td>

                        <td>
                          <RequestedMaterialList
                            schedule={
                              schedule
                            }
                            compact
                          />
                        </td>

                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <CalendarDays
                              size={15}
                            />

                            {formatDate(date)}
                          </div>

                          {schedule.createdAt && (
                            <div className="text-muted small mt-1">
                              Solicitada em{" "}
                              {formatDateTime(
                                schedule.createdAt
                              )}
                            </div>
                          )}
                        </td>

                        <td>
                          <StatusBadge
                            status={
                              schedule.status
                            }
                          />
                        </td>

                        <td>
                          <div
                            style={{
                              minWidth: 180,
                              maxWidth: 300,
                              whiteSpace:
                                "normal",
                            }}
                          >
                            {schedule.notes ||
                              "Sem observações"}
                          </div>
                        </td>

                        <td>
                          {alreadyDelegated ? (
                            <span className="badge text-bg-success">
                              Delegada
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="primary-btn btn-sm border-0"
                              onClick={() =>
                                openDelegationModal(
                                  schedule
                                )
                              }
                              disabled={
                                loadingOptions ||
                                delegating
                              }
                            >
                              <CheckCircle
                                size={16}
                              />
                              Aceitar coleta
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </SimpleBar>

        {!loading &&
          requestedSchedules.length >
            0 && (
            <div className="d-flex flex-wrap gap-3 mt-4 pt-3 border-top text-muted small">
              <div className="d-flex align-items-center gap-2">
                <Users size={15} />
                {
                  availableCollectors.length
                }{" "}
                catador(es) disponível(is)
              </div>

              <div className="d-flex align-items-center gap-2">
                <Truck size={15} />
                {
                  availableVehicles.length
                }{" "}
                veículo(s) ativo(s)
              </div>

              <div className="d-flex align-items-center gap-2">
                <Scale size={15} />
                Peso real informado durante a
                execução da coleta
              </div>
            </div>
          )}
      </div>

      <DelegationModal
        schedule={selectedSchedule}
        form={delegationForm}
        collectors={
          availableCollectors
        }
        drivers={availableDrivers}
        vehicles={availableVehicles}
        routes={availableRoutes}
        loadingOptions={
          loadingOptions
        }
        delegating={delegating}
        onChange={
          handleDelegationChange
        }
        onClose={
          closeDelegationModal
        }
        onSubmit={
          handleDelegateCollection
        }
      />
    </>
  );
};

export default CollectionRequests;
