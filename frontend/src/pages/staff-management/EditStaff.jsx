import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { House, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { getDriverById, updateDriverStatus } from "../../services/driverService";
import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

const initialFormState = {
  name: "",
  email: "",
  phone: "",
  cpf: "",
  cnh: "",
  cnhCategory: "",
  notes: "",
  status: "AVAILABLE",
};

const getObject = (response) => {
  return response?.driver || response?.data || response;
};

const EditStaff = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchDriver = async () => {
      try {
        setLoading(true);

        const response = await getDriverById(id);
        const driver = getObject(response);

        setFormData({
          name: driver?.name || "",
          email: driver?.email || "",
          phone: driver?.phone || "",
          cpf: driver?.cpf || "",
          cnh: driver?.cnh || "",
          cnhCategory: driver?.cnhCategory || "",
          notes: driver?.notes || "",
          status: driver?.status || "AVAILABLE",
        });
      } catch (error) {
        toast.error(
          error?.error || error?.message || "Erro ao carregar motorista."
        );
        console.error("Fetch driver error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDriver();
  }, [id]);

  const handleStatusChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      status: e.target.value,
    }));

    setErrors((prev) => ({
      ...prev,
      status: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    try {
      setSubmitting(true);

      await updateDriverStatus(id, formData.status);

      toast.success("Status do motorista atualizado com sucesso.");
      navigate("/staff-list");
    } catch (err) {
      console.error("Update driver status error:", err);

      if (err?.errors) {
        setErrors(err.errors);
      }

      toast.error(
        err?.error ||
          err?.message ||
          "Erro ao atualizar status do motorista."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeadTags title="Editar Motorista" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Editar Motorista</h3>
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
                  <Link to="/staff-list">Lista de Motoristas</Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li className="breadcrumb-item active" aria-current="page">
                  Editar Motorista
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <div className="row justify-content-center mb-5">
        <div className="col-lg-10 col-xl-8">
          <div className="card p-25">
            <h3 className="fw-600 fs-18 mb-4">Informações do Motorista</h3>

            <form className="form" onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="form-label">Nome completo</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  disabled
                  readOnly
                />
              </div>

              <div className="mb-4">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  disabled
                  readOnly
                />
              </div>

              <div className="mb-4">
                <label className="form-label">Telefone</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.phone || "N/A"}
                  disabled
                  readOnly
                />
              </div>

              <div className="mb-4">
                <label className="form-label">CPF</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.cpf || "N/A"}
                  disabled
                  readOnly
                />
              </div>

              <div className="mb-4">
                <label className="form-label">CNH</label>
                <input
                  type="text"
                  className="form-control"
                  value={
                    formData.cnh
                      ? `${formData.cnh}${
                          formData.cnhCategory
                            ? ` • Categoria ${formData.cnhCategory}`
                            : ""
                        }`
                      : "N/A"
                  }
                  disabled
                  readOnly
                />
              </div>

              <div className="mb-4">
                <label className="form-label">Observações</label>
                <textarea
                  className="form-control textarea"
                  value={formData.notes || "N/A"}
                  disabled
                  readOnly
                />
              </div>

              <div className="mb-4">
                <label className="form-label">Status</label>

                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                  {[
                    { value: "AVAILABLE", label: "Disponível" },
                    { value: "ON_ROUTE", label: "Em rota" },
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
                        onChange={handleStatusChange}
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
                <Link to="/staff-list" className="btn-md outline-btn">
                  Voltar
                </Link>

                <button
                  type="submit"
                  className="btn-md primary-btn border-0"
                  disabled={submitting || loading}
                >
                  {submitting ? "Atualizando..." : "Atualizar Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditStaff;