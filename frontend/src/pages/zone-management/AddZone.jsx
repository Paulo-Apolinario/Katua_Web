import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { House, ChevronRight, User, Truck, MapPin } from "lucide-react";
import { createRoute } from "../../services/routeService";
import { getAllDrivers } from "../../services/driverService";
import { getAllVehicles } from "../../services/vehicleService";
import { toast } from "react-hot-toast";
import HeadTags from "../../components/HeadTags";

const initialFormState = {
  name: "",
  scheduledDate: "",
  driverId: "",
  vehicleId: "",
  stopsText: "",
  description: "",
  status: "SCHEDULED",
};

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.drivers)) return response.drivers;
  if (Array.isArray(response?.vehicles)) return response.vehicles;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const parseStops = (value) => {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
};

const AddZone = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);

        const [driverResponse, vehicleResponse] = await Promise.all([
          getAllDrivers(),
          getAllVehicles(),
        ]);

        setDrivers(getArray(driverResponse));
        setVehicles(getArray(vehicleResponse));
      } catch (error) {
        toast.error(
          error?.error ||
            error?.message ||
            "Erro ao carregar motoristas e veículos."
        );
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

    if (!formData.name.trim()) {
      newErrors.name = ["Informe o nome da rota/zona."];
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

    if (formData.scheduledDate.trim()) {
      dataToSend.scheduledDate = formData.scheduledDate.trim();
    }

    if (formData.driverId) {
      dataToSend.driverId = formData.driverId;
    }

    if (formData.vehicleId) {
      dataToSend.vehicleId = formData.vehicleId;
    }

    if (formData.description.trim()) {
      dataToSend.description = formData.description.trim();
    }

    try {
      setSubmitting(true);

      await createRoute(dataToSend);

      toast.success("Rota/Zona criada com sucesso.");
      setFormData(initialFormState);
      navigate("/zone-list");
    } catch (err) {
      if (err?.errors) {
        setErrors(err.errors);
      }

      toast.error(
        err?.error ||
          err?.message ||
          "Erro ao criar rota/zona. Verifique os dados."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeadTags title="Criar Zona/Rota" />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Criar Zona/Rota</h3>
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
                  <Link to="/zone-list">Lista de Zonas/Rotas</Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li className="breadcrumb-item active" aria-current="page">
                  Nova Zona/Rota
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <div className="row justify-content-center mb-4">
        <div className="col-lg-10 col-xl-8">
          <div className="card p-25">
            <h3 className="fw-600 fs-18 mb-4">Informações da Zona/Rota</h3>

            <form className="form" onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="form-label">
                  Nome da zona/rota <span className="text-danger">*</span>
                </label>

                <input
                  type="text"
                  className="form-control"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Zona Centro / Rota Centro - Manhã"
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
              </div>

              <div className="mb-4">
                <label htmlFor="stopsText" className="form-label">
                  Áreas / Paradas
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
                    placeholder={"Digite uma área/parada por linha.\nEx:\nCentro\nRua A, 123\nBairro Meireles"}
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
                  placeholder="Observações sobre a zona/rota"
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
                        id={`status_${status.value}`}
                        value={status.value}
                        checked={formData.status === status.value}
                        onChange={handleInputChange}
                      />

                      <label
                        className="form-check-label"
                        htmlFor={`status_${status.value}`}
                      >
                        {status.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="d-flex gap-20">
                <Link to="/zone-list" className="btn-md outline-btn">
                  Voltar
                </Link>

                <button
                  className="btn-md primary-btn border-0"
                  disabled={submitting || loadingOptions}
                >
                  {submitting ? "Salvando..." : "Salvar Zona/Rota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddZone;