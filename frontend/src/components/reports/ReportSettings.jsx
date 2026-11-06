import { MATERIAL_OPTIONS } from "../../utils/materialIdentification";
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
    setForm((p) => ({
      ...p,
      methodology: {
        ...p.methodology,
        [k]: v,
        ...(k !== "approved" ? { approved: false } : {}),
      },
    }));
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
        Os fatores são informados pela cooperativa e exigem validação técnica.
        Não são fornecidos pela ABNT NBR 10004. Sem metodologia validada, as
        quantidades físicas continuam disponíveis.
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
              approvedBy: "Responsável pela validação informado",
              region: "Região / contexto de aplicação",
              processScenario: "Cenário de referência e tratamento considerado",
              validFrom: "Aplicável desde (AAAA-MM-DD)",
              validUntil: "Aplicável até (AAAA-MM-DD, opcional)",
            }).map(([k, l]) => (
              <Field
                key={k}
                label={l}
                value={form.methodology[k] ?? ""}
                onChange={(v) => setMethod(k, v)}
              />
            ))}
          </div>
          <label className="d-flex gap-2 mt-3">
            <input
              type="checkbox"
              checked={form.methodology.approved === true}
              onChange={(e) => setMethod("approved", e.target.checked)}
            />
            Confirmo que esta metodologia foi validada pelo responsável
            informado.
          </label>
          <p className="small text-muted mt-3">
            Campos sem fator permanecem sem estimativa, em vez de aparecerem
            como zero. Os fatores abaixo calculam potencial estimado a partir da
            massa conferida e com material identificado, não emissão evitada
            comprovada. Materiais em litros, m³ ou unidades não entram no
            cálculo.
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
                label={`Fator ${i + 1} — Composição a que se aplica`}
                options={MATERIAL_OPTIONS}
                value={f.materialCode || "UNKNOWN"}
                onChange={(v) =>
                  setMethod(
                    "factors",
                    form.methodology.factors.map((x, j) =>
                      i === j ? { ...x, materialCode: v } : x,
                    ),
                  )
                }
              />
              {[
                ["co2PerKg", "kg CO2e por kg de material"],
                ["waterPerKg", "litros de água por kg de material"],
                ["energyPerKg", "kWh por kg de material"],
                ["treesPerKg", "árvores equivalentes por kg de material"],
              ].map(([key, label]) => (
                <Field
                  key={key}
                  label={`Fator ${i + 1} — ${label}`}
                  min={key === "co2PerKg" ? -1000000 : 0}
                  type="number"
                  value={f[key] ?? null}
                  onChange={(v) =>
                    setMethod(
                      "factors",
                      form.methodology.factors.map((x, j) =>
                        i === j ? { ...x, [key]: v } : x,
                      ),
                    )
                  }
                />
              ))}
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
