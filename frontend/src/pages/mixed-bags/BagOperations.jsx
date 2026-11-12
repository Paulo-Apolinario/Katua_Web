import { useCallback, useRef, useState } from "react";
import { Link } from "react-router";
import { apiRequest } from "../../services/apiClient";
import { useWasteResource } from "../../components/waste-workspace/useWasteResource";
const kg = (v) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(
    Number(v || 0),
  ) + " kg";
const today = () => new Date(Date.now() - 10800000).toISOString().slice(0, 10);
const date = (v) =>
  new Date(v).toLocaleString("pt-BR", { timeZone: "America/Fortaleza" });
const read = (path) => apiRequest(path, { suppressReadNotice: true });
function useOperation() {
  const guard = useRef(false),
    identity = useRef(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function send(path, payload, done) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const key = JSON.stringify({ path, ...payload });
    if (identity.current?.key !== key)
      identity.current = { key, id: crypto.randomUUID() };
    try {
      await apiRequest(path, {
        method: "POST",
        body: { ...payload, operationId: identity.current.id },
      });
      setMessage("Operação registrada. Consulte o histórico atualizado.");
      await done();
    } catch (e) {
      setError(e.message);
      await done();
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return { busy, error, message, send };
}
function State({ resource }) {
  return (
    <>
      {resource.loading && <p role="status">Consultando…</p>}
      {resource.error && (
        <p className="alert alert-danger" role="alert">
          {resource.error}
          <button
            className="btn btn-outline-secondary btn-sm ms-2"
            onClick={() => resource.refresh()}
          >
            Tentar novamente
          </button>
        </p>
      )}
    </>
  );
}
function Feedback({ op }) {
  return (
    <>
      {op.error && (
        <p className="alert alert-danger" role="alert">
          {op.error}
        </p>
      )}
      {op.message && (
        <p className="alert alert-success" role="status">
          {op.message}
        </p>
      )}
    </>
  );
}
export function ReverseWeighing({ bag, manager, onSaved }) {
  const [eventId, setEventId] = useState(""),
    [notes, setNotes] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const op = useOperation();
  const eligible = bag.events.filter((e) => e.kind === "SORT" && !e.reversedAt);
  if (!manager || !eligible.length || bag.status === "CANCELLED") return null;
  return (
    <section className="card p-4 my-4">
      <details>
        <summary className="fw-bold">
          Corrigir pesagem confirmada — estorno justificado
        </summary>
        <p className="mt-3">
          O estorno devolve integralmente a pesagem e seus rejeitos ao saldo da
          bag. Depois, registre a pesagem correta. O original permanece no
          histórico. Bags concluídas serão reabertas.
        </p>
        <p className="small">
          O sistema bloqueia lotes com histórico de saída, reserva ou
          processamento. Se houver complementações, a entrada que originou o
          lote exige estornar essas complementações primeiro. Dias fechados
          precisam ser reabertos em{" "}
          <Link to="/mixed-bags?view=controls">Fechamento e alertas</Link>.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void op.send(
              `/mixed-bags/${bag.id}/reverse`,
              { eventId, expectedVersion: bag.version, notes },
              async () => {
                await onSaved();
              },
            );
          }}
        >
          <label htmlFor="reverse-event" className="form-label">
            Pesagem a estornar
          </label>
          <select
            id="reverse-event"
            className="form-control mb-3"
            value={eventId}
            disabled={op.busy}
            required
            onChange={(e) => {
              setEventId(e.target.value);
              setConfirmed(false);
            }}
          >
            <option value="">Selecione a pesagem</option>
            {eligible.map((e) => (
              <option key={e.id} value={e.id}>
                {date(e.createdAt)} ·{" "}
                {e.outputs
                  .map((o) => `${o.materialName}: ${kg(o.quantityKg)}`)
                  .join(", ") || "Somente rejeitos"}{" "}
                · rejeitos {kg(e.rejectedKg)}
              </option>
            ))}
          </select>
          <label htmlFor="reverse-notes" className="form-label">
            Justificativa do estorno *
          </label>
          <textarea
            id="reverse-notes"
            className="form-control"
            required
            minLength={5}
            maxLength={1500}
            disabled={op.busy}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <label className="d-block my-3">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={op.busy}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{" "}
            Conferi a pesagem e confirmo o estorno integral.
          </label>
          <Feedback op={op} />
          <button
            className="btn btn-outline-danger"
            disabled={
              op.busy || !confirmed || !eventId || notes.trim().length < 5
            }
          >
            {op.busy ? "Registrando…" : "Confirmar estorno da pesagem"}
          </button>
        </form>
      </details>
    </section>
  );
}
export default function BagOperations() {
  const [day, setDay] = useState(today()),
    [notes, setNotes] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [hours, setHours] = useState(48),
    [page, setPage] = useState(1);
  const op = useOperation();
  const daily = useWasteResource(
    useCallback(
      () => read("/mixed-bags/day?day=" + encodeURIComponent(day)),
      [day],
    ),
  );
  const alerts = useWasteResource(
    useCallback(
      () => read(`/mixed-bags/alerts?hours=${hours}&page=${page}`),
      [hours, page],
    ),
  );
  const d = daily.data,
    shown = d?.status === "CLOSED" ? d.snapshot : d?.preview;
  return (
    <>
      <section className="card p-4 my-4">
        <h2 className="h4">Alertas de bags paradas</h2>
        <p>
          Bags com saldo pendente e sem novos registros há pelo menos o
          intervalo escolhido. O aviso sai da lista após nova movimentação na
          bag ou conclusão, na próxima atualização. Este intervalo é uma
          referência operacional, não um prazo de atraso.
        </p>
        <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
          <label htmlFor="alert-hours">Sem registro há</label>
          <select
            id="alert-hours"
            className="form-control"
            style={{ maxWidth: 200 }}
            value={hours}
            onChange={(e) => {
              setHours(Number(e.target.value));
              setPage(1);
            }}
          >
            {[24, 48, 72, 168, 720].map((h) => (
              <option key={h} value={h}>
                {h} horas
              </option>
            ))}
          </select>
          <button
            className="btn btn-outline-success"
            onClick={() => alerts.refresh()}
          >
            Atualizar alertas
          </button>
        </div>
        <State resource={alerts} />
        {alerts.data && (
          <>
            <p>
              <strong>{alerts.data.total} bag(s)</strong> ·{" "}
              {kg(alerts.data.pendingKg)} ainda por triar · Atualizado em{" "}
              {date(alerts.data.generatedAt)}
            </p>
            {alerts.data.items.length ? (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Bag / origem</th>
                      <th>Saldo</th>
                      <th>Último registro</th>
                      <th>Sem registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.data.items.map((b) => (
                      <tr key={b.id}>
                        <th>
                          <Link to={"/mixed-bags/" + b.id}>{b.code}</Link>
                          <small className="d-block">{b.originLabel}</small>
                        </th>
                        <td>{kg(b.pendingKg)}</td>
                        <td>{date(b.lastActivity)}</td>
                        <td>{b.idleHours} h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Nenhuma bag parada nesta seleção.</p>
            )}
            <div className="d-flex gap-2 align-items-center">
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page <= 1 || alerts.loading}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span>
                {page}/{alerts.data.totalPages}
              </span>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page >= alerts.data.totalPages || alerts.loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
            </div>
          </>
        )}
      </section>
      <section className="card p-4 mb-4">
        <h2 className="h4">Fechamento diário da produção</h2>
        <p>
          Conferência das pesagens válidas lançadas no dia, no horário de
          Fortaleza. Não fecha estoque nem impede destinações. Novas pesagens e
          estornos de um dia fechado exigem reabertura pelo gestor.
        </p>
        <label htmlFor="triage-day" className="form-label">
          Dia da produção
        </label>
        <input
          id="triage-day"
          className="form-control mb-3"
          type="date"
          max={today()}
          value={day}
          disabled={op.busy}
          onChange={(e) => {
            setDay(e.target.value);
            setConfirmed(false);
          }}
        />
        <button
          className="btn btn-outline-secondary mb-3"
          onClick={() => daily.refresh()}
          disabled={op.busy}
        >
          Atualizar resumo do dia
        </button>
        <State resource={daily} />
        {d && shown && (
          <>
            <p>
              <strong>
                {d.status === "CLOSED"
                  ? "Produção fechada"
                  : "Produção em aberto"}
              </strong>{" "}
              · Versão {d.version} · {day.split("-").reverse().join("/")}
            </p>
            <p>
              <strong>{kg(shown.sortedKg)}</strong> separados ·{" "}
              {kg(shown.rejectedKg)} de rejeitos · {shown.operations} pesagens ·{" "}
              {shown.bags} bags
            </p>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Produção</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.materials?.map((m) => (
                    <tr key={m.itemId}>
                      <th>{m.name}</th>
                      <td>{kg(m.quantityKg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details className="mb-3">
              <summary>Participantes do dia</summary>
              <p>
                Quilos das operações coletivas com participação. Não some as
                linhas como produção individual.
              </p>
              {shown.participants?.map((p) => (
                <p key={p.id}>
                  {p.name} · {p.operations} pesagens · {kg(p.collectiveKg)}
                </p>
              ))}
            </details>
            {d.manager ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void op.send(
                    `/mixed-bags/day/${d.day}/${d.status === "CLOSED" ? "reopen" : "close"}`,
                    {
                      expectedVersion: d.version,
                      notes,
                      ...(d.status === "OPEN"
                        ? { expectedFingerprint: d.preview.fingerprint }
                        : {}),
                    },
                    async () => {
                      await daily.refresh();
                      setConfirmed(false);
                    },
                  );
                }}
              >
                <label className="form-label" htmlFor="day-notes">
                  {d.status === "CLOSED"
                    ? "Justificativa da reabertura"
                    : "Observação da conferência (opcional)"}
                  {d.status === "CLOSED" ? " *" : ""}
                </label>
                <textarea
                  id="day-notes"
                  className="form-control"
                  required={d.status === "CLOSED"}
                  minLength={d.status === "CLOSED" ? 5 : undefined}
                  maxLength={1500}
                  disabled={op.busy}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <label className="d-block my-3">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={op.busy}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />{" "}
                  {d.status === "CLOSED"
                    ? "Confirmo a reabertura justificada do dia."
                    : "Conferi os totais e confirmo o fechamento do dia."}
                </label>
                <Feedback op={op} />
                <button
                  className="btn btn-success"
                  disabled={
                    op.busy ||
                    daily.loading ||
                    !confirmed ||
                    (d.status === "CLOSED" && notes.trim().length < 5) ||
                    d.day !== day
                  }
                >
                  {op.busy
                    ? "Registrando…"
                    : d.status === "CLOSED"
                      ? "Reabrir produção do dia"
                      : "Fechar produção do dia"}
                </button>
              </form>
            ) : (
              <p>Somente o gestor pode fechar ou reabrir a produção.</p>
            )}
            <h3 className="h5 mt-4">Histórico de conferências do dia</h3>
            {d.actions.length ? (
              d.actions.map((a) => (
                <article className="border-top py-3" key={a.id}>
                  <strong>
                    {a.kind === "CLOSE" ? "Fechamento" : "Reabertura"} · versão{" "}
                    {a.snapshot.version}
                  </strong>
                  <p>
                    {date(a.createdAt)} · {a.actorName}
                  </p>
                  <p>{a.notes}</p>
                  <details>
                    <summary>Resumo preservado nesta versão</summary>
                    <p>
                      {kg(a.snapshot.production.sortedKg)} separados ·{" "}
                      {kg(a.snapshot.production.rejectedKg)} de rejeitos ·{" "}
                      {a.snapshot.production.operations} pesagens
                    </p>
                    {a.snapshot.production.materials?.map((m) => (
                      <p key={m.itemId}>
                        {m.name}: {kg(m.quantityKg)}
                      </p>
                    ))}
                  </details>
                </article>
              ))
            ) : (
              <p>Nenhuma conferência registrada para este dia.</p>
            )}
          </>
        )}
      </section>
    </>
  );
}
