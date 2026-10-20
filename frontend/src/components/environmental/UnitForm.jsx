import { choices } from "./environmentalModel";
import { useState } from "react";
import { environmentalService as api } from "../../services/environmentalService";
import { Field, Message } from "./EnvironmentalFields";
import { ROLES, unitPayload } from "./environmentalModel";
export default function UnitForm({
  unit,
  municipality,
  context,
  onSaved,
  onCancel,
}) {
  const [form, setForm] = useState(() =>
    unitPayload(
      unit || {
        municipalityCode: municipality,
        name: context.cooperative?.name || "",
        taxId: context.cooperative?.registrationNumber || "",
        environment: "HOMOLOGATION",
      },
    ),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await api.saveUnit(unit?.id, {
        ...form,
        ...(unit ? { version: unit.version } : {}),
      });
      onSaved(result);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="card p-4">
      <h2>{unit ? "Configurar unidade" : "Cadastrar organização/unidade"}</h2>
      <p className="text-muted">
        Cadastros internos para preparação de documentos. Informar um perfil ou
        código não comprova habilitação no SINIR.
      </p>
      <Message error={error} />
      <fieldset disabled={busy} className="env-fieldset">
        <div className="env-grid">
          <Field
            label="Município da unidade"
            value={form.municipalityCode}
            options={context.municipalities.map((m) => ({
              value: m.code,
              label: m.name + " / " + m.state,
            }))}
            disabled={!!unit}
            onChange={(v) => set("municipalityCode", v)}
          />
          <Field
            label="Nome da organização/unidade"
            value={form.name}
            onChange={(v) => set("name", v)}
            maxLength={180}
          />
          <Field
            label="CNPJ da organização (somente dígitos)"
            value={form.taxId}
            onChange={(v) => set("taxId", v.replace(/\D/g, ""))}
            maxLength={14}
          />
          <Field
            label="Código da unidade no SINIR"
            value={form.officialUnitCode}
            onChange={(v) => set("officialUnitCode", v)}
            maxLength={40}
          />
          <Field
            label="Endereço da unidade"
            value={form.address}
            onChange={(v) => set("address", v)}
            maxLength={500}
          />
          <Field
            label="Responsável pela unidade"
            value={form.responsibleName}
            onChange={(v) => set("responsibleName", v)}
            maxLength={180}
          />
          <Field
            label="Cargo ou função do responsável"
            value={form.responsiblePosition}
            onChange={(v) => set("responsiblePosition", v)}
            maxLength={180}
          />
          <Field
            label="Referência da designação/autorização"
            value={form.appointmentReference}
            onChange={(v) => set("appointmentReference", v)}
            maxLength={500}
          />
          <Field
            label="Ambiente pretendido da integração"
            value={form.environment}
            options={choices({
              HOMOLOGATION: "Homologação (testes)",
              PRODUCTION: "Produção (depende de habilitação)",
            })}
            onChange={(v) => set("environment", v)}
          />
        </div>
        <fieldset className="mt-3">
          <legend className="h6">Perfis a conferir no cadastro oficial</legend>
          <div className="d-flex flex-wrap gap-3">
            {Object.entries(ROLES).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  className="form-check-input me-2"
                  checked={form.operationalRoles.includes(key)}
                  onChange={(e) =>
                    set(
                      "operationalRoles",
                      e.target.checked
                        ? [...form.operationalRoles, key]
                        : form.operationalRoles.filter((r) => r !== key),
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {context.role === "COOPERATIVE" && (
          <div className="env-notice mt-3">
            <label>
              <input
                type="checkbox"
                className="form-check-input me-2"
                checked={form.shareWithMunicipality}
                onChange={(e) => set("shareWithMunicipality", e.target.checked)}
              />
              Autorizar consulta desta unidade e de seus documentos pelos
              gestores designados deste município no KATUÁ.
            </label>
            <p className="small mb-0 mt-2">
              Inclui os documentos e evidências desta central. A autorização
              pode ser retirada; não concede acesso a outros módulos ou às
              credenciais da organização.
            </p>
          </div>
        )}
        <div className="d-flex gap-2 flex-wrap mt-4">
          <button className="btn btn-success" type="submit">
            {busy ? "Salvando..." : "Salvar unidade"}
          </button>
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </fieldset>
    </form>
  );
}
