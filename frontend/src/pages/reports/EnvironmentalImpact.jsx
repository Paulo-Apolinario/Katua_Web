import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiRequest } from "../../services/apiClient";
import { reportService } from "../../services/reportService";
import { ManagementHeader } from "../../components/management/ManagementWorkspace";
import HeadTags from "../../components/HeadTags";
import ReportSettings from "../../components/reports/ReportSettings";
import MaterialProfileForm from "../../components/waste-workspace/MaterialProfileForm";
import {
  MATERIAL_OPTIONS,
  materialName,
} from "../../utils/materialIdentification";
import {
  periodFor,
  todayFortaleza,
  formatQuantity as num,
  formatUnits,
  formatEstimate,
} from "../../utils/impactAnalysis";
import { exportImpact } from "../../utils/exportImpact";
import "./environmentalImpact.css";
const metrics = [
  ["Potencial estimado de CO₂e", "co2Kg", "kg CO₂e"],
  ["Água estimada", "waterLiters", "L"],
  ["Energia estimada", "energyKwh", "kWh"],
  ["Árvores equivalentes", "treesEquivalent", ""],
];
const basis = {
  CONFIRMED: "Identificação conferida na coleta",
  DECLARED_SNAPSHOT: "Identificação declarada na coleta",
  CURRENT_CATALOG: "Vínculo atual do catálogo (histórico não confirmado)",
};
const initial = {
  mode: "month",
  reference: todayFortaleza(),
  ...periodFor("month", todayFortaleza()),
  generatorId: "",
  materialId: "",
  materialCode: "",
  stage: "ALL",
};
export default function EnvironmentalImpact() {
  const [draft, setDraft] = useState(initial),
    [filters, setFilters] = useState(initial),
    [context, setContext] = useState(null),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [refresh, setRefresh] = useState(0),
    [tab, setTab] = useState("materials"),
    [settings, setSettings] = useState(false),
    [review, setReview] = useState(null),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    reportService
      .context()
      .then((c) => {
        if (active) setContext(c);
      })
      .catch((e) => {
        if (active) setError(e.error || e.message);
      });
    return () => {
      active = false;
    };
  }, [refresh]);
  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    setBusy(true);
    setData(null);
    setError("");
    const q = Object.fromEntries(
      Object.entries(filters).filter(
        ([k, v]) => !["mode", "reference"].includes(k) && v !== "",
      ),
    );
    apiRequest("/environmental-impact?" + new URLSearchParams(q), {
      signal: abort.signal,
    })
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch((e) => {
        if (active)
          setError(
            e.error || e.message || "Não foi possível consultar o impacto.",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      abort.abort();
    };
  }, [filters, refresh]);
  const set = (key, value) => setDraft((f) => ({ ...f, [key]: value }));
  async function confirm(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest(
        `/environmental-impact/materials/${encodeURIComponent(review.collectionMaterialId)}/identification`,
        {
          method: "PUT",
          body: {
            operationId: review.operationId,
            expectedUpdatedAt: review.updatedAt,
            profile: review.profile,
          },
        },
      );
      setReview(null);
      setRefresh((v) => v + 1);
    } catch (e) {
      setError(e.error || e.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="impact-workspace">
      <HeadTags title="Impacto ambiental" />
      <ManagementHeader
        title="Impacto ambiental"
        description="Consulte as quantidades, a composição dos materiais e as estimativas com metodologia documentada."
        actions={
          <div className="d-flex gap-2 flex-wrap">
            <Link className="btn btn-outline-success" to="/waste-type-list">
              Catálogo de materiais
            </Link>
            <button
              className="btn btn-outline-success"
              disabled={!context}
              onClick={() => setSettings((v) => !v)}
            >
              Metodologia
            </button>
          </div>
        }
      />
      {settings && context && (
        <ReportSettings
          context={context}
          onSaved={async () => setRefresh((v) => v + 1)}
          onClose={() => setSettings(false)}
        />
      )}
      <form
        className="card p-4 mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters({
            ...draft,
            ...(draft.mode !== "custom"
              ? periodFor(draft.mode, draft.reference)
              : {}),
          });
        }}
      >
        <div className="row g-3">
          <label className="col-sm-6 col-lg-3">
            Período
            <select
              className="form-select"
              aria-label="Período" value={draft.mode}
              onChange={(e) => set("mode", e.target.value)}
            >
              <option value="week">Semana (segunda a domingo)</option>
              <option value="month">Mês</option>
              <option value="year">Ano</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>
          {draft.mode !== "custom" ? (
            <label className="col-sm-6 col-lg-3">
              Data de referência
              <input
                className="form-control"
                type="date"
                required
                aria-label="Data de referência" value={draft.reference}
                onChange={(e) => set("reference", e.target.value)}
              />
            </label>
          ) : (
            <>
              <label className="col-sm-6 col-lg-3">
                De
                <input
                  className="form-control"
                  type="date"
                  required
                  aria-label="De" value={draft.start}
                  onChange={(e) => set("start", e.target.value)}
                />
              </label>
              <label className="col-sm-6 col-lg-3">
                Até
                <input
                  className="form-control"
                  type="date"
                  required
                  min={draft.start}
                  aria-label="Até" value={draft.end}
                  onChange={(e) => set("end", e.target.value)}
                />
              </label>
            </>
          )}
          <label className="col-sm-6 col-lg-3">
            Gerador
            <select
              className="form-select"
              aria-label="Gerador" value={draft.generatorId}
              onChange={(e) => set("generatorId", e.target.value)}
            >
              <option value="">Geral · todas as origens</option>
              {context?.generators?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.companyName || g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="col-sm-6 col-lg-3">
            Material padronizado
            <select
              className="form-select"
              aria-label="Material padronizado" value={draft.materialCode}
              onChange={(e) => set("materialCode", e.target.value)}
            >
              <option value="">Todos os materiais</option>
              {MATERIAL_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="col-sm-6 col-lg-6">
            Item comercial do catálogo
            <select
              className="form-select"
              aria-label="Item comercial do catálogo" value={draft.materialId}
              onChange={(e) => set("materialId", e.target.value)}
            >
              <option value="">Todos os itens</option>
              {context?.materials?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="col-sm-6 col-lg-3">
            Conferência de quantidade
            <select
              className="form-select"
              aria-label="Conferência de quantidade" value={draft.stage}
              onChange={(e) => set("stage", e.target.value)}
            >
              <option value="ALL">Todas</option>
              <option value="CONFIRMED">Conferidas pela cooperativa</option>
              <option value="PROVISIONAL">Ainda não conferidas</option>
            </select>
          </label>
          <div className="col-lg-3 align-self-end d-flex gap-2">
            <button disabled={busy} className="btn btn-success">
              {busy ? "Consultando…" : "Aplicar filtros"}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={busy}
              onClick={() => {
                setDraft(initial);
                setFilters(initial);
              }}
            >
              Limpar
            </button>
          </div>
        </div>
      </form>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {busy && <p role="status">Consultando os registros da cooperativa…</p>}
      {data && (
        <>
          <div className="d-flex justify-content-between gap-3 flex-wrap mb-3">
            <div>
              <strong>
                {data.start} a {data.end}
              </strong>
              <p className="small text-muted mb-0">{data.basis}</p>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-success"
                onClick={() =>
                  exportImpact("pdf", data, filters).catch((e) =>
                    setError(e.message),
                  )
                }
              >
                Baixar PDF
              </button>
              <button
                className="btn btn-outline-success"
                onClick={() =>
                  exportImpact("xlsx", data, filters).catch((e) =>
                    setError(e.message),
                  )
                }
              >
                Baixar planilha
              </button>
            </div>
          </div>
          <div className="row g-3 mb-4">
            {[
              ["Material registrado", formatUnits(data.units)],
              ["Massa conferida", `${num(data.confirmedMassKg)} kg`],
              [
                "Massa ainda não conferida",
                `${num(data.provisionalMassKg)} kg`,
              ],
              ["Coletas no período", data.collections],
            ].map(([label, value]) => (
              <div className="col-sm-6 col-xl-3" key={label}>
                <div className="card p-4 h-100">
                  <span className="text-muted">{label}</span>
                  <strong className="fs-20 mt-2">{value}</strong>
                </div>
              </div>
            ))}
          </div>
          <section className="card p-4 mb-4">
            <h2 className="fs-18">Estimativas ambientais</h2>
            <p className="small text-muted">
              Potencial calculado sobre massa e identificação conferidas, dentro
              da aplicação da metodologia. Não comprova reciclagem ou crédito de
              carbono.
            </p>
            <div className="row g-3">
              {metrics
                .filter(
                  ([, key]) => key !== "treesEquivalent" || data[key] != null,
                )
                .map(([label, key, unit]) => (
                  <div className={`col-sm-6 ${data.treesEquivalent == null ? "col-xl-4" : "col-xl-3"}`} key={key}>
                    <div className="impact-metric">
                      <span>{label}</span>
                      <strong>{formatEstimate(data[key], unit)}</strong>
                      <small>
                        {num(data.metricCoverage[key])} kg abrangidos de{" "}
                        {num(data.totalMassKg)} kg registrados
                      </small>
                    </div>
                  </div>
                ))}
            </div>
            <p className="small mt-3 mb-0">
              Litros, unidades e m³ permanecem nas quantidades físicas e estão
              fora dos fatores por kg. Um resultado sem fator aparece como “Sem
              estimativa”.
            </p>
          </section>
          <div
            className="impact-tabs mb-3"
            role="tablist"
            aria-label="Detalhamento ambiental"
          >
            {[
              ["materials", "Por material"],
              ["generators", "Por gerador"],
              ["monthly", "Evolução mensal"],
              ["flows", "Estoque e destinações"],
              ["trace", "Rastreabilidade"],
              ["quality", "Qualidade e metodologia"],
            ].map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                className={`btn ${tab === key ? "btn-success" : "btn-outline-secondary"}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <section
            className="card p-4"
            aria-label="Detalhamento dos resultados"
          >
            {["materials", "generators", "monthly"].includes(tab) && (
              <>
                <h2 className="fs-18">
                  {tab === "materials"
                    ? "Composição e itens comerciais"
                    : tab === "generators"
                      ? "Origens dos materiais"
                      : "Evolução das quantidades e estimativas"}
                </h2>
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>
                          {tab === "materials"
                            ? "Item / composição"
                            : tab === "generators"
                              ? "Origem"
                              : "Mês"}
                        </th>
                        <th>Quantidade registrada</th>
                        <th>Massa conferida</th>
                        <th>CO₂e estimado</th>
                        <th>Abrangência do CO₂e</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data[tab]?.map((row) => (
                        <tr key={row.id || row.month}>
                          <td>
                            <strong>{row.name || row.month}</strong>
                            {tab === "materials" && (
                              <>
                                <small className="d-block">
                                  {materialName(row.materialCode)}
                                </small>
                                <small className="d-block text-muted">
                                  {basis[row.identificationBasis]}
                                </small>
                              </>
                            )}
                          </td>
                          <td>{formatUnits(row.units)}</td>
                          <td>{row.units.KG != null ? `${num(row.confirmedMassKg)} kg` : "Unidade não mássica"}</td>
                          <td>{formatEstimate(row.co2Kg, "kg CO₂e")}</td>
                          <td>
                            {num(row.metricCoverage.co2Kg)} de{" "}
                            {num(row.totalMassKg)} kg
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!data[tab]?.length && (
                    <p>Nenhum registro para os filtros selecionados.</p>
                  )}
                </div>
              </>
            )}
            {tab === "flows" && (
              <>
                <h2 className="fs-18">Estoque e destinações</h2>
                <p className="small text-muted">{data.flows.dateBasis}</p>
                <div className="row g-3 mb-4">
                  {[
                    [
                      "Saídas para destinatários no período",
                      data.flows.dispatched,
                    ],
                    [
                      "Rejeitos / descartes registrados no período",
                      data.flows.rejected,
                    ],
                    [
                      "Saldo atual em estoque (inclui reservas)",
                      data.flows.currentStock,
                    ],
                  ].map(([label, units]) => (
                    <div className="col-md-4" key={label}>
                      <div className="impact-metric">
                        <span>{label}</span>
                        <strong>{formatUnits(units)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="small text-muted">
                  {data.flows.stockBasis} Os totais de coleta e saída descrevem
                  etapas do mesmo material e não são somados como novos
                  benefícios.
                </p>
                <div className="d-flex gap-2 mb-3">
                  <Link
                    className="btn btn-outline-success"
                    to="/service-orders"
                  >
                    Documentos consolidados
                  </Link>
                  <Link className="btn btn-outline-success" to="/waste-stock">
                    Estoque e lotes
                  </Link>
                </div>
                <p className="small text-muted">
                  {data.flows.trace.length} saídas recentes de{" "}
                  {data.flows.total} registros no período.
                </p>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Data / origem</th>
                        <th>Lote / registro</th>
                        <th>Quantidade</th>
                        <th>Destinatário / evidência informada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.flows.trace.map((r) => (
                        <tr key={r.id}>
                          <td>
                            {new Date(r.date).toLocaleString("pt-BR", {
                              timeZone: "America/Fortaleza",
                            })}
                            <small className="d-block">{r.origin}</small>
                          </td>
                          <td>
                            {r.lotCode || "Saída direta da coleta"}
                            <small className="d-block text-muted">{r.id}</small>
                          </td>
                          <td>{formatUnits({ [r.unit]: r.quantity })}</td>
                          <td>
                            {r.destination || "Não informado"}
                            <small className="d-block text-muted">
                              {r.document ||
                                "Sem documento ambiental informado"}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!data.flows.total && (
                    <p>Nenhuma saída registrada para estes filtros.</p>
                  )}
                </div>
              </>
            )}
            {tab === "trace" && (
              <>
                <h2 className="fs-18">Coletas e identificação dos materiais</h2>
                <p className="small text-muted">
                  Mostrando as {data.trace.length} coletas mais recentes de{" "}
                  {data.traceTotal}. Refine o período ou consulte o histórico
                  completo. Conferência da composição e conferência do peso são
                  registros distintos.
                </p>
                <Link
                  to="/waste-collection-reports"
                  className="btn btn-outline-success mb-3"
                >
                  Histórico completo e destinações
                </Link>
                {data.trace.map((c) => (
                  <details className="impact-trace" key={c.id}>
                    <summary>
                      {new Date(c.date).toLocaleDateString("pt-BR", {
                        timeZone: "America/Fortaleza",
                      })}{" "}
                      · {c.origin} ·{" "}
                      {c.confirmed
                        ? "Quantidade conferida"
                        : "Quantidade provisória"}
                    </summary>
                    <small className="d-block text-muted">Coleta: {c.id}</small>
                    {c.materials.map((m, i) => (
                      <div
                        className="d-flex align-items-center justify-content-between gap-3 flex-wrap py-2 border-bottom"
                        key={i}
                      >
                        <div>
                          <strong>{m.name}</strong>
                          <div>
                            {formatUnits({ [m.unit]: m.quantity })} ·{" "}
                            {materialName(m.materialCode)}
                          </div>
                          <small>{basis[m.identificationBasis]}</small>
                        </div>
                        {m.updatedAt && (
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => {
                              setError("");
                              setReview({
                                ...m,
                                operationId: crypto.randomUUID(),
                              });
                            }}
                          >
                            Conferir identificação
                          </button>
                        )}
                      </div>
                    ))}
                  </details>
                ))}
              </>
            )}
            {tab === "quality" && (
              <>
                <h2 className="fs-18">Qualidade dos dados e metodologia</h2>
                <dl>
                  <dt>Composição ainda não identificada</dt>
                  <dd>{formatUnits(data.unknownUnits)}</dd>
                  <dt>
                    Identificação baseada no catálogo atual, sem registro
                    histórico
                  </dt>
                  <dd>{formatUnits(data.currentMappingUnits)}</dd>
                  <dt>Coletas com data substituta no histórico</dt>
                  <dd>{data.legacyDateCollections}</dd>
                  <dt>Metodologia</dt>
                  <dd>
                    {data.methodology.label || "Não cadastrada"} · versão{" "}
                    {data.methodology.version || "não informada"}
                  </dd>
                  <dt>Fonte</dt>
                  <dd>{data.methodology.source || "Não informada"}</dd>
                  <dt>Cenário / região</dt>
                  <dd>
                    {data.methodology.processScenario || "Não informado"} ·{" "}
                    {data.methodology.region || "Não informada"}
                  </dd>
                  <dt>Responsável informado pela cooperativa</dt>
                  <dd>{data.methodology.approvedBy || "Não informado"}</dd>
                  <dt>Aplicação</dt>
                  <dd>
                    {data.methodology.validFrom || "Não informada"} a{" "}
                    {data.methodology.validUntil || "sem término informado"}
                  </dd>
                  <dt>Validação declarada</dt>
                  <dd>
                    {data.methodology.approved
                      ? "Declarada pela cooperativa; não constitui certificação do KATUÁ"
                      : "Pendente"}
                  </dd>
                </dl>
                <p className="small text-muted">{data.description}</p>
                <p className="small text-muted">
                  A ABNT NBR 10004 trata da classificação quanto à
                  periculosidade; ela não fornece os fatores de benefícios
                  ambientais. Alterações e novas conferências podem revisar
                  estimativas futuras; os arquivos exportados identificam a
                  versão usada.
                </p>
              </>
            )}
          </section>
        </>
      )}
      {review && (
        <div
          className="impact-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Conferência da identificação"
        >
          <form className="card p-4" onSubmit={confirm}>
            <h2 className="fs-20">Conferir identificação · {review.name}</h2>
            <p>
              Registre a identificação específica deste material na coleta. A
              declaração original será preservada.
            </p>
            <fieldset disabled={saving}>
              <MaterialProfileForm
                value={review.profile}
                onChange={(profile) => setReview((r) => ({ ...r, profile }))}
              />
            </fieldset>
            {error && (
              <p role="alert" className="alert alert-danger">
                {error}
              </p>
            )}
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={saving}
                onClick={() => setReview(null)}
              >
                Cancelar
              </button>
              <button className="btn btn-success" disabled={saving}>
                {saving ? "Salvando…" : "Salvar conferência"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
