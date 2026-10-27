import TeamPicker from "../../components/routes/TeamPicker";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ManagementHeader } from "../../components/management/ManagementWorkspace";
import {
  getRoutePlans,
  saveRoutePlan,
  generateRoutePlan,
  getPlanningSources,
  pointCollection,
} from "../../services/routePlanningService";
import { getAllDrivers } from "../../services/driverService";
import { getAllVehicles } from "../../services/vehicleService";
import RoutePointsEditor from "../../components/routes/RoutePointsEditor";
import RouteOptimization, {
  RouteEndpoints,
} from "../../components/routes/RouteOptimization";
import RoutePlanningMap from "../../components/routes/RoutePlanningMap";
import { array } from "../../components/routes/routePlanning";
import "../../components/routes/routePlanner.css";
const days = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Fortaleza" });
const makeDraft = (base) => ({
  name: "",
  description: "",
  active: true,
  startsOn: today(),
  endsOn: "",
  weekdays: [1, 3, 5],
  intervalWeeks: 1,
  departureTime: "08:00",
  estimatedMinutes: 240,
  driverId: "",
  vehicleId: "",
  teamId: null,
  collectorIds: [],
  points: [],
  startPoint: base,
  endPoint: base,
  exceptions: [],
  applyToScheduled: false,
});
export default function RoutePlans() {
  const [plans, setPlans] = useState([]),
    [sources, setSources] = useState(null),
    [drivers, setDrivers] = useState([]),
    [vehicles, setVehicles] = useState([]),
    [draft, setDraft] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(null),
    [notice, setNotice] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [p, s, d, v] = await Promise.all([
        getRoutePlans(),
        getPlanningSources(),
        getAllDrivers(),
        getAllVehicles(),
      ]);
      setPlans(p.plans);
      setSources(s);
      setDrivers(array(d, "drivers"));
      setVehicles(array(v, "vehicles"));
    } catch (e) {
      setError(e.error || e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const patch = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (["points", "startPoint", "endPoint"].includes(key)) setResult(null);
  };
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await saveRoutePlan(draft.id, {
        ...draft,
        expectedVersion: draft.version,
        endsOn: draft.endsOn || null,
        driverId: draft.driverId || null,
        vehicleId: draft.vehicleId || null,
      });
      setDraft(null);
      setResult(null);
      await load();
      setNotice(
        response.plan.lastGenerationError
          ? "Roteiro salvo. Algumas execuções exigem ajuste; confira o aviso no cartão."
          : "Roteiro salvo. As próximas execuções foram programadas.",
      );
    } catch (e) {
      setError(e.error || e.message);
    } finally {
      setBusy(false);
    }
  }
  async function regenerate(id) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await generateRoutePlan(id);
      await load();
      setNotice("Programação conferida. Consulte os avisos do roteiro.");
    } catch (e) {
      setError(e.error || e.message);
    } finally {
      setBusy(false);
    }
  }
  function edit(p) {
    if (
      draft &&
      !window.confirm("Descartar a edição atual para abrir outro roteiro?")
    )
      return;
    setDraft({
      ...p,
      endsOn: p.endsOn || "",
      driverId: p.driverId || "",
      vehicleId: p.vehicleId || "",
      applyToScheduled: false,
    });
    setResult(null);
    setError("");
    setNotice("");
  }
  return (
    <main className="route-planner">
      <ManagementHeader
        title="Rotas fixas"
        description="Cadastre os pontos uma vez e mantenha a programação recorrente da cooperativa."
        actions={
          <button
            className="btn btn-success"
            disabled={loading || busy || !!draft}
            onClick={() => {
              setDraft(makeDraft(sources.base));
              setResult(null);
              setNotice("");
            }}
          >
            Nova rota fixa
          </button>
        }
      />
      <nav className="route-plan-nav">
        <Link className="btn btn-outline-success" to="/route-list">
          Programação
        </Link>
        <Link className="btn btn-success" to="/route-plans">
          Rotas fixas
        </Link>
        <Link className="btn btn-outline-success" to="/route-list?view=history">
          Histórico
        </Link>
      </nav>
      {error && (
        <p role="alert" className="alert alert-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="alert alert-success">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando roteiros e recursos…</p>
      ) : !sources ? (
        <button className="btn btn-outline-success" onClick={load}>
          Tentar novamente
        </button>
      ) : draft ? (
        <form onSubmit={save}>
          <fieldset disabled={busy}>
            <div className="route-planning-layout">
              <div className="route-planning-main">
                <section className="card p-4">
                  <h2>1. Identificação e frequência</h2>
                  <div className="route-fields">
                    <label>
                      Nome da rota fixa
                      <input
                        className="form-control"
                        required
                        minLength={2}
                        maxLength={120}
                        value={draft.name}
                        onChange={(e) => patch("name", e.target.value)}
                      />
                    </label>
                    <label>
                      Frequência
                      <select
                        className="form-select"
                        value={draft.intervalWeeks}
                        onChange={(e) =>
                          patch("intervalWeeks", Number(e.target.value))
                        }
                      >
                        <option value={1}>Semanal</option>
                        <option value={2}>Quinzenal</option>
                      </select>
                    </label>
                    <label>
                      Início da vigência
                      <input
                        className="form-control"
                        type="date"
                        required
                        value={draft.startsOn}
                        onChange={(e) => patch("startsOn", e.target.value)}
                      />
                    </label>
                    <label>
                      Fim da vigência (opcional)
                      <input
                        className="form-control"
                        type="date"
                        min={draft.startsOn}
                        value={draft.endsOn}
                        onChange={(e) => patch("endsOn", e.target.value)}
                      />
                    </label>
                    <label>
                      Saída prevista
                      <input
                        className="form-control"
                        type="time"
                        required
                        value={draft.departureTime}
                        onChange={(e) => patch("departureTime", e.target.value)}
                      />
                    </label>
                    <label>
                      Duração prevista em minutos
                      <input
                        className="form-control"
                        type="number"
                        min={15}
                        max={1440}
                        required
                        value={draft.estimatedMinutes}
                        onChange={(e) =>
                          patch("estimatedMinutes", Number(e.target.value))
                        }
                      />
                    </label>
                  </div>
                  <div className="route-plan-schedule">
                    {days.map((d, i) => (
                      <label key={d}>
                        <input
                          type="checkbox"
                          checked={draft.weekdays.includes(i)}
                          onChange={(e) =>
                            patch(
                              "weekdays",
                              e.target.checked
                                ? [...draft.weekdays, i]
                                : draft.weekdays.filter((x) => x !== i),
                            )
                          }
                        />{" "}
                        {d}
                      </label>
                    ))}
                  </div>
                  <p className="small">
                    Na frequência quinzenal, a semana da data de início é a
                    referência para alternar as semanas.
                  </p>
                  <label className="d-block">
                    Orientações
                    <textarea
                      className="form-control"
                      maxLength={3000}
                      value={draft.description}
                      onChange={(e) => patch("description", e.target.value)}
                    />
                  </label>
                  <label className="d-block mt-3">
                    Exceções e feriados: datas sem execução (uma por linha,
                    AAAA-MM-DD)
                    <textarea
                      className="form-control"
                      value={draft.exceptions.join("\n")}
                      onChange={(e) =>
                        patch("exceptions", e.target.value.split("\n"))
                      }
                      onBlur={() =>
                        patch(
                          "exceptions",
                          draft.exceptions.map((d) => d.trim()).filter(Boolean),
                        )
                      }
                    />
                  </label>
                  <label className="mt-3">
                    <input
                      type="checkbox"
                      checked={draft.active}
                      onChange={(e) => patch("active", e.target.checked)}
                    />{" "}
                    Programação ativa
                  </label>
                  <p className="small">
                    São geradas execuções para os próximos 7 dias. Pausar impede
                    novas gerações; para cancelar também as futuras ainda não
                    iniciadas, selecione a opção de aplicação abaixo. A equipe
                    confirma a saída no aplicativo.
                  </p>
                </section>
                <section className="card p-4">
                  <h2>2. Equipe habitual</h2>
                  <div className="route-fields">
                    <label>
                      Veículo
                      <select
                        className="form-select"
                        value={draft.vehicleId}
                        onChange={(e) => {
                          const v = vehicles.find(
                            (v) => v.id === e.target.value,
                          );
                          setDraft((d) => ({
                            ...d,
                            vehicleId: e.target.value,
                            driverId: v?.driverId || d.driverId,
                          }));
                        }}
                      >
                        <option value="">Definir depois</option>
                        {vehicles.map((v) => (
                          <option
                            key={v.id}
                            value={v.id}
                            disabled={v.status !== "ACTIVE"}
                          >
                            {v.plate} · {v.model}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Motorista
                      <select
                        className="form-select"
                        value={draft.driverId}
                        onChange={(e) => patch("driverId", e.target.value)}
                      >
                        <option value="">Definir depois</option>
                        {drivers.map((d) => (
                          <option
                            key={d.id}
                            value={d.id}
                            disabled={d.status === "INACTIVE"}
                          >
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <TeamPicker
                    teams={sources.teams}
                    teamId={draft.teamId}
                    disabled={busy}
                    onChange={(t) =>
                      setDraft((p) => ({
                        ...p,
                        teamId: t?.id || null,
                        collectorIds: t ? [...t.memberIds] : p.collectorIds,
                      }))
                    }
                  />
                  <p className="mt-3 mb-2">
                    Catadores da equipe — o primeiro selecionado é o responsável
                    padrão.
                  </p>
                  <div className="d-flex gap-3 flex-wrap">
                    {sources.collectors.map((c) => (
                      <label key={c.id}>
                        <input
                          type="checkbox"
                          disabled={!!draft.teamId}
                          checked={draft.collectorIds.includes(c.id)}
                          onChange={(e) =>
                            patch(
                              "collectorIds",
                              e.target.checked
                                ? [...draft.collectorIds, c.id]
                                : draft.collectorIds.filter(
                                    (id) => id !== c.id,
                                  ),
                            )
                          }
                        />{" "}
                        {c.name}
                      </label>
                    ))}
                  </div>
                </section>
                <section className="card p-4">
                  <h2>3. Saída, destino e pontos</h2>
                  <RouteEndpoints
                    startPoint={draft.startPoint}
                    endPoint={draft.endPoint}
                    onChange={patch}
                  />
                  <RouteOptimization
                    points={draft.points}
                    startPoint={draft.startPoint}
                    endPoint={draft.endPoint}
                    onOptimized={(r) => {
                      setDraft((d) => ({ ...d, points: r.points }));
                      setResult(r);
                    }}
                  />
                  <RoutePointsEditor
                    onReloadSources={async () =>
                      setSources(await getPlanningSources())
                    }
                    recurring
                    sources={sources}
                    points={draft.points}
                    onChange={(p) => patch("points", p)}
                    collectorIds={draft.collectorIds}
                  />
                </section>
              </div>
              <aside className="route-planning-aside">
                <RoutePlanningMap
                  collections={draft.points.map(pointCollection)}
                  base={sources.base}
                  startPoint={draft.startPoint}
                  endPoint={draft.endPoint}
                  geometry={result?.geometry}
                  onSelect={() => {}}
                />
                {result && (
                  <p className="alert alert-success">
                    {(result.distanceMeters / 1000).toFixed(1)} km ·{" "}
                    {Math.ceil(result.durationSeconds / 60)} min de deslocamento
                    estimado. Atendimento e trânsito não incluídos.
                  </p>
                )}
                <section className="card p-4">
                  <h2>Revisar e salvar</h2>
                  <p>
                    {draft.points.length} pontos · {draft.collectorIds.length}{" "}
                    catadores
                  </p>
                  {draft.id && (
                    <label>
                      <input
                        type="checkbox"
                        checked={draft.applyToScheduled}
                        onChange={(e) =>
                          patch("applyToScheduled", e.target.checked)
                        }
                      />{" "}
                      Aplicar também às execuções futuras já geradas, desde que
                      nenhuma coleta tenha sido iniciada.
                    </label>
                  )}
                  <p className="small mt-2">
                    Sem essa opção, as alterações valem para novas gerações.
                    Execuções iniciadas e histórico permanecem preservados.
                    Conflitos de horário impedem a geração e ficam indicados no
                    roteiro.
                  </p>
                  <button className="btn btn-success w-100" type="submit">
                    {busy ? "Salvando…" : "Salvar rota fixa"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100 mt-2"
                    onClick={() => {
                      if (
                        window.confirm("Descartar as alterações deste roteiro?")
                      )
                        setDraft(null);
                    }}
                  >
                    Cancelar edição
                  </button>
                </section>
              </aside>
            </div>
          </fieldset>
        </form>
      ) : (
        <>
          <div className="route-plan-metrics">
            <span>
              <strong>{plans.filter((p) => p.active).length}</strong> ativas
            </span>
            <span>
              <strong>{plans.filter((p) => !p.active).length}</strong> pausadas
            </span>
            <span>
              <strong>
                {plans.filter((p) => p.lastGenerationError).length}
              </strong>{" "}
              precisam de atenção
            </span>
          </div>
          {!plans.length && (
            <section className="card p-4">
              <h2>Comece pelo roteiro habitual</h2>
              <p>
                Adicione a equipe, os dias e os pontos atendidos. As viagens de
                cada data aparecerão na programação.
              </p>
            </section>
          )}
          {plans.map((p) => (
            <article className="route-plan-card" key={p.id}>
              <h3>
                {p.name} · {p.active ? "Ativa" : "Pausada"}
              </h3>
              <p>
                {p.intervalWeeks === 2 ? "Quinzenal" : "Semanal"} ·{" "}
                {p.weekdays.map((d) => days[d]).join(", ")} · {p.departureTime}
              </p>
              <p>
                {p.points.length} pontos · {p.collectorIds.length} catadores
              </p>
              {p.lastGenerationError && (
                <p
                  role="alert"
                  className="alert alert-warning"
                  style={{ whiteSpace: "pre-line" }}
                >
                  {p.lastGenerationError}
                </p>
              )}
              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-outline-success"
                  onClick={() => edit(p)}
                >
                  Editar roteiro e programação
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={busy || !p.active}
                  onClick={() => regenerate(p.id)}
                >
                  Conferir próximas execuções
                </button>
                <Link
                  className="btn btn-outline-secondary"
                  to={`/route-list?plan=${p.id}`}
                >
                  Ver execuções
                </Link>
              </div>
            </article>
          ))}
        </>
      )}
    </main>
  );
}
