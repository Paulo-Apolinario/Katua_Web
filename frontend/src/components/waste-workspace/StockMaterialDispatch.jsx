import { useRef, useState } from "react";
import { apiRequest } from "../../services/apiClient";
import {
  buildInternalDocumentPdf,
  internalDocumentSections,
} from "../../utils/internalDocumentPdf";
import { WASTE_UNIT_OPTIONS } from "../../services/wasteTypeService";
import CollectionDialog from "../collections/CollectionDialog";
const labels = {
  SALE: "Venda / entrega",
  DONATION: "Doação",
  DIRECT_DESTINATION: "Destinação direta",
  DISPOSAL: "Descarte",
};
const localNow = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export default function StockMaterialDispatch({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    stockItemId: item.id,
    unit: item.unit || "KG",
    quantity: "",
    kind: "SALE",
    destinationName: "",
    destinationDocument: "",
    destinationAddress: "",
    movementDate: localNow(),
    notes: "",
    transportDriverName: "",
    transportVehiclePlate: "",
    transportDocument: "",
    environmentalDocument: "",
  });
  const [preview, setPreview] = useState(null),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [doc, setDoc] = useState(null),
    [uncertain, setUncertain] = useState(false);
  const guard = useRef(false),
    operation = useRef(null);
  const key = `katua:stock-dispatch:${item.id}`;
  // Preserve an unresolved protocol across closing/reloading. Never resend with a new ID blindly.
  const [pending, setPending] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(key));
    } catch {
      return null;
    }
  });
  const frozen = busy || uncertain || !!pending || !!doc;
  function change(name, value) {
    setForm((v) => ({ ...v, [name]: value }));
    setPreview(null);
    setConfirmed(false);
    operation.current = null;
    setError("");
  }
  function body() {
    return {
      ...form,
      quantity: Number(String(form.quantity).replace(",", ".")),
      movementDate: new Date(form.movementDate).toISOString(),
    };
  }
  async function run(work) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e.message || "Não foi possível concluir.");
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  async function recover() {
    await run(async () => {
      const id = pending?.operationId || operation.current;
      if (!id) return;
      try {
        const result = await apiRequest(`/waste-stock/dispatches/${id}`);
        setDoc(result.document);
        setPending(null);
        setUncertain(false);
        sessionStorage.removeItem(key);
        onSaved();
      } catch (e) {
        if (e.status !== 404) throw e;
        // A previous request may still be finishing: retry the EXACT same operation safely.
        const saved = pending;
        if (!saved?.body)
          throw Error(
            "Protocolo ainda não localizado. Confira novamente antes de criar outra saída.",
          );
        try {
          const result = await apiRequest("/waste-stock/dispatches", {
            method: "POST",
            body: saved.body,
          });
          setDoc(result.document);
          setPending(null);
          setUncertain(false);
          sessionStorage.removeItem(key);
          onSaved();
        } catch (retryError) {
          if ([400, 409].includes(retryError.status)) {
            sessionStorage.removeItem(key);
            setPending(null);
            setUncertain(false);
            setPreview(null);
            setConfirmed(false);
            operation.current = null;
          }
          throw retryError;
        }
      }
    });
  }
  async function submit() {
    if (!preview || !confirmed) return;
    await run(async () => {
      const payload = {
        ...body(),
        operationId: operation.current,
        expectedPlanHash: preview.planHash,
      };
      const saved = { operationId: payload.operationId, body: payload };
      // Storage must succeed before the request starts.
      sessionStorage.setItem(key, JSON.stringify(saved));
      setPending(saved);
      try {
        const result = await apiRequest("/waste-stock/dispatches", {
          method: "POST",
          body: payload,
        });
        setDoc(result.document);
        sessionStorage.removeItem(key);
        setPending(null);
        onSaved();
      } catch (e) {
        if (e.status && e.status < 500) {
          sessionStorage.removeItem(key);
          setPending(null);
          setPreview(null);
          setConfirmed(false);
          operation.current = null;
        } else setUncertain(true);
        throw e;
      }
    });
  }
  const field = (name, label, type = "text", required = false) => (
    <div className="col-md-6" key={name}>
      <label className="form-label" htmlFor={`dispatch-${name}`}>
        {label}
      </label>
      <input
        id={`dispatch-${name}`}
        className="form-control"
        type={type}
        value={form[name]}
        required={required}
        disabled={frozen}
        maxLength={
          name === "destinationAddress" ? 500 : name === "notes" ? 1500 : 255
        }
        onChange={(e) => change(name, e.target.value)}
      />
    </div>
  );
  return (
    <CollectionDialog
      title={`Saída por quantidade · ${item.name}`}
      busy={busy}
      onClose={onClose}
    >
      {error && (
        <p role="alert" className="alert alert-danger">
          {error}
        </p>
      )}
      {(pending || uncertain) && (
        <div className="alert alert-warning">
          <p>
            Há uma confirmação pendente de resposta. Confira este protocolo
            antes de registrar outra saída deste material.
          </p>
          <code>{pending?.operationId || operation.current}</code>
          <button
            className="btn btn-outline-success d-block mt-2"
            disabled={busy}
            onClick={recover}
          >
            Conferir protocolo / concluir tentativa
          </button>
        </div>
      )}
      {doc ? (
        <>
          <p role="status" className="alert alert-success">
            Saída registrada. Os saldos dos lotes foram atualizados.
          </p>
          <button
            className="btn btn-success mb-3"
            onClick={() =>
              buildInternalDocumentPdf(doc).save(`${doc.number}.pdf`)
            }
          >
            Baixar documento interno em PDF
          </button>
          {internalDocumentSections(doc).map(([title, rows]) => (
            <section key={title}>
              <h3 className="h6">{title}</h3>
              <dl>
                {rows.map(([label, value], i) => (
                  <div key={i}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          <p className="small text-muted">
            Documento interno. Não substitui documentos fiscais, ambientais ou
            de transporte oficiais.
          </p>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const data = body();
              const result = await apiRequest(
                "/waste-stock/dispatches/preview",
                {
                  method: "POST",
                  body: {
                    stockItemId: data.stockItemId,
                    unit: data.unit,
                    quantity: data.quantity,
                  },
                },
              );
              operation.current = crypto.randomUUID();
              setPreview(result);
              setConfirmed(false);
            });
          }}
        >
          <p>
            Informe o total a retirar. O sistema utiliza primeiro os lotes mais
            antigos disponíveis, preservando os saldos restantes. Lotes
            reservados não entram nesta saída.
          </p>
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="dispatch-unit" className="form-label">
                Unidade
              </label>
              <select
                id="dispatch-unit"
                className="form-select"
                disabled={frozen}
                value={form.unit}
                onChange={(e) => change("unit", e.target.value)}
              >
                {WASTE_UNIT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {field("quantity", "Quantidade total", "text", true)}
            <div className="col-md-6">
              <label className="form-label" htmlFor="dispatch-kind">
                Tipo de saída
              </label>
              <select
                id="dispatch-kind"
                className="form-select"
                value={form.kind}
                disabled={frozen}
                onChange={(e) => change("kind", e.target.value)}
              >
                {Object.entries(labels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            {field(
              "movementDate",
              "Data e hora da saída",
              "datetime-local",
              true,
            )}
            {field(
              "destinationName",
              "Destinatário / local de destino",
              "text",
              true,
            )}
            {field(
              "destinationDocument",
              "CPF / CNPJ do destinatário (opcional)",
            )}
            {field("destinationAddress", "Endereço do destino (opcional)")}
            {field(
              "notes",
              form.kind === "DISPOSAL"
                ? "Justificativa do descarte"
                : "Observações (opcional)",
              "text",
              form.kind === "DISPOSAL",
            )}
          </div>
          <details className="my-3">
            <summary>Transporte e documentos (opcional)</summary>
            <div className="row g-3 mt-1">
              {field("transportDriverName", "Motorista")}
              {field("transportVehiclePlate", "Placa")}
              {field("transportDocument", "Documento de transporte")}
              {field("environmentalDocument", "Documento ambiental")}
            </div>
          </details>
          <button className="btn btn-outline-success my-3" disabled={frozen}>
            Conferir lotes e saldos
          </button>
          {preview && (
            <section aria-label="Prévia da saída">
              <h3 className="h6">
                Conferência · {preview.quantity} {preview.unit} ·{" "}
                {form.destinationName}
              </h3>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Lote</th>
                      <th>Saldo atual</th>
                      <th>Retirar</th>
                      <th>Saldo restante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.allocations.map((a) => (
                      <tr key={a.lotId}>
                        <td>{a.lotCode}</td>
                        <td>{a.before}</td>
                        <td>{a.quantity}</td>
                        <td>{a.after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <label className="d-flex gap-2 my-3">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={frozen}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Conferi a quantidade, os lotes e o destinatário.
              </label>
              <button
                type="button"
                className="btn btn-success"
                disabled={frozen || !confirmed}
                onClick={submit}
              >
                Confirmar saída e gerar documento
              </button>
            </section>
          )}
        </form>
      )}
    </CollectionDialog>
  );
}
