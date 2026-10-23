import { useRef, useState } from "react";
import { apiRequest } from "../../services/apiClient";
export default function CollectionIncidents({ collection, onChange, onBusy }) {
  const [resolution, setResolution] = useState({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const guard = useRef(false);
  if (!collection.incidents?.length) return null;
  async function resolve(id) {
    if (guard.current) return;
    if ((resolution[id] || "").trim().length < 5) {
      setError("Descreva o tratamento com pelo menos cinco caracteres.");
      return;
    }
    guard.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      const r = await apiRequest(
        `/collections/${encodeURIComponent(collection.id)}/incidents/${encodeURIComponent(id)}/resolve`,
        { method: "POST", body: { resolution: resolution[id].trim() } },
      );
      if (!r?.collection)
        throw Error("Atualize os detalhes para conferir o resultado.");
      onChange(r.collection);
      setResolution((old) => ({ ...old, [id]: "" }));
    } catch (e) {
      setError(
        e?.error || e?.message || "Não foi possível concluir o tratamento.",
      );
    } finally {
      guard.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <section
      className="border rounded p-3 my-3"
      aria-label="Ocorrências da coleta"
    >
      <h3 className="fs-18">Ocorrências da operação</h3>
      {collection.incidents.map((i) => (
        <div key={i.id} className="border-bottom pb-3 mb-3">
          <span
            className={`badge text-bg-${i.status === "OPEN" ? "warning" : "success"}`}
          >
            {i.status === "OPEN" ? "Aguardando tratamento" : "Tratada"}
          </span>
          <p className="mt-2 mb-1 text-break">{i.description}</p>
          <p className="small text-muted">
            {i.reportedByName || "Responsável registrado"} ·{" "}
            {new Date(i.createdAt).toLocaleString("pt-BR")}
          </p>
          {i.status === "OPEN" ? (
            <>
              <label htmlFor={`resolution-${i.id}`} className="form-label">
                Tratamento realizado pela cooperativa
              </label>
              <textarea
                id={`resolution-${i.id}`}
                className="form-control mb-2"
                maxLength={2000}
                disabled={busy}
                value={resolution[i.id] || ""}
                onChange={(e) =>
                  setResolution((old) => ({ ...old, [i.id]: e.target.value }))
                }
              />
              <button
                type="button"
                className="btn btn-outline-success"
                disabled={busy}
                onClick={() => void resolve(i.id)}
              >
                Concluir tratamento da ocorrência
              </button>
            </>
          ) : (
            <p className="small">
              {i.resolution} · {i.resolvedByName || "Cooperativa"}
            </p>
          )}
        </div>
      ))}
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <p className="small text-muted">
        Registrar ou tratar uma ocorrência não cancela a coleta e não modifica
        os saldos.
      </p>
    </section>
  );
}
