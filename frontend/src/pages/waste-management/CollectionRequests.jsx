import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  CalendarDays,
  CheckCircle,
  ChevronRight,
  House,
  PackageCheck,
  RefreshCw,
  User,
  X,
} from "lucide-react";
import moment from "moment";
import toast from "react-hot-toast";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";
import { getAllSchedules } from "../../services/scheduleService";
import { createCollectionFromSchedule } from "../../services/collectionService";
import { getAllCollectors } from "../../services/collectorService";
import { getAllDrivers } from "../../services/driverService";
import { getAllVehicles } from "../../services/vehicleService";
import { getAllRoutes } from "../../services/routeService";

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.schedules)) return response.schedules;
  if (Array.isArray(response?.collections)) return response.collections;
  if (Array.isArray(response?.collectors)) return response.collectors;
  if (Array.isArray(response?.drivers)) return response.drivers;
  if (Array.isArray(response?.vehicles)) return response.vehicles;
  if (Array.isArray(response?.routes)) return response.routes;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const getStatusLabel = (status) => {
  const labels = {
    REQUESTED: "Solicitada",
    SCHEDULED: "Agendada",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
  };

  return labels[status] || status || "N/A";
};

const getStatusClass = (status) => {
  const classes = {
    REQUESTED: "warning",
    SCHEDULED: "primary",
    IN_PROGRESS: "info",
    COMPLETED: "success",
    CANCELLED: "danger",
  };

  return classes[status] || "secondary";
};

const extractMaterialsFromNotes = (notes) => {
  if (!notes) return "Não informado";

  const match = String(notes).match(/Materiais solicitados:\s*([^|]+)/i);

  if (!match?.[1]) return notes;

  return match[1].trim();
};

const buildMaterialItemsFromNotes = (notes) => {
  const materialsText = extractMaterialsFromNotes(notes);

  if (!materialsText || materialsText === "Não informado") return [];

  return materialsText
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((type) => ({
      type,
      quantityKg: 0,
    }));
};

const getGeneratorName = (schedule) => {
  return (
    schedule?.generator?.companyName ||
    schedule?.generator?.name ||
    schedule?.requestedBy?.displayName ||
    "Solicitante não informado"
  );
};

const getGeneratorContact = (schedule) => {
  return (
    schedule?.generator?.email ||
    schedule?.requestedBy?.email ||
    "E-mail não informado"
  );
};

const getScheduleDate = (schedule) => {
  return (
    schedule?.scheduledDate ||
    schedule?.preferredDate ||
    schedule?.createdAt ||
    null
  );
};

const initialDelegationForm = {
  collectorId: "",
  driverId: "",
  vehicleId: "",
  routeId: "",
  notes: "",
};

const CollectionRequests = () => {
  const [schedules, setSchedules] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [delegating, setDelegating] = useState(false);

  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [delegationForm, setDelegationForm] = useState(initialDelegationForm);

  const loadSchedules = async () => {
    try {
      setLoading(true);

      const response = await getAllSchedules();
      const items = getArray(response);

      setSchedules(items);
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
      toast.error(
        error?.error ||
          error?.message ||
          "Não foi possível carregar as coletas solicitadas."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadOperationalOptions = async () => {
    try {
      setLoadingOptions(true);

      const [collectorsResponse, driversResponse, vehiclesResponse, routesResponse] =
        await Promise.all([
          getAllCollectors(),
          getAllDrivers(),
          getAllVehicles(),
          getAllRoutes(),
        ]);

      setCollectors(getArray(collectorsResponse));
      setDrivers(getArray(driversResponse));
      setVehicles(getArray(vehiclesResponse));
      setRoutes(getArray(routesResponse));
    } catch (error) {
      console.error("Erro ao carregar dados operacionais:", error);
      toast.error(
        error?.error ||
          error?.message ||
          "Não foi possível carregar catadores, motoristas, veículos e rotas."
      );
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    loadSchedules();
    loadOperationalOptions();
  }, []);

  const requestedSchedules = useMemo(() => {
    return schedules.filter((schedule) =>
      ["REQUESTED", "SCHEDULED"].includes(
        String(schedule.status || "").toUpperCase()
      )
    );
  }, [schedules]);

  const availableCollectors = useMemo(() => {
    return collectors.filter((collector) => {
      const status = String(collector.status || "").toUpperCase();
      return !status || status === "AVAILABLE";
    });
  }, [collectors]);

  const availableDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const status = String(driver.status || "").toUpperCase();
      return !status || status !== "INACTIVE";
    });
  }, [drivers]);

  const availableVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const status = String(vehicle.status || "").toUpperCase();
      return !status || status !== "INACTIVE";
    });
  }, [vehicles]);

  const availableRoutes = useMemo(() => {
    return routes.filter((route) => {
      const status = String(route.status || "").toUpperCase();
      return ["SCHEDULED", "IN_PROGRESS"].includes(status);
    });
  }, [routes]);

  const closeDelegationModal = () => {
    if (delegating) return;

    setSelectedSchedule(null);
    setDelegationForm(initialDelegationForm);
  };

  const openDelegationModal = (schedule) => {
    setSelectedSchedule(schedule);
    setDelegationForm({
      ...initialDelegationForm,
      notes: schedule?.notes || "",
    });
  };

  const handleDelegationChange = (event) => {
    const { name, value } = event.target;

    setDelegationForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleDelegateCollection = async (event) => {
    event.preventDefault();

    if (!selectedSchedule?.id) {
      toast.error("Solicitação inválida.");
      return;
    }

    if (!delegationForm.collectorId) {
      toast.error("Selecione um catador para delegar a coleta.");
      return;
    }

    try {
      setDelegating(true);

      await createCollectionFromSchedule({
        scheduleId: selectedSchedule.id,
        collectorId: delegationForm.collectorId,
        driverId: delegationForm.driverId || undefined,
        vehicleId: delegationForm.vehicleId || undefined,
        routeId: delegationForm.routeId || undefined,
        materials: buildMaterialItemsFromNotes(selectedSchedule.notes),
        totalWeightKg: 0,
        notes: delegationForm.notes,
      });

      toast.success("Coleta aceita e delegada com sucesso.");

      closeDelegationModal();
      await loadSchedules();
    } catch (error) {
      console.error("Erro ao aceitar coleta:", error);
      toast.error(
        error?.error ||
          error?.message ||
          "Não foi possível aceitar e delegar a coleta."
      );
    } finally {
      setDelegating(false);
    }
  };

  return (
    <>
      <HeadTags title="Coletas Solicitadas" />
      <TopProgressBar loading={loading || loadingOptions || delegating} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Coletas Solicitadas</h3>
          <p className="text-muted mb-0">
            Solicitações de coleta criadas pelos geradores e vinculadas à
            cooperativa.
          </p>
        </div>

        <div className="page-tool d-flex justify-content-between align-items-center flex-wrap gap-3">
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

                <li className="breadcrumb-item active" aria-current="page">
                  Coletas Solicitadas
                </li>
              </ol>
            </nav>
          </div>

          <button
            type="button"
            className="primary-btn btn-sm border-0"
            onClick={() => {
              loadSchedules();
              loadOperationalOptions();
            }}
            disabled={loading || loadingOptions || delegating}
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="row gy-4 mb-4">
        <div className="col-md-4">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-3">
              <PackageCheck color="#028C56" size={32} />

              <div>
                <p className="mb-1 text-muted">Solicitações abertas</p>
                <h3 className="mb-0">{requestedSchedules.length}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-3">
              <CalendarDays color="#028C56" size={32} />

              <div>
                <p className="mb-1 text-muted">Agendadas</p>
                <h3 className="mb-0">
                  {
                    requestedSchedules.filter(
                      (item) => item.status === "SCHEDULED"
                    ).length
                  }
                </h3>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center gap-3">
              <User color="#028C56" size={32} />

              <div>
                <p className="mb-1 text-muted">Pendentes</p>
                <h3 className="mb-0">
                  {
                    requestedSchedules.filter(
                      (item) => item.status === "REQUESTED"
                    ).length
                  }
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-25">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h3 className="fw-600 mb-1">Lista de Solicitações</h3>
            <p className="text-muted mb-0">
              Aceite uma solicitação para transformá-la em coleta operacional.
            </p>
          </div>
        </div>

        <SimpleBar forceVisible="x" autoHide>
          <table className="table nowrap w-100">
            <thead>
              <tr>
                <th>Solicitante / Gerador</th>
                <th>Contato</th>
                <th>Materiais</th>
                <th>Data programada</th>
                <th>Status</th>
                <th>Observações</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {requestedSchedules.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    {loading
                      ? "Carregando solicitações..."
                      : "Nenhuma coleta solicitada encontrada."}
                  </td>
                </tr>
              ) : (
                requestedSchedules.map((schedule) => {
                  const date = getScheduleDate(schedule);
                  const alreadyDelegated =
                    Array.isArray(schedule.collections) &&
                    schedule.collections.length > 0;

                  return (
                    <tr key={schedule.id}>
                      <td>
                        <strong>{getGeneratorName(schedule)}</strong>
                        <div className="text-muted small">
                          {schedule?.generator?.city || ""}
                          {schedule?.generator?.state
                            ? `/${schedule.generator.state}`
                            : ""}
                        </div>
                      </td>

                      <td>{getGeneratorContact(schedule)}</td>

                      <td>{extractMaterialsFromNotes(schedule.notes)}</td>

                      <td>
                        {date ? moment(date).format("DD/MM/YYYY") : "Sem data"}
                      </td>

                      <td>
                        <span
                          className={`badge text-bg-${getStatusClass(
                            schedule.status
                          )}`}
                        >
                          {getStatusLabel(schedule.status)}
                        </span>
                      </td>

                      <td>{schedule.notes || "Sem observações"}</td>

                      <td>
                        {alreadyDelegated ? (
                          <span className="badge text-bg-success">
                            Delegada
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="primary-btn btn-sm border-0"
                            onClick={() => openDelegationModal(schedule)}
                            disabled={loadingOptions || delegating}
                          >
                            <CheckCircle size={16} />
                            Aceitar coleta
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </SimpleBar>
      </div>

      {selectedSchedule && (
        <>
          <div
            className="modal fade show"
            style={{
              display: "block",
              backgroundColor: "rgba(15, 23, 42, 0.55)",
            }}
            tabIndex="-1"
            role="dialog"
          >
            <div
              className="modal-dialog modal-dialog-centered modal-lg"
              role="document"
            >
              <form className="modal-content" onSubmit={handleDelegateCollection}>
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title mb-1">
                      Aceitar e delegar coleta
                    </h5>
                    <p className="text-muted mb-0 small">
                      Transforme esta solicitação em uma coleta operacional.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn border-0"
                    onClick={closeDelegationModal}
                    disabled={delegating}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="modal-body">
                  <div className="alert alert-light border mb-4">
                    <strong>{getGeneratorName(selectedSchedule)}</strong>
                    <div className="text-muted small mt-1">
                      {getGeneratorContact(selectedSchedule)}
                    </div>
                    <div className="text-muted small mt-1">
                      Materiais:{" "}
                      {extractMaterialsFromNotes(selectedSchedule.notes)}
                    </div>
                  </div>

                  <div className="row gy-3">
                    <div className="col-md-6">
                      <label className="form-label">
                        Catador responsável <span className="text-danger">*</span>
                      </label>
                      <select
                        name="collectorId"
                        className="form-select"
                        value={delegationForm.collectorId}
                        onChange={handleDelegationChange}
                        disabled={delegating || loadingOptions}
                        required
                      >
                        <option value="">Selecione um catador</option>

                        {availableCollectors.map((collector) => (
                          <option key={collector.id} value={collector.id}>
                            {collector.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Motorista</label>
                      <select
                        name="driverId"
                        className="form-select"
                        value={delegationForm.driverId}
                        onChange={handleDelegationChange}
                        disabled={delegating || loadingOptions}
                      >
                        <option value="">Sem motorista no momento</option>

                        {availableDrivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Veículo</label>
                      <select
                        name="vehicleId"
                        className="form-select"
                        value={delegationForm.vehicleId}
                        onChange={handleDelegationChange}
                        disabled={delegating || loadingOptions}
                      >
                        <option value="">Sem veículo no momento</option>

                        {availableVehicles.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.plate} - {vehicle.model}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Rota</label>
                      <select
                        name="routeId"
                        className="form-select"
                        value={delegationForm.routeId}
                        onChange={handleDelegationChange}
                        disabled={delegating || loadingOptions}
                      >
                        <option value="">Sem rota vinculada</option>

                        {availableRoutes.map((route) => (
                          <option key={route.id} value={route.id}>
                            {route.name}
                            {route.scheduledDate
                              ? ` - ${moment(route.scheduledDate).format(
                                  "DD/MM/YYYY"
                                )}`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Observações</label>
                      <textarea
                        name="notes"
                        className="form-control"
                        rows="4"
                        value={delegationForm.notes}
                        onChange={handleDelegationChange}
                        disabled={delegating}
                        placeholder="Observações operacionais para a coleta"
                      />
                    </div>
                  </div>

                  {availableCollectors.length === 0 && !loadingOptions && (
                    <div className="alert alert-warning mt-4 mb-0">
                      Nenhum catador disponível foi encontrado. Cadastre ou ative
                      um catador antes de aceitar a coleta.
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={closeDelegationModal}
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
                      !delegationForm.collectorId
                    }
                  >
                    {delegating ? "Delegando..." : "Confirmar delegação"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default CollectionRequests;