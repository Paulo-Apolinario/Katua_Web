import { Link, NavLink, useLocation } from "react-router";
import HeadTags from "../HeadTags";
import { useAdminAuth } from "../../context/AdminAuthContext";
import "./wasteWorkspace.css";
export function WasteScope({ children }) {
  const { admin } = useAdminAuth();
  return admin?.id ? <div key={admin.id}>{children}</div> : null;
}
const sections = [
  ["/collected-waste", "Resíduos coletados", "Conferir os materiais recebidos e encaminhar cada entrada."],
  ["/mixed-bags", "Triagem e bags", "Pesar o material misturado, separar e formar lotes por material."],
  ["/waste-stock", "Estoque e lotes", "Consultar saldos e registrar a saída de uma quantidade."],
  ["/waste-destinations", "Movimentações", "Acompanhar os encaminhamentos das entradas e seus destinos."],
  ["/sales", "Vendas", "Consultar saídas vendidas e informar preços ao preparar a nota."],
  ["/waste-type-list", "Catálogo", "Definir nome, unidade e identificação dos materiais. Não gera estoque."],
];
export function WastePage({ title, description, children, actions }) {
  const {pathname}=useLocation();
  const current=sections.find(([url])=>pathname.startsWith(url)) || sections.at(-1);
  return (
    <div className="container-fluid py-4 waste-workspace">
      <HeadTags title={`${title} | KATUÁ`} />
      <div className="waste-eyebrow mb-2">KATUÁ · GESTÃO DE RESÍDUOS</div>
      <header className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h3">{title}</h1>
          <p className="text-muted mb-0">{description}</p>
        </div>
        <div className="d-flex flex-wrap gap-2">{actions}</div>
      </header>
      <nav aria-label="Gestão de resíduos" className="waste-section-nav">
        {sections.map(([url,label])=><NavLink key={url} to={url} className={({isActive})=>`waste-section-link ${isActive?"is-active":""}`}>{label}</NavLink>)}
      </nav>
      <details className="waste-page-help mb-3"><summary>Como usar esta etapa</summary><p>{current[2]}</p><p className="mb-0">Material misturado vai para Triagem e bags. Material identificado pode formar lotes no Estoque. A aba Vendas acompanha as saídas do tipo Venda; os valores são preenchidos na preparação da nota.</p></details>
      {children}
    </div>
  );
}
export function ResourceState({ resource, children }) {
  return resource.loading && !resource.data ? (
    <div role="status" className="waste-loading py-4">
      <span
        className="spinner-border spinner-border-sm me-2"
        aria-hidden="true"
      />
      Consultando os registros da cooperativa...
    </div>
  ) : resource.error && !resource.data ? (
    <div role="alert" className="alert alert-danger">
      {resource.error}
      <button
        className="btn btn-outline-danger ms-3"
        onClick={resource.refresh}
      >
        Tentar novamente
      </button>
    </div>
  ) : (
    <>
      {resource.loading && (
        <p role="status" className="small text-muted">
          Atualizando dados…
        </p>
      )}
      {resource.error && resource.data && (
        <p role="alert" className="alert alert-warning">
          {resource.error} Os dados anteriores continuam visíveis.{" "}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={resource.refresh}
          >
            Tentar novamente
          </button>
        </p>
      )}
      {resource.updatedAt && (
        <p className="waste-freshness small text-muted">
          Dados consultados em{" "}
          {new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Fortaleza",
            dateStyle: "short",
            timeStyle: "medium",
          }).format(resource.updatedAt)}
          . {resource.deferred ? "Edição em andamento." : ""}
        </p>
      )}
      {children}
    </>
  );
}
export function Field({
  name,
  label,
  form,
  setForm,
  options,
  required = false,
  readOnly = false,
  type = "text",
  maxLength,
  help,
  min,
}) {
  return (
    <div className={type === "textarea" ? "col-12" : "col-md-6"}>
      <label className="form-label" htmlFor={`waste-${name}`}>
        {label}
        {required ? " *" : ""}
      </label>
      {options ? (
        <select
          id={`waste-${name}`}
          name={name}
          aria-describedby={help ? `waste-${name}-help` : undefined}
          value={form[name] ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
          className="form-select"
          required={required}
          disabled={readOnly}
        >
          {options.map((o) => (
            <option value={o.value} key={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          id={`waste-${name}`}
          name={name}
          className="form-control"
          rows={3}
          required={required}
          aria-describedby={help ? `waste-${name}-help` : undefined}
          value={form[name] ?? ""}
          maxLength={maxLength}
          onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
          readOnly={readOnly}
        />
      ) : (
        <input
          id={`waste-${name}`}
          name={name}
          className="form-control"
          type={type}
          step={type === "number" ? "0.001" : undefined}
          min={min ?? (type === "number" ? "0.001" : undefined)}
          aria-describedby={help ? `waste-${name}-help` : undefined}
          value={form[name] ?? ""}
          maxLength={maxLength}
          required={required}
          readOnly={readOnly}
          onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
        />
      )}{" "}
      {help && (
        <small id={`waste-${name}-help`} className="text-muted">
          {help}
        </small>
      )}
    </div>
  );
}

export function WasteGuide({ title, children, to, label }) {
  return (
    <aside className="waste-guide mb-4">
      <div>
        <strong>{title}</strong>
        <p className="small mb-0 mt-1">{children}</p>
      </div>
      {to && (
        <Link to={to} className="btn btn-sm btn-outline-success">
          {label}
        </Link>
      )}
    </aside>
  );
}
export function ExportButton({ disabled, onClick, page = false }) {
  return (
    <button
      type="button"
      className="btn btn-outline-secondary"
      disabled={disabled}
      onClick={onClick}
    >
      {page ? "Exportar página (CSV)" : "Exportar filtrados (CSV)"}
    </button>
  );
}
