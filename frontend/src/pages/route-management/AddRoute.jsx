import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { House, ChevronRight, User, Truck, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { getAllVehicles } from "../../services/vehicleService";
import { getAllDrivers } from "../../services/driverService";
import { createRoute } from "../../services/routeService";
import HeadTags from "../../components/HeadTags";

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
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const formatDate = (value) => {
  const numbers = value.replace(/\D/g, "").slice(0, 8);

  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) {
    return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  }

  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4)}`;
};

const AddRoute = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);

        const [vehicleResponse, driverResponse] = await Promise.all([
          getAllVehicles(),
          getAllDrivers(),
        ]);

        setVehicles(getArray(vehicleResponse));
        setDrivers(getArray(driverResponse));
      } catch (error) {
        toast.error(
          error?.error ||
            error?.message ||
            "Erro ao carregar veículos e motoristas."
        );
        console.error("Fetch route options error:", error);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    const finalValue = name === "scheduledDate" ? formatDate(value) : value;

    setFormData((prev) => ({
      ...prev,
      [name]: finalValue,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const parseStops = (value) => {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
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
      stops: parseStops(formData.stopsText),
      status: formData.status,
    };

    if (formData.description.trim()) {
      dataToSend.description = formData.description.trim();
    }

    if (formData.scheduledDate.trim()) {
      dataToSend.scheduledDate = formData.scheduledDate.trim();
    }

    if (formData.driverId) {
      dataToSend.driverId = formData.driverId;
    }

    if (formData.vehicleId) {
      dataToSend.vehicleId = formData.vehicleId;
    }

    try {
      setSubmitting(true);

      await createRoute(dataToSend);

      toast.success("Rota criada com sucesso.");
      setFormData(initialFormState);
      navigate("/route-list");
    } catch (err) {
      console.error("Create route error:", err);

      if (err?.errors) {
        setErrors(err.errors);
      }

      toast.error(
        err?.error ||
          err?.message ||
          "Erro ao criar rota. Verifique os dados e tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeadTags title="Criar Rota" />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Criar Rota</h3>
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
                  Nova Rota
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <div className="row justify-content-center mb-4">
        <div className="col-lg-10 col-xl-8">
          <div className="card p-25">
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
                  maxLength={10}
                  inputMode="numeric"
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
                    disabled={loadingOptions}
                  >
                    <option value="">
                      {loadingOptions ? "Carregando..." : "Nenhum veículo vinculado"}
                    </option>

                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} - {vehicle.brand ? `${vehicle.brand} ` : ""}
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
                    <option value="">
                      {loadingOptions
                        ? "Carregando..."
                        : "Nenhum motorista vinculado"}
                    </option>

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
                    placeholder={"Rua A, 123 \nAv. Beira Mar, 500"}
                  />
                </div>

                {errors.stops && (
                  <div className="text-danger small mt-1">{errors.stops[0]}</div>
                )}
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

                {errors.description && (
                  <div className="text-danger small mt-1">
                    {errors.description[0]}
                  </div>
                )}
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

                {errors.status && (
                  <div className="text-danger small mt-1">
                    {errors.status[0]}
                  </div>
                )}
              </div>

              <div className="d-flex gap-20">
                <Link to="/route-list" className="btn-md outline-btn">
                  Voltar
                </Link>

                <button
                  type="submit"
                  className="btn-md primary-btn border-0"
                  disabled={submitting}
                >
                  {submitting ? "Salvando..." : "Salvar Rota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddRoute;