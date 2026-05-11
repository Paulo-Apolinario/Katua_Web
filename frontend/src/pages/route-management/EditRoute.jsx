import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  House,
  ChevronRight,
  User,
  Truck,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { getAllVehicles } from "../../services/vehicleService";
import { getAllDrivers } from "../../services/driverService";
import {
  getRouteById,
  updateRoute,
  getAvailableCollections,
  addCollectionToRoute,
  removeCollectionFromRoute,
} from "../../services/routeService";
import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

const initialFormState = {
  name: "",
  description: "",
  scheduledDate: "",
  driverId: "",
  vehicleId: "",
  stopsText: "",
  status: "SCHEDULED",
};

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.vehicles)) return response.vehicles;
  if (Array.isArray(response?.drivers)) return response.drivers;
  if (Array.isArray(response?.collections)) return response.collections;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const getObject = (response) => response?.route || response?.data || response;

const formatDateBR = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
};

const parseStops = (value) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const getGeneratorName = (collection) =>
  collection?.generator?.companyName ||
  collection?.generator?.name ||
  collection?.schedule?.generator?.companyName ||
  collection?.schedule?.generator?.name ||
  "N/A";

const getStatusLabel = (status) => {
  const labels = {
    PENDING: "Pendente",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
    SCHEDULED: "Agendada",
  };

  return labels[status] || status || "N/A";
};

const EditRoute = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routeCollections, setRouteCollections] = useState([]);
  const [availableCollections, setAvailableCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      const [vehicleResponse, driverResponse, routeResponse, availableResponse] =
        await Promise.all([
          getAllVehicles(),
          getAllDrivers(),
          getRouteById(id),
          getAvailableCollections(),
        ]);

      const route = getObject(routeResponse);

      setVehicles(getArray(vehicleResponse));
      setDrivers(getArray(driverResponse));
      setAvailableCollections(getArray(availableResponse));
      setRouteCollections(Array.isArray(route?.collections) ? route.collections : []);

      setFormData({
        name: route?.name || "",
        description: route?.description || "",
        scheduledDate: formatDateBR(route?.scheduledDate),
        driverId: route?.driverId || "",
        vehicleId: route?.vehicleId || "",
        stopsText: Array.isArray(route?.stops) ? route.stops.join("\n") : "",
        status: route?.status || "SCHEDULED",
      });
    } catch (error) {
      toast.error(error?.error || error?.message || "Erro ao carregar rota.");
      console.error("Fetch route error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  const fetchInitialData = async () => {
    await loadData();
  };

  fetchInitialData();
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [id]);

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

    if (!formData.name.trim()) {
      newErrors.name = ["Informe o nome da rota."];
    }

    if (
      formData.scheduledDate &&
      !/^\d{2}\/\d{2}\/\d{4}$/.test(formData.scheduledDate)
    ) {
      newErrors.scheduledDate = ["Use o formato DD/MM/AAAA."];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    const dataToSend = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      scheduledDate: formData.scheduledDate.trim() || null,
      driverId: formData.driverId || null,
      vehicleId: formData.vehicleId || null,
      stops: parseStops(formData.stopsText),
      status: formData.status,
    };

    try {
      setSubmitting(true);

      await updateRoute(id, dataToSend);

      toast.success("Rota atualizada com sucesso.");
      navigate("/route-list");
    } catch (err) {
      console.error("Update route error:", err);

      if (err?.errors) setErrors(err.errors);

      toast.error(
        err?.error ||
          err?.message ||
          "Erro ao atualizar rota. Verifique os dados e tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCollection = async (collectionId) => {
    try {
      await addCollectionToRoute(id, collectionId);
      toast.success("Coleta adicionada à rota.");
      await loadData();
    } catch (error) {
      toast.error(
        error?.error || error?.message || "Erro ao adicionar coleta à rota."
      );
    }
  };

  const handleRemoveCollection = async (collectionId) => {
    try {
      await removeCollectionFromRoute(id, collectionId);
      toast.success("Coleta removida da rota.");
      await loadData();
    } catch (error) {
      toast.error(
        error?.error || error?.message || "Erro ao remover coleta da rota."
      );
    }
  };

  return (
    <>
      <HeadTags title="Editar Rota" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Editar Rota</h3>
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
                  <Link to="/route-list">Lista de Rotas</Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li className="breadcrumb-item active" aria-current="page">
                  Editar Rota
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <div className="row justify-content-center mb-5">
        <div className="col-lg-10 col-xl-8">
          <div className="card p-25 mb-4">
            <h3 className="fw-600 fs-18 mb-4">Informações da Rota</h3>

            <form className="form" onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="form-label">
                  Nome da rota <span className="text-danger">*</span>
                </label>

                <input
                  type="text"
                  className="form-control"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Rota Centro - Manhã"
                />

                {errors.name && (
                  <div className="text-danger small mt-1">{errors.name[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="scheduledDate" className="form-label">
                  Data programada
                </label>

                <input
                  type="text"
                  className="form-control"
                  id="scheduledDate"
                  name="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={handleInputChange}
                  placeholder="DD/MM/AAAA"
                />

                {errors.scheduledDate && (
                  <div className="text-danger small mt-1">
                    {errors.scheduledDate[0]}
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
                    disabled={loading}
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
                    disabled={loading}
                  >
                    <option value="">Nenhum motorista vinculado</option>

                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="stopsText" className="form-label">
                  Paradas da rota
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <MapPin />
                  </span>

                  <textarea
                    className="form-control textarea"
                    id="stopsText"
                    name="stopsText"
                    value={formData.stopsText}
                    onChange={handleInputChange}
                    placeholder={
                      "Digite uma parada por linha.\nEx:\nRua A, 123\nAv. Beira Mar, 500"
                    }
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="description" className="form-label">
                  Observações
                </label>

                <textarea
                  className="form-control textarea"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Instruções ou observações sobre a rota"
                />
              </div>

              <div className="mb-4">
                <label className="form-label">Status</label>

                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                  {[
                    { value: "SCHEDULED", label: "Agendada" },
                    { value: "IN_PROGRESS", label: "Em andamento" },
                    { value: "COMPLETED", label: "Concluída" },
                    { value: "CANCELLED", label: "Cancelada" },
                  ].map((status) => (
                    <div className="form-check" key={status.value}>
                      <input
                        className="form-check-input"
                        type="radio"
                        name="status"
                        id={status.value}
                        value={status.value}
                        checked={formData.status === status.value}
                        onChange={handleInputChange}
                      />

                      <label className="form-check-label" htmlFor={status.value}>
                        {status.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="d-flex gap-20">
                <Link to="/route-list" className="btn-md outline-btn">
                  Voltar
                </Link>

                <button
                  type="submit"
                  className="btn-md primary-btn border-0"
                  disabled={submitting || loading}
                >
                  {submitting ? "Atualizando..." : "Atualizar Rota"}
                </button>
              </div>
            </form>
          </div>

          <div className="card p-25 mb-4">
            <h3 className="fw-600 fs-18 mb-4">Coletas vinculadas à rota</h3>

            {routeCollections.length === 0 ? (
              <p className="text-muted mb-0">Nenhuma coleta vinculada.</p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {routeCollections.map((collection) => (
                  <div
                    key={collection.id}
                    className="border rounded p-3 d-flex justify-content-between gap-3 align-items-center flex-wrap"
                  >
                    <div>
                      <h5 className="fw-600 mb-1">
                        {getGeneratorName(collection)}
                      </h5>
                      <p className="mb-1 text-muted">
                        Catador: {collection.collector?.name || "N/A"} • Status:{" "}
                        {getStatusLabel(collection.status)}
                      </p>
                      <p className="mb-0 text-muted">
                        Peso: {Number(collection.totalWeightKg || 0).toFixed(2)} KG
                      </p>
                    </div>

                    <button
                      type="button"
                      className="outline-btn btn-sm border-0"
                      onClick={() => handleRemoveCollection(collection.id)}
                    >
                      <Trash2 size={16} /> Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-25">
            <h3 className="fw-600 fs-18 mb-4">Coletas disponíveis</h3>

            {availableCollections.length === 0 ? (
              <p className="text-muted mb-0">
                Nenhuma coleta disponível para adicionar.
              </p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {availableCollections.map((collection) => (
                  <div
                    key={collection.id}
                    className="border rounded p-3 d-flex justify-content-between gap-3 align-items-center flex-wrap"
                  >
                    <div>
                      <h5 className="fw-600 mb-1">
                        {getGeneratorName(collection)}
                      </h5>
                      <p className="mb-1 text-muted">
                        Catador: {collection.collector?.name || "N/A"} • Status:{" "}
                        {getStatusLabel(collection.status)}
                      </p>
                      <p className="mb-0 text-muted">
                        Peso: {Number(collection.totalWeightKg || 0).toFixed(2)} KG
                      </p>
                    </div>

                    <button
                      type="button"
                      className="primary-btn btn-sm border-0"
                      onClick={() => handleAddCollection(collection.id)}
                    >
                      <Plus size={16} /> Adicionar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EditRoute;