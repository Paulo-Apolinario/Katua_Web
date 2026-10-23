import { useEffect, useRef, useState } from "react";
import { reviewCollectionQuantities } from "../../services/collectionService";
const amount = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
export default function CollectionQuantityReview({
  collection,
  onChange,
  onBusy,
}) {
  const rows = collection.collectionMaterials || [];
  const [values, setValues] = useState({}),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const guard = useRef(false);
  useEffect(() => {
    setValues(
      Object.fromEntries(
        (collection.collectionMaterials || []).map((m) => [
          m.id,
          String(m.quantity),
        ]),
      ),
    );
    setReason("");
    setError("");
  }, [
    collection.id,
    collection.quantityReviewVersion,
    collection.collectionMaterials,
  ]);
  const editable = ["RECEIVED", "SORTING"].includes(collection.status);
  const changed = rows.some((m) => Number(values[m.id]) !== Number(m.quantity));
  async function save(event) {
    event.preventDefault();
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    onBusy?.(true);
    setError("");
    try {
      if (
        rows.some(
          (m) =>
            values[m.id] === "" ||
            !Number.isFinite(Number(values[m.id])) ||
            Number(values[m.id]) < 0,
        )
      )
        throw Error("Informe quantidades válidas para todos os materiais.");
      if (changed && reason.trim().length < 5)
        throw Error("Informe a justificativa da divergência.");
      const result = await reviewCollectionQuantities(collection.id, {
        expectedVersion: collection.quantityReviewVersion || 0,
        reason: reason.trim(),
        items: rows.map((m) => ({
          materialId: m.id,
          quantity: Number(values[m.id]),
        })),
      });
      if (!result?.collection?.id)
        throw Error(
          "Atualize a coleta para conferir se a alteração foi registrada.",
        );
      onChange(result.collection);
      setReason("");
    } catch (err) {
      setError(
        err?.message ||
          err?.error ||
          "Não foi possível registrar a conferência.",
      );
    } finally {
      guard.current = false;
      setBusy(false);
      onBusy?.(false);
    }
  }
  return (
    <section
      className="border rounded p-3 my-3"
      aria-label="Conferência das quantidades recebidas"
    >
      <h3 className="fs-18">Conferência das quantidades recebidas</h3>
      <p className="text-muted small">
        Etapa de conferência e triagem após o recebimento físico. O valor
        informado pelo catador será preservado. Ao salvar, os envolvidos
        receberão um aviso no aplicativo.
      </p>
      {editable && rows.length > 0 && (
        <form onSubmit={save}>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Informado em campo</th>
                  <th>Quantidade recebida</th>
                  <th>Diferença com o informado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.nameSnapshot}
                      <br />
                      <small>{m.unit}</small>
                    </td>
                    <td>
                      {amount(m.reportedQuantity ?? m.quantity)} {m.unit}
                    </td>
                    <td>
                      <input
                        aria-label={`Quantidade recebida de ${m.nameSnapshot}`}
                        className="form-control"
                        style={{ minWidth: 120 }}
                        type="number"
                        step="0.001"
                        min="0"
                        max="1000000000"
                        required
                        disabled={busy}
                        value={values[m.id] ?? ""}
                        onChange={(event) =>
                          setValues((old) => ({
                            ...old,
                            [m.id]: event.target.value,
                          }))
                        }
                      />
                      {Number(m.wasteEntry?.destinedQuantity) > 0 && (
                        <small>
                          Já destinado: {amount(m.wasteEntry.destinedQuantity)}{" "}
                          {m.unit}
                        </small>
                      )}
                    </td>
                    <td>
                      {values[m.id] === ""
                        ? "—"
                        : amount(
                            Number(values[m.id]) -
                              Number(m.reportedQuantity ?? m.quantity),
                          )}{" "}
                      {m.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="form-label" htmlFor="quantity-review-reason">
            Justificativa {changed ? "(obrigatória)" : "(opcional)"}
          </label>
          <textarea
            id="quantity-review-reason"
            className="form-control mb-3"
            rows={3}
            maxLength={2000}
            required={changed}
            minLength={changed ? 5 : undefined}
            disabled={busy}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: diferença identificada na pesagem da balança da cooperativa."
          />
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <button className="btn btn-success" disabled={busy}>
            {busy ? "Registrando…" : "Salvar conferência de quantidade"}
          </button>
          <p className="small text-muted mt-2">
            Reduções abaixo da quantidade já destinada exigem cancelar ou
            regularizar as destinações afetadas primeiro. Litros e unidades
            permanecem nas suas unidades originais.
          </p>
        </form>
      )}
      {!editable && !collection.quantityReviews?.length && (
        <p className="text-muted small">
          A conferência fica disponível após o recebimento da coleta.
        </p>
      )}
      {!!collection.quantityReviews?.length && (
        <div className="mt-3">
          <h4 className="fs-16">Histórico de conferências</h4>
          {collection.quantityReviews.map((review) => (
            <div className="border-top pt-3 mt-3" key={review.id}>
              <strong>
                Conferência {review.version} · {review.actorName}
              </strong>
              <p className="small text-muted">
                {new Date(review.createdAt).toLocaleString("pt-BR", {
                  timeZone: "America/Fortaleza",
                })}
              </p>
              <p>{review.reason}</p>
              {review.items.map((item) => (
                <p className="small" key={item.materialId}>
                  {item.name}: informado {amount(item.reportedQuantity)} ·
                  anterior {amount(item.previousQuantity)} · conferido{" "}
                  {amount(item.confirmedQuantity)} {item.unit}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
