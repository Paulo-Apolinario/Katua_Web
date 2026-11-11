import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  participationRequest,
  number,
  dateTime,
  statusLabels,
} from "../../services/participationAnalytics";

const channels = {
  SCHEDULE: {
    title: "Pedidos de coleta",
    pending: "Aguardam atendimento ou recebimento",
    link: "/collection-requests",
    action: "Abrir pedidos de coleta",
    linked: "Com ordem extra vinculada",
    help: "Pedidos criados por pessoas, geradores ou pela equipe. Recebimentos confirmados deixam de compor as pendências, mesmo se o pedido ainda constar como aberto.",
  },
  EXTRA: {
    title: "Ordens de coleta extra",
    pending: "Aguardam análise ou complementação",
    link: "/extra-collection-orders",
    action: "Abrir ordens extras",
    linked: "Com solicitação vinculada",
    help: "Aceitar uma ordem não comprova o recebimento do material. Ordens aceitas podem gerar pedidos e coletas que aparecem também no primeiro quadro.",
  },
  PEV: {
    title: "Chamados de PEV",
    pending: "Chamados abertos ou atribuídos",
    link: "/bin-list",
    action: "Abrir PEVs e chamados",
    linked: "Com coleta vinculada",
    help: "Chamados comunicam uma necessidade do ponto. Um chamado resolvido não comprova doação individual ou recebimento de material.",
  },
};
const labels = {
  ...statusLabels,
  PENDING_REVIEW: "Aguardando análise",
  NEEDS_INFO: "Aguardando complementação",
  ACCEPTED: "Aceita",
  OPEN: "Aberto",
  ASSIGNED: "Atribuído",
  RESOLVED: "Resolvido",
  DISMISSED: "Encerrado sem atendimento",
};

export default function AttendanceAnalytics({ start, end }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    participationRequest("attendance", { start, end }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err.message || "Não foi possível consultar o atendimento.");
      });
    return () => controller.abort();
  }, [start, end, retry]);
  return (
    <section
      className="pa-panel pa-attendance"
      aria-label="Atendimento das solicitações"
    >
      <div className="pa-heading">
        <h2>Atendimento das solicitações</h2>
        <span className="pa-eyebrow">SITUAÇÃO ATUAL</span>
      </div>
      <p>
        Registros criados de {start.split("-").reverse().join("/")} a{" "}
        {end.split("-").reverse().join("/")}, em toda a cooperativa. Este quadro
        usa somente o período; perfil, município e bairro não se aplicam aqui.
      </p>
      <p className="pa-notice">
        Os três quadros representam tipos diferentes de registro e não devem ser
        somados. Uma ordem extra pode estar vinculada a um pedido e à mesma
        coleta.
      </p>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setRetry((value) => value + 1)}>
            Tentar consultar atendimento
          </button>
        </div>
      ) : !data ? (
        <p role="status">Consultando atendimento…</p>
      ) : (
        <>
          <p className="pa-reference">
            Atualizado em {dateTime(data.meta.generatedAt)} · Horário de
            Fortaleza{data.meta.partial ? " · Dia atual parcial" : ""}
          </p>
          <div className="pa-attendance-grid">
            {data.channels.map((row) => {
              const config = channels[row.channel];
              return (
                <article className="pa-attendance-card" key={row.channel}>
                  <h3>{config.title}</h3>
                  <strong className="pa-attendance-total">
                    {row.channel === "SCHEDULE" ? (
                      <Link
                        className="pa-count-link"
                        to={`/analytics/participation/requests/ALL?${new URLSearchParams({ start, end })}`}
                        aria-label={`Ver todos os pedidos: ${number(row.total)}`}
                      >
                        {number(row.total)}
                      </Link>
                    ) : (
                      number(row.total)
                    )}
                  </strong>
                  <p>registro(s) criado(s) no período</p>
                  <div className="pa-attendance-pending">
                    <strong>{number(row.pending)}</strong>
                    <span>{config.pending}</span>
                  </div>
                  <p>{config.help}</p>
                  <dl className="pa-quality">
                    <div>
                      <dt>{config.linked}</dt>
                      <dd>{number(row.linked)}</dd>
                    </div>
                    {row.channel === "SCHEDULE" &&
                      Object.entries({
                        received: "Recebidos",
                        pending: "Pendentes",
                        cancelled: "Cancelados sem recebimento",
                        closed_without_receipt:
                          "Encerrados sem recebimento confirmado",
                        needs_check: "Registros a conferir",
                      }).map(([key, label]) => (
                        <div key={key}>
                          <dt>{label}</dt>
                          <dd>
                            <Link
                              className="pa-count-link"
                              to={`/analytics/participation/requests/${{ received: "RECEIVED", pending: "PENDING", cancelled: "CANCELLED", closed_without_receipt: "CLOSED_WITHOUT_RECEIPT", needs_check: "CHECK" }[key]}?${new URLSearchParams({ start, end })}`}
                              aria-label={`Ver ${label}: ${number(data.reconciliation?.[key])}`}
                            >
                              {number(data.reconciliation?.[key])}
                            </Link>
                          </dd>
                        </div>
                      ))}
                    {row.channel === "EXTRA" && (
                      <div>
                        <dt>Com recebimento confirmado</dt>
                        <dd>{number(row.received)}</dd>
                      </div>
                    )}
                  </dl>
                  {row.channel === "SCHEDULE" && (
                    <p>
                      Recebidos + pendentes + cancelados sem recebimento +
                      encerrados sem recebimento + registros a conferir ={" "}
                      {number(data.reconciliation?.total)} pedidos. Os vínculos
                      com ordens extras já estão incluídos nesse total.
                    </p>
                  )}
                  {!row.total && <p>Nenhum registro deste tipo no período.</p>}
                  <details>
                    <summary>Ver situações e tempo de espera</summary>
                    <dl className="pa-quality">
                      {row.statuses.map((status) => (
                        <div key={status.status}>
                          <dt>
                            {labels[status.status] ||
                              "Situação não reconhecida — conferir na operação"}
                          </dt>
                          <dd>{number(status.count)}</dd>
                        </div>
                      ))}
                    </dl>
                    <h4>Idade das pendências deste período</h4>
                    <p>
                      Tempo desde a criação até esta consulta, em dias
                      completos. Não é indicador de atraso: agendamentos futuros
                      podem estar nesta fila.
                    </p>
                    <dl className="pa-quality">
                      <div>
                        <dt>Menos de 7 dias</dt>
                        <dd>{number(row.pending_under7)}</dd>
                      </div>
                      <div>
                        <dt>7 a 29 dias</dt>
                        <dd>{number(row.pending_7to29)}</dd>
                      </div>
                      <div>
                        <dt>30 dias ou mais</dt>
                        <dd>{number(row.pending_30plus)}</dd>
                      </div>
                    </dl>
                    <p>
                      Registro pendente mais antigo:{" "}
                      {row.oldest_pending_at
                        ? dateTime(row.oldest_pending_at)
                        : "Nenhum nesta seleção"}
                      .
                    </p>
                    {row.channel !== "PEV" && (
                      <>
                        <h4>Da criação ao recebimento</h4>
                        <p>
                          {row.median_hours == null
                            ? "Sem pares de datas válidos para calcular o tempo."
                            : `Tempo mediano: ${number(row.median_hours)} hora(s), em ${number(row.duration_sample)} registro(s).`}
                        </p>
                        <p>
                          {number(row.retrospective)} registro(s) com
                          recebimento anterior à criação foram excluídos do
                          cálculo do tempo. Isso pode ocorrer em registros
                          retrospectivos.
                        </p>
                      </>
                    )}
                    <p>
                      Vínculos a conferir: {number(row.invalid_links)}.
                      {row.channel !== "PEV" && (
                        <>
                          {" "}
                          Datas de recebimento ausentes ou futuras:{" "}
                          {number(row.invalid_receipts)}.
                        </>
                      )}
                    </p>
                  </details>
                  <Link className="pa-attendance-link" to={config.link}>
                    {config.action}
                  </Link>
                </article>
              );
            })}
          </div>
          <p className="pa-explanation">
            Esta seleção não representa toda a fila histórica. Amplie o período
            para encontrar pedidos mais antigos. As situações são atuais e podem
            mudar após análise, cancelamento ou recebimento.
          </p>
        </>
      )}
    </section>
  );
}
