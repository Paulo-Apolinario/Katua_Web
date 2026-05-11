import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { House, ChevronRight, User, Truck } from "lucide-react";
import toast from "react-hot-toast";
import { createVehicle } from "../../services/vehicleService";
import HeadTags from "../../components/HeadTags";
import { apiRequest } from "../../services/apiClient";

const initialFormState = {
  plate: "",
  brand: "",
  model: "",
  year: "",
  capacityKg: "",
  driverId: "",
  status: "ACTIVE",
};

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.drivers)) return response.drivers;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const AddVehicle = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoadingDrivers(true);

        const response = await apiRequest("/drivers", {
          method: "GET",
        });

        setDrivers(getArray(response));
      } catch (error) {
        console.error("Erro ao buscar motoristas:", error);
        toast.error(error?.error || error?.message || "Não foi possível carregar os motoristas.");
      } finally {
        setLoadingDrivers(false);
      }
    };

    fetchDrivers();
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

    if (!formData.plate.trim()) {
      newErrors.plate = ["Informe a placa do veículo."];
    }

    if (!formData.model.trim()) {
      newErrors.model = ["Informe o modelo do veículo."];
    }

    if (formData.year && Number(formData.year) < 1900) {
      newErrors.year = ["Informe um ano válido."];
    }

    if (formData.capacityKg && Number(formData.capacityKg) < 0) {
      newErrors.capacityKg = ["A capacidade não pode ser negativa."];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    const dataToSend = {
      plate: formData.plate.trim().toUpperCase(),
      model: formData.model.trim(),
      status: formData.status,
    };

    if (formData.brand.trim()) {
      dataToSend.brand = formData.brand.trim();
    }

    if (formData.year) {
      dataToSend.year = Number(formData.year);
    }

    if (formData.capacityKg !== "") {
      dataToSend.capacityKg = Number(formData.capacityKg);
    }

    if (formData.driverId) {
      dataToSend.driverId = formData.driverId;
    }

    try {
      setSubmitting(true);

      await createVehicle(dataToSend);

      toast.success("Veículo criado com sucesso.");
      setFormData(initialFormState);
      navigate("/vehicle-list");
    } catch (err) {
      console.error("Create vehicle error:", err);

      if (err?.errors) {
        setErrors(err.errors);
      }

      toast.error(
        err?.error ||
          err?.message ||
          "Erro ao criar veículo. Verifique os dados e tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeadTags title="Criar Veículo" />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Criar Veículo</h3>
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
                  <Link to="/vehicle-list">Lista de Veículos</Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li className="breadcrumb-item active" aria-current="page">
                  Novo Veículo
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <div className="row justify-content-center mb-4">
        <div className="col-lg-10 col-xl-8">
          <div className="card p-25">
            <h3 className="fw-600 fs-18 mb-4">Informações do Veículo</h3>

            <form className="form" onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="plate" className="form-label">
                  Placa <span className="text-danger">*</span>
                </label>

                <input
                  type="text"
                  className="form-control"
                  id="plate"
                  name="plate"
                  value={formData.plate}
                  onChange={handleInputChange}
                  placeholder="Ex: ABC1D23"
                />

                {errors.plate && (
                  <div className="text-danger small mt-1">{errors.plate[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="brand" className="form-label">
                  Marca
                </label>

                <input
                  type="text"
                  className="form-control"
                  id="brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  placeholder="Ex: Mercedes-Benz, Volkswagen, Ford"
                />

                {errors.brand && (
                  <div className="text-danger small mt-1">{errors.brand[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="model" className="form-label">
                  Modelo <span className="text-danger">*</span>
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <Truck />
                  </span>

                  <input
                    type="text"
                    className="form-control"
                    id="model"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    placeholder="Ex: Sprinter, Delivery, Cargo"
                  />
                </div>

                {errors.model && (
                  <div className="text-danger small mt-1">{errors.model[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="year" className="form-label">
                  Ano
                </label>

                <input
                  type="number"
                  className="form-control"
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  placeholder="Ex: 2024"
                />

                {errors.year && (
                  <div className="text-danger small mt-1">{errors.year[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="capacityKg" className="form-label">
                  Capacidade (KG)
                </label>

                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  id="capacityKg"
                  name="capacityKg"
                  value={formData.capacityKg}
                  onChange={handleInputChange}
                  placeholder="Ex: 1200"
                />

                {errors.capacityKg && (
                  <div className="text-danger small mt-1">
                    {errors.capacityKg[0]}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="driverId" className="form-label">
                  Motorista vinculado
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
                    disabled={loadingDrivers}
                  >
                    <option value="">
                      {loadingDrivers
                        ? "Carregando motoristas..."
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
                <label className="form-label">Status</label>

                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                  {[
                    { value: "ACTIVE", label: "Ativo" },
                    { value: "MAINTENANCE", label: "Manutenção" },
                    { value: "INACTIVE", label: "Inativo" },
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
                <Link to="/vehicle-list" className="btn-md outline-btn">
                  Voltar
                </Link>

                <button
                  type="submit"
                  className="btn-md primary-btn border-0"
                  disabled={submitting}
                >
                  {submitting ? "Salvando..." : "Salvar Veículo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddVehicle;