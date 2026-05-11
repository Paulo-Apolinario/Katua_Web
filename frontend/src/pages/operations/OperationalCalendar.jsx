import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  House,
  MapPin,
  PackageCheck,
  Recycle,
  Route,
  Search,
  UserRound,
} from "lucide-react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import moment from "moment";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";
import { apiRequest } from "../../services/apiClient";

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const statusLabels = {
  REQUESTED: "Solicitada",
  SCHEDULED: "Agendada",
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

const statusClasses = {
  REQUESTED: "warning",
  SCHEDULED: "primary",
  PENDING: "warning",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.collections)) return response.collections;
  if (Array.isArray(response?.schedules)) return response.schedules;
  return [];
};

const getStatusLabel = (status) => statusLabels[status] || status || "N/A";

const getStatusClass = (status) => statusClasses[status] || "secondary";

const getGeneratorName = (item) => {
  return (
    item?.generator?.companyName ||
    item?.generator?.name ||
    item?.schedule?.generator?.companyName ||
    item?.schedule?.generator?.name ||
    item?.requestedBy?.displayName ||
    item?.schedule?.requestedBy?.displayName ||
    "Gerador não informado"
  );
};

const getResponsibleName = (item) => {
  return (
    item?.collector?.name ||
    item?.driver?.name ||
    item?.collector?.user?.displayName ||
    item?.driver?.user?.displayName ||
    "Responsável não definido"
  );
};

const getRouteName = (item) => {
  return item?.route?.name || item?.route?.description || "Sem rota";
};

const getCollectionWeight = (collection) => {
  const directWeight = Number(collection?.totalWeightKg || 0);

  if (directWeight > 0) return directWeight;

  const materials = Array.isArray(collection?.materials)
    ? collection.materials
    : [];

  return materials.reduce((sum, material) => {
    return (
      sum +
      Number(
        material?.quantityKg ||
          material?.weightKg ||
          material?.quantity ||
          material?.totalKg ||
          0
      )
    );
  }, 0);
};

const getEventDate = (event) => {
  return (
    event?.date ||
    event?.collectedAt ||
    event?.scheduledDate ||
    event?.preferredDate ||
    event?.createdAt ||
    null
  );
};

const getDaysInMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let firstDayOfWeek = firstDay.getDay();
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const days = [];

  for (let i = 0; i < firstDayOfWeek; i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(day);
  }

  return days;
};

const isToday = (currentDate, day) => {
  if (!day) return false;

  const today = new Date();
  const dateToCheck = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    day
  );

  return dateToCheck.toDateString() === today.toDateString();
};

const OperationalCalendar = () => {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [collections, setCollections] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const loadCalendar = async () => {
    try {
      setLoading(true);

      const [collectionsRes, schedulesRes] = await Promise.allSettled([
        apiRequest("/collections"),
        apiRequest("/schedules"),
      ]);

      setCollections(
        collectionsRes.status === "fulfilled"
          ? getArray(collectionsRes.value)
          : []
      );

      setSchedules(
        schedulesRes.status === "fulfilled" ? getArray(schedulesRes.value) : []
      );
    } catch (error) {
      console.error("Erro ao carregar calendário operacional:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, []);

  const events = useMemo(() => {
    const collectionEvents = collections.map((collection) => ({
      id: `collection-${collection.id}`,
      type: "COLLECTION",
      label: "Coleta",
      status: collection.status,
      date:
        collection.collectedAt ||
        collection.createdAt ||
        collection.schedule?.scheduledDate ||
        collection.schedule?.preferredDate,
      generator: getGeneratorName(collection),
      responsible: getResponsibleName(collection),
      route: getRouteName(collection),
      weightKg: getCollectionWeight(collection),
      raw: collection,
    }));

    const scheduleEvents = schedules.map((schedule) => ({
      id: `schedule-${schedule.id}`,
      type: "SCHEDULE",
      label: "Agendamento",
      status: schedule.status,
      date: schedule.scheduledDate || schedule.preferredDate || schedule.createdAt,
      generator: getGeneratorName(schedule),
      responsible: schedule?.requestedBy?.displayName || "Solicitante não informado",
      route: "Ainda sem rota",
      weightKg: 0,
      raw: schedule,
    }));

    return [...collectionEvents, ...scheduleEvents].filter((event) =>
      Boolean(getEventDate(event))
    );
  }, [collections, schedules]);

  const filteredEvents = useMemo(() => {
    const term = search.toLowerCase().trim();

    return events.filter((event) => {
      const eventText = [
        event.generator,
        event.responsible,
        event.route,
        event.status,
        event.label,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || eventText.includes(term);
      const matchesStatus = !statusFilter || event.status === statusFilter;
      const matchesType = !typeFilter || event.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [events, search, statusFilter, typeFilter]);

  const eventsByDate = useMemo(() => {
    const map = new Map();

    filteredEvents.forEach((event) => {
      const date = getEventDate(event);
      const key = moment(date).format("YYYY-MM-DD");

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key).push(event);
    });

    return map;
  }, [filteredEvents]);

  const stats = useMemo(() => {
    return {
      total: filteredEvents.length,
      schedules: filteredEvents.filter((event) => event.type === "SCHEDULE")
        .length,
      collections: filteredEvents.filter((event) => event.type === "COLLECTION")
        .length,
      completed: filteredEvents.filter((event) => event.status === "COMPLETED")
        .length,
    };
  }, [filteredEvents]);

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const goToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const days = getDaysInMonth(currentDate);
  const weeks = [];

  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <>
      <HeadTags title="Calendário Operacional" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Calendário Operacional</h3>

          <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
            <div className="breadcrumb-wrap">
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb pb-0 mb-0">
                  <li className="breadcrumb-item">
                    <Link to="/" className="d-flex align-items-center gap-8">
                      <House /> Painel
                    </Link>
                  </li>

                  <li className="breadcrumb-item">
                    <ChevronRight />
                  </li>

                  <li className="breadcrumb-item active">
                    Calendário Operacional
                  </li>
                </ol>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <p className="text-muted mb-1">Eventos no calendário</p>
            <h4 className="mb-0">{stats.total}</h4>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <p className="text-muted mb-1">Agendamentos</p>
            <h4 className="mb-0">{stats.schedules}</h4>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <p className="text-muted mb-1">Coletas</p>
            <h4 className="mb-0">{stats.collections}</h4>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <p className="text-muted mb-1">Concluídas</p>
            <h4 className="mb-0">{stats.completed}</h4>
          </div>
        </div>
      </div>

      <div className="card p-25 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-lg-4 col-md-6">
            <div className="filter-section search w-100">
              <div className="icon">
                <Search />
              </div>

              <input
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por gerador, rota ou responsável..."
              />
            </div>
          </div>

          <div className="col-lg-3 col-md-6">
            <select
              className="form-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Todos os tipos</option>
              <option value="SCHEDULE">Agendamentos</option>
              <option value="COLLECTION">Coletas</option>
            </select>
          </div>

          <div className="col-lg-3 col-md-6">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="REQUESTED">Solicitada</option>
              <option value="SCHEDULED">Agendada</option>
              <option value="PENDING">Pendente</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="COMPLETED">Concluída</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>

          <div className="col-lg-2 col-md-6">
            <button
              className="clear-filter w-100"
              onClick={() => {
                setSearch("");
                setTypeFilter("");
                setStatusFilter("");
              }}
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="card p-25">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div className="d-flex align-items-center gap-3">
            <button className="secondary-btn btn-sm" onClick={() => navigateMonth(-1)}>
              <ChevronLeft size={18} />
            </button>

            <div>
              <h3 className="fw-600 mb-0">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <p className="text-muted mb-0">
                Visão mensal de agendamentos e coletas.
              </p>
            </div>

            <button className="secondary-btn btn-sm" onClick={() => navigateMonth(1)}>
              <ChevronRight size={18} />
            </button>
          </div>

          <button className="primary-btn btn-sm border-0" onClick={goToday}>
            <CalendarDays size={18} />
            Hoje
          </button>
        </div>

        <SimpleBar forceVisible="x" autoHide>
          <table className="calendar-grid" style={{ minWidth: 1100 }}>
            <thead>
              <tr>
                {dayNames.map((day) => (
                  <th key={day} className="day-header">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {weeks.map((week, weekIndex) => (
                <tr key={weekIndex}>
                  {week.map((day, dayIndex) => {
                    const dateKey = day
                      ? moment(
                          new Date(
                            currentDate.getFullYear(),
                            currentDate.getMonth(),
                            day
                          )
                        ).format("YYYY-MM-DD")
                      : null;

                    const dayEvents = dateKey ? eventsByDate.get(dateKey) || [] : [];

                    return (
                      <td
                        key={`${weekIndex}-${dayIndex}`}
                        className={`calendar-cell ${!day ? "empty-cell" : ""}`}
                        style={{
                          verticalAlign: "top",
                          minHeight: 180,
                          height: 180,
                          width: 157,
                          padding: 10,
                        }}
                      >
                        {day && (
                          <>
                            <div
                              className={`day-number ${
                                isToday(currentDate, day) ? "today" : ""
                              }`}
                            >
                              {day}
                            </div>

                            <div className="d-flex flex-column gap-2 mt-2">
                              {dayEvents.slice(0, 3).map((event) => (
                                <div
                                  key={event.id}
                                  className="event-card"
                                  style={{
                                    borderLeft: `4px solid var(--bs-${getStatusClass(
                                      event.status
                                    )})`,
                                  }}
                                >
                                  <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                                    <strong className="fs-14">{event.label}</strong>

                                    <span
                                      className={`badge text-bg-${getStatusClass(
                                        event.status
                                      )}`}
                                    >
                                      {getStatusLabel(event.status)}
                                    </span>
                                  </div>

                                  <div className="event-subtitle fs-14 mb-1">
                                    <MapPin size={13} /> {event.generator}
                                  </div>

                                  <div className="event-code fs-14 mb-1">
                                    <UserRound size={13} /> {event.responsible}
                                  </div>

                                  <div className="event-code fs-14 mb-1">
                                    <Route size={13} /> {event.route}
                                  </div>

                                  {event.type === "COLLECTION" && (
                                    <div className="event-code fs-14">
                                      <Recycle size={13} />{" "}
                                      {Number(event.weightKg || 0).toFixed(2)} KG
                                    </div>
                                  )}
                                </div>
                              ))}

                              {dayEvents.length > 3 && (
                                <div className="text-muted small">
                                  +{dayEvents.length - 3} eventos
                                </div>
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
        </SimpleBar>
      </div>

      <div className="card p-25 mt-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h3 className="fw-600 mb-1">Eventos recentes</h3>
            <p className="text-muted mb-0">
              Lista complementar dos eventos exibidos no calendário.
            </p>
          </div>

          <PackageCheck color="#028C56" />
        </div>

        <SimpleBar forceVisible="x" autoHide>
          <table className="table nowrap w-100">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Gerador</th>
                <th>Responsável</th>
                <th>Rota</th>
                <th>Quantidade</th>
                <th>Data</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan="7">Nenhum evento encontrado.</td>
                </tr>
              ) : (
                filteredEvents
                  .slice()
                  .sort((a, b) => {
                    const dateA = new Date(getEventDate(a) || 0).getTime();
                    const dateB = new Date(getEventDate(b) || 0).getTime();

                    return dateB - dateA;
                  })
                  .slice(0, 12)
                  .map((event) => (
                    <tr key={event.id}>
                      <td>{event.label}</td>
                      <td>{event.generator}</td>
                      <td>{event.responsible}</td>
                      <td>{event.route}</td>
                      <td>
                        {event.type === "COLLECTION" ? (
                          <strong>
                            {Number(event.weightKg || 0).toFixed(2)} KG
                          </strong>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td>{moment(getEventDate(event)).format("DD/MM/YYYY")}</td>
                      <td>
                        <span
                          className={`badge text-bg-${getStatusClass(
                            event.status
                          )}`}
                        >
                          {getStatusLabel(event.status)}
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </SimpleBar>
      </div>
    </>
  );
};

export default OperationalCalendar;