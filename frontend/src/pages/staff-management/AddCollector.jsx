import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  ChevronRight,
  House,
  Save,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";
import { createCollector } from "../../services/collectorService";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  rg: "",
  birthDate: "",
  status: "AVAILABLE",
};

const AddCollector = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Informe o nome do catador.");
      return;
    }

    if (!form.email.trim()) {
      toast.error("Informe o e-mail do catador.");
      return;
    }

    try {
      setSaving(true);

      await createCollector(form);

      toast.success("Catador cadastrado com sucesso.");
      navigate("/collector-list");
    } catch (error) {
      console.error("Erro ao cadastrar catador:", error);
      toast.error(
        error?.error ||
          error?.message ||
          "Não foi possível cadastrar o catador."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <HeadTags title="Adicionar Catador" />
      <TopProgressBar loading={saving} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <div className="page-tool d-flex justify-content-between flex-wrap gap-3 align-items-center">
            <div>
              <h3 className="fs-30">Adicionar Catador</h3>
              <p className="mb-0 text-muted">
                Cadastre um novo catador vinculado à cooperativa.
              </p>
            </div>

            <Link to="/collector-list" className="secondary-btn btn-sm">
              <ArrowLeft size={16} />
              Voltar
            </Link>
          </div>
        </div>

        <div className="breadcrumb-wrap">
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/">
                  <House size={16} /> Painel
                </Link>
              </li>

              <li className="breadcrumb-item">
                <ChevronRight size={16} />
              </li>

              <li className="breadcrumb-item">
                <Link to="/collector-list">Catadores</Link>
              </li>

              <li className="breadcrumb-item">
                <ChevronRight size={16} />
              </li>

              <li className="breadcrumb-item active">Adicionar Catador</li>
            </ol>
          </nav>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card p-25">
          <div className="d-flex align-items-center gap-3 mb-4">
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#ecfdf5",
              }}
            >
              <UserPlus size={24} />
            </div>

            <div>
              <h4 className="mb-1 fw-600">Dados do Catador</h4>
              <p className="text-muted mb-0">
                Preencha as informações básicas para registro operacional.
              </p>
            </div>
          </div>

          <div className="row gy-3">
            <div className="col-md-6">
              <label className="form-label">
                Nome <span className="text-danger">*</span>
              </label>
              <input
                name="name"
                className="form-control"
                value={form.name}
                onChange={handleChange}
                placeholder="Nome completo do catador"
                disabled={saving}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">
                E-mail <span className="text-danger">*</span>
              </label>
              <input
                name="email"
                type="email"
                className="form-control"
                value={form.email}
                onChange={handleChange}
                placeholder="email@exemplo.com"
                disabled={saving}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Telefone</label>
              <input
                name="phone"
                className="form-control"
                value={form.phone}
                onChange={handleChange}
                placeholder="(00) 00000-0000"
                disabled={saving}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">RG</label>
              <input
                name="rg"
                className="form-control"
                value={form.rg}
                onChange={handleChange}
                placeholder="Documento RG"
                disabled={saving}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Data de nascimento</label>
              <input
                name="birthDate"
                type="date"
                className="form-control"
                value={form.birthDate}
                onChange={handleChange}
                disabled={saving}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Status</label>
              <select
                name="status"
                className="form-select"
                value={form.status}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="AVAILABLE">Disponível</option>
                <option value="ON_ROUTE">Em rota</option>
                <option value="INACTIVE">Inativo</option>
              </select>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <Link to="/collector-list" className="btn btn-light">
              Cancelar
            </Link>

            <button
              type="submit"
              className="primary-btn border-0"
              disabled={saving}
            >
              <Save size={16} />
              {saving ? "Salvando..." : "Salvar Catador"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
};

export default AddCollector;