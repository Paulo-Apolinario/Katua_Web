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
    [revision, setRevision] = useState(0);
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
          {events.map((event) => (
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
              {event.snapshot?.before?.type && (
                <div>
                  {getWasteDestinationTypeLabel(event.snapshot.before.type)} →{" "}
                  {getWasteDestinationTypeLabel(event.snapshot.after?.type)}
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p>Registro anterior à implantação da auditoria detalhada.</p>
      )}
    </details>
  );
}
