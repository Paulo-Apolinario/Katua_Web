import { ManagementHeader } from "../../components/management/ManagementWorkspace";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, Save, ShieldCheck, ShieldOff, Search } from "lucide-react";
import toast from "react-hot-toast";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";
import generatorService from "../../services/generatorService";

import GeneratorLocationEditor from "../../components/generators/GeneratorLocationEditor";
import { geocodeAddressWithGoogle } from "../../components/generators/geocodeAddress";
import { hasCoordinates } from "../../components/maps/mapPin";

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
  latitude: "",
  longitude: "",
  accessStatus: "PENDING_ACTIVATION",
  accessReleased: false,
};

const EditGenerator = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromDashboard = params.get("origem") === "painel";
  const focusLocation = params.get("localizacao") === "1";
  const locationSection = useRef(null);
  const revision = useRef(0);
  const alive = useRef(true);
  const [searching, setSearching] = useState(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

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
        latitude: data.latitude ?? "",
        longitude: data.longitude ?? "",
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

  useEffect(() => {
    if (!loading && focusLocation) {
      locationSection.current?.scrollIntoView({ block: "start" });
      locationSection.current?.focus({ preventScroll: true });
    }
  }, [loading, focusLocation]);

  const handleChange = (event) => {
    revision.current += 1;
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
    ...(hasCoordinates(form) ? { latitude: Number(form.latitude), longitude: Number(form.longitude) } : {}),
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

    if (hasCoordinates(generator) && form.latitude === "" && form.longitude === "") {
      toast.error("Este gerador já possui localização. Selecione o novo ponto para substituí-la.");
      return false;
    }
    if ((form.latitude !== "" || form.longitude !== "") && !hasCoordinates(form)) {
      toast.error("Informe latitude (-90 a 90) e longitude (-180 a 180) válidas, juntas.");
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
      navigate(fromDashboard ? "/" : "/generator-list");
    } catch (error) {
      console.error("Erro ao atualizar gerador:", error);
      toast.error(error?.message || "Não foi possível atualizar o gerador.");
    } finally {
      setSaving(false);
    }
  };

  const pickLocation = useCallback((latitude, longitude) => {
    revision.current += 1;
    setForm((previous) => ({ ...previous, latitude, longitude }));
  }, []);

  async function searchCep() {
    const cep = form.zipCode.replace(/\D/g, "");
    if (cep.length !== 8) return toast.error("Informe um CEP com 8 dígitos.");
    const request = revision.current;
    setSearching(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error("Busca de CEP indisponível.");
      const data = await response.json();
      if (!alive.current || request !== revision.current) return;
      if (data.erro) throw new Error("CEP não encontrado.");
      revision.current += 1;
      setForm((previous) => ({ ...previous, street: data.logradouro || previous.street, neighborhood: data.bairro || previous.neighborhood, city: data.localidade || previous.city, state: data.uf || previous.state }));
      toast.success("Endereço preenchido. Confira o número e defina o ponto no mapa.");
    } catch (error) {
      if (alive.current && request === revision.current) toast.error(error?.name === "TimeoutError" ? "Busca de CEP demorou demais. Tente novamente." : error?.message || "Não foi possível buscar o CEP.");
    } finally { if (alive.current) setSearching(false); }
  }

  async function searchAddress() {
    const request = revision.current;
    setSearching(true);
    try {
      const location = await geocodeAddressWithGoogle(form);
      if (!alive.current || request !== revision.current) return;
      if (!location) throw new Error("Endereço não encontrado. Marque o ponto manualmente no mapa.");
      pickLocation(location.latitude, location.longitude);
      toast.success("Confira o ponto sugerido e ajuste se necessário antes de salvar.");
    } catch (error) {
      if (alive.current && request === revision.current) toast.error(error?.message || "Busca indisponível. Marque o ponto no mapa.");
    } finally { if (alive.current) setSearching(false); }
  }

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

      <ManagementHeader
        title="Editar Gerador"
        description="Atualize os dados do gerador e controle o acesso ao aplicativo."
        actions={
          <>
            <Link to="/generator-list" className="secondary-btn btn-sm">
              <ArrowLeft />
              Voltar
            </Link>
          </>
        }
      />

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
                aria-label="CEP"
                name="zipCode"
                value={form.zipCode}
                onChange={handleChange}
                className="form-control"
                disabled={loading || saving || searching}
              />
              <button type="button" className="btn btn-sm btn-outline-success mt-2" onClick={searchCep} disabled={loading || saving || searching}>Buscar CEP</button>
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

        <section className="card p-25 mb-4" id="localizacao" ref={locationSection} tabIndex={-1} aria-labelledby="generator-location-heading">
          <h4 id="generator-location-heading" className="fw-600 mb-3">Localização do gerador</h4>
          <p role="status" className={hasCoordinates(form) ? "text-success" : "text-warning"}>
            {hasCoordinates(form) ? "Ponto definido. Salve as alterações para gravar a localização." : "Este gerador está sem coordenadas. Defina o ponto para aparecer no mapa operacional."}
          </p>
          <button type="button" className="btn btn-outline-success mb-3 align-self-start" disabled={loading || saving || searching} onClick={searchAddress}>
            <Search size={16} className="me-2" />{searching ? "Buscando endereço..." : "Buscar endereço no mapa"}
          </button>
          <p className="small text-muted">A busca usa rua, número, bairro, cidade, UF e CEP informados acima e depende da configuração Google Maps existente. O resultado é uma sugestão; confira o acesso correto ao imóvel.</p>
          <GeneratorLocationEditor latitude={form.latitude} longitude={form.longitude} onChange={pickLocation} disabled={loading || saving} />
          <div className="row g-3 mt-2">
            <div className="col-md-6"><label htmlFor="generator-latitude" className="form-label">Latitude</label><input id="generator-latitude" name="latitude" className="form-control" type="number" step="any" min="-90" max="90" value={form.latitude} onChange={handleChange} disabled={loading || saving} /></div>
            <div className="col-md-6"><label htmlFor="generator-longitude" className="form-label">Longitude</label><input id="generator-longitude" name="longitude" className="form-control" type="number" step="any" min="-180" max="180" value={form.longitude} onChange={handleChange} disabled={loading || saving} /></div>
          </div>
        </section>

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
          <Link to={fromDashboard ? "/" : "/generator-list"} className="secondary-btn">
            Cancelar
          </Link>

          <button type="submit" className="primary-btn" disabled={loading || saving || searching}>
            <Save />
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </>
  );
};

export default EditGenerator;