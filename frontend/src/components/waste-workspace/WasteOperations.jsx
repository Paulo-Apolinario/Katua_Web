import MaterialDestinations from "../waste/MaterialDestinations";
import { canEditDestination, followUpQuantity, entryDisposition } from "../../utils/materialDisposition";
import DestinationAudit from "../waste/DestinationAudit";
import CollectedCollections from "./CollectedCollections";
import { mutationIdentity } from "../../services/wasteWorkspaceService";
import { useCallback, useState, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import {
  getCollectionEntryById,
  COLLECTION_ENTRY_STATUS_OPTIONS,
  getCollectionEntryStatusLabel,
} from "../../services/collectionEntryService";
import {
  getWasteDestinations,
  getWasteDestinationsByEntry,
  getWasteDestinationById,
  cancelWasteDestination,
  getWasteDestinationTypeLabel,
  WASTE_DESTINATION_TYPE_OPTIONS,
} from "../../services/collectionWasteDestinationService";
import { WASTE_UNIT_OPTIONS } from "../../services/wasteTypeService";
import {
  WasteScope,
  WastePage,
  ResourceState,
  WasteGuide,
  ExportButton,
} from "./WastePage";
import { useWasteOperation, useWasteResource } from "./useWasteResource";
import CollectionDialog from "../collections/CollectionDialog";
import { Summary, WorkspacePagination } from "../collections/WorkspaceParts";
import WasteDestinationModal from "../waste/WasteDestinationModal";
import {
  personName,
  generatorName,
  quantity,
  dateLabel,
  shortId,
  COLLECTION_STAGES,
} from "../../utils/collectionWorkspace";
import { numeric, unitSummary, validPeriod } from "../../utils/wasteWorkspace";
import { downloadCsv } from "../../utils/wasteReports";
const defaults = {
  search: "",
  status: "",
  unit: "",
  wasteTypeId: "",
  dateFrom: "",
  dateTo: "",
  entryId: "",
  page: 1,
  limit: 20,
};
const entryName = (e) =>
  e?.materialNameSnapshot ||
  e?.collectionMaterial?.nameSnapshot ||
  e?.wasteType?.name ||
  "Material não informado";
const getEntry = (d) => d?.collectionWasteEntry || d?.entry;
const allowed = (e) =>
  numeric(e?.remainingQuantity) > 0 &&
  e?.status !== "CANCELLED" &&
  !["CANCELLED", "COMPLETED"].includes(e?.collection?.status);
export function EntriesScreen() {
  return (
    <WasteScope>
      <EntryList />
    </WasteScope>
  );
}
export function DestinationsScreen() {
  const [params] = useSearchParams();
  return (
    <WasteScope>
      <DestinationList
        key={params.get("entryId") || "all"}
        entryId={params.get("entryId") || ""}
      />
    </WasteScope>
  );
}
export function EntryScreen() {
  const { id } = useParams();
  return (
    <WasteScope>
      <EntryDetail key={id} id={id} />
    </WasteScope>
  );
}
function Filters({
  draft,
  setDraft,
  apply,
  reset,
  history = false,
  catalog = [],
}) {
  const fields = history
    ? [
        [
          "status",
          "Situação",
          [
            { value: "ACTIVE", label: "Ativas" },
            { value: "CANCELLED", label: "Canceladas" },
          ],
        ],
        [
          "type",
          "Tipo de destinação",
          WASTE_DESTINATION_TYPE_OPTIONS.filter((o) => o.value),
        ],
      ]
    : [
        [
          "status",
          "Situação da entrada",
          COLLECTION_ENTRY_STATUS_OPTIONS.filter((o) => o.value),
        ],
        ["unit", "Unidade", WASTE_UNIT_OPTIONS],
        [
          "wasteTypeId",
          "Material do catálogo",
          catalog.map((i) => ({ value: i.id, label: i.name })),
        ],
      ];
  return (
    <form className="card p-3 mb-4" onSubmit={apply}>
      <h2 className="fs-18">Filtros</h2>
      <div className="row g-3">
        <div className="col-md-4">
          <label htmlFor="waste-search" className="form-label">
            Buscar material, origem, coleta ou solicitação
          </label>
          <input
            id="waste-search"
            type="search"
            className="form-control"
            value={draft.search}
            onChange={(e) =>
              setDraft((f) => ({ ...f, search: e.target.value }))
            }
          />
        </div>
        {fields.map(([name, label, options]) => (
          <div className="col-md-3" key={name}>
            <label htmlFor={`filter-${name}`} className="form-label">
              {label}
            </label>
            <select
              id={`filter-${name}`}
              className="form-select"
              value={draft[name] || ""}
              onChange={(e) =>
                setDraft((f) => ({ ...f, [name]: e.target.value }))
              }
            >
              <option value="">Todas</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
        {[
          ["dateFrom", "Data inicial"],
          ["dateTo", "Data final"],
        ].map(([name, label]) => (
          <div className="col-md-3" key={name}>
            <label htmlFor={`filter-${name}`} className="form-label">
              {label}
            </label>
            <input
              id={`filter-${name}`}
              type="date"
              className="form-control"
              value={draft[name]}
              onChange={(e) =>
                setDraft((f) => ({ ...f, [name]: e.target.value }))
              }
            />
          </div>
        ))}
      </div>
      <p className="small text-muted mt-3">
        Período por{" "}
        {history
          ? "data da destinação"
          : "data de coleta registrada na entrada"}
        . Clique em Aplicar filtros; os cartões e a lista usam os filtros
        aplicados.
      </p>
      {!validPeriod(draft) && (
        <p role="alert" className="text-danger">
          A data inicial deve ser anterior ou igual à final.
        </p>
      )}
      <div className="d-flex gap-2">
        <button className="btn btn-success" disabled={!validPeriod(draft)}>
          Aplicar filtros
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={reset}
        >
          Limpar filtros
        </button>
      </div>
    </form>
  );
}
function useFilters(initial = defaults) {
  const [draft, setDraft] = useState(initial),
    [applied, setApplied] = useState(initial);
  return {
    draft,
    setDraft,
    applied,
    setApplied,
    apply: (e) => {
      e.preventDefault();
      if (validPeriod(draft)) setApplied({ ...draft, page: 1 });
    },
    reset: () => {
      setDraft(initial);
      setApplied(initial);
    },
    page: (n) => {
      setApplied((f) => ({ ...f, page: n }));
      setDraft((f) => ({ ...f, page: n }));
    },
    size: (n) => {
      setApplied((f) => ({ ...f, page: 1, limit: n }));
      setDraft((f) => ({ ...f, page: 1, limit: n }));
    },
  };
}
function ServerPagination({ data, filters }) {
  const p = data?.pagination;
  return p ? (
    <WorkspacePagination
      page={p.page}
      size={p.limit}
      total={p.total}
      onPage={filters.page}
      onSize={filters.size}
    />
  ) : null;
}
function useDestinationEditor(refresh) {
  const [modal, setModal] = useState(null),
    [notice, setNotice] = useState(""),
    op = useWasteOperation();
  async function open(entry, edit) {
    const r = await op.run(async () => {
      if (edit) {
        const d = await getWasteDestinationById(edit.id);
        if (!d.destination) throw Error("Destinação indisponível.");
        return { entry: getEntry(d.destination), edit: d.destination };
      }
      const e = await getCollectionEntryById(entry.id);
      if (!e.entry) throw Error("Entrada indisponível.");
      return { entry: e.entry };
    });
    if (r) setModal(r);
  }
  return {
    open,
    error: op.error,
    busy: op.busy,
    notice,
    view: modal && (
      <WasteDestinationModal
        open
        mode={modal.edit ? "edit" : "create"}
        destinationToEdit={modal.edit}
        entry={modal.entry}
        onClose={() => setModal(null)}
        onSuccess={async (r) => {
          if (!r?.destination?.id)
            throw Error(
              "O servidor não confirmou a destinação. Atualize antes de repetir.",
            );
          setNotice("Destinação salva e confirmada pelo servidor.");
          await refresh();
        }}
      />
    ),
  };
}
function EntryList() {
  const [revision, setRevision] = useState(0);
  const editor = useDestinationEditor(() => setRevision((n) => n + 1));
  return <CollectedCollections editor={editor} revision={revision} />;
}
function DestinationList({ entryId }) {
  const filters = useFilters({
      ...defaults,
      entryId,
      status: "ACTIVE",
      type: "",
      flow: "all",
    }),
    loader = useCallback(async () => {
      const r = await getWasteDestinations({
        ...filters.applied,
        includeCancelled: filters.applied.status !== "ACTIVE",
      });
      if (!Array.isArray(r?.destinations) || !r.pagination)
        throw Error("Resposta de destinações inválida.");
      return r;
    }, [filters.applied]),
    resource = useWasteResource(loader),
    editor = useDestinationEditor(resource.refresh),
    op = useWasteOperation();
  const cancelOperation = useRef(null);
  const [cancel, setCancel] = useState(null),
    [reason, setReason] = useState(""),
    [notice, setNotice] = useState("");
  const rows = resource.data?.destinations || [];
  async function confirm() {
    if (reason.trim().length < 3) {
      op.setError("Descreva o motivo com pelo menos três caracteres.");
      return;
    }
    const r = await op.run(() =>
      cancelWasteDestination(cancel.id, {
        reason: reason.trim(),
        expectedVersion: cancel.version,
        operationId: mutationIdentity(cancelOperation, {
          id: cancel.id,
          reason: reason.trim(),
          version: cancel.version,
        }),
      }),
    );
    if (r && !r.destination?.id)
      op.setError(
        "O servidor não confirmou o cancelamento. Atualize antes de repetir.",
      );
    if (r?.destination?.id) {
      setCancel(null);
      setNotice(
        "Cancelamento confirmado pelo servidor. O histórico foi preservado.",
      );
      await resource.refresh();
    }
  }
  return (
    <WastePage
      title="Movimentações e Destinações"
      description="Consulte, revise e cancele movimentações mantendo o vínculo com a entrada, o responsável e o lote gerado."
      actions={
        <>
          <ExportButton
            page
            disabled={resource.loading || !!resource.error || !rows.length}
            onClick={() =>
              downloadCsv(
                "katua-destinacoes-pagina.csv",
                [
                  "ID destinação",
                  "ID entrada",
                  "Material",
                  "Tipo",
                  "Quantidade",
                  "Unidade",
                  "Destino",
                  "Documento destino",
                  "Documento transporte",
                  "Documento ambiental",
                  "Situação",
                  "Data destinação",
                  "Responsável",
                  "ID lote",
                  "Motivo cancelamento",
                ],
                rows.map((d) => [
                  d.id,
                  d.collectionWasteEntryId,
                  entryName(getEntry(d)),
                  getWasteDestinationTypeLabel(d.type),
                  d.quantity,
                  d.unit,
                  d.destinationName || d.stockItem?.name,
                  d.destinationDocument,
                  d.transportDocument,
                  d.environmentalDocument,
                  d.status === "CANCELLED" ? "Cancelada" : "Ativa",
                  d.destinationDate,
                  personName(d.createdBy),
                  d.stockLotId,
                  d.cancelledReason,
                ]),
              )
            }
          />
          <button
            className="btn btn-outline-success"
            onClick={resource.refresh}
            disabled={resource.loading}
          >
            Atualizar destinações
          </button>
        </>
      }
    >
      <details className="mb-3">
        <summary>Como registrar uma movimentação</summary>
        <WasteGuide
          title="Histórico de movimentações e documentos"
          to="/collected-waste"
          label="Registrar pela entrada"
        >
          Registre novas destinações a partir da entrada coletada. Confira o
          destinatário, os documentos informados e o lote vinculado;
          cancelamentos mantêm o registro no histórico.
        </WasteGuide>
      </details>
      {entryId && (
        <div className="alert alert-light">
          Histórico da entrada #{shortId(entryId)}.{" "}
          <Link className="btn btn-sm btn-outline-success align-self-center" to={`/collected-waste/${encodeURIComponent(entryId)}`}>
            Ver entrada
          </Link>{" "}
          · <Link className="btn btn-sm btn-outline-success align-self-center" to="/waste-destinations">Ver todas as destinações</Link>
        </div>
      )}
      <Summary
        cards={[
          ["Registros encontrados", resource.data?.pagination.total ?? "—"],
          [
            "Quantidade conforme filtros",
            resource.data
              ? unitSummary(resource.data.totalsByUnit, "totalQuantity")
              : "—",
          ],
          [
            "Situação aplicada",
            filters.applied.status === "ACTIVE"
              ? "Ativas"
              : filters.applied.status === "CANCELLED"
                ? "Canceladas"
                : "Todas",
          ],
          ["Registros nesta página", resource.data ? rows.length : "—"],
        ]}
      />
      <p className="small text-muted">
        Quantidades seguem o filtro de situação. Ao consultar canceladas ou
        todas, incluem registros cancelados e não devem ser interpretadas como
        movimentação líquida.
      </p>
      <div
        className="waste-tabs"
        role="group"
        aria-label="Situação das movimentações"
      >
        {[
          ["all", "Ativas"],
          ["intermediate", "Em acompanhamento"],
          ["final", "Destinos finais"],
          ["cancelled", "Canceladas"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={`btn btn-sm ${(filters.applied.status === "CANCELLED" ? value === "cancelled" : filters.applied.flow === value) ? "btn-success" : "btn-outline-secondary"}`}
            onClick={() => {
              const next = {
                ...filters.applied,
                page: 1,
                type: "",
                status: value === "cancelled" ? "CANCELLED" : "ACTIVE",
                flow: value === "cancelled" ? "all" : value,
              };
              filters.setApplied(next);
              filters.setDraft(next);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <Filters {...filters} history />
      {(notice || editor.notice) && (
        <p role="status" className="alert alert-success">
          {notice || editor.notice}
        </p>
      )}
      {editor.error && (
        <p role="alert" className="alert alert-danger">
          {editor.error}
        </p>
      )}
      <section className="card p-3">
        <h2 className="fs-18">Destinações registradas</h2>
        <p className="small text-muted">
          A exportação inclui a página consultada e respeita os filtros de
          situação, período e entrada.
        </p>
        <ResourceState resource={resource}>
          {!rows.length ? (
            <p>Nenhuma destinação corresponde aos filtros.</p>
          ) : (
            <DestinationTable
              rows={rows}
              edit={(d) => editor.open(null, d)}
              cancel={(d) => {
                op.setError("");
                setReason("");
                setCancel(d);
              }}
              busy={editor.busy}
            />
          )}
          <ServerPagination data={resource.data} filters={filters} />
        </ResourceState>
      </section>
      {cancel && (
        <CollectionDialog
          title="Cancelar destinação"
          busy={op.busy}
          onClose={() => setCancel(null)}
        >
          <p>
            {getWasteDestinationTypeLabel(cancel.type)} ·{" "}
            {quantity(cancel.quantity, cancel.unit)}
          </p>
          <p>
            O servidor verificará se o saldo pode retornar à entrada. Um lote já
            movimentado pode impedir o cancelamento. Os registros permanecem no
            histórico.
          </p>
          <label htmlFor="cancel-reason" className="form-label">
            Motivo do cancelamento *
          </label>
          <textarea
            id="cancel-reason"
            className="form-control"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1500}
            disabled={op.busy}
          />
          {op.error && (
            <p role="alert" className="text-danger mt-3">
              {op.error}
            </p>
          )}
          <div className="d-flex gap-2 justify-content-end mt-3">
            <button
              className="btn btn-outline-secondary"
              disabled={op.busy}
              onClick={() => setCancel(null)}
            >
              Voltar
            </button>
            <button
              className="btn btn-danger"
              disabled={op.busy || reason.trim().length < 3}
              onClick={confirm}
            >
              {op.busy ? "Cancelando..." : "Confirmar cancelamento"}
            </button>
          </div>
        </CollectionDialog>
      )}
      {editor.view}
    </WastePage>
  );
}
function DestinationTable({ rows, edit, cancel, busy = false }) {
  return (
    <div className="table-responsive">
      <table className="table align-middle waste-compact-table">
        <thead>
          <tr>
            <th>Movimentação / Material</th>
            <th>Quantidade / Destino</th>
            <th>Responsável / Histórico</th>
            <th>Situação / Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id}>
              <td>
                <strong>{getWasteDestinationTypeLabel(d.type)}</strong>
                {d.status !== "CANCELLED" && <small className={`d-block ${followUpQuantity(d) > 0 ? "text-primary" : "text-success"}`}>{followUpQuantity(d) > 0 ? "Material em acompanhamento" : "Etapa do material finalizada"}</small>}
                <div>{entryName(getEntry(d))}</div>
                <small>{dateLabel(d.destinationDate, true)}</small>
                <div>
                  <Link className="btn btn-sm btn-outline-success align-self-center"
                    to={`/collected-waste/${encodeURIComponent(d.collectionWasteEntryId)}`}
                  >
                    Entrada #{shortId(d.collectionWasteEntryId)}
                  </Link>
                </div>
              </td>
              <td>
                <strong>{quantity(d.quantity, d.unit)}</strong>
                <div>
                  {d.destinationName ||
                    d.stockItem?.name ||
                    "Destino não informado"}
                </div>
                {d.stockLotId && (
                  <Link className="btn btn-sm btn-outline-success align-self-center"
                    to={`/waste-stock/lots/${encodeURIComponent(d.stockLotId)}/edit`}
                  >
                    Lote{" "}
                    {d.stockLot?.lotCode ||
                      d.stockLot?.code ||
                      shortId(d.stockLotId)}
                  </Link>
                )}
              </td>
              <td>
                {personName(d.createdBy)}
                {(d.transportDocument || d.environmentalDocument) && (
                  <small className="d-block">Documentação informada</small>
                )}
                {d.notes && (
                  <details className="small">
                    <summary>Observações</summary>
                    <p>{d.notes}</p>
                  </details>
                )}
                <DestinationAudit id={d.id} />
                <details className="small mt-2">
                  <summary>Identificação e documentos</summary>
                  <p className="text-break">
                    Destinação: {d.id}
                    <br />
                    Documento do destino:{" "}
                    {d.destinationDocument || "Não informado"}
                    <br />
                    Endereço: {d.destinationAddress || "Não informado"}
                    <br />
                    Contato: {d.destinationContact || "Não informado"}
                    <br />
                    Criada em: {dateLabel(d.createdAt, true)}
                  </p>
                </details>
              </td>
              <td>
                <span
                  className={`badge text-bg-${d.status === "CANCELLED" ? "secondary" : "success"}`}
                >
                  {d.status === "CANCELLED" ? "Registro cancelado" : "Registro ativo"}
                </span>
                {d.status === "CANCELLED" ? (
                  <div className="small">
                    {d.cancelledReason || "Motivo não informado"}
                    <br />
                    {dateLabel(d.cancelledAt, true)} ·{" "}
                    {personName(d.cancelledBy)}
                  </div>
                ) : (
                  <div className="d-flex gap-2 flex-wrap mt-2">
                    {edit && (
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        disabled={
                          busy || !canEditDestination(d)
                        }
                        onClick={() => edit(d)}
                      >
                        {getEntry(d)?.collection?.status === "COMPLETED" ? "Definir destino do material" : "Editar destinação"}
                      </button>
                    )}
                    {cancel && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        disabled={
                          busy ||
                          ["CANCELLED", "COMPLETED"].includes(
                            getEntry(d)?.collection?.status,
                          )
                        }
                        onClick={() => cancel(d)}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function EntryDetail({ id }) {
  const [historyPage, setHistoryPage] = useState(1),
    [historySize, setHistorySize] = useState(20),
    loader = useCallback(async () => {
      const [e, h] = await Promise.all([
        getCollectionEntryById(id),
        getWasteDestinationsByEntry(id, {
          page: historyPage,
          limit: historySize,
          includeCancelled: true,
        }),
      ]);
      if (!e?.entry || !Array.isArray(h?.destinations))
        throw Error("Entrada ou histórico indisponível.");
      return { entry: e.entry, history: h };
    }, [id, historyPage, historySize]),
    resource = useWasteResource(loader),
    editor = useDestinationEditor(resource.refresh),
    e = resource.data?.entry,
    h = resource.data?.history;
  return (
    <WastePage
      title="Detalhes da Entrada de Resíduo"
      description="Confira origem, saldo, documentos e histórico completo antes de movimentar o material."
      actions={
        <button
          className="btn btn-outline-success"
          disabled={resource.loading}
          onClick={resource.refresh}
        >
          Atualizar entrada
        </button>
      }
    >
      <ResourceState resource={resource}>
        {e && (
          <>
            <Summary
              cards={[
                [entryName(e), e.status === "CANCELLED" ? getCollectionEntryStatusLabel(e.status) : entryDisposition(e).label],
                [
                  e.collection?.quantityReviewVersion
                    ? "Quantidade conferida"
                    : "Informado em campo",
                  quantity(e.collectedQuantity, e.unit),
                ],
                ["Alocado em movimentações", quantity(e.destinedQuantity, e.unit)],
                ["Saldo sem encaminhamento", quantity(e.remainingQuantity, e.unit)],
              ]}
            />
            <section className="card p-4 mb-4">
              <h2 className="fs-18">Destinos do material</h2>
              <MaterialDestinations entry={e} />
            </section>
            <section className="card p-4 mb-4">
              <h2 className="fs-18">Origem e rastreabilidade</h2>
              <p>
                {generatorName(e)} · Coletado em{" "}
                {dateLabel(e.collectedAt, true)}
              </p>
              <p className="small text-break">Entrada: {e.id}</p>
              <p>
                Catador: {personName(e.collector || e.collection?.collector)}
                <br />
                Motorista: {personName(e.driver || e.collection?.driver)}
                <br />
                Veículo:{" "}
                {e.vehicle?.plate ||
                  e.collection?.vehicle?.plate ||
                  "Não informado"}
                <br />
                Rota:{" "}
                {e.route?.name || e.collection?.route?.name || "Não informada"}
                <br />
                Etapa da coleta:{" "}
                {COLLECTION_STAGES[e.collection?.status] || "Não informada"}
              </p>
              <div className="d-flex flex-wrap gap-2">
                {e.collection?.bin?.id && (
                  <Link
                    to={`/bin-list/${encodeURIComponent(e.collection.bin.id)}`}
                    className="btn btn-outline-success"
                  >
                    Ver PEV de origem
                  </Link>
                )}
                {e.collectionId && (
                  <Link
                    to={`/waste-list?coleta=${encodeURIComponent(e.collectionId)}`}
                    className="btn btn-outline-secondary"
                  >
                    Ver coleta de origem
                  </Link>
                )}
                <Link
                  to={`/waste-destinations?entryId=${encodeURIComponent(e.id)}`}
                  className="btn btn-outline-secondary"
                >
                  Gerenciar destinações da entrada
                </Link>
                <button
                  className="btn btn-success"
                  disabled={!allowed(e) || editor.busy}
                  onClick={() => editor.open(e)}
                >
                  Registrar destinação
                </button>
              </div>
              <p className="small text-muted mt-3 mb-0">
                Saldo desta entrada ainda não destinado. Não representa estoque
                físico disponível. A equipe atual da rota não substitui os
                vínculos da coleta.
              </p>
            </section>
            {editor.notice && (
              <p role="status" className="alert alert-success">
                {editor.notice}
              </p>
            )}
            {editor.error && (
              <p role="alert" className="alert alert-danger">
                {editor.error}
              </p>
            )}
            <section className="card p-3">
              <h2 className="fs-18">Histórico de destinações</h2>
              {h.destinations.length ? (
                <DestinationTable rows={h.destinations} />
              ) : (
                <p>Nenhuma destinação registrada.</p>
              )}
              <WorkspacePagination
                page={h.pagination.page}
                size={historySize}
                total={h.pagination.total}
                onPage={setHistoryPage}
                onSize={(n) => {
                  setHistorySize(n);
                  setHistoryPage(1);
                }}
              />
            </section>
          </>
        )}
      </ResourceState>
      {editor.view}
    </WastePage>
  );
}
