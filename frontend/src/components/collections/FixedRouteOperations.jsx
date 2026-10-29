import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { getFieldRoutePoints } from "../../services/wasteWorkspaceService";
import {
  dateLabel,
  generatorName,
  location,
  personName,
  shortId,
} from "../../utils/collectionWorkspace";
import { WorkspacePagination } from "./WorkspaceParts";
import FieldOperationBadge from "./FieldOperationBadge";
export default function FixedRouteOperations({
  routes,
  onDetail,
  highlight,
  revision,
  busy,
}) {
  return (
    <div className="d-grid gap-3">
      {routes.map((route) => (
        <RouteOperation
          key={route.id}
          route={route}
          onDetail={onDetail}
          expandedInitially={highlight === route.id}
          revision={revision}
          busy={busy}
        />
      ))}
    </div>
  );
}
function RouteOperation({
  route,
  onDetail,
  expandedInitially,
  revision,
  busy,
}) {
  const [expanded, setExpanded] = useState(expandedInitially),
    [page, setPage] = useState(1),
    [size, setSize] = useState(20),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const request = useRef({ version: 0 });
  const load = useCallback(async () => {
    const token = ++request.current.version;
    setLoading(true);
    setError("");
    try {
      const value = await getFieldRoutePoints(route.id, { page, limit: size });
      if (token === request.current.version) setData(value);
    } catch (e) {
      if (token === request.current.version)
        setError(
          e.error || e.message || "Não foi possível carregar os pontos.",
        );
    } finally {
      if (token === request.current.version) setLoading(false);
    }
  }, [page, size, route.id]);
  useEffect(() => {
    if (!expanded) return;
    const guard = request.current;
    void load();
    return () => {
      guard.version++;
    };
  }, [expanded, load, revision]);
  useEffect(() => {
    if (expandedInitially) setExpanded(true);
  }, [expandedInitially]);
  const statuses = route.pointStatuses || {},
    pending = Number(statuses.PENDING || 0),
    serving = Number(statuses.IN_PROGRESS || 0),
    finished = route.points - pending - serving;
  const labels = {
    SCHEDULED: "Aguardando saída",
    IN_PROGRESS: "Em campo",
    COMPLETED: "Execução encerrada",
    CANCELLED: "Cancelada",
  };
  return (
    <article
      className="card p-3 fixed-route-operation"
      aria-label={`Execução ${route.name} em ${dateLabel(route.scheduledDate)}`}
    >
      <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
        <div>
          <div className="small text-muted">
            ROTA FIXA · EXECUÇÃO #{shortId(route.id)}
          </div>
          <h2 className="h5 mt-1 mb-2">{route.name}</h2>
          <p className="mb-1">{dateLabel(route.scheduledDate, true)}</p>
          <span
            className={`badge text-bg-${route.status === "IN_PROGRESS" ? "primary" : route.status === "COMPLETED" ? "success" : "secondary"}`}
          >
            {labels[route.status] || "Situação não informada"}
          </span>
          {route.startedAt && (
            <small className="d-block text-muted mt-1">
              Saída confirmada: {dateLabel(route.startedAt, true)}
            </small>
          )}
        </div>
        <div className="small">
          <div>
            Catadores:{" "}
            {(route.collectors || []).map((c) => c.name).join(", ") ||
              "Não informado"}
          </div>
          <div>Motorista: {personName(route.driver)}</div>
          <div>Veículo: {route.vehicle?.plate || "Não informado"}</div>
          <Link className="btn btn-sm btn-outline-success align-self-center" to={`/edit-route/${route.id}`}>Consultar execução da rota</Link>
        </div>
        <button
          className="btn btn-sm btn-outline-success"
          aria-expanded={expanded}
          aria-controls={`route-points-${route.id}`}
          onClick={() => setExpanded((v) => !v)}
          disabled={busy}
        >
          {expanded ? "Recolher pontos" : `Ver ${route.points} pontos`}
        </button>
      </div>
      <div className="d-flex flex-wrap gap-3 mt-3 small">
        <strong>{route.points} pontos</strong>
        <span>{serving} em atendimento</span>
        <span>
          {pending}{" "}
          {route.status === "IN_PROGRESS"
            ? "aguardando atendimento em campo"
            : "aguardando atendimento"}
        </span>
        <span>
          {finished}{" "}
          {finished === 1 ? "visita encerrada" : "visitas encerradas"}
        </span>
        <span>{statuses.COLLECTED || 0} aguardando recebimento</span>
      </div>
      {expanded && (
        <section
          id={`route-points-${route.id}`}
          className="mt-3 border-top pt-3"
          aria-label={`Pontos da execução ${route.name}`}
        >
          <p className="small text-muted">
            Os pontos mantêm seus próprios registros. Use Ver detalhes para
            receber, conferir e acompanhar os materiais de cada coleta.
          </p>
          {loading ? (
            <p role="status">Carregando pontos...</p>
          ) : error ? (
            <div role="alert">
              {error}{" "}
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={load}
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            data && (
              <>
                <div className="table-responsive">
                  <table className="table align-middle fixed-route-points-table">
                    <thead>
                      <tr>
                        <th>Ponto / coleta</th>
                        <th>Catador responsável</th>
                        <th>Etapa</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.collections.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <strong>{generatorName(c)}</strong>
                            <div className="small text-muted">
                              #{shortId(c.id)} · {location(c)}
                            </div>
                          </td>
                          <td data-label="Catador responsável">
                            {personName(c.collector)}
                          </td>
                          <td>
                            <FieldOperationBadge collection={c} />
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-success"
                              onClick={() => onDetail(c.id)}
                              disabled={busy}
                            >
                              Ver detalhes
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <WorkspacePagination
                  maxSize={50}
                  page={page}
                  size={size}
                  total={data.pagination.total}
                  onPage={setPage}
                  onSize={(n) => {
                    setSize(n);
                    setPage(1);
                  }}
                />
              </>
            )
          )}
        </section>
      )}
    </article>
  );
}
