import { Link } from "react-router";
import {
  agentName,
  countLabels,
  safeAgentHref,
  statusName,
} from "./agentsFormat";
export default function AnalysisResult({ data, onProposal }) {
  if (!data) return null;
  return (
    <div className="agents-result">
      <strong>{agentName(data.agent)}</strong>
      <p>{data.summary}</p>
      {data.counts && (
        <dl className="agents-counts">
          {Object.entries(data.counts)
            .filter(([key]) => countLabels[key])
            .map(([key, value]) => (
              <div key={key}>
                <dt>{countLabels[key]}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
      )}
      {data.indicators?.pendingUnits && (
        <p>
          Saldo pendente:{" "}
          {Object.entries(data.indicators.pendingUnits)
            .map(([unit, value]) => `${value} ${unit === "LITER" ? "L" : "kg"}`)
            .join(" · ") || "Sem saldo pendente no recorte"}
        </p>
      )}
      {data.truncated && (
        <p className="agents-warning">
          Consulta limitada a um recorte. Confira os demais registros nas telas
          de gestão.
        </p>
      )}
      {data.items?.length > 0 && (
        <details>
          <summary>Ver registros relacionados ({data.items.length})</summary>
          <ul className="agents-records">
            {data.items.map((item) => (
              <li key={`${item.kind}:${item.id}`}>
                <strong>{item.title}</strong>
                {item.status && (
                  <span className="d-block">{statusName(item.status)}</span>
                )}
                <small className="d-block">Referência: {item.id}</small>
                {item.reasons?.map((r, i) => (
                  <p key={i}>{r}</p>
                ))}
                {safeAgentHref(item.href) && (
                  <Link to={safeAgentHref(item.href)}>Abrir registro</Link>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      {data.proposalIds?.length > 0 && (
        <div className="agents-actions">
          {data.proposalIds.map((id, i) => (
            <button type="button" key={id} onClick={() => onProposal(id)}>
              Ver recomendação {i + 1}
            </button>
          ))}
        </div>
      )}
      {data.warnings?.length > 0 && (
        <details>
          <summary>Critérios e limites desta análise</summary>
          <ul>
            {data.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <p>{data.method}</p>
        </details>
      )}
    </div>
  );
}
