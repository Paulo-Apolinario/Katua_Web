export function Field({
  label,
  value,
  onChange,
  type = "text",
  options,
  disabled = false,
  help,
  maxLength = 1000,
}) {
  const identifier =
    "env-" +
    label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase();
  return (
    <div className="env-field">
      <label className="form-label" htmlFor={identifier}>
        {label}
      </label>
      {options ? (
        <select
          id={identifier}
          className="form-select"
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          id={identifier}
          className="form-control"
          rows={3}
          maxLength={maxLength}
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={identifier}
          className="form-control"
          type={type}
          step={type === "number" ? "any" : undefined}
          min={type === "number" ? 0 : undefined}
          maxLength={maxLength}
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) =>
            onChange(
              type === "number"
                ? e.target.value === ""
                  ? null
                  : Number(e.target.value)
                : e.target.value,
            )
          }
        />
      )}{" "}
      {help && <small className="text-muted">{help}</small>}
    </div>
  );
}
export function Message({ error }) {
  return error ? (
    <div className="alert alert-danger" role="alert">
      {typeof error === "string"
        ? error
        : error.error ||
          error.message ||
          "Não foi possível concluir. Tente novamente."}
    </div>
  ) : null;
}
export function Pagination({ page, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / 20));
  return (
    <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mt-3">
      <span className="small text-muted">
        {total} registro(s) · página {page} de {pages}
      </span>
      <div className="d-flex gap-2">
        <button
          className="btn btn-outline-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </button>
        <button
          className="btn btn-outline-secondary btn-sm"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
