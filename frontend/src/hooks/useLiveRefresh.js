import { useEffect, useRef, useState } from "react";

// Refresh read views only. Never replace a form or a dialog being edited.
export function useLiveRefresh(refresh, { enabled = true, paused = false, interval = 30000 } = {}) {
  const latest = useRef({ refresh, paused });
  latest.current = { refresh, paused };
  const [deferred, setDeferred] = useState(false);
  const running = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    const update = async () => {
      if (document.hidden || running.current) return;
      const editing = document.querySelector('[role="dialog"], .modal.show, [data-refresh-paused="true"]') ||
        document.activeElement?.matches('input, textarea, select, [contenteditable="true"]');
      if (latest.current.paused || editing) { setDeferred(true); return; }
      running.current = true;
      try { await latest.current.refresh(); setDeferred(false); }
      catch { /* The screen owns its error message and last successful data. */ }
      finally { running.current = false; }
    };
    const resume = () => { if (!document.hidden) void update(); };
    const timer = window.setInterval(update, interval);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
    };
  }, [enabled, interval]);
  return { deferred };
}
