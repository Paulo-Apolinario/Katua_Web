import { useEffect, useRef, useState } from "react";
import { Link, Outlet } from "react-router";
import { LockKeyhole } from "lucide-react";
import {
  ANALYTICS_LOCKED_EVENT,
  clearAnalyticsAccess,
  unlockAnalytics,
} from "../../services/analyticsAccess";

export default function AnalyticsAccessGate() {
  const [expiresAt, setExpiresAt] = useState(0);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(null);
  useEffect(() => {
    const lock = () => {
      setExpiresAt(0);
      setPassword("");
      setError("");
    };
    window.addEventListener(ANALYTICS_LOCKED_EVENT, lock);
    return () => {
      window.removeEventListener(ANALYTICS_LOCKED_EVENT, lock);
      pending.current?.abort();
      clearAnalyticsAccess();
    };
  }, []);
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(
      clearAnalyticsAccess,
      Math.max(0, expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [expiresAt]);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    try {
      const until = await unlockAnalytics(password, controller.signal);
      setPassword("");
      setExpiresAt(until);
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure.message ||
            "Não foi possível liberar o acesso. Tente novamente.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  if (expiresAt)
    return (
      <>
        <div className="d-flex flex-wrap justify-content-end align-items-center gap-2 mb-3">
          <small className="text-muted">
            Acesso de gestor liberado por até 30 minutos.
          </small>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={clearAnalyticsAccess}
          >
            Bloquear Analytics
          </button>
        </div>
        <Outlet />
      </>
    );
  return (
    <section
      className="card mx-auto my-4 shadow-sm"
      style={{ maxWidth: 480 }}
      aria-labelledby="analytics-access-title"
    >
      <div className="card-body p-4">
        <LockKeyhole
          size={32}
          className="text-success mb-3"
          aria-hidden="true"
        />
        <h1 id="analytics-access-title" className="h4">
          Analytics — acesso restrito
        </h1>
        <p>
          Esta área é exclusiva para gestores. Informe a senha de liberação para
          acessar os indicadores e as informações do Analytics.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="analytics-access-password" className="form-label">
            Senha de liberação
          </label>
          <input
            id="analytics-access-password"
            name="analytics-access-password"
            type="password"
            className="form-control"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            maxLength={128}
            autoComplete="off"
            disabled={busy}
            aria-describedby={error ? "analytics-access-error" : undefined}
          />
          {error && (
            <p
              id="analytics-access-error"
              role="alert"
              className="text-danger mt-2"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-success w-100 mt-3"
            disabled={busy || !password}
          >
            {busy ? "Verificando…" : "Liberar acesso"}
          </button>
        </form>
        <Link to="/" className="btn btn-link d-block mt-2">
          Voltar ao painel
        </Link>
        <small className="text-muted d-block mt-2">
          Ao sair desta área ou atualizar a página, a senha será solicitada
          novamente.
        </small>
      </div>
    </section>
  );
}
