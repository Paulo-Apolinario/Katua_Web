import { choices } from "./environmentalModel";
import { useState } from "react";
import { Field } from "./EnvironmentalFields";
import { UNITS, emptyMaterial } from "./environmentalModel";
export function ManifestForm({ value, onChange }) {
  const set = (key, v) => onChange({ ...value, [key]: v });
  return (
    <>
      {Object.entries({
        origin: "Origem",
        carrier: "Transportador",
        recipient: "Destinatário",
      }).map(([key, label]) => (
        <section className="card p-4 mb-3" key={key}>
          <h2>{label}</h2>
          <div className="env-grid">
            {Object.entries({
              name: "Nome ou razão social",
              taxId: "CPF/CNPJ (somente dígitos)",
              officialUnitCode: "Unidade oficial SINIR",
              municipalityCode: "Código IBGE do município",
              address: "Endereço",
            }).map(([field, title]) => (
              <Field
                key={field}
                label={`${label} — ${title}`}
                value={value[key][field]}
                onChange={(v) => set(key, { ...value[key], [field]: v })}
              />
            ))}
          </div>
        </section>
      ))}
      <section className="card p-4 mb-3">
        <h2>Expedição e transporte</h2>
        <div className="env-grid">
          <Field
            label="Data de expedição"
            type="date"
            value={value.departureDate}
            onChange={(v) => set("departureDate", v)}
          />
          <Field
            label="Nome do motorista"
            value={value.driverName}
            onChange={(v) => set("driverName", v)}
          />
          <Field
            label="Placa do veículo"
            value={value.vehiclePlate}
            onChange={(v) => set("vehiclePlate", v.toUpperCase())}
          />
        </div>
        <p className="small text-muted mt-3 mb-0">
          Prepare o manifesto antes do transporte. Os dados importados da coleta
          exigem conferência.
        </p>
      </section>
      <section className="card p-4 mb-3">
        <div className="d-flex justify-content-between gap-2 flex-wrap mb-3">
          <h2>Resíduos do documento</h2>
          <button
            type="button"
            className="btn btn-outline-success btn-sm"
            disabled={value.materials.length >= 50}
            onClick={() =>
              set("materials", [...value.materials, emptyMaterial()])
            }
          >
            Adicionar resíduo
          </button>
        </div>
        <p className="small text-muted">
          Use os códigos do catálogo oficial vigente. Os códigos não são
          deduzidos pelo nome do material.
        </p>
        {value.materials.map((material, index) => (
          <fieldset className="env-row" key={index}>
            <legend className="h6">Resíduo {index + 1}</legend>
            <div className="env-grid">
              {Object.entries({
                name: "Descrição",
                ibamaCode: "Código IBAMA",
                quantity: "Quantidade",
                unit: "Unidade",
                classificationCode: "Código da classificação",
                physicalStateCode: "Código do estado físico",
                packagingCode: "Código do acondicionamento",
                treatmentCode: "Código do tratamento",
              }).map(([key, label]) => (
                <Field
                  key={key}
                  label={`Resíduo ${index + 1} — ${label}`}
                  type={key === "quantity" ? "number" : "text"}
                  options={key === "unit" ? choices(UNITS) : undefined}
                  value={material[key]}
                  onChange={(v) =>
                    set(
                      "materials",
                      value.materials.map((r, i) =>
                        i === index ? { ...r, [key]: v } : r,
                      ),
                    )
                  }
                />
              ))}
            </div>
            <button
              className="btn btn-outline-danger btn-sm mt-3"
              type="button"
              onClick={() =>
                set(
                  "materials",
                  value.materials.filter((_, i) => i !== index),
                )
              }
            >
              Remover resíduo {index + 1}
            </button>
          </fieldset>
        ))}
        {!value.materials.length && <p>Nenhum resíduo informado.</p>}
      </section>
      <section className="card p-4 mb-3">
        <h2>Referências e observações</h2>
        <div className="env-grid">
          <Field
            label="Números oficiais dos MTRs LR de origem (um por linha)"
            type="textarea"
            value={value.originManifestNumbers.join("\n")}
            onChange={(v) => set("originManifestNumbers", v.split("\n"))}
          />
          <Field
            label="Número da nota fiscal"
            value={value.invoiceNumber}
            onChange={(v) => set("invoiceNumber", v)}
          />
          <Field
            label="Chave da nota fiscal"
            value={value.invoiceAccessKey}
            onChange={(v) => set("invoiceAccessKey", v)}
            maxLength={44}
          />
          <Field
            label="Observações do manifesto"
            type="textarea"
            value={value.notes}
            onChange={(v) => set("notes", v)}
            maxLength={4000}
          />
        </div>
        <p className="small text-muted mt-2 mb-0">
          MTR LR Processo exige referências da origem e da nota fiscal.
          Preencher a referência não emite uma nota fiscal.
        </p>
      </section>
    </>
  );
}
export function CdfForm({ value, onChange }) {
  return (
    <section className="card p-4 mb-3">
      <h2>Preparação do CDF</h2>
      <p className="text-muted">
        Documento de destinação, distinto do recebimento e da entrada em
        estoque. Informe os manifestos oficiais correspondentes.
      </p>
      <div className="env-grid">
        {Object.entries({
          manifestNumbers: "Manifestos oficiais recebidos (um por linha)",
          periodStart: "Início do período",
          periodEnd: "Fim do período",
          technicalResponsible: "Responsável técnico",
          technicalRegistration: "Registro profissional",
          treatmentDescription: "Descrição do tratamento",
          notes: "Observações do CDF",
        }).map(([key, label]) => (
          <Field
            key={key}
            label={label}
            type={
              key.startsWith("period")
                ? "date"
                : ["manifestNumbers", "treatmentDescription", "notes"].includes(
                      key,
                    )
                  ? "textarea"
                  : "text"
            }
            maxLength={4000}
            value={
              key === "manifestNumbers" ? value[key].join("\n") : value[key]
            }
            onChange={(v) =>
              onChange({
                ...value,
                [key]: key === "manifestNumbers" ? v.split("\n") : v,
              })
            }
          />
        ))}
      </div>
    </section>
  );
}
const SECTIONS = {
  diagnosis: "Diagnóstico",
  costs: "Soluções compartilhadas e custos",
  areas: "Áreas favoráveis",
  income: "Geração de renda",
  liabilities: "Passivo ambiental",
  delivery: "Revisão da declaração",
};
const YESNO = choices({ UNKNOWN: "Não informado", YES: "Sim", NO: "Não" });
export function MunicipalForm({ value, onChange, municipal, disabled }) {
  const [section, setSection] = useState("diagnosis");
  const p = value[section];
  const set = (key, v) => onChange({ ...value, [section]: { ...p, [key]: v } });
  const configs = {
    costs: {
      sharedServices: "Serviços compartilhados e solução adotada",
      participatingMunicipalities: "Municípios participantes",
      cleaningCost: "Custo de limpeza urbana (R$)",
      selectiveCost: "Custo da coleta seletiva (R$)",
      disposalCost: "Custo da disposição final (R$)",
      source: "Fonte e abrangência dos custos",
    },
    areas: {
      masterPlan: "Possui plano diretor?",
      zoning: "Possui zoneamento ambiental?",
      description: "Descrição das áreas favoráveis",
      evidence: "Referências documentais das áreas",
    },
    income: {
      initiatives: "Programas, ações e incentivos",
      organizations: "Organizações envolvidas",
      source: "Fonte das informações de geração de renda",
    },
    liabilities: {
      exists: "Há passivo ambiental?",
      description: "Descrição dos passivos",
      locations: "Localização das áreas",
      evidence: "Referências documentais do passivo",
    },
    delivery: {
      responsibleName: "Responsável pela preparação",
      position: "Cargo ou função",
      appointmentReference: "Referência da designação ou autorização",
      coverageNotes: "Abrangência e limitações dos dados",
      reviewNotes: "Notas da revisão",
    },
  };
  return (
    <>
      <nav
        className="d-flex gap-2 flex-wrap mb-3"
        aria-label="Etapas da declaração"
      >
        {Object.entries(SECTIONS).map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={section === key}
            className={`btn btn-sm ${section === key ? "btn-success" : "btn-outline-secondary"}`}
            onClick={() => setSection(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      <fieldset disabled={disabled} className="env-fieldset">
        <section className="card p-4 mb-3">
          <h2>{SECTIONS[section]}</h2>
          <p className="small text-muted">
            Preparação de dados para revisão. Em branco significa não informado;
            zero significa valor conhecido igual a zero. Isso não é comprovante
            de entrega ao SINIR.
          </p>
          {section === "diagnosis" ? (
            <>
              <Field
                label="Abrangência dos dados"
                value={p.coverage}
                options={choices(
                  municipal
                    ? {
                        OPERATIONAL_ONLY: "Operação acompanhada pelo KATUÁ",
                        MUNICIPAL_CONSOLIDATED:
                          "Consolidado municipal informado pelo responsável",
                      }
                    : {
                        OPERATIONAL_ONLY:
                          "Somente operação da cooperativa acompanhada pelo KATUÁ",
                      },
                )}
                onChange={(v) => set("coverage", v)}
              />
              <div className="env-grid mt-3">
                <Field
                  label="Meta de coleta seletiva (t/ano)"
                  type="number"
                  value={p.selectiveTargetTon}
                  onChange={(v) => set("selectiveTargetTon", v)}
                />
                <Field
                  label="Meta de reciclagem (t/ano)"
                  type="number"
                  value={p.recyclingTargetTon}
                  onChange={(v) => set("recyclingTargetTon", v)}
                />
                <Field
                  label="Ano da meta"
                  type="number"
                  value={p.targetYear}
                  onChange={(v) => set("targetYear", v)}
                />
              </div>
              <h3 className="mt-4">Categorias e destinações</h3>
              {p.wasteRows.map((row, i) => (
                <fieldset className="env-row" key={i}>
                  <legend className="h6">Categoria {i + 1}</legend>
                  <div className="env-grid">
                    {Object.entries({
                      category: "Categoria",
                      quantity: "Quantidade no ano",
                      unit: "Unidade da quantidade",
                      destination: "Forma de destinação",
                      source: "Fonte e abrangência da informação",
                    }).map(([key, label]) => (
                      <Field
                        key={key}
                        label={`Categoria ${i + 1} — ${label}`}
                        value={row[key]}
                        type={key === "quantity" ? "number" : "text"}
                        options={
                          key === "unit"
                            ? choices({ KG: "kg", TON: "t" })
                            : undefined
                        }
                        onChange={(v) =>
                          set(
                            "wasteRows",
                            p.wasteRows.map((r, n) =>
                              n === i ? { ...r, [key]: v } : r,
                            ),
                          )
                        }
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm mt-2"
                    onClick={() =>
                      set(
                        "wasteRows",
                        p.wasteRows.filter((_, n) => n !== i),
                      )
                    }
                  >
                    Remover categoria {i + 1}
                  </button>
                </fieldset>
              ))}
              <button
                type="button"
                className="btn btn-outline-success btn-sm"
                disabled={p.wasteRows.length >= 100}
                onClick={() =>
                  set("wasteRows", [
                    ...p.wasteRows,
                    {
                      category: "",
                      quantity: null,
                      unit: "KG",
                      destination: "",
                      source: "",
                    },
                  ])
                }
              >
                Adicionar categoria
              </button>
              <div className="mt-3">
                <Field
                  label="Notas do diagnóstico"
                  type="textarea"
                  value={p.notes}
                  onChange={(v) => set("notes", v)}
                  maxLength={4000}
                />
              </div>
            </>
          ) : (
            <div className="env-grid">
              {Object.entries(configs[section]).map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  value={p[key]}
                  type={
                    key.endsWith("Cost")
                      ? "number"
                      : ["responsibleName", "position"].includes(key)
                        ? "text"
                        : "textarea"
                  }
                  maxLength={4000}
                  options={
                    ["masterPlan", "zoning", "exists"].includes(key)
                      ? YESNO
                      : undefined
                  }
                  onChange={(v) => set(key, v)}
                />
              ))}
            </div>
          )}
        </section>
      </fieldset>
    </>
  );
}
