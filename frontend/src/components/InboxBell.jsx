import { useCallback, useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router";
import { loadInbox, INBOX_CHANGED } from "../services/inboxService";
import { useLiveRefresh } from "../hooks/useLiveRefresh";
export default function InboxBell() {
  const [count, setCount] = useState(null), [failed, setFailed] = useState(false);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++sequence.current;
    try { const r = await loadInbox(); if (version === sequence.current) { setCount(r.unreadCount); setFailed(false); } }
    catch { if (version === sequence.current) setFailed(true); }
  }, []);
  useEffect(() => {
    void refresh(); window.addEventListener(INBOX_CHANGED, refresh);
    return () => window.removeEventListener(INBOX_CHANGED, refresh);
  }, [refresh]);
  useLiveRefresh(refresh);
  return <Link to="/notifications" className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-2"
    aria-label={`Central de avisos${failed ? ": atualização indisponível" : count === null ? "" : `: ${count} não lidos`}`}>
    <Bell size={18} aria-hidden="true" /><span className="d-none d-sm-inline">Avisos</span>
    {failed ? <span aria-hidden="true">!</span> : count > 0 && <span className="badge text-bg-success">{count > 99 ? "99+" : count}</span>}
  </Link>;
}
