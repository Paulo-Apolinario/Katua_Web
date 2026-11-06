import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../services/apiClient";
import { quantity } from "../../utils/collectionWorkspace";
export default function StockDispatchLots({ document, busy, onDocument }) {
  const [expanded, setExpanded] = useState(false),
    [data, setData] = useState(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const request = useRef(0),
    working = useRef(false);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  async function load() {
    if (working.current) return;
    working.current = true;
    const version = ++request.current;
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest(
        `/internal-documents/${encodeURIComponent(document.id)}/lots`,
        { suppressReadNotice: true },
      );
      if (request.current === version) setData(result);
    } catch (e) {
      if (request.current === version)
        setError(e.message || "Não foi possível consultar os lotes.");
    } finally {
      working.current = false;
      if (request.current === version) setLoading(false);
    }
  }
  function toggle() {
    setExpanded((v) => !v);
    if (!expanded && !data && !loading) void load();
  }
  const count = data?.lots.length ?? document.context?.lotCount ?? 0;
  return (
    <div className="service-dispatch-lots">
      <button
        type="button"
        className="btn btn-sm btn-outline-success"
        aria-expanded={expanded}
        aria-controls={`dispatch-lots-${document.id}`}
        onClick={toggle}
      >
        {expanded ? "Recolher lotes" : `Expandir lotes (${count})`}
      </button>
      <div id={`dispatch-lots-${document.id}`} hidden={!expanded}>
        <h4 className="h6 mt-3">Lotes utilizados nesta destinação</h4>
        <p className="small text-muted">
          O documento consolidado reúne a saída completa. Abaixo estão as
          quantidades retiradas de cada lote e seus comprovantes individuais.
        </p>
        {loading && <p role="status">Consultando lotes...</p>}
        {error && (
          <div role="alert" className="alert alert-warning">
            {error}{" "}
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => void load()}
              disabled={loading}
            >
              Tentar novamente
            </button>
          </div>
        )}
        {data && (
          <>
            <div className="table-responsive">
              <table className="table align-middle service-dispatch-lot-table">
                <thead>
                  <tr>
                    <th>Lote / origem registrada</th>
                    <th>Quantidade retirada</th>
                    <th>Saldo anterior</th>
                    <th>Saldo restante</th>
                    <th>Comprovante do lote</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lots.map((lot, index) => (
                    <tr key={`${lot.lotId}:${index}`}>
                      <td>
                        <strong>{lot.lotCode || lot.lotId}</strong>
                        {lot.documents?.[0]?.context?.origins?.length > 0 && (
                          <small className="d-block text-muted">
                            {lot.documents[0].context.origins.join(" · ")}
                          </small>
                        )}
                      </td>
                      <td className="fw-semibold">
                        {lot.quantity == null
                          ? "Não informado"
                          : quantity(lot.quantity, lot.unit)}
                      </td>
                      <td>
                        {lot.before == null
                          ? "Não informado"
                          : quantity(lot.before, lot.unit)}
                      </td>
                      <td>
                        {lot.after == null
                          ? "Não informado"
                          : quantity(lot.after, lot.unit)}
                      </td>
                      <td>
                        {lot.documents?.length ? (
                          lot.documents.map((d) => (
                            <div
                              key={d.id}
                              className="d-flex flex-column gap-2 align-items-start"
                            >
                              <small className="text-muted text-break">
                                {d.number}
                              </small>
                              <div className="d-flex flex-wrap gap-2">
                                <button
                                  className="btn btn-sm btn-outline-success"
                                  disabled={busy}
                                  onClick={() => onDocument(d.id)}
                                >
                                  Visualizar lote
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-success"
                                  disabled={busy}
                                  onClick={() => onDocument(d.id, true)}
                                >
                                  Baixar PDF do lote
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <small className="text-muted">
                            Consulte o comprovante consolidado.
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.lots.length && (
              <p className="small text-muted">
                Não há detalhamento de lotes neste documento histórico. Consulte
                o PDF consolidado.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
