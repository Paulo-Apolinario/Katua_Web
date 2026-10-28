import FixedRouteOperations from "../../components/collections/FixedRouteOperations";
import FieldOperationBadge from "../../components/collections/FieldOperationBadge";
import {
  getFieldCollections,
  getFieldRoutes,
  getFieldOptions,
} from "../../services/wasteWorkspaceService";
import CollectionTeam from "../../components/collections/CollectionTeam";
import CollectionQuantityReview from "../../components/collections/CollectionQuantityReview";
import { downloadCollectionPdf } from "../../utils/collectionPdf";
import CollectionIncidents from "../../components/collections/CollectionIncidents";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import HeadTags from "../../components/HeadTags";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { getCollectionById } from "../../services/collectionService";
import CollectionStageActions from "../../components/collections/CollectionStageActions";
import CollectionDialog from "../../components/collections/CollectionDialog";
import {
  MaterialTable,
  Summary,
  WorkspacePagination,
} from "../../components/collections/WorkspaceParts";
import {
  COLLECTION_STAGES,
  personName,
  generatorName,
  location,
  scheduledDate,
  quantity,
  dateLabel,
  materials,
  shortId,
} from "../../utils/collectionWorkspace";

const defaults = {
  q: "",
  status: "",
  generator: "",
  route: "",
  driver: "",
  vehicle: "",
  collector: "",
  start: "",
  end: "",
  dateField: "scheduled",
  inField: "",
};
const errorText = (err) =>
  err?.error || err?.message || "Não foi possível carregar as coletas.";
export default function WasteList() {
  const { admin } = useAdminAuth();
  return admin?.id ? (
    <CollectionList
      key={admin.id}
      cooperativeName={admin.cooperative?.name || admin.displayName}
    />
  ) : null;
}
function CollectionList({ cooperativeName }) {
  const [params, setParams] = useSearchParams();
  const kind = params.get("tipo") === "fixed" ? "fixed" : "normal";
  const [revision, setRevision] = useState(0);
  const [operationBusy, setOperationBusy] = useState(false);
  const [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [filters, setFilters] = useState(() => ({
      ...defaults,
      status: params.get("status") || "",
      route: params.get("execucao") || "",
      inField: params.get("emCampo") === "true" ? "true" : "",
    })),
    [page, setPage] = useState(1),
    [size, setSize] = useState(10);
  const [selected, setSelected] = useState(null),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState(""),
    [dialog, setDialog] = useState(false);
  const guard = useRef({ list: 0, detail: 0 });
  const [meta, setMeta] = useState(null),
    [filterOptions, setFilterOptions] = useState({}),
    [filterError, setFilterError] = useState("");
  useEffect(() => {
    let active = true;
    getFieldOptions()
      .then((r) => {
        if (active) setFilterOptions(r);
      })
      .catch(() => {
        if (active)
          setFilterError(
            "Os filtros de equipe não puderam ser carregados. Recarregue a página para tentar novamente.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const load = useCallback(
    async (quiet = false) => {
      const request = ++guard.current.list;
      if (!quiet) {
        setLoading(true);
        setItems([]);
      }
      setError("");
      try {
        const fetch = kind === "fixed" ? getFieldRoutes : getFieldCollections;
        const res = await fetch({
          ...filters,
          kind,
          page,
          limit: size,
        });
        const rows = kind === "fixed" ? res.routes : res.collections;
        if (!Array.isArray(rows))
          throw Error("Resposta de operações inválida.");
        if (request === guard.current.list) {
          setItems(rows);
          setRevision((n) => n + 1);
          setMeta(res);
        }
      } catch (e) {
        if (request === guard.current.list) setError(errorText(e));
      } finally {
        if (request === guard.current.list) setLoading(false);
      }
    },
    [filters, page, size, kind],
  );
  const openDetail = useCallback(async (id) => {
    const request = ++guard.current.detail;
    setDialog(true);
    setSelected(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const res = await getCollectionById(id);
      if (!res?.collection?.id) throw Error("Detalhes indisponíveis.");
      if (request === guard.current.detail) setSelected(res.collection);
    } catch (e) {
      if (request === guard.current.detail) setDetailError(errorText(e));
    } finally {
      if (request === guard.current.detail) setDetailLoading(false);
    }
  }, []);
  useEffect(() => {
    const g = guard.current;
    const timer = setTimeout(() => {
      void load();
    }, 200);
    return () => {
      clearTimeout(timer);
      g.list++;
      g.detail++;
    };
  }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden && !dialog) void load(true);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load, dialog]);
  const queryId = params.get("coleta");
  useEffect(() => {
    if (queryId) void openDetail(queryId);
  }, [queryId, openDetail]);
  const invalid = filters.start && filters.end && filters.start > filters.end;
  const filtered = items;
  const currentPage = page;
  const visible = items;
  const options = (field) => filterOptions[field] || [];
  function change(e) {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));
    setPage(1);
  }
  function close() {
    guard.current.detail++;
    setDialog(false);
    setSelected(null);
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("coleta");
        return next;
      },
      { replace: true },
    );
  }
  const timeline = selected
    ? [
        ["Criada", selected.createdAt],
        ["Iniciada", selected.startedAt, selected.startedBy],
        [
          "Finalizada em campo",
          selected.collectedAt,
          selected.fieldCompletedBy,
        ],
        ["Recebida", selected.receivedAt, selected.receivedBy],
        [
          "Triagem iniciada",
          selected.sortingStartedAt,
          selected.sortingStartedBy,
        ],
        ["Concluída", selected.completedAt, selected.completedBy],
        ["Cancelada", selected.cancelledAt, selected.cancelledBy],
      ].filter(([, date]) => date)
    : [];
  return (
    <main className="container-fluid py-4 collection-workspace">
      <HeadTags title="Lista de Coletas | KATUÁ" />
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h3">Lista de Coletas</h1>
          <p className="text-muted">
            Acompanhe cada coleta, da atribuição à conclusão. Os materiais e
            suas destinações permanecem vinculados à operação.
          </p>
          <p className="small text-muted">
            Ocorrências abertas: {meta?.stats.incidents ?? "—"}. Consulte o
            tratamento em Ver detalhes.
          </p>
          <Link to="/extra-collection-orders">Ordens de coleta extras</Link>
          <span className="mx-2">·</span>
          <Link to="/collection-requests">Coletas solicitadas</Link>
          <span className="mx-2">·</span>
          <Link to="/collected-waste">Gestão dos materiais coletados</Link>
          {kind === "fixed" && (
            <>
              <span className="mx-2">·</span>
              <Link to="/route-plans">Gerenciar rotas fixas</Link>
            </>
          )}
        </div>
        <button
          className="btn btn-outline-success"
          onClick={() => load()}
          disabled={loading}
        >
          Atualizar coletas
        </button>
      </div>
      <nav className="d-flex flex-wrap gap-2 mb-3" aria-label="Tipos de coleta">
        {[
          ["normal", "Coletas normais"],
          ["fixed", "Rotas fixas"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={`btn btn-sm ${kind === value ? "btn-success" : "btn-outline-success"}`}
            aria-pressed={kind === value}
            onClick={() => {
              setPage(1);
              setItems([]);
              setLoading(true);
              setFilters((f) => ({ ...f, route: "" }));
              setParams(
                (current) => {
                  const next = new URLSearchParams(current);
                  next.set("tipo", value);
                  next.delete("execucao");
                  return next;
                },
                { replace: true },
              );
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {kind === "fixed" && (
        <p className="small text-muted">
          Uma linha por execução e data. Os filtros selecionam execuções; ao
          expandir, todos os pontos da execução ficam disponíveis com seus
          próprios status.
        </p>
      )}
      <Summary
        cards={
          loading || error
            ? [
                ["Coletas encontradas", "—"],
                ["Pendentes / em andamento", "—"],
                ["Aguardando recebimento", "—"],
                ["Quantidades registradas", "—"],
              ]
            : [
                [
                  kind === "fixed"
                    ? "Execuções encontradas"
                    : "Coletas encontradas",
                  meta?.pagination.total ?? 0,
                ],
                ["Pendentes / em andamento", meta?.stats.active ?? 0],
                ["Aguardando recebimento", meta?.stats.awaitingReceipt ?? 0],
                [
                  "Quantidades registradas",
                  meta?.stats.units
                    .map((u) => quantity(u.quantity, u.unit))
                    .join(" · ") || "Não informadas",
                ],
              ]
        }
      />
      {filterError && (
        <p role="alert" className="alert alert-warning">
          {filterError}
        </p>
      )}
      <section className="card p-3 mb-4" aria-label="Filtros de coletas">
        <div className="row g-3">
          <div className="col-md-6">
            <label htmlFor="collection-search" className="form-label">
              Buscar protocolo, gerador, material ou equipe
            </label>
            <input
              id="collection-search"
              className="form-control"
              name="q"
              value={filters.q}
              onChange={change}
              type="search"
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="collection-status" className="form-label">
              Etapa da coleta
            </label>
            <select
              id="collection-status"
              className="form-select"
              name="status"
              value={filters.status}
              onChange={change}
            >
              <option value="">Todas</option>
              <option value="IN_FIELD">Em campo (saída confirmada)</option>
              {Object.entries(COLLECTION_STAGES).map(([id, label]) => (
                <option value={id} key={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <details className="mt-3 collection-advanced-filters">
          <summary>
            Origem, equipe e período
            {[
              "generator",
              "route",
              "collector",
              "driver",
              "vehicle",
              "start",
              "end",
            ].some((key) => filters[key])
              ? " · filtros ativos"
              : ""}
          </summary>
          <div className="row g-3 mt-1">
            {[
              ["generator", "Gerador"],
              ["route", "Rota"],
              ["collector", "Catador"],
              ["driver", "Motorista"],
              ["vehicle", "Veículo"],
            ].map(([field, label]) => (
              <div className="col-md-3" key={field}>
                <label htmlFor={`collection-${field}`} className="form-label">
                  {label}
                </label>
                <select
                  id={`collection-${field}`}
                  name={field}
                  className="form-select"
                  value={filters[field]}
                  onChange={change}
                >
                  <option value="">Todos</option>
                  {options(field).map((o) => (
                    <option key={o.id} value={o.id}>
                      {field === "vehicle" ? o.plate : personName(o)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="col-md-3">
              <label htmlFor="collection-date-field" className="form-label">
                Período por
              </label>
              <select
                id="collection-date-field"
                name="dateField"
                className="form-select"
                value={filters.dateField}
                onChange={change}
              >
                <option value="scheduled">Data programada</option>
                <option value="collected">Finalização em campo</option>
                <option value="created">Criação da coleta</option>
              </select>
            </div>
            {[
              ["start", "Data inicial"],
              ["end", "Data final"],
            ].map(([field, label]) => (
              <div className="col-md-3" key={field}>
                <label htmlFor={`collection-${field}`} className="form-label">
                  {label}
                </label>
                <input
                  id={`collection-${field}`}
                  name={field}
                  type="date"
                  className="form-control"
                  value={filters[field]}
                  onChange={change}
                />
              </div>
            ))}
          </div>
        </details>
        <div className="mt-3">
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              setFilters(defaults);
              setPage(1);
              setParams(
                (current) => {
                  const next = new URLSearchParams(current);
                  for (const key of ["execucao", "emCampo", "status"])
                    next.delete(key);
                  return next;
                },
                { replace: true },
              );
            }}
          >
            Limpar filtros
          </button>
        </div>
        <label className="d-flex align-items-center gap-2 mt-3">
          <input
            type="checkbox"
            checked={filters.inField === "true"}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({
                ...f,
                inField: e.target.checked ? "true" : "",
              }));
            }}
          />
          Somente operações em campo
        </label>
        <p className="small text-muted mt-3 mb-0">
          Cartões e quantidades seguem os filtros. Totais excluem coletas
          canceladas e mantêm cada unidade separada. Registros sem a data
          escolhida ficam fora do período.
        </p>
        {invalid && (
          <p role="alert" className="text-danger mt-2">
            A data inicial deve ser anterior ou igual à final.
          </p>
        )}
      </section>
      <section className="card p-3" aria-label="Resultados das coletas">
        {loading ? (
          <p role="status">Carregando coletas...</p>
        ) : error ? (
          <div role="alert" className="alert alert-danger">
            {error}{" "}
            <button className="btn btn-outline-danger" onClick={() => load()}>
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            {!filtered.length ? (
              <p className="text-center py-4">
                {kind === "fixed"
                  ? "Nenhuma execução de rota fixa corresponde aos filtros."
                  : "Nenhuma coleta corresponde aos filtros selecionados."}
              </p>
            ) : kind === "fixed" ? (
              <FixedRouteOperations
                routes={visible}
                onDetail={openDetail}
                highlight={params.get("execucao")}
                revision={revision}
                busy={operationBusy}
              />
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Coleta / Gerador</th>
                      <th>Programação / Rota</th>
                      <th>Equipe vinculada</th>
                      <th>Etapa</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <strong>#{shortId(c.id)}</strong>
                          <div>{generatorName(c)}</div>
                          <small className="text-muted">{location(c)}</small>
                        </td>
                        <td>
                          {dateLabel(scheduledDate(c))}
                          <div className="small text-muted">
                            {c.route?.name || "Sem rota"}
                          </div>
                        </td>
                        <td>
                          <div>Catador: {personName(c.collector)}</div>
                          <div className="small">
                            Motorista: {personName(c.driver)}
                          </div>
                          <div className="small">
                            Veículo: {c.vehicle?.plate || "Não informado"}
                          </div>
                        </td>
                        <td>
                          <FieldOperationBadge collection={c} />
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => openDetail(c.id)}
                          >
                            Ver detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <WorkspacePagination
              maxSize={50}
              page={currentPage}
              size={size}
              total={meta?.pagination.total ?? 0}
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
            selected ? `Coleta #${shortId(selected.id)}` : "Detalhes da coleta"
          }
          onClose={close}
          busy={operationBusy}
        >
          {detailLoading ? (
            <p role="status">Carregando detalhes...</p>
          ) : detailError ? (
            <p role="alert" className="text-danger">
              {detailError}
            </p>
          ) : (
            selected && (
              <>
                <div className="d-flex align-items-center flex-wrap gap-2 collection-detail-toolbar">
                  <FieldOperationBadge collection={selected} />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success"
                    disabled={operationBusy}
                    onClick={() =>
                      downloadCollectionPdf(selected, { cooperativeName })
                    }
                  >
                    Salvar coleta em PDF
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={operationBusy}
                    onClick={() => openDetail(selected.id)}
                  >
                    Atualizar detalhes
                  </button>
                </div>
                <CollectionQuantityReview
                  key={`${selected.id}:${selected.status}`}
                  collection={selected}
                  onBusy={setOperationBusy}
                  onChange={(updated) => {
                    setSelected(updated);
                    setItems((current) =>
                      current.map((item) =>
                        item.id === updated.id ? updated : item,
                      ),
                    );
                  }}
                />

                <CollectionStageActions
                  key={`${selected.id}:${selected.status}`}
                  collection={selected}
                  onBusy={setOperationBusy}
                  onChange={(updated) => {
                    setSelected(updated);
                    setItems((current) =>
                      current.map((item) =>
                        item.id === updated.id ? updated : item,
                      ),
                    );
                  }}
                />
                <details
                  className="workflow-details"
                  open={Boolean(
                    selected.participants?.length &&
                    ["RECEIVED", "SORTING"].includes(selected.status) &&
                    (!selected.allocationVersion ||
                      selected.allocationQuantityVersion !==
                        selected.quantityReviewVersion),
                  )}
                >
                  <summary>Equipe e divisão dos materiais</summary>
                  <CollectionTeam
                    collection={selected}
                    onBusy={setOperationBusy}
                    onChange={(updated) => {
                      setSelected(updated);
                      setItems((current) =>
                        current.map((item) =>
                          item.id === updated.id ? updated : item,
                        ),
                      );
                    }}
                  />{" "}
                </details>
                <details className="workflow-details">
                  <summary>Ocorrências e acompanhamento</summary>
                  <CollectionIncidents
                    collection={selected}
                    onBusy={setOperationBusy}
                    onChange={(updated) => {
                      setSelected(updated);
                      setItems((current) =>
                        current.map((item) =>
                          item.id === updated.id ? updated : item,
                        ),
                      );
                    }}
                  />
                </details>
                <details className="workflow-details">
                  <summary>Origem, materiais e histórico da coleta</summary>
                  <h3 className="fs-18 mt-3">{generatorName(selected)}</h3>
                  <p>{location(selected)}</p>
                  <p className="small text-muted text-break">
                    Identificador completo: {selected.id}
                  </p>
                  <dl className="row">
                    <dt className="col-sm-4">Data programada</dt>
                    <dd className="col-sm-8">
                      {dateLabel(scheduledDate(selected))}
                    </dd>
                    <dt className="col-sm-4">Rota</dt>
                    <dd className="col-sm-8">
                      {selected.route?.name || "Sem rota"}
                    </dd>
                    <dt className="col-sm-4">Catador</dt>
                    <dd className="col-sm-8">
                      {personName(selected.collector)}
                    </dd>
                    <dt className="col-sm-4">Motorista</dt>
                    <dd className="col-sm-8">{personName(selected.driver)}</dd>
                    <dt className="col-sm-4">Veículo</dt>
                    <dd className="col-sm-8">
                      {selected.vehicle?.plate || "Não informado"}
                    </dd>
                  </dl>
                  <h3 className="fs-18">Materiais registrados em campo</h3>
                  <MaterialTable items={materials(selected)} />
                  <p className="small">
                    Os vínculos exibidos são os da coleta; a equipe atual da
                    rota não substitui o histórico.
                  </p>
                  {materials(selected.schedule || {}, true).length > 0 && (
                    <>
                      <h3 className="fs-18">Previsão da solicitação</h3>
                      <MaterialTable
                        estimated
                        items={materials(selected.schedule || {}, true)}
                      />
                    </>
                  )}
                  <h3 className="fs-18">Histórico registrado</h3>
                  <ol>
                    {timeline.map(([label, date, actor]) => (
                      <li key={label}>
                        <strong>{label}</strong> — {dateLabel(date, true)}
                        {actor ? ` · ${personName(actor)}` : ""}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary ms-2"
                          onClick={() =>
                            downloadCollectionPdf(selected, {
                              cooperativeName,
                              event: [label, date, actor],
                            })
                          }
                        >
                          Baixar ação em PDF
                        </button>
                      </li>
                    ))}
                  </ol>
                  {selected.cancellationReason && (
                    <p>Motivo do cancelamento: {selected.cancellationReason}</p>
                  )}
                  <p>
                    Observações da coleta: {selected.notes || "Não informadas"}
                  </p>
                  <div className="alert alert-light">
                    Finalização em campo, recebimento e destinação são etapas
                    diferentes. As quantidades exibidas não representam saldo de
                    estoque.
                  </div>
                  <Link to="/collected-waste">
                    Consultar materiais e destinações
                  </Link>
                </details>
              </>
            )
          )}
        </CollectionDialog>
      )}
    </main>
  );
}
