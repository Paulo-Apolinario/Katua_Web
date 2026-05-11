import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { House, ChevronRight, Truck, User, Route } from "lucide-react";
import toast from "react-hot-toast";
import { createWaste } from "../../services/wasteService";
import { getAllVehicles } from "../../services/vehicleService";
import { getAllDrivers } from "../../services/driverService";
import { getAllRoutes } from "../../services/routeService";
import { apiRequest } from "../../services/apiClient";
import HeadTags from "../../components/HeadTags";

const initialFormState = {
  scheduleId: "",
  collectorId: "",
  driverId: "",
  vehicleId: "",
  routeId: "",
  materialType: "",
  quantityKg: "",
  notes: "",
};

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.schedules)) return response.schedules;
  if (Array.isArray(response?.collectors)) return response.collectors;
  if (Array.isArray(response?.drivers)) return response.drivers;
  if (Array.isArray(response?.vehicles)) return response.vehicles;
  if (Array.isArray(response?.routes)) return response.routes;
  return [];
};

const getScheduleLabel = (schedule) => {
  const generator =
    schedule.generator?.companyName ||
    schedule.generator?.name ||
    schedule.requestedBy?.displayName ||
    "Solicitante não identificado";

  const date =
    schedule.scheduledDate ||
    schedule.preferredDate ||
    schedule.createdAt;

  const formattedDate = date
    ? new Date(date).toLocaleDateString("pt-BR")
    : "sem data";

  return `${generator} • ${formattedDate} • ${schedule.status}`;
};

const AddWaste = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [schedules, setSchedules] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);

        const [
          scheduleResponse,
          collectorResponse,
          vehicleResponse,
          driverResponse,
          routeResponse,
        ] = await Promise.all([
          apiRequest("/schedules", { method: "GET" }),
          apiRequest("/collectors", { method: "GET" }),
          getAllVehicles(),
          getAllDrivers(),
          getAllRoutes(),
        ]);

        const scheduleList = getArray(scheduleResponse).filter((schedule) => {
          const hasActiveCollection = Array.isArray(schedule.collections)
            ? schedule.collections.some((collection) =>
                ["PENDING", "IN_PROGRESS", "COMPLETED"].includes(
                  collection.status
                )
              )
            : false;

          return (
            !hasActiveCollection &&
            !["COMPLETED", "CANCELLED"].includes(schedule.status)
          );
        });

        const collectorList = getArray(collectorResponse).filter(
          (collector) => collector.status === "AVAILABLE"
        );

        setSchedules(scheduleList);
        setCollectors(collectorList);
        setVehicles(getArray(vehicleResponse));
        setDrivers(getArray(driverResponse));
        setRoutes(
          getArray(routeResponse).filter((route) =>
            ["SCHEDULED", "IN_PROGRESS"].includes(route.status)
          )
        );
      } catch (error) {
        toast.error(
          error?.error ||
            error?.message ||
            "Erro ao carregar dados para criar coleta."
        );
        console.error("Fetch collection options error:", error);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.scheduleId) {
      newErrors.scheduleId = ["Selecione um agendamento."];
    }

    if (!formData.collectorId) {
      newErrors.collectorId = ["Selecione um catador."];
    }

    if (
      formData.quantityKg &&
      Number(formData.quantityKg) < 0
    ) {
      newErrors.quantityKg = ["A quantidade não pode ser negativa."];
    }

    if (
      formData.materialType.trim() &&
      !formData.quantityKg
    ) {
      newErrors.quantityKg = ["Informe a quantidade do material."];
    }

    if (
      formData.quantityKg &&
      !formData.materialType.trim()
    ) {
      newErrors.materialType = ["Informe o tipo de material."];
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    const dataToSend = {
      scheduleId: formData.scheduleId,
      collectorId: formData.collectorId,
    };

    if (formData.driverId) dataToSend.driverId = formData.driverId;
    if (formData.vehicleId) dataToSend.vehicleId = formData.vehicleId;
    if (formData.routeId) dataToSend.routeId = formData.routeId;
    if (formData.notes.trim()) dataToSend.notes = formData.notes.trim();

    if (formData.materialType.trim() && formData.quantityKg) {
      dataToSend.materials = [
        {
          type: formData.materialType.trim(),
          quantityKg: Number(formData.quantityKg),
        },
      ];
    }

    try {
      setSubmitting(true);

      await createWaste(dataToSend);

      toast.success("Coleta criada com sucesso.");
      setFormData(initialFormState);
      navigate("/waste-list");
    } catch (err) {
      console.error("Create collection error:", err);

      if (err?.errors) {
        setErrors(err.errors);
      }

      toast.error(
        err?.error ||
          err?.message ||
          "Erro ao criar coleta. Verifique os dados e tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeadTags title="Criar Coleta" />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Criar Coleta</h3>
        </div>

        <div className="page-tool d-flex justify-content-between align-items-center">
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

                <li className="breadcrumb-item">
                  <Link to="/waste-list">Lista de Coletas</Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li className="breadcrumb-item active" aria-current="page">
                  Nova Coleta
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <div className="row justify-content-center mb-4">
        <div className="col-lg-10 col-xl-8">
          <div className="card p-25">
            <h3 className="fw-600 fs-18 mb-4">
              Delegar coleta operacional
            </h3>

            <form className="form" onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="scheduleId" className="form-label">
                  Agendamento <span className="text-danger">*</span>
                </label>

                <select
                  className="form-select"
                  id="scheduleId"
                  name="scheduleId"
                  value={formData.scheduleId}
                  onChange={handleInputChange}
                  disabled={loadingOptions}
                >
                  <option value="">
                    {loadingOptions
                      ? "Carregando agendamentos..."
                      : "Selecione um agendamento disponível"}
                  </option>

                  {schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {getScheduleLabel(schedule)}
                    </option>
                  ))}
                </select>

                {errors.scheduleId && (
                  <div className="text-danger small mt-1">
                    {errors.scheduleId[0]}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="collectorId" className="form-label">
                  Catador <span className="text-danger">*</span>
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <User />
                  </span>

                  <select
                    className="form-select"
                    id="collectorId"
                    name="collectorId"
                    value={formData.collectorId}
                    onChange={handleInputChange}
                    disabled={loadingOptions}
                  >
                    <option value="">
                      {loadingOptions
                        ? "Carregando catadores..."
                        : "Selecione um catador disponível"}
                    </option>

                    {collectors.map((collector) => (
                      <option key={collector.id} value={collector.id}>
                        {collector.name}
                      </option>
                    ))}
                  </select>
                </div>

                {errors.collectorId && (
                  <div className="text-danger small mt-1">
                    {errors.collectorId[0]}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="driverId" className="form-label">
                  Motorista
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <User />
                  </span>

                  <select
                    className="form-select"
                    id="driverId"
                    name="driverId"
                    value={formData.driverId}
                    onChange={handleInputChange}
                    disabled={loadingOptions}
                  >
                    <option value="">Nenhum motorista vinculado</option>

                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>

                {errors.driverId && (
                  <div className="text-danger small mt-1">
                    {errors.driverId[0]}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="vehicleId" className="form-label">
                  Veículo
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <Truck />
                  </span>

                  <select
                    className="form-select"
                    id="vehicleId"
                    name="vehicleId"
                    value={formData.vehicleId}
                    onChange={handleInputChange}
                    disabled={loadingOptions}
                  >
                    <option value="">Nenhum veículo vinculado</option>

                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} -{" "}
                        {vehicle.brand ? `${vehicle.brand} ` : ""}
                        {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>

                {errors.vehicleId && (
                  <div className="text-danger small mt-1">
                    {errors.vehicleId[0]}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="routeId" className="form-label">
                  Rota
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <Route />
                  </span>

                  <select
                    className="form-select"
                    id="routeId"
                    name="routeId"
                    value={formData.routeId}
                    onChange={handleInputChange}
                    disabled={loadingOptions}
                  >
                    <option value="">Nenhuma rota vinculada</option>

                    {routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.name}
                      </option>
                    ))}
                  </select>
                </div>

                {errors.routeId && (
                  <div className="text-danger small mt-1">
                    {errors.routeId[0]}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="materialType" className="form-label">
                  Tipo de material
                </label>

                <input
                  type="text"
                  className="form-control"
                  id="materialType"
                  name="materialType"
                  value={formData.materialType}
                  onChange={handleInputChange}
                  placeholder="Ex: Plástico, Papelão, Vidro"
                />

                {errors.materialType && (
                  <div className="text-danger small mt-1">
                    {errors.materialType[0]}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="quantityKg" className="form-label">
                  Quantidade estimada (KG)
                </label>

                <input
                  type="number"
                  className="form-control"
                  id="quantityKg"
                  name="quantityKg"
                  value={formData.quantityKg}
                  onChange={handleInputChange}
                  placeholder="Ex: 25"
                  step="0.01"
                />

                {errors.quantityKg && (
                  <div className="text-danger small mt-1">
                    {errors.quantityKg[0]}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="notes" className="form-label">
                  Observações
                </label>

                <textarea
                  className="form-control textarea"
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Observações para a execução da coleta"
                />

                {errors.notes && (
                  <div className="text-danger small mt-1">
                    {errors.notes[0]}
                  </div>
                )}
              </div>

              <div className="d-flex gap-20">
                <Link to="/waste-list" className="btn-md outline-btn">
                  Voltar
                </Link>

                <button
                  type="submit"
                  className="btn-md primary-btn border-0"
                  disabled={submitting || loadingOptions}
                >
                  {submitting ? "Salvando..." : "Salvar Coleta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddWaste;