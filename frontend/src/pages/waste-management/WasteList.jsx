import CollectionIncidents from "../../components/collections/CollectionIncidents";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import HeadTags from "../../components/HeadTags";
import { useAdminAuth } from "../../context/AdminAuthContext";
import {
  getAllCollections,
  getCollectionById,
} from "../../services/collectionService";
import CollectionStageActions from "../../components/collections/CollectionStageActions";
import CollectionDialog from "../../components/collections/CollectionDialog";
import {
  CollectionBadge,
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
  dateLabel,
  materials,
  searchText,
  shortId,
  inPeriod,
  unitTotals,
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
};
const errorText = (err) =>
  err?.error || err?.message || "Não foi possível carregar as coletas.";
export default function WasteList() {
  const { admin } = useAdminAuth();
  return admin?.id ? <CollectionList key={admin.id} /> : null;
}
function CollectionList() {
  const [params] = useSearchParams();
  const [operationBusy, setOperationBusy] = useState(false);
  const [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [filters, setFilters] = useState(defaults),
    [page, setPage] = useState(1),
    [size, setSize] = useState(10);
  const [selected, setSelected] = useState(null),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState(""),
    [dialog, setDialog] = useState(false);
  const guard = useRef({ list: 0, detail: 0 });
  const load = useCallback(async (quiet = false) => {
    const request = ++guard.current.list;
    if (!quiet) {
      setLoading(true);
      setItems([]);
      setPage(1);
    }
    setError("");
    try {
      const res = await getAllCollections();
      if (!Array.isArray(res?.collections))
        throw Error("Resposta de coletas inválida.");
      if (request === guard.current.list) setItems(res.collections);
    } catch (e) {
      if (request === guard.current.list) setError(errorText(e));
    } finally {
      if (request === guard.current.list) setLoading(false);
    }
  }, []);
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
    void load();
    return () => {
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
  const filtered = useMemo(
    () =>
      items
        .filter((c) => {
          if (invalid) return false;
          const term = searchText(filters.q);
          if (
            term &&
            !searchText(
              [
                c.id,
                generatorName(c),
                location(c),
                c.route?.name,
                personName(c.collector),
                personName(c.driver),
                c.vehicle?.plate,
                COLLECTION_STAGES[c.status],
                ...(c.incidents || []).map((incident) => incident.description),
                ...materials(c).map((m) => m.name),
              ].join(" "),
            ).includes(term)
          )
            return false;
          if (filters.status && c.status !== filters.status) return false;
          if (
            (filters.generator && c.generatorId !== filters.generator) ||
            (filters.route && c.routeId !== filters.route) ||
            (filters.driver && c.driverId !== filters.driver) ||
            (filters.vehicle && c.vehicleId !== filters.vehicle) ||
            (filters.collector && c.collectorId !== filters.collector)
          )
            return false;
          return inPeriod(
            filters.dateField === "scheduled"
              ? scheduledDate(c)
              : filters.dateField === "collected"
                ? c.collectedAt
                : c.createdAt,
            filters.start,
            filters.end,
          );
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [items, filters, invalid],
  );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / size)),
  );
  const visible = filtered.slice((currentPage - 1) * size, currentPage * size);
  const options = (field) => [
    ...new Map(
      items.filter((c) => c[field]?.id).map((c) => [c[field].id, c[field]]),
    ).values(),
  ];
  function change(e) {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));
    setPage(1);
  }
  function close() {
    guard.current.detail++;
    setDialog(false);
    setSelected(null);
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
            Ocorrências abertas:{" "}
            {items.reduce(
              (total, c) =>
                total +
                (c.incidents || []).filter((i) => i.status === "OPEN").length,
              0,
            )}
            . Consulte o tratamento em Ver detalhes.
          </p>
          <Link to="/extra-collection-orders">Ordens de coleta extras</Link>
          <Link to="/collection-requests">Coletas solicitadas</Link>
          <span className="mx-2">·</span>
          <Link to="/collected-waste">Gestão dos materiais coletados</Link>
        </div>
        <button
          className="btn btn-outline-success"
          onClick={() => load()}
          disabled={loading}
        >
          Atualizar coletas
        </button>
      </div>
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
                ["Coletas encontradas", filtered.length],
                [
                  "Pendentes / em andamento",
                  filtered.filter((c) =>
                    ["PENDING", "IN_PROGRESS"].includes(c.status),
                  ).length,
                ],
                [
                  "Aguardando recebimento",
                  filtered.filter((c) => c.status === "COLLECTED").length,
                ],
                [
                  "Quantidades registradas",
                  unitTotals(filtered).join(" · ") || "Não informadas",
                ],
              ]
        }
      />
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
          <div className="col-md-3">
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
              {Object.entries(COLLECTION_STAGES).map(([id, label]) => (
                <option value={id} key={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
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
        <div className="mt-3">
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              setFilters(defaults);
              setPage(1);
            }}
          >
            Limpar filtros
          </button>
        </div>
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
                {items.length
                  ? "Nenhuma coleta corresponde aos filtros."
                  : "Nenhuma coleta operacional cadastrada. Aceite uma solicitação para começar."}
              </p>
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
                          <CollectionBadge status={c.status} />
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
                <div className="d-flex align-items-center gap-3">
                  <CollectionBadge status={selected.status} />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={operationBusy}
                    onClick={() => openDetail(selected.id)}
                  >
                    Atualizar detalhes
                  </button>
                </div>
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
                  <dd className="col-sm-8">{personName(selected.collector)}</dd>
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
                  Os vínculos exibidos são os da coleta; a equipe atual da rota
                  não substitui o histórico.
                </p>
                <h3 className="fs-18">Previsão da solicitação</h3>
                <MaterialTable
                  estimated
                  items={materials(selected.schedule || {}, true)}
                />
                <h3 className="fs-18">Histórico registrado</h3>
                <ol>
                  {timeline.map(([label, date, actor]) => (
                    <li key={label}>
                      <strong>{label}</strong> — {dateLabel(date, true)}
                      {actor ? ` · ${personName(actor)}` : ""}
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
              </>
            )
          )}
        </CollectionDialog>
      )}
    </main>
  );
}
