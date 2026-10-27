import PevRequests from "./PevRequests";
import { useCallback, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import {
  getBinById,
  getBinEvents,
  getBinWithdrawals,
  createBinEvent,
  resolveBinEvent,
  requestBinPickup,
  updateBin,
} from "../../services/binService";
import { getAllCollectors } from "../../services/collectorService";
import { getAllRoutes } from "../../services/routeService";
import {
  useWasteResource,
  useWasteOperation,
} from "../waste-workspace/useWasteResource";
import {
  PevScope,
  PevPage,
  PevState,
  PevBadge,
  PevGuide,
  BackToPevs,
} from "./PevParts";
import { Summary } from "../collections/WorkspaceParts";
import CollectionDialog from "../collections/CollectionDialog";
import {
  title,
  address,
  capacity,
  accepted,
  photoUrl,
  hasPosition,
  KINDS,
  DAYS,
  EVENTS,
} from "./pevUtils";
import {
  dateLabel,
  quantity,
  COLLECTION_STAGES,
  shortId,
} from "../../utils/collectionWorkspace";
import PevMap from "./PevMap";
function HistoryPages({ page, setPage, total }) {
  return (
    <nav
      className="d-flex gap-3 align-items-center mt-3"
      aria-label="Paginação do histórico"
    >
      <button
        className="btn btn-sm btn-outline-secondary"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        Anterior
      </button>
      <span className="small">
        Página {page} de {Math.max(1, Math.ceil(total / 20))} · {total}{" "}
        registros
      </span>
      <button
        className="btn btn-sm btn-outline-secondary"
        disabled={page * 20 >= total}
        onClick={() => setPage(page + 1)}
      >
        Próxima
      </button>
    </nav>
  );
}
export default function PevDetail() {
  const { id } = useParams();
  return (
    <PevScope>
      <Detail key={id} id={id} />
    </PevScope>
  );
}
function Detail({ id }) {
  const location = useLocation(),
    op = useWasteOperation();
  const [notice, setNotice] = useState(location.state?.notice || ""),
    [modal, setModal] = useState(null),
    [eventPage, setEventPage] = useState(1),
    [collectionPage, setCollectionPage] = useState(1);
  const load = useCallback(async () => {
      const r = await getBinById(id);
      if (!r.data?.id) throw Error("PEV não encontrado.");
      return r.data;
    }, [id]),
    resource = useWasteResource(load);
  const loadEvents = useCallback(async () => {
      const r = await getBinEvents(id, eventPage);
      if (!Array.isArray(r.data?.events))
        throw Error("Histórico indisponível.");
      return r.data;
    }, [id, eventPage]),
    events = useWasteResource(loadEvents);
  const loadCollections = useCallback(async () => {
      const r = await getBinWithdrawals(id, collectionPage);
      if (!Array.isArray(r.data?.collections))
        throw Error("Retiradas indisponíveis.");
      return r.data;
    }, [id, collectionPage]),
    collections = useWasteResource(loadCollections);
  const b = resource.data;
  const refresh = async () => {
    await Promise.all([
      resource.refresh(),
      events.refresh(),
      collections.refresh(),
    ]);
  };
  async function saved(message) {
    setModal(null);
    setNotice(message);
    await refresh();
  }
  async function changeStatus() {
    const r = await op.run(() =>
      updateBin(id, {
        status: b.status === "inactive" ? "active" : "inactive",
      }),
    );
    if (r?.data?.id)
      await saved("Funcionamento atualizado. O histórico foi preservado.");
  }
  async function resolve(eventId) {
    const r = await op.run(() => resolveBinEvent(id, eventId));
    if (r?.data?.id) await saved("Ocorrência marcada como resolvida.");
  }
  return (
    <PevPage
      title={b ? title(b) : "Ficha do PEV"}
      description="Localização, regras de atendimento e histórico operacional do ponto."
      actions={
        <>
          <BackToPevs />
          <button
            className="btn btn-outline-success"
            onClick={refresh}
            disabled={resource.loading || op.busy}
          >
            Atualizar ficha
          </button>
          <Link
            className="btn btn-success"
            to={`/edit-bin/${encodeURIComponent(id)}`}
          >
            Editar PEV
          </Link>
        </>
      }
    >
      {notice && (
        <div role="status" className="alert alert-success">
          {notice}
        </div>
      )}
      {op.error && (
        <div role="alert" className="alert alert-danger">
          {op.error}
        </div>
      )}
      <PevState resource={resource}>
        {b && (
          <>
            <Summary
              cards={[
                ["Funcionamento", <PevBadge bin={b} />],
                ["Capacidade nominal", capacity(b)],
                ["Última retirada em campo", dateLabel(b.last_collection_date)],
                ["Ocorrências em aberto", b.openIncidents],
              ]}
            />
            <div className="row g-4 mb-4">
              <div className="col-lg-5">
                <section className="card p-4 h-100">
                  <h2 className="fs-18">Identificação do ponto</h2>
                  {b.photo_url && (
                    <img
                      className="pev-photo-large my-3"
                      src={photoUrl(b.photo_url)}
                      alt={`PEV ${title(b)}`}
                    />
                  )}
                  <p>
                    <strong>{b.bin_id}</strong> ·{" "}
                    {KINDS[b.pointKind] || b.pointKind}
                  </p>
                  <p>
                    {address(b)}
                    {b.location && b.street && (
                      <small className="d-block text-muted">
                        Localização legada: {b.location}
                      </small>
                    )}
                    {b.reference && (
                      <small className="d-block">
                        Referência: {b.reference}
                      </small>
                    )}
                  </p>
                  <p className="small">
                    Regional: {b.regional || "Não informada"}
                    <br />
                    Responsável: {b.responsibleName || "Não informado"}
                    <br />
                    Contato: {b.responsibleContact || "Não informado"}
                    <br />
                    Veículo:{" "}
                    {b.vehicle
                      ? `${b.vehicle.plate} · ${b.vehicle.model}`
                      : "Não vinculado"}
                    <br />
                    Última vistoria: {dateLabel(b.inspectionAt, true)}
                  </p>
                  {b.lastCollectionSource === "LEGACY" && (
                    <p className="small text-muted">
                      A data de última coleta é uma informação legada sem
                      operação vinculada.
                    </p>
                  )}
                  {b.notes && <p className="small">{b.notes}</p>}
                  <div className="d-flex gap-2 flex-wrap mt-auto">
                    <button
                      className="btn btn-outline-success"
                      onClick={() => setModal("INSPECTION")}
                    >
                      Registrar vistoria
                    </button>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setModal("INCIDENT")}
                    >
                      Registrar ocorrência
                    </button>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setModal("STATUS")}
                    >
                      {b.status === "inactive"
                        ? "Reativar ponto"
                        : "Inativar ponto"}
                    </button>
                  </div>
                </section>
              </div>
              <div className="col-lg-7">
                <section className="card p-3 h-100">
                  <h2 className="fs-18">Localização registrada</h2>
                  {hasPosition(b) ? (
                    <>
                      <PevMap items={[b]} />
                      <p className="small mt-3 mb-0">
                        Latitude: {b.latitude} · Longitude: {b.longitude} ·{" "}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${b.latitude},${b.longitude}`)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Como chegar
                        </a>
                      </p>
                    </>
                  ) : (
                    <div className="py-5 text-center">
                      <p>Este PEV ainda não tem coordenadas registradas.</p>
                      <Link
                        className="btn btn-outline-success"
                        to={`/edit-bin/${encodeURIComponent(id)}`}
                      >
                        Marcar localização no mapa
                      </Link>
                    </div>
                  )}
                </section>
              </div>
            </div>
            <div className="row g-4 mb-4">
              <div className="col-lg-6">
                <section className="card p-4 h-100">
                  <h2 className="fs-18">Materiais e condições de entrega</h2>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {accepted(b).length ? (
                      accepted(b).map((m) => (
                        <span className="badge text-bg-light" key={m}>
                          {m}
                        </span>
                      ))
                    ) : (
                      <p>Materiais não informados.</p>
                    )}
                  </div>
                  <p className="small mt-3 mb-0">
                    {b.restrictions ||
                      "Restrições específicas ainda não informadas. Confirme com o responsável pelo ponto."}
                  </p>
                </section>
              </div>
              <div className="col-lg-6">
                <section className="card p-4 h-100">
                  <h2 className="fs-18">Atendimento</h2>
                  <dl className="small mb-0">
                    {DAYS.map((day, index) => {
                      const config = b.openingHours?.find(
                        (d) => d.day === index,
                      );
                      return (
                        <div
                          className="d-flex justify-content-between gap-2 mb-1"
                          key={day}
                        >
                          <dt>{day}</dt>
                          <dd className="mb-0">
                            {!config
                              ? "Não informado"
                              : config.intervals.length
                                ? config.intervals
                                    .map((v) => `${v.start}–${v.end}`)
                                    .join(" / ")
                                : "Fechado"}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                  {b.hoursExceptions && (
                    <p className="small mt-3 mb-0">
                      Exceções: {b.hoursExceptions}
                    </p>
                  )}
                </section>
              </div>
            </div>
            <PevGuide>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                  <strong>
                    {b.needsPickup
                      ? "Ponto sinalizado para retirada"
                      : "Planejamento de retirada"}
                  </strong>
                  <div className="small mt-1">
                    {b.pickupReason ||
                      "Delegue a retirada a um catador disponível. Os materiais serão registrados na conclusão em campo."}
                  </div>
                </div>
                <button
                  className="btn btn-success"
                  disabled={b.status !== "active"}
                  onClick={() => setModal("PICKUP")}
                >
                  Solicitar retirada
                </button>
              </div>
            </PevGuide>
          </>
        )}
      </PevState>
      <section className="card p-3 my-4">
        <h2 className="fs-18">Retiradas e materiais coletados</h2>
        <PevState resource={collections}>
          {collections.data && (
            <>
              <p className="small text-muted">
                Quantidades registradas em retiradas não canceladas, separadas
                por unidade:{" "}
                {collections.data.totals?.length
                  ? collections.data.totals
                      .map((t) => quantity(t.quantity, t.unit))
                      .join(" · ")
                  : "nenhum material registrado"}
                . Capacidade do ponto não entra nesses totais.
              </p>
              {!collections.data.collections.length ? (
                <p>Nenhuma retirada vinculada a este PEV.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Coleta / Etapa</th>
                        <th>Equipe</th>
                        <th>Materiais</th>
                        <th>Data em campo / Acesso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collections.data.collections.map((c) => (
                        <tr key={c.id}>
                          <td>
                            #{shortId(c.id)}
                            <div>{COLLECTION_STAGES[c.status] || c.status}</div>
                          </td>
                          <td>
                            {c.collector?.name || "Catador não informado"}
                            <div className="small">
                              {c.vehicle?.plate || "Sem veículo"} ·{" "}
                              {c.route?.name || "Sem rota"}
                            </div>
                          </td>
                          <td>
                            {c.collectionMaterials.length
                              ? c.collectionMaterials.map((m) => (
                                  <div key={m.id}>
                                    {m.nameSnapshot} ·{" "}
                                    {quantity(m.quantity, m.unit)}{" "}
                                    {m.wasteEntry?.id && (
                                      <Link
                                        to={`/collected-waste/${encodeURIComponent(m.wasteEntry.id)}`}
                                      >
                                        Ver entrada e destinação
                                      </Link>
                                    )}
                                  </div>
                                ))
                              : "Ainda sem materiais registrados"}
                          </td>
                          <td>
                            {dateLabel(c.collectedAt, true)}
                            <div>
                              <Link
                                to={`/waste-list?coleta=${encodeURIComponent(c.id)}`}
                              >
                                Abrir coleta
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <HistoryPages
                page={collectionPage}
                setPage={setCollectionPage}
                total={collections.data.pagination.total}
              />
            </>
          )}
        </PevState>
      </section>
      <section className="card p-4 mb-4">
        <h2 className="fs-18">
          Histórico de vistorias, ocorrências e alterações
        </h2>
        <PevState resource={events}>
          {events.data && (
            <>
              {!events.data.events.length ? (
                <p>Nenhum evento registrado.</p>
              ) : (
                <div className="pev-history">
                  {events.data.events.map((event) => (
                    <article key={event.id}>
                      <div className="d-flex justify-content-between flex-wrap gap-2">
                        <strong>{EVENTS[event.kind] || event.kind}</strong>
                        <small className="text-muted">
                          {dateLabel(event.createdAt, true)}
                        </small>
                      </div>
                      <p className="small mb-1">{event.notes}</p>
                      {event.data?.condition && (
                        <div className="small">
                          Condição observada:{" "}
                          {
                            {
                              GOOD: "Boa",
                              DAMAGED: "Danificado",
                              CONTAMINATED: "Material inadequado",
                            }[event.data.condition]
                          }
                        </div>
                      )}
                      {event.data?.needsPickup != null && (
                        <div className="small">
                          Precisa de retirada:{" "}
                          {event.data.needsPickup ? "Sim" : "Não"}
                        </div>
                      )}
                      <small className="text-muted">
                        Registrado por{" "}
                        {event.actorName || "Responsável identificado"}
                      </small>
                      {event.kind === "INCIDENT" && (
                        <div className="mt-2">
                          {event.resolvedAt ? (
                            <span className="badge text-bg-success">
                              Resolvida em {dateLabel(event.resolvedAt, true)}
                            </span>
                          ) : (
                            <button
                              className="btn btn-sm btn-outline-success"
                              disabled={op.busy}
                              onClick={() => resolve(event.id)}
                            >
                              Marcar como resolvida
                            </button>
                          )}
                        </div>
                      )}
                      {event.data?.collectionId && (
                        <div>
                          <Link
                            className="small"
                            to={`/waste-list?coleta=${encodeURIComponent(event.data.collectionId)}`}
                          >
                            Consultar coleta vinculada
                          </Link>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
              <HistoryPages
                page={eventPage}
                setPage={setEventPage}
                total={events.data.pagination.total}
              />
            </>
          )}
        </PevState>
      </section>
      {modal === "PICKUP" && (
        <PickupDialog
          id={id}
          onClose={() => setModal(null)}
          onSuccess={() =>
            saved(
              "Retirada criada e vinculada ao PEV. Acompanhe a execução em Coletas.",
            )
          }
        />
      )}
      {(modal === "INSPECTION" || modal === "INCIDENT") && (
        <EventDialog
          id={id}
          kind={modal}
          needsPickup={b?.needsPickup || false}
          onClose={() => setModal(null)}
          onSuccess={() => saved("Registro salvo no histórico do PEV.")}
        />
      )}
      {modal === "STATUS" && b && (
        <CollectionDialog
          title={b.status === "inactive" ? "Reativar PEV" : "Inativar PEV"}
          busy={op.busy}
          onClose={() => setModal(null)}
        >
          <p>
            {title(b)}. A alteração preservará o histórico e os vínculos
            existentes.
          </p>
          {op.error && (
            <div role="alert" className="alert alert-danger">
              {op.error}
            </div>
          )}
          <button
            className="btn btn-success"
            onClick={changeStatus}
            disabled={op.busy}
          >
            Confirmar alteração
          </button>
        </CollectionDialog>
      )}
      <PevRequests binId={id} />
    </PevPage>
  );
}
function EventDialog({ id, kind, needsPickup, onClose, onSuccess }) {
  const op = useWasteOperation(),
    [notes, setNotes] = useState(""),
    [condition, setCondition] = useState("GOOD"),
    [pickup, setPickup] = useState(needsPickup);
  async function submit(e) {
    e.preventDefault();
    const r = await op.run(() =>
      createBinEvent(id, {
        kind,
        notes,
        ...(kind === "INSPECTION" ? { condition, needsPickup: pickup } : {}),
      }),
    );
    if (r?.data?.id) await onSuccess();
  }
  return (
    <CollectionDialog
      title={
        kind === "INSPECTION" ? "Registrar vistoria" : "Registrar ocorrência"
      }
      busy={op.busy}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <fieldset disabled={op.busy}>
          {kind === "INSPECTION" && (
            <>
              <label htmlFor="pev-condition" className="form-label">
                Condição observada
              </label>
              <select
                id="pev-condition"
                className="form-select mb-3"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                <option value="GOOD">Boa</option>
                <option value="DAMAGED">Danificado</option>
                <option value="CONTAMINATED">Material inadequado</option>
              </select>
              <label className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={pickup}
                  onChange={(e) => setPickup(e.target.checked)}
                />
                Precisa de retirada
              </label>
            </>
          )}
          <label htmlFor="pev-event-notes" className="form-label">
            Descrição *
          </label>
          <textarea
            id="pev-event-notes"
            className="form-control"
            required
            minLength={3}
            maxLength={1500}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </fieldset>
        {op.error && (
          <div role="alert" className="alert alert-danger mt-3">
            {op.error}
          </div>
        )}
        <button className="btn btn-success mt-3" disabled={op.busy}>
          {op.busy ? "Salvando..." : "Salvar registro"}
        </button>
      </form>
    </CollectionDialog>
  );
}
const optionsLoader = async () => {
  const [c, r] = await Promise.all([getAllCollectors(), getAllRoutes()]);
  if (!Array.isArray(c.collectors) || !Array.isArray(r.routes))
    throw Error("Opções de equipe indisponíveis. Atualize antes de confirmar.");
  return {
    collectors: c.collectors.filter((c) => c.status === "AVAILABLE"),
    routes: r.routes.filter((r) =>
      ["SCHEDULED", "IN_PROGRESS"].includes(r.status),
    ),
  };
};
function PickupDialog({ id, onClose, onSuccess }) {
  const options = useWasteResource(optionsLoader),
    op = useWasteOperation(),
    [collectorId, setCollectorId] = useState(""),
    [routeId, setRouteId] = useState(""),
    [notes, setNotes] = useState("");
  async function submit(e) {
    e.preventDefault();
    const r = await op.run(() =>
      requestBinPickup(id, {
        collectorId,
        routeId: routeId || null,
        notes: notes.trim() || null,
      }),
    );
    if (r?.data?.id) await onSuccess(r.data);
  }
  const route = options.data?.routes.find((r) => r.id === routeId);
  return (
    <CollectionDialog
      title="Solicitar retirada do PEV"
      busy={op.busy}
      onClose={onClose}
    >
      <PevState resource={options}>
        {options.data && (
          <form onSubmit={submit}>
            <fieldset disabled={op.busy}>
              <label htmlFor="pickup-collector" className="form-label">
                Catador responsável *
              </label>
              <select
                id="pickup-collector"
                required
                className="form-select mb-3"
                value={collectorId}
                onChange={(e) => setCollectorId(e.target.value)}
              >
                <option value="">Selecione um catador disponível</option>
                {options.data.collectors.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <label htmlFor="pickup-route" className="form-label">
                Rota (opcional)
              </label>
              <select
                id="pickup-route"
                className="form-select mb-3"
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
              >
                <option value="">
                  Sem rota — usar veículo de referência do ponto
                </option>
                {options.data.routes.map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {route && (
                <p className="small">
                  Equipe herdada da rota:{" "}
                  {route.driver?.name || "Sem motorista"} ·{" "}
                  {route.vehicle?.plate || "Sem veículo"}
                </p>
              )}
              <label htmlFor="pickup-notes" className="form-label">
                Orientação para a retirada
              </label>
              <textarea
                id="pickup-notes"
                className="form-control"
                maxLength={1500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </fieldset>
            <p className="small text-muted mt-3">
              A solicitação cria uma coleta pendente. Não registra peso, não
              conclui recebimento e não gera estoque.
            </p>
            {op.error && (
              <div role="alert" className="alert alert-danger">
                {op.error}
              </div>
            )}
            <div className="d-flex flex-wrap gap-2">
              <button
                className="btn btn-success"
                disabled={op.busy || !collectorId}
              >
                {op.busy ? "Criando..." : "Confirmar retirada"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={op.busy}
                onClick={options.refresh}
              >
                Atualizar opções
              </button>
            </div>
          </form>
        )}
      </PevState>
    </CollectionDialog>
  );
}
