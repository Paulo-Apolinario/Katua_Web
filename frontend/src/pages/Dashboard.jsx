import OperationalOverviewCards from "../components/dashboard/OperationalOverviewCards";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiRequest } from "../services/apiClient";
import HeadTags from "../components/HeadTags";
import {
  ManagementWorkspace,
  ManagementHeader,
} from "../components/management/ManagementWorkspace";
import {
  civilToday,
  unitsLabel,
  dateLabel,
  num,
  percentChange,
} from "../components/reports/reportModel";
import OperationalDashboardMap from "../components/dashboard/OperationalDashboardMap";
import "../components/dashboard/dashboard.css";
const defaults = () => ({
  start: civilToday().slice(0, 7) + "-01",
  end: civilToday(),
});
export default function Dashboard() {
  const [query, setQuery] = useState(defaults),
    [draft, setDraft] = useState(defaults),
    [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [unit, setUnit] = useState("KG");
  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    setLoading(true);
    setData(null);
    setError("");
    apiRequest("/dashboard/overview?" + new URLSearchParams(query), {
      signal: abort.signal,
    })
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch((e) => {
        if (active)
          setError(
            e.error || e.message || "Não foi possível carregar o painel.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      abort.abort();
    };
  }, [query, refresh]);
  const today = civilToday(),
    reportQuery = new URLSearchParams(query).toString();
  const units = {
    KG: "kg",
    TON: "t",
    LITER: "L",
    UNIT: "un",
    CUBIC_METER: "m³",
  };
  const table = (rows, caption) => (
    <div className="table-responsive">
      <table className="table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th>Origem e operação</th>
            <th>Situação</th>
            <th>Data de referência</th>
            <th>Quantidade</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>
                <strong>{c.name}</strong>
                <small className="d-block">
                  {c.origin} · {c.city}
                </small>
                <small>
                  {c.route} · {c.vehicle}
                </small>
              </td>
              <td>{c.status}</td>
              <td>{dateLabel(c.date)}</td>
              <td>{unitsLabel(c.units)}</td>
              <td>
                <Link to={"/edit-waste/" + c.id}>Conferir coleta</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p>Nenhuma operação encontrada nesta seção.</p>}
    </div>
  );
  return (
    <ManagementWorkspace>
      <div className="dashboard-workspace">
        <HeadTags title="Painel operacional" />
        <ManagementHeader
          title={
            data
              ? "Painel operacional · " + data.cooperative.name
              : "Painel operacional"
          }
          description="Prioridades do dia, fluxo de resíduos e pontos da cooperativa."
          eyebrow="Centro operacional"
          hideNavigation
          actions={
            <button
              className="btn btn-outline-success"
              disabled={loading}
              onClick={() => setRefresh((n) => n + 1)}
            >
              Atualizar dados
            </button>
          }
        />
        <p className="text-muted">
          {new Date(today + "T12:00:00-03:00").toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "America/Fortaleza",
          })}
          {data ? " · Atualizado em " + dateLabel(data.generatedAt) : ""}
        </p>
        {error && (
          <section role="alert" className="alert alert-danger">
            {error}
            <button
              className="btn btn-outline-danger btn-sm ms-3"
              onClick={() => setRefresh((n) => n + 1)}
            >
              Tentar novamente
            </button>
          </section>
        )}
        <OperationalOverviewCards refresh={refresh} />
        {loading ? (
          <section role="status" className="card p-4">
            Carregando painel operacional...
          </section>
        ) : (
          data && (
            <>
              <section className="card p-4 mb-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div>
                    <h2>Central de atenção</h2>
                    <p>
                      {data.operational.openAlerts
                        ? `${data.operational.openAlerts} aviso(s) aberto(s), sendo ${data.operational.criticalAlerts} prioritário(s), sem os adiados.`
                        : "Nenhum aviso aberto registrado na central neste momento."}
                    </p>
                    <small className="text-muted">
                      A central reavalia as condições ao abrir e a cada minuto
                      com a API ativa. Ausência de avisos não substitui a
                      conferência dos registros.
                    </small>
                  </div>
                  <Link className="btn btn-outline-success" to="/system-alerts">
                    Conferir pendências
                  </Link>
                </div>
              </section>
              <section className="card p-4 mb-4">
                <div className="d-flex justify-content-between flex-wrap gap-2">
                  <div>
                    <h2>Agenda de hoje</h2>
                    <p>
                      Coletas com programação para{" "}
                      {today.split("-").reverse().join("/")}, no fuso do Ceará.
                      Não usa criação como agendamento.
                    </p>
                  </div>
                  <Link to="/calendar">Abrir calendário</Link>
                </div>
                {table(
                  data.todayRows,
                  "Programação do dia; prioridade à conferência operacional.",
                )}
                {data.todayTruncated && (
                  <p className="alert alert-warning">
                    Exibidas as primeiras 50 operações. Consulte a lista de
                    coletas para ver todas.
                  </p>
                )}
              </section>
              <section className="card p-4 mb-4">
                <h2>Resultados por período</h2>
                <p>
                  O período abaixo afeta os resultados e os gráficos. Os cartões
                  operacionais acima e o estoque representam a situação atual.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setQuery({ ...draft });
                  }}
                  className="dashboard-filter-grid mb-4"
                >
                  <label>
                    Data inicial
                    <input
                      className="form-control"
                      type="date"
                      required
                      value={draft.start}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, start: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Data final
                    <input
                      className="form-control"
                      type="date"
                      required
                      value={draft.end}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, end: e.target.value }))
                      }
                    />
                  </label>
                  <button
                    className="btn btn-success align-self-end"
                    type="submit"
                  >
                    Aplicar período
                  </button>
                </form>
                <div className="dashboard-kpis">
                  <div className="dashboard-metric">
                    <span>Coletas executadas no período</span>
                    <strong>{num(data.period.summary.executed)}</strong>
                  </div>
                  <div className="dashboard-metric">
                    <span>Quantidades coletadas</span>
                    <strong>{unitsLabel(data.period.summary.units)}</strong>
                  </div>
                  <div className="dashboard-metric">
                    <span>Executadas sem quantidade</span>
                    <strong>{num(data.period.summary.missingQuantity)}</strong>
                  </div>
                  <div className="dashboard-metric">
                    <span>Variação da massa equivalente</span>
                    <strong>
                      {data.period.previous
                        ? percentChange(
                            data.period.summary.massKg,
                            data.period.previous.massKg,
                          )
                        : "Não disponível"}
                    </strong>
                  </div>
                </div>
                <p className="small text-muted mt-3">
                  Comparação com período anterior de mesma duração. Massa
                  equivalente considera apenas kg e toneladas; litros e unidades
                  ficam separados. Não significa comprovação de reciclagem.
                </p>
                <Link to={"/analytics-dashboard?" + reportQuery}>
                  Abrir análise completa e exportações →
                </Link>
              </section>
              <section className="dashboard-two-columns mb-4">
                <div className="card p-4">
                  <h2>Evolução das quantidades coletadas</h2>
                  <label className="mb-3">
                    Unidade de visualização
                    <select
                      className="form-select"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      {Object.entries(units).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  {data.period.series.length ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={data.period.series.map((s) => ({
                          date: s.date,
                          quantity: s.units[unit] ?? 0,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip
                          formatter={(v) => num(v) + " " + units[unit]}
                        />
                        <Bar
                          dataKey="quantity"
                          fill="#176944"
                          name="Quantidade"
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p>Não há movimentações datadas no período.</p>
                  )}
                  <p className="small text-muted">
                    Dias sem essa unidade aparecem sem movimento dessa medida.
                    Ausências de pesagem são informadas separadamente.
                  </p>
                </div>
                <div className="card p-4">
                  <h2>Estoque e fluxo</h2>
                  <p>Posição atual disponível e reservada:</p>
                  <strong className="fs-4">{unitsLabel(data.stock)}</strong>
                  <hr />
                  <p>Saldo atual sem destinação:</p>
                  <strong className="fs-5">
                    {unitsLabel(data.operational.pendingUnits)}
                  </strong>
                  <p className="small text-muted mt-3">
                    Coleta, destinação e estoque são etapas do mesmo fluxo. As
                    quantidades não são somadas como produção adicional.
                  </p>
                  <div className="d-flex gap-2 flex-wrap">
                    <Link
                      className="btn btn-outline-success"
                      to="/collected-waste"
                    >
                      Destinar resíduos
                    </Link>
                    <Link
                      className="btn btn-outline-secondary"
                      to="/waste-type-reports?stage=STOCK"
                    >
                      Consultar estoque
                    </Link>
                  </div>
                </div>
              </section>
              <div className="mb-4">
                <OperationalDashboardMap
                  points={data.map.points}
                  base={data.cooperative}
                  truncated={data.map.truncated}
                />
              </div>
              <section className="card p-4 mb-4">
                <h2>Últimos registros de coletas</h2>
                <p>
                  Até oito registros, por data de criação. Esta ordem não
                  representa necessariamente a última execução em campo.
                </p>
                {table(data.recent, "Registros recentes para conferência.")}
              </section>
              <details className="card p-4">
                <summary>Critérios e qualidade dos dados</summary>
                <ul>
                  {data.period.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </details>
            </>
          )
        )}
      </div>
    </ManagementWorkspace>
  );
}
