import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";
import { reportService as api } from "../../services/reportService";
import { getStoredUser } from "../../services/apiClient";
import {
  ManagementWorkspace,
  ManagementHeader,
} from "../management/ManagementWorkspace";
import HeadTags from "../HeadTags";
import Field from "./ReportField";
import ReportMap from "./ReportMap";
import Settings from "./ReportSettings";
import {
  REPORTS,
  UNITS,
  STATUSES,
  BASES,
  STAGES,
  defaults,
  civilToday,
  num,
  unitsLabel,
  dateLabel,
  monthlyGoal,
  percentChange,
  filterSummary,
} from "./reportModel";
import { exportReport } from "./reportExport";
import "./reportsWorkspace.css";
const options = (map) =>
  Object.entries(map).map(([value, label]) => ({ value, label }));
const errorText = (e) =>
  e?.error || e?.message || "Não foi possível carregar o relatório.";
export default function ReportsWorkspace({ kind }) {
  const [params, setParams] = useSearchParams(),
    navigate = useNavigate();
  const queryKey = params.toString();
  const query = useMemo(
    () => ({
      ...defaults(kind),
      ...Object.fromEntries(new URLSearchParams(queryKey)),
    }),
    [kind, queryKey],
  );
  const [draft, setDraft] = useState(query),
    [context, setContext] = useState(null),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false),
    [detail, setDetail] = useState(null),
    [detailError, setDetailError] = useState(""),
    [detailLoading, setDetailLoading] = useState(false),
    [showSettings, setShowSettings] = useState(false),
    [chartUnit, setChartUnit] = useState("KG");
  const detailRequest = useRef(0);
  useEffect(() => setDraft(query), [query]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setData(null);
    setContext(null);
    setError("");
    detailRequest.current++;
    setDetail(null);
    setDetailLoading(false);
    setDetailError("");
    Promise.all([
      api.context(controller.signal),
      api.report(kind, query, controller.signal),
    ])
      .then(([c, d]) => {
        if (active) {
          setContext(c);
          setData(d);
        }
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [kind, query, refresh]);
  const apply = (v) => {
    setNotice("");
    setParams(
      new URLSearchParams(
        Object.entries(v).filter(([, v]) => v !== "" && v != null),
      ),
    );
  };
  const patch = (k, v) => setDraft((p) => ({ ...p, [k]: v }));
  const linkQuery = useCallback(
    (kindTarget, overrides = {}) =>
      "/" +
      REPORTS[kindTarget].path +
      "?" +
      new URLSearchParams({
        ...query,
        ...(kindTarget !== "waste" ? { stage: "COLLECTED" } : {}),
        ...overrides,
        page: "1",
      }),
    [query],
  );
  const pointInspect = useCallback(
    (p) =>
      navigate(
        linkQuery(
          "collections",
          p.kind === "PEV"
            ? { binId: p.id, origin: "PEV", generatorId: "" }
            : { generatorId: p.id, origin: "GENERATOR", binId: "" },
        ),
      ),
    [navigate, linkQuery],
  );
  const closeDetail = () => {
    detailRequest.current++;
    setDetail(null);
    setDetailError("");
    setDetailLoading(false);
  };
  const current = REPORTS[kind];
  const stock = kind === "waste" && draft.stage === "STOCK";
  const saveKey = context
    ? "katua-report-filter:" +
      getStoredUser()?.id +
      ":" +
      context.cooperative.id +
      ":" +
      kind
    : "";
  const filterOptions = (name, labelKey = "name") => [
    { value: "", label: "Todos" },
    ...(context?.[name] || []).map((v) => ({
      value: v.id,
      label: v[labelKey] || v.companyName || v.id,
    })),
  ];
  async function exportData(format) {
    setBusy(true);
    setNotice("");
    try {
      const report = await api.report(kind, {
        ...query,
        export: "true",
        page: "1",
      });
      exportReport(format, kind, report, context);
      setNotice(
        "Arquivo gerado com todos os " +
          report.meta.total +
          " registros do recorte.",
      );
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function openDetail(id) {
    const request = ++detailRequest.current;
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const d = await api.detail(id);
      if (request === detailRequest.current) setDetail(d);
    } catch (e) {
      if (request === detailRequest.current) setDetailError(errorText(e));
    } finally {
      if (request === detailRequest.current) setDetailLoading(false);
    }
  }
  const dirtyFilters = JSON.stringify(draft) !== JSON.stringify(query);
  return (
    <ManagementWorkspace>
      <div className="reports-workspace">
        <HeadTags title={current.title} />
        <ManagementHeader
          title={current.title}
          description={current.description}
          hideNavigation
          eyebrow="Relatórios e Análises"
          actions={
            <>
              <button
                className="btn btn-outline-success"
                onClick={() => setRefresh((n) => n + 1)}
                disabled={loading || busy}
              >
                Atualizar dados
              </button>
              <button
                className="btn btn-outline-success"
                onClick={() => exportData("excel")}
                disabled={!data || !data.meta.total || busy || loading}
              >
                {busy ? "Gerando arquivo..." : "Exportar Excel"}
              </button>
              <button
                className="btn btn-success"
                onClick={() => exportData("pdf")}
                disabled={!data || !data.meta.total || busy || loading}
              >
                Exportar PDF
              </button>
            </>
          }
        />
        <nav
          className="management-nav d-flex gap-2 mb-4"
          aria-label="Relatórios e Análises"
        >
          <Link className="btn btn-sm btn-outline-secondary" to="/environmental-impact">Impacto ambiental</Link>
          {Object.entries(REPORTS).map(([key, r]) => (
            <Link
              key={key}
              to={linkQuery(key)}
              aria-current={key === kind ? "page" : undefined}
              className={
                "btn btn-sm " +
                (key === kind ? "btn-success" : "btn-outline-secondary")
              }
            >
              {r.title}
            </Link>
          ))}
        </nav>
        {notice && (
          <div role="status" className="alert alert-info">
            {notice}
          </div>
        )}
        {loading ? (
          <section className="card p-4" role="status">
            Consultando registros e calculando indicadores...
          </section>
        ) : error ? (
          <section className="card p-4">
            <p className="alert alert-danger" role="alert">
              {error}
            </p>
            <button
              className="btn btn-outline-success"
              onClick={() => setRefresh((n) => n + 1)}
            >
              Tentar novamente
            </button>
          </section>
        ) : data && context ? (
          <>
            <section className="card p-4 mb-4">
              <div className="d-flex justify-content-between flex-wrap gap-2">
                <div>
                  <h2>Recorte do relatório</h2>
                  <p className="text-muted">
                    {context.cooperative.name} ·{" "}
                    {context.cooperative.city || "Município não informado"} ·
                    Atualizado em {dateLabel(data.meta.generatedAt)}
                  </p>
                </div>
                <div className="d-flex gap-2 flex-wrap align-items-start">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => apply(defaults(kind))}
                  >
                    Limpar filtros
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      try {
                        localStorage.setItem(saveKey, JSON.stringify(query));
                        setNotice(
                          "Filtros salvos neste navegador para seu usuário e cooperativa.",
                        );
                      } catch {
                        setNotice(
                          "Não foi possível salvar os filtros neste navegador.",
                        );
                      }
                    }}
                  >
                    Salvar filtros
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      try {
                        const saved = JSON.parse(
                          localStorage.getItem(saveKey) || "null",
                        );
                        if (
                          saved &&
                          typeof saved === "object" &&
                          !Array.isArray(saved)
                        ) {
                          apply(saved);
                        } else
                          setNotice("Não há filtros salvos para esta tela.");
                      } catch {
                        setNotice("Não foi possível restaurar os filtros.");
                      }
                    }}
                  >
                    Restaurar filtros
                  </button>
                </div>
              </div>
              {kind === "waste" && (
                <div
                  className="d-flex gap-2 flex-wrap mb-3"
                  role="group"
                  aria-label="Etapa do resíduo"
                >
                  {Object.entries(STAGES).map(([value, label]) => (
                    <button
                      type="button"
                      className={
                        "btn btn-sm " +
                        (query.stage === value
                          ? "btn-success"
                          : "btn-outline-secondary")
                      }
                      key={value}
                      onClick={() =>
                        apply({
                          ...query,
                          stage: value,
                          page: "1",
                          dateBasis:
                            value === "RECEIVED" ? "receivedAt" : "collectedAt",
                        })
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  apply({ ...draft, page: "1" });
                }}
              >
                <fieldset disabled={busy}>
                  <div className="d-flex gap-2 mb-3 flex-wrap">
                    {[
                      [
                        "Mês atual",
                        () => ({
                          ...draft,
                          start: civilToday().slice(0, 7) + "-01",
                          end: civilToday(),
                        }),
                      ],
                      [
                        "Últimos 30 dias",
                        () => ({
                          ...draft,
                          start: new Date(
                            Date.parse(civilToday()) - 29 * 86400000,
                          )
                            .toISOString()
                            .slice(0, 10),
                          end: civilToday(),
                        }),
                      ],
                      [
                        "Mês anterior",
                        () => {
                          const today = civilToday();
                          const end = new Date(
                            Date.UTC(
                              Number(today.slice(0, 4)),
                              Number(today.slice(5, 7)) - 1,
                              0,
                            ),
                          )
                            .toISOString()
                            .slice(0, 10);
                          return {
                            ...draft,
                            start: end.slice(0, 7) + "-01",
                            end,
                          };
                        },
                      ],
                    ].map(([label, fn]) => (
                      <button
                        key={label}
                        className="btn btn-sm btn-outline-secondary"
                        type="button"
                        disabled={stock}
                        onClick={() => setDraft(fn())}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="report-grid">
                    <Field
                      label="Data inicial"
                      type="date"
                      value={draft.start}
                      onChange={(v) => patch("start", v)}
                      disabled={stock}
                    />
                    <Field
                      label="Data final"
                      type="date"
                      value={draft.end}
                      onChange={(v) => patch("end", v)}
                      disabled={stock}
                    />
                    <Field
                      label="Data de referência"
                      options={options({
                        ...BASES,
                        destinationDate: "Destinação",
                      })}
                      value={
                        kind === "waste" && draft.stage === "DESTINED"
                          ? "destinationDate"
                          : kind === "waste" && draft.stage === "RECEIVED"
                            ? "receivedAt"
                            : draft.dateBasis
                      }
                      onChange={(v) => patch("dateBasis", v)}
                      disabled={
                        stock ||
                        (kind === "waste" &&
                          ["RECEIVED", "DESTINED"].includes(draft.stage))
                      }
                    />
                    <Field
                      label="Buscar no relatório"
                      value={draft.search || ""}
                      onChange={(v) => patch("search", v)}
                    />
                    <Field
                      label="Rota"
                      options={filterOptions("routes")}
                      value={draft.routeId || ""}
                      onChange={(v) => patch("routeId", v)}
                    />
                    <Field
                      label="Origem"
                      options={[
                        { value: "", label: "Todas" },
                        { value: "GENERATOR", label: "Gerador" },
                        { value: "PEV", label: "PEV" },
                        { value: "UNIDENTIFIED", label: "Não identificada" },
                      ]}
                      value={draft.origin || ""}
                      onChange={(v) => patch("origin", v)}
                    />
                    <Field
                      label="PEV"
                      options={filterOptions("bins")}
                      value={draft.binId || ""}
                      onChange={(v) => patch("binId", v)}
                    />
                    <Field
                      label="Gerador"
                      options={filterOptions("generators")}
                      value={draft.generatorId || ""}
                      onChange={(v) => patch("generatorId", v)}
                    />
                    <Field
                      label="Tipo de gerador"
                      options={[
                        { value: "", label: "Todos" },
                        { value: "SMALL", label: "Pequeno gerador" },
                        { value: "LARGE", label: "Grande gerador" },
                      ]}
                      value={draft.generatorType || ""}
                      onChange={(v) => patch("generatorType", v)}
                    />
                    <Field
                      label="Município"
                      options={[
                        { value: "", label: "Todos" },
                        ...context.cities.map((v) => ({ value: v, label: v })),
                      ]}
                      value={draft.city || ""}
                      onChange={(v) => patch("city", v)}
                    />
                    <Field
                      label="Catador"
                      options={filterOptions("collectors")}
                      value={draft.collectorId || ""}
                      onChange={(v) => patch("collectorId", v)}
                    />
                    <Field
                      label="Motorista"
                      options={filterOptions("drivers")}
                      value={draft.driverId || ""}
                      onChange={(v) => patch("driverId", v)}
                    />
                    <Field
                      label="Veículo"
                      options={filterOptions("vehicles", "plate")}
                      value={draft.vehicleId || ""}
                      onChange={(v) => patch("vehicleId", v)}
                    />
                    <Field
                      label="Situação da coleta"
                      options={[
                        { value: "", label: "Todas" },
                        ...options(STATUSES),
                      ]}
                      value={draft.status || ""}
                      onChange={(v) => patch("status", v)}
                    />
                    <Field
                      label="Material"
                      options={filterOptions("materials")}
                      value={draft.materialId || ""}
                      onChange={(v) => patch("materialId", v)}
                    />
                    <Field
                      label="Unidade do material"
                      options={[
                        { value: "", label: "Todas, separadas" },
                        ...options(UNITS),
                      ]}
                      value={draft.unit || ""}
                      onChange={(v) => patch("unit", v)}
                    />
                    {kind === "staff" && (
                      <Field
                        label="Função"
                        options={[
                          {
                            value: "",
                            label: "Ambas, sem somar produtividade",
                          },
                          { value: "COLLECTOR", label: "Catadores" },
                          { value: "DRIVER", label: "Motoristas" },
                        ]}
                        value={draft.role || ""}
                        onChange={(v) => patch("role", v)}
                      />
                    )}
                    {["staff", "vehicles"].includes(kind) && (
                      <Field
                        label="Situação cadastral"
                        options={[
                          { value: "", label: "Todas" },
                          ...options(
                            kind === "vehicles"
                              ? {
                                  ACTIVE: "Ativo",
                                  MAINTENANCE: "Em manutenção",
                                  INACTIVE: "Inativo",
                                }
                              : {
                                  AVAILABLE: "Disponível",
                                  ON_ROUTE: "Em rota",
                                  INACTIVE: "Inativo",
                                },
                          ),
                        ]}
                        value={draft.assetStatus || ""}
                        onChange={(v) => patch("assetStatus", v)}
                      />
                    )}
                    {kind === "waste" && stock && (
                      <>
                        <Field
                          label="Situação do lote"
                          options={[
                            { value: "", label: "Todas" },
                            ...options({
                              AVAILABLE: "Disponível",
                              RESERVED: "Reservado",
                              SOLD: "Vendido",
                              DISCARDED: "Descartado",
                              CANCELLED: "Cancelado",
                            }),
                          ]}
                          value={draft.lotStatus || ""}
                          onChange={(v) => patch("lotStatus", v)}
                        />
                        <Field
                          label="Etapa de processamento"
                          options={[
                            { value: "", label: "Todas" },
                            ...options({
                              TRIADO: "Triado",
                              TRITURADO: "Triturado",
                              PRENSADO: "Prensado",
                              ENFARDADO: "Enfardado",
                              ARMAZENADO: "Armazenado",
                              DESTINADO: "Destinado",
                            }),
                          ]}
                          value={draft.processingStage || ""}
                          onChange={(v) => patch("processingStage", v)}
                        />
                      </>
                    )}
                  </div>
                  <div className="d-flex gap-2 align-items-center flex-wrap mt-3">
                    <button className="btn btn-success" type="submit">
                      Aplicar filtros
                    </button>
                    {dirtyFilters && (
                      <span role="status" className="text-muted">
                        Filtros alterados: aplique para atualizar os resultados.
                      </span>
                    )}
                  </div>
                </fieldset>
              </form>
              <details className="mt-3">
                <summary>Conferir filtros aplicados</summary>
                <dl className="report-definition">
                  {filterSummary(data.meta.query, context).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </section>
            <div className="report-kpis">
              {[
                [
                  "Registros no recorte",
                  data.summary.records,
                  () => navigate(linkQuery("collections")),
                ],
                ...(data.summary.executed != null
                  ? [
                      [
                        "Coletas executadas",
                        data.summary.executed,
                        () =>
                          navigate(
                            linkQuery("collections", { execution: "EXECUTED" }),
                          ),
                      ],
                    ]
                  : []),
                [
                  "Quantidades registradas",
                  unitsLabel(data.summary.units),
                  null,
                ],
                ...(data.summary.assets != null
                  ? [
                      [
                        "Pessoas / veículos no filtro",
                        data.summary.assets,
                        null,
                      ],
                    ]
                  : []),
                ...(kind !== "waste"
                  ? [
                      [
                        "Executadas sem quantidade",
                        data.summary.missingQuantity,
                        () =>
                          navigate(
                            linkQuery("collections", {
                              execution: "MISSING_QUANTITY",
                            }),
                          ),
                      ],
                    ]
                  : []),
                ...(kind === "overview"
                  ? [
                      [
                        "Pontos atendidos",
                        data.summary.points,
                        () =>
                          document
                            .getElementById("report-points")
                            ?.scrollIntoView({ behavior: "smooth" }),
                      ],
                    ]
                  : []),
                ...(kind === "vehicles"
                  ? [
                      [
                        "Manutenção concluída (R$)",
                        num(data.summary.maintenanceCost),
                        null,
                      ],
                      [
                        "Vencidos / vencimento em 30 dias",
                        data.summary.expiringDocuments,
                        null,
                      ],
                    ]
                  : []),
              ].map(([label, value, action]) => (
                <div className="card p-4" key={label}>
                  <span className="text-muted">{label}</span>
                  <strong>
                    {typeof value === "number" ? num(value) : value}
                  </strong>
                  {action && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success align-self-start mt-2"
                      onClick={action}
                      aria-label={`Ver detalhes de ${label.toLocaleLowerCase("pt-BR")}`}
                    >
                      Ver detalhes
                    </button>
                  )}
                </div>
              ))}
            </div>
            <section className="card p-4 mt-4">
              <h2>Critérios e qualidade dos dados</h2>
              <ul>
                {data.meta.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              {data.summary.missingCollector > 0 && (
                <p>
                  Há {data.summary.missingCollector} coleta(s) executada(s) sem
                  catador vinculado.
                </p>
              )}
              {data.summary.missingVehicle > 0 && (
                <p>
                  Há {data.summary.missingVehicle} coleta(s) executada(s) sem
                  veículo vinculado.
                </p>
              )}
              {kind === "staff" && (
                <p>
                  Catadores: execução em campo. Motoristas: participação
                  logística e quantidades transportadas vinculadas. As mesmas
                  operações podem envolver ambos; os totais gerais contam cada
                  coleta uma vez.
                </p>
              )}
            </section>
            {kind === "overview" && (
              <>
                <section className="card p-4 mt-4">
                  <h2>Comparação com período anterior equivalente</h2>
                  <p>
                    {data.previous.period.start} a {data.previous.period.end},
                    com os mesmos filtros.
                  </p>
                  <div className="report-grid">
                    <p>
                      Coletas executadas:{" "}
                      <strong>
                        {percentChange(
                          data.summary.executed,
                          data.previous.executed,
                        )}
                      </strong>
                    </p>
                    <p>
                      Massa equivalente:{" "}
                      <strong>
                        {percentChange(
                          data.summary.massKg,
                          data.previous.massKg,
                        )}
                      </strong>
                    </p>
                  </div>
                  <p className="small text-muted">
                    Massa equivalente em kg considera somente kg e toneladas,
                    sem converter volume ou unidades.
                  </p>
                </section>
                <section className="card p-4 mt-4">
                  <h2>Acompanhamento do fluxo</h2>
                  <p>
                    As etapas representam medidas distintas do mesmo fluxo e não
                    são somadas.
                  </p>
                  <p>
                    Destinações ativas no período (data de destinação):{" "}
                    <strong>{unitsLabel(data.flow.destined)}</strong>
                  </p>
                  <p>
                    Saldo atual pendente nas entradas do recorte:{" "}
                    <strong>{unitsLabel(data.flow.pendingCurrent)}</strong>
                  </p>
                  <p>
                    Estoque atual disponível e reservado, com filtros
                    aplicáveis: <strong>{unitsLabel(data.flow.stock)}</strong>
                  </p>
                  <Link
                    className="btn btn-outline-success"
                    to={linkQuery("waste")}
                  >
                    Detalhar resíduos
                  </Link>
                </section>
                <section className="card p-4 mt-4">
                  <div className="d-flex justify-content-between flex-wrap gap-2">
                    <h2>Metas e potencial ambiental</h2>
                    <button
                      className="btn btn-outline-success"
                      onClick={() => setShowSettings(!showSettings)}
                    >
                      Configurar metas e metodologia
                    </button>
                  </div>
                  {monthlyGoal(data) ? (
                    <div className="report-grid">
                      <p>
                        Coletas: {num(data.summary.executed)} de{" "}
                        {num(data.settings.goals.monthlyCollections)} previstas
                        no mês.
                      </p>
                      <p>
                        Massa: {num(data.summary.massKg)} de{" "}
                        {num(data.settings.goals.monthlyMassKg)} kg equivalentes
                        previstos no mês.
                      </p>
                    </div>
                  ) : (
                    <p>
                      Para comparar metas da organização, selecione um mês
                      completo sem filtros operacionais.
                    </p>
                  )}
                  <p>
                    {data.environmental.co2Kg == null
                      ? "Estimativa ambiental não configurada. Cadastre metodologia, fonte e fatores para materiais identificados."
                      : `Potencial estimado: ${num(data.environmental.co2Kg)} kg CO2. Massa com fator: ${num(data.environmental.coveredMassKg)} de ${num(data.environmental.totalMassKg)} kg equivalentes.`}
                  </p>
                  <p className="small text-muted">
                    {data.environmental.description}
                  </p>
                  {data.settings.methodology.source && (
                    <p>
                      Fonte: {data.settings.methodology.source} · versão{" "}
                      {data.settings.methodology.version}
                    </p>
                  )}
                </section>
                {showSettings && (
                  <Settings
                    key={context.settings.version}
                    context={context}
                    onClose={() => setShowSettings(false)}
                    onSaved={async () => {
                      setShowSettings(false);
                      setRefresh((n) => n + 1);
                    }}
                  />
                )}
              </>
            )}
            {kind !== "waste" && (
              <section className="card p-4 mt-4">
                <h2>Evolução no período</h2>
                <Field
                  label="Unidade de visualização do gráfico"
                  value={chartUnit}
                  options={options(UNITS)}
                  onChange={setChartUnit}
                />
                {data.series.length ? (
                  <>
                    <ResponsiveContainer width="100%" height={270}>
                      <LineChart
                        data={data.series.map((s) => ({
                          date: s.date,
                          quantity: s.units[chartUnit] ?? 0,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip
                          formatter={(v) => num(v) + " " + UNITS[chartUnit]}
                        />
                        <Line
                          type="monotone"
                          dataKey="quantity"
                          stroke="#176944"
                          name={"Quantidade (" + UNITS[chartUnit] + ")"}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="small text-muted">
                      Datas sem quantidade na unidade selecionada aparecem sem
                      movimento dessa medida; registros sem medição são
                      informados nos indicadores.
                    </p>
                  </>
                ) : (
                  <p>Não há registros datados neste recorte.</p>
                )}
              </section>
            )}
            {(kind === "overview" || kind === "collections") && (
              <section className="card p-4 mt-4">
                <h2>Materiais por unidade</h2>
                {data.materialTotals.filter((m) => m.unit === chartUnit)
                  .length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={data.materialTotals
                        .filter((m) => m.unit === chartUnit)
                        .slice(0, 10)}
                      layout="vertical"
                      margin={{ left: 20, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={120} />
                      <Tooltip
                        formatter={(v) => num(v) + " " + UNITS[chartUnit]}
                      />
                      <Bar
                        dataKey="quantity"
                        fill="#176944"
                        name={"Quantidade (" + UNITS[chartUnit] + ")"}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p>Nenhum material registrado na unidade selecionada.</p>
                )}
                <p className="small text-muted">
                  Até dez materiais na unidade selecionada; o relatório completo
                  está disponível na tabela e exportação.
                </p>
              </section>
            )}
            {kind === "overview" && (
              <div id="report-points">
                <ReportMap
                  points={data.points}
                  base={context.cooperative}
                  onInspect={pointInspect}
                />
              </div>
            )}
            <section className="card p-4 mt-4">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                  <h2>Registros para conferência</h2>
                  <p>
                    {data.meta.total} registro(s) · {data.meta.scope}
                  </p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <Field
                    label="Ordenar por"
                    value={query.sort}
                    options={options({
                      date: "Data",
                      name: "Nome",
                      count: "Operações",
                      massKg: "Massa equivalente (kg)",
                    })}
                    onChange={(v) => apply({ ...query, sort: v, page: "1" })}
                  />
                  <Field
                    label="Direção da ordenação"
                    value={query.direction}
                    options={options({ asc: "Crescente", desc: "Decrescente" })}
                    onChange={(v) =>
                      apply({ ...query, direction: v, page: "1" })
                    }
                  />
                  <Field
                    label="Registros por página"
                    value={query.pageSize}
                    options={[10, 20, 50, 100].map((n) => ({
                      value: String(n),
                      label: String(n),
                    }))}
                    onChange={(v) =>
                      apply({ ...query, pageSize: v, page: "1" })
                    }
                  />
                </div>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <caption>
                    {current.title} — resultados do recorte aplicado. As
                    exportações incluem todas as páginas.
                  </caption>
                  <thead>
                    <tr>
                      <th>{kind === "waste" ? "Material" : "Identificação"}</th>
                      <th>Situação</th>
                      <th>
                        {["staff", "vehicles"].includes(kind)
                          ? "Atuação no período"
                          : "Data de referência"}
                      </th>
                      <th>Quantidade registrada</th>
                      {kind === "waste" && <th>Rastreabilidade / saldo</th>}
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.name}</strong>
                          <small className="d-block text-muted">{r.id}</small>
                          {r.role && <small>{r.role}</small>}
                          {r.route && (
                            <small className="d-block">
                              {r.route} · {r.vehicle}
                            </small>
                          )}
                        </td>
                        <td>{r.status}</td>
                        <td>
                          {["staff", "vehicles"].includes(kind) ? (
                            <>
                              {r.count} operações vinculadas
                              <br />
                              {r.routes} rotas com coletas
                              <br />
                              {r.assignedRoutes} rotas programadas
                              {kind === "vehicles" && (
                                <>
                                  <br />
                                  Capacidade: {num(r.capacityKg)} kg
                                  <br />
                                  Manutenção concluída: R${" "}
                                  {num(r.maintenanceCost)}
                                  <br />
                                  {r.maintenanceWithoutCost} manutenção(ões) sem
                                  custo informado
                                  <br />
                                  {r.expiringDocuments} alerta(s) documental(is)
                                </>
                              )}
                            </>
                          ) : (
                            dateLabel(r.date)
                          )}
                        </td>
                        <td>
                          {unitsLabel(r.units)}
                          {r.missingQuantity > 0 && (
                            <small className="d-block">
                              {r.missingQuantity} operação(ões) sem quantidade
                            </small>
                          )}
                        </td>
                        {kind === "waste" && (
                          <td>
                            {r.lotCode && (
                              <>
                                Lote: {r.lotCode}
                                <br />
                              </>
                            )}
                            {r.pendingQuantity != null && (
                              <>
                                Saldo atual da entrada: {num(r.pendingQuantity)}{" "}
                                {UNITS[r.unit]}
                                <br />
                              </>
                            )}
                            {r.destination && (
                              <>
                                Destino: {r.destination}
                                <br />
                              </>
                            )}
                            {r.storageLocation && (
                              <>
                                Local: {r.storageLocation}
                                <br />
                              </>
                            )}
                            {r.originalQuantity != null && (
                              <>
                                Original: {num(r.originalQuantity)}{" "}
                                {UNITS[r.unit]}
                              </>
                            )}
                          </td>
                        )}
                        <td>
                          {["staff", "vehicles"].includes(kind) ? (
                            <Link
                              className="btn btn-sm btn-outline-success"
                              to={linkQuery("collections", {
                                [kind === "vehicles"
                                  ? "vehicleId"
                                  : r.role === "Catador"
                                    ? "collectorId"
                                    : "driverId"]: r.rawId,
                                role: "",
                                search: "",
                                assetStatus: "",
                              })}
                            >
                              Ver operações vinculadas
                            </Link>
                          ) : kind !== "waste" || r.collectionId ? (
                            <button
                              className="btn btn-sm btn-outline-success"
                              onClick={() => openDetail(r.collectionId || r.id)}
                            >
                              Conferir coleta
                            </button>
                          ) : (
                            <span>Sem coleta vinculada</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!data.rows.length && (
                      <tr>
                        <td colSpan={kind === "waste" ? 6 : 5}>
                          Nenhum registro encontrado para os filtros aplicados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="d-flex justify-content-between flex-wrap gap-2">
                <span>
                  Página {data.meta.page} de{" "}
                  {Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize))}
                </span>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={data.meta.page <= 1}
                    onClick={() =>
                      apply({ ...query, page: String(data.meta.page - 1) })
                    }
                  >
                    Anterior
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={
                      data.meta.page * data.meta.pageSize >= data.meta.total
                    }
                    onClick={() =>
                      apply({ ...query, page: String(data.meta.page + 1) })
                    }
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : null}
        {(detail || detailLoading || detailError) && (
          <aside
            className="report-detail"
            onKeyDown={(e) => {
              if (e.key === "Escape") closeDetail();
              if (e.key === "Tab") {
                const fields = [
                  ...e.currentTarget.querySelectorAll(
                    "button,a[href],input,select,textarea",
                  ),
                ];
                const first = fields[0],
                  last = fields[fields.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Conferência da coleta"
          >
            <div className="report-detail-inner">
              <button
                className="btn btn-outline-secondary mb-3"
                autoFocus
                onClick={closeDetail}
              >
                Fechar conferência
              </button>
              {detailLoading ? (
                <p role="status">Consultando coleta...</p>
              ) : detailError ? (
                <p role="alert">{detailError}</p>
              ) : (
                <>
                  <h2>{detail.collection.name}</h2>
                  <p>
                    {detail.collection.id} · {detail.collection.status}
                  </p>
                  <p>{unitsLabel(detail.collection.units)}</p>
                  <dl className="report-definition">
                    {Object.entries({
                      createdAt: "Criada em",
                      scheduledDate: "Agendada para",
                      collectedAt: "Coletada em campo",
                      receivedAt: "Recebida em",
                      completedAt: "Concluída em",
                    }).map(([k, label]) => (
                      <div key={k}>
                        <dt>{label}</dt>
                        <dd>{dateLabel(detail.collection[k])}</dd>
                      </div>
                    ))}
                  </dl>
                  <p>
                    Catador: {detail.collection.collector} · Motorista:{" "}
                    {detail.collection.driver} · Veículo:{" "}
                    {detail.collection.vehicle}
                  </p>
                  <h3>Materiais registrados</h3>
                  <ul>
                    {detail.collection.materials.map((m) => (
                      <li key={m.id}>
                        {m.name}: {num(m.quantity)} {UNITS[m.unit]}{" "}
                        {m.legacy && "(peso legado)"}
                      </li>
                    ))}
                  </ul>
                  <h3>Destinações</h3>
                  <ul>
                    {detail.destinations.map((d) => (
                      <li key={d.id}>
                        {d.type} · {num(d.quantity)} {UNITS[d.unit]} ·{" "}
                        {d.status} · {dateLabel(d.destinationDate)} ·{" "}
                        {d.destinationName || "Destino não informado"}{" "}
                        {d.stockLot &&
                          "· Lote " +
                            (d.stockLot.lotCode ||
                              d.stockLot.code ||
                              d.stockLot.id)}
                      </li>
                    ))}
                  </ul>
                  <p>{detail.notice}</p>
                  <Link
                    className="btn btn-success"
                    to={"/edit-waste/" + detail.collection.id}
                  >
                    Abrir gestão da coleta
                  </Link>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </ManagementWorkspace>
  );
}
