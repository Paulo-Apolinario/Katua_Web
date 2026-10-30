import { destinationChanges } from "../../utils/destinationAudit";
import { useEffect, useState } from "react";
import {
  getWasteDestinationById,
  getWasteDestinationTypeLabel,
} from "../../services/collectionWasteDestinationService";
import { dateLabel, shortId } from "../../utils/collectionWorkspace";
export default function DestinationAudit({ id }) {
  const [open, setOpen] = useState(false),
    [events, setEvents] = useState(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [all, setAll] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setError("");
    getWasteDestinationById(id)
      .then((r) => {
        if (active) setEvents(r.destination.auditEvents || []);
      })
      .catch((e) => {
        if (active) setError(e.message || "Histórico indisponível.");
      });
    return () => {
      active = false;
    };
  }, [open, id, revision]);
  return (
    <details
      className="small mt-2"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>Histórico de alterações</summary>
      {error ? (
        <p role="alert">
          {error}{" "}
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setRevision((n) => n + 1)}
          >
            Tentar novamente
          </button>
        </p>
      ) : events === null ? (
        <p role="status">Carregando histórico…</p>
      ) : events.length ? (
        <ol className="mt-2 ps-3">
          {(all ? events : events.slice(0, 3)).map((event) => (
            <li key={event.id} className="mb-2">
              <strong>
                {{
                  CREATED: "Registrada",
                  UPDATED: "Alterada",
                  CANCELLED: "Cancelada",
                }[event.operation] || event.operation}
              </strong>{" "}
              · {dateLabel(event.createdAt, true)} ·{" "}
              {event.actorName || shortId(event.actorUserId)}
              {event.operation === "UPDATED" && destinationChanges(event).length === 0 && <div className="text-muted">Salvo sem alteração nos dados do encaminhamento.</div>}
              {destinationChanges(event).map(change => <div key={change.key} className="text-break"><strong>{change.label}:</strong> {change.key === "type" ? `${getWasteDestinationTypeLabel(change.before)} → ${getWasteDestinationTypeLabel(change.after)}` : change.key === "destinationDate" ? `${dateLabel(change.before)} → ${dateLabel(change.after)}` : ["stockItemId", "stockLotId", "metadata"].includes(change.key) ? "Vínculo atualizado; consulte os dados da movimentação." : `${change.before ?? "Não informado"} → ${change.after ?? "Não informado"}`}</div>)}
            </li>
          ))}
        {events.length > 3 && <li className="list-unstyled"><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setAll(value => !value)}>{all ? "Mostrar recentes" : `Ver ${events.length - 3} alterações anteriores`}</button></li>}
        </ol>
      ) : (
        <p>Registro anterior à implantação da auditoria detalhada.</p>
      )}
    </details>
  );
}
