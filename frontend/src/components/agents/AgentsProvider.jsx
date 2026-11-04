import { useCallback, useEffect, useRef, useState } from "react";
import { AgentsContext } from "./agentsContext";
import { aborted, mergeRows } from "./agentsFormat";
import {
  agentsService,
  agentEventId,
  AGENTS_CHANGED,
} from "../../services/agentsService";
import { INBOX_CHANGED } from "../../services/inboxService";
export default function AgentsProvider({ children, enabled }) {
  const [isOpen, setOpen] = useState(false),
    [catalog, setCatalog] = useState(null),
    [conversations, setConversations] = useState([]),
    [historyCursor, setHistoryCursor] = useState(null);
  const [conversationId, setConversationId] = useState(null),
    [messages, setMessages] = useState([]),
    [messagesCursor, setMessagesCursor] = useState(null),
    [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [context, setContext] = useState(null),
    [contextLoading, setContextLoading] = useState(false),
    [pendingRun, setPendingRun] = useState(null),
    [uncertain, setUncertain] = useState(false);
  const alive = useRef(true),
    controllers = useRef(new Set()),
    version = useRef(0),
    contextVersion = useRef(0),
    sending = useRef(false),
    pendingBody = useRef(null),
    returnFocus = useRef(null);
  useEffect(() => {
    alive.current = true;
    const active = controllers.current;
    return () => {
      alive.current = false;
      active.forEach((c) => c.abort());
      active.clear();
    };
  }, []);
  const request = useCallback(async (fn) => {
    const c = new AbortController();
    controllers.current.add(c);
    try {
      const data = await fn(c.signal);
      if (!alive.current) throw new DOMException("Interrompido", "AbortError");
      return data;
    } finally {
      controllers.current.delete(c);
    }
  }, []);
  const listConversations = useCallback(
    async (cursor) => {
      const data = await request((signal) =>
        agentsService.conversations({ limit: 20, cursor }, signal),
      );
      setConversations((old) =>
        cursor ? mergeRows(old, data.data) : data.data,
      );
      setHistoryCursor(data.nextCursor);
      return data;
    },
    [request],
  );
  const loadMessages = useCallback(
    async (id, cursor) => {
      const current = ++version.current;
      const data = await request((signal) =>
        agentsService.messages(id, { limit: 20, cursor }, signal),
      );
      if (current !== version.current) return;
      const rows = [...data.data].reverse();
      setMessages((old) => (cursor ? mergeRows(rows, old) : rows));
      setMessagesCursor(data.nextCursor);
    },
    [request],
  );
  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError((previous) => (pendingBody.current ? previous : ""));
    try {
      const [options] = await Promise.all([
        request((signal) => agentsService.catalog(signal)),
        listConversations(),
      ]);
      setCatalog(options);
    } catch (e) {
      if (!aborted(e)) setError(e.message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [enabled, listConversations, request]);
  useEffect(() => {
    if (!isOpen || !enabled) return;
    void refresh();
    const update = () => void refresh();
    window.addEventListener(AGENTS_CHANGED, update);
    return () => window.removeEventListener(AGENTS_CHANGED, update);
  }, [isOpen, enabled, refresh]);
  const open = useCallback(() => {
    if (!enabled) return;
    returnFocus.current = document.activeElement;
    setOpen(true);
  }, [enabled]);
  const minimize = () => {
    setOpen(false);
    queueMicrotask(() => {
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
      else document.getElementById("katua-agent-launcher")?.focus();
    });
  };
  const close = () => {
    contextVersion.current++;
    setContext(null);
    setContextLoading(false);
    minimize();
  };
  const selectConversation = async (id) => {
    if (sending.current) return;
    version.current++;
    setConversationId(id);
    setMessages([]);
    setMessagesCursor(null);
    setPendingRun(null);
    setUncertain(false);
    pendingBody.current = null;
    setError("");
    setLoading(true);
    try {
      if (id) await loadMessages(id);
    } catch (e) {
      if (!aborted(e)) setError(e.message);
    } finally {
      if (alive.current) setLoading(false);
    }
  };
  const openContext = async (ref) => {
    open();
    const current = ++contextVersion.current;
    setContextLoading(true);
    setContext(null);
    setError((previous) => (pendingBody.current ? previous : ""));
    try {
      let next;
      if (ref.proposalId) {
        const { proposal } = await request((signal) =>
          agentsService.proposal(ref.proposalId, signal),
        );
        const { run } = await request((signal) =>
          agentsService.getRun(proposal.runId, signal),
        );
        next = {
          id: proposal.id,
          type: "PROPOSAL",
          title: proposal.title,
          description: proposal.description,
          agent: run.agent,
          proposal,
          run,
        };
      } else if (ref.occurrenceId) {
        const { occurrence, agent } = await request((signal) =>
          agentsService.occurrence(ref.occurrenceId, signal),
        );
        next = {
          id: occurrence.id,
          type: "OCCURRENCE",
          title: occurrence.title,
          description: occurrence.message,
          agent,
          occurrence,
        };
      } else return;
      if (current === contextVersion.current) setContext(next);
    } catch (e) {
      if (!aborted(e) && current === contextVersion.current)
        setError(e.message);
    } finally {
      if (alive.current && current === contextVersion.current)
        setContextLoading(false);
    }
  };
  const receiveRun = async (result) => {
    setConversationId(result.run.conversationId);
    setPendingRun(result.run.status === "RUNNING" ? result.run : null);
    if (result.run.conversationId)
      await loadMessages(result.run.conversationId);
    await listConversations();
    if (result.run.result?.proposalIds?.length)
      window.dispatchEvent(new Event(INBOX_CHANGED));
  };
  const send = async (command, repeat = false) => {
    if (!enabled || sending.current || (!repeat && !command && !draft.trim()))
      return;
    sending.current = true;
    setBusy(true);
    setError("");
    const body = repeat
      ? pendingBody.current
      : {
          eventId: agentEventId(),
          ...(command ? { command } : { text: draft.trim() }),
          ...(conversationId ? { conversationId } : {}),
        };
    if (!body) {
      sending.current = false;
      setBusy(false);
      return;
    }
    pendingBody.current = body;
    setUncertain(false);
    try {
      const result = await request((signal) =>
        agentsService.command(body, signal),
      );
      if (!result.recognized) {
        setMessages((old) => [
          ...old,
          {
            id: `${body.eventId}-user`,
            role: "USER",
            content: body.text || body.command,
          },
          {
            id: body.eventId,
            role: "ASSISTANT",
            content: result.message,
            ephemeral: true,
          },
        ]);
      } else await receiveRun(result);
      pendingBody.current = null;
      setDraft("");
    } catch (e) {
      if (!aborted(e)) {
        if (e.run) {
          try {
            await receiveRun(e);
          } catch {
            /* Preserve the original failure and allow history refresh. */
          }
          pendingBody.current = null;
        }
        const lost =
          (!e.status || e.status >= 500) &&
          !e.run &&
          e.code !== "AGENTS_DISABLED";
        setUncertain(lost);
        if (!lost) pendingBody.current = null;
        setError(
          lost
            ? "O envio não foi confirmado. Consulte novamente com o mesmo evento para evitar repetição."
            : e.message,
        );
      }
    } finally {
      if (alive.current) {
        setBusy(false);
      }
      sending.current = false;
    }
  };
  const checkRun = async () => {
    if (!pendingRun || sending.current) return;
    sending.current = true;
    setBusy(true);
    try {
      const result = await request((signal) =>
        agentsService.getRun(pendingRun.id, signal),
      );
      await receiveRun(result);
      setError(
        result.run.status === "FAILED"
          ? "A análise falhou. Consulte o histórico antes de solicitar uma nova análise."
          : "",
      );
    } catch (e) {
      if (!aborted(e)) setError(e.message);
    } finally {
      sending.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return (
    <AgentsContext.Provider
      value={{
        enabled,
        isOpen,
        open,
        minimize,
        close,
        catalog,
        conversations,
        historyCursor,
        conversationId,
        messages,
        messagesCursor,
        draft,
        setDraft,
        busy,
        loading,
        error,
        context,
        contextLoading,
        pendingRun,
        uncertain,
        refresh,
        send,
        checkRun,
        selectConversation,
        openContext,
        olderMessages: () =>
          loadMessages(conversationId, messagesCursor).catch((e) => {
            if (!aborted(e)) setError(e.message);
          }),
        moreConversations: () =>
          listConversations(historyCursor).catch((e) => {
            if (!aborted(e)) setError(e.message);
          }),
      }}
    >
      {children}
    </AgentsContext.Provider>
  );
}
