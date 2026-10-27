import { useWasteResource, useWasteOperation } from "./useWasteResource";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import {
  getWasteTypeById,
  createWasteType,
  patchWasteType,
  WASTE_UNIT_OPTIONS,
  WASTE_CLASS_OPTIONS,
  WASTE_STATUS_OPTIONS,
  getWasteClassLabel,
} from "../../services/wasteTypeService";
import {
  getWasteStockOverview,
  createWasteStockLot,
  patchWasteStockLot,
  WASTE_LOT_STATUS_OPTIONS,
  WASTE_PROCESSING_STAGE_OPTIONS,
  getWasteLotStatusLabel,
  getProcessingStageLabel,
} from "../../services/wasteStockService";
import {
  WastePage,
  WasteScope,
  ResourceState,
  Field,
  WasteGuide,
  ExportButton,
} from "./WastePage";
import CollectionDialog from "../collections/CollectionDialog";
import { Summary, WorkspacePagination } from "../collections/WorkspaceParts";
import { quantity, shortId, dateLabel } from "../../utils/collectionWorkspace";
import {
  stockBalances,
  unitSummary,
  lotQuantity,
  traceableLot,
  numeric,
} from "../../utils/wasteWorkspace";
import { filterInventory, downloadCsv } from "../../utils/wasteReports";
const catalogLoader = async () => {
  const r = await getWasteStockOverview();
  if (!Array.isArray(r?.items)) throw Error("Resposta do catálogo inválida.");
  return r.items;
};
export function InventoryScreen({ catalog = false }) {
  return (
    <WasteScope>
      <InventoryList key={catalog ? "catalog" : "stock"} catalog={catalog} />
    </WasteScope>
  );
}
function InventoryList({ catalog }) {
  const resource = useWasteResource(catalogLoader),
    operation = useWasteOperation(),
    location = useLocation();
  const [params, setParams] = useSearchParams(),
    history = !catalog && params.get("view") === "history",
    selectedItemId = !catalog ? params.get("itemId") || "" : "";
  const allLots = (resource.data || []).flatMap((i) => i.lots || []),
    cancelledCount = allLots.filter((l) => l.status === "CANCELLED").length,
    currentCount = allLots.length - cancelledCount;
  function changeView(nextHistory, itemId = "") {
    const next = new URLSearchParams(params);
    if (nextHistory) next.set("view", "history");
    else next.delete("view");
    if (itemId) next.set("itemId", itemId);
    else next.delete("itemId");
    setParams(next);
    setPage(1);
    setExpanded({});
    setQ("");
    setCategory("");
    setUnit("");
    setStatus("");
    setLotStatus("");
    setProcessingStage("");
    setOrigin("");
  }
  useEffect(() => {
    setPage(1);
    setExpanded({});
    setLotStatus("");
  }, [history, selectedItemId]);
  const [q, setQ] = useState(""),
    [category, setCategory] = useState(""),
    [unit, setUnit] = useState(""),
    [status, setStatus] = useState(""),
    [lotStatus, setLotStatus] = useState(""),
    [processingStage, setProcessingStage] = useState(""),
    [origin, setOrigin] = useState("");
  const [page, setPage] = useState(1),
    [size, setSize] = useState(10),
    [expanded, setExpanded] = useState({}),
    [target, setTarget] = useState(null);
  const rows = useMemo(
    () =>
      filterInventory(resource.data || [], {
        search: q,
        category,
        unit,
        status,
        lotStatus,
        processingStage,
        origin,
        catalog,
        lotScope: history ? "cancelled" : "current",
        itemId: selectedItemId,
      }),
    [
      resource.data,
      q,
      category,
      unit,
      status,
      lotStatus,
      processingStage,
      origin,
      catalog,
      history,
      selectedItemId,
    ],
  );
  function exportRows() {
    if (catalog) {
      downloadCsv(
        "katua-catalogo-filtrado.csv",
        [
          "ID",
          "Material",
          "Código interno",
          "Categoria",
          "Subcategoria",
          "Unidade",
          "Classificação",
          "NCM",
          "Situação",
          "Descrição",
        ],
        rows.map((i) => [
          i.id,
          i.name,
          i.internalCode,
          i.category,
          i.subcategory,
          i.unit,
          getWasteClassLabel(i.wasteClass),
          i.ncm,
          i.status,
          i.description,
        ]),
      );
    } else {
      downloadCsv(
        history
          ? "katua-historico-cancelamentos.csv"
          : "katua-estoque-filtrado.csv",
        [
          "ID material",
          "Material",
          "ID lote",
          "Código lote",
          history
            ? "Quantidade histórica anulada (sem saldo)"
            : "Quantidade registrada",
          "Saldo controlado",
          "Unidade",
          "Situação",
          "Processamento",
          "Local",
          "Origem",
          "ID entrada",
          "Recebido em",
          ...(history ? ["Motivo / observações", "Última atualização"] : []),
        ],
        rows.flatMap((i) =>
          (i.lots || []).map((l) => [
            i.id,
            i.name,
            l.id,
            l.lotCode || l.code,
            lotQuantity(l),
            l.availableQuantity,
            l.unit,
            getWasteLotStatusLabel(l.status),
            getProcessingStageLabel(l.processingStage),
            l.storageLocation,
            l.origin,
            l.originCollectionWasteEntryId,
            l.receivedAt || l.createdAt,
            ...(history ? [l.notes, l.updatedAt] : []),
          ]),
        ),
      );
    }
  }
  const balances = stockBalances(rows),
    current = Math.min(page, Math.max(1, Math.ceil(rows.length / size))),
    visible = rows.slice((current - 1) * size, current * size);
  function filter(set, value) {
    set(value);
    setPage(1);
  }
  async function confirm() {
    const res = await operation.run(() =>
      patchWasteType(target.id, {
        status: target.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      }),
    );
    if (res && !res.item?.id)
      operation.setError(
        "O servidor não confirmou a alteração. Atualize antes de repetir.",
      );
    if (res?.item?.id) {
      setTarget(null);
      await resource.refresh();
    }
  }
  return (
    <WastePage
      title={
        catalog
          ? "Catálogo de Resíduos"
          : history
            ? "Histórico de Cancelamentos"
            : "Visão do Estoque"
      }
      description={
        catalog
          ? "Cadastros de materiais, suas unidades e classificação. Cadastrar um tipo não movimenta estoque."
          : history
            ? "Registros anulados, motivos e vínculo de origem para consulta. Não representam estoque disponível."
            : "Acompanhe os lotes válidos, com os cancelamentos separados do estoque e dos contadores."
      }
      actions={
        <>
          <ExportButton
            disabled={
              resource.loading ||
              !!resource.error ||
              !(catalog ? rows.length : rows.some((i) => i.lots?.length))
            }
            onClick={exportRows}
          />
          <button
            className="btn btn-outline-success"
            onClick={resource.refresh}
            disabled={resource.loading || operation.busy}
          >
            Atualizar
          </button>
          {!history && (
            <Link
              className="btn btn-success"
              to={catalog ? "/create-type" : "/waste-stock/create"}
            >
              {catalog ? "Cadastrar tipo" : "Adicionar lote manual"}
            </Link>
          )}
        </>
      }
    >
      {!catalog && (
        <nav
          className="d-flex flex-wrap gap-2 mb-4"
          aria-label="Visões do estoque"
        >
          <button
            className={`btn ${!history ? "btn-success" : "btn-outline-success"}`}
            aria-current={!history ? "page" : undefined}
            onClick={() => changeView(false)}
          >
            Lotes válidos (
            {resource.loading || resource.error ? "—" : currentCount})
          </button>
          <button
            className={`btn ${history ? "btn-success" : "btn-outline-success"}`}
            aria-current={history ? "page" : undefined}
            onClick={() => changeView(true)}
          >
            Histórico de cancelamentos (
            {resource.loading || resource.error ? "—" : cancelledCount})
          </button>
        </nav>
      )}
      {selectedItemId && (
        <div className="alert alert-light d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <span>
            Material selecionado:{" "}
            <strong>
              {resource.data?.find((i) => i.id === selectedItemId)?.name ||
                selectedItemId}
            </strong>
          </span>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => changeView(history)}
          >
            Ver todos os materiais
          </button>
        </div>
      )}
      <WasteGuide
        title={
          catalog
            ? "Um catálogo consistente começa na identificação"
            : history
              ? "Rastreabilidade dos registros anulados"
              : "Do recebimento ao estoque disponível"
        }
        to={catalog ? "/create-type" : "/collected-waste"}
        label={catalog ? "Cadastrar material" : "Consultar entradas"}
      >
        {catalog
          ? "Use nomes, categorias e unidades padronizados. Inative materiais sem uso para manter o histórico e evitar novos registros incorretos."
          : history
            ? "Cada registro cancelado documenta uma anulação. Consulte o motivo e a entrada original. As quantidades são históricas e não devem ser somadas como saldo ou novas coletas."
            : "Confira o material, a etapa de processamento e o local antes de movimentar um lote. Use a entrada coletada para gerar lotes com vínculo de origem."}
      </WasteGuide>
      {location.state?.notice && (
        <p role="status" className="alert alert-success">
          {location.state.notice}
        </p>
      )}
      <Summary
        cards={
          catalog
            ? [
                [
                  "Tipos encontrados",
                  resource.loading || resource.error ? "—" : rows.length,
                ],
                [
                  "Ativos",
                  resource.loading || resource.error
                    ? "—"
                    : rows.filter((i) => i.status === "ACTIVE").length,
                ],
                [
                  "Inativos",
                  resource.loading || resource.error
                    ? "—"
                    : rows.filter((i) => i.status === "INACTIVE").length,
                ],
                [
                  "Categorias",
                  resource.loading || resource.error
                    ? "—"
                    : new Set(rows.map((i) => i.category)).size,
                ],
              ]
            : history
              ? [
                  [
                    "Materiais no histórico",
                    resource.loading || resource.error ? "—" : rows.length,
                  ],
                  [
                    "Registros cancelados",
                    resource.loading || resource.error
                      ? "—"
                      : rows.reduce((n, i) => n + i.lots.length, 0),
                  ],
                  [
                    "Com vínculo de coleta",
                    resource.loading || resource.error
                      ? "—"
                      : rows.flatMap((i) => i.lots).filter(traceableLot).length,
                  ],
                  [
                    "Sem vínculo de coleta",
                    resource.loading || resource.error
                      ? "—"
                      : rows
                          .flatMap((i) => i.lots)
                          .filter((l) => !traceableLot(l)).length,
                  ],
                ]
              : [
                  [
                    "Materiais encontrados",
                    resource.loading || resource.error ? "—" : rows.length,
                  ],
                  [
                    "Disponível",
                    resource.loading || resource.error
                      ? "—"
                      : unitSummary(balances, "available"),
                  ],
                  [
                    "Reservado",
                    resource.loading || resource.error
                      ? "—"
                      : unitSummary(balances, "reserved"),
                  ],
                  [
                    "Lotes válidos",
                    resource.loading || resource.error
                      ? "—"
                      : rows.reduce((n, i) => n + (i.lots?.length || 0), 0),
                  ],
                ]
        }
      />
      <section className="card p-3 mb-4">
        <h2 className="fs-18">Filtros</h2>
        <div className="row g-3">
          <div className="col-md-4">
            <label htmlFor="inventory-search" className="form-label">
              {catalog
                ? "Buscar material ou código"
                : "Buscar material, código ou lote"}
            </label>
            <input
              id="inventory-search"
              type="search"
              className="form-control"
              value={q}
              onChange={(e) => filter(setQ, e.target.value)}
            />
          </div>
          {[
            [
              "inventory-category",
              "Categoria",
              category,
              setCategory,
              [...new Set((resource.data || []).map((i) => i.category))]
                .filter(Boolean)
                .sort()
                .map((v) => ({ value: v, label: v })),
            ],
            ["inventory-unit", "Unidade", unit, setUnit, WASTE_UNIT_OPTIONS],
            [
              "inventory-status",
              "Situação do cadastro",
              status,
              setStatus,
              WASTE_STATUS_OPTIONS,
            ],
            ...(!catalog
              ? [
                  [
                    "inventory-processing",
                    "Processamento",
                    processingStage,
                    setProcessingStage,
                    WASTE_PROCESSING_STAGE_OPTIONS,
                  ],
                  [
                    "inventory-origin",
                    "Vínculo de origem",
                    origin,
                    setOrigin,
                    [
                      { value: "COLLECTION", label: "Vinculado à coleta" },
                      { value: "MANUAL", label: "Sem vínculo de coleta" },
                    ],
                  ],
                  ...(!history
                    ? [
                        [
                          "inventory-lot-status",
                          "Situação do lote",
                          lotStatus,
                          setLotStatus,
                          WASTE_LOT_STATUS_OPTIONS,
                        ],
                      ]
                    : []),
                ]
              : []),
          ].map(([id, label, value, set, options]) => (
            <div className="col-md-2" key={id}>
              <label className="form-label" htmlFor={id}>
                {label}
              </label>
              <select
                id={id}
                className="form-select"
                value={value}
                onChange={(e) => filter(set, e.target.value)}
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
        </div>
        <button
          className="btn btn-outline-secondary mt-3"
          onClick={() => {
            setQ("");
            setCategory("");
            setUnit("");
            setStatus("");
            setLotStatus("");
            setProcessingStage("");
            setOrigin("");
            setPage(1);
          }}
        >
          Limpar filtros
        </button>
      </section>
      <section className="card p-3">
        <div className="d-flex justify-content-between flex-wrap gap-2 mb-2">
          <h2 className="fs-18 mb-0">
            {catalog
              ? "Materiais do catálogo"
              : history
                ? "Registros cancelados por material"
                : "Materiais e lotes válidos"}
          </h2>
          <small className="text-muted">
            {catalog
              ? "Exportação inclui todos os materiais filtrados"
              : "Filtros e exportação consideram somente os lotes correspondentes"}
          </small>
        </div>
        <ResourceState resource={resource}>
          {!rows.length ? (
            <p>
              {resource.data?.length
                ? "Nenhum registro corresponde aos filtros. Limpe ou ajuste os critérios de busca."
                : catalog
                  ? "Nenhum material cadastrado. Cadastre o primeiro tipo de resíduo."
                  : "Nenhum estoque registrado. Consulte as entradas coletadas ou adicione um lote manual."}
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Material / Identificação</th>
                    <th>Classificação / Unidade</th>
                    <th>
                      {catalog
                        ? "Situação"
                        : history
                          ? "Registros cancelados"
                          : "Quantidades dos lotes"}
                    </th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((i) => (
                    <InventoryRow
                      key={i.id}
                      item={i}
                      catalog={catalog}
                      history={history}
                      onHistory={() => changeView(true, i.id)}
                      expanded={expanded[i.id]}
                      onExpand={() =>
                        setExpanded((e) => ({ ...e, [i.id]: !e[i.id] }))
                      }
                      onStatus={() => {
                        operation.setError("");
                        setTarget(i);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!resource.loading && !resource.error && (
            <WorkspacePagination
              page={current}
              size={size}
              total={rows.length}
              onPage={setPage}
              onSize={(n) => {
                setSize(n);
                setPage(1);
              }}
            />
          )}
        </ResourceState>
      </section>
      {!catalog && (
        <p className="small text-muted mt-3">
          Disponível soma lotes disponíveis; reservado soma lotes reservados.
          Vendidos e descartados continuam identificados entre os lotes válidos,
          mas não entram no estoque disponível. Cancelados aparecem
          exclusivamente no histórico de cancelamentos. Quantidades são
          separadas por unidade e não representam valor financeiro. Lotes
          manuais antigos sem saldo controlado usam a quantidade registrada.
        </p>
      )}
      {target && (
        <CollectionDialog
          title={
            target.status === "ACTIVE"
              ? "Inativar material"
              : "Reativar material"
          }
          busy={operation.busy}
          onClose={() => setTarget(null)}
        >
          <p>
            <strong>{target.name}</strong>
          </p>
          <p>
            A alteração afeta a disponibilidade do cadastro para novas
            operações. Coletas, destinações e lotes existentes permanecem no
            histórico.
          </p>
          {operation.error && (
            <p role="alert" className="text-danger">
              {operation.error}
            </p>
          )}
          <button
            className="btn btn-outline-secondary me-2"
            disabled={operation.busy}
            onClick={() => setTarget(null)}
          >
            Voltar
          </button>
          <button
            className="btn btn-success"
            disabled={operation.busy}
            onClick={confirm}
          >
            {operation.busy ? "Confirmando..." : "Confirmar alteração"}
          </button>
        </CollectionDialog>
      )}
    </WastePage>
  );
}
function InventoryRow({
  item: i,
  catalog,
  history = false,
  onHistory,
  expanded,
  onExpand,
  onStatus,
}) {
  const b = stockBalances([i]);
  return (
    <>
      <tr>
        <td>
          <strong>{i.name}</strong>
          <div className="small text-muted">
            {i.internalCode || "Sem código interno"} · #{shortId(i.id)}
          </div>
        </td>
        <td>
          {[i.category, i.subcategory].filter(Boolean).join(" / ")}
          <div className="small">
            {getWasteClassLabel(i.wasteClass)} ·{" "}
            {WASTE_UNIT_OPTIONS.find((o) => o.value === i.unit)?.label ||
              "Unidade não informada"}
          </div>
        </td>
        <td>
          {catalog ? (
            <span
              className={`badge text-bg-${i.status === "ACTIVE" ? "success" : "secondary"}`}
            >
              {i.status === "ACTIVE" ? "Ativo" : "Inativo"}
            </span>
          ) : history ? (
            <>
              <div>{i.lots?.length || 0} registro(s) cancelado(s)</div>
              <small className="text-muted">
                Histórico · sem saldo de estoque
              </small>
            </>
          ) : !i.lots?.length ? (
            <span className="text-muted">Sem lotes registrados</span>
          ) : (
            <>
              <div>Disponível: {unitSummary(b, "available")}</div>
              <div>Reservado: {unitSummary(b, "reserved")}</div>
            </>
          )}
        </td>
        <td>
          <div className="d-flex flex-wrap gap-2">
            {!history && (
              <Link
                className="btn btn-sm btn-outline-secondary"
                to={`/edit-waste-type/${encodeURIComponent(i.id)}`}
              >
                Editar cadastro
              </Link>
            )}
            {!history && i.status === "ACTIVE" && (
              <Link
                className="btn btn-sm btn-outline-success"
                to={`/waste-stock/create?itemId=${encodeURIComponent(i.id)}`}
              >
                Adicionar lote
              </Link>
            )}
            {catalog ? (
              <button
                className="btn btn-sm btn-outline-success"
                onClick={onStatus}
              >
                {i.status === "ACTIVE" ? "Inativar" : "Reativar"}
              </button>
            ) : (
              <button
                className="btn btn-sm btn-outline-success"
                onClick={onExpand}
                aria-controls={`lots-${i.id}`}
                disabled={!i.lots?.length}
                aria-expanded={!!expanded}
              >
                {expanded
                  ? history
                    ? "Ocultar registros"
                    : "Ocultar lotes"
                  : history
                    ? `Ver registros (${i.lots?.length || 0})`
                    : `Ver lotes (${i.lots?.length || 0})`}
              </button>
            )}
            {!catalog && !history && i.cancelledLotsCount > 0 && (
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={onHistory}
              >
                Ver histórico ({i.cancelledLotsCount})
              </button>
            )}
          </div>
        </td>
      </tr>
      {!catalog && expanded && (
        <tr>
          <td colSpan={4} id={`lots-${i.id}`}>
            {!i.lots?.length ? (
              <p>Sem lotes registrados.</p>
            ) : (
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Lote / Entrada</th>
                    <th>
                      {history
                        ? "Quantidade histórica / Situação"
                        : "Quantidade / Situação"}
                    </th>
                    <th>Local / Processamento</th>
                    <th>Origem / Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {i.lots.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <strong>{l.lotCode || l.code || shortId(l.id)}</strong>
                        <div>{dateLabel(l.receivedAt || l.createdAt)}</div>
                        {l.originCollectionId && (
                          <Link
                            className="small d-block"
                            to={`/waste-list?coleta=${encodeURIComponent(l.originCollectionId)}`}
                          >
                            Coleta #{shortId(l.originCollectionId)}
                          </Link>
                        )}
                        {l.status === "CANCELLED" && (
                          <small className="d-block text-muted">
                            Histórico anulado · sem saldo disponível. {l.notes}
                          </small>
                        )}
                      </td>
                      <td>
                        {quantity(lotQuantity(l), l.unit)}
                        <div>
                          <span
                            className={`badge text-bg-${{ AVAILABLE: "success", RESERVED: "warning", SOLD: "primary", DISCARDED: "secondary" }[l.status] || "secondary"}`}
                          >
                            {getWasteLotStatusLabel(l.status)}
                          </span>
                        </div>
                        {traceableLot(l) &&
                          ["AVAILABLE", "RESERVED"].includes(l.status) &&
                          numeric(l.availableQuantity) !== null && (
                            <small>
                              Saldo controlado:{" "}
                              {quantity(l.availableQuantity, l.unit)}
                            </small>
                          )}
                      </td>
                      <td>
                        {l.storageLocation || "Local não informado"}
                        <div>{getProcessingStageLabel(l.processingStage)}</div>
                      </td>
                      <td>
                        <div className="small text-muted">
                          {traceableLot(l)
                            ? "Vinculado à coleta"
                            : "Sem vínculo de coleta"}
                        </div>
                        {l.origin ||
                          (traceableLot(l)
                            ? "Gerado a partir de coleta"
                            : "Origem não informada")}
                        <div className="d-flex gap-2 flex-wrap">
                          {l.originCollectionWasteEntryId && (
                            <Link
                              to={`/collected-waste/${encodeURIComponent(l.originCollectionWasteEntryId)}`}
                            >
                              Ver entrada de origem
                            </Link>
                          )}
                          <Link
                            to={`/waste-stock/lots/${encodeURIComponent(l.id)}/edit`}
                          >
                            {l.status === "CANCELLED"
                              ? "Consultar lote"
                              : "Ver / editar lote"}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
const typeInitial = {
  name: "",
  category: "",
  subcategory: "",
  unit: "KG",
  ncm: "",
  internalCode: "",
  wasteClass: "NOT_INFORMED",
  description: "",
  status: "ACTIVE",
};
export function TypeFormScreen({ edit = false }) {
  const { id } = useParams();
  return (
    <WasteScope>
      <TypeForm key={id || "new"} id={edit ? id : null} />
    </WasteScope>
  );
}
function TypeForm({ id }) {
  const nav = useNavigate(),
    op = useWasteOperation();
  const [form, setForm] = useState(typeInitial),
    [loaded, setLoaded] = useState(false);
  const loader = useCallback(async () => {
    if (!id) return null;
    const r = await getWasteTypeById(id);
    if (!r?.item) throw Error("Material não encontrado.");
    return r.item;
  }, [id]);
  const resource = useWasteResource(loader);
  useEffect(() => {
    if (!resource.loading && !resource.error && !loaded) {
      if (resource.data)
        setForm({
          ...typeInitial,
          ...Object.fromEntries(
            Object.keys(typeInitial).map((k) => [
              k,
              resource.data[k] ?? typeInitial[k],
            ]),
          ),
        });
      setLoaded(true);
    }
  }, [resource, loaded]);
  async function submit(e) {
    e.preventDefault();
    if (form.ncm.trim() && !/^\d+$/.test(form.ncm.trim())) {
      op.setError("Use apenas dígitos no NCM.");
      return;
    }
    if (form.name.trim().length < 2 || form.category.trim().length < 2) {
      op.setError("Nome e categoria precisam de pelo menos dois caracteres.");
      return;
    }
    const res = await op.run(() =>
      id ? patchWasteType(id, form) : createWasteType(form),
    );
    if (res && !res.item?.id)
      op.setError(
        "O servidor não confirmou o cadastro. Atualize antes de repetir.",
      );
    if (res?.item?.id)
      nav("/waste-type-list", {
        state: {
          notice: `Material ${res.item.name} ${id ? "atualizado" : "cadastrado"} e confirmado pelo servidor.`,
        },
      });
  }
  return (
    <WastePage
      title={id ? "Editar Tipo de Resíduo" : "Cadastrar Tipo de Resíduo"}
      description="Defina a identificação e a unidade usada nas próximas operações. Este cadastro não gera estoque."
    >
      <ResourceState resource={resource}>
        {loaded && (
          <form className="card p-4" onSubmit={submit}>
            <div className="waste-form-heading mb-4">
              <h2 className="fs-18">Identificação do material</h2>
              <p className="small text-muted mb-0">
                Campos com * são obrigatórios. Confira a unidade padrão antes de
                salvar.
              </p>
            </div>
            <fieldset disabled={op.busy}>
              <div className="row g-3">
                {[
                  ["name", "Nome do material", true, 150],
                  ["internalCode", "Código interno", false, 50],
                  ["category", "Categoria", true, 100],
                  ["subcategory", "Subcategoria", false, 100],
                  ["ncm", "NCM (se aplicável)", false, 20],
                ].map(([name, label, required, maxLength]) => (
                  <Field
                    key={name}
                    {...{ name, label, required, maxLength, form, setForm }}
                  />
                ))}
                <Field
                  name="unit"
                  label="Unidade padrão"
                  options={WASTE_UNIT_OPTIONS}
                  {...{ form, setForm }}
                />
                <Field
                  name="wasteClass"
                  label="Classificação registrada"
                  options={WASTE_CLASS_OPTIONS}
                  {...{ form, setForm }}
                />
                <Field
                  name="status"
                  label="Situação"
                  options={WASTE_STATUS_OPTIONS}
                  {...{ form, setForm }}
                />
                <Field
                  name="description"
                  label="Descrição / orientações"
                  type="textarea"
                  maxLength={1500}
                  {...{ form, setForm }}
                />
              </div>
            </fieldset>
            <p className="small text-muted mt-3">
              Confirme os códigos e a classificação com o responsável técnico.
              Alterar o catálogo não reescreve materiais, unidades e quantidades
              já registrados nas coletas ou lotes.
            </p>
            {op.error && (
              <div role="alert" className="alert alert-danger">
                {op.error}
              </div>
            )}
            <div className="d-flex justify-content-end gap-2">
              <Link className="btn btn-outline-secondary" to="/waste-type-list">
                Voltar ao catálogo
              </Link>
              <button
                type="submit"
                className="btn btn-success"
                disabled={op.busy}
              >
                {op.busy ? "Salvando..." : "Salvar cadastro"}
              </button>
            </div>
          </form>
        )}
      </ResourceState>
    </WastePage>
  );
}
const lotInitial = {
  itemId: "",
  lotCode: "",
  quantity: "",
  unit: "",
  storageLocation: "",
  processingStage: "TRIADO",
  origin: "",
  notes: "",
  status: "AVAILABLE",
};
export function LotFormScreen({ edit = false }) {
  const { lotId } = useParams();
  return (
    <WasteScope>
      <LotForm key={lotId || "new"} lotId={edit ? lotId : null} />
    </WasteScope>
  );
}
function LotForm({ lotId }) {
  const nav = useNavigate(),
    [params] = useSearchParams(),
    op = useWasteOperation(),
    resource = useWasteResource(catalogLoader);
  const [form, setForm] = useState(lotInitial),
    [loaded, setLoaded] = useState(false);
  const lot = (resource.data || [])
      .flatMap((i) => (i.lots || []).map((l) => ({ ...l, item: i })))
      .find((l) => l.id === lotId),
    linked = traceableLot(lot);
  useEffect(() => {
    if (resource.loading || resource.error || loaded) return;
    if (lotId && lot) {
      setForm({
        ...lotInitial,
        ...Object.fromEntries(
          Object.keys(lotInitial).map((k) => [k, lot[k] ?? lotInitial[k]]),
        ),
        itemId: lot.item.id,
        lotCode: lot.lotCode || lot.code || "",
        quantity: lotQuantity(lot) ?? "",
      });
    } else if (!lotId) {
      const i = resource.data?.find(
        (i) => i.id === (params.get("itemId") || params.get("stockItemId")),
      );
      if (i) setForm((f) => ({ ...f, itemId: i.id, unit: i.unit }));
    }
    setLoaded(true);
  }, [resource, lotId, lot, loaded, params]);
  const selected = resource.data?.find((i) => i.id === form.itemId);
  function setLotForm(update) {
    setForm((f) => {
      const next = typeof update === "function" ? update(f) : update;
      if (next.itemId !== f.itemId)
        next.unit =
          resource.data?.find((i) => i.id === next.itemId)?.unit || "";
      return next;
    });
  }
  async function submit(e) {
    e.preventDefault();
    if (lot?.status === "CANCELLED") {
      op.setError("Lote cancelado é mantido somente para consulta.");
      return;
    }
    if (!selected || (!lotId && selected.status !== "ACTIVE")) {
      op.setError("Selecione um material ativo.");
      return;
    }
    if (
      !form.lotCode.trim() ||
      !Number.isFinite(Number(form.quantity)) ||
      !(Number(form.quantity) > 0) ||
      !form.unit
    ) {
      op.setError("Informe código, quantidade positiva e unidade do lote.");
      return;
    }
    if (!lotId && !form.origin.trim()) {
      op.setError(
        "Informe a origem do lote para manter o registro identificável.",
      );
      return;
    }
    const { itemId, ...payload } = form;
    if (linked) {
      delete payload.quantity;
      delete payload.unit;
      delete payload.lotCode;
      delete payload.origin;
    }
    const res = await op.run(() =>
      lotId
        ? patchWasteStockLot(lotId, payload)
        : createWasteStockLot(itemId, payload),
    );
    if (res && !res.lot?.id)
      op.setError(
        "O servidor não confirmou o lote. Atualize antes de repetir.",
      );
    if (res?.lot?.id)
      nav("/waste-stock", {
        state: {
          notice: `Lote ${res.lot.lotCode || res.lot.code || shortId(res.lot.id)} salvo e confirmado pelo servidor.`,
        },
      });
  }
  return (
    <WastePage
      title={
        lot?.status === "CANCELLED"
          ? "Consulta do Lote Cancelado"
          : lotId
            ? "Detalhes e Edição do Lote"
            : "Adicionar Lote"
      }
      description={
        lot?.status === "CANCELLED"
          ? "Registro anulado, preservado para consulta do motivo e da origem. Este lote não compõe saldo de estoque."
          : lotId
            ? "Consulte a origem e atualize os dados operacionais sem romper a rastreabilidade."
            : "Entrada manual de estoque. Para materiais de uma coleta, registre a destinação da entrada para gerar o lote vinculado."
      }
    >
      <ResourceState resource={resource}>
        {loaded && lotId && !lot ? (
          <p role="alert" className="alert alert-danger">
            Lote não encontrado para esta cooperativa.
          </p>
        ) : (
          loaded && (
            <form onSubmit={submit} className="card p-4">
              <div className="waste-form-heading mb-4">
                <h2 className="fs-18">
                  {lot?.status === "CANCELLED"
                    ? "Registro histórico do lote"
                    : "Registro operacional do lote"}
                </h2>
                <p className="small text-muted mb-0">
                  Campos com * são obrigatórios. Identifique o material, o local
                  e a origem para facilitar a conferência física.
                </p>
              </div>
              {linked && (
                <div className="alert alert-info">
                  Lote originado de coleta. Quantidade, unidade, código e origem
                  são preservados nesta edição.
                  {lot.originCollectionWasteEntryId && (
                    <>
                      {" "}
                      <Link
                        to={`/collected-waste/${encodeURIComponent(lot.originCollectionWasteEntryId)}`}
                      >
                        Consultar entrada e destinação de origem
                      </Link>
                    </>
                  )}
                </div>
              )}
              {lot?.status === "CANCELLED" && (
                <p className="alert alert-light">
                  Lote cancelado: dados preservados para consulta, sem edição.
                </p>
              )}
              <fieldset disabled={op.busy || lot?.status === "CANCELLED"}>
                <div className="row g-3">
                  <Field
                    name="itemId"
                    label="Material do catálogo"
                    required
                    readOnly={!!lotId}
                    options={[
                      { value: "", label: "Selecione um material" },
                      ...(resource.data || [])
                        .filter(
                          (i) => i.status === "ACTIVE" || i.id === form.itemId,
                        )
                        .map((i) => ({
                          value: i.id,
                          label: `${i.name} (${i.unit})`,
                        })),
                    ]}
                    form={form}
                    setForm={setLotForm}
                  />
                  <Field
                    name="lotCode"
                    label="Código do lote"
                    maxLength={100}
                    required
                    readOnly={linked}
                    form={form}
                    setForm={setForm}
                  />
                  <Field
                    name="quantity"
                    label="Quantidade registrada"
                    type="number"
                    required
                    readOnly={linked}
                    form={form}
                    setForm={setForm}
                  />
                  <Field
                    name="unit"
                    label="Unidade"
                    options={WASTE_UNIT_OPTIONS}
                    readOnly={!!lotId}
                    form={form}
                    setForm={setForm}
                  />
                  <Field
                    name="storageLocation"
                    label="Local de armazenamento"
                    maxLength={255}
                    form={form}
                    setForm={setForm}
                  />
                  <Field
                    name="processingStage"
                    label="Etapa de processamento"
                    options={WASTE_PROCESSING_STAGE_OPTIONS}
                    form={form}
                    setForm={setForm}
                  />
                  <Field
                    name="status"
                    label="Situação do lote"
                    options={
                      lot?.status === "CANCELLED"
                        ? [
                            ...WASTE_LOT_STATUS_OPTIONS,
                            { value: "CANCELLED", label: "Cancelado" },
                          ]
                        : WASTE_LOT_STATUS_OPTIONS
                    }
                    form={form}
                    setForm={setForm}
                  />
                  <Field
                    name="origin"
                    label="Origem informada"
                    readOnly={linked}
                    required={!lotId}
                    maxLength={255}
                    form={form}
                    setForm={setForm}
                  />
                  <Field
                    name="notes"
                    label="Observações"
                    type="textarea"
                    maxLength={1500}
                    form={form}
                    setForm={setForm}
                  />
                </div>
              </fieldset>
              <div className="waste-guide mt-4 mb-3" aria-live="polite">
                <div>
                  <strong>Conferência do lote</strong>
                  <p className="small mb-0 mt-1">
                    {selected?.name || "Selecione um material"} ·{" "}
                    {quantity(form.quantity, form.unit)} ·{" "}
                    {getWasteLotStatusLabel(form.status)}
                    <br />
                    {getProcessingStageLabel(form.processingStage)} ·{" "}
                    {form.storageLocation.trim() || "Local ainda não informado"}
                  </p>
                  <p className="small mb-0 mt-2">
                    {
                      {
                        AVAILABLE:
                          "A quantidade participará do saldo disponível conforme o controle do lote.",
                        RESERVED:
                          "O lote ficará reservado e não comporá o saldo disponível.",
                        SOLD: "O lote ficará registrado como vendido e sairá do saldo disponível.",
                        DISCARDED:
                          "O lote ficará registrado como descartado e sairá do saldo disponível.",
                        CANCELLED: "Registro mantido para consulta.",
                      }[form.status]
                    }
                  </p>
                </div>
              </div>
              <p className="small text-muted mt-3">
                Reservado não é disponível; vendido e descartado não compõem
                estoque disponível. A situação do lote não emite documento
                fiscal nem registra valor de venda.
              </p>
              {op.error && (
                <div role="alert" className="alert alert-danger">
                  {op.error}
                </div>
              )}
              <div className="d-flex justify-content-end gap-2">
                <Link
                  className="btn btn-outline-secondary"
                  to={
                    lot?.status === "CANCELLED"
                      ? `/waste-stock?view=history&itemId=${encodeURIComponent(lot.item.id)}`
                      : "/waste-stock"
                  }
                >
                  {lot?.status === "CANCELLED"
                    ? "Voltar ao histórico"
                    : "Voltar ao estoque"}
                </Link>
                {lot?.status !== "CANCELLED" && (
                  <button
                    className="btn btn-success"
                    disabled={op.busy || lot?.status === "CANCELLED"}
                  >
                    {op.busy ? "Salvando..." : "Salvar lote"}
                  </button>
                )}
              </div>
            </form>
          )
        )}
      </ResourceState>
    </WastePage>
  );
}
