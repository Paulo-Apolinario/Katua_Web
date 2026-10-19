import { NavLink } from "react-router";
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
          ["/create-type", "Cadastrar tipo"],
          ["/waste-stock/create", "Adicionar lote"],
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
  return resource.loading ? (
    <p role="status" className="py-4">
      Carregando dados...
    </p>
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
    children
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
          min={type === "number" ? "0.001" : undefined}
          value={form[name] ?? ""}
          maxLength={maxLength}
          required={required}
          readOnly={readOnly}
          onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
        />
      )}{" "}
      {help && <small className="text-muted">{help}</small>}
    </div>
  );
}
