import { Search } from "lucide-react";

const ReportFilters = ({
  title = "Filtros",
  description,
  search,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  filters = [],
  onClear,
  children,
}) => {
  return (
    <div className="card p-25 mb-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-15 mb-3">
        <div>
          <h4 className="fw-600 fs-20 mb-1">{title}</h4>

          {description ? (
            <p className="text-muted mb-0">{description}</p>
          ) : null}
        </div>

        {onClear ? (
          <button type="button" className="btn btn-outline-success" onClick={onClear}>
            Limpar filtros
          </button>
        ) : null}
      </div>

      <div className="row g-3">
        {typeof search !== "undefined" && onSearchChange ? (
          <div className="col-md-6 col-xl-3">
            <div className="filter-section search w-100">
              <div className="icon">
                <Search size={18} />
              </div>

              <input
                className="form-control"
                type="text"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
              />
            </div>
          </div>
        ) : null}

        {filters.map((filter) => {
          if (filter.type === "select") {
            return (
              <div className={filter.className || "col-md-6 col-xl-3"} key={filter.key}>
                <select
                  className="form-control"
                  value={filter.value}
                  onChange={(event) => filter.onChange(event.target.value)}
                >
                  {(filter.options || []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (filter.type === "date") {
            return (
              <div className={filter.className || "col-md-6 col-xl-3"} key={filter.key}>
                <input
                  className="form-control"
                  type="date"
                  value={filter.value}
                  onChange={(event) => filter.onChange(event.target.value)}
                />
              </div>
            );
          }

          if (filter.type === "text") {
            return (
              <div className={filter.className || "col-md-6 col-xl-3"} key={filter.key}>
                <input
                  className="form-control"
                  type="text"
                  value={filter.value}
                  onChange={(event) => filter.onChange(event.target.value)}
                  placeholder={filter.placeholder || ""}
                />
              </div>
            );
          }

          return null;
        })}

        {children}
      </div>
    </div>
  );
};

export default ReportFilters;