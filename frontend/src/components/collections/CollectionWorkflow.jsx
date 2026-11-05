import { useRef, useState } from "react";
import { Link } from "react-router";
import { apiRequest } from "../../services/apiClient";
import { getCollectionById } from "../../services/collectionService";
import {
  collectionEntries,
  entryDisposition,
} from "../../utils/materialDisposition";
import { receivingWorkflow } from "../../utils/receivingWorkflow";
import {
  quantity,
  generatorName,
  location,
  COLLECTION_STAGES,
} from "../../utils/collectionWorkspace";
import CollectionStageActions from "./CollectionStageActions";
import CollectionQuantityReview from "./CollectionQuantityReview";
import CollectionInitialWeigh from "./CollectionInitialWeigh";
import CollectionTeam from "./CollectionTeam";
import CollectionIncidents from "./CollectionIncidents";
import MaterialDestinations from "../waste/MaterialDestinations";
import WasteDestinationModal from "../waste/WasteDestinationModal";
import "./receivingWorkflow.css";
export default function CollectionWorkflow({
  collection: c,
  onChange,
  onBusy,
}) {
  const flow = receivingWorkflow(c),
    entries = collectionEntries(c);
  const signature = JSON.stringify([
    c.id,
    c.status,
    c.quantityReviewVersion,
    c.allocationVersion,
    c.allocationQuantityVersion,
    entries.map((e) => [e.id, e.remainingQuantity, e.destinations?.length]),
    c.incidents?.map((i) => i.status),
  ]);
  const [view, setView] = useState(null),
    [destination, setDestination] = useState(null),
    [stale, setStale] = useState(false),
    [error, setError] = useState(""),
    [receiving, setReceiving] = useState(false),
    [working, setWorking] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  const reportBusy = (value) => {
    setWorking(value);
    onBusy?.(value);
  };
  const guard = useRef(false);
  const current = view?.signature === signature ? view.step : flow.current;
  const actualIndex = flow.steps.findIndex((s) => s.id === flow.current);
  async function refresh() {
    const r = await getCollectionById(c.id);
    if (!r.collection?.id)
      throw Error("Atualize os detalhes para conferir a operação.");
    onChange(r.collection);
    setStale(false);
    setError("");
  }
  async function arrive(e) {
    e.preventDefault();
    if (guard.current || !confirmed) return;
    guard.current = true;
    setReceiving(true);
    reportBusy(true);
    setError("");
    try {
      await apiRequest(`/material-intakes/${encodeURIComponent(c.id)}/arrive`, {
        method: "POST",
        body: {},
      });
      await refresh();
    } catch (e) {
      setError(e.error || e.message);
    } finally {
      guard.current = false;
      setReceiving(false);
      reportBusy(false);
    }
  }
  return (
    <section className="receiving-workflow" aria-label="Passos do recebimento">
      <div className="receiving-origin mb-3">
        <strong>
          {c.intakeOrigin?.name ||
            (c.extraOrder && !c.generator && !c.bin && !c.routePoint
              ? "Origem da coleta extra"
              : generatorName(c))}
        </strong>
        <p className="small mb-1">
          {c.intakeOrigin?.address || c.schedule?.pickupAddress || location(c)}
        </p>
        <span className="badge text-bg-light">
          {COLLECTION_STAGES[c.status] || "Situação não disponível"}
        </span>
      </div>
      <div className="receiving-next" role="status">
        <span className="small">
          {["done", "cancelled", "field"].includes(flow.current)
            ? "Situação atual"
            : "Próximo passo"}
        </span>
        <h3>{flow.title}</h3>
        <p>{flow.description}</p>
      </div>
      {stale && (
        <div role="alert" className="alert alert-warning">
          O encaminhamento foi confirmado, mas o saldo atualizado não pôde ser
          consultado. Atualize antes de continuar.
          <button
            type="button"
            className="btn btn-outline-success ms-2"
            disabled={receiving}
            onClick={async () => {
              setReceiving(true);
              reportBusy(true);
              try {
                await refresh();
              } catch {
                setError(
                  "Não foi possível atualizar. O registro enviado foi preservado.",
                );
              } finally {
                setReceiving(false);
                reportBusy(false);
              }
            }}
          >
            Atualizar atendimento
          </button>
        </div>
      )}
      <fieldset
        disabled={stale || receiving || working}
        style={{ minWidth: 0 }}
      >
        <nav aria-label="Etapas do recebimento" className="receiving-steps">
          {flow.steps.map((step, i) => (
            <button
              type="button"
              key={step.id}
              className={current === step.id ? "active" : ""}
              aria-current={current === step.id ? "step" : undefined}
              disabled={
                receiving ||
                !!destination ||
                flow.current === "cancelled" ||
                flow.current === "field" ||
                (flow.current !== "done" &&
                  (actualIndex < 0 || i > actualIndex))
              }
              onClick={() => setView({ signature, step: step.id })}
            >
              <span>{i + 1}</span>
              {step.label}
            </button>
          ))}
        </nav>
        {current !== flow.current && (
          <button
            type="button"
            className="btn btn-sm btn-outline-success mb-3"
            onClick={() => setView(null)}
          >
            Voltar ao próximo passo
          </button>
        )}
        {current === "receipt" &&
          (c.intakeKind &&
          ["PENDING", "IN_PROGRESS", "COLLECTED"].includes(c.status) ? (
            <form onSubmit={arrive}>
              <label className="d-flex gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={receiving}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Conferi a chegada física do material.
              </label>
              <button
                className="btn btn-success"
                disabled={!confirmed || receiving}
              >
                Confirmar chegada à cooperativa
              </button>
            </form>
          ) : c.status === "COLLECTED" ? (
            <CollectionStageActions
              collection={c}
              onChange={onChange}
              onBusy={reportBusy}
            />
          ) : (
            <p>Recebimento já registrado.</p>
          ))}
        {current === "weigh" &&
          (c.intakeKind && !c.collectionMaterials?.length ? (
            <CollectionInitialWeigh
              collection={c}
              onChange={async () => refresh()}
              onBusy={reportBusy}
            />
          ) : (
            <CollectionQuantityReview
              collection={c}
              onChange={onChange}
              onBusy={reportBusy}
            />
          ))}
        {current === "team" && (
          <CollectionTeam
            collection={c}
            onChange={onChange}
            onBusy={reportBusy}
          />
        )}
        {current === "incidents" && (
          <CollectionIncidents
            collection={c}
            onChange={onChange}
            onBusy={reportBusy}
          />
        )}
        {current === "review" && (
          <p role="alert">
            Entradas dos materiais não disponíveis. Use “Atualizar detalhes”.
            Nenhuma conclusão será feita automaticamente.
          </p>
        )}
        {["destination", "done"].includes(current) && (
          <div>
            <h3 className="fs-18">Encaminhamento dos materiais</h3>
            {!entries.length && (
              <p>Consulte o histórico da coleta para verificar os registros.</p>
            )}
            {entries.map((e) => {
              const progress = entryDisposition(e);
              return (
                <article className="receiving-material" key={e.id}>
                  <strong>{e.materialNameSnapshot}</strong>
                  <p className="small mb-2">
                    {progress.label} · Sem encaminhamento:{" "}
                    {quantity(progress.remaining, e.unit)}
                  </p>
                  {["RECEIVED", "SORTING"].includes(c.status) &&
                    c.quantityReviewVersion > 0 &&
                    progress.remaining > 0 && (
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={() => {
                          setDestination({ ...e, collection: c });
                          reportBusy(true);
                        }}
                      >
                        Encaminhar {e.materialNameSnapshot}
                      </button>
                    )}
                  {progress.followUp > 0 && (
                    <div className="d-flex gap-2 flex-wrap mt-2">
                      {[
                        ...new Set(
                          (e.destinations || [])
                            .filter(
                              (d) =>
                                d.status !== "CANCELLED" &&
                                d.type === "STOCK" &&
                                (d.stockLotId || d.stockLot?.id) &&
                                (!d.stockLot ||
                                  Number(d.stockLot.availableQuantity) > 0),
                            )
                            .map((d) => d.stockLotId || d.stockLot.id),
                        ),
                      ].map((id) => (
                        <Link
                          key={id}
                          className="btn btn-sm btn-success"
                          to={`/waste-stock/lots/${encodeURIComponent(id)}/edit`}
                        >
                          Acompanhar lote de estoque
                        </Link>
                      ))}
                      {(e.destinations || []).some(
                        (d) =>
                          d.status !== "CANCELLED" &&
                          ["TRIAGE", "RESERVATION"].includes(d.type),
                      ) && (
                        <Link
                          className="btn btn-sm btn-outline-success"
                          to={`/waste-destinations?entryId=${encodeURIComponent(e.id)}`}
                        >
                          Atualizar destino do material
                        </Link>
                      )}
                    </div>
                  )}
                  <MaterialDestinations entry={e} compact showActions />
                </article>
              );
            })}
          </div>
        )}
        {current === "complete" && (
          <>
            <CollectionStageActions
              collection={c}
              onChange={onChange}
              onBusy={reportBusy}
            />
            <p className="small text-muted">
              Concluir a coleta não encerra lotes em estoque, triagem ou
              reserva. Esses materiais continuam acompanhados em seus registros.
            </p>
          </>
        )}
        <details className="mt-3">
          <summary>Outras consultas e ajustes</summary>
          <div className="mt-3">
            {current !== "weigh" && (
              <CollectionQuantityReview
                collection={c}
                onChange={onChange}
                onBusy={reportBusy}
              />
            )}
            {["RECEIVED", "SORTING"].includes(c.status) &&
              flow.current !== "complete" && (
                <CollectionStageActions
                  collection={c}
                  onChange={onChange}
                  onBusy={reportBusy}
                />
              )}
            {current !== "incidents" && (
              <CollectionIncidents
                collection={c}
                onChange={onChange}
                onBusy={reportBusy}
              />
            )}

            <Link
              to={`/service-orders?collectionId=${encodeURIComponent(c.id)}`}
              className="btn btn-sm btn-outline-secondary"
            >
              O.S. e documentos
            </Link>
          </div>
        </details>
        {!!error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
      </fieldset>
      <WasteDestinationModal
        open={!!destination}
        entry={destination}
        onClose={() => {
          setDestination(null);
          reportBusy(false);
        }}
        onSuccess={async () => {
          try {
            await refresh();
          } catch {
            setError(
              "Encaminhamento enviado. Atualize os detalhes para conferir o saldo antes de repetir.",
            );
            setStale(true);
          }
        }}
      />
    </section>
  );
}
