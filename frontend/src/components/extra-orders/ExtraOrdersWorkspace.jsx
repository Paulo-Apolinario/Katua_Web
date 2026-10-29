import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { apiRequest } from "../../services/apiClient";
import HeadTags from "../HeadTags";
const statuses = {
  PENDING_REVIEW: "Aguardando análise",
  NEEDS_INFO: "Complementação solicitada",
  ACCEPTED: "Aceita",
  REJECTED: "Recusada",
};
const custodyLabels = {
  ORIGIN: "Na origem",
  COLLECTOR: "Com o catador / em transporte",
  COOPERATIVE: "Na cooperativa",
  OTHER: "Outro local informado",
};
const reasons = {
  UNPLANNED_STOP: "Parada fora dos pontos da rota",
  EXTRA_REQUEST: "Solicitação extra",
  OUTSIDE_SCHEDULE: "Fora da programação",
  WEEKEND: "Fim de semana",
  OTHER: "Outro motivo",
};
const unit = { KG: "kg", TON: "t", LITER: "L", UNIT: "un", CUBIC_METER: "m³" };
const eventLabel = (kind) =>
  ({
    SUBMITTED: "Ordem registrada",
    RESUBMITTED: "Complementação enviada",
    ACCEPT: "Ordem aceita",
    NEEDS_INFO: "Complementação solicitada",
    REJECT: "Ordem recusada",
    RECEIVED: "Recebimento confirmado",
    RECEIVED_BY_COLLECTION: "Recebimento pela coleta vinculada",
  })[kind] || kind;
const localNow = () =>
  new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 16);
const when = (value) =>
  value
    ? new Date(value).toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })
    : "Ainda não confirmado";
export default function ExtraOrdersWorkspace() {
  const [orders, setOrders] = useState([]),
    [context, setContext] = useState(null),
    [selected, setSelected] = useState(null),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [status, setStatus] = useState(""),
    [search, setSearch] = useState(""),
    [hasMore, setHasMore] = useState(false),
    [notes, setNotes] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [custody, setCustody] = useState("COLLECTOR"),
    [custodyNotes, setCustodyNotes] = useState(""),
    [receivedAt, setReceivedAt] = useState(localNow()),
    [scheduledDate, setScheduledDate] = useState(""),
    [driverId, setDriverId] = useState(""),
    [vehicleId, setVehicleId] = useState("");
  const guard = useRef(false),
    operationIds = useRef(new Map());
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await apiRequest(
        `/extra-collection-orders?page=${page}&${new URLSearchParams({ ...(status ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) })}`,
      );
      setOrders(r.orders);
      setTotal(r.total);
      setHasMore(r.hasMore);
    } catch (e) {
      setError(e.error || e.message || "Não foi possível carregar as ordens.");
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    apiRequest("/extra-collection-orders/context")
      .then(setContext)
      .catch((e) =>
        setError(
          e.error ||
            "Cadastros auxiliares indisponíveis. Atualize antes de analisar.",
        ),
      );
  }, []);
  async function open(id) {
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const r = await apiRequest(`/extra-collection-orders/${id}`);
      setSelected(r.order);
      setNotes("");
      setConfirmed(false);
      setCustody(r.order.custody);
      setCustodyNotes(r.order.custodyNotes);
      setDriverId("");
      setVehicleId("");
      setScheduledDate("");
    } catch (e) {
      setError(e.error || e.message);
    } finally {
      setBusy(false);
    }
  }
  async function act(decision) {
    if (guard.current || !selected) return;
    if (!confirmed || notes.trim().length < 5) {
      setError(
        "Confirme a conferência e descreva a análise com pelo menos cinco caracteres.",
      );
      return;
    }
    if (decision === "REJECT" && custodyNotes.trim().length < 5) {
      setError(
        "Informe onde está o material e o encaminhamento dado à recusa.",
      );
      return;
    }
    if (decision === "RECEIVE" && !receivedAt) {
      setError("Informe a data real do recebimento.");
      return;
    }
    const body =
      decision === "RECEIVE"
        ? {
            receivedAt: new Date(receivedAt + ":00-03:00").toISOString(),
            notes: notes.trim(),
          }
        : {
            expectedRevision: selected.revision,
            decision,
            notes: notes.trim(),
            ...(decision === "REJECT"
              ? { custody, custodyNotes: custodyNotes.trim() }
              : {}),
            ...(decision === "ACCEPT"
              ? {
                  driverId: driverId || undefined,
                  vehicleId: vehicleId || undefined,
                  scheduledDate: scheduledDate
                    ? new Date(scheduledDate + "T12:00:00-03:00").toISOString()
                    : undefined,
                }
              : {}),
          };
    const key = JSON.stringify({ id: selected.id, ...body });
    if (!operationIds.current.has(key))
      operationIds.current.set(key, crypto.randomUUID());
    body.operationId = operationIds.current.get(key);
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await apiRequest(
        `/extra-collection-orders/${selected.id}/${decision === "RECEIVE" ? "receive" : "review"}`,
        { method: "POST", body },
      );
      setSelected(r.order);
      setConfirmed(false);
      setNotes("");
      setSuccess("Operação registrada com histórico e responsável.");
      await load();
    } catch (e) {
      setError(
        (e.error || e.message || "Falha na operação.") +
          " Se houve perda de conexão, atualize o protocolo antes de repetir.",
      );
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <HeadTags title="Ordens de coleta extras | KATUÁ" />
      <div className="container-fluid py-4">
        <div className="d-flex flex-wrap justify-content-between gap-3 mb-4">
          <div>
            <p className="text-success small fw-semibold mb-1">
              COLETA DE RESÍDUOS
            </p>
            <h1 className="h3">Ordens de coleta extras</h1>
            <p className="text-muted mb-0">
              Solicitações e atendimentos fora da programação, incluindo paradas
              extras durante a rota.
            </p>
          </div>
          <button
            className="btn btn-outline-success align-self-start"
            disabled={busy || loading}
            onClick={() => void load()}
          >
            Atualizar ordens
          </button>
        </div>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success" role="status">
            {success}
          </div>
        )}
        {selected ? (
          <>
            <button
              className="btn btn-sm btn-outline-success mb-3"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              Voltar para a fila
            </button>
            <div className="row g-4">
              <div className="col-xl-7">
                <section className="card border-0 shadow-sm">
                  <div className="card-body p-4">
                    <div className="d-flex flex-wrap gap-2 justify-content-between">
                      <h2 className="h4">{selected.payload.originName}</h2>
                      <span
                        className={`badge align-self-start text-bg-${selected.status === "ACCEPTED" ? "success" : selected.status === "REJECTED" ? "secondary" : "warning"}`}
                      >
                        {statuses[selected.status]}
                      </span>
                    </div>
                    <p className="small text-muted text-break">
                      Protocolo {selected.id} · revisão {selected.revision}
                    </p>
                    <dl className="row">
                      <dt className="col-sm-4">Situação informada</dt>
                      <dd className="col-sm-8">
                        {selected.payload.mode === "COLLECTED"
                          ? "Coleta realizada em campo"
                          : "Solicitação ainda não realizada"}
                      </dd>
                      <dt className="col-sm-4">Catador</dt>
                      <dd className="col-sm-8">{selected.reporterName}</dd>
                      <dt className="col-sm-4">Origem</dt>
                      <dd className="col-sm-8">
                        {selected.payload.originType === "PF"
                          ? "Pessoa física"
                          : "Gerador"}{" "}
                        · {selected.payload.pickupAddress}
                      </dd>
                      <dt className="col-sm-4">Solicitação de referência</dt>
                      <dd className="col-sm-8 text-break">
                        {selected.payload.sourceScheduleId ||
                          "Sem vínculo anterior"}
                      </dd>
                      <dt className="col-sm-4">Contato</dt>
                      <dd className="col-sm-8">
                        {selected.payload.contactPhone || "Não informado"}
                      </dd>
                      <dt className="col-sm-4">Motivo</dt>
                      <dd className="col-sm-8">
                        {reasons[selected.payload.reason]}
                        <br />
                        {selected.payload.reasonNotes}
                      </dd>
                      <dt className="col-sm-4">Rota de contexto</dt>
                      <dd className="col-sm-8">
                        {selected.routeNameSnapshot || "Sem rota vinculada"}
                      </dd>
                      <dt className="col-sm-4">Realizada em</dt>
                      <dd className="col-sm-8">
                        {selected.payload.occurredAt
                          ? when(selected.payload.occurredAt)
                          : "Ainda não realizada"}
                      </dd>
                      <dt className="col-sm-4">Registrada na API</dt>
                      <dd className="col-sm-8">{when(selected.createdAt)}</dd>
                      <dt className="col-sm-4">Recebimento confirmado</dt>
                      <dd className="col-sm-8">{when(selected.receivedAt)}</dd>
                      <dt className="col-sm-4">Guarda do material</dt>
                      <dd className="col-sm-8">
                        {custodyLabels[selected.custody]}
                        <br />
                        {selected.custodyNotes}
                      </dd>
                    </dl>
                    {selected.payload.latitude != null && (
                      <a
                        className="btn btn-outline-success btn-sm mb-3"
                        target="_blank"
                        rel="noreferrer"
                        href={`https://www.google.com/maps/search/?api=1&query=${selected.payload.latitude},${selected.payload.longitude}`}
                      >
                        Conferir localização
                      </a>
                    )}
                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead>
                          <tr>
                            <th>Material</th>
                            <th>Quantidade informada</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.payload.materials.map((m, i) => (
                            <tr key={i}>
                              <td>
                                {m.nameSnapshot ||
                                  m.proposedMaterial?.name ||
                                  context?.catalog.find(
                                    (c) => c.id === m.wasteTypeId,
                                  )?.name ||
                                  "Material do catálogo"}
                              </td>
                              <td>
                                {m.quantity == null
                                  ? "Estimativa não informada"
                                  : `${Number(m.quantity).toLocaleString("pt-BR")} ${unit[m.unit]}`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="small text-muted">
                      As unidades são preservadas. A análise da O.C. não cria
                      lote de estoque.
                    </p>
                    {!!selected.payload.photos?.length && (
                      <div className="row g-2">
                        {selected.payload.photos.map((uri, i) => (
                          <div className="col-sm-4" key={i}>
                            <img
                              src={uri}
                              alt={`Evidência ${i + 1} da O.C.`}
                              style={{
                                height: 160,
                                width: "100%",
                                objectFit: "contain",
                                borderRadius: 8,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {selected.collection && (
                      <div className="alert alert-success mt-3">
                        Coleta vinculada:{" "}
                        <span className="text-break">
                          {selected.collection.id}
                        </span>{" "}
                        · {selected.collection.status}
                        <br />
                        <Link className="btn btn-sm btn-outline-success align-self-center"
                          to={`/waste-list?coleta=${encodeURIComponent(selected.collection.id)}`}
                        >
                          Abrir coleta para recebimento, triagem e encerramento
                        </Link>
                      </div>
                    )}
                  </div>
                </section>
                <section className="card border-0 shadow-sm mt-4">
                  <div className="card-body p-4">
                    <h2 className="h5">Histórico e decisões</h2>
                    {selected.events?.map((e) => (
                      <div className="border-start ps-3 py-2 mb-2" key={e.id}>
                        <strong>
                          {eventLabel(e.kind)} · {e.actorName}
                        </strong>
                        <div className="small text-muted">
                          {when(e.createdAt)}
                        </div>
                        <p className="mb-0 text-break">{e.notes}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="col-xl-5">
                <section className="card border-0 shadow-sm">
                  <div className="card-body p-4">
                    <h2 className="h5">Conferência da cooperativa</h2>
                    <p className="small text-muted">
                      Registre a decisão administrativa e, separadamente, a
                      chegada física do material.
                    </p>
                    <label className="form-label" htmlFor="oc-notes">
                      Observações da análise ou conferência
                    </label>
                    <textarea
                      id="oc-notes"
                      className="form-control mb-3"
                      value={notes}
                      disabled={busy}
                      maxLength={2000}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <label className="d-flex gap-2 mb-4">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        disabled={busy}
                        onChange={(e) => setConfirmed(e.target.checked)}
                      />
                      Conferi os dados e confirmo esta operação.
                    </label>
                    {["PENDING_REVIEW", "NEEDS_INFO"].includes(
                      selected.status,
                    ) && (
                      <>
                        <label className="form-label" htmlFor="oc-program">
                          Programar atendimento (opcional)
                        </label>
                        <input
                          id="oc-program"
                          type="date"
                          className="form-control mb-3"
                          value={scheduledDate}
                          disabled={busy}
                          onChange={(e) => setScheduledDate(e.target.value)}
                        />
                        <label className="form-label" htmlFor="oc-driver">
                          Motorista (opcional)
                        </label>
                        <select
                          id="oc-driver"
                          className="form-select mb-3"
                          value={driverId}
                          disabled={busy}
                          onChange={(e) => setDriverId(e.target.value)}
                        >
                          <option value="">Definir posteriormente</option>
                          {context?.drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                        <label className="form-label" htmlFor="oc-vehicle">
                          Veículo (opcional)
                        </label>
                        <select
                          id="oc-vehicle"
                          className="form-select mb-3"
                          value={vehicleId}
                          disabled={busy}
                          onChange={(e) => {
                            setVehicleId(e.target.value);
                            const v = context?.vehicles.find(
                              (v) => v.id === e.target.value,
                            );
                            if (v?.driverId) setDriverId(v.driverId);
                          }}
                        >
                          <option value="">Definir posteriormente</option>
                          {context?.vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.plate}
                            </option>
                          ))}
                        </select>
                        <div className="d-grid gap-2 mb-4">
                          <button
                            className="btn btn-success"
                            disabled={busy || !confirmed}
                            onClick={() => void act("ACCEPT")}
                          >
                            Aceitar O.C. e vincular coleta
                          </button>
                          <button
                            className="btn btn-outline-success"
                            disabled={busy || !confirmed}
                            onClick={() => void act("NEEDS_INFO")}
                          >
                            Solicitar complementação
                          </button>
                        </div>
                        <h3 className="h6">Recusa e encaminhamento</h3>
                        <label className="form-label" htmlFor="oc-custody">
                          Onde está o material
                        </label>
                        <select
                          id="oc-custody"
                          className="form-select mb-3"
                          value={custody}
                          disabled={busy}
                          onChange={(e) => setCustody(e.target.value)}
                        >
                          {Object.entries(custodyLabels).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <label
                          className="form-label"
                          htmlFor="oc-custody-notes"
                        >
                          Encaminhamento dado ao material
                        </label>
                        <textarea
                          id="oc-custody-notes"
                          className="form-control mb-3"
                          maxLength={1000}
                          value={custodyNotes}
                          disabled={busy}
                          onChange={(e) => setCustodyNotes(e.target.value)}
                        />
                        <button
                          className="btn btn-outline-danger w-100 mb-4"
                          disabled={busy || !confirmed}
                          onClick={() => void act("REJECT")}
                        >
                          Recusar com justificativa
                        </button>
                      </>
                    )}
                    {selected.payload.mode === "COLLECTED" &&
                      !selected.receivedAt &&
                      selected.status !== "REJECTED" && (
                        <>
                          <h3 className="h6">Recebimento físico</h3>
                          <p className="small text-muted">
                            Pode ser confirmado antes da aprovação. Informe o
                            momento real da chegada, no horário de Fortaleza.
                          </p>
                          <label
                            className="form-label"
                            htmlFor="oc-received-at"
                          >
                            Data e horário reais do recebimento
                          </label>
                          <input
                            id="oc-received-at"
                            type="datetime-local"
                            className="form-control mb-3"
                            value={receivedAt}
                            disabled={busy}
                            onChange={(e) => setReceivedAt(e.target.value)}
                          />
                          <button
                            className="btn btn-outline-success w-100"
                            disabled={busy || !confirmed}
                            onClick={() => void act("RECEIVE")}
                          >
                            Confirmar recebimento físico
                          </button>
                        </>
                      )}
                  </div>
                </section>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body row g-3">
                <div className="col-md-8">
                  <label className="form-label" htmlFor="oc-search">
                    Buscar protocolo, catador ou rota
                  </label>
                  <input
                    id="oc-search"
                    className="form-control"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="oc-filter">
                    Situação da análise
                  </label>
                  <select
                    id="oc-filter"
                    className="form-select"
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Todas as situações</option>
                    {Object.entries(statuses).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <p className="small text-muted">
                  {total} ordem(ns) · página {page}
                </p>
                {loading && <p role="status">Atualizando ordens…</p>}
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>Origem / protocolo</th>
                        <th>Catador / rota</th>
                        <th>Realização</th>
                        <th>Análise</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <strong>{o.payload.originName}</strong>
                            <div className="small text-muted text-break">
                              {o.id}
                            </div>
                            <div className="small">
                              {o.payload.pickupAddress}
                            </div>
                          </td>
                          <td>
                            {o.reporterName}
                            <div className="small text-muted">
                              {o.routeNameSnapshot || "Sem rota"}
                            </div>
                          </td>
                          <td>
                            {o.payload.mode === "COLLECTED"
                              ? when(o.payload.occurredAt)
                              : "Solicitada"}
                            <div className="small text-muted">
                              {reasons[o.payload.reason]}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`badge text-bg-${o.status === "ACCEPTED" ? "success" : "secondary"}`}
                            >
                              {statuses[o.status]}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-outline-success btn-sm"
                              disabled={busy}
                              onClick={() => void open(o.id)}
                            >
                              Analisar ordem
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!loading && !orders.length && (
                    <p className="text-muted p-3">
                      Nenhuma O.C. encontrada para os filtros.
                    </p>
                  )}
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button
                    className="btn btn-outline-secondary"
                    disabled={page === 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    disabled={!hasMore || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
