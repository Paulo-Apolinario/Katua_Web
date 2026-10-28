import { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { getWasteCollections } from "../../services/wasteWorkspaceService";
import { useWasteResource } from "./useWasteResource";
import { WastePage, ResourceState, ExportButton } from "./WastePage";
import { Summary, WorkspacePagination } from "../collections/WorkspaceParts";
import {
  COLLECTION_STAGES,
  quantity,
  dateLabel,
  shortId,
} from "../../utils/collectionWorkspace";
import { downloadCsv } from "../../utils/wasteReports";
const stages = [
  ["all", "Todas"],
  ["receipt", "A receber"],
  ["review", "A conferir"],
  ["destination", "A destinar"],
  ["completed", "Concluídas"],
  ["cancelled", "Canceladas"],
];
const units = (rows = [], field) =>
  rows.map((r) => quantity(r[field], r.unit)).join(" · ") || "0";
export default function CollectedCollections({ editor, revision }) {
  const [params] = useSearchParams();
  const initial = {
      q: "",
      stage: stages.some(([v]) => v === params.get("stage"))
        ? params.get("stage")
        : "all",
      origin: "",
      dateFrom: "",
      dateTo: "",
    },
    [draft, setDraft] = useState(initial),
    [filters, setFilters] = useState(initial),
    [page, setPage] = useState(1),
    [limit, setLimit] = useState(20),
    [expanded, setExpanded] = useState(null);
  const loader = useCallback(() => {
      void revision;
      return getWasteCollections({ ...filters, page, limit });
    }, [filters, page, limit, revision]),
    r = useWasteResource(loader),
    rows = r.data?.collections || [];
  function stage(value) {
    setFilters((v) => ({ ...v, stage: value }));
    setDraft((v) => ({ ...v, stage: value }));
    setPage(1);
    setExpanded(null);
  }
  const periodInvalid =
    draft.dateFrom && draft.dateTo && draft.dateFrom > draft.dateTo;
  return (
    <WastePage
      title="Resíduos Coletados"
      description="Uma coleta por registro, com seus materiais, conferência e saldo para movimentação."
      actions={
        <>
          <ExportButton
            page
            disabled={r.loading || !!r.error || !rows.length}
            onClick={() =>
              downloadCsv(
                "katua-coletas-materiais-pagina.csv",
                [
                  "Coleta",
                  "Origem",
                  "Data",
                  "Etapa",
                  "Material",
                  "Conferido",
                  "Destinado",
                  "Saldo",
                  "Unidade",
                ],
                rows.flatMap((c) =>
                  c.collectionWasteEntries.map((e) => [
                    c.id,
                    c.bin?.name || c.generator?.name || "Coleta extra / avulsa",
                    c.collectedAt,
                    COLLECTION_STAGES[c.status],
                    e.materialNameSnapshot,
                    e.collectedQuantity,
                    e.destinedQuantity,
                    e.remainingQuantity,
                    e.unit,
                  ]),
                ),
              )
            }
          />
          <button
            className="btn btn-outline-success"
            disabled={r.loading}
            onClick={r.refresh}
          >
            Atualizar entradas
          </button>
        </>
      }
    >
      <div className="waste-tabs" role="group" aria-label="Etapa dos materiais">
        {stages.map(([value, label]) => (
          <button
            key={value}
            className={`btn btn-sm ${filters.stage === value ? "btn-success" : "btn-outline-secondary"}`}
            onClick={() => stage(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <Summary
        cards={[
          ["Coletas encontradas", r.data?.pagination.total ?? "—"],
          [
            "Quantidade registrada",
            r.data ? units(r.data.units, "collectedQuantity") : "—",
          ],
          [
            "Saldo a destinar",
            r.data ? units(r.data.units, "remainingQuantity") : "—",
          ],
        ]}
      />
      <form
        className="card p-3 mb-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!periodInvalid) {
            setFilters({ ...draft });
            setPage(1);
            setExpanded(null);
          }
        }}
      >
        <div className="row g-3">
          <div className="col-md-5">
            <label htmlFor="collected-search" className="form-label">
              Buscar origem, material ou coleta
            </label>
            <input
              id="collected-search"
              className="form-control"
              type="search"
              value={draft.q}
              onChange={(e) => setDraft((v) => ({ ...v, q: e.target.value }))}
            />
          </div>
          <div className="col-md-3">
            <label htmlFor="collected-origin" className="form-label">
              Origem
            </label>
            <select
              id="collected-origin"
              className="form-select"
              value={draft.origin}
              onChange={(e) =>
                setDraft((v) => ({ ...v, origin: e.target.value }))
              }
            >
              <option value="">Todas</option>
              <option value="PEV">PEVs</option>
              <option value="GENERATOR">Geradores</option>
              <option value="EXTRA">O.C.s extras</option>
              <option value="OTHER">Outras origens</option>
            </select>
          </div>
          <div className="col-md-4 d-flex align-items-end">
            <details>
              <summary>Período da coleta</summary>
              <div className="d-flex gap-2 mt-2">
                <input
                  aria-label="Data inicial"
                  className="form-control"
                  type="date"
                  value={draft.dateFrom}
                  onChange={(e) =>
                    setDraft((v) => ({ ...v, dateFrom: e.target.value }))
                  }
                />
                <input
                  aria-label="Data final"
                  className="form-control"
                  type="date"
                  value={draft.dateTo}
                  onChange={(e) =>
                    setDraft((v) => ({ ...v, dateTo: e.target.value }))
                  }
                />
              </div>
            </details>
          </div>
        </div>
        {periodInvalid && (
          <p role="alert" className="text-danger">
            A data inicial deve ser anterior à final.
          </p>
        )}
        <div className="d-flex gap-2 mt-3">
          <button className="btn btn-success" disabled={periodInvalid}>
            Aplicar filtros
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => {
              setDraft(initial);
              setFilters(initial);
              setPage(1);
            }}
          >
            Limpar filtros
          </button>
        </div>
      </form>
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
        <ResourceState resource={r}>
          {!rows.length ? (
            <p className="p-3">Nenhuma coleta corresponde aos filtros.</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle waste-compact-table">
                <thead>
                  <tr>
                    <th>Coleta / origem</th>
                    <th>Etapa e materiais</th>
                    <th>Saldo</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <CollectionRow
                      key={c.id}
                      c={c}
                      expanded={expanded === c.id}
                      toggle={() =>
                        setExpanded((v) => (v === c.id ? null : c.id))
                      }
                      destine={editor.open}
                      busy={editor.busy || r.loading || !!r.error}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {r.data && (
            <WorkspacePagination
              page={page}
              size={limit}
              total={r.data.pagination.total}
              onPage={setPage}
              onSize={(n) => {
                setLimit(n);
                setPage(1);
              }}
            />
          )}
        </ResourceState>
      </section>
      {editor.view}
    </WastePage>
  );
}
function CollectionRow({ c, expanded, toggle, destine, busy }) {
  const entries = c.collectionWasteEntries,
    editable =
      ["RECEIVED", "SORTING"].includes(c.status) && c.quantityReviewVersion > 0;
  return (
    <>
      <tr>
        <td>
          <strong>
            {c.bin?.name ||
              c.bin?.binId ||
              c.generator?.companyName ||
              c.generator?.name ||
              (c.extraOrder ? "Coleta extra" : "Coleta avulsa")}
          </strong>
          <small className="d-block text-muted">
            Coleta #{shortId(c.id)} · {dateLabel(c.collectedAt, true)}
          </small>
          <small>
            {c.collector?.name || "Responsável não informado"}
            {c.route?.name ? " · " + c.route.name : ""}
          </small>
        </td>
        <td>
          <span className="badge text-bg-light">
            {COLLECTION_STAGES[c.status]}
          </span>
          <small className="d-block">
            {entries.length} material(is) ·{" "}
            {c.quantityReviewVersion
              ? "Conferência registrada"
              : "Conferência pendente"}
          </small>
        </td>
        <td>{units(entries, "remainingQuantity")}</td>
        <td>
          <div className="d-flex gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-sm btn-outline-success"
              disabled={busy}
              onClick={toggle}
            >
              {expanded ? "Recolher materiais" : "Ver materiais"}
            </button>
            <Link
              className="btn btn-sm btn-outline-secondary"
              to={`/waste-list?coleta=${encodeURIComponent(c.id)}`}
            >
              {!c.quantityReviewVersion &&
              ["COLLECTED", "RECEIVED", "SORTING"].includes(c.status)
                ? "Receber / conferir"
                : "Ver coleta"}
            </Link>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={4}>
            <div className="waste-material-cards">
              {entries.map((e) => (
                <article className="border rounded p-3" key={e.id}>
                  <strong>{e.materialNameSnapshot}</strong>
                  <div className="small mt-2">
                    Registrado: {quantity(e.collectedQuantity, e.unit)} ·
                    Alocado em movimentações: {quantity(e.destinedQuantity, e.unit)}
                  </div>
                  <p className="mb-2">
                    Saldo:{" "}
                    <strong>{quantity(e.remainingQuantity, e.unit)}</strong>
                  </p>
                  {e.destinations.length > 0 && (
                    <p className="small text-warning">
                      Há movimentação intermediária a finalizar.
                    </p>
                  )}
                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      className="btn btn-sm btn-success"
                      disabled={
                        busy || !editable || Number(e.remainingQuantity) <= 0
                      }
                      onClick={() => destine(e)}
                      title={
                        !editable
                          ? "Confirme o recebimento e a conferência antes de destinar"
                          : "Registrar movimentação"
                      }
                    >
                      Destinar
                    </button>
                    <Link
                      className="btn btn-sm btn-outline-secondary"
                      to={`/collected-waste/${e.id}`}
                    >
                      Histórico da entrada
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
