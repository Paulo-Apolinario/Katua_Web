export const agentName = (key) =>
  ({
    COLLECTIONS: "Agente de Coletas",
    ROUTES: "Agente de Rotas",
    MANAGER: "Agente Gestor",
  })[key] || "Assistente KATUÁ";
export const statusName = (key) =>
  ({
    RUNNING: "Em análise",
    SUCCEEDED: "Concluída",
    FAILED: "Falhou",
    PENDING: "Pendente",
    APPROVED: "Aprovada para revisão",
    REJECTED: "Rejeitada",
    EXECUTED: "Executada",
    REQUESTED: "Solicitada",
    SCHEDULED: "Programada",
    IN_PROGRESS: "Em andamento",
    OPEN: "Aberta",
    RESOLVED: "Resolvida",
    CRITICAL: "Crítica",
    WARNING: "Atenção",
    INFO: "Informativa",
    NEEDS_INFO: "Aguardando informações",
    PENDING_REVIEW: "Aguardando análise",
    PROCESSING: "Em processamento",
    DEAD: "Precisa de revisão",
    DONE: "Processado",
    SKIPPED: "Ignorado",
    COLLECTED: "Coletada em campo",
    RECEIVED: "Recebida",
    SORTING: "Em triagem",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
  })[key] || "Não informado";
export const agentDate = (value) => {
  if (!value) return "Não registrada";
  const d = new Date(value);
  return Number.isFinite(+d)
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Fortaleza",
      }).format(d)
    : "Data indisponível";
};
export const countLabels = {
  todayCollections: "Coletas programadas para hoje",
  todayUnassignedRequests: "Solicitações de hoje sem coleta vinculada",
  routesWithoutResources: "Rotas sem motorista ou veículo",
  routesWithoutDriver: "Rotas sem motorista",
  routesWithoutVehicle: "Rotas sem veículo",
  pendingProposals: "Recomendações aguardando revisão",
  failedAnalyses24h: "Análises com falha nas últimas 24 horas",
  pendingEventDeliveries: "Entregas de eventos pendentes",
  processingEventDeliveries: "Entregas em processamento",
  deadEventDeliveries: "Entregas que precisam de revisão",
  activeRequests: "Solicitações ativas",
  extraOrdersAwaitingReview: "Ordens extras aguardando análise",
  pevReportsAwaitingCollection: "Relatos de PEV aguardando coleta",
  fieldPendingCollections: "Coletas pendentes em campo",
  overdueRequestsInSample: "Solicitações antigas no recorte",
  activeRoutes: "Rotas ativas",
  listedRoutes: "Rotas apresentadas",
  validatedRoutes: "Rotas com validação detalhada",
  pendingRequests: "Pendências de atendimento",
  fieldOperations: "Operações em campo",
  awaitingReceipt: "Aguardando recebimento",
  awaitingReview: "Aguardando conferência",
  pendingDestination: "Aguardando destinação",
  openAlerts: "Ocorrências abertas",
};
const paths =
  /^\/(?:$|(?:collection-requests|extra-collection-orders|waste-list|route-list|route-plans|document-list|maintenance-list|smtp-config|settings|notifications|agents)(?:\?.*)?$|(?:edit-route|edit-waste|collected-waste|bin-list)\/[A-Za-z0-9_%.-]+(?:\?.*)?$)/;
export function safeAgentHref(href) {
  return typeof href === "string" &&
    ![...href].some((char) => char.charCodeAt(0) < 32 || char === "\\") &&
    !href.startsWith("//") &&
    paths.test(href)
    ? href
    : null;
}
export const isAgentNotice = (n) =>
  /^agent:proposal:/.test(n?.eventKey || "") &&
  typeof n?.data?.proposalId === "string";
export const mergeRows = (old, rows) => [
  ...new Map([...old, ...rows].map((r) => [r.id, r])).values(),
];
export const aborted = (e) => e?.name === "AbortError";
