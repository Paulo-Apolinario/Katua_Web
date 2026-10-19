import { Link, NavLink } from "react-router";
import HeadTags from "../HeadTags";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { STATES } from "./pevUtils";
import "./pevs.css";
export function PevScope({ children }) {
  const { admin } = useAdminAuth();
  return admin?.id ? <div key={admin.id}>{children}</div> : null;
}
export function PevPage({ title, description, actions, children }) {
  return (
    <main className="container-fluid py-4 pev-workspace">
      <HeadTags title={`${title} | KATUÁ`} />
      <div className="pev-eyebrow">KATUÁ · PONTOS DE ENTREGA VOLUNTÁRIA</div>
      <header className="d-flex justify-content-between align-items-start flex-wrap gap-3 mt-2 mb-4">
        <div>
          <h1 className="h3 fw-bold">{title}</h1>
          <p className="text-muted mb-0">{description}</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">{actions}</div>
      </header>
      <nav className="d-flex gap-2 mb-4" aria-label="Gestão de PEVs">
        <NavLink
          end
          className={({ isActive }) =>
            `btn btn-sm ${isActive ? "btn-success" : "btn-outline-secondary"}`
          }
          to="/bin-list"
        >
          Pontos cadastrados
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `btn btn-sm ${isActive ? "btn-success" : "btn-outline-secondary"}`
          }
          to="/create-bin"
        >
          Cadastrar PEV
        </NavLink>
      </nav>
      {children}
    </main>
  );
}
export function PevState({ resource, children }) {
  return resource.loading ? (
    <div role="status" className="card p-4">
      <span
        className="spinner-border spinner-border-sm me-2"
        aria-hidden="true"
      />
      Consultando PEVs...
    </div>
  ) : resource.error ? (
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
      {resource.updatedAt && (
        <p className="small text-muted">
          Dados consultados em {resource.updatedAt.toLocaleString("pt-BR")}
        </p>
      )}
      {children}
    </>
  );
}
export function PevBadge({ bin }) {
  return (
    <div className="d-flex gap-1 flex-wrap">
      <span
        className={`badge text-bg-${bin.status === "active" ? "success" : bin.status === "maintenance" ? "warning" : "secondary"}`}
      >
        {STATES[bin.status] || bin.status}
      </span>
      {bin.needsPickup && (
        <span className="badge text-bg-warning">Precisa de retirada</span>
      )}
    </div>
  );
}
export function PevField({
  name,
  label,
  value,
  onChange,
  type = "text",
  options,
  required = false,
  help,
  readOnly = false,
  maxLength = 255,
}) {
  const id = `pev-${name}`;
  return (
    <div className={type === "textarea" ? "col-12" : "col-md-6"}>
      <label htmlFor={id} className="form-label">
        {label}
        {required ? " *" : ""}
      </label>
      {options ? (
        <select
          id={id}
          name={name}
          className="form-select"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={readOnly}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          id={id}
          className="form-control"
          rows={3}
          maxLength={maxLength}
          value={value ?? ""}
          required={required}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          name={name}
          className="form-control"
          type={type}
          step={type === "number" ? "any" : undefined}
          maxLength={maxLength}
          value={value ?? ""}
          required={required}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={help ? `${id}-help` : undefined}
        />
      )}
      {help && (
        <small id={`${id}-help`} className="text-muted">
          {help}
        </small>
      )}
    </div>
  );
}
export function PevGuide({ children }) {
  return <aside className="pev-guide mb-4">{children}</aside>;
}
export function BackToPevs() {
  return (
    <Link className="btn btn-outline-secondary" to="/bin-list">
      Voltar aos PEVs
    </Link>
  );
}
