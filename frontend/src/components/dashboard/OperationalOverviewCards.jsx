import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiRequest } from "../../services/apiClient";
import { unitsLabel, dateLabel } from "../reports/reportModel";
export default function OperationalOverviewCards({ refresh }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0),
    [section, setSection] = useState("pending");
  useEffect(() => {
    let alive = true;
    const abort = new AbortController();
    setLoading(true);
    setError("");
    apiRequest("/dashboard/operations", { signal: abort.signal })
      .then((r) => {
        if (alive) setData(r.data);
      })
      .catch((e) => {
        if (alive)
          setError(e.message || "Não foi possível atualizar a operação.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      abort.abort();
    };
  }, [refresh, revision]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setRevision((n) => n + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  if (!data)
    return (
      <section
        role={error ? "alert" : "status"}
        className={`card p-4 mb-4 ${error ? "text-danger" : ""}`}
      >
        {error || "Consultando pendências e operações…"}
        {error && (
          <button
            className="btn btn-outline-secondary"
            onClick={() => setRevision((n) => n + 1)}
          >
            Tentar novamente
          </button>
        )}
      </section>
    );
  const cards = [
    {
      label: "Solicitações pendentes",
      value: data.requested,
      description: `${data.requestSources.schedules} agendamento(s) · ${data.requestSources.pevPoints} PEV(s) · ${data.requestSources.extraOrders} O.C.(s)`,
      action: () => setSection("pending"),
      labelAction: "Ver pendências",
    },
    {
      label: "Operações em campo",
      value: data.inProgress,
      description: `${data.scheduled} coleta(s) programada(s) ainda não iniciada(s)`,
      action: () => setSection("field"),
      labelAction: "Ver operação",
    },
    {
      label: "Aguardando recebimento",
      value: data.awaitingReceipt,
      description: "Coletas realizadas em campo, ainda não recebidas",
      href: "/collected-waste?stage=receipt",
    },
    {
      label: "Aguardando destinação",
      value: data.pendingDestination,
      description: `${data.pendingEntries} entrada(s) · ${Object.values(data.pendingUnits).some((v) => v > 0) ? unitsLabel(data.pendingUnits) + " em saldo" : "saldo em movimentação intermediária"}${data.intermediateEntries ? " · " + data.intermediateEntries + " intermediária(s)" : ""}`,
      href: "/collected-waste?stage=destination",
    },
  ];
  return (
    <>
      <section
        className="dashboard-kpis mb-3"
        aria-label="Situação atual da operação"
      >
        {cards.map((c) => (
          <article className="card p-4" key={c.label}>
            <h2>{c.label}</h2>
            <strong className="dashboard-kpi-value">{c.value}</strong>
            <p>{c.description}</p>
            {c.href ? (
              <Link to={c.href}>Abrir gestão →</Link>
            ) : (
              <button
                className="btn btn-link p-0 text-start"
                onClick={c.action}
              >
                {c.labelAction} →
              </button>
            )}
          </article>
        ))}
      </section>
      <p className="small text-muted">
        {loading
          ? "Atualizando operação…"
          : "Operação atualizada em " + dateLabel(data.generatedAt)}{" "}
        · Pendências atuais, independentes do período dos gráficos.
      </p>
      {error && (
        <p role="alert" className="alert alert-warning">
          {error} Os últimos dados continuam visíveis.
        </p>
      )}
      {data.reviewPending > 0 && (
        <p className="alert alert-light">
          <strong>
            {data.reviewPending} coleta(s) aguardando conferência.
          </strong>{" "}
          <Link to="/collected-waste?stage=review">Abrir conferência</Link>
        </p>
      )}
      <section className="card p-3 mb-4">
        <div
          className="waste-tabs"
          role="group"
          aria-label="Detalhes da operação"
        >
          <button
            className={`btn btn-sm ${section === "pending" ? "btn-success" : "btn-outline-secondary"}`}
            onClick={() => setSection("pending")}
          >
            Pendências de atendimento
          </button>
          <button
            className={`btn btn-sm ${section === "field" ? "btn-success" : "btn-outline-secondary"}`}
            onClick={() => setSection("field")}
          >
            Em campo
          </button>
        </div>
        {section === "pending" ? (
          data.pending.length ? (
            <ul className="list-group list-group-flush">
              {data.pending.map((t) => (
                <li
                  className="list-group-item d-flex justify-content-between gap-3 flex-wrap"
                  key={t.kind + t.id}
                >
                  <div>
                    <strong>{t.name}</strong>
                    <small className="d-block text-muted">
                      {t.kind} · {dateLabel(t.date)}
                    </small>
                  </div>
                  <Link to={t.href}>Analisar</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted mb-0">
              Nenhum pedido aguardando atendimento.
            </p>
          )
        ) : data.field.length ? (
          <ul className="list-group list-group-flush">
            {data.field.map((c) => (
              <li
                className="list-group-item d-flex justify-content-between gap-3 flex-wrap"
                key={c.id}
              >
                <div>
                  <strong>
                    {c.bin?.name ||
                      c.bin?.binId ||
                      c.generator?.name ||
                      "Coleta avulsa"}
                  </strong>
                  <small className="d-block text-muted">
                    {c.collector?.name || "Catador não informado"} ·{" "}
                    {c.vehicle?.plate || "Sem veículo"} ·{" "}
                    {c.route?.name || "Sem rota"}
                  </small>
                </div>
                <Link to={`/waste-list?coleta=${encodeURIComponent(c.id)}`}>
                  Acompanhar coleta
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted mb-0">
            Nenhuma coleta iniciada.{" "}
            <Link to="/waste-list?status=PENDING">
              Ver as {data.scheduled} programadas
            </Link>
          </p>
        )}
      </section>
    </>
  );
}
