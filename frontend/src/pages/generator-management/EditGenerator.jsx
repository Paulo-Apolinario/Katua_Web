import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Save, ShieldCheck, ShieldOff } from "lucide-react";
import toast from "react-hot-toast";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";
import generatorService from "../../services/generatorService";

const accessStatusOptions = [
  { value: "PENDING_ACTIVATION", label: "Pendente de ativação" },
  { value: "ACTIVE", label: "Ativo" },
  { value: "INACTIVE", label: "Inativo" },
  { value: "BLOCKED", label: "Bloqueado" },
];

const initialForm = {
  type: "SMALL",
  name: "",
  companyName: "",
  email: "",
  phone: "",
  zipCode: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  address: "",
  accessStatus: "PENDING_ACTIVATION",
  accessReleased: false,
};

const EditGenerator = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [generator, setGenerator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadGenerator = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);

      const data = await generatorService.getById(id);

      setGenerator(data);
      setForm({
        type: data.type || "SMALL",
        name: data.name || "",
        companyName: data.companyName || "",
        email: data.email || "",
        phone: data.phone || "",
        zipCode: data.zipCode || "",
        street: data.street || "",
        number: data.number || "",
        neighborhood: data.neighborhood || "",
        city: data.city || "",
        state: data.state || "",
        address: data.address || "",
        accessStatus: data.accessStatus || "PENDING_ACTIVATION",
        accessReleased: Boolean(data.accessReleased),
      });
    } catch (error) {
      console.error("Erro ao carregar gerador:", error);
      toast.error(error?.message || "Não foi possível carregar o gerador.");
      navigate("/generator-list");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadGenerator();
  }, [loadGenerator]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const buildPayload = () => ({
    type: form.type,
    name: form.name.trim(),
    companyName: form.companyName.trim() || undefined,
    phone: form.phone.trim() || undefined,
    zipCode: form.zipCode.trim() || undefined,
    street: form.street.trim() || undefined,
    number: form.number.trim() || undefined,
    neighborhood: form.neighborhood.trim() || undefined,
    city: form.city.trim() || undefined,
    state: form.state.trim().toUpperCase() || undefined,
    address: form.address.trim() || undefined,
  });

  const validate = () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome do gerador ou responsável.");
      return false;
    }

    if (!form.type) {
      toast.error("Selecione o tipo do gerador.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate() || !id) return;

    try {
      setSaving(true);

      await generatorService.update(id, buildPayload());

      if (form.accessStatus !== generator?.accessStatus) {
        await generatorService.updateAccessStatus(id, form.accessStatus);
      }

      toast.success("Gerador atualizado com sucesso.");
      navigate("/generator-list");
    } catch (error) {
      console.error("Erro ao atualizar gerador:", error);
      toast.error(error?.message || "Não foi possível atualizar o gerador.");
    } finally {
      setSaving(false);
    }
  };

  const handleReleaseAccess = async () => {
    if (!id) return;

    try {
      setSaving(true);

      const updated = await generatorService.releaseAccess(id);

      setGenerator(updated);
      setForm((prev) => ({
        ...prev,
        accessReleased: Boolean(updated.accessReleased),
        accessStatus: updated.accessStatus || "ACTIVE",
      }));

      toast.success("Acesso do gerador liberado com sucesso.");
    } catch (error) {
      console.error("Erro ao liberar acesso:", error);
      toast.error(error?.message || "Não foi possível liberar o acesso.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <HeadTags title="Editar Gerador" />
      <TopProgressBar loading={loading || saving} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
            <div>
              <h3 className="fs-30">Editar Gerador</h3>
              <p className="mb-0 text-muted">
                Atualize os dados do gerador e controle o acesso ao aplicativo.
              </p>
            </div>

            <Link to="/generator-list" className="secondary-btn btn-sm">
              <ArrowLeft />
              Voltar
            </Link>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card p-25 mb-4">
          <h4 className="fw-600 mb-4">Dados do Gerador</h4>

          <div className="row g-4">
            <div className="col-md-4">
              <label className="form-label">Tipo *</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="form-control"
                disabled={loading}
              >
                <option value="SMALL">Pequeno Gerador</option>
                <option value="LARGE">Grande Gerador</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Nome / Responsável *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="form-control"
                placeholder="Nome do responsável"
                disabled={loading}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Empresa / Razão social</label>
              <input
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                className="form-control"
                placeholder="Nome da empresa"
                disabled={loading}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">E-mail</label>
              <input
                value={form.email}
                className="form-control"
                disabled
                title="O e-mail é identificador único do gerador."
              />
              <small className="text-muted">
                O e-mail é identificador único e não será alterado por esta tela.
              </small>
            </div>

            <div className="col-md-6">
              <label className="form-label">Telefone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="form-control"
                placeholder="(00) 00000-0000"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="card p-25 mb-4">
          <h4 className="fw-600 mb-4">Endereço</h4>

          <div className="row g-4">
            <div className="col-md-3">
              <label className="form-label">CEP</label>
              <input
                name="zipCode"
                value={form.zipCode}
                onChange={handleChange}
                className="form-control"
                disabled={loading}
              />
            </div>

            <div className="col-md-5">
              <label className="form-label">Rua</label>
              <input
                name="street"
                value={form.street}
                onChange={handleChange}
                className="form-control"
                disabled={loading}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Número</label>
              <input
                name="number"
                value={form.number}
                onChange={handleChange}
                className="form-control"
                disabled={loading}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">UF</label>
              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                className="form-control"
                maxLength={2}
                disabled={loading}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Bairro</label>
              <input
                name="neighborhood"
                value={form.neighborhood}
                onChange={handleChange}
                className="form-control"
                disabled={loading}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Cidade</label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                className="form-control"
                disabled={loading}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Endereço completo</label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                className="form-control"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="card p-25 mb-4">
          <h4 className="fw-600 mb-4">Acesso ao aplicativo</h4>

          <div className="row g-4 align-items-end">
            <div className="col-md-4">
              <label className="form-label">Acesso liberado</label>
              <div>
                {form.accessReleased ? (
                  <span className="badge text-bg-success">
                    <ShieldCheck size={14} className="me-1" />
                    Liberado
                  </span>
                ) : (
                  <span className="badge text-bg-warning">
                    <ShieldOff size={14} className="me-1" />
                    Ainda não liberado
                  </span>
                )}
              </div>
            </div>

            <div className="col-md-4">
              <label className="form-label">Status de acesso</label>
              <select
                name="accessStatus"
                value={form.accessStatus}
                onChange={handleChange}
                className="form-control"
                disabled={loading}
              >
                {accessStatusOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              {!form.accessReleased && (
                <button
                  type="button"
                  className="primary-btn w-100"
                  onClick={handleReleaseAccess}
                  disabled={saving}
                >
                  <ShieldCheck />
                  Liberar acesso
                </button>
              )}
            </div>
          </div>

          <p className="text-muted small mt-3 mb-0">
            O gerador é cadastrado pela cooperativa e só começa a usar o app
            após a liberação de acesso.
          </p>
        </div>

        <div className="d-flex justify-content-end gap-3">
          <Link to="/generator-list" className="secondary-btn">
            Cancelar
          </Link>

          <button type="submit" className="primary-btn" disabled={saving}>
            <Save />
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </>
  );
};

export default EditGenerator;