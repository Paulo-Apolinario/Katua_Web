import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Bot } from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { useAgents } from "../../components/agents/agentsContext";
import {
  agentsService,
  agentEventId,
  AGENTS_CHANGED,
} from "../../services/agentsService";
import { INBOX_CHANGED } from "../../services/inboxService";
import {
  aborted,
  agentDate,
  agentName,
  mergeRows,
  safeAgentHref,
  statusName,
} from "../../components/agents/agentsFormat";
import ProposalCard from "../../components/agents/ProposalCard";
import AnalysisResult from "../../components/agents/AnalysisResult";
import HeadTags from "../../components/HeadTags";
import "../../components/agents/agents.css";
function AgentConfigCard({ config, lastRun, signal, onUpdated }) {
  const a = useAgents(),
    [enabled, setEnabled] = useState(config.enabled),
    [automatic, setAutomatic] = useState(config.automationsEnabled),
    [notifications, setNotifications] = useState(config.notificationsEnabled),
    [interval, setInterval] = useState(config.intervalMinutes),
    [eventInterval, setEventInterval] = useState(
      config.eventIntervalMinutes ?? 5,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [uncertain, setUncertain] = useState(false),
    pending = useRef(null);
  async function perform(kind) {
    if (busy) return;
    setBusy(true);
    setError("");
    const action = pending.current || {
      kind,
      body:
        kind === "config"
          ? {
              enabled,
              automationsEnabled: automatic,
              notificationsEnabled: notifications,
              intervalMinutes: Number(interval),
              eventIntervalMinutes: Number(eventInterval),
              expectedVersion: config.version,
              eventId: agentEventId(),
            }
          : { eventId: agentEventId() },
    };
    pending.current = action;
    try {
      const result = await agentsService[action.kind](
        config.key,
        action.body,
        signal,
      );
      pending.current = null;
      setUncertain(false);
      if (result.run?.result?.proposalIds?.length)
        window.dispatchEvent(new Event(INBOX_CHANGED));
      window.dispatchEvent(new Event(AGENTS_CHANGED));
      onUpdated();
    } catch (e) {
      if (!aborted(e)) {
        setError(e.message);
        const lost =
          (!e.status || e.status >= 500) &&
          !e.run &&
          e.code !== "AGENTS_DISABLED";
        setUncertain(lost);
        if (!lost) pending.current = null;
        if (e.run) onUpdated();
      }
    } finally {
      if (!signal?.aborted) setBusy(false);
    }
  }
  return (
    <article className="agents-config">
      <div className="agents-card-top">
        <h3>{config.label}</h3>
        <span className="agents-badge">
          {config.enabled ? "Habilitado" : "Desabilitado"}
        </span>
      </div>
      <p>{config.description}</p>
      <p>
        Última execução:{" "}
        {lastRun
          ? `${statusName(lastRun.status)} · ${agentDate(lastRun.startedAt)}`
          : "Nenhuma execução registrada"}
      </p>
      {lastRun?.result?.summary && <p>{lastRun.result.summary}</p>}
      {lastRun?.status === "FAILED" && (
        <p className="agents-warning">
          A última análise não foi concluída. Confira o histórico.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void perform("config");
        }}
        data-refresh-paused="true"
      >
        <label>
          <input
            type="checkbox"
            checked={enabled}
            disabled={busy || uncertain}
            onChange={(e) => setEnabled(e.target.checked)}
          />{" "}
          Habilitar agente para consultas
        </label>
        <label>
          <input
            type="checkbox"
            checked={automatic}
            disabled={busy || uncertain}
            onChange={(e) => setAutomatic(e.target.checked)}
          />{" "}
          Executar análises automaticamente
        </label>
        <label>
          <input
            type="checkbox"
            checked={notifications}
            disabled={busy || uncertain}
            onChange={(e) => setNotifications(e.target.checked)}
          />{" "}
          Avisar no sino sobre novas recomendações
        </label>
        <label htmlFor={`events-${config.key}`}>
          Intervalo mínimo entre análises por evento (minutos)
        </label>
        <input
          id={`events-${config.key}`}
          type="number"
          min={1}
          max={60}
          required
          value={eventInterval}
          disabled={busy || uncertain}
          onChange={(e) => setEventInterval(e.target.value)}
        />
        <label htmlFor={`interval-${config.key}`}>
          Intervalo automático (minutos)
        </label>
        <input
          id={`interval-${config.key}`}
          type="number"
          min={15}
          max={1440}
          required
          value={interval}
          disabled={busy || uncertain}
          onChange={(e) => setInterval(e.target.value)}
        />
        <p>
          <small>
            As automações só analisam dados quando o agente está habilitado.
            Avisos já existentes são preservados.
          </small>
        </p>
        {error && (
          <p role="alert" className="agents-error">
            {error}
          </p>
        )}
        <div className="agents-actions">
          <button type="submit" disabled={busy || uncertain}>
            {busy ? "Processando…" : "Salvar configurações"}
          </button>
          <button
            type="button"
            disabled={!config.enabled || busy || uncertain}
            onClick={() => perform("run")}
          >
            Executar análise
          </button>
          {uncertain && (
            <button type="button" disabled={busy} onClick={() => perform()}>
              Consultar solicitação anterior
            </button>
          )}
        </div>
      </form>
      <button type="button" onClick={a?.open}>
        Abrir assistente
      </button>
    </article>
  );
}
function AgentConfigurations({ revision, onUpdated }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [signal, setSignal] = useState(null);
  useEffect(() => {
    const c = new AbortController();
    setSignal(c.signal);
    setLoading(true);
    setError("");
    Promise.all([
      agentsService.catalog(c.signal),
      ...["COLLECTIONS", "ROUTES", "MANAGER"].map((agent) =>
        agentsService.runs({ agent, limit: 1 }, c.signal),
      ),
    ])
      .then(([catalog, ...runs]) => {
        if (!c.signal.aborted)
          setData({
            catalog,
            runs: Object.fromEntries(
              ["COLLECTIONS", "ROUTES", "MANAGER"].map((key, i) => [
                key,
                runs[i].data[0],
              ]),
            ),
          });
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [revision]);
  return (
    <>
      {loading && <p role="status">Consultando agentes e últimas análises…</p>}
      {error && (
        <p role="alert" className="agents-error">
          {error} As configurações não foram confirmadas.
        </p>
      )}
      {data && (
        <div className="agents-config-grid">
          {data.catalog.agents.map((config) => (
            <AgentConfigCard
              key={`${config.key}:${config.version}`}
              config={config}
              lastRun={data.runs[config.key]}
              signal={signal}
              onUpdated={onUpdated}
            />
          ))}
        </div>
      )}
    </>
  );
}
const auditName = (key) =>
  ({
    CONFIG_UPDATED: "Configuração atualizada",
    RUN_STARTED: "Análise iniciada",
    RUN_SUCCEEDED: "Análise concluída",
    RUN_FAILED: "Análise interrompida ou com falha",
    PROPOSAL_CREATED: "Recomendação criada",
    PROPOSAL_DECIDED: "Decisão humana registrada",
  })[key] || "Atividade registrada";
function AgentRecords({ type, revision, onUpdated }) {
  const a = useAgents(),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [filter, setFilter] = useState(""),
    [detail, setDetail] = useState(null),
    [detailBusy, setDetailBusy] = useState(false),
    [signal, setSignal] = useState(null),
    controller = useRef(null),
    version = useRef(0),
    busy = useRef(false);
  async function load(cursor, signal, versionId) {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      const q = {
        limit: 20,
        cursor,
        ...(type === "proposals" && filter ? { status: filter } : {}),
      };
      const result = await agentsService[type](q, signal);
      if (signal?.aborted || versionId !== version.current) return;
      setData((old) =>
        cursor && old
          ? { ...result, data: mergeRows(old.data, result.data) }
          : result,
      );
    } catch (e) {
      if (!signal?.aborted && versionId === version.current)
        setError(e.message);
    } finally {
      if (!signal?.aborted && versionId === version.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  }
  useEffect(() => {
    const c = new AbortController();
    controller.current = c;
    setSignal(c.signal);
    const v = ++version.current;
    busy.current = false;
    setData(null);
    setDetail(null);
    void load(null, c.signal, v);
    return () => c.abort();
    // Each page changes only on explicit refresh/filter; loaded records never overwrite a decision form in the background.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, revision, filter]);
  async function showRun(id) {
    setDetailBusy(true);
    setError("");
    try {
      const result = await agentsService.getRun(id, controller.current.signal);
      if (!controller.current.signal.aborted) setDetail(result.run);
    } catch (e) {
      if (!aborted(e)) setError(e.message);
    } finally {
      if (!controller.current.signal.aborted) setDetailBusy(false);
    }
  }
  return (
    <>
      {type === "proposals" && (
        <>
          <label htmlFor="agents-proposal-filter">
            Situação das recomendações
          </label>
          <select
            id="agents-proposal-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Todas</option>
            {["PENDING", "APPROVED", "REJECTED"].map((s) => (
              <option key={s} value={s}>
                {statusName(s)}
              </option>
            ))}
          </select>
        </>
      )}
      {loading && <p role="status">Consultando registros…</p>}
      {error && (
        <p role="alert" className="agents-error">
          {error} Não foi possível confirmar todos os dados.
        </p>
      )}
      {data && !data.data.length && (
        <p className="agents-empty">
          Nenhum registro encontrado nesta consulta.
        </p>
      )}
      {data?.data.map((row) =>
        type === "proposals" ? (
          <ProposalCard
            key={`${row.id}:${row.version}`}
            proposal={row}
            signal={signal}
            onUpdated={onUpdated}
          />
        ) : type === "occurrences" ? (
          <article className="agents-occurrence" key={row.id}>
            <div className="agents-card-top">
              <h3>{row.title}</h3>
              <span className="agents-badge">{statusName(row.priority)}</span>
            </div>
            <p>{row.message}</p>
            <small>
              Ocorrência {row.id} · {agentDate(row.updatedAt)}
            </small>
            <div className="agents-actions">
              {safeAgentHref(row.link) && (
                <Link to={safeAgentHref(row.link)}>Abrir registro</Link>
              )}
              <button
                type="button"
                onClick={() => a.openContext({ occurrenceId: row.id })}
              >
                Analisar com assistente
              </button>
            </div>
          </article>
        ) : type === "runs" ? (
          <article className="agents-activity" key={row.id}>
            <strong>
              {agentName(row.agent)} · {statusName(row.status)}
            </strong>
            <p>
              {agentDate(row.startedAt)} ·{" "}
              {row.origin === "EVENT"
                ? "Por evento operacional"
                : row.origin === "SCHEDULED"
                  ? "Automática"
                  : row.origin === "COMMAND"
                    ? "Comando no assistente"
                    : "Solicitada pela gestão"}
            </p>
            {row.result?.summary && <p>{row.result.summary}</p>}
            <button
              type="button"
              disabled={detailBusy}
              onClick={() => showRun(row.id)}
            >
              Ver análise
            </button>
          </article>
        ) : type === "events" ? (
          <article className="agents-activity" key={row.id}>
            <strong>
              {agentName(row.agent)} ·{" "}
              {
                {
                  PENDING: "Aguardando análise",
                  PROCESSING: "Em análise",
                  DONE: "Processado",
                  DEAD: "Precisa de revisão",
                  SKIPPED: "Não processado",
                }[row.status]
              }
            </strong>
            <p>
              {{
                Schedule: "Solicitação/agendamento",
                Collection: "Coleta",
                Route: "Rota",
                SystemAlert: "Ocorrência",
                Vehicle: "Veículo",
                Driver: "Motorista",
                Collector: "Catador",
                ExtraCollectionOrder: "Ordem extra",
                PevRequest: "Relato de PEV",
              }[row.event?.source] || "Registro operacional"}{" "}
              · {agentDate(row.event?.occurredAt)}
            </p>
            <small>
              Referência: {row.event?.entityId} · Tentativas: {row.attempts}
            </small>
            {row.errorCode && (
              <p>
                Última situação:{" "}
                {{
                  AGENT_DISABLED: "Agente ou automação desativados",
                  EVENT_EXPIRED: "Prazo do evento ultrapassado",
                  LEASE_EXPIRED: "Execução interrompida",
                  TIME_BUDGET_EXCEEDED: "Tempo de análise ultrapassado",
                  ANALYSIS_FAILED: "Falha temporária na análise",
                  RATE_LIMIT: "Aguardando a janela do limite de análises",
                  RUN_BUSY: "Aguardando análise em andamento",
                  SERVER_BUSY: "Aguardando disponibilidade do servidor",
                  EVENT_COOLDOWN: "Aguardando o intervalo configurado",
                }[row.errorCode] ||
                  "Não foi possível concluir; confira o histórico"}
                .
              </p>
            )}
            {row.runId && (
              <button
                type="button"
                disabled={detailBusy}
                onClick={() => showRun(row.runId)}
              >
                Ver análise
              </button>
            )}
          </article>
        ) : (
          <article className="agents-activity" key={row.id}>
            <strong>{auditName(row.action)}</strong>
            <p>
              {agentDate(row.createdAt)} ·{" "}
              {row.actorId ? "Ação da gestão" : "Processamento do sistema"}
            </p>
            <small>Referência: {row.targetId}</small>
          </article>
        ),
      )}
      {detail && (
        <section className="agents-activity" aria-label="Detalhes da análise">
          <h3>
            {agentName(detail.agent)} · {statusName(detail.status)}
          </h3>
          {detail.result ? (
            <AnalysisResult
              data={detail.result}
              onProposal={(id) => a.openContext({ proposalId: id })}
            />
          ) : (
            <p>
              {detail.status === "RUNNING"
                ? "Análise em andamento. Atualize o histórico para conferir o resultado."
                : "A análise não gerou resultado. Consulte os avisos e tente novamente depois de conferir o histórico."}
            </p>
          )}
          <button type="button" onClick={() => setDetail(null)}>
            Fechar detalhes
          </button>
        </section>
      )}
      {data?.nextCursor && (
        <div className="agents-pagination">
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              load(data.nextCursor, controller.current.signal, version.current)
            }
          >
            Carregar mais registros
          </button>
        </div>
      )}
    </>
  );
}
function Center() {
  const a = useAgents(),
    [tab, setTab] = useState("config"),
    [revision, setRevision] = useState(0);
  const tabs = [
    ["config", "Agentes e configurações"],
    ["occurrences", "Ocorrências"],
    ["proposals", "Recomendações"],
    ["runs", "Análises"],
    ["events", "Eventos operacionais"],
    ["audit", "Histórico de atividades"],
  ];
  return (
    <section className="agents-center">
      <HeadTags title="Central de Agentes | KATUÁ" />
      <div className="agents-center-top">
        <div>
          <h1>
            <Bot size={26} aria-hidden="true" /> Central de Agentes
          </h1>
          <p>Consultas, recomendações e acompanhamento da cooperativa.</p>
        </div>
        <div className="agents-actions">
          <button type="button" onClick={a.open}>
            Abrir assistente
          </button>
          <button type="button" onClick={() => setRevision((v) => v + 1)}>
            Atualizar central
          </button>
        </div>
      </div>
      <p className="agents-notice">
        Os agentes usam regras e dados do sistema. As recomendações dependem da
        sua conferência. Aprovar não executa alterações em coletas, rotas, pesos
        ou estoque.
      </p>
      <nav className="agents-tabs" aria-label="Seções da Central de Agentes">
        {tabs.map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "config" ? (
        <AgentConfigurations
          revision={revision}
          onUpdated={() => setRevision((v) => v + 1)}
        />
      ) : (
        <AgentRecords
          key={tab}
          type={tab}
          revision={revision}
          onUpdated={() => setRevision((v) => v + 1)}
        />
      )}
    </section>
  );
}
export default function AgentsCenter() {
  const { admin } = useAdminAuth();
  return admin?.role === "COOPERATIVE" ? (
    <Center />
  ) : (
    <p role="alert">
      A Central de Agentes está disponível somente para a cooperativa
      autorizada.
    </p>
  );
}
