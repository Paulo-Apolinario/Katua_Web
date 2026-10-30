import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import {
  getWorkspaceInventory,
  getWorkspaceLots,
  clearWasteCatalogCache,
} from "../../services/wasteWorkspaceService";
import {
  patchWasteType,
  WASTE_UNIT_OPTIONS,
} from "../../services/wasteTypeService";
import {
  getWasteLotStatusLabel,
  getProcessingStageLabel,
} from "../../services/wasteStockService";
import { WastePage, ResourceState, ExportButton } from "./WastePage";
import { useWasteResource, useWasteOperation } from "./useWasteResource";
import { Summary, WorkspacePagination } from "../collections/WorkspaceParts";
import { quantity, dateLabel, shortId } from "../../utils/collectionWorkspace";
import { downloadCsv } from "../../utils/wasteReports";
import CollectionDialog from "../collections/CollectionDialog";
const available = (balances = [], status = "AVAILABLE") =>
  balances
    .filter((b) => b.status === status)
    .map((b) => quantity(b._sum.availableQuantity, b.unit))
    .join(" · ") || "0";
function Lots({ item, view, status }) {
  const [page, setPage] = useState(1),
    loader = useCallback(
      () => getWorkspaceLots(item.id, { view, status, page, limit: 10 }),
      [item.id, view, page, status],
    ),
    r = useWasteResource(loader);
  return (
    <ResourceState resource={r}>
      <div className="table-responsive">
        <table className="table waste-compact-table">
          <thead>
            <tr>
              <th>Lote / entrada</th>
              <th>Quantidade</th>
              <th>Situação</th>
              <th>Recebimento / ação</th>
            </tr>
          </thead>
          <tbody>
            {r.data?.lots.map((l) => (
              <tr key={l.id}>
                <td>
                  <strong>{l.lotCode || l.code || shortId(l.id)}</strong>
                  <div className="small">
                    {l.originCollectionWasteEntryId ? (
                      <Link className="btn btn-sm btn-outline-success align-self-center"
                        to={`/collected-waste/${l.originCollectionWasteEntryId}`}
                      >
                        Ver entrada de origem
                      </Link>
                    ) : (
                      "Entrada manual"
                    )}
                  </div>
                </td>
                <td>
                  {quantity(l.availableQuantity, l.unit)}
                  <small className="d-block text-muted">
                    Inicial: {quantity(l.quantity ?? l.quantityKg, l.unit)}
                  </small>
                </td>
                <td>
                  {getWasteLotStatusLabel(l.status)}
                  <small className="d-block">
                    {getProcessingStageLabel(l.processingStage)}
                  </small>
                </td>
                <td>
                  <div className="d-flex flex-column align-items-start gap-2">
                  <time>{dateLabel(l.receivedAt)}</time>
                  <Link
                    className="btn btn-sm btn-outline-success d-inline-flex"
                    to={`/waste-stock/lots/${l.id}/edit`}
                  >
                    {view === "history"
                      ? "Consultar registro"
                      : ["AVAILABLE", "RESERVED"].includes(l.status) && Number(l.availableQuantity)>0 ? "Movimentar lote" : "Consultar destino e histórico"}
                  </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {r.data && (
        <WorkspacePagination
          page={page}
          size={10}
          total={r.data.pagination.total}
          onPage={setPage}
          onSize={() => {}}
        />
      )}
    </ResourceState>
  );
}
export default function WorkspaceInventoryList({ catalog = false }) {
  const location = useLocation(),
    [params, setParams] = useSearchParams(),
    view = catalog
      ? "catalog"
      : ["history", "closed"].includes(params.get("view"))
        ? params.get("view")
        : "current";
  const initial = { q: "", unit: "", status: "", category: "" },
    [draft, setDraft] = useState(initial),
    [filters, setFilters] = useState(initial),
    [page, setPage] = useState(1),
    [limit, setLimit] = useState(20),
    [expanded, setExpanded] = useState(null),
    [target, setTarget] = useState(null),
    op = useWasteOperation(),
    [notice, setNotice] = useState(location.state?.notice || "");
  const itemId = params.get("itemId") || "",
    loader = useCallback(
      () => getWorkspaceInventory({ ...filters, view, page, limit, itemId }),
      [filters, view, page, limit, itemId],
    ),
    r = useWasteResource(loader);
  useEffect(() => {
    setPage(1);
    setExpanded(null);
    setDraft({ q: "", unit: "", status: "", category: "" });
    setFilters({ q: "", unit: "", status: "", category: "" });
  }, [view, itemId]);
  const rows = r.data?.items || [];
  function changeView(history) {
    const next = new URLSearchParams(params);
    if (history) next.set("view", history === "closed" ? "closed" : "history");
    else next.delete("view");
    setParams(next);
  }
  async function confirmStatus() {
    const res = await op.run(() =>
      patchWasteType(target.id, {
        status: target.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      }),
    );
    if (res?.item) {
      clearWasteCatalogCache();
      setTarget(null);
      setNotice("Situação do material atualizada.");
      await r.refresh();
    }
  }
  return (
    <WastePage
      title={catalog ? "Catálogo de Resíduos" : "Estoque e Lotes"}
      description={
        catalog
          ? "Identificação dos materiais da cooperativa. O cadastro não cria estoque."
          : "Saldos disponíveis e reservados, com acesso aos lotes e suas origens."
      }
      actions={
        <>
          <ExportButton
            page
            disabled={r.loading || !!r.error || !rows.length}
            onClick={() =>
              downloadCsv(
                catalog
                  ? "katua-catalogo-pagina.csv"
                  : "katua-estoque-pagina.csv",
                ["Material", "Categoria", "Unidade", "Situação", "Lotes"],
                rows.map((i) => [
                  i.name,
                  i.category,
                  i.unit,
                  i.status,
                  i._count.lots,
                ]),
              )
            }
          />
          <button
            className="btn btn-outline-success"
            disabled={r.loading}
            onClick={r.refresh}
          >
            Atualizar
          </button>
          <Link
            className="btn btn-success"
            to={catalog ? "/create-type" : "/waste-stock/create"}
          >
            {catalog ? "Cadastrar material" : "Adicionar lote manual"}
          </Link>
        </>
      }
    >
      {!catalog && (
        <div className="waste-tabs" role="group" aria-label="Visão do estoque">
          <button
            className={`btn ${view === "current" ? "btn-success" : "btn-outline-secondary"}`}
            onClick={() => changeView(false)}
          >
            Estoque atual
          </button>
          <button className={`btn ${view === "closed" ? "btn-success" : "btn-outline-secondary"}`} onClick={()=>changeView("closed")}>Saídas concluídas</button>
          <button
            className={`btn ${view === "history" ? "btn-success" : "btn-outline-secondary"}`}
            onClick={() => changeView(true)}
          >
            Histórico de cancelamentos
          </button>
        </div>
      )}
      {itemId && (
        <p className="alert alert-light">
          Material selecionado.{" "}
          <Link className="btn btn-sm btn-outline-success align-self-center"
            to={
              view === "history" ? "/waste-stock?view=history" : "/waste-stock"
            }
          >
            Ver todos os materiais
          </Link>
        </p>
      )}
      <Summary
        cards={
          catalog
            ? [
                ["Materiais encontrados", r.data?.pagination.total ?? "—"],
                ["Cadastro", "Sem geração de estoque"],
              ]
            : [
                ["Materiais", r.data?.pagination.total ?? "—"],
                [
                  view === "history" ? "Lotes cancelados" : "Lotes",
                  r.data?.lotCount ?? "—",
                ],
                ...(view === "history"
                  ? []
                  : [
                      ["Disponível", r.data ? available(r.data.balances) : "—"],
                      [
                        "Reservado",
                        r.data ? available(r.data.balances, "RESERVED") : "—",
                      ],
                    ]),
              ]
        }
      />
      <form
        className="card p-3 mb-3"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters({ ...draft });
          setPage(1);
          setExpanded(null);
        }}
      >
        <div className="row g-3">
          <div className="col-md-5">
            <label htmlFor="inventory-search" className="form-label">
              Buscar material, categoria ou código
            </label>
            <input
              id="inventory-search"
              type="search"
              className="form-control"
              value={draft.q}
              onChange={(e) => setDraft((v) => ({ ...v, q: e.target.value }))}
            />
          </div>
          <div className="col-md-3">
            <label htmlFor="inventory-unit" className="form-label">
              Unidade
            </label>
            <select
              id="inventory-unit"
              className="form-select"
              value={draft.unit}
              onChange={(e) =>
                setDraft((v) => ({ ...v, unit: e.target.value }))
              }
            >
              <option value="">Todas</option>
              {WASTE_UNIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label htmlFor="inventory-status" className="form-label">
              Situação
            </label>
            <select
              id="inventory-status"
              className="form-select"
              value={draft.status}
              onChange={(e) =>
                setDraft((v) => ({ ...v, status: e.target.value }))
              }
            >
              <option value="">Todas</option>
              {(catalog
                ? [
                    ["ACTIVE", "Ativo"],
                    ["INACTIVE", "Inativo"],
                  ]
                : view === "history"
                  ? [["CANCELLED", "Cancelado"]]
                  : [
                      ["AVAILABLE", "Disponível"],
                      ["RESERVED", "Reservado"],
                      ["SOLD", "Vendido"],
                      ["DESTINED", "Destinado"],
                      ["DISCARDED", "Descartado"],
                    ]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="d-flex gap-2 mt-3">
          <button className="btn btn-success">Aplicar filtros</button>
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
      {notice && (
        <p role="status" className="alert alert-success">
          {notice}
        </p>
      )}
      <section className="card p-3">
        <ResourceState resource={r}>
          {!rows.length ? (
            <p className="p-3">
              {catalog
                ? "Nenhum material corresponde aos filtros."
                : view === "history"
                  ? "Nenhum lote cancelado corresponde aos filtros."
                  : "Nenhum lote corresponde aos filtros. Consulte o catálogo para ver os materiais cadastrados."}
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle waste-compact-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>{catalog ? "Unidade e situação" : "Saldos"}</th>
                    <th>Lotes</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((i) => (
                    <InventoryItem
                      key={i.id}
                      item={i}
                      catalog={catalog}
                      view={view}
                      expanded={expanded === i.id}
                      toggle={() =>
                        setExpanded((v) => (v === i.id ? null : i.id))
                      }
                      busy={op.busy || r.loading || !!r.error}
                      lotStatus={filters.status}
                      changeStatus={() => {
                        op.setError("");
                        setTarget(i);
                      }}
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
              onSize={(v) => {
                setLimit(v);
                setPage(1);
              }}
            />
          )}
        </ResourceState>
      </section>
      {target && (
        <CollectionDialog
          title="Alterar situação do material"
          busy={op.busy}
          onClose={() => setTarget(null)}
        >
          <p>
            {target.name}:{" "}
            {target.status === "ACTIVE"
              ? "inativar para novas operações"
              : "reativar no catálogo"}
            ?
          </p>
          <p className="small text-muted">
            As movimentações e os lotes existentes são preservados.
          </p>
          {op.error && (
            <p role="alert" className="text-danger">
              {op.error}
            </p>
          )}
          <button
            className="btn btn-success"
            disabled={op.busy}
            onClick={confirmStatus}
          >
            Confirmar alteração
          </button>
        </CollectionDialog>
      )}
    </WastePage>
  );
}
function InventoryItem({
  item: i,
  catalog,
  view,
  expanded,
  toggle,
  busy,
  changeStatus,
  lotStatus,
}) {
  return (
    <>
      <tr>
        <td>
          <strong>{i.name}</strong>
          <small className="d-block text-muted">
            {i.category}
            {i.subcategory ? " · " + i.subcategory : ""}
            {i.internalCode ? " · " + i.internalCode : ""}
          </small>
        </td>
        <td>
          {catalog ? (
            <>
              <span
                className={`badge text-bg-${i.status === "ACTIVE" ? "success" : "secondary"}`}
              >
                {i.status === "ACTIVE" ? "Ativo" : "Inativo"}
              </span>
              <small className="d-block">{WASTE_UNIT_OPTIONS.find(option=>option.value===i.unit)?.label || i.unit}</small>
            </>
          ) : view === "history" || view === "closed" ? (
            view === "closed" ? "Sem saldo · saídas registradas" : "Consulta histórica"
          ) : (
            <>
              <div>Disponível: {available(i.balances)}</div>
              <small>Reservado: {available(i.balances, "RESERVED")}</small>
            </>
          )}
        </td>
        <td>{i._count.lots}</td>
        <td>
          <div className="d-flex gap-2 flex-wrap">
            {catalog ? (
              <>
                <Link
                  className="btn btn-sm btn-outline-secondary"
                  to={`/edit-waste-type/${i.id}`}
                >
                  Editar material
                </Link>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={busy}
                  onClick={changeStatus}
                >
                  {i.status === "ACTIVE" ? "Inativar" : "Reativar"}
                </button>
              </>
            ) : (
              <button
                className="btn btn-sm btn-outline-success"
                disabled={busy}
                onClick={toggle}
              >
                {expanded
                  ? "Recolher lotes"
                  : view === "history"
                    ? "Ver registros"
                    : "Ver lotes"}
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && !catalog && (
        <tr>
          <td colSpan={4}>
            <Lots
              key={`${i.id}:${view}`}
              item={i}
              view={view}
              status={lotStatus}
            />
          </td>
        </tr>
      )}
    </>
  );
}
