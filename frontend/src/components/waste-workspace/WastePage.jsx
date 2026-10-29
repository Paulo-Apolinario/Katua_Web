import { Link, NavLink } from "react-router";
import HeadTags from "../HeadTags";
import { useAdminAuth } from "../../context/AdminAuthContext";
import "./wasteWorkspace.css";
export function WasteScope({ children }) {
  const { admin } = useAdminAuth();
  return admin?.id ? <div key={admin.id}>{children}</div> : null;
}
export function WastePage({ title, description, children, actions }) {
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
      <nav
        aria-label="Gestão de resíduos"
        className="d-flex gap-2 flex-wrap mb-4"
      >
        {[
          ["/collected-waste", "Resíduos coletados"],
          ["/waste-destinations", "Destinações"],
          ["/waste-stock", "Estoque"],
          ["/waste-type-list", "Catálogo"],
        ].map(([url, label]) => (
          <NavLink
            key={url}
            end
            to={url}
            className={({ isActive }) =>
              `btn btn-sm ${isActive ? "btn-success" : "btn-outline-secondary"}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
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
          . {resource.deferred ? "Atualização automática pausada durante a consulta ou edição." : "Atualização automática com esta tela visível."}
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
