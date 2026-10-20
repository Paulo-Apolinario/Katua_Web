import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { environmentalService as api } from "../../services/environmentalService";
import { ManagementHeader } from "../management/ManagementWorkspace";
import HeadTags from "../HeadTags";
import { Field, Message, Pagination } from "./EnvironmentalFields";
import { FAMILIES, STATUS } from "./environmentalModel";
import UnitForm from "./UnitForm";
import DocumentEditor from "./DocumentEditor";
import "./environmental.css";
const TABS = {
  overview: "Visão geral",
  documents: "MTR e CDF",
  reverse: "Logística reversa",
  municipal: "SINIR Municípios",
  settings: "Unidades e integração",
};
export default function EnvironmentalCentral() {
  const { admin } = useAdminAuth();
  return admin?.id ? <Central key={admin.id} /> : null;
}
function Central() {
  const [params, setParams] = useSearchParams();
  const [context, setContext] = useState(null),
    [units, setUnits] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0),
    [listReload, setListReload] = useState(0),
    [editor, setEditor] = useState(null),
    [dirty, setDirty] = useState(false),
    [unitEditing, setUnitEditing] = useState(false),
    [creatingUnit, setCreatingUnit] = useState(false),
    [creatingFamily, setCreatingFamily] = useState("MTR_REGULAR");
  const tab = Object.hasOwn(TABS, params.get("tab"))
    ? params.get("tab")
    : "overview";
  const municipality =
    params.get("municipality") || context?.municipalities[0]?.code || "";
  const localUnits = units.filter((u) => u.municipalityCode === municipality);
  const unit =
    localUnits.find((u) => u.id === params.get("unit")) ||
    localUnits[0] ||
    null;
  function change(values) {
    if (dirty && !window.confirm("Descartar as alterações não salvas?")) return;
    setEditor(null);
    setDirty(false);
    setUnitEditing(false);
    setCreatingUnit(false);
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    setParams(next);
  }
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");
    setContext(null);
    setUnits([]);
    Promise.all([api.context(), api.units()])
      .then(([c, u]) => {
        if (ignore) return;
        setContext(c);
        setUnits(u);
      })
      .catch((e) => {
        if (!ignore) setError(e);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [reload]);
  const close = () => {
    if (dirty && !window.confirm("Descartar as alterações não salvas?")) return;
    setEditor(null);
    setDirty(false);
  };
  const canCreateUnit =
    context?.role === "COOPERATIVE" ||
    context?.grants.some(
      (g) => g.municipalityCode === municipality && g.permission !== "VIEWER",
    );
  const title = editor
    ? "Preparar documento ambiental"
    : "Central ambiental e SINIR";
  return (
    <div className="environmental-workspace">
      <HeadTags title="Central ambiental e SINIR | KATUÁ" />
      <ManagementHeader
        hideNavigation
        eyebrow="Central ambiental e SINIR"
        title={title}
        description="Prepare documentos, revise informações e acompanhe a habilitação da integração oficial, dentro do KATUÁ."
      />
      {loading ? (
        <div className="card p-4" role="status">
          Consultando seu acesso e as unidades...
        </div>
      ) : error ? (
        <>
          <Message error={error} />
          <button
            className="btn btn-outline-danger"
            onClick={() => setReload((r) => r + 1)}
          >
            Tentar novamente
          </button>
        </>
      ) : (
        <>
          <section className="card p-4 mb-4">
            <div className="env-grid">
              <Field
                label="Município de trabalho"
                value={municipality}
                options={context.municipalities.map((m) => ({
                  value: m.code,
                  label:
                    m.name + " / " + m.state + (m.pilot ? " · piloto" : ""),
                }))}
                onChange={(v) => change({ municipality: v, unit: "" })}
              />
              <Field
                label="Organização/unidade"
                value={unit?.id || ""}
                options={
                  localUnits.length
                    ? localUnits.map((u) => ({
                        value: u.id,
                        label:
                          u.name + (u.permissions.write ? "" : " · consulta"),
                      }))
                    : [
                        {
                          value: "",
                          label: "Nenhuma unidade cadastrada neste município",
                        },
                      ]
                }
                onChange={(v) => change({ unit: v })}
              />
            </div>
            <p className="small text-muted mt-3 mb-0">
              {unit
                ? `${unit.kind === "MUNICIPAL_AUTHORITY" ? "Preparação municipal autorizada" : "Dados da operação da organização"} · ${unit.environment === "HOMOLOGATION" ? "Ambiente pretendido: homologação" : "Ambiente pretendido: produção"} · unidade versão ${unit.version}`
                : "Selecione o município e cadastre uma unidade para iniciar."}
            </p>
          </section>
          {!context.municipalities.length && (
            <div className="alert alert-warning">
              Nenhum município foi autorizado para sua conta. A designação é
              feita por um administrador do KATUÁ.
            </div>
          )}
          <nav
            className="env-tabs d-flex flex-wrap gap-2 mb-4"
            aria-label="Áreas da central ambiental"
          >
            {Object.entries(TABS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={tab === key}
                className={`btn ${tab === key ? "btn-success" : "btn-outline-secondary"}`}
                onClick={() => change({ tab: key })}
              >
                {label}
              </button>
            ))}
          </nav>
          {editor && unit ? (
            <DocumentEditor
              key={editor.id || `${unit.id}-${editor.family}`}
              {...editor}
              unit={unit}
              onClose={close}
              onDirty={setDirty}
              onSaved={() => setListReload((n) => n + 1)}
            />
          ) : (
            <>
              {tab === "overview" && (
                <>
                  <div className="env-notice mb-4">
                    <strong>Integração oficial aguardando habilitação</strong>
                    <p className="mb-0">{context.integration.reason}</p>
                  </div>
                  <div className="row g-3 mb-4">
                    {[
                      [
                        "Organização e unidade",
                        "Identificação, município e perfis para conferência.",
                        "settings",
                      ],
                      [
                        "Documentos de movimentação",
                        "Rascunhos de MTR, logística reversa e CDF com evidências.",
                        "documents",
                      ],
                      [
                        "Informações municipais",
                        "Preparação com fontes, abrangência e revisão.",
                        "municipal",
                      ],
                    ].map(([heading, text, target]) => (
                      <div className="col-lg-4" key={target}>
                        <article className="card p-4 h-100">
                          <h2>{heading}</h2>
                          <p className="text-muted">{text}</p>
                          <button
                            className="btn btn-outline-success mt-auto"
                            onClick={() => change({ tab: target })}
                          >
                            Abrir {TABS[target]}
                          </button>
                        </article>
                      </div>
                    ))}
                  </div>
                  <section className="card p-4">
                    <h2>Rastreabilidade e alcance dos dados</h2>
                    <p>
                      As operações de uma cooperativa representam a cobertura
                      acompanhada pelo KATUÁ. Elas não são o total de resíduos
                      do município. Rascunhos e revisão interna não equivalem a
                      documentos oficiais.
                    </p>
                    <p className="mb-0">
                      MTR acompanha movimentação; CDF trata da destinação. A
                      comercialização e a emissão fiscal exigem integração
                      específica. Capacidade de armazenamento, estoque e
                      material coletado são medidas distintas.
                    </p>
                  </section>
                </>
              )}
              {["documents", "reverse", "municipal"].includes(tab) &&
                (!unit ? (
                  <div className="card p-4">
                    <h2>Cadastre uma unidade para começar</h2>
                    <p>
                      Os documentos ficam vinculados à organização e ao
                      município selecionados.
                    </p>
                    <button
                      className="btn btn-success"
                      disabled={!canCreateUnit}
                      onClick={() => {
                        change({ tab: "settings" });
                        setCreatingUnit(true);
                      }}
                    >
                      Cadastrar unidade
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="d-flex justify-content-between align-items-end gap-3 flex-wrap mb-3">
                      <div>
                        <h2>{TABS[tab]}</h2>
                        <p className="text-muted mb-0">
                          Lista de preparação da unidade selecionada. Situações
                          abaixo são internas ao KATUÁ.
                        </p>
                      </div>
                      {unit.permissions.write && (
                        <div className="d-flex align-items-end gap-2 flex-wrap">
                          <Field
                            label="Tipo de novo documento"
                            value={
                              tab === "municipal"
                                ? "MUNICIPAL_DECLARATION"
                                : Object.keys(FAMILIES)
                                      .filter((k) =>
                                        tab === "reverse"
                                          ? k.startsWith("MTR_LR")
                                          : ["MTR_REGULAR", "CDF"].includes(k),
                                      )
                                      .includes(creatingFamily)
                                  ? creatingFamily
                                  : tab === "reverse"
                                    ? "MTR_LR_ORIGIN"
                                    : "MTR_REGULAR"
                            }
                            options={Object.entries(FAMILIES)
                              .filter(([k]) =>
                                tab === "municipal"
                                  ? k === "MUNICIPAL_DECLARATION"
                                  : tab === "reverse"
                                    ? k.startsWith("MTR_LR")
                                    : ["MTR_REGULAR", "CDF"].includes(k),
                              )
                              .map(([value, label]) => ({ value, label }))}
                            onChange={setCreatingFamily}
                          />
                          <button
                            className="btn btn-success"
                            onClick={() => {
                              const family =
                                tab === "municipal"
                                  ? "MUNICIPAL_DECLARATION"
                                  : tab === "reverse"
                                    ? creatingFamily.startsWith("MTR_LR")
                                      ? creatingFamily
                                      : "MTR_LR_ORIGIN"
                                    : ["MTR_REGULAR", "CDF"].includes(
                                          creatingFamily,
                                        )
                                      ? creatingFamily
                                      : "MTR_REGULAR";
                              setEditor({ family });
                            }}
                          >
                            Novo rascunho
                          </button>
                        </div>
                      )}
                    </div>
                    <DocumentList
                      key={unit.id + "-" + tab}
                      unit={unit}
                      tab={tab}
                      reload={listReload}
                      initialFamily={creatingFamily}
                      onOpen={(d) => {
                        setCreatingFamily(d.family);
                        setEditor({ id: d.id, family: d.family });
                      }}
                    />
                  </>
                ))}
              {tab === "settings" && (
                <>
                  {(creatingUnit || unitEditing) && canCreateUnit ? (
                    <UnitForm
                      key={creatingUnit ? "new" : unit.id + "-" + unit.version}
                      unit={creatingUnit ? null : unit}
                      municipality={municipality}
                      context={context}
                      onCancel={() => {
                        setCreatingUnit(false);
                        setUnitEditing(false);
                      }}
                      onSaved={(saved) => {
                        setCreatingUnit(false);
                        setUnitEditing(false);
                        setParams({
                          tab: "settings",
                          municipality: saved.municipalityCode,
                          unit: saved.id,
                        });
                        setReload((n) => n + 1);
                      }}
                    />
                  ) : (
                    <section className="card p-4 mb-4">
                      <div className="d-flex justify-content-between gap-3 flex-wrap">
                        <div>
                          <h2>Organizações e unidades</h2>
                          <p className="text-muted">
                            A organização selecionada determina os documentos e
                            o acesso permitido.
                          </p>
                        </div>
                        <div className="d-flex gap-2 flex-wrap">
                          {unit?.permissions.write && (
                            <button
                              className="btn btn-outline-success"
                              onClick={() => setUnitEditing(true)}
                            >
                              Editar unidade
                            </button>
                          )}
                          <button
                            className="btn btn-success"
                            disabled={!canCreateUnit}
                            onClick={() => setCreatingUnit(true)}
                          >
                            Cadastrar unidade
                          </button>
                        </div>
                      </div>
                      {unit && (
                        <dl className="env-definition">
                          <dt>Organização</dt>
                          <dd>{unit.name}</dd>
                          <dt>CNPJ</dt>
                          <dd>{unit.taxId || "Não informado"}</dd>
                          <dt>Unidade SINIR</dt>
                          <dd>{unit.officialUnitCode || "Não informada"}</dd>
                          <dt>Responsável</dt>
                          <dd>{unit.responsibleName || "Não informado"}</dd>
                          <dt>Consulta municipal</dt>
                          <dd>
                            {unit.kind === "MUNICIPAL_AUTHORITY"
                              ? "Conforme designação do gestor"
                              : unit.shareWithMunicipality
                                ? "Autorizada nesta central"
                                : "Não autorizada"}
                          </dd>
                        </dl>
                      )}
                    </section>
                  )}
                  <section className="card p-4 mt-4">
                    <h2>Integração com a API oficial</h2>
                    <div className="alert alert-warning">
                      <strong>Especificação e habilitação pendentes</strong>
                      <p className="mb-0">{context.integration.reason}</p>
                    </div>
                    <ul className="env-bullets">
                      {context.integration.requirements.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                    <p className="mb-0">
                      Os dados são preenchidos aqui. O sistema não solicita
                      senha Gov.br, não redireciona a emissão para o portal e
                      não confirma envio sem retorno oficial. A API de
                      declaração municipal precisa de confirmação específica.
                    </p>
                  </section>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
function DocumentList({ unit, tab, reload, onOpen, initialFamily }) {
  const [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [family, setFamily] = useState(initialFamily || ""),
    [state, setState] = useState({ loading: true }),
    [retry, setRetry] = useState(0);
  const possible = Object.keys(FAMILIES).filter((k) =>
    tab === "municipal"
      ? k === "MUNICIPAL_DECLARATION"
      : tab === "reverse"
        ? k.startsWith("MTR_LR")
        : ["MTR_REGULAR", "CDF"].includes(k),
  );
  // Cada consulta usa um tipo explícito para não paginar um conjunto e filtrar outro.
  const selected = possible.includes(family) ? family : possible[0];
  useEffect(() => {
    let ignore = false;
    setState({ loading: true });
    api
      .list({ unitId: unit.id, page, family: selected, status })
      .then((data) => {
        if (!ignore) setState({ data });
      })
      .catch((error) => {
        if (!ignore) setState({ error });
      });
    return () => {
      ignore = true;
    };
  }, [unit.id, page, selected, status, reload, retry]);
  return (
    <section className="card p-4">
      <div className="env-grid mb-4">
        <Field
          label="Filtrar tipo de documento"
          value={selected}
          options={possible.map((value) => ({ value, label: FAMILIES[value] }))}
          onChange={(v) => {
            setFamily(v);
            setPage(1);
          }}
        />
        <Field
          label="Filtrar situação interna"
          value={status}
          options={[
            { value: "", label: "Todas" },
            ...Object.entries(STATUS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
      </div>
      {state.loading ? (
        <p role="status">Consultando documentos...</p>
      ) : state.error ? (
        <>
          <Message error={state.error} />
          <button
            className="btn btn-outline-danger"
            onClick={() => setRetry((n) => n + 1)}
          >
            Tentar novamente
          </button>
        </>
      ) : (
        <>
          <p className="small text-muted">
            {state.data.total} documento(s) no filtro atual.
          </p>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Referência</th>
                  <th>Etapa interna</th>
                  <th>Atualizado</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {state.data.items.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.title}</strong>
                      <div className="small">{FAMILIES[d.family]}</div>
                    </td>
                    <td>{d.referenceYear || "Por movimentação"}</td>
                    <td>
                      <span className="badge text-bg-secondary">
                        {STATUS[d.status]}
                      </span>
                    </td>
                    <td>{new Date(d.updatedAt).toLocaleString("pt-BR")}</td>
                    <td>
                      <button
                        className="btn btn-outline-success btn-sm"
                        onClick={() => onOpen(d)}
                      >
                        Abrir documento
                      </button>
                    </td>
                  </tr>
                ))}
                {!state.data.items.length && (
                  <tr>
                    <td colSpan={5}>
                      Nenhum documento encontrado para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={state.data.total} onChange={setPage} />
        </>
      )}
    </section>
  );
}
