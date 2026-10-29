export const routeEvents = (route) => Array.isArray(route?.operationalEvents) ? route.operationalEvents : [];
export function routeOverdue(route, now = new Date()) {
  if (!route?.scheduledDate || !["SCHEDULED", "IN_PROGRESS"].includes(route.status)) return false;
  const day = value => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
  return day(route.scheduledDate) < day(now);
}
export function routeOutcomeLabel(route) {
  if (route?.closureOutcome === "PARTIAL") return "Encerrada com pendências";
  return ({ SCHEDULED: "Agendada", IN_PROGRESS: "Em campo", COMPLETED: "Concluída", CANCELLED: "Cancelada" })[route?.status] || "Situação não informada";
}
