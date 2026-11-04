import { useRef, useState } from "react";
import { Link } from "react-router";
import { agentDate, safeAgentHref, statusName } from "./agentsFormat";
import {
  agentsService,
  agentEventId,
  AGENTS_CHANGED,
} from "../../services/agentsService";
import { useAgents } from "./agentsContext";
export default function ProposalCard({ proposal, onUpdated, signal }) {
  const a = useAgents(),
    [decision, setDecision] = useState(null),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    pending = useRef(null),
    [uncertain, setUncertain] = useState(false);
  const e = proposal.evidence || {};
  const records = Array.isArray(e.records) ? e.records : [];
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const body = pending.current || {
      eventId: agentEventId(),
      status: decision,
      reason: reason.trim(),
      expectedVersion: proposal.version,
    };
    pending.current = body;
    try {
      await agentsService.decision(proposal.id, body, signal);
      pending.current = null;
      setUncertain(false);
      setDecision(null);
      setReason("");
      await onUpdated();
      window.dispatchEvent(new Event(AGENTS_CHANGED));
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message);
        const lost =
          (!err.status || err.status >= 500) && err.code !== "AGENTS_DISABLED";
        setUncertain(lost);
        if (!lost) pending.current = null;
      }
    } finally {
      if (!signal?.aborted) setBusy(false);
    }
  }
  return (
    <article className="agents-proposal">
      <div className="agents-card-top">
        <h3>{proposal.title}</h3>
        <span className="agents-badge">{statusName(proposal.status)}</span>
      </div>
      <p>
        <strong>Sugestão:</strong> {proposal.description}
      </p>
      <p>
        <strong>Consequência esperada:</strong>{" "}
        {proposal.kind === "GROUP_COLLECTIONS"
          ? "Avaliar atendimentos próximos no planejamento."
          : proposal.kind === "REVIEW_ROUTE_SEQUENCE"
            ? "Conferir uma possível sequência de visitas."
            : "Revisar a pendência e definir o próximo passo com a equipe."}{" "}
        A decisão aqui registra a revisão humana; não altera a operação.
      </p>
      <details>
        <summary>Dados utilizados e registros envolvidos</summary>
        <p>
          Proposta {proposal.id} · {agentDate(proposal.createdAt)}
        </p>
        {e.area && <p>Área e dia de referência: {e.area}</p>}
        {e.routeId && <p>Rota: {e.routeId}</p>}
        {e.alertId && <p>Ocorrência: {e.alertId}</p>}
        {e.revisionAt && <p>Dados da rota em: {agentDate(e.revisionAt)}</p>}
        {records.length > 0 && (
          <ul>
            {records.map((r) => (
              <li key={r.id}>
                Solicitação {r.id} · atualização {agentDate(r.updatedAt)}
              </li>
            ))}
          </ul>
        )}
        {Array.isArray(e.reasons) && (
          <ul>
            {e.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
        {Array.isArray(e.collectionIds) && (
          <ol>
            {e.collectionIds.map((id) => (
              <li key={id}>Coleta {id}</li>
            ))}
          </ol>
        )}
      </details>
      <div className="agents-actions">
        {safeAgentHref(e.href) && (
          <Link to={safeAgentHref(e.href)}>Abrir registros</Link>
        )}
        <button
          type="button"
          onClick={() => a?.openContext({ proposalId: proposal.id })}
        >
          Analisar com assistente
        </button>
        {proposal.status === "PENDING" && !decision && (
          <>
            <button type="button" onClick={() => setDecision("APPROVED")}>
              Registrar aprovação
            </button>
            <button type="button" onClick={() => setDecision("REJECTED")}>
              Registrar rejeição
            </button>
          </>
        )}
      </div>
      {decision && (
        <form onSubmit={save} data-refresh-paused="true">
          <p>
            <strong>
              {decision === "APPROVED"
                ? "Registrar aprovação para revisão"
                : "Registrar rejeição"}
            </strong>
            . Esta decisão não executará alterações.
          </p>
          <label htmlFor={`decision-${proposal.id}`}>Motivo da decisão</label>
          <textarea
            id={`decision-${proposal.id}`}
            required
            minLength={3}
            maxLength={500}
            value={reason}
            disabled={busy || uncertain}
            onChange={(ev) => setReason(ev.target.value)}
          />
          {error && (
            <p role="alert" className="agents-error">
              {error}
            </p>
          )}
          <div className="agents-actions">
            <button type="submit" disabled={busy || reason.trim().length < 3}>
              {busy
                ? "Registrando…"
                : uncertain
                  ? "Consultar decisão enviada"
                  : "Confirmar registro da decisão"}
            </button>
            <button
              type="button"
              disabled={busy || uncertain}
              onClick={() => {
                setDecision(null);
                setError("");
                pending.current = null;
              }}
            >
              Voltar
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
