import { apiRequest } from "./apiClient";

export function participationRequest(path, filters, signal) {
  const query = filters ? `?${new URLSearchParams(filters)}` : "";
  return apiRequest(`/analytics/participation/${path}${query}`, {
    signal,
    suppressReadNotice: true,
  }).then((response) => response.data);
}

export function recentPeriod(days = 30) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const start = new Date(`${today}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: today,
    profile: "",
    city: "",
    state: "",
    neighborhood: "",
    group: "week",
  };
}

export function participationFilters(params) {
  const defaults = recentPeriod();
  return Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [
      key,
      params.get(key) ?? value,
    ]),
  );
}
export const coverageLabels = {
  GENERATOR: "Geradores identificados",
  PF: "Pessoas físicas identificadas",
  PEV: "Coletas em PEVs",
  DELIVERER: "Entregadores avulsos",
  UNATTRIBUTED: "Origem não identificada",
  CONFLICT: "Vínculos a conferir",
};

export const profileLabels = {
  PF: "Pessoa física",
  SMALL: "Pequeno gerador",
  LARGE: "Grande gerador",
};
export const statusLabels = {
  REQUESTED: "Solicitada",
  SCHEDULED: "Agendada",
  IN_PROGRESS: "Em andamento",
  COLLECTED: "Coletada",
  RECEIVED: "Recebida",
  SORTING: "Em triagem",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  CANCELED: "Cancelada",
  REJECTED: "Recusada",
};
export const number = (value) =>
  value == null
    ? "Não disponível"
    : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
        value,
      );
export const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })
    : "Sem registro";
