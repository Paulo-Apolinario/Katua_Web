import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { loadInbox, markNoticeRead, markAllRead, noticeTarget } from "../services/inboxService";
import { useLiveRefresh } from "../hooks/useLiveRefresh";
const noticeDate = (value) => { const date = new Date(value); return Number.isFinite(+date) ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Fortaleza" }).format(date) : "Data indisponível"; };
import RefreshNotice from "../components/RefreshNotice";
import HeadTags from "../components/HeadTags";
export default function Notifications() {
  const [data, setData] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [at, setAt] = useState(null), [historyLoaded, setHistoryLoaded] = useState(false);
  const request = useRef({ version: 0 }), working = useRef(false);
  const load = useCallback(async (cursor) => {
    if (working.current) return;
    working.current = true;
    const version = ++request.current.version;
    setBusy(true);
    try {
      const result = await loadInbox(cursor);
      if (version !== request.current.version) return;
      setHistoryLoaded(!!cursor);
      setData(old => cursor && old ? { ...result, notifications: [...new Map([...old.notifications, ...result.notifications].map(n => [n.id, n])).values()] } : result);
      setAt(new Date()); setError("");
    } catch (e) { if (version === request.current.version) setError(e.message || "Não foi possível consultar os avisos."); }
    finally { if (version === request.current.version) { working.current = false; setBusy(false); } }
  }, []);
  useEffect(() => { const guard = request.current; void load(); return () => { guard.version += 1; working.current = false; }; }, [load]);
  const live = useLiveRefresh(() => load(), { paused: busy || historyLoaded });
  async function read(id) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    try {
      if (id) await markNoticeRead(id); else await markAllRead();
      setData(old => old ? { ...old, unreadCount: id ? Math.max(0, old.unreadCount - (old.notifications.some(n => n.id === id && !n.readAt) ? 1 : 0)) : 0,
        notifications: old.notifications.map(n => !id || n.id === id ? { ...n, readAt: new Date().toISOString() } : n) } : old);
      setError("");
    } catch (e) { setError(e.message); } finally { working.current = false; setBusy(false); }
    await load();
  }
  return <section className="container-fluid py-4">
    <HeadTags title="Central de avisos | KATUÁ" />
    <div className="d-flex justify-content-between gap-3 flex-wrap mb-3"><div><h1 className="h3">Central de avisos</h1><p>Pendências e atualizações da operação da cooperativa.</p></div>
      <div className="d-flex gap-2 align-items-start"><button className="btn btn-outline-success" disabled={busy} onClick={() => load()}>Atualizar avisos</button>
        <button className="btn btn-outline-secondary" disabled={busy || !data?.unreadCount} onClick={() => read()}>Marcar todos como lidos</button></div></div>
    <RefreshNotice at={at} deferred={live.deferred} />
    {error && <p className="alert alert-warning" role="alert">{error} Os avisos já consultados continuam visíveis.</p>}
    <p role="status">{data ? `${data.unreadCount} aviso(s) não lido(s).` : busy ? "Consultando avisos…" : "Avisos indisponíveis."}</p>
    <ul className="list-group mb-3">{data?.notifications.map(n => <li key={n.id} className="list-group-item p-3">
      <div className="d-flex justify-content-between gap-3 flex-wrap"><div><strong>{n.title}</strong>{!n.readAt && <span className="badge text-bg-success ms-2">Novo</span>}<small className="d-block text-muted">{noticeDate(n.createdAt)}</small></div>
      <div className="d-flex gap-2 align-items-center">{!n.readAt && <button disabled={busy} className="btn btn-sm btn-outline-secondary" onClick={() => read(n.id)}>Marcar como lido</button>}
      {noticeTarget(n) && <Link className="btn btn-sm btn-outline-success" to={noticeTarget(n)}>Abrir atendimento</Link>}</div></div><p className="mt-2 mb-0" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{n.message}</p>
    </li>)}</ul>
    {data && !data.notifications.length && <p>Nenhum aviso registrado.</p>}
    {data?.nextCursor && <button className="btn btn-outline-success" disabled={busy} onClick={() => load(data.nextCursor)}>Carregar mais avisos</button>}
  </section>;
}
