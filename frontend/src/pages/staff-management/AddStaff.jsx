import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { House, ChevronRight } from "lucide-react";
import { createDriver } from "../../services/driverService";
import { toast } from "react-hot-toast";
import HeadTags from "../../components/HeadTags";

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

const AddStaff = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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
      newErrors.name = ["Informe o nome do motorista."];
    }

    if (!formData.email.trim()) {
      newErrors.email = ["Informe o e-mail do motorista."];
    }

    if (formData.cnhCategory && formData.cnhCategory.length > 5) {
      newErrors.cnhCategory = ["Categoria da CNH inválida."];
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
      email: formData.email.trim().toLowerCase(),
      status: formData.status,
    };

    if (formData.phone.trim()) dataToSend.phone = formData.phone.trim();
    if (formData.cpf.trim()) dataToSend.cpf = formData.cpf.trim();
    if (formData.cnh.trim()) dataToSend.cnh = formData.cnh.trim();
    if (formData.cnhCategory.trim()) {
      dataToSend.cnhCategory = formData.cnhCategory.trim().toUpperCase();
    }
    if (formData.notes.trim()) dataToSend.notes = formData.notes.trim();

    try {
      setSubmitting(true);

      await createDriver(dataToSend);

      toast.success("Motorista criado com sucesso.");
      setFormData(initialFormState);
      navigate("/staff-list");
    } catch (err) {
      console.error("Create driver error:", err);

      if (err?.errors) {
        setErrors(err.errors);
      }

      toast.error(
        err?.error ||
          err?.message ||
          "Erro ao criar motorista. Verifique os dados e tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeadTags title="Criar Motorista" />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Criar Motorista</h3>
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
                  Novo Motorista
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
                <label htmlFor="name" className="form-label">
                  Nome completo <span className="text-danger">*</span>
                </label>

                <input
                  type="text"
                  className="form-control"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Digite o nome completo"
                />

                {errors.name && (
                  <div className="text-danger small mt-1">{errors.name[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="email" className="form-label">
                  Email <span className="text-danger">*</span>
                </label>

                <input
                  type="email"
                  className="form-control"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Digite o email do motorista"
                />

                {errors.email && (
                  <div className="text-danger small mt-1">{errors.email[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="phone" className="form-label">
                  Telefone
                </label>

                <input
                  type="text"
                  className="form-control"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Digite o telefone"
                />

                {errors.phone && (
                  <div className="text-danger small mt-1">{errors.phone[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="cpf" className="form-label">
                  CPF
                </label>

                <input
                  type="text"
                  className="form-control"
                  id="cpf"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  placeholder="Digite o CPF"
                />

                {errors.cpf && (
                  <div className="text-danger small mt-1">{errors.cpf[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="cnh" className="form-label">
                  CNH
                </label>

                <input
                  type="text"
                  className="form-control"
                  id="cnh"
                  name="cnh"
                  value={formData.cnh}
                  onChange={handleInputChange}
                  placeholder="Digite o número da CNH"
                />

                {errors.cnh && (
                  <div className="text-danger small mt-1">{errors.cnh[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="cnhCategory" className="form-label">
                  Categoria da CNH
                </label>

                <input
                  type="text"
                  className="form-control"
                  id="cnhCategory"
                  name="cnhCategory"
                  value={formData.cnhCategory}
                  onChange={handleInputChange}
                  placeholder="Ex: A, B, C, D, E"
                />

                {errors.cnhCategory && (
                  <div className="text-danger small mt-1">
                    {errors.cnhCategory[0]}
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
                  placeholder="Observações sobre o motorista"
                />

                {errors.notes && (
                  <div className="text-danger small mt-1">{errors.notes[0]}</div>
                )}
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
                        onChange={handleInputChange}
                      />

                      <label className="form-check-label" htmlFor={status.value}>
                        {status.label}
                      </label>
                    </div>
                  ))}
                </div>

                {errors.status && (
                  <div className="text-danger small mt-1">{errors.status[0]}</div>
                )}
              </div>

              <div className="d-flex gap-20">
                <Link to="/staff-list" className="btn-md outline-btn">
                  Voltar
                </Link>

                <button
                  type="submit"
                  className="btn-md primary-btn border-0"
                  disabled={submitting}
                >
                  {submitting ? "Salvando..." : "Salvar Motorista"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddStaff;