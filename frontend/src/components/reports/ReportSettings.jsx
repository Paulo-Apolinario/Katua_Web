import { useState } from "react";
import Field from "./ReportField";
import { reportService } from "../../services/reportService";
export default function ReportSettings({ context, onSaved, onClose }) {
  const [form, setForm] = useState(structuredClone(context.settings)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const setGoal = (k, v) =>
    setForm((p) => ({ ...p, goals: { ...p.goals, [k]: v } }));
  const setMethod = (k, v) =>
    setForm((p) => ({ ...p, methodology: { ...p.methodology, [k]: v } }));
  async function save(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await reportService.saveConfig(form);
      await onSaved();
      onClose();
    } catch (e) {
      setError(e.error || e.message || "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card p-4 mb-4">
      <h2>Metas e metodologia da cooperativa</h2>
      <p>
        Metas mensais e fatores definidos pela organização. O sistema não
        fornece fatores ambientais genéricos ou comprova reciclagem.
      </p>
      {error && (
        <p role="alert" className="alert alert-danger">
          {error}
        </p>
      )}
      <form onSubmit={save}>
        <fieldset disabled={busy}>
          <div className="report-grid">
            <Field
              label="Meta mensal de coletas executadas"
              type="number"
              value={form.goals.monthlyCollections}
              onChange={(v) => setGoal("monthlyCollections", v)}
            />
            <Field
              label="Meta mensal de massa (kg equivalentes)"
              type="number"
              value={form.goals.monthlyMassKg}
              onChange={(v) => setGoal("monthlyMassKg", v)}
            />
            {Object.entries({
              label: "Nome da metodologia",
              source: "Fonte e justificativa",
              url: "Link da referência",
              version: "Versão da metodologia",
            }).map(([k, l]) => (
              <Field
                key={k}
                label={l}
                value={form.methodology[k]}
                onChange={(v) => setMethod(k, v)}
              />
            ))}
          </div>
          <p className="small text-muted mt-3">
            Os fatores abaixo calculam potencial estimado a partir da massa
            coletada, não emissão evitada comprovada. Materiais em litros, m³ ou
            unidades não entram no cálculo.
          </p>
          {form.methodology.factors.map((f, i) => (
            <div className="report-grid report-rule" key={i}>
              <Field
                label={`Fator ${i + 1} — Material`}
                options={[
                  { value: "", label: "Selecione" },
                  ...context.materials.map((m) => ({
                    value: m.id,
                    label: m.name,
                  })),
                ]}
                value={f.materialId}
                onChange={(v) =>
                  setMethod(
                    "factors",
                    form.methodology.factors.map((x, j) =>
                      i === j ? { ...x, materialId: v } : x,
                    ),
                  )
                }
              />
              <Field
                label={`Fator ${i + 1} — kg CO2 por kg de material`}
                type="number"
                value={f.co2PerKg}
                onChange={(v) =>
                  setMethod(
                    "factors",
                    form.methodology.factors.map((x, j) =>
                      i === j ? { ...x, co2PerKg: v } : x,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() =>
                  setMethod(
                    "factors",
                    form.methodology.factors.filter((_, j) => i !== j),
                  )
                }
              >
                Remover fator {i + 1}
              </button>
            </div>
          ))}
          <div className="d-flex gap-2 flex-wrap mt-3">
            <button
              type="button"
              className="btn btn-outline-success"
              disabled={form.methodology.factors.length >= 100}
              onClick={() =>
                setMethod("factors", [
                  ...form.methodology.factors,
                  { materialId: "", co2PerKg: null },
                ])
              }
            >
              Adicionar fator
            </button>
            <button className="btn btn-success" type="submit">
              {busy ? "Salvando..." : "Salvar metas e metodologia"}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
            >
              Fechar configuração
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
