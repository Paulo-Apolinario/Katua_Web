import RoutePointsEditor from "./RoutePointsEditor";
import RouteOptimization, { RouteEndpoints } from "./RouteOptimization";
import {
  getPlanningSources,
  pointCollection,
} from "../../services/routePlanningService";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { ManagementHeader } from "../management/ManagementWorkspace";
import HeadTags from "../HeadTags";
import { getAllVehicles } from "../../services/vehicleService";
import { getAllDrivers } from "../../services/driverService";
import { getMe } from "../../services/authService";
import {
  createRoute,
  updateRoute,
  getRouteById,
  getAllRoutes,
  getAvailableCollections,
  updateRouteStatus,
} from "../../services/routeService";
import { hasCoordinates } from "../maps/mapPin";
import RoutePlanningMap from "./RoutePlanningMap";
import {
  address,
  array,
  dateKey,
  editableCollection,
  origin,
  materialsLabel,
  quantities,
  quantitiesLabel,
  status,
  title,
  toBr,
  validDate,
} from "./routePlanning";
import "./routePlanner.css";
const archivedPoint = (c) =>
  c.cancellationReason === "Substituída por revisão do roteiro fixo";
const empty = {
  name: "",
  description: "",
  date: "",
  driverId: "",
  vehicleId: "",
  stops: [],
  collectorIds: [],
  startPoint: null,
  endPoint: null,
  departureTime: "",
  estimatedMinutes: 240,
};
export default function RoutePlanner({ id }) {
  const navigate = useNavigate(),
    pending = useRef(false);
  const [snapshot, setSnapshot] = useState("");
  const [editingPoint, setEditingPoint] = useState(null);
  const [roadResult, setRoadResult] = useState(null);
  const [data, setData] = useState(null),
    [form, setForm] = useState(empty),
    [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [loadError, setLoadError] = useState(""),
    [error, setError] = useState("");
  const [search, setSearch] = useState(""),
    [city, setCity] = useState(""),
    [type, setType] = useState(""),
    [neighborhood, setNeighborhood] = useState(""),
    [date, setDate] = useState(""),
    [page, setPage] = useState(1),
    [active, setActive] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [v, d, r, available, me, existing, sources] = await Promise.all([
        getAllVehicles(),
        getAllDrivers(),
        getAllRoutes(),
        getAvailableCollections(),
        getMe(),
        id ? getRouteById(id) : null,
        getPlanningSources(),
      ]);
      const route = existing?.route || existing?.data || existing;
      setData({
        vehicles: array(v, "vehicles"),
        drivers: array(d, "drivers"),
        routes: array(r, "routes"),
        available: array(available, "collections"),
        base: me.user?.cooperative,
        sources,
        route,
      });
      setForm(
        route
          ? {
              name: route.name,
              description: route.description || "",
              date: dateKey(route.scheduledDate),
              driverId: route.driverId || "",
              vehicleId: route.vehicleId || "",
              stops: route.stops || [],
              collectorIds: route.collectorIds || [],
              startPoint: route.startPoint || sources.base,
              endPoint: route.endPoint || sources.base,
              departureTime: route.departureTime || "",
              estimatedMinutes: route.estimatedMinutes || 240,
            }
          : { ...empty, startPoint: sources.base, endPoint: sources.base },
      );
      setSelected(route?.collections || []);
      setSnapshot(
        JSON.stringify({
          form: route
            ? {
                name: route.name,
                description: route.description || "",
                date: dateKey(route.scheduledDate),
                driverId: route.driverId || "",
                vehicleId: route.vehicleId || "",
                stops: route.stops || [],
                collectorIds: route.collectorIds || [],
                startPoint: route.startPoint || sources.base,
                endPoint: route.endPoint || sources.base,
                departureTime: route.departureTime || "",
                estimatedMinutes: route.estimatedMinutes || 240,
              }
            : { ...empty, startPoint: sources.base, endPoint: sources.base },
          ids: (route?.collections || []).map((c) => c.id),
          points: (route?.collections || [])
            .filter((c) => c.routePoint)
            .map((c) => c.routePoint),
        }),
      );
    } catch (e) {
      setLoadError(
        e.error || e.message || "Não foi possível carregar o planejamento.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  const locked = ["COMPLETED", "CANCELLED"].includes(data?.route?.status);
  const dirty =
    snapshot !==
    JSON.stringify({
      form,
      ids: selected.map((c) => c.id),
      points: selected.filter((c) => c.routePoint).map((c) => c.routePoint),
    });
  useEffect(
    () => setRoadResult(null),
    [selected, form.startPoint, form.endPoint],
  );
  useEffect(() => {
    if (error) {
      document.getElementById("route-planning-error")?.focus();
    }
  }, [error]);
  const vehicle = data?.vehicles.find((v) => v.id === form.vehicleId),
    driver = data?.drivers.find((d) => d.id === form.driverId);
  const patch = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  };
  const available = useMemo(
    () =>
      (data?.available || []).filter(
        (c) => !selected.some((s) => s.id === c.id),
      ),
    [data, selected],
  );
  const filtered = useMemo(
    () =>
      available.filter((c) => {
        const p = origin(c);
        return (
          (!city || p.city === city) &&
          (!neighborhood || p.neighborhood === neighborhood) &&
          (!type || (c.bin ? "PEV" : "GENERATOR") === type) &&
          (!date || dateKey(c.schedule?.scheduledDate) === date) &&
          [title(c), address(c), c.id]
            .join(" ")
            .toLocaleLowerCase("pt-BR")
            .includes(search.toLocaleLowerCase("pt-BR"))
        );
      }),
    [available, search, city, neighborhood, type, date],
  );
  const conflicts = (data?.routes || []).filter(
    (r) =>
      r.id !== id &&
      ["SCHEDULED", "IN_PROGRESS"].includes(r.status) &&
      form.date &&
      dateKey(r.scheduledDate) === form.date &&
      ((form.driverId && r.driverId === form.driverId) ||
        (form.vehicleId && r.vehicleId === form.vehicleId)),
  );
  const visits = selected.filter((c) => !archivedPoint(c));
  const archived = selected.filter(archivedPoint);
  const amounts = visits.reduce((all, c) => {
    for (const [u, n] of Object.entries(quantities(c)))
      all[u] = (all[u] || 0) + n;
    return all;
  }, {});
  const missing = visits.filter((c) => !hasCoordinates(origin(c))).length;
  const unknown = visits.filter(
    (c) => !Object.keys(quantities(c)).length,
  ).length;
  function move(index, delta) {
    setSelected((items) => {
      const next = [...items];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }
  async function save(e) {
    e.preventDefault();
    if (pending.current || locked) return;
    if (form.name.trim().length < 2)
      return setError("Informe um nome com ao menos dois caracteres.");
    if (form.date && !validDate(form.date))
      return setError("Informe uma data válida.");
    if (vehicle && vehicle.status !== "ACTIVE")
      return setError("Selecione um veículo ativo, fora de manutenção.");
    if (driver?.status === "INACTIVE")
      return setError("Selecione um motorista ativo.");
    if (
      vehicle?.driverId &&
      form.driverId &&
      vehicle.driverId !== form.driverId
    )
      return setError(
        "O veículo está vinculado a outro motorista. Escolha um par compatível.",
      );
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        description: form.description,
        scheduledDate: toBr(form.date),
        collectorIds: form.collectorIds,
        startPoint: hasCoordinates(form.startPoint)
          ? form.startPoint
          : undefined,
        endPoint: hasCoordinates(form.endPoint) ? form.endPoint : undefined,
        departureTime: form.departureTime || undefined,
        estimatedMinutes: form.estimatedMinutes,
        expectedRevision: data.route?.revision,
        driverId: form.driverId || null,
        vehicleId: form.vehicleId || null,
        stops: form.stops.filter((s) => s.trim()),
        collectionIds: selected.filter((c) => !c._planned).map((c) => c.id),
        plannedPoints: selected
          .filter((c) => c._planned)
          .map((c) => c.routePoint),
        pointUpdates: selected
          .filter(
            (c) =>
              !c._planned &&
              c.routePoint &&
              c.status === "PENDING" &&
              JSON.stringify(c.routePoint) !==
                JSON.stringify(
                  data.route?.collections?.find((old) => old.id === c.id)
                    ?.routePoint,
                ),
          )
          .map((c) => ({ collectionId: c.id, point: c.routePoint })),
        visitOrder: selected.map((c) => (c._planned ? c.routePoint.key : c.id)),
      };
      if (id) await updateRoute(id, payload);
      else await createRoute({ ...payload, status: "SCHEDULED" });
      toast.success(
        id ? "Planejamento atualizado." : "Rota agendada com sucesso.",
      );
      navigate("/route-list");
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Não foi possível confirmar o salvamento pela conexão. Confira a lista de rotas antes de reenviar."
          : e.error ||
              e.message ||
              "Não foi possível salvar. Confira os dados e tente novamente.",
      );
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  async function changeStatus(next) {
    if (pending.current) return;
    if (dirty)
      return setError(
        "Salve o planejamento antes de mudar a situação da rota.",
      );
    if (
      next === "CANCELLED" &&
      !window.confirm("Cancelar esta rota? O histórico será preservado.")
    )
      return;
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      await updateRouteStatus(id, next);
      toast.success("Situação atualizada.");
      await load();
    } catch (e) {
      setError(
        e.error || e.message || "Não foi possível atualizar a situação.",
      );
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  return (
    <main className="route-planner">
      <HeadTags title={id ? "Planejar rota" : "Cadastrar rota"} />
      <ManagementHeader
        title={id ? "Planejar rota" : "Cadastrar rota"}
        description="Organize as coletas, confira a equipe e defina a sequência de visitas."
        actions={
          <Link className="btn btn-outline-secondary" to="/route-list">
            <ArrowLeft size={16} /> Voltar às rotas
          </Link>
        }
      />
      {loading ? (
        <p role="status" className="card p-4">
          Carregando coletas, frota e programação...
        </p>
      ) : loadError ? (
        <div role="alert" className="alert alert-danger">
          {loadError}
          <button
            type="button"
            className="btn btn-outline-danger ms-2"
            onClick={load}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {error && (
            <div
              id="route-planning-error"
              tabIndex={-1}
              role="alert"
              className="alert alert-danger"
            >
              {error}
            </div>
          )}
          {locked && (
            <p className="alert alert-info">
              Rota {status(data.route.status).toLowerCase()}. Planejamento e
              histórico disponíveis para consulta.
            </p>
          )}
          <form onSubmit={save}>
            <fieldset disabled={saving}>
              <div className="route-planning-layout">
                <div className="route-planning-main">
                  <section className="card p-4">
                    <h2>1. Identificação e programação</h2>
                    <div className="route-fields">
                      <label>
                        Nome da rota *
                        <input
                          className="form-control"
                          required
                          minLength={2}
                          maxLength={120}
                          disabled={locked}
                          value={form.name}
                          onChange={(e) => patch("name", e.target.value)}
                          placeholder="Ex.: Sobral · Centro · Coleta seletiva"
                        />
                      </label>
                      <label>
                        Data programada
                        <input
                          className="form-control"
                          type="date"
                          disabled={locked}
                          value={form.date}
                          onChange={(e) => patch("date", e.target.value)}
                        />
                      </label>
                    </div>
                    {!form.date && (
                      <p className="small text-warning mt-2">
                        Sem data definida. A rota ficará agendada, pendente de
                        programação.
                      </p>
                    )}
                    <label className="d-block mt-3">
                      Orientações para a equipe
                      <textarea
                        className="form-control"
                        maxLength={3000}
                        disabled={locked}
                        value={form.description}
                        onChange={(e) => patch("description", e.target.value)}
                        placeholder="Acesso ao local, cuidados e instruções de coleta."
                      />
                    </label>
                  </section>
                  <section className="card p-4">
                    <h2>2. Veículo e equipe</h2>
                    <div className="route-fields">
                      <label>
                        Veículo
                        <select
                          aria-label="Veículo"
                          className="form-select"
                          disabled={locked}
                          value={form.vehicleId}
                          onChange={(e) => {
                            const v = data.vehicles.find(
                              (v) => v.id === e.target.value,
                            );
                            setForm((f) => ({
                              ...f,
                              vehicleId: e.target.value,
                              driverId:
                                v?.driverId &&
                                data.drivers.some(
                                  (d) =>
                                    d.id === v.driverId &&
                                    d.status !== "INACTIVE",
                                )
                                  ? v.driverId
                                  : f.driverId,
                            }));
                          }}
                        >
                          <option value="">Definir depois</option>
                          {data.vehicles.map((v) => (
                            <option
                              key={v.id}
                              value={v.id}
                              disabled={v.status !== "ACTIVE"}
                            >
                              {v.plate} · {v.model} ·{" "}
                              {v.status === "ACTIVE"
                                ? "Ativo"
                                : v.status === "MAINTENANCE"
                                  ? "Em manutenção"
                                  : "Inativo"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Motorista
                        <select
                          aria-label="Motorista"
                          className="form-select"
                          disabled={locked}
                          value={form.driverId}
                          onChange={(e) => patch("driverId", e.target.value)}
                        >
                          <option value="">Definir depois</option>
                          {data.drivers.map((d) => (
                            <option
                              key={d.id}
                              value={d.id}
                              disabled={d.status === "INACTIVE"}
                            >
                              {d.name} ·{" "}
                              {d.status === "INACTIVE"
                                ? "Inativo"
                                : d.status === "ON_ROUTE"
                                  ? "Em rota"
                                  : "Disponível"}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {vehicle && (
                      <p className="small mt-2">
                        {vehicle.plate} · {vehicle.brand} {vehicle.model} ·
                        Capacidade cadastrada:{" "}
                        {Number(vehicle.capacityKg) > 0
                          ? Number(vehicle.capacityKg).toLocaleString("pt-BR") +
                            " kg"
                          : "não informada"}
                        .{" "}
                        {vehicle.driverId &&
                          "Motorista vinculado ao veículo sugerido automaticamente quando ativo."}
                      </p>
                    )}
                    {vehicle?.driverId &&
                      form.driverId &&
                      vehicle.driverId !== form.driverId && (
                        <p role="status" className="alert alert-warning">
                          O veículo pertence a outro motorista. Ajuste a seleção
                          antes de salvar.
                        </p>
                      )}
                    {!!conflicts.length && (
                      <div role="status" className="alert alert-warning">
                        Possível conflito na mesma data:{" "}
                        {conflicts.map((r) => r.name).join("; ")}. Confira a
                        agenda. Sem horário definido, não é possível afirmar
                        sobreposição.
                      </div>
                    )}
                  </section>
                  <section className="card p-4">
                    <h2>Catadores e horário</h2>
                    <div className="route-fields">
                      <label>
                        Saída prevista
                        <input
                          className="form-control"
                          type="time"
                          disabled={locked}
                          value={form.departureTime}
                          onChange={(e) =>
                            patch("departureTime", e.target.value)
                          }
                        />
                      </label>
                      <label>
                        Duração prevista (minutos)
                        <input
                          type="number"
                          min={15}
                          max={1440}
                          className="form-control"
                          disabled={locked}
                          value={form.estimatedMinutes}
                          onChange={(e) =>
                            patch("estimatedMinutes", Number(e.target.value))
                          }
                        />
                      </label>
                    </div>
                    <div className="d-flex gap-3 flex-wrap mt-3">
                      {data.sources.collectors.map((c) => (
                        <label key={c.id}>
                          <input
                            type="checkbox"
                            disabled={locked}
                            checked={form.collectorIds.includes(c.id)}
                            onChange={(e) =>
                              patch(
                                "collectorIds",
                                e.target.checked
                                  ? [...form.collectorIds, c.id]
                                  : form.collectorIds.filter(
                                      (id) => id !== c.id,
                                    ),
                              )
                            }
                          />{" "}
                          {c.name}
                        </label>
                      ))}
                    </div>
                    <p className="small mt-2">
                      O primeiro catador selecionado será responsável pelos
                      novos pontos sem responsável específico.
                    </p>
                    <RouteEndpoints
                      startPoint={form.startPoint}
                      endPoint={form.endPoint}
                      onChange={patch}
                      disabled={locked}
                    />
                  </section>
                  <section className="card p-4">
                    <h2>3. Sequência de coletas</h2>
                    <p className="small">
                      Selecione as coletas disponíveis abaixo. Cada coleta
                      representa uma visita na sequência; operações no mesmo
                      endereço continuam identificadas separadamente.
                    </p>
                    <RouteOptimization
                      disabled={locked || data.route?.status === "IN_PROGRESS"}
                      points={visits.map((c) => ({
                        ...origin(c),
                        key: c.id,
                        kind: "ADDRESS",
                        name: title(c),
                        address: address(c),
                        latitude: origin(c).latitude,
                        longitude: origin(c).longitude,
                      }))}
                      startPoint={form.startPoint}
                      endPoint={form.endPoint}
                      onOptimized={(r) => {
                        setSelected([
                          ...r.points.map((p) =>
                            selected.find((c) => c.id === p.key),
                          ),
                          ...archived,
                        ]);
                        setTimeout(() => setRoadResult(r), 0);
                      }}
                    />
                    <ol className="route-stop-list">
                      {visits.map((c, i) => (
                        <li
                          key={c.id}
                          className={
                            active === c.id ? "route-stop-selected" : ""
                          }
                        >
                          <div>
                            <button
                              type="button"
                              className="route-stop-title"
                              onClick={() => setActive(c.id)}
                            >
                              {i + 1}. {title(c)}
                            </button>
                            <span className="small d-block">
                              {c.bin || c.routePoint?.kind === "PEV"
                                ? "PEV"
                                : c.routePoint?.kind === "ADDRESS"
                                  ? "Ponto avulso"
                                  : "Gerador"}{" "}
                              · {status(c.status)} · {c.id.slice(-8)}
                            </span>
                            <span className="small d-block">{address(c)}</span>
                            <span className="small d-block">
                              {materialsLabel(c)}
                            </span>
                            <span className="small d-block">
                              {quantitiesLabel(quantities(c))} · Catador:{" "}
                              {c.collector?.name || "Não definido"}
                            </span>
                            {!hasCoordinates(origin(c)) && (
                              <span className="small text-warning d-block">
                                Sem coordenadas.{" "}
                                <Link
                                  to={
                                    c.bin
                                      ? "/edit-bin/" + c.bin.id
                                      : c.generator
                                        ? "/edit-generator/" +
                                          c.generator.id +
                                          "?localizacao=1"
                                        : "/generator-list"
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Completar cadastro em outra aba
                                </Link>
                                ; depois recarregue o planejamento.
                              </span>
                            )}
                            {!locked &&
                              !c._planned &&
                              c.routePoint &&
                              c.status === "PENDING" &&
                              data.route?.status === "SCHEDULED" && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-success mt-2"
                                  onClick={() => setEditingPoint(c.id)}
                                >
                                  Editar endereço e orientações
                                </button>
                              )}
                            {!editableCollection(c) && (
                              <span className="small text-muted d-block">
                                Vínculo preservado no histórico.
                              </span>
                            )}
                          </div>
                          <div className="route-stop-actions">
                            <button
                              type="button"
                              aria-label={"Subir coleta " + (i + 1)}
                              disabled={locked || i === 0}
                              onClick={() => move(i, -1)}
                            >
                              <ArrowUp size={17} />
                            </button>
                            <button
                              type="button"
                              aria-label={"Descer coleta " + (i + 1)}
                              disabled={locked || i === visits.length - 1}
                              onClick={() => move(i, 1)}
                            >
                              <ArrowDown size={17} />
                            </button>
                            <button
                              type="button"
                              aria-label={"Remover coleta " + (i + 1)}
                              disabled={locked || !editableCollection(c)}
                              onClick={() =>
                                setSelected((items) =>
                                  items.filter((s) => s.id !== c.id),
                                )
                              }
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                    {editingPoint && (
                      <RoutePointsEditor
                        hideSources
                        sources={data.sources}
                        collectorIds={form.collectorIds}
                        points={selected
                          .filter((c) => c.id === editingPoint)
                          .map((c) => c.routePoint)}
                        onChange={(points) => {
                          setSelected((current) =>
                            current
                              .filter(
                                (c) => c.id !== editingPoint || points.length,
                              )
                              .map((c) =>
                                c.id === editingPoint
                                  ? { ...c, routePoint: points[0] }
                                  : c,
                              ),
                          );
                          setEditingPoint(null);
                        }}
                      />
                    )}
                    {!!archived.length && (
                      <details className="mt-3">
                        <summary>
                          {archived.length} atendimentos substituídos —
                          histórico preservado
                        </summary>
                        {archived.map((c) => (
                          <p key={c.id} className="small mt-2">
                            {title(c)} · {address(c)} · {c.cancellationReason}
                          </p>
                        ))}
                      </details>
                    )}
                    {!visits.length && (
                      <p>
                        Nenhuma coleta selecionada. Você pode salvar o
                        planejamento e completar depois.
                      </p>
                    )}
                    {!!data.route?.collections?.filter(
                      (c) =>
                        editableCollection(c) &&
                        !selected.some((s) => s.id === c.id),
                    ).length && (
                      <div className="d-flex flex-wrap gap-2">
                        {data.route.collections
                          .filter(
                            (c) =>
                              editableCollection(c) &&
                              !selected.some((s) => s.id === c.id),
                          )
                          .map((c) => (
                            <button
                              type="button"
                              key={c.id}
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => setSelected((s) => [...s, c])}
                            >
                              Restaurar {title(c)}
                            </button>
                          ))}
                      </div>
                    )}
                  </section>
                  {!locked && (
                    <section className="card p-4">
                      <h2>Coletas disponíveis</h2>
                      <p className="small">
                        Pendentes ou em andamento, sem vínculo com outra rota.
                        Selecionar aqui não cria uma nova coleta.
                      </p>
                      <div className="route-fields">
                        <label>
                          Buscar coleta
                          <input
                            className="form-control"
                            value={search}
                            onChange={(e) => {
                              setSearch(e.target.value);
                              setPage(1);
                            }}
                            placeholder="Nome, endereço ou código"
                          />
                        </label>
                        <label>
                          Município
                          <select
                            aria-label="Município"
                            className="form-select"
                            value={city}
                            onChange={(e) => {
                              setCity(e.target.value);
                              setNeighborhood("");
                              setPage(1);
                            }}
                          >
                            <option value="">Todos</option>
                            {[
                              ...new Set(
                                available
                                  .map((c) => origin(c).city)
                                  .filter(Boolean),
                              ),
                            ]
                              .sort()
                              .map((c) => (
                                <option key={c}>{c}</option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Bairro
                          <select
                            aria-label="Bairro"
                            className="form-select"
                            value={neighborhood}
                            onChange={(e) => {
                              setNeighborhood(e.target.value);
                              setPage(1);
                            }}
                          >
                            <option value="">Todos</option>
                            {[
                              ...new Set(
                                available
                                  .filter(
                                    (c) => !city || origin(c).city === city,
                                  )
                                  .map((c) => origin(c).neighborhood)
                                  .filter(Boolean),
                              ),
                            ]
                              .sort()
                              .map((n) => (
                                <option key={n}>{n}</option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Origem
                          <select
                            aria-label="Origem"
                            className="form-select"
                            value={type}
                            onChange={(e) => {
                              setType(e.target.value);
                              setPage(1);
                            }}
                          >
                            <option value="">Geradores e PEVs</option>
                            <option value="GENERATOR">Gerador</option>
                            <option value="PEV">PEV</option>
                          </select>
                        </label>
                        <label>
                          Data programada da coleta
                          <input
                            type="date"
                            className="form-control"
                            value={date}
                            onChange={(e) => {
                              setDate(e.target.value);
                              setPage(1);
                            }}
                          />
                        </label>
                      </div>
                      <div className="route-available-list mt-3">
                        {filtered.slice((page - 1) * 8, page * 8).map((c) => (
                          <article key={c.id}>
                            <div>
                              <strong>{title(c)}</strong>
                              <span className="small d-block">
                                {c.bin || c.routePoint?.kind === "PEV"
                                  ? "PEV"
                                  : c.routePoint?.kind === "ADDRESS"
                                    ? "Ponto avulso"
                                    : "Gerador"}{" "}
                                · {address(c)}
                              </span>
                              <span className="small d-block">
                                {materialsLabel(c)}
                              </span>
                              <span className="small d-block">
                                {quantitiesLabel(quantities(c))} ·{" "}
                                {status(c.status)} · Catador:{" "}
                                {c.collector?.name || "Não definido"}
                              </span>
                              <span className="small d-block">
                                Programação:{" "}
                                {c.schedule?.scheduledDate
                                  ? new Date(
                                      c.schedule.scheduledDate,
                                    ).toLocaleDateString("pt-BR", {
                                      timeZone: "America/Fortaleza",
                                    })
                                  : "Não definida"}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              disabled={selected.length >= 200}
                              onClick={() => {
                                setSelected((s) =>
                                  s.some((x) => x.id === c.id) ? s : [...s, c],
                                );
                                setPage(1);
                              }}
                            >
                              <Plus size={15} /> Adicionar coleta
                            </button>
                          </article>
                        ))}
                      </div>
                      {!filtered.length && (
                        <p className="mt-3">
                          Nenhuma coleta disponível para estes filtros.
                        </p>
                      )}
                      <div className="d-flex gap-2 align-items-center mt-3">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={page === 1}
                          onClick={() => setPage((p) => p - 1)}
                        >
                          Anterior
                        </button>
                        <span className="small">
                          {filtered.length} disponíveis · Página {page}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={page * 8 >= filtered.length}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Próxima
                        </button>
                      </div>
                    </section>
                  )}
                  {!locked && (
                    <section className="card p-4">
                      <h2>Adicionar PEV, gerador ou endereço</h2>
                      <p className="small">
                        Novos pontos geram atendimentos ao salvar esta execução.
                        Para programação recorrente, use{" "}
                        <Link to="/route-plans">Rotas fixas</Link>.
                      </p>
                      <RoutePointsEditor
                        onReloadSources={async () => {
                          const sources = await getPlanningSources();
                          setData((d) => ({ ...d, sources }));
                        }}
                        sources={data.sources}
                        collectorIds={form.collectorIds}
                        points={selected
                          .filter((c) => c._planned)
                          .map((c) => c.routePoint)}
                        onChange={(points) =>
                          setSelected((current) => [
                            ...current.filter((c) => !c._planned),
                            ...points.map((p) => ({
                              ...pointCollection(p),
                              _planned: true,
                            })),
                          ])
                        }
                      />
                    </section>
                  )}
                  <section className="card p-4">
                    <h2>4. Paradas e orientações adicionais</h2>
                    <p className="small">
                      Inclua pontos de apoio e orientações adicionais. Estas
                      paradas em texto não criam coletas nem recebem coordenadas
                      automaticamente.
                    </p>
                    {form.stops.map((stop, i) => (
                      <div className="d-flex gap-2 mb-2" key={i}>
                        <input
                          aria-label={"Parada adicional " + (i + 1)}
                          className="form-control"
                          maxLength={500}
                          disabled={locked}
                          value={stop}
                          onChange={(e) =>
                            patch(
                              "stops",
                              form.stops.map((s, n) =>
                                n === i ? e.target.value : s,
                              ),
                            )
                          }
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          aria-label={"Remover parada adicional " + (i + 1)}
                          disabled={locked}
                          onClick={() =>
                            patch(
                              "stops",
                              form.stops.filter((_, n) => n !== i),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {!locked && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={form.stops.length >= 100}
                        onClick={() => patch("stops", [...form.stops, ""])}
                      >
                        Adicionar parada em texto
                      </button>
                    )}
                  </section>
                </div>
                <aside className="route-planning-aside">
                  <RoutePlanningMap
                    collections={visits}
                    base={data.base}
                    geometry={roadResult?.geometry}
                    startPoint={form.startPoint}
                    endPoint={form.endPoint}
                    selectedId={active}
                    onSelect={setActive}
                  />
                  {roadResult && (
                    <p className="alert alert-success">
                      {(roadResult.distanceMeters / 1000).toFixed(1)} km ·{" "}
                      {Math.ceil(roadResult.durationSeconds / 60)} min de
                      deslocamento estimado. Tempo de atendimento não incluído.
                    </p>
                  )}
                  <section className="card p-4">
                    <h2>Conferência do planejamento</h2>
                    <dl>
                      <dt>Situação</dt>
                      <dd>{status(data.route?.status || "SCHEDULED")}</dd>
                      <dt>Programação</dt>
                      <dd>{form.date ? toBr(form.date) : "Pendente"}</dd>
                      <dt>Motorista e veículo</dt>
                      <dd>
                        {driver?.name || "Motorista não definido"}
                        <br />
                        {vehicle?.plate || "Veículo não definido"}
                      </dd>
                      <dt>Coletas e paradas adicionais</dt>
                      <dd>
                        {visits.length} coletas ·{" "}
                        {form.stops.filter((s) => s.trim()).length} em texto
                      </dd>
                      <dt>Quantidades informadas</dt>
                      <dd>{quantitiesLabel(amounts)}</dd>
                    </dl>
                    <p className="small">
                      {unknown} coleta(s) sem quantidade informada · {missing}{" "}
                      sem coordenadas. Unidades são mantidas separadas; este
                      resumo não representa pesagem executada nem ocupação
                      garantida do veículo.
                    </p>
                    {!locked && (
                      <button type="submit" className="btn btn-success w-100">
                        <Save size={16} className="me-2" />
                        {saving
                          ? "Salvando..."
                          : id
                            ? "Salvar planejamento"
                            : "Agendar rota"}
                      </button>
                    )}
                    <Link
                      className="btn btn-outline-secondary w-100 mt-2"
                      to="/route-list"
                    >
                      {locked ? "Voltar" : "Cancelar edição"}
                    </Link>
                  </section>
                  {id && !locked && (
                    <section className="card p-3">
                      <h2>Operação da rota</h2>
                      <p className="small">
                        Salve o planejamento antes de mudar a situação. Início
                        exige data, motorista, veículo e coleta operacional.
                        Encerramento depende da finalização em campo, sem
                        aguardar triagem.
                      </p>
                      <div className="d-flex flex-wrap gap-2">
                        {dirty && (
                          <p className="text-warning small">
                            Há alterações não salvas. Salve o planejamento para
                            liberar as ações.
                          </p>
                        )}
                        {data.route.status === "SCHEDULED" && (
                          <button
                            type="button"
                            className="btn btn-outline-success"
                            disabled={dirty}
                            onClick={() => changeStatus("IN_PROGRESS")}
                          >
                            Iniciar rota salva
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline-success"
                          disabled={dirty}
                          onClick={() => changeStatus("COMPLETED")}
                        >
                          Concluir rota salva
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          disabled={dirty}
                          onClick={() => changeStatus("CANCELLED")}
                        >
                          Cancelar rota salva
                        </button>
                      </div>
                    </section>
                  )}
                </aside>
              </div>
            </fieldset>
          </form>
        </>
      )}
    </main>
  );
}
