import "./collectionWorkspace.css";
import { Link } from "react-router";
import {
  COLLECTION_STAGES,
  STAGE_COLORS,
  quantity,
} from "../../utils/collectionWorkspace";
export function CollectionBadge({ status }) {
  return (
    <span className={`badge text-bg-${STAGE_COLORS[status] || "secondary"}`}>
      {COLLECTION_STAGES[status] || "Situação não informada"}
    </span>
  );
}
export function WorkspacePagination({
  page,
  size,
  total,
  onPage,
  onSize,
  maxSize = 100,
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-3">
      <label>
        Por página{" "}
        <select
          aria-label="Registros por página"
          className="form-select d-inline-block w-auto"
          value={size}
          onChange={(e) => onSize(Number(e.target.value))}
        >
          {[10, 20, 25, 50, 100]
            .filter((n) => n <= maxSize)
            .map((n) => (
              <option key={n}>{n}</option>
            ))}
        </select>
      </label>
      <span className="small">
        {total ? (page - 1) * size + 1 : 0}–{Math.min(page * size, total)} de{" "}
        {total}
      </span>
      <nav aria-label="Paginação">
        <button
          className="btn btn-outline-secondary"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </button>
        <span className="mx-2">
          {page} / {pages}
        </span>
        <button
          className="btn btn-outline-secondary"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Próxima
        </button>
      </nav>
    </div>
  );
}
export function MaterialTable({ items, estimated = false }) {
  return items.length ? (
    <div className="table-responsive">
      <table className="table">
        <thead>
          <tr>
            <th>Material</th>
            <th>
              {estimated ? "Quantidade estimada" : "Quantidade registrada"}
            </th>
            {!estimated && <th>Rastreabilidade</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((m, i) => (
            <tr key={m.id || i}>
              <td>
                {m.name}
                {estimated && m.proposed && (
                  <span className="badge text-bg-light ms-2">Proposto</span>
                )}
              </td>
              <td>{quantity(m.value, m.unit)}</td>
              {!estimated && (
                <td>
                  {m.entryId ? (
                    <Link
                      to={`/collected-waste/${encodeURIComponent(m.entryId)}`}
                    >
                      Ver entrada e destinações
                    </Link>
                  ) : (
                    "Entrada não informada"
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="text-muted">Materiais não informados.</p>
  );
}
export function Summary({ cards }) {
  return (
    <div className="row g-3 mb-4">
      {cards.map(([title, value]) => (
        <div className="col-sm-6 col-xl-3" key={title}>
          <div className="card p-3 h-100">
            <span className="text-muted small">{title}</span>
            <strong className="fs-20 mt-1">{value}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}
