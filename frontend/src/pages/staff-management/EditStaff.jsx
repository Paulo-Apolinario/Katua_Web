import { ManagementHeader } from "../../components/management/ManagementWorkspace";
import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { House, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { getDriverById, updateDriver } from "../../services/driverService";
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
      [e.target.name || "status"]: e.target.value,
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

      await updateDriver(id, formData);

      toast.success("Cadastro do motorista atualizado com sucesso.");
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

      <ManagementHeader title="Editar Motorista" />

      <div className="row justify-content-center mb-5">
        <div className="col-lg-10 col-xl-8">
          <div className="card p-25">
            <h3 className="fw-600 fs-18 mb-4">Informações do Motorista</h3>

            <form className="form" onSubmit={handleSubmit}>
              <p className="text-muted">Atualize os dados cadastrais e a disponibilidade. O e-mail de acesso permanece vinculado à conta.</p>
              {[["name", "Nome", "text"], ["email", "E-mail de acesso", "email"], ["phone", "Telefone", "text"], ["cpf", "CPF", "text"], ["cnh", "CNH", "text"], ["cnhCategory", "Categoria da CNH", "text"]].map(([key, label, type]) => <div className="mb-4" key={key}>
                <label className="form-label" htmlFor={key}>{label}</label>
                <input id={key} name={key} type={type} className="form-control" value={formData[key]} disabled={loading || submitting || key === "email"} readOnly={key === "email"} required={key === "name"} maxLength={key === "cnhCategory" ? 5 : 150} onChange={handleStatusChange} />
              </div>)}
              <div className="mb-4"><label className="form-label" htmlFor="notes">Observações</label><textarea id="notes" name="notes" className="form-control" value={formData.notes} disabled={loading || submitting} onChange={handleStatusChange} /></div>

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