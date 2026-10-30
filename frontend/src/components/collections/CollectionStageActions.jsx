import { completionBlockers, collectionEntries } from "../../utils/materialDisposition";
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
    help: "Confirme que os materiais chegaram fisicamente à cooperativa. Após confirmar a chegada, utilize a conferência de quantidades na etapa de triagem.",
    confirmation: "Conferi a chegada física e os materiais desta coleta.",
  },
  RECEIVED: {
    title: "Iniciar triagem",
    action: startCollectionSorting,
    help: "Confira as quantidades recebidas na seção de pesagem e registre o início da separação dos materiais.",
    confirmation: "Confirmo o início da triagem dos materiais recebidos.",
  },
  SORTING: {
    title: "Concluir coleta",
    action: completeCollection,
    help: "Conclua após conferir as quantidades e encaminhar todo o material. Destinação direta, rejeito e descarte encerram a etapa do material. Estoque, triagem e reserva seguem em acompanhamento; a conclusão da coleta não encerra esses materiais.",
    confirmation: "Confirmo a conclusão da coleta e conferi os encaminhamentos dos materiais.",
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
  const entries = collectionEntries(collection);
  const closing = collection.status === "SORTING" || (collection.status === "RECEIVED" && collection.quantityReviewVersion > 0 && entries.length > 0 && entries.every(entry => Number(entry.remainingQuantity) <= 0));
  const stage = closing ? stages.SORTING : stages[collection.status];
  const blockers = closing ? completionBlockers(collection) : [];
  if (
    !stage ||
    (collection.status === "RECEIVED" && !collection.quantityReviewVersion)
  )
    return null;
  async function submit(e) {
    e.preventDefault();
    if (!confirmed || guard.current || blockers.length) return;
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
      {blockers.length > 0 && <div role="status" className="alert alert-warning"><strong>Antes de concluir:</strong><ul className="mb-0">{blockers.map(reason => <li key={reason}>{reason}</li>)}</ul></div>}
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
        disabled={!confirmed || busy || blockers.length > 0}
      >
        {busy ? "Registrando…" : stage.title}
      </button>
    </form>
  );
}
