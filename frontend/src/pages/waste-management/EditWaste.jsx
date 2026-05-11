import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { House, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { getWasteById, updateWaste } from "../../services/wasteService";
import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

const initialFormState = {
  generatorName: "",
  collectorName: "",
  driverName: "",
  vehicleName: "",
  routeName: "",
  collectedAt: "",
  materialType: "",
  quantityKg: "",
  notes: "",
  status: "PENDING",
};

const getObject = (response) => {
  return response?.collection || response?.data || response;
};

const formatDateInput = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
};

const getGeneratorName = (collection) => {
  return (
    collection.generator?.companyName ||
    collection.generator?.name ||
    collection.schedule?.generator?.companyName ||
    collection.schedule?.generator?.name ||
    "N/A"
  );
};

const getVehicleLabel = (vehicle) => {
  if (!vehicle) return "N/A";

  const brand = vehicle.brand ? `${vehicle.brand} ` : "";
  const model = vehicle.model || "";
  const plate = vehicle.plate ? ` • ${vehicle.plate}` : "";

  return `${brand}${model}${plate}` || "N/A";
};

const getFirstMaterial = (materials) => {
  if (!Array.isArray(materials) || materials.length === 0) {
    return {
      type: "",
      quantityKg: "",
    };
  }

  return {
    type: materials[0]?.type || "",
    quantityKg: materials[0]?.quantityKg ?? "",
  };
};

const EditWaste = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        setLoading(true);

        const response = await getWasteById(id);
        const collection = getObject(response);
        const material = getFirstMaterial(collection?.materials);

        setFormData({
          generatorName: getGeneratorName(collection),
          collectorName: collection?.collector?.name || "N/A",
          driverName: collection?.driver?.name || "N/A",
          vehicleName: getVehicleLabel(collection?.vehicle),
          routeName: collection?.route?.name || "N/A",
          collectedAt: formatDateInput(collection?.collectedAt),
          materialType: material.type,
          quantityKg: material.quantityKg,
          notes: collection?.notes || "",
          status: collection?.status || "PENDING",
        });
      } catch (error) {
        toast.error(error?.error || error?.message || "Erro ao carregar coleta.");
        console.error("Fetch collection error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
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

    if (!formData.status) {
      newErrors.status = ["Selecione um status."];
    }

    if (formData.status === "COMPLETED") {
      if (!formData.materialType.trim()) {
        newErrors.materialType = ["Informe o tipo de material para concluir."];
      }

      if (!formData.quantityKg || Number(formData.quantityKg) <= 0) {
        newErrors.quantityKg = [
          "Informe uma quantidade maior que zero para concluir.",
        ];
      }
    }

    if (formData.quantityKg && Number(formData.quantityKg) < 0) {
      newErrors.quantityKg = ["A quantidade não pode ser negativa."];
    }

    if (formData.materialType.trim() && !formData.quantityKg) {
      newErrors.quantityKg = ["Informe a quantidade do material."];
    }

    if (formData.quantityKg && !formData.materialType.trim()) {
      newErrors.materialType = ["Informe o tipo de material."];
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const buildCollectedAtISO = () => {
    if (!formData.collectedAt) return undefined;

    const date = new Date(`${formData.collectedAt}T12:00:00`);

    if (Number.isNaN(date.getTime())) return undefined;

    return date.toISOString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    const dataToSend = {
      status: formData.status,
    };

    const collectedAtISO = buildCollectedAtISO();

    if (collectedAtISO) {
      dataToSend.collectedAt = collectedAtISO;
    }

    if (formData.notes.trim()) {
      dataToSend.notes = formData.notes.trim();
    }

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

      await updateWaste(id, dataToSend);

      toast.success("Coleta atualizada com sucesso.");
      navigate("/waste-list");
    } catch (err) {
      console.error("Update collection error:", err);

      if (err?.errors) {
        setErrors(err.errors);
      }

      toast.error(
        err?.error ||
          err?.message ||
          "Erro ao atualizar coleta. Verifique os dados e tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeadTags title="Editar Coleta" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Editar Coleta</h3>
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
                  Editar Coleta
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <div className="row justify-content-center mb-4">
        <div className="col-lg-10 col-xl-8">
          <div className="card p-25">
            <h3 className="fw-600 fs-18 mb-4">Informações da Coleta</h3>

            <form className="form" onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="form-label">Gerador</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.generatorName}
                  disabled
                  readOnly
                />
              </div>

              <div className="mb-4">
                <label className="form-label">Catador</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.collectorName}
                  disabled
                  readOnly
                />
              </div>

              <div className="mb-4">
                <label className="form-label">Motorista</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.driverName}
                  disabled
                  readOnly
                />
              </div>

              <div className="mb-4">
                <label className="form-label">Veículo</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.vehicleName}
                  disabled
                  readOnly
                />
              </div>

              <div className="mb-4">
                <label className="form-label">Rota</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.routeName}
                  disabled
                  readOnly
                />
              </div>

              <div className="mb-4">
                <label htmlFor="collectedAt" className="form-label">
                  Data da coleta
                </label>

                <input
                  type="date"
                  className="form-control"
                  id="collectedAt"
                  name="collectedAt"
                  value={formData.collectedAt}
                  onChange={handleInputChange}
                />

                {errors.collectedAt && (
                  <div className="text-danger small mt-1">
                    {errors.collectedAt[0]}
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
                  Quantidade coletada (KG)
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
                  placeholder="Observações sobre a coleta"
                />

                {errors.notes && (
                  <div className="text-danger small mt-1">
                    {errors.notes[0]}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="form-label">
                  Status <span className="text-danger">*</span>
                </label>

                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                  {[
                    { value: "PENDING", label: "Pendente" },
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

                {errors.status && (
                  <div className="text-danger small mt-1">
                    {errors.status[0]}
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
                  disabled={submitting || loading}
                >
                  {submitting ? "Atualizando..." : "Atualizar Coleta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditWaste;