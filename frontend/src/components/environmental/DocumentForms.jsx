import {
  choices,
  UNITS,
  emptyMaterial,
  emptyParty,
} from "./environmentalModel";
import { useState } from "react";
import { Field } from "./EnvironmentalFields";
import SinirCatalogField from "./SinirCatalogField";
function PartyFields({ label, value, onChange }) {
  return (
    <section className="card p-4 mb-3">
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
            value={value?.[field] || ""}
            onChange={(v) => onChange({ ...value, [field]: v })}
          />
        ))}
      </div>
    </section>
  );
}
function Materials({
  value,
  onChange,
  catalogs,
  unitId,
  prefix = "Resíduo",
  showPev = true,
}) {
  const setMaterial = (index, changes) =>
    onChange(value.map((m, i) => (i === index ? { ...m, ...changes } : m)));
  return (
    <section className="card p-4 mb-3">
      <h2>{prefix === "Resíduo" ? "Resíduos do documento" : prefix}</h2>
      <p className="small text-muted">
        A unidade física do KATUÁ e a unidade oficial selecionada devem
        representar a mesma medida. Não há conversão automática.
      </p>
      {value.map((material, index) => (
        <fieldset className="env-row" key={index}>
          <legend className="h6">
            {prefix} {index + 1}
          </legend>
          <div className="env-grid">
            <Field
              label={`${prefix} ${index + 1} — Descrição`}
              value={material.name}
              onChange={(name) => setMaterial(index, { name })}
            />
            <Field
              label={`${prefix} ${index + 1} — Quantidade`}
              type="number"
              value={material.quantity}
              onChange={(quantity) => setMaterial(index, { quantity })}
            />
            <Field
              label={`${prefix} ${index + 1} — Unidade do KATUÁ`}
              options={choices(UNITS)}
              value={material.unit}
              onChange={(unit) =>
                setMaterial(index, { unit, officialMeasureCode: "" })
              }
            />
            {Object.entries({
              ibamaCode: ["Código IBAMA", "residues"],
              officialMeasureCode: ["Unidade oficial de medida", "units"],
              classificationCode: ["Código da classificação", "classes"],
              physicalStateCode: ["Código do estado físico", "physicalStates"],
              packagingCode: ["Código do acondicionamento", "packaging"],
              treatmentCode: ["Código do tratamento", "treatments"],
            }).map(([key, [label, catalog]]) => (
              <SinirCatalogField
                key={key}
                label={`${prefix} ${index + 1} — ${label}`}
                catalog={catalog}
                catalogs={catalogs}
                unitId={unitId}
                filter={
                  key === "classificationCode"
                    ? material.ibamaCode
                    : key === "packagingCode"
                      ? material.physicalStateCode
                      : undefined
                }
                value={material[key] || ""}
                onChange={(v) =>
                  setMaterial(index, {
                    [key]: v,
                    ...(key === "ibamaCode" ? { classificationCode: "" } : {}),
                    ...(key === "physicalStateCode"
                      ? { packagingCode: "" }
                      : {}),
                  })
                }
              />
            ))}
          </div>
          {showPev && (
            <details className="mt-3">
              <summary>Origem em PEV — dados para conferência</summary>
              <p className="small text-muted">
                Preencha quando a modalidade permitir identificar o PEV.
                Coordenadas do mapa não são enviadas por estes campos.
              </p>
              <div className="env-grid">
                {Object.entries({
                  identification: "Identificação do PEV",
                  postalCode: "CEP do PEV",
                  street: "Logradouro do PEV",
                  number: "Número do PEV",
                  complement: "Complemento do PEV",
                  neighborhood: "Bairro do PEV",
                  municipalityCode: "Código IBGE do PEV",
                  state: "UF do PEV",
                }).map(([key, label]) => (
                  <Field
                    key={key}
                    label={`${prefix} ${index + 1} — ${label}`}
                    value={material.pev?.[key] || ""}
                    onChange={(v) =>
                      setMaterial(index, {
                        pev: {
                          ...emptyMaterial().pev,
                          ...material.pev,
                          [key]: v,
                        },
                      })
                    }
                  />
                ))}
              </div>
            </details>
          )}
          <button
            className="btn btn-outline-danger btn-sm mt-3"
            type="button"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            Remover {prefix.toLowerCase()} {index + 1}
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="btn btn-outline-success btn-sm"
        disabled={value.length >= 50}
        onClick={() => onChange([...value, emptyMaterial()])}
      >
        Adicionar resíduo
      </button>
    </section>
  );
}
export function ManifestForm({ value, onChange, family, catalogs, unitId }) {
  const set = (key, v) => onChange({ ...value, [key]: v });
  const process = family === "MTR_LR_PROCESS";
  return (
    <>
      {Object.entries({
        origin: "Origem",
        carrier: "Transportador",
        recipient: "Destinatário",
      }).map(([key, label]) => (
        <PartyFields
          key={key}
          label={label}
          value={value[key]}
          onChange={(v) => set(key, v)}
        />
      ))}
      {!process && (
        <section className="card p-4 mb-3">
          <h2>Armazenamento temporário</h2>
          <label className="d-flex gap-2">
            <input
              type="checkbox"
              checked={value.hasTemporaryStorage || false}
              onChange={(e) => set("hasTemporaryStorage", e.target.checked)}
            />
            Existe armazenador temporário nesta operação
          </label>
        </section>
      )}
      {!process && value.hasTemporaryStorage && (
        <PartyFields
          label="Armazenador temporário"
          value={value.temporaryStorage}
          onChange={(v) => set("temporaryStorage", v)}
        />
      )}
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
          {family !== "MTR_REGULAR" && (
            <SinirCatalogField
              label="Sistema de logística reversa"
              catalog="reverseSystems"
              catalogs={catalogs}
              unitId={unitId}
              value={value.reverseSystemCode || ""}
              onChange={(v) => set("reverseSystemCode", v)}
            />
          )}
        </div>
        <p className="small text-muted mt-3 mb-0">
          Prepare o manifesto antes do transporte. Os dados importados exigem
          conferência.
        </p>
      </section>
      {process ? (
        <>
          <section className="card p-4 mb-3">
            <h2>Grupos de resíduos do processo</h2>
            <p>
              Relacione cada grupo ao manifesto de origem e à referência oficial
              do resíduo. Não associe materiais por aproximação do nome.
            </p>
            {!!value.materials?.length && (
              <div className="alert alert-warning">
                Este rascunho contém materiais anteriores ao agrupamento. Eles
                continuam preservados abaixo; organize-os nos grupos antes da
                revisão.
                <details>
                  <summary>Consultar materiais preservados</summary>
                  <pre className="text-wrap">
                    {JSON.stringify(value.materials, null, 2)}
                  </pre>
                </details>
              </div>
            )}
            {(value.processGroups || []).map((group, index) => (
              <section className="env-row" key={index}>
                <h3>Grupo {index + 1}</h3>
                <div className="env-grid">
                  <Field
                    label={`Grupo ${index + 1} — Manifesto de origem`}
                    value={group.originManifestNumber}
                    onChange={(v) =>
                      set(
                        "processGroups",
                        value.processGroups.map((g, i) =>
                          i === index ? { ...g, originManifestNumber: v } : g,
                        ),
                      )
                    }
                  />
                  <Field
                    label={`Grupo ${index + 1} — Referência do resíduo`}
                    value={group.residueReference}
                    onChange={(v) =>
                      set(
                        "processGroups",
                        value.processGroups.map((g, i) =>
                          i === index ? { ...g, residueReference: v } : g,
                        ),
                      )
                    }
                  />
                </div>
                <Materials
                  prefix={`Grupo ${index + 1}, resíduo`}
                  showPev={false}
                  catalogs={catalogs}
                  unitId={unitId}
                  value={group.materials}
                  onChange={(v) =>
                    set(
                      "processGroups",
                      value.processGroups.map((g, i) =>
                        i === index ? { ...g, materials: v } : g,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() =>
                    set(
                      "processGroups",
                      value.processGroups.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remover grupo {index + 1}
                </button>
              </section>
            ))}
            <button
              type="button"
              className="btn btn-outline-success"
              disabled={(value.processGroups || []).length >= 50}
              onClick={() =>
                set("processGroups", [
                  ...(value.processGroups || []),
                  {
                    originManifestNumber: "",
                    residueReference: "",
                    materials: [],
                  },
                ])
              }
            >
              Adicionar grupo de origem
            </button>
          </section>
        </>
      ) : (
        <Materials
          value={value.materials}
          onChange={(v) => set("materials", v)}
          catalogs={catalogs}
          unitId={unitId}
        />
      )}
      <section className="card p-4 mb-3">
        <h2>Referências e observações</h2>
        <div className="env-grid">
          <Field
            label="Números oficiais dos MTRs LR de origem (referência interna, um por linha)"
            type="textarea"
            value={value.originManifestNumbers.join("\n")}
            onChange={(v) => set("originManifestNumbers", v.split("\n"))}
          />
          <Field
            label="Número da nota fiscal (referência interna)"
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
          Informar referência ou chave não emite NF-e. A chave é projetada no
          modelo de MTR LR Processo quando preenchida.
        </p>
      </section>
    </>
  );
}
export function CdfForm({ value, onChange }) {
  return (
    <>
      <section className="card p-4 mb-3">
        <h2>Preparação do CDF</h2>
        <p>
          O modelo técnico associa manifestos recebidos e geradores ao
          destinador. A autorização e a situação dos manifestos precisam ser
          confirmadas pelo SINIR.
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
                  : [
                        "manifestNumbers",
                        "treatmentDescription",
                        "notes",
                      ].includes(key)
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
        <p className="small text-muted mt-3">
          Registro profissional e descrição do tratamento são controles
          internos, sem equivalência presumida a campos do SINIR.
        </p>
      </section>
      {(value.generators || []).map((g, i) => (
        <div key={i}>
          <PartyFields
            label={`Gerador do CDF ${i + 1}`}
            value={g}
            onChange={(v) =>
              onChange({
                ...value,
                generators: value.generators.map((r, j) => (j === i ? v : r)),
              })
            }
          />
          <button
            type="button"
            className="btn btn-outline-danger btn-sm mb-3"
            onClick={() =>
              onChange({
                ...value,
                generators: value.generators.filter((_, j) => i !== j),
              })
            }
          >
            Remover gerador {i + 1}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-outline-success mb-3"
        disabled={(value.generators || []).length >= 50}
        onClick={() =>
          onChange({
            ...value,
            generators: [...(value.generators || []), emptyParty()],
          })
        }
      >
        Adicionar gerador ao CDF
      </button>
    </>
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
