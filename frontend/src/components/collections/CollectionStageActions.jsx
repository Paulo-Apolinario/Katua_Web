import { useRef, useState } from "react";
import {
  receiveCollection,
  startCollectionSorting,
  completeCollection,
} from "../../services/collectionService";

const stages = {
  COLLECTED: {
    title: "Confirmar recebimento",
    action: receiveCollection,
    help: "Confirme que os materiais chegaram fisicamente à cooperativa. Confira as quantidades registradas em campo; descreva divergências nas observações antes de continuar.",
    confirmation: "Conferi a chegada física e os materiais desta coleta.",
  },
  RECEIVED: {
    title: "Iniciar triagem",
    action: startCollectionSorting,
    help: "Registre o início da conferência e separação dos materiais recebidos.",
    confirmation: "Confirmo o início da triagem dos materiais recebidos.",
  },
  SORTING: {
    title: "Concluir operação",
    action: completeCollection,
    help: "Finalize após conferir todas as destinações. Saldos pendentes e reservas temporárias impedem o encerramento. Após concluir, as destinações ficam bloqueadas para edição e cancelamento.",
    confirmation: "Conferi as destinações e confirmo o encerramento da coleta.",
  },
};
export default function CollectionStageActions({
  collection,
  onChange,
  onBusy,
}) {
  const [notes, setNotes] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const guard = useRef(false);
  const stage = stages[collection.status];
  if (!stage) return null;
  async function submit(e) {
    e.preventDefault();
    if (!confirmed || guard.current) return;
    guard.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      const joined = [
        collection.notes,
        notes.trim() && `[${stage.title}] ${notes.trim()}`,
      ]
        .filter(Boolean)
        .join("\n");
      const response = await stage.action(
        collection.id,
        joined ? { notes: joined } : {},
      );
      if (!response?.collection?.id)
        throw Error(
          "Resposta inválida. Atualize os detalhes para conferir a operação antes de tentar novamente.",
        );
      onChange(response.collection);
      setNotes("");
      setConfirmed(false);
    } catch (err) {
      setError(
        err?.error ||
          err?.message ||
          "Não foi possível atualizar a etapa. Confira a situação antes de repetir a operação.",
      );
    } finally {
      guard.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="border rounded p-3 my-3"
      aria-label="Operação da cooperativa"
    >
      <h3 className="fs-18">{stage.title}</h3>
      <p className="text-muted small">{stage.help}</p>
      <label className="form-label" htmlFor="collection-stage-notes">
        Observações da operação
      </label>
      <textarea
        id="collection-stage-notes"
        className="form-control mb-3"
        maxLength={Math.max(0, 1900 - (collection.notes?.length || 0))}
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={busy}
      />
      <label className="d-flex gap-2 mb-3">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={busy}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        {stage.confirmation}
      </label>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="btn btn-success"
        disabled={!confirmed || busy}
      >
        {busy ? "Registrando…" : stage.title}
      </button>
    </form>
  );
}
