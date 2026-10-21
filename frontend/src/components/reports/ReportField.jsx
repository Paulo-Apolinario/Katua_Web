import { useId } from "react";
export default function ReportField({
  label,
  value,
  onChange,
  options,
  type = "text",
  disabled = false,
  help,
}) {
  const id = useId();
  return (
    <div className="report-field">
      <label htmlFor={id}>{label}</label>
      {options ? (
        <select
          id={id}
          className="form-select"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          className="form-control"
          type={type}
          step={type === "number" ? "any" : undefined}
          min={type === "number" ? 0 : undefined}
          maxLength={1000}
          value={value ?? ""}
          onChange={(e) =>
            onChange(
              type === "number"
                ? e.target.value === ""
                  ? null
                  : Number(e.target.value)
                : e.target.value,
            )
          }
          disabled={disabled}
        />
      )}
      {help && <small className="text-muted">{help}</small>}
    </div>
  );
}
