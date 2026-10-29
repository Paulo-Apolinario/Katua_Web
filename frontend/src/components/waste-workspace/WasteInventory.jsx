import WorkspaceInventoryList from "./WorkspaceInventoryList";
import {
  getWorkspaceCatalog,
  getWorkspaceLot,
} from "../../services/wasteWorkspaceService";
import { useWasteResource, useWasteOperation } from "./useWasteResource";
import { useCallback, useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import {
  getWasteTypeById,
  createWasteType,
  patchWasteType,
  WASTE_UNIT_OPTIONS,
  WASTE_CLASS_OPTIONS,
  WASTE_STATUS_OPTIONS,
} from "../../services/wasteTypeService";
import {
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
import { quantity, shortId } from "../../utils/collectionWorkspace";
import { lotQuantity, traceableLot } from "../../utils/wasteWorkspace";

export function InventoryScreen({ catalog = false }) {
  return (
    <WasteScope>
      <WorkspaceInventoryList catalog={catalog} />
    </WasteScope>
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
          <form data-refresh-paused="true" className="card p-4" onSubmit={submit}>
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
  const [catalogTerm, setCatalogTerm] = useState(""),
    [catalogPage, setCatalogPage] = useState(1),
    [catalogMore, setCatalogMore] = useState(false);
  const choices = useRef([]),
    chosen = useRef(null),
    queryRef = useRef(catalogTerm);
  queryRef.current = catalogTerm;
  const nav = useNavigate(),
    [params] = useSearchParams(),
    op = useWasteOperation(),
    loader = useCallback(async () => {
      const result = await getWorkspaceCatalog({
        limit: 50,
        q: catalogTerm,
        page: catalogPage,
      });
      if (queryRef.current !== catalogTerm) return [];
      setCatalogMore(result.pagination.hasNextPage);
      let items =
        catalogPage === 1
          ? result.items
          : [
              ...new Map(
                [...choices.current, ...result.items].map((i) => [i.id, i]),
              ).values(),
            ];
      if (chosen.current && !items.some((i) => i.id === chosen.current.id))
        items = [chosen.current, ...items];
      choices.current = items;
      if (!lotId) return items;
      const { lot } = await getWorkspaceLot(lotId);
      const other = items.filter((i) => i.id !== lot.stockItem.id);
      return [...other, { ...lot.stockItem, lots: [lot] }];
    }, [lotId, catalogTerm, catalogPage]),
    resource = useWasteResource(loader);
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
  useEffect(() => {
    if (selected) chosen.current = selected;
  }, [selected]);
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
            <form data-refresh-paused="true" onSubmit={submit} className="card p-4">
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
                      <Link className="btn btn-sm btn-outline-success align-self-center"
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
                  {!lotId && (
                    <div className="col-12">
                      <label
                        htmlFor="lot-catalog-search"
                        className="form-label"
                      >
                        Buscar material no catálogo
                      </label>
                      <input
                        id="lot-catalog-search"
                        type="search"
                        className="form-control"
                        value={catalogTerm}
                        onChange={(e) => {
                          setCatalogTerm(e.target.value);
                          setCatalogPage(1);
                        }}
                        placeholder="Nome do material"
                      />
                      {catalogMore && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary mt-2"
                          disabled={resource.loading}
                          onClick={() => setCatalogPage((n) => n + 1)}
                        >
                          Carregar mais materiais
                        </button>
                      )}
                    </div>
                  )}
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
