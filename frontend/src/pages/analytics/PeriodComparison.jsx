import { useEffect, useState } from "react";
import {
  participationRequest,
  number,
  dateTime,
} from "../../services/participationAnalytics";
export default function PeriodComparison({ filters }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    participationRequest("comparison", filters, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [filters, retry]);
  const labels = {
    active: "Participantes identificados",
    participations: "Participações identificadas",
    receipts: "Recebimentos — todos os perfis",
    repeated: "Participantes com dois ou mais recebimentos",
    requests_created: "Pedidos criados — toda a cooperativa",
  };
  return (
    <section className="pa-panel" aria-label="Comparação entre períodos">
      <h2>Comparação com o período anterior equivalente</h2>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setRetry((value) => value + 1)}>
            Tentar comparar períodos
          </button>
        </div>
      ) : !data ? (
        <p role="status">Comparando registros…</p>
      ) : (
        <>
          <p>
            Atual: {data.meta.currentStart} a {data.meta.currentEnd}. Anterior:{" "}
            {data.meta.previousStart} a {data.meta.previousEnd}.
          </p>
          {data.meta.partial && (
            <p className="pa-notice">
              Período atual parcial até {dateTime(data.meta.currentCutoff)}; o
              anterior termina no horário equivalente:{" "}
              {dateTime(data.meta.previousCutoff)}.
            </p>
          )}
          <div className="pa-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Indicador</th>
                  <th>Atual</th>
                  <th>Anterior equivalente</th>
                  <th>Diferença absoluta</th>
                  <th>Variação dos registros</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(labels).map(([key, label]) => (
                  <tr key={key}>
                    <td>{label}</td>
                    <td>{number(data.current[key])}</td>
                    <td>{number(data.previous[key])}</td>
                    <td>{number(data.changes[key].absolute)}</td>
                    <td>
                      {data.changes[key].percent == null
                        ? "Sem base para percentual"
                        : `${number(data.changes[key].percent)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>{data.method}</p>
          <p>
            No histórico da cooperativa:{" "}
            {number(data.diagnostics?.missing_dates)} recebimento(s) sem data,{" "}
            {number(data.diagnostics?.future_dates)} com data futura e{" "}
            {number(data.diagnostics?.conflicting_links)} operação(ões) com
            vínculos a conferir. Esses diagnósticos não se limitam aos períodos
            comparados.
          </p>
        </>
      )}
    </section>
  );
}
