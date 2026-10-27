import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import HeadTags from "../../components/HeadTags";
import { useAdminAuth } from "../../context/AdminAuthContext";
import {
  getAllSchedules,
  getScheduleById,
} from "../../services/scheduleService";
import { createCollectionFromSchedule } from "../../services/collectionService";
import { getAllCollectors } from "../../services/collectorService";
import { getAllDrivers } from "../../services/driverService";
import { getAllVehicles } from "../../services/vehicleService";
import { getAllRoutes } from "../../services/routeService";
import CollectionDialog from "../../components/collections/CollectionDialog";
import {
  MaterialTable,
  Summary,
  WorkspacePagination,
} from "../../components/collections/WorkspaceParts";
import {
  REQUEST_LABELS,
  requestGroup,
  generatorName,
  personName,
  location,
  city,
  neighborhood,
  dateLabel,
  materials,
  searchText,
  shortId,
  inPeriod,
  assignmentProblem,
} from "../../utils/collectionWorkspace";
const defaults = {
  q: "",
  group: "REQUESTED",
  city: "",
  neighborhood: "",
  start: "",
  end: "",
  dateField: "createdAt",
};
const emptyForm = {
  collectorId: "",
  routeId: "",
  driverId: "",
  vehicleId: "",
  notes: "",
};
const emptyOptions = { collectors: [], drivers: [], vehicles: [], routes: [] };
const errorText = (e) =>
  e?.error || e?.message || "Não foi possível concluir a operação.";
export default function CollectionRequests() {
  const { admin } = useAdminAuth();
  return admin?.id ? <RequestWorkspace key={admin.id} /> : null;
}
function RequestWorkspace() {
  const [schedules, setSchedules] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [filters, setFilters] = useState(defaults),
    [page, setPage] = useState(1),
    [size, setSize] = useState(10);
  const [selected, setSelected] = useState(null),
    [dialog, setDialog] = useState(false),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState("");
  const [options, setOptions] = useState(emptyOptions),
    [optionsLoading, setOptionsLoading] = useState(false),
    [optionsError, setOptionsError] = useState("");
  const [form, setForm] = useState(emptyForm),
    [busy, setBusy] = useState(false),
    [submitError, setSubmitError] = useState(""),
    [created, setCreated] = useState(null);
  const guard = useRef({
    list: 0,
    detail: 0,
    options: 0,
    submitting: false,
    alive: true,
  });
  const load = useCallback(async () => {
    const g = guard.current,
      n = ++g.list;
    setLoading(true);
    setError("");
    setSchedules([]);
    try {
      const r = await getAllSchedules();
      if (!Array.isArray(r?.schedules))
        throw Error("Resposta de solicitações inválida.");
      if (n === g.list) setSchedules(r.schedules);
    } catch (e) {
      if (n === g.list) setError(errorText(e));
    } finally {
      if (n === g.list) setLoading(false);
    }
  }, []);
  const loadOptions = useCallback(async () => {
    const g = guard.current,
      n = ++g.options;
    setOptionsLoading(true);
    setOptionsError("");
    setOptions(emptyOptions);
    const sources = [
      ["collectors", getAllCollectors],
      ["drivers", getAllDrivers],
      ["vehicles", getAllVehicles],
      ["routes", getAllRoutes],
    ];
    const results = await Promise.allSettled(
      sources.map(async ([key, fetch]) => {
        const r = await fetch();
        if (!Array.isArray(r?.[key]))
          throw Error("Resposta operacional inválida.");
        return [key, r[key]];
      }),
    );
    if (n !== g.options) return;
    if (results.some((r) => r.status === "rejected"))
      setOptionsError(
        "Não foi possível consultar todas as opções de equipe e rotas. Atualize as opções antes de confirmar.",
      );
    else setOptions(Object.fromEntries(results.map((r) => r.value)));
    setOptionsLoading(false);
  }, []);
  useEffect(() => {
    const g = guard.current;
    g.alive = true;
    void load();
    return () => {
      g.alive = false;
      g.list++;
      g.detail++;
      g.options++;
    };
  }, [load]);
  async function open(s) {
    const g = guard.current,
      n = ++g.detail;
    setDialog(true);
    setSelected(null);
    setDetailLoading(true);
    setDetailError("");
    setForm(emptyForm);
    setSubmitError("");
    void loadOptions();
    try {
      const r = await getScheduleById(s.id);
      if (!r?.schedule?.id) throw Error("Solicitação indisponível.");
      if (n === g.detail) setSelected(r.schedule);
    } catch (e) {
      if (n === g.detail) setDetailError(errorText(e));
    } finally {
      if (n === g.detail) setDetailLoading(false);
    }
  }
  function close() {
    if (busy) return;
    guard.current.detail++;
    guard.current.options++;
    setDialog(false);
    setSelected(null);
    setSubmitError("");
  }
  const invalid = !!(
    filters.start &&
    filters.end &&
    filters.start > filters.end
  );
  const baseFiltered = useMemo(
    () =>
      schedules.filter(
        (s) =>
          !invalid &&
          (!filters.q ||
            searchText(
              [
                s.id,
                generatorName(s),
                location(s),
                s.generator?.email,
                s.requestedBy?.email,
                ...materials(s, true).map((m) => m.name),
              ].join(" "),
            ).includes(searchText(filters.q))) &&
          (!filters.city || city(s) === filters.city) &&
          (!filters.neighborhood || neighborhood(s) === filters.neighborhood) &&
          inPeriod(s[filters.dateField], filters.start, filters.end),
      ),
    [schedules, filters, invalid],
  );
  const filtered = baseFiltered
    .filter((s) => !filters.group || requestGroup(s) === filters.group)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const currentPage = Math.min(
      page,
      Math.max(1, Math.ceil(filtered.length / size)),
    ),
    visible = filtered.slice((currentPage - 1) * size, currentPage * size);
  const route = options.routes.find((r) => r.id === form.routeId),
    problem = assignmentProblem(form, options);
  const canDelegate =
    selected &&
    ["REQUESTED", "SCHEDULED"].includes(selected.status) &&
    !selected.collections?.length;
  const drivers = options.drivers.filter(
      (d) =>
        d.status === "AVAILABLE" ||
        (d.status === "ON_ROUTE" && route?.driverId === d.id),
    ),
    vehicles = options.vehicles.filter((v) => v.status === "ACTIVE"),
    collectors = options.collectors.filter((c) => c.status === "AVAILABLE"),
    routes = options.routes.filter((r) =>
      ["SCHEDULED", "IN_PROGRESS"].includes(r.status),
    );
  function change(e) {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));
    setPage(1);
  }
  function changeForm(e) {
    const { name, value } = e.target;
    setSubmitError("");
    setForm((f) => {
      if (name !== "routeId") return { ...f, [name]: value };
      const r = options.routes.find((r) => r.id === value);
      return {
        ...f,
        routeId: value,
        driverId: r?.driverId || "",
        vehicleId: r?.vehicleId || "",
      };
    });
  }
  async function submit(e) {
    e.preventDefault();
    const g = guard.current;
    if (g.submitting || !canDelegate) return;
    if (!form.collectorId || problem || optionsError || optionsLoading) {
      setSubmitError(
        problem || "Selecione um catador disponível e confira as opções.",
      );
      return;
    }
    g.submitting = true;
    setBusy(true);
    setSubmitError("");
    try {
      const r = await createCollectionFromSchedule({
        scheduleId: selected.id,
        ...form,
      });
      if (!r?.collection?.id)
        throw Error(
          "O servidor não confirmou a coleta criada. Atualize a lista antes de tentar novamente.",
        );
      if (!g.alive) return;
      setCreated(r.collection);
      setDialog(false);
      setSelected(null);
      toast.success("Coleta aceita e atribuída.");
      await load();
    } catch (e) {
      if (g.alive) setSubmitError(errorText(e));
    } finally {
      g.submitting = false;
      if (g.alive) setBusy(false);
    }
  }
  return (
    <main className="container-fluid py-4 collection-workspace">
      <HeadTags title="Coletas Solicitadas | KATUÁ" />
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h3">Coletas Solicitadas</h1>
          <p className="text-muted">
            Analise o pedido do gerador, confira os materiais previstos e
            atribua a equipe responsável.
          </p>
          <Link to="/waste-list">Acompanhar coletas operacionais</Link>
        </div>
        <button
          type="button"
          className="btn btn-outline-success d-inline-flex align-items-center gap-2 flex-shrink-0"
          aria-busy={loading}
          disabled={loading || busy}
          onClick={load}
        >
          <RefreshCw size={16} aria-hidden="true" />
          {loading ? "Atualizando…" : "Atualizar solicitações"}
        </button>
      </div>
      {created && (
        <div role="status" className="alert alert-success">
          Coleta #{shortId(created.id)} criada e confirmada pelo servidor.{" "}
          <Link to={`/waste-list?coleta=${encodeURIComponent(created.id)}`}>
            Ver coleta criada
          </Link>
        </div>
      )}
      <Summary
        cards={Object.entries(REQUEST_LABELS)
          .filter(([key]) => key !== "IN_PROGRESS")
          .map(([key, label]) => [
            label,
            loading || error
              ? "—"
              : baseFiltered.filter((s) => requestGroup(s) === key).length,
          ])}
      />
      <section className="card p-3 mb-4" aria-label="Filtros das solicitações">
        <div className="row g-3">
          <div className="col-md-6">
            <label htmlFor="request-search" className="form-label">
              Buscar protocolo, gerador, endereço ou material
            </label>
            <input
              id="request-search"
              type="search"
              className="form-control"
              name="q"
              value={filters.q}
              onChange={change}
            />
          </div>
          <div className="col-md-3">
            <label htmlFor="request-group" className="form-label">
              Fila de atendimento
            </label>
            <select
              id="request-group"
              name="group"
              className="form-select"
              value={filters.group}
              onChange={change}
            >
              <option value="">Todas</option>
              {Object.entries(REQUEST_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {[
            ["city", "Município", city],
            ["neighborhood", "Bairro", neighborhood],
          ].map(([field, label, get]) => (
            <div className="col-md-3" key={field}>
              <label htmlFor={`request-${field}`} className="form-label">
                {label}
              </label>
              <select
                id={`request-${field}`}
                name={field}
                value={filters[field]}
                onChange={change}
                className="form-select"
              >
                <option value="">Todos</option>
                {[...new Set(schedules.map(get).filter(Boolean))]
                  .sort()
                  .map((v) => (
                    <option key={v}>{v}</option>
                  ))}
              </select>
            </div>
          ))}
          <div className="col-md-3">
            <label htmlFor="request-date-field" className="form-label">
              Período por
            </label>
            <select
              id="request-date-field"
              name="dateField"
              className="form-select"
              value={filters.dateField}
              onChange={change}
            >
              <option value="createdAt">Solicitada em</option>
              <option value="preferredDate">Data desejada</option>
              <option value="scheduledDate">Data programada</option>
            </select>
          </div>
          {[
            ["start", "Data inicial"],
            ["end", "Data final"],
          ].map(([field, label]) => (
            <div className="col-md-3" key={field}>
              <label htmlFor={`request-${field}`} className="form-label">
                {label}
              </label>
              <input
                type="date"
                id={`request-${field}`}
                name={field}
                value={filters[field]}
                onChange={change}
                className="form-control"
              />
            </div>
          ))}
        </div>
        <button
          className="btn btn-outline-secondary mt-3"
          onClick={() => {
            setFilters({ ...defaults, group: "" });
            setPage(1);
          }}
        >
          Limpar filtros
        </button>
        <p className="small text-muted mt-3 mb-0">
          Cartões mostram a distribuição das filas conforme busca, local e
          período. A tabela mostra a fila selecionada. Delegada significa que já
          existe coleta vinculada, inclusive se depois cancelada.
        </p>
        {invalid && (
          <p role="alert" className="text-danger mt-2">
            A data inicial deve ser anterior ou igual à final.
          </p>
        )}
      </section>
      <section className="card p-3" aria-label="Resultados das solicitações">
        {loading ? (
          <p role="status">Carregando solicitações...</p>
        ) : error ? (
          <div role="alert" className="alert alert-danger">
            {error}{" "}
            <button className="btn btn-outline-danger" onClick={load}>
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            {!filtered.length ? (
              <p className="text-center py-4">
                {schedules.length
                  ? "Nenhuma solicitação corresponde aos filtros."
                  : "Nenhuma solicitação cadastrada."}
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Solicitação / Gerador</th>
                      <th>Datas</th>
                      <th>Materiais previstos</th>
                      <th>Situação</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>#{shortId(s.id)}</strong>
                          <div>{generatorName(s)}</div>
                          <small className="text-muted">{location(s)}</small>
                        </td>
                        <td>
                          <div>Solicitada: {dateLabel(s.createdAt)}</div>
                          <div className="small">
                            Desejada: {dateLabel(s.preferredDate)}
                          </div>
                          <div className="small">
                            Programada: {dateLabel(s.scheduledDate)}
                          </div>
                        </td>
                        <td>
                          {materials(s, true)
                            .slice(0, 2)
                            .map((m, i) => (
                              <div key={m.id || i}>{m.name}</div>
                            ))}
                          {materials(s, true).length > 2 && (
                            <small>
                              +{materials(s, true).length - 2} nos detalhes
                            </small>
                          )}
                          {!materials(s, true).length && "Não informados"}
                        </td>
                        <td>
                          <span
                            className={`badge text-bg-${requestGroup(s) === "DELEGATED" ? "success" : requestGroup(s) === "CLOSED" ? "secondary" : "warning"}`}
                          >
                            {REQUEST_LABELS[requestGroup(s)]}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => open(s)}
                          >
                            {["REQUESTED", "SCHEDULED"].includes(
                              requestGroup(s),
                            )
                              ? "Analisar solicitação"
                              : "Ver detalhes"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <WorkspacePagination
              page={currentPage}
              size={size}
              total={filtered.length}
              onPage={setPage}
              onSize={(n) => {
                setSize(n);
                setPage(1);
              }}
            />
          </>
        )}
      </section>
      {dialog && (
        <CollectionDialog
          title={
            selected
              ? `Solicitação #${shortId(selected.id)}`
              : "Analisar solicitação"
          }
          onClose={close}
          busy={busy}
        >
          {detailLoading ? (
            <p role="status">Carregando solicitação...</p>
          ) : detailError ? (
            <p role="alert" className="text-danger">
              {detailError}
            </p>
          ) : (
            selected && (
              <>
                <h3 className="fs-18">{generatorName(selected)}</h3>
                <p>{location(selected)}</p>
                <p className="text-break">
                  Contato:{" "}
                  {selected.generator?.email ||
                    selected.requestedBy?.email ||
                    "Não informado"}
                </p>
                <p className="small">
                  Solicitada em: {dateLabel(selected.createdAt, true)}
                  <br />
                  Data desejada: {dateLabel(selected.preferredDate)}
                  <br />
                  Data programada: {dateLabel(selected.scheduledDate)}
                </p>
                <h3 className="fs-18">Materiais solicitados</h3>
                <MaterialTable estimated items={materials(selected, true)} />
                <p>
                  Observações do gerador: {selected.notes || "Não informadas"}
                </p>
                {selected.collections?.map((c) => (
                  <p key={c.id}>
                    <Link to={`/waste-list?coleta=${encodeURIComponent(c.id)}`}>
                      Ver coleta vinculada #{shortId(c.id)}
                    </Link>
                  </p>
                ))}
                {!canDelegate ? (
                  <div className="alert alert-light">
                    Esta solicitação já possui coleta vinculada ou está
                    encerrada. Não é possível delegá-la novamente.
                  </div>
                ) : (
                  <form onSubmit={submit}>
                    <hr />
                    <h3 className="fs-18">Atribuir equipe</h3>
                    <p className="small text-muted">
                      Escolher uma rota preenche sua equipe. A quantidade real
                      será informada na execução da coleta.
                    </p>
                    {optionsLoading && (
                      <p role="status">Consultando disponibilidade...</p>
                    )}
                    {optionsError && (
                      <div role="alert" className="alert alert-danger">
                        {optionsError}
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn btn-outline-secondary mb-3"
                      onClick={loadOptions}
                      disabled={optionsLoading || busy}
                    >
                      Atualizar opções de equipe
                    </button>
                    <fieldset
                      disabled={busy || optionsLoading || !!optionsError}
                    >
                      <div className="row g-3">
                        {[
                          [
                            "collectorId",
                            "Catador responsável",
                            collectors,
                            (c) => personName(c),
                          ],
                          ["routeId", "Rota", routes, (r) => r.name],
                          [
                            "driverId",
                            "Motorista",
                            drivers,
                            (d) => personName(d),
                          ],
                          [
                            "vehicleId",
                            "Veículo",
                            vehicles,
                            (v) =>
                              [v.plate, v.model].filter(Boolean).join(" · "),
                          ],
                        ].map(([field, label, list, describe]) => (
                          <div className="col-md-6" key={field}>
                            <label
                              htmlFor={`delegate-${field}`}
                              className="form-label"
                            >
                              {label}
                              {field === "collectorId" ? " *" : ""}
                            </label>
                            <select
                              id={`delegate-${field}`}
                              name={field}
                              value={form[field]}
                              onChange={changeForm}
                              className="form-select"
                              required={field === "collectorId"}
                              disabled={
                                (field === "driverId" && !!route?.driverId) ||
                                (field === "vehicleId" && !!route?.vehicleId)
                              }
                            >
                              <option value="">
                                {field === "collectorId"
                                  ? "Selecione um catador"
                                  : "Sem vínculo no momento"}
                              </option>
                              {form[field] &&
                                !list.some((o) => o.id === form[field]) && (
                                  <option value={form[field]} disabled>
                                    Vínculo indisponível — atualize a rota ou a
                                    equipe
                                  </option>
                                )}
                              {list.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {describe(o)}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                        <div className="col-12">
                          <label
                            htmlFor="delegate-notes"
                            className="form-label"
                          >
                            Orientações operacionais
                          </label>
                          <textarea
                            id="delegate-notes"
                            name="notes"
                            className="form-control"
                            rows={3}
                            value={form.notes}
                            onChange={changeForm}
                          />
                        </div>
                      </div>
                    </fieldset>
                    {route && (
                      <p className="small mt-3">
                        Rota: {route.name} · Motorista:{" "}
                        {personName(route.driver)} · Veículo:{" "}
                        {route.vehicle?.plate || "Não informado"}. Vínculos
                        existentes da rota são mantidos.
                      </p>
                    )}
                    {problem && (
                      <p role="alert" className="text-danger mt-3">
                        {problem}
                      </p>
                    )}
                    {submitError && (
                      <div role="alert" className="alert alert-danger mt-3">
                        {submitError} Se houver dúvida sobre o resultado,
                        atualize a lista antes de repetir.
                      </div>
                    )}
                    <p className="small text-muted mt-3">
                      Veículos em manutenção/inativos e motoristas ocupados em
                      outra rota não são oferecidos. Alterações simultâneas
                      podem fazer o servidor rejeitar a atribuição.
                    </p>
                    <div className="d-flex justify-content-end gap-2 mt-3">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        disabled={busy}
                        onClick={close}
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        className="btn btn-success"
                        disabled={
                          busy ||
                          optionsLoading ||
                          !!optionsError ||
                          !!problem ||
                          !form.collectorId
                        }
                      >
                        {busy ? "Confirmando..." : "Aceitar e atribuir coleta"}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )
          )}
        </CollectionDialog>
      )}
    </main>
  );
}
