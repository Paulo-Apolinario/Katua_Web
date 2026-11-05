import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../services/apiClient";
import { getWasteStockItemsArray } from "../../services/wasteStockService";
import { quantity } from "../../utils/collectionWorkspace";
export default function CollectionInitialWeigh({
  collection,
  onChange,
  onBusy,
}) {
  const [catalog, setCatalog] = useState([]),
    [loading, setLoading] = useState(true),
    [rows, setRows] = useState([
      { id: crypto.randomUUID(), itemId: "", quantity: "" },
    ]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const guard = useRef(false),
    operation = useRef(crypto.randomUUID());
  useEffect(() => {
    let active = true;
    getWasteStockItemsArray()
      .then((r) => {
        if (active)
          setCatalog(
            r.filter((c) => c.isActive !== false && c.status !== "INACTIVE"),
          );
      })
      .catch(() => {
        if (active)
          setError(
            "Catálogo indisponível. Atualize os detalhes para tentar novamente.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function save(e) {
    e.preventDefault();
    if (guard.current) return;
    setError("");
    try {
      const materials = rows.map((row) => {
        const item = catalog.find((i) => i.id === row.itemId),
          q = Number(row.quantity);
        if (!item || !Number.isFinite(q) || q <= 0)
          throw Error("Selecione os materiais e informe as quantidades reais.");
        return {
          wasteTypeId: item.id,
          quantity: q,
          unit: item.defaultUnit || item.unit,
        };
      });
      if (
        new Set(materials.map((m) => m.wasteTypeId)).size !== materials.length
      )
        throw Error("Agrupe as quantidades do mesmo material em uma linha.");
      guard.current = true;
      setBusy(true);
      onBusy?.(true);
      const r = await apiRequest(
        `/material-intakes/${encodeURIComponent(collection.id)}/weigh`,
        { method: "POST", body: { operationId: operation.current, materials } },
      );
      if (!r.collection?.id)
        throw Error(
          "Resposta não confirmada. Atualize os detalhes antes de repetir.",
        );
      await onChange(r.collection);
    } catch (e) {
      setError(e.error || e.message);
    } finally {
      guard.current = false;
      setBusy(false);
      onBusy?.(false);
    }
  }
  return (
    <form onSubmit={save} aria-label="Separação e pesagem inicial">
      <h3 className="fs-18">Materiais recebidos</h3>
      <p className="small text-muted">
        Separe os materiais e registre a quantidade em sua unidade. Litros e
        unidades não são convertidos em kg.
      </p>
      {loading ? (
        <p role="status">Carregando catálogo…</p>
      ) : (
        rows.map((row) => (
          <div key={row.id} className="row g-2 mb-3 align-items-end">
            <label className="col-sm-7">
              Material
              <select
                aria-label={`Material da pesagem ${rows.indexOf(row) + 1}`}
                required
                className="form-select"
                disabled={busy}
                value={row.itemId}
                onChange={(e) =>
                  setRows((old) =>
                    old.map((r) =>
                      r.id === row.id ? { ...r, itemId: e.target.value } : r,
                    ),
                  )
                }
              >
                <option value="">Selecione</option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({quantity(1, c.defaultUnit || c.unit)})
                  </option>
                ))}
              </select>
            </label>
            <label className="col-sm-3">
              Quantidade
              <input
                aria-label={`Quantidade da pesagem ${rows.indexOf(row) + 1}`}
                required
                className="form-control"
                type="number"
                min="0.001"
                step="0.001"
                disabled={busy}
                value={row.quantity}
                onChange={(e) =>
                  setRows((old) =>
                    old.map((r) =>
                      r.id === row.id ? { ...r, quantity: e.target.value } : r,
                    ),
                  )
                }
              />
            </label>
            <div className="col-sm-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={busy || rows.length === 1}
                onClick={() =>
                  setRows((old) => old.filter((r) => r.id !== row.id))
                }
              >
                Remover
              </button>
            </div>
          </div>
        ))
      )}
      {!!error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <div className="d-flex gap-2 flex-wrap">
        <button
          type="button"
          className="btn btn-outline-success"
          disabled={busy || rows.length >= 100}
          onClick={() =>
            setRows((old) => [
              ...old,
              { id: crypto.randomUUID(), itemId: "", quantity: "" },
            ])
          }
        >
          Adicionar material
        </button>
        <button
          className="btn btn-success"
          disabled={busy || loading || !catalog.length}
        >
          {busy ? "Salvando…" : "Confirmar pesagem"}
        </button>
      </div>
    </form>
  );
}
