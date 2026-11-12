import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import HeadTags from "../../components/HeadTags";
import { ManagementHeader } from "../../components/management/ManagementWorkspace";
import generatorService from "../../services/generatorService";
import { createCollector } from "../../services/collectorService";
const empty = { name: "", type: "SMALL", phone: "", address: "" };
export default function QuickRegistration() {
  const { kind } = useParams();
  const generator = kind === "generator";
  const valid = generator || kind === "collector";
  const list = generator ? "/generator-list" : "/collector-list";
  const detailed = generator ? "/create-generator" : "/create-collector";
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const alive = useRef(true);
  const navigate = useNavigate();
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const change = (event) =>
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  async function submit(event) {
    event.preventDefault();
    if (pending.current || !valid) return;
    if (form.name.trim().length < 2) {
      setError("Informe um nome com pelo menos dois caracteres.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const body = {
        name: form.name.trim(),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
      };
      if (generator)
        await generatorService.create({ ...body, type: form.type });
      else await createCollector(body);
      if (!alive.current) return;
      toast.success(
        "Cadastro salvo. Você pode completar as informações depois.",
      );
      navigate(list);
    } catch (failure) {
      if (alive.current)
        setError(
          failure.message ||
            "Não foi possível salvar. Confira a lista antes de repetir a operação.",
        );
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  if (!valid)
    return (
      <div className="card p-4" role="alert">
        Tipo de cadastro inválido. <Link to="/">Voltar ao painel</Link>
      </div>
    );
  return (
    <div className="management-workspace">
      <HeadTags title="Cadastro rápido" />
      <ManagementHeader
        title={`Cadastro rápido de ${generator ? "gerador" : "catador"}`}
        description="Registre agora e complete os dados depois."
        actions={
          <Link to={list} className="secondary-btn btn-sm">
            Voltar à lista
          </Link>
        }
      />
      <div className="card p-4 mx-auto" style={{ maxWidth: 680 }}>
        <p>
          O cadastro ficará vinculado à sua cooperativa e já poderá ser
          selecionado nas operações. CPF/CNPJ, e-mail e endereço completo podem
          ser adicionados depois.
        </p>
        <form onSubmit={submit}>
          {generator && (
            <div className="mb-3">
              <label className="form-label" htmlFor="quick-type">
                Tipo de gerador
              </label>
              <select
                id="quick-type"
                name="type"
                className="form-control"
                value={form.type}
                onChange={change}
                disabled={busy}
              >
                <option value="SMALL">Pequeno / residencial</option>
                <option value="LARGE">Grande gerador</option>
              </select>
            </div>
          )}
          <div className="mb-3">
            <label htmlFor="quick-name" className="form-label">
              {generator
                ? "Nome da pessoa ou estabelecimento"
                : "Nome do catador"}{" "}
              *
            </label>
            <input
              id="quick-name"
              name="name"
              value={form.name}
              onChange={change}
              className="form-control"
              minLength={2}
              maxLength={150}
              required
              disabled={busy}
              autoComplete="name"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="quick-phone" className="form-label">
              Celular / telefone (opcional)
            </label>
            <input
              id="quick-phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={change}
              className="form-control"
              maxLength={30}
              disabled={busy}
              autoComplete="tel"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="quick-address" className="form-label">
              Endereço ou referência (opcional)
            </label>
            <textarea
              id="quick-address"
              name="address"
              value={form.address}
              onChange={change}
              className="form-control"
              maxLength={500}
              disabled={busy}
              rows={2}
            />
          </div>
          <p className="small text-muted">
            Salvar este cadastro não cria login nem envia senha. O acesso ao
            aplicativo será ativado separadamente.
          </p>
          {error && (
            <p className="text-danger" role="alert">
              {error}
            </p>
          )}
          <div className="d-flex flex-wrap gap-2">
            <button type="submit" className="primary-btn" disabled={busy}>
              {busy ? "Salvando…" : "Salvar cadastro rápido"}
            </button>
            <Link
              to={detailed}
              className={`secondary-btn ${busy ? "disabled" : ""}`}
              aria-disabled={busy}
            >
              Cadastro detalhado
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
