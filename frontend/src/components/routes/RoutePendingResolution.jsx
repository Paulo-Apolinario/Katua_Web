import { useRef, useState } from "react";
import { Link } from "react-router";
import { apiRequest } from "../../services/apiClient";
import { routeEvents, routeOverdue, routeOutcomeLabel } from "../../utils/routeLifecycle";
import { title } from "./routePlanning";
const dateLabel = value => value ? new Date(value).toLocaleString("pt-BR", { timeZone: "America/Fortaleza" }) : "—";
const labels = { NOT_SERVED: "Ponto não atendido", CLOSURE_REQUEST: "Equipe solicitou encerramento com pendências", CANCEL_REMAINING: "Cancelamento dos pontos não atendidos", CLOSE_PARTIAL: "Encerramento com pendências", RESCHEDULE: "Execução reagendada", RESCHEDULE_REMAINING: "Pontos pendentes reagendados", ORIGIN: "Origem do reagendamento" };
export default function RoutePendingResolution({ route, dirty, onReload, onBusy }) {
  const [action, setAction] = useState(""), [reason, setReason] = useState(""), [date, setDate] = useState(""), [time, setTime] = useState("08:00"), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [next, setNext] = useState(null);
  const submission = useRef(null), guard = useRef(false);
  const points = (route.collections || []).filter(c => c.cancellationReason !== "Substituída por revisão do roteiro fixo");
  const remaining = points.filter(c => ["PENDING", "IN_PROGRESS"].includes(c.status));
  const performed = points.filter(c => ["COLLECTED", "RECEIVED", "SORTING", "COMPLETED"].includes(c.status));
  const events = routeEvents(route), closed = ["COMPLETED", "CANCELLED"].includes(route.status);
  const reports = events.filter(e => e.kind === "NOT_SERVED");
  const continuation = next || [...events].reverse().find(e => e.nextRouteId)?.nextRouteId;
  const reprogram = ["RESCHEDULE", "RESCHEDULE_REMAINING"].includes(action);
  async function submit(e) {
    e.preventDefault();
    if (guard.current || dirty || !confirmed) return;
    guard.current = true;setBusy(true);onBusy(true);setError("");
    const payload = { action, reason: reason.trim(), expectedRevision: route.revision, ...(reprogram ? { date, time } : {}) };
    const signature = JSON.stringify(payload);
    if (submission.current?.signature !== signature) submission.current = { signature, operationId: crypto.randomUUID() };
    try {
      const r = await apiRequest(`/routes/${encodeURIComponent(route.id)}/resolve-pending`, { method: "POST", body: { ...payload, operationId: submission.current.operationId } });
      if (!r?.ok) throw Error("Atualize a execução para conferir o resultado.");
      setNext(r.nextRouteId || null);setAction("");setConfirmed(false);setReason("");submission.current = null;
      await onReload();
    } catch (err) { setError(err.error || err.message || "Não foi possível confirmar a decisão. Atualize os dados antes de tentar novamente."); }
    finally { guard.current = false;setBusy(false);onBusy(false); }
  }
  if (!remaining.length && !events.length && !route.closureOutcome) return null;
  return <section className="card p-4 mb-4" aria-label="Pendências da execução">
    <h2>Pendências e encerramento da execução</h2>
    {routeOverdue(route) && <p role="status" className="alert alert-warning">Programação vencida. A execução permanece aguardando decisão da cooperativa.</p>}
    <p><strong>{routeOutcomeLabel(route)}</strong> · {performed.length} coletado(s) · {remaining.length} pendente(s) · {points.filter(c => c.status === "CANCELLED").length} cancelado(s)/não atendido(s).</p>
    {reports.some(e => remaining.some(c => c.id === e.collectionId)) && <div className="alert alert-warning">A equipe registrou pontos não atendidos. Os relatos não cancelam coletas automaticamente.</div>}
    {remaining.length > 0 && <ul>{remaining.map(c => { const report = [...reports].reverse().find(e => e.collectionId === c.id);return <li key={c.id}><strong>{title(c)}</strong> — {report ? report.reason : "Sem relato de impedimento"}{report && <small className="d-block">{report.actorName} · {dateLabel(report.at)}</small>}</li>; })}</ul>}
    {!closed && remaining.length > 0 && <form onSubmit={submit}>
      <p className="small text-muted">A decisão afeta somente esta execução e os pontos ainda não coletados. Coletas realizadas, materiais, comprovantes e produção permanecem preservados. A programação recorrente continua ativa.</p>
      <p className="small text-muted">Antes de confirmar, peça à equipe para sincronizar as coletas salvas offline.</p>
      {dirty && <p role="status" className="alert alert-info">Salve ou descarte as alterações do planejamento antes de tratar as pendências.</p>}
      <label className="form-label" htmlFor="route-pending-action">Decisão da cooperativa</label>
      <select id="route-pending-action" className="form-select mb-3" value={action} disabled={busy || dirty} onChange={e => {setAction(e.target.value);setConfirmed(false);}} required>
        <option value="">Selecione uma decisão</option>
        {!route.startedAt && route.status === "SCHEDULED" && !performed.length && !points.some(c => c.startedAt) && <option value="RESCHEDULE">Reagendar esta execução</option>}
        <option value="RESCHEDULE_REMAINING">Reagendar somente os pontos pendentes em nova execução</option>
        {performed.length > 0 ? <option value="CLOSE_PARTIAL">Encerrar com pendências e cancelar os pontos não atendidos</option> : <option value="CANCEL_REMAINING">Cancelar esta execução e os pontos não atendidos</option>}
      </select>
      {reprogram && <div className="row g-2 mb-3"><label className="col-sm-6">Nova data<input aria-label="Nova data da execução" type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} required disabled={busy} /></label><label className="col-sm-6">Horário no Ceará<input aria-label="Novo horário da execução" type="time" className="form-control" value={time} onChange={e => setTime(e.target.value)} required disabled={busy} /></label></div>}
      <label htmlFor="route-pending-reason" className="form-label">Justificativa da decisão</label>
      <textarea id="route-pending-reason" className="form-control mb-3" value={reason} onChange={e => setReason(e.target.value)} minLength={5} maxLength={1000} required disabled={busy} />
      <label className="d-flex align-items-start gap-2 mb-3"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy || dirty} />Conferi os pontos afetados e confirmo esta decisão.</label>
      <button type="submit" className="btn btn-outline-success" disabled={busy || dirty || !action || !confirmed || reason.trim().length < 5}>{busy ? "Confirmando…" : "Confirmar decisão sobre pendências"}</button>
    </form>}
    {error && <p role="alert" className="alert alert-danger mt-3">{error}</p>}
    {continuation && <p role="status" className="mt-3"><Link className="btn btn-sm btn-outline-success" to={`/edit-route/${continuation}`}>Abrir nova execução com os pontos reagendados</Link></p>}
    {!!events.length && <details className="mt-3"><summary>Histórico da execução ({events.length})</summary><ol className="mt-3">{[...events].reverse().map((e, i) => <li className="mb-3 text-break" key={e.id || i}><strong>{labels[e.kind] || "Atualização da execução"}</strong>{e.collectionId && <> · {title(points.find(c => c.id === e.collectionId) || {id:e.collectionId})}</>}<div>{e.reason}</div><small>{e.actorName || "Cooperativa"} · {dateLabel(e.at)}</small>{e.previousDate && <div>Programação anterior: {dateLabel(e.previousDate)}</div>}{e.newDate && <div>Nova programação: {dateLabel(e.newDate)}</div>}{e.nextRouteId && <Link className="btn btn-sm btn-outline-success mt-1" to={`/edit-route/${e.nextRouteId}`}>Consultar execução de continuidade</Link>}{e.kind === "ORIGIN" && e.routeId && <Link className="btn btn-sm btn-outline-success mt-1" to={`/edit-route/${e.routeId}`}>Consultar execução original</Link>}</li>)}</ol></details>}
  </section>;
}
