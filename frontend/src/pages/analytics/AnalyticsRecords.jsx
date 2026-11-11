import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import {
  participationFilters,
  participationRequest,
  number,
  dateTime,
  statusLabels,
  requestOutcomeLabels,
  qualityLabels,
} from "../../services/participationAnalytics";
import "./participationAnalytics.css";

export default function AnalyticsRecords({ kind }) {
  const { outcome, issue } = useParams(),
    key = kind === "requests" ? outcome : issue;
  const labels = kind === "requests" ? requestOutcomeLabels : qualityLabels;
  const title = Object.hasOwn(labels, key) ? labels[key] : null;
  const [params, setParams] = useSearchParams(),
    filters = useMemo(() => participationFilters(params), [params]);
  const page = Math.max(1, Number(params.get("page")) || 1),
    search = params.get("search") || "";
  const query = useMemo(
    () =>
      kind === "requests"
        ? { start: filters.start, end: filters.end, page, pageSize: 20, search }
        : { ...filters, page, pageSize: 20, search },
    [kind, filters, page, search],
  );
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [draft, setDraft] = useState(search);
  useEffect(() => {
    setData(null);
    setError("");
    setDraft(search);
    if (!title) return;
    const controller = new AbortController();
    participationRequest(`${kind}/${key}`, query, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err.message || "Não foi possível consultar os registros.");
      });
    return () => controller.abort();
  }, [kind, key, query, title, retry, search]);
  const update = (values) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([name, value]) =>
      next.set(name, String(value)),
    );
    setParams(next);
  };
  return (
    <div className="participation-analytics container-fluid py-4">
      <Link
        to={`/analytics/participation?${new URLSearchParams({ ...filters, tab: "overview" })}`}
      >
        ← Voltar ao Analytics
      </Link>
      <header className="mt-3">
        <span className="pa-eyebrow">
          {kind === "requests"
            ? "PEDIDOS DE COLETA"
            : "QUALIDADE DOS REGISTROS"}
        </span>
        <h1>{title || "Seleção não encontrada"}</h1>
        <p>
          Período de referência: {filters.start.split("-").reverse().join("/")}{" "}
          a {filters.end.split("-").reverse().join("/")} · Horário de Fortaleza.
        </p>
      </header>
      {!title ? (
        <p role="alert">Esta seleção não está disponível.</p>
      ) : (
        <>
          <form
            className="pa-panel pa-search"
            onSubmit={(event) => {
              event.preventDefault();
              update({ search: draft, page: 1 });
            }}
          >
            <label>
              Buscar origem ou identificador
              <input
                maxLength={120}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            </label>
            <button>Buscar registros</button>
            <button
              type="button"
              onClick={() => update({ search: "", page: 1 })}
            >
              Limpar busca
            </button>
          </form>
          {error ? (
            <section role="alert" className="pa-panel">
              <p>{error}</p>
              <button onClick={() => setRetry((value) => value + 1)}>
                Tentar consultar registros
              </button>
            </section>
          ) : !data ? (
            <p role="status">Consultando registros…</p>
          ) : (
            <section className="pa-panel">
              <h2>{number(data.total)} registro(s) encontrado(s)</h2>
              <p className="pa-notice">{data.scope}</p>
              <p>
                Atualizado em {dateTime(data.meta.generatedAt)}. A conferência e
                eventuais correções são feitas na tela da operação.
              </p>
              {data.items.length ? (
                <div className="pa-receipt-list">
                  {data.items.map((row) => (
                    <article className="pa-receipt-row" key={row.id}>
                      <div>
                        <h3>{row.origin || "Origem não identificada"}</h3>
                        <small>Identificador: {row.id}</small>
                        <p>
                          {statusLabels[row.status] || "Situação a conferir"}
                          {row.outcome
                            ? ` · ${requestOutcomeLabels[row.outcome] || "A conferir"}`
                            : ""}
                        </p>
                        <small>Criado em {dateTime(row.created_at)}</small>
                        <small>Recebimento: {dateTime(row.received_at)}</small>
                      </div>
                      <div className="pa-actions">
                        <Link
                          className="pa-attendance-link"
                          to={
                            kind === "requests" || data.kind === "SCHEDULE"
                              ? `/collection-requests?solicitacao=${encodeURIComponent(row.id)}`
                              : `/waste-list?coleta=${encodeURIComponent(row.id)}`
                          }
                        >
                          {kind === "requests" || data.kind === "SCHEDULE"
                            ? "Abrir pedido"
                            : "Abrir coleta"}
                        </Link>
                        {row.collection_id && (
                          <Link
                            className="pa-attendance-link"
                            to={`/waste-list?coleta=${encodeURIComponent(row.collection_id)}`}
                          >
                            Ver coleta vinculada
                          </Link>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="pa-empty">
                  Nenhum registro encontrado nesta seleção.
                </p>
              )}
              <div className="pa-pagination">
                <span>
                  Página {page} de {Math.max(1, Math.ceil(data.total / 20))}
                </span>
                <button
                  disabled={page <= 1}
                  onClick={() => update({ page: page - 1 })}
                >
                  Anterior
                </button>
                <button
                  disabled={page >= Math.ceil(data.total / 20)}
                  onClick={() => update({ page: page + 1 })}
                >
                  Próxima
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
