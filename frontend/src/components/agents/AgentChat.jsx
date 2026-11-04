import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { Bot, Minus, X, Send } from "lucide-react";
import { useAgents } from "./agentsContext";
import { agentDate, agentName, safeAgentHref } from "./agentsFormat";
import AnalysisResult from "./AnalysisResult";
import "./agents.css";
export default function AgentChat() {
  const a = useAgents(),
    input = useRef(null),
    scroll = useRef(null),
    quickMenu = useRef(null);
  const lastMessageId = a?.messages?.at(-1)?.id;
  useEffect(() => {
    if (
      a?.isOpen &&
      scroll.current &&
      (lastMessageId || a?.error || a?.pendingRun)
    )
      scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [a?.isOpen, lastMessageId, a?.error, a?.pendingRun]);
  useEffect(() => {
    if (a?.context?.id && scroll.current) scroll.current.scrollTop = 0;
  }, [a?.context?.id]);
  const commandGroups = (a?.catalog?.agents || [])
    .filter((agent) => agent.enabled)
    .map((agent) => ({
      ...agent,
      commands: (a?.catalog.commands || []).filter(
        (c) => c.agent === agent.key,
      ),
    }))
    .filter((agent) => agent.commands.length);
  const hasCommands = commandGroups.length > 0;
  useEffect(() => {
    if (a?.isOpen && hasCommands) input.current?.focus();
  }, [a?.isOpen, hasCommands]);
  if (!a?.enabled) return null;
  const locked = a.busy || a.loading || a.uncertain || !!a.pendingRun;
  const contextAgentEnabled = commandGroups.some(
    (agent) => agent.key === a.context?.agent,
  );
  return (
    <>
      <button
        id="katua-agent-launcher"
        type="button"
        className="agents-launcher"
        aria-label={
          a.isOpen ? "Minimizar assistente KATUÁ" : "Abrir assistente KATUÁ"
        }
        aria-expanded={a.isOpen}
        aria-controls="katua-agent-chat"
        onClick={a.isOpen ? a.minimize : a.open}
      >
        <Bot aria-hidden="true" size={22} />
        <span>Assistente</span>
      </button>
      {a.isOpen && (
        <aside
          id="katua-agent-chat"
          className="agents-chat"
          role="region"
          aria-labelledby="katua-agent-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              a.minimize();
            }
          }}
        >
          <header className="agents-chat-header">
            <div>
              <h2 id="katua-agent-title">
                <Bot aria-hidden="true" size={20} /> Assistente KATUÁ
              </h2>
              <small>Consultas e apoio à gestão · Por regras</small>
            </div>
            <div className="agents-actions">
              <button
                type="button"
                aria-label="Minimizar conversa"
                onClick={a.minimize}
              >
                <Minus size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Fechar conversa"
                onClick={a.close}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </header>
          <div className="agents-toolbar">
            <button
              type="button"
              disabled={locked}
              onClick={() => a.selectConversation(null)}
            >
              Nova conversa
            </button>
            <button
              type="button"
              disabled={!hasCommands}
              aria-controls="agents-command-menu"
              onClick={() => {
                if (quickMenu.current) {
                  quickMenu.current.open = true;
                  quickMenu.current.querySelector("summary")?.focus();
                }
                if (scroll.current) scroll.current.scrollTop = 0;
              }}
            >
              Comandos
            </button>
            <button
              type="button"
              disabled={a.busy || a.loading}
              onClick={a.refresh}
              aria-label="Atualizar histórico"
            >
              Atualizar
            </button>
            <Link to="/agents">Abrir Central de Agentes</Link>
          </div>
          <div className="agents-chat-scroll" ref={scroll}>
            <details className="agents-history">
              <summary>Conversas anteriores ({a.conversations.length})</summary>
              <label htmlFor="agents-conversation">
                Histórico de conversas
              </label>
              <select
                id="agents-conversation"
                value={a.conversationId || ""}
                disabled={locked}
                onChange={(e) => a.selectConversation(e.target.value || null)}
              >
                <option value="">Nova conversa</option>
                {a.conversations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} · {agentDate(c.createdAt)}
                  </option>
                ))}
              </select>
              {a.historyCursor && (
                <button
                  type="button"
                  disabled={locked}
                  onClick={a.moreConversations}
                >
                  Mais conversas
                </button>
              )}
            </details>
            {!a.messages.length && (
              <p className="agents-disclosure">
                Escreva o que deseja consultar ou escolha um comando. Aceito
                frases simples e peço esclarecimento quando houver mais de uma
                opção.
              </p>
            )}
            {a.contextLoading && (
              <p role="status">Conferindo o acesso à referência…</p>
            )}
            {a.context && (
              <section
                className="agents-context"
                aria-label="Contexto autorizado"
              >
                <strong>{agentName(a.context.agent)}</strong>
                <h3>{a.context.title}</h3>
                <p>{a.context.description}</p>
                {a.context.proposal?.freshness &&
                  !a.context.proposal.freshness.current && (
                    <p className="agents-warning" role="status">
                      Dados alterados desde a análise.{" "}
                      {a.context.proposal.freshness.reason} Esta recomendação é
                      histórica; consulte a situação atual antes de decidir.
                    </p>
                  )}
                <small>Referência: {a.context.id}</small>
                <p>
                  Este contexto foi consultado no servidor. Abrir aqui não
                  resolve a ocorrência nem executa a proposta.
                </p>
                {a.context.proposal?.evidence?.href &&
                  safeAgentHref(a.context.proposal.evidence.href) && (
                    <Link to={safeAgentHref(a.context.proposal.evidence.href)}>
                      Abrir registro relacionado
                    </Link>
                  )}
                {a.context.occurrence &&
                  safeAgentHref(a.context.occurrence.link) && (
                    <Link to={safeAgentHref(a.context.occurrence.link)}>
                      Abrir registro relacionado
                    </Link>
                  )}
                {a.context.run?.result && (
                  <details>
                    <summary>Ver análise de origem (histórica)</summary>
                    <AnalysisResult
                      data={a.context.run.result}
                      onProposal={(id) => a.openContext({ proposalId: id })}
                    />
                  </details>
                )}
                <button
                  type="button"
                  disabled={locked || !contextAgentEnabled}
                  onClick={() =>
                    a.send(
                      a.context.agent === "ROUTES"
                        ? "ROUTES_ATTENTION"
                        : a.context.agent === "COLLECTIONS"
                          ? "COLLECTION_PRIORITIES"
                          : "ATTENTION_OCCURRENCES",
                    )
                  }
                >
                  Consultar situação atual com este agente
                </button>
                {!contextAgentEnabled && a.catalog && (
                  <p className="agents-warning" role="status">
                    Este agente está desabilitado. Habilite-o na Central de
                    Agentes para consultar a situação atual.
                  </p>
                )}
                <small className="d-block">
                  Executa a análise atual da cooperativa; não é uma consulta
                  restrita somente a esta referência.
                </small>
              </section>
            )}
            {a.messagesCursor && (
              <button type="button" disabled={locked} onClick={a.olderMessages}>
                Carregar mensagens anteriores
              </button>
            )}
            <details
              className="agents-command-menu"
              id="agents-command-menu"
              ref={quickMenu}
              open={!a.messages.length}
            >
              <summary>Comandos rápidos</summary>
              <div className="agents-quick">
                {commandGroups.map((agent) => (
                  <section
                    className="agents-quick-group"
                    key={agent.key}
                    aria-label={agent.label}
                  >
                    <h3>{agent.label}</h3>
                    {agent.commands.map((c) => (
                      <button
                        type="button"
                        key={c.key}
                        disabled={locked}
                        onClick={() => a.send(c.key)}
                      >
                        {c.example}
                      </button>
                    ))}
                  </section>
                ))}
                {!hasCommands && a.catalog && !a.loading && (
                  <p role="status">
                    Nenhum agente está habilitado para consultas. Habilite um
                    agente na Central de Agentes para ver os comandos
                    disponíveis.
                  </p>
                )}
              </div>
            </details>
            <ol
              className="agents-messages"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label="Mensagens da conversa"
            >
              {a.messages.map((m) => (
                <li
                  className={
                    m.role === "USER"
                      ? "agents-message-user"
                      : "agents-message-assistant"
                  }
                  key={m.id}
                >
                  {!m.data && (
                    <strong>
                      {m.role === "USER" ? "Você" : agentName(m.data?.agent)}
                    </strong>
                  )}
                  {!m.data && (
                    <p>
                      {m.role === "USER"
                        ? a.catalog?.commands?.find((c) => c.key === m.content)
                            ?.example || m.content
                        : m.content}
                    </p>
                  )}
                  {m.suggestions?.length > 0 && (
                    <div
                      className="agents-quick"
                      aria-label="Opções para esclarecer o comando"
                    >
                      {m.suggestions
                        .filter((c) =>
                          commandGroups.some((agent) => agent.key === c.agent),
                        )
                        .map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            disabled={locked}
                            onClick={() => a.send(c.key)}
                          >
                            {c.example}
                          </button>
                        ))}
                    </div>
                  )}
                  {m.data && (
                    <AnalysisResult
                      data={m.data}
                      onProposal={(id) => a.openContext({ proposalId: id })}
                    />
                  )}{" "}
                  {m.ephemeral && (
                    <small>
                      Orientação desta sessão. Escolha uma opção ou reformule o
                      pedido.
                    </small>
                  )}
                </li>
              ))}
            </ol>
            {!a.messages.length && !a.loading && (
              <p>
                Escolha um comando para consultar dados reais ou selecione uma
                conversa anterior.
              </p>
            )}
            {a.error && (
              <div role="alert" className="agents-error">
                {a.error}
                {a.uncertain && (
                  <button
                    type="button"
                    disabled={a.busy}
                    onClick={() => a.send(null, true)}
                  >
                    Consultar o envio anterior
                  </button>
                )}
              </div>
            )}
            {a.pendingRun && (
              <div role="status" className="agents-warning">
                Análise em andamento.
                <button type="button" disabled={a.busy} onClick={a.checkRun}>
                  Reconsultar resultado
                </button>
              </div>
            )}
            <p className="agents-status" role="status" aria-live="polite">
              {a.busy
                ? "Consultando o agente…"
                : a.loading
                  ? "Carregando histórico e comandos…"
                  : ""}
            </p>
          </div>
          <form
            className="agents-chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              void a.send();
            }}
          >
            <label htmlFor="katua-agent-input">Digite um comando</label>
            <div>
              <textarea
                ref={input}
                id="katua-agent-input"
                rows={2}
                maxLength={800}
                value={a.draft}
                disabled={
                  a.busy || a.uncertain || !!a.pendingRun || !hasCommands
                }
                onChange={(e) => a.setDraft(e.target.value)}
                aria-describedby="agents-input-help"
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    if (!locked && hasCommands && a.draft.trim()) void a.send();
                  }
                }}
                placeholder={
                  hasCommands
                    ? `Ex.: ${commandGroups[0].commands[0].example}`
                    : "Habilite um agente para consultar."
                }
              />
              <button
                type="submit"
                disabled={locked || !hasCommands || !a.draft.trim()}
                aria-label="Enviar comando"
              >
                <Send size={19} aria-hidden="true" />
              </button>
            </div>
            <small id="agents-input-help" className="agents-input-help">
              Enter para enviar · Shift + Enter para nova linha. As consultas
              não alteram registros operacionais.
            </small>
          </form>
        </aside>
      )}
    </>
  );
}
