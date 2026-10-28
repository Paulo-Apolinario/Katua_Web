import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { ManagementHeader } from "../../components/management/ManagementWorkspace";
import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";
import { apiRequest } from "../../services/apiClient";
import {
  COLLECTION_STAGES,
  STAGE_COLORS,
  generatorName,
  personName,
} from "../../utils/collectionWorkspace";
import {
  calendarDateKey,
  calendarDateLabel,
  calendarEventLink,
  collectionCalendarDate,
  scheduleCalendarDate,
  unlinkedSchedules,
  collectionMassKg,
} from "../../utils/operationalCalendar";
const labels = {
  ...COLLECTION_STAGES,
  REQUESTED: "Solicitada",
  SCHEDULED: "Agendada",
};
const colors = { ...STAGE_COLORS, REQUESTED: "warning", SCHEDULED: "primary" };
const array = (r) =>
  Array.isArray(r)
    ? r
    : r?.collections || r?.schedules || r?.items || r?.data || [];
const badge = (event) => (
  <span className={`badge text-bg-${colors[event.status] || "secondary"}`}>
    {labels[event.status] || "Situação não informada"}
  </span>
);
export default function OperationalCalendar() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState(() =>
    calendarDateKey(params.get("dia")),
  );
  const [month, setMonth] = useState(() =>
    (calendarDateKey(params.get("dia")) || calendarDateKey(new Date())).slice(
      0,
      7,
    ),
  );
  const [collections, setCollections] = useState([]),
    [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [type, setType] = useState("");
  const details = useRef(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.allSettled([
      apiRequest("/collections", { signal: controller.signal }),
      apiRequest("/schedules", { signal: controller.signal }),
    ])
      .then(([c, s]) => {
        if (!active) return;
        if (c.status === "fulfilled") setCollections(array(c.value));
        if (s.status === "fulfilled") setSchedules(array(s.value));
        if (c.status === "rejected" || s.status === "rejected")
          setError(
            "Não foi possível atualizar todos os eventos. Os dados exibidos podem estar incompletos ou desatualizados. Tente atualizar novamente.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [revision]);
  const events = useMemo(
    () => [
      ...collections.map((c) => ({
        id: `collection-${c.id}`,
        type: "COLLECTION",
        label: "Coleta",
        status: c.status,
        date: collectionCalendarDate(c),
        origin: generatorName(c),
        responsible: personName(c.collector || c.driver),
        route: c.route?.name || "Sem rota",
        weight: collectionMassKg(c),
        raw: c,
      })),
      ...unlinkedSchedules(schedules, collections).map((s) => ({
        id: `schedule-${s.id}`,
        type: "SCHEDULE",
        label: "Agendamento",
        status: s.status,
        date: scheduleCalendarDate(s),
        origin: generatorName(s),
        responsible: personName(s.requestedBy),
        route: "Aguardando atribuição",
        weight: 0,
        raw: s,
      })),
    ],
    [collections, schedules],
  );
  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          (!status || e.status === status) &&
          (!type || e.type === type) &&
          (!search.trim() ||
            [e.origin, e.responsible, e.route, labels[e.status], e.label]
              .join(" ")
              .toLocaleLowerCase("pt-BR")
              .includes(search.trim().toLocaleLowerCase("pt-BR"))),
      ),
    [events, status, type, search],
  );
  const dated = filtered.filter((e) => calendarDateKey(e.date));
  const visible = dated.filter((e) =>
    calendarDateKey(e.date).startsWith(month),
  );
  const byDate = new Map();
  for (const event of dated) {
    const key = calendarDateKey(event.date);
    byDate.set(key, [...(byDate.get(key) || []), event]);
  }
  const undated = filtered.length - dated.length;
  const [year, number] = month.split("-").map(Number),
    first = new Date(year, number - 1, 1),
    offset = (first.getDay() + 6) % 7,
    length = new Date(year, number, 0).getDate();
  const cells = Array.from(
    { length: Math.ceil((offset + length) / 7) * 7 },
    (_, i) => (i >= offset && i < offset + length ? i - offset + 1 : null),
  );
  const today = calendarDateKey(new Date());
  function changeMonth(delta) {
    const d = new Date(year, number - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setSelected(null);
  }
  function selectDay(key, items, showAll = false) {
    if (!showAll && items.length === 1)
      return navigate(calendarEventLink(items[0]));
    setSelected(key);
    setParams({ dia: key }, { replace: true });
    requestAnimationFrame(() => {
      details.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      details.current?.focus({ preventScroll: true });
    });
  }
  return (
    <>
      <HeadTags title="Calendário Operacional" />
      <TopProgressBar loading={loading} />
      <ManagementHeader
        title="Calendário Operacional"
        description="Programação e execução das coletas. Abra um evento para consultar seus detalhes."
        actions={
          <button
            className="secondary-btn btn-sm"
            disabled={loading}
            onClick={() => setRevision((n) => n + 1)}
          >
            <RefreshCw size={16} />
            {loading ? "Atualizando..." : "Atualizar calendário"}
          </button>
        }
      />
      {error && (
        <div className="alert alert-warning" role="alert">
          {error}
        </div>
      )}
      {undated > 0 && (
        <div className="alert alert-info">
          {undated} {undated === 1 ? "registro sem data" : "registros sem data"} de coleta ou programação.{" "}
          <Link to="/waste-list">Consultar coletas</Link> ·{" "}
          <Link to="/collection-requests">Consultar solicitações</Link>. A data
          de criação não é usada como agendamento.
        </div>
      )}
      <div className="row g-3 mb-4">
        {[
          ["Eventos no mês", visible.length],
          ["Agendamentos", visible.filter((e) => e.type === "SCHEDULE").length],
          ["Coletas", visible.filter((e) => e.type === "COLLECTION").length],
          [
            "Concluídas",
            visible.filter((e) => e.status === "COMPLETED").length,
          ],
        ].map(([label, value]) => (
          <div className="col-sm-6 col-xl-3" key={label}>
            <div className="card p-4 h-100">
              <p className="text-muted mb-1">{label}</p>
              <strong className="fs-4">{value}</strong>
            </div>
          </div>
        ))}
      </div>
      <div className="card p-4 mb-4">
        <div className="row g-3">
          <label className="col-md-4">
            Buscar por ponto, rota ou responsável
            <input
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="col-md-3">
            Tipo
            <select
              className="form-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Todos os tipos</option>
              <option value="COLLECTION">Coletas</option>
              <option value="SCHEDULE">Agendamentos</option>
            </select>
          </label>
          <label className="col-md-3">
            Status
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="col-md-2 d-flex align-items-end">
            <button
              className="secondary-btn w-100"
              onClick={() => {
                setSearch("");
                setStatus("");
                setType("");
              }}
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>
      <section className="card p-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
          <div className="d-flex align-items-center gap-3">
            <button
              className="secondary-btn btn-sm"
              aria-label="Mês anterior"
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="mb-0">
              {new Intl.DateTimeFormat("pt-BR", {
                month: "long",
                year: "numeric",
              }).format(first)}
            </h2>
            <button
              className="secondary-btn btn-sm"
              aria-label="Próximo mês"
              onClick={() => changeMonth(1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            className="primary-btn btn-sm"
            onClick={() => {
              setMonth(today.slice(0, 7));
              selectDay(today, byDate.get(today) || [], true);
            }}
          >
            <CalendarDays size={16} />
            Hoje
          </button>
        </div>
        <p className="small text-muted">
          Clique no evento para abrir seus detalhes. Dias com vários eventos
          permitem consultar a agenda completa.
        </p>
        <div className="table-responsive">
          <table className="calendar-grid operational-calendar-grid">
            <thead>
              <tr>
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                  <th key={d} scope="col">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: cells.length / 7 }, (_, week) => (
                <tr key={week}>
                  {cells.slice(week * 7, week * 7 + 7).map((day, i) => {
                    const key = day
                        ? `${month}-${String(day).padStart(2, "0")}`
                        : null,
                      items = key ? byDate.get(key) || [] : [];
                    return (
                      <td
                        key={i}
                        className={key === today ? "calendar-today" : ""}
                      >
                        {day && (
                          <>
                            <button
                              className="calendar-day-button"
                              aria-label={`Ver agenda de ${calendarDateLabel(key)}`}
                              aria-pressed={selected === key}
                              onClick={() => selectDay(key, items)}
                            >
                              {day}
                            </button>
                            <div className="d-grid gap-2 mt-2">
                              {items.slice(0, 3).map((e) => (
                                <Link
                                  className="calendar-event-link"
                                  key={e.id}
                                  to={calendarEventLink(e)}
                                  aria-label={`Abrir ${e.label.toLowerCase()} de ${e.origin}: ${labels[e.status]}`}
                                >
                                  <div className="d-flex justify-content-between flex-wrap gap-1">
                                    <strong>{e.label}</strong>
                                    {badge(e)}
                                  </div>
                                  <div>{e.origin}</div>
                                  <small>
                                    {e.responsible} · {e.route}
                                  </small>
                                </Link>
                              ))}
                              {items.length > 3 && (
                                <button
                                  className="calendar-more-button"
                                  onClick={() => selectDay(key, items, true)}
                                >
                                  Ver todos os {items.length} eventos
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {selected && (
        <section
          className="card p-4 mt-4"
          ref={details}
          tabIndex={-1}
          aria-label={`Agenda de ${calendarDateLabel(selected)}`}
        >
          <h3>Agenda de {calendarDateLabel(selected)}</h3>
          {!(byDate.get(selected) || []).length && (
            <p>
              Nenhum evento corresponde a esta data e aos filtros selecionados.
            </p>
          )}
          <div className="d-grid gap-2">
            {(byDate.get(selected) || []).map((e) => (
              <Link
                className="calendar-day-detail"
                key={e.id}
                to={calendarEventLink(e)}
              >
                <strong>{e.origin}</strong>
                <span>
                  {e.label} · {labels[e.status]} · {e.responsible}
                </span>
                <span>
                  Abrir {e.type === "COLLECTION" ? "coleta" : "solicitação"} →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="card p-4 mt-4">
        <h3>Eventos do mês</h3>
        <p className="text-muted">
          Até 12 eventos, por data de programação ou coleta. Selecione um dia no
          calendário para consultar todos os registros daquela data.
        </p>
        <div className="table-responsive">
          <table className="table calendar-events-table">
            <thead>
              <tr>
                {[
                  "Origem",
                  "Tipo",
                  "Data",
                  "Responsável",
                  "Rota",
                  "Peso em kg",
                  "Situação",
                  "Ação",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!visible.length ? (
                <tr>
                  <td colSpan={8}>
                    {loading
                      ? "Carregando eventos..."
                      : "Nenhum evento corresponde ao mês e aos filtros selecionados."}
                  </td>
                </tr>
              ) : (
                visible
                  .slice()
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .slice(0, 12)
                  .map((e) => (
                    <tr key={e.id}>
                      <td>{e.origin}</td>
                      <td>{e.label}</td>
                      <td>{calendarDateLabel(e.date)}</td>
                      <td>{e.responsible}</td>
                      <td>{e.route}</td>
                      <td>
                        {e.weight > 0
                          ? `${e.weight.toLocaleString("pt-BR")} kg`
                          : "Sem peso registrado"}
                      </td>
                      <td>{badge(e)}</td>
                      <td>
                        <Link
                          className="secondary-btn btn-sm"
                          to={calendarEventLink(e)}
                        >
                          Abrir{" "}
                          {e.type === "COLLECTION" ? "coleta" : "solicitação"}
                        </Link>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
