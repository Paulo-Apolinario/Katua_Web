import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { apiRequest, getStoredUser } from "../../services/apiClient";
import { useWasteResource } from "../../components/waste-workspace/useWasteResource";
import { ManagementHeader } from "../../components/management/ManagementWorkspace";
const labels = {
  WAITING: "Aguardando triagem",
  SORTING: "Em triagem",
  COMPLETED: "Triagem concluída",
  CANCELLED: "Cancelada",
};
const eventLabels = {
  RECEIVE: "Recebimento",
  SORT: "Pesagem da triagem",
  CLOSE: "Triagem concluída",
  ADJUST: "Ajuste de pesagem",
  CANCEL: "Cancelamento",
};
const kg = (value) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(
    Number(value || 0),
  ) + " kg";
const date = (value) =>
  new Date(value).toLocaleString("pt-BR", { timeZone: "America/Fortaleza" });
const num = (value) => Number(String(value || "0").replace(",", "."));
const read = (path) => apiRequest(path, { suppressReadNotice: true });
function useDraft(name, initial) {
  const key = `katua:bags:${getStoredUser()?.id || "none"}:${name}`;
  const [value, setValue] = useState(() => {
    try {
      const old = JSON.parse(localStorage.getItem(key) || "null");
      return old ? { ...initial, ...old } : initial;
    } catch {
      return initial;
    }
  });
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setError("");
    } catch {
      setError(
        "Não foi possível salvar o rascunho neste navegador. Mantenha a tela aberta para conferir a operação.",
      );
    }
  }, [key, value]);
  return [value, setValue, error];
}
function Notice({ resource }) {
  return (
    <>
      {resource.loading && !resource.data && <p role="status">Carregando…</p>}
      {resource.error && (
        <p role="alert" className="alert alert-danger">
          {resource.error}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary ms-2"
            onClick={() => resource.refresh()}
          >
            Tentar novamente
          </button>
        </p>
      )}
    </>
  );
}
function WeighField({
  label,
  name,
  value,
  onChange,
  disabled,
  required = false,
}) {
  return (
    <div className="col-sm-6">
      <label htmlFor={`bag-${name}`} className="form-label">
        {label}
      </label>
      <input
        id={`bag-${name}`}
        type="number"
        min={0}
        max={10000000}
        step="0.001"
        className="form-control"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
function ReceiveForm({ context, onClose }) {
  const navigate = useNavigate(),
    guard = useRef(false);
  const initial = {
    operationId: crypto.randomUUID(),
    grossKg: "",
    tareKg: "0",
    originLabel: "",
    externalTag: "",
    collectionId: "",
    generatorIds: [],
    storageLocation: "",
    notes: "",
  };
  const [form, setForm, draftError] = useDraft("receive", initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  async function submit(e) {
    e.preventDefault();
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest("/mixed-bags", {
        method: "POST",
        body: {
          ...form,
          grossKg: num(form.grossKg),
          tareKg: num(form.tareKg),
          collectionId: form.collectionId || undefined,
          externalTag: form.externalTag || undefined,
        },
      });
      setForm({ ...initial, operationId: crypto.randomUUID() });
      navigate(`/mixed-bags/${result.bag.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="card p-4 mb-4">
      <h2 className="h5">Receber bag misturada</h2>
      <p className="small text-muted">
        Use para material ainda não recebido no sistema. Se já existe uma coleta
        sem peso informado ou um recebimento de bags em aberto, selecione-o
        abaixo.
      </p>
      <form onSubmit={submit}>
        <div className="row g-3">
          <WeighField
            name="gross"
            label="Peso bruto, incluindo a bag (kg) *"
            value={form.grossKg}
            onChange={(v) => set("grossKg", v)}
            disabled={busy}
            required
          />
          <WeighField
            name="tare"
            label="Tara — peso da bag vazia (kg)"
            value={form.tareKg}
            onChange={(v) => set("tareKg", v)}
            disabled={busy}
          />
          <p className="col-12 mb-0">
            <strong>
              Peso líquido:{" "}
              {kg(Math.max(0, num(form.grossKg) - num(form.tareKg)))}
            </strong>
          </p>
          <div className="col-12">
            <label htmlFor="bag-origin" className="form-label">
              Origem / descrição da retirada *
            </label>
            <input
              id="bag-origin"
              className="form-control"
              required
              minLength={2}
              maxLength={200}
              disabled={busy}
              value={form.originLabel}
              onChange={(e) => set("originLabel", e.target.value)}
            />
          </div>
          <div className="col-sm-6">
            <label htmlFor="bag-tag" className="form-label">
              Identificação na bag (opcional)
            </label>
            <input
              id="bag-tag"
              className="form-control"
              maxLength={60}
              disabled={busy}
              value={form.externalTag}
              onChange={(e) => set("externalTag", e.target.value)}
            />
          </div>
          <div className="col-sm-6">
            <label htmlFor="bag-location" className="form-label">
              Local de armazenamento (opcional)
            </label>
            <input
              id="bag-location"
              className="form-control"
              maxLength={100}
              disabled={busy}
              value={form.storageLocation}
              onChange={(e) => set("storageLocation", e.target.value)}
            />
          </div>
          <div className="col-12">
            <label htmlFor="bag-source" className="form-label">
              Coleta / recebimento existente (opcional)
            </label>
            <select
              id="bag-source"
              className="form-control"
              value={form.collectionId}
              disabled={busy}
              onChange={(e) => set("collectionId", e.target.value)}
            >
              <option value="">Novo recebimento de material</option>
              {context.collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.intakeKind === "MIXED_BAG"
                    ? "Recebimento de bags"
                    : "Coleta sem peso"}{" "}
                  · {c.generator?.name || c.route?.name || c.id.slice(-8)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <label htmlFor="bag-generator" className="form-label">
              Adicionar gerador de origem (opcional)
            </label>
            <select
              id="bag-generator"
              className="form-control"
              value=""
              disabled={busy}
              onChange={(e) => {
                if (e.target.value)
                  set("generatorIds", [
                    ...new Set([...form.generatorIds, e.target.value]),
                  ]);
              }}
            >
              <option value="">Selecione uma origem conhecida</option>
              {context.generators.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.companyName || g.name}
                </option>
              ))}
            </select>
            <div className="d-flex flex-wrap gap-2 mt-2">
              {form.generatorIds.map((id) => (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={busy}
                  key={id}
                  onClick={() =>
                    set(
                      "generatorIds",
                      form.generatorIds.filter((x) => x !== id),
                    )
                  }
                >
                  {context.generators.find((g) => g.id === id)?.name ||
                    "Origem selecionada"}{" "}
                  ×
                </button>
              ))}
            </div>
            <small className="text-muted">
              Quando há várias origens sem pesagem individual, preservamos os
              nomes sem dividir peso ou impacto por gerador.
            </small>
          </div>
          <div className="col-12">
            <label htmlFor="bag-receive-note" className="form-label">
              Observações (opcional)
            </label>
            <textarea
              id="bag-receive-note"
              className="form-control"
              maxLength={1500}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              disabled={busy}
            />
          </div>
        </div>
        {draftError && <p role="alert">{draftError}</p>}
        {error && (
          <p className="text-danger mt-3" role="alert">
            {error}{" "}
            <Link to={`/mixed-bags/${form.operationId}`}>
              Conferir este protocolo
            </Link>
          </p>
        )}
        <div className="d-flex flex-wrap gap-2 mt-3">
          <button className="btn btn-success" disabled={busy}>
            {busy ? "Registrando…" : "Confirmar recebimento da bag"}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={busy}
            onClick={onClose}
          >
            Voltar à lista
          </button>
        </div>
      </form>
    </section>
  );
}
function SortForm({ bag, context, onSaved }) {
  const initial = useRef({
    operationId: crypto.randomUUID(),
    expectedVersion: bag.version,
    itemId: "",
    itemName: "",
    quantityKg: "",
    lotId: "",
    rejectedKg: "",
    participantIds: [],
    notes: "",
  }).current;
  const [form, setForm, draftError] = useDraft(`sort:${bag.id}`, initial),
    [search, setSearch] = useState(""),
    [applied, setApplied] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const guard = useRef(false),
    catalog = useWasteResource(
      useCallback(
        () => read(`/mixed-bags/catalog?search=${encodeURIComponent(applied)}`),
        [applied],
      ),
    ),
    lots = useWasteResource(
      useCallback(
        () =>
          form.itemId
            ? read(`/mixed-bags/lots?itemId=${encodeURIComponent(form.itemId)}`)
            : Promise.resolve({ lots: [] }),
        [form.itemId],
      ),
    );
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  useEffect(() => {
    if (bag.events.some((e) => e.operationId === form.operationId)) {
      setForm({
        ...initial,
        operationId: crypto.randomUUID(),
        expectedVersion: bag.version,
      });
    }
  }, [bag.events, form.operationId, bag.version, initial, setForm]);
  async function submit(e) {
    e.preventDefault();
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      const target = lots.data?.lots.find((l) => l.id === form.lotId);
      if (form.lotId && !target)
        throw Error("Atualize o lote de destino antes de confirmar.");
      const result = await apiRequest(`/mixed-bags/${bag.id}/sort`, {
        method: "POST",
        body: {
          operationId: form.operationId,
          expectedVersion: form.expectedVersion,
          outputs: form.itemId
            ? [
                {
                  itemId: form.itemId,
                  quantityKg: num(form.quantityKg),
                  lotId: form.lotId || undefined,
                  expectedLotVersion: target?.version,
                },
              ]
            : [],
          rejectedKg: num(form.rejectedKg),
          notes: form.notes,
          participantIds: form.participantIds,
        },
      });
      setForm({
        ...initial,
        operationId: crypto.randomUUID(),
        expectedVersion: result.bag.version,
      });
      await onSaved();
      await lots.refresh();
    } catch (e) {
      setError(e.message);
      await onSaved();
      await lots.refresh();
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="card p-4 mb-4">
      <h2 className="h5">Registrar material separado</h2>
      <p className="small text-muted">
        Registre uma pesagem por material. A triagem pode continuar depois.
        Somente os quilos separados entram nos lotes; rejeitos ficam registrados
        à parte.
      </p>
      <div className="d-flex gap-2 mb-3">
        <input
          aria-label="Buscar material da triagem"
          className="form-control"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar no catálogo"
        />
        <button
          type="button"
          className="btn btn-outline-success"
          onClick={() => setApplied(search)}
        >
          Buscar material
        </button>
      </div>
      <Notice resource={catalog} />
      <form onSubmit={submit}>
        <div className="row g-3">
          <div className="col-sm-6">
            <label htmlFor="sort-material" className="form-label">
              Material separado
            </label>
            <select
              id="sort-material"
              className="form-control"
              disabled={busy || catalog.loading}
              value={form.itemId}
              onChange={(e) => {
                set("itemId", e.target.value);
                set(
                  "itemName",
                  catalog.data?.items.find((m) => m.id === e.target.value)
                    ?.name || "",
                );
                set("lotId", "");
              }}
            >
              <option value="">Registrar apenas rejeito</option>
              {form.itemId &&
                !catalog.data?.items.some((m) => m.id === form.itemId) && (
                  <option value={form.itemId}>
                    {form.itemName || "Material selecionado"}
                  </option>
                )}
              {catalog.data?.items.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {catalog.data?.limited && (
              <small>Use a busca para localizar outros materiais.</small>
            )}
          </div>
          <WeighField
            name="sorted-quantity"
            label="Peso separado (kg)"
            value={form.quantityKg}
            onChange={(v) => set("quantityKg", v)}
            disabled={busy || !form.itemId}
            required={Boolean(form.itemId)}
          />
          {form.itemId && (
            <div className="col-12">
              <label htmlFor="sort-lot" className="form-label">
                Destino do material separado
              </label>
              <select
                id="sort-lot"
                className="form-control"
                value={form.lotId}
                disabled={busy || lots.loading}
                onChange={(e) => set("lotId", e.target.value)}
              >
                <option value="">Criar novo lote deste material</option>
                {lots.data?.lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    Complementar {l.lotCode || l.code} · saldo{" "}
                    {kg(l.availableQuantity)}
                  </option>
                ))}
              </select>
              <Notice resource={lots} />
            </div>
          )}
          <WeighField
            name="rejected"
            label="Rejeitos identificados (kg, opcional)"
            value={form.rejectedKg}
            onChange={(v) => set("rejectedKg", v)}
            disabled={busy}
          />
          <fieldset className="col-12">
            <legend className="fs-6">Equipe participante *</legend>
            <div className="d-flex flex-wrap gap-3">
              {context.people.map((person) => (
                <label key={person.id}>
                  <input
                    type="checkbox"
                    className="me-2"
                    disabled={busy || person.id === context.collectorId}
                    checked={
                      person.id === context.collectorId ||
                      form.participantIds.includes(person.id)
                    }
                    onChange={(e) =>
                      set(
                        "participantIds",
                        e.target.checked
                          ? [...form.participantIds, person.id]
                          : form.participantIds.filter(
                              (id) => id !== person.id,
                            ),
                      )
                    }
                  />
                  {person.name}
                </label>
              ))}
            </div>
            <small className="text-muted">
              O responsável pelo lançamento é registrado pela sessão.
              Participação não representa divisão individual dos quilos.
            </small>
          </fieldset>
          <div className="col-12">
            <label htmlFor="sort-notes" className="form-label">
              Observações / descrição dos rejeitos
            </label>
            <textarea
              id="sort-notes"
              className="form-control"
              disabled={busy}
              required={num(form.rejectedKg) > 0}
              minLength={num(form.rejectedKg) > 0 ? 3 : undefined}
              maxLength={1500}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>
        {bag.version !== form.expectedVersion && (
          <p role="alert" className="alert alert-warning mt-3">
            O saldo desta bag mudou. Confira os pesos.{" "}
            <button
              className="btn btn-sm btn-outline-dark"
              type="button"
              onClick={() => set("expectedVersion", bag.version)}
            >
              Revisar com o saldo atual
            </button>
          </p>
        )}
        {draftError && <p role="alert">{draftError}</p>}
        {error && (
          <p role="alert" className="text-danger mt-3">
            {error}
          </p>
        )}
        <button
          className="btn btn-success mt-3"
          disabled={
            busy ||
            bag.version !== form.expectedVersion ||
            (!context.collectorId && !form.participantIds.length)
          }
        >
          {busy ? "Registrando…" : "Confirmar pesagem da triagem"}
        </button>
      </form>
    </section>
  );
}
function BagDetail({ bag, context, onSaved }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reason, setReason] = useState(""),
    [gross, setGross] = useState(String(bag.grossKg)),
    [tare, setTare] = useState(String(bag.tareKg));
  const guard = useRef(false);
  const open = ["WAITING", "SORTING"].includes(bag.status);
  async function action(kind) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/mixed-bags/${bag.id}/${kind}`, {
        method: "POST",
        body: {
          operationId: crypto.randomUUID(),
          expectedVersion: bag.version,
          ...(kind === "adjust"
            ? { grossKg: num(gross), tareKg: num(tare), notes: reason }
            : kind === "cancel"
              ? { notes: reason }
              : {}),
        },
      });
      await onSaved();
    } catch (e) {
      setError(e.message);
      await onSaved();
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <section className="card p-4 mb-4">
        <h2 className="h5">
          {bag.code} · {labels[bag.status]}
        </h2>
        <p>
          {bag.originLabel}
          {bag.externalTag ? ` · Identificação: ${bag.externalTag}` : ""}
        </p>
        <p className="small text-muted">
          Recebida em {date(bag.receivedAt)} por {bag.createdByName}. Bruto:{" "}
          {kg(bag.grossKg)} · Tara: {kg(bag.tareKg)}.
        </p>
        <div className="row g-3">
          {[
            ["Recebido líquido", bag.netKg],
            ["Separado em materiais", bag.sortedKg],
            ["Rejeitos", bag.rejectedKg],
            ["Ainda a triar", bag.remainingKg],
          ].map(([label, value]) => (
            <div className="col-6 col-lg-3" key={label}>
              <div className="bg-light rounded p-3">
                <small>{label}</small>
                <strong className="d-block">{kg(value)}</strong>
              </div>
            </div>
          ))}
        </div>
        <p className="small text-muted mt-3 mb-0">
          O peso líquido é distribuído entre materiais, rejeitos e saldo a
          triar. Não some o recebido novamente aos materiais separados.
        </p>
      </section>
      {open && (
        <SortForm key={bag.id} bag={bag} context={context} onSaved={onSaved} />
      )}
      {open && (
        <section className="card p-4 mb-4">
          <h2 className="h5">Encerrar triagem</h2>
          <p>
            Conclua quando todo o peso líquido estiver identificado como
            material ou rejeito.
          </p>
          <button
            className="btn btn-success"
            disabled={busy || num(bag.remainingKg) !== 0}
            onClick={() => action("close")}
          >
            Concluir triagem desta bag
          </button>
          {context.manager && (
            <details className="mt-3">
              <summary>
                Ajustar pesagem ou cancelar registro sem triagem
              </summary>
              <div className="row g-3 mt-1">
                <WeighField
                  label="Novo peso bruto (kg)"
                  name="adjust-gross"
                  value={gross}
                  onChange={setGross}
                  disabled={busy}
                />
                <WeighField
                  label="Nova tara (kg)"
                  name="adjust-tare"
                  value={tare}
                  onChange={setTare}
                  disabled={busy}
                />
                <div className="col-12">
                  <label htmlFor="bag-adjust-reason" className="form-label">
                    Motivo do ajuste ou cancelamento *
                  </label>
                  <textarea
                    id="bag-adjust-reason"
                    className="form-control"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={1500}
                    disabled={busy}
                  />
                </div>
              </div>
              <div className="d-flex flex-wrap gap-2 mt-3">
                <button
                  className="btn btn-outline-success"
                  disabled={busy || reason.trim().length < 5}
                  onClick={() => action("adjust")}
                >
                  Registrar ajuste de pesagem
                </button>
                <button
                  className="btn btn-outline-danger"
                  disabled={
                    busy ||
                    reason.trim().length < 5 ||
                    num(bag.sortedKg) + num(bag.rejectedKg) > 0
                  }
                  onClick={() => action("cancel")}
                >
                  Cancelar registro sem triagem
                </button>
              </div>
            </details>
          )}
          {error && (
            <p className="text-danger mt-3" role="alert">
              {error}
            </p>
          )}
        </section>
      )}
      <section className="card p-4">
        <h2 className="h5">Histórico e lotes formados</h2>
        {bag.events.map((e) => (
          <article className="border-top pt-3 mt-3" key={e.id}>
            <strong>{eventLabels[e.kind]}</strong>
            <small className="d-block">
              {date(e.createdAt)} · Lançado por {e.actorName}
            </small>
            {Array.isArray(e.participantSnapshot) &&
              e.participantSnapshot.length > 0 && (
                <p className="small">
                  Equipe: {e.participantSnapshot.map((p) => p.name).join(", ")}
                </p>
              )}
            {e.outputs.map((o) => (
              <div key={o.id} className="my-2">
                <strong>
                  {o.materialName}: {kg(o.quantityKg)}
                </strong>
                <div>
                  <Link to={`/waste-stock/lots/${o.lotId}/edit`}>
                    {o.lotCode}
                  </Link>
                </div>
              </div>
            ))}
            {num(e.rejectedKg) > 0 && <p>Rejeitos: {kg(e.rejectedKg)}</p>}
            {e.kind === "ADJUST" && (
              <p className="small">
                Líquido anterior: {kg(e.before.netKg)} · Após ajuste:{" "}
                {kg(e.after.netKg)}
              </p>
            )}
            {e.notes && <p className="small">{e.notes}</p>}
          </article>
        ))}
      </section>
    </>
  );
}
export default function MixedBags() {
  const { id } = useParams(),
    [params, setParams] = useSearchParams(),
    [search, setSearch] = useState(params.get("search") || ""),
    [receiving, setReceiving] = useState(false);
  const context = useWasteResource(
    useCallback(() => read("/mixed-bags/context"), []),
  );
  const page = Number(params.get("page") || 1),
    status = params.get("status") || "ALL";
  const path = id
    ? `/mixed-bags/${encodeURIComponent(id)}`
    : `/mixed-bags?${new URLSearchParams({ page: String(page), status, search: params.get("search") || "" })}`;
  const resource = useWasteResource(useCallback(() => read(path), [path]));
  return (
    <div className="management-workspace">
      <ManagementHeader
        title="Triagem e bags"
        description="Recebimento misturado, separação e formação de lotes."
        actions={
          <>
            {id ? (
              <Link className="btn btn-outline-secondary" to="/mixed-bags">
                Voltar às bags
              </Link>
            ) : (
              <button
                className="btn btn-success"
                onClick={() => setReceiving(true)}
              >
                Receber bag misturada
              </button>
            )}
            <button
              className="btn btn-outline-secondary"
              onClick={() => resource.refresh()}
            >
              Atualizar
            </button>
          </>
        }
      />
      <Notice resource={context} />
      <Notice resource={resource} />
      {context.data &&
        (id ? (
          resource.data?.bag && (
            <BagDetail
              key={id}
              bag={resource.data.bag}
              context={context.data}
              onSaved={resource.refresh}
            />
          )
        ) : (
          <>
            {receiving && (
              <ReceiveForm
                context={context.data}
                onClose={() => setReceiving(false)}
              />
            )}
            {resource.data && (
              <>
                <div className="row g-3 mb-4">
                  {[
                    [
                      "Recebido líquido no filtro",
                      resource.data.summary.receivedKg,
                    ],
                    ["Separado em materiais", resource.data.summary.sortedKg],
                    ["Rejeitos", resource.data.summary.rejectedKg],
                    ["Ainda a triar", resource.data.summary.pendingKg],
                  ].map(([label, value]) => (
                    <div className="col-6 col-lg-3" key={label}>
                      <div className="card p-3">
                        <small>{label}</small>
                        <strong>{kg(value)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
                <form
                  className="d-flex flex-wrap gap-2 mb-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setParams({ status, search, page: "1" });
                  }}
                >
                  <input
                    aria-label="Buscar bag"
                    className="form-control"
                    style={{ maxWidth: 350 }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Código, identificação ou origem"
                  />
                  <select
                    aria-label="Situação da bag"
                    className="form-control"
                    style={{ maxWidth: 250 }}
                    value={status}
                    onChange={(e) =>
                      setParams({
                        status: e.target.value,
                        search: params.get("search") || "",
                        page: "1",
                      })
                    }
                  >
                    <option value="ALL">Todas as situações</option>
                    {Object.entries(labels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-outline-success">Buscar</button>
                </form>
                <div className="card p-3">
                  {resource.data.items.length === 0 ? (
                    <p>Nenhuma bag neste filtro.</p>
                  ) : (
                    resource.data.items.map((b) => (
                      <article className="border-bottom py-3" key={b.id}>
                        <strong>
                          {b.code} · {labels[b.status]}
                        </strong>
                        <p className="mb-1">
                          {b.originLabel}
                          {b.externalTag ? ` · ${b.externalTag}` : ""}
                        </p>
                        <p className="small mb-2">
                          Líquido {kg(b.netKg)} · Ainda a triar{" "}
                          {kg(b.remainingKg)} · {date(b.receivedAt)}
                        </p>
                        <Link
                          className="btn btn-outline-success btn-sm"
                          to={`/mixed-bags/${b.id}`}
                        >
                          Abrir bag e triagem
                        </Link>
                      </article>
                    ))
                  )}
                </div>
                <div className="d-flex gap-2 align-items-center mt-3">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    disabled={page <= 1 || resource.loading}
                    onClick={() =>
                      setParams({
                        status,
                        search: params.get("search") || "",
                        page: String(page - 1),
                      })
                    }
                  >
                    Anterior
                  </button>
                  <span>
                    Página {page} de {resource.data.pagination.totalPages}
                  </span>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    disabled={
                      page >= resource.data.pagination.totalPages ||
                      resource.loading
                    }
                    onClick={() =>
                      setParams({
                        status,
                        search: params.get("search") || "",
                        page: String(page + 1),
                      })
                    }
                  >
                    Próxima
                  </button>
                </div>
              </>
            )}
          </>
        ))}
    </div>
  );
}
