import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { DistributionPie, HeatTiles } from "../../components/charts/DataCharts";
import { useAdminAuth } from "../../context/AdminAuthContext";
import {
  participationRequest,
  recentPeriod,
  participationFilters,
  coverageLabels,
  profileLabels,
  statusLabels,
  number,
  dateTime,
  qualityLabels,
  unitLabels,
  materialQuantity,
} from "../../services/participationAnalytics";
import "./participationAnalytics.css";
import AttendanceAnalytics from "./AttendanceAnalytics";
import AnalyticsDimension from "./AnalyticsDimension";
import PeriodComparison from "./PeriodComparison";
import ExecutiveExport from "./ExecutiveExport";

const cards = [
  [
    "active",
    "Participantes ativos",
    "Com pelo menos um recebimento no período.",
  ],
  [
    "first_registered",
    "Primeira participação registrada",
    "Primeiro recebimento conhecido nesta cooperativa.",
  ],
  [
    "returning",
    "Participantes recorrentes",
    "Já tinham recebimentos anteriores ao período.",
  ],
  [
    "participations",
    "Participações confirmadas",
    "Cada coleta recebida conta uma vez.",
  ],
  [
    "open_requests",
    "Solicitações em aberto",
    "Criadas no período e ainda sem recebimento.",
  ],
];

function Pagination({ page, total, size = 20, onChange, disabled }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="pa-pagination">
      <span>
        {number(total)} registro(s) · Página {page} de {pages}
      </span>
      <button
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </button>
      <button
        disabled={disabled || page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </button>
    </div>
  );
}

export function ParticipantDetail({ partyKey, filters, onClose }) {
  const [page, setPage] = useState(1),
    [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const separator = partyKey.indexOf(":");
    setData(null);
    setError("");
    participationRequest(
      `participants/${encodeURIComponent(partyKey.slice(0, separator))}/${encodeURIComponent(partyKey.slice(separator + 1))}`,
      { ...filters, page, pageSize: 10 },
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err.message || "Não foi possível consultar o histórico.");
      });
    return () => controller.abort();
  }, [partyKey, filters, page]);
  return (
    <section
      className="pa-panel pa-detail"
      aria-label="Histórico do participante"
    >
      <div className="pa-heading">
        <h2>{data?.person.name || "Detalhes do participante"}</h2>
        <button onClick={onClose}>Fechar detalhes</button>
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : !data ? (
        <p role="status">Carregando histórico…</p>
      ) : (
        <>
          <p>
            {profileLabels[data.person.profile]} · Última participação:{" "}
            {dateTime(data.person.last_at)}
          </p>
          <div className="pa-facts">
            {[7, 30, 60].map((days) => (
              <div key={days}>
                <strong>{number(data.person[`days${days}`])}</strong>{" "}
                participações em {days} dias
              </div>
            ))}
          </div>
          <p>
            Recência:{" "}
            {data.person.recency_days == null
              ? "sem recebimento registrado"
              : `${number(data.person.recency_days)} dia(s) desde o último recebimento`}
            . Janelas calculadas até a data de referência do relatório.
          </p>
          <p>
            {data.regularity.median_days == null
              ? "Regularidade: histórico insuficiente. São necessárias pelo menos três datas distintas de participação."
              : `Intervalo mediano: ${number(data.regularity.median_days)} dias. Variação dos intervalos: ${number(data.regularity.deviation_days)} dias (desvio padrão).`}
          </p>
          {!!data.materialSummary?.length && (
            <>
              <h3>Materiais registrados no período e nos filtros</h3>
              <ul className="pa-receipt-materials">
                {data.materialSummary.map((row, index) => (
                  <li key={index}>
                    <span>
                      {row.name}
                      <small>{number(row.receipts)} recebimento(s)</small>
                    </span>
                    <strong>
                      {materialQuantity(row.quantity)} {unitLabels[row.unit]}
                    </strong>
                  </li>
                ))}
              </ul>
              <p>
                Quantidades registradas, que podem aguardar conferência;
                unidades são mantidas separadas.
              </p>
            </>
          )}
          <h3>Histórico registrado até a data de referência</h3>
          <p>Solicitação e coleta vinculadas aparecem no mesmo registro.</p>
          <ol className="pa-timeline">
            {data.timeline.map((item) => (
              <li key={`${item.kind}:${item.id}`}>
                <strong>
                  {item.kind === "COLLECTION" ? "Coleta" : "Solicitação"} ·{" "}
                  {statusLabels[item.status] || "Situação a conferir"}
                </strong>
                <span>{dateTime(item.date)}</span>
                <small>Identificador: {item.id}</small>
                {item.requested_at && (
                  <small>Solicitada em {dateTime(item.requested_at)}</small>
                )}
                {item.received_at && (
                  <small>Recebida em {dateTime(item.received_at)}</small>
                )}
              </li>
            ))}
          </ol>
          <Pagination
            page={page}
            total={data.pagination.total}
            size={10}
            onChange={setPage}
          />
        </>
      )}
    </section>
  );
}

export default function ParticipationAnalytics() {
  const { admin } = useAdminAuth();
  const [params, setParams] = useSearchParams();
  const tabs = {
    overview: "Visão geral",
    generators: "Geradores",
    collectors: "Catadores",
    territory: "Bairros",
    usage: "Uso do sistema",
  };
  const activeTab = Object.hasOwn(tabs, params.get("tab"))
    ? params.get("tab")
    : "overview";
  const filters = useMemo(() => participationFilters(params), [params]);
  const [draft, setDraft] = useState(filters);
  const setFilters = (value) =>
    setParams(new URLSearchParams({ ...value, tab: activeTab }));
  useEffect(() => setDraft(filters), [filters]);
  const [locations, setLocations] = useState([]),
    [contextError, setContextError] = useState("");
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0);
  const [list, setList] = useState(null),
    [listBusy, setListBusy] = useState(false),
    [listError, setListError] = useState("");
  const [search, setSearch] = useState(""),
    [selected, setSelected] = useState(null);
  const listController = useRef(null);
  useEffect(() => {
    if (admin?.role !== "COOPERATIVE") return;
    const controller = new AbortController();
    participationRequest("context", null, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setLocations(result.locations);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setContextError(
            "Os filtros de localidade não foram carregados. Você pode consultar por período e perfil.",
          );
      });
    return () => controller.abort();
  }, [admin?.role]);
  useEffect(() => {
    if (admin?.role !== "COOPERATIVE") return;
    const controller = new AbortController();
    if (activeTab !== "overview") {
      setLoading(false);
      setData(null);
      return;
    }
    listController.current?.abort();
    setSelected(null);
    setData(null);
    setList(null);
    setLoading(true);
    setError("");
    setSearch("");
    setListError("");
    setListBusy(false);
    participationRequest("overview", filters, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setList(result.participants);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err.message || "Não foi possível carregar os indicadores.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      listController.current?.abort();
    };
  }, [filters, refresh, admin?.role, activeTab]);
  const cities = useMemo(
    () => [
      ...new Map(
        locations.map((item) => [`${item.city_key}|${item.state_key}`, item]),
      ).values(),
    ],
    [locations],
  );
  const neighborhoods = useMemo(
    () => [
      ...new Map(
        locations
          .filter(
            (item) =>
              (!draft.city || item.city_key === draft.city) &&
              (!draft.state || item.state_key === draft.state),
          )
          .map((item) => [item.neighborhood_key, item]),
      ).values(),
    ],
    [locations, draft.city, draft.state],
  );
  const update = (field, value) =>
    setDraft((previous) => ({ ...previous, [field]: value }));
  const loadPage = async (page) => {
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;
    setListBusy(true);
    setListError("");
    setList(null);
    try {
      const result = await participationRequest(
        "participants",
        { ...filters, search, page, pageSize: 20 },
        controller.signal,
      );
      if (!controller.signal.aborted) setList(result);
    } catch (err) {
      if (!controller.signal.aborted)
        setListError(err.message || "Falha ao consultar participantes.");
    } finally {
      if (!controller.signal.aborted) setListBusy(false);
    }
  };
  if (admin?.role !== "COOPERATIVE")
    return (
      <div className="container py-4">
        <h1>Analytics</h1>
        <p>Esta consulta está disponível para o perfil da cooperativa.</p>
      </div>
    );
  return (
    <div className="participation-analytics container-fluid py-4">
      <header>
        <span className="pa-eyebrow">ANALYTICS</span>
        <h1>Participação e atendimento</h1>
        <p>
          Entenda quem participa, a frequência dos recebimentos e as
          solicitações da sua cooperativa.
        </p>
      </header>
      <nav className="pa-tabs" aria-label="Abas do Analytics">
        {Object.entries(tabs).map(([key, label]) => (
          <Link
            key={key}
            aria-current={activeTab === key ? "page" : undefined}
            className={activeTab === key ? "active" : ""}
            to={`?${new URLSearchParams({ ...filters, tab: key })}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <form
        className="pa-panel pa-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters({ ...draft });
        }}
      >
        <div className="pa-heading">
          <h2>Período e público</h2>
          <div className="pa-shortcuts">
            {[7, 30, 60].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() =>
                  setDraft((previous) => ({
                    ...previous,
                    ...recentPeriod(days),
                    profile: previous.profile,
                    city: previous.city,
                    state: previous.state,
                    neighborhood: previous.neighborhood,
                    group: previous.group,
                  }))
                }
              >
                Últimos {days} dias
              </button>
            ))}
          </div>
        </div>
        <div className="pa-filter-grid">
          <label>
            De
            <input
              type="date"
              required
              value={draft.start}
              max={draft.end}
              onChange={(event) => update("start", event.target.value)}
            />
          </label>
          <label>
            Até
            <input
              type="date"
              required
              value={draft.end}
              min={draft.start}
              max={recentPeriod().end}
              onChange={(event) => update("end", event.target.value)}
            />
          </label>
          <label>
            Perfil
            <select
              disabled={!["overview", "generators"].includes(activeTab)}
              value={draft.profile}
              onChange={(event) => update("profile", event.target.value)}
            >
              <option value="">Todos os perfis identificados</option>
              {Object.entries(profileLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Município / UF
            <select
              disabled={activeTab === "usage"}
              value={draft.city ? `${draft.city}|${draft.state}` : ""}
              onChange={(event) => {
                const [city = "", state = ""] = event.target.value.split("|");
                setDraft((previous) => ({
                  ...previous,
                  city,
                  state,
                  neighborhood: "",
                }));
              }}
            >
              <option value="">Todos</option>
              {cities.map((item) => (
                <option
                  key={`${item.city_key}|${item.state_key}`}
                  value={`${item.city_key}|${item.state_key}`}
                >
                  {item.city} / {item.state}
                </option>
              ))}
            </select>
          </label>
          <label>
            Bairro
            <select
              disabled={activeTab === "usage"}
              value={draft.neighborhood}
              onChange={(event) => update("neighborhood", event.target.value)}
            >
              <option value="">Todos</option>
              <option value="__unknown__">Bairro não informado</option>
              {neighborhoods
                .filter((item) => item.neighborhood_key !== "__unknown__")
                .map((item) => (
                  <option
                    key={item.neighborhood_key}
                    value={item.neighborhood_key}
                  >
                    {item.neighborhood}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Agrupar evolução
            <select
              disabled={activeTab !== "overview"}
              value={draft.group}
              onChange={(event) => update("group", event.target.value)}
            >
              <option value="week">Por semana</option>
              <option value="month">Por mês</option>
            </select>
          </label>
        </div>
        <div className="pa-actions">
          <button className="pa-primary" disabled={loading}>
            Aplicar filtros
          </button>
          <button
            type="button"
            onClick={() => {
              const value = recentPeriod();
              setDraft(value);
              setFilters(value);
            }}
          >
            Limpar filtros
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Atualizar dados
          </button>
        </div>
        {contextError && <p role="status">{contextError}</p>}
      </form>
      <ExecutiveExport
        key={new URLSearchParams(filters).toString()}
        filters={filters}
      />
      {activeTab !== "overview" ? (
        <AnalyticsDimension
          key={`${activeTab}:${new URLSearchParams(filters)}:${refresh}`}
          kind={activeTab}
          filters={filters}
        />
      ) : loading ? (
        <p role="status" className="pa-panel">
          Consultando os registros da cooperativa…
        </p>
      ) : error ? (
        <div className="pa-panel pa-error" role="alert">
          <p>{error}</p>
          <button onClick={() => setRefresh((value) => value + 1)}>
            Tentar novamente
          </button>
        </div>
      ) : (
        data && (
          <>
            <div className="pa-reference">
              <strong>
                {data.meta.start.split("-").reverse().join("/")} a{" "}
                {data.meta.end.split("-").reverse().join("/")}
              </strong>
              <span>
                Atualizado em {dateTime(data.meta.generatedAt)} · Horário de
                Fortaleza
              </span>
            </div>
            {data.meta.partial && (
              <p className="pa-notice">
                O dia atual está em andamento. Os números são parciais até a
                atualização acima.
              </p>
            )}
            <PeriodComparison filters={filters} />
            <div className="pa-kpis">
              {cards.map(([key, label, help]) => (
                <article className="pa-panel" key={key}>
                  <h2>{label}</h2>
                  <strong>{number(data.summary[key])}</strong>
                  <p>{help}</p>
                </article>
              ))}
            </div>
            <p className="pa-explanation">
              Participantes são pessoas físicas e geradores com identidade
              vinculada. Primeira participação + recorrentes = ativos.{" "}
              {number(data.summary.repeated)} participante(s) tiveram dois ou
              mais recebimentos no período. A recorrência não indica abandono ou
              risco.
            </p>
            <div className="pa-chart-grid">
              <section className="pa-panel">
                <h2>Mapa de calor da participação</h2>
                <p>
                  Recebimentos e participantes identificados, por{" "}
                  {filters.group === "week"
                    ? "semana (início na segunda-feira)"
                    : "mês"}
                  . Os intervalos das extremidades podem ser parciais. A mesma
                  pessoa pode aparecer em mais de um intervalo; sua soma não
                  representa pessoas únicas.
                </p>
                {data.series.length ? (
                  <>
                    <HeatTiles
                      label="Participações por intervalo"
                      unit="recebimentos"
                      data={data.series.map((s) => ({
                        key: s.date,
                        name: s.date.split("-").reverse().join("/"),
                        value: s.operations,
                      }))}
                    />
                    <h3 className="h6 mt-3">
                      Participantes identificados por intervalo
                    </h3>
                    <HeatTiles
                      label="Participantes por intervalo"
                      unit="participantes"
                      data={data.series.map((s) => ({
                        key: s.date,
                        name: s.date.split("-").reverse().join("/"),
                        value: s.participants,
                      }))}
                    />
                    <details>
                      <summary>Consultar valores do gráfico</summary>
                      <ul>
                        {data.series.map((item) => (
                          <li key={item.date}>
                            {item.date.split("-").reverse().join("/")}:{" "}
                            {number(item.operations)} participações /{" "}
                            {number(item.participants)} participantes
                          </li>
                        ))}
                      </ul>
                    </details>
                  </>
                ) : (
                  <p className="pa-empty">
                    Nenhum recebimento identificado neste período e nestes
                    filtros.
                  </p>
                )}
              </section>
              <section className="pa-panel">
                <h2>Participação por bairro</h2>
                <p>
                  Localidade do cadastro atual. Pessoas físicas sem endereço
                  estruturado aparecem em “Bairro não informado”.
                </p>
                <HeatTiles
                  label="Concentração de recebimentos por bairro"
                  unit="recebimentos"
                  data={data.neighborhoods.map((item) => ({
                    key: `${item.city_key}|${item.state_key}|${item.neighborhood_key}`,
                    name: `${item.neighborhood} · ${item.city} / ${item.state || "UF não informada"}`,
                    value: item.operations,
                  }))}
                />
                <h3 className="h6 mt-4">Perfil de recorrência no período</h3>
                <DistributionPie
                  label="Primeira participação e participantes recorrentes"
                  unit="participantes"
                  data={[
                    {
                      key: "first",
                      name: "Primeira participação registrada",
                      value: data.summary.first_registered,
                    },
                    {
                      key: "returning",
                      name: "Recorrentes",
                      value: data.summary.returning,
                    },
                  ]}
                />
                <p className="small">
                  Primeira participação e recorrentes formam grupos distintos de
                  participantes ativos. A pizza não soma participantes entre
                  semanas ou meses.
                </p>
              </section>
            </div>
            <section className="pa-panel">
              <h2>Cobertura dos recebimentos</h2>
              <p>
                <strong>
                  {number(data.coverageTotals.received)} recebimentos no período
                  e na seleção geográfica
                </strong>{" "}
                · {number(data.coverageTotals.identified)} com origem PF ou
                gerador identificada, considerando todos os perfis.
              </p>
              <p>{data.coverageScope}</p>
              <p>
                PEVs, entregadores avulsos, origens não identificadas e vínculos
                a conferir não entram no total de participantes identificados.
              </p>
              <div className="pa-coverage">
                {Object.entries(coverageLabels).map(([key, label]) => (
                  <Link
                    className="pa-coverage-card"
                    key={key}
                    to={`/analytics/participation/coverage/${key}?${new URLSearchParams(filters)}`}
                  >
                    <strong>
                      {number(
                        data.coverage.find((item) => item.bucket === key)
                          ?.count ?? 0,
                      )}
                    </strong>
                    <span>{label}</span>
                    <small>Ver recebimentos →</small>
                  </Link>
                ))}
              </div>
            </section>
            <AttendanceAnalytics start={filters.start} end={filters.end} />
            <section className="pa-panel">
              <div className="pa-heading">
                <h2>Participantes e solicitações</h2>
                <form
                  className="pa-search"
                  onSubmit={(event) => {
                    event.preventDefault();
                    loadPage(1);
                  }}
                >
                  <label>
                    Buscar nome na lista
                    <input
                      value={search}
                      maxLength={120}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Pessoa ou gerador"
                    />
                  </label>
                  <button disabled={listBusy}>Buscar</button>
                </form>
              </div>
              <p>
                A busca por nome afeta apenas esta lista. As demais informações
                seguem o período e os filtros aplicados.
              </p>
              {listBusy ? (
                <p role="status">Consultando participantes…</p>
              ) : listError ? (
                <p role="alert">{listError}</p>
              ) : (
                list && (
                  <>
                    <div
                      className="pa-table-wrap"
                      tabIndex={0}
                      role="region"
                      aria-label="Lista de participantes, com rolagem horizontal"
                    >
                      <table>
                        <thead>
                          <tr>
                            <th>Participante</th>
                            <th>Perfil / localidade</th>
                            <th>Recebimentos</th>
                            <th>Última participação</th>
                            <th>Solicitações abertas</th>
                            <th>Histórico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.items.map((person) => (
                            <tr key={person.party_key}>
                              <td>{person.name || "Nome não informado"}</td>
                              <td>
                                {profileLabels[person.profile]}
                                <small>
                                  {person.neighborhood ||
                                    "Bairro não informado"}{" "}
                                  · {person.city || "Município não informado"}
                                </small>
                              </td>
                              <td>{number(person.period_count)}</td>
                              <td>
                                {dateTime(person.last_at)}
                                {person.recency_days != null && (
                                  <small>
                                    Há {number(person.recency_days)} dia(s) na
                                    referência
                                  </small>
                                )}
                              </td>
                              <td>{number(person.open_requests)}</td>
                              <td>
                                <button
                                  aria-label={`Ver detalhes de ${person.name}`}
                                  onClick={() => setSelected(person.party_key)}
                                >
                                  Ver detalhes
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!list.items.length && (
                      <p className="pa-empty">
                        Nenhum participante encontrado.
                      </p>
                    )}
                    <Pagination
                      page={list.page}
                      total={list.total}
                      onChange={loadPage}
                      disabled={listBusy}
                    />
                  </>
                )
              )}
            </section>
            {selected && (
              <ParticipantDetail
                key={selected}
                partyKey={selected}
                filters={filters}
                onClose={() => setSelected(null)}
              />
            )}
            <details className="pa-panel">
              <summary>Qualidade e limites dos dados</summary>
              <p>{data.qualityScope}</p>
              <p>
                Abra um indicador para conferir os registros e acessar a
                operação correspondente. O mesmo registro pode aparecer em mais
                de um diagnóstico; essas contagens não devem ser somadas.
              </p>
              <dl className="pa-quality">
                {Object.entries(qualityLabels).map(([key, label]) => (
                  <div key={key}>
                    <dt>
                      <Link
                        className="pa-count-link"
                        to={`/analytics/participation/quality/${key}?${new URLSearchParams(filters)}`}
                      >
                        {label}
                      </Link>
                    </dt>
                    <dd>
                      {number(data.quality[key])} /{" "}
                      {number(
                        data.quality[
                          key === "conflicting_relations"
                            ? "historical_operations"
                            : [
                                  "missing_received_date",
                                  "future_received_date",
                                ].includes(key)
                              ? "historical_receipts"
                              : [
                                    "unattributed_requests",
                                    "request_status_mismatch",
                                  ].includes(key)
                                ? "period_requests"
                                : "period_receipts"
                        ],
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <p>
                Os indicadores refletem a situação atual dos registros,
                organizada pela data do evento. Correções posteriores podem
                alterar períodos anteriores. Ausências de dados são mostradas
                sem preencher valores presumidos. O tempo ativo estimado está na
                aba Uso do sistema. Previsões de comportamento não integram esta
                análise.
              </p>
            </details>
          </>
        )
      )}
    </div>
  );
}
