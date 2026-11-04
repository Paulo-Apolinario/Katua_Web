import { apiRequest } from "./apiClient";
export const AGENTS_CHANGED = "katua:agents-changed";
const key = (value) => encodeURIComponent(value);
const query = (values) => {
  const p = new URLSearchParams();
  Object.entries(values || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, v);
  });
  return p.size ? `?${p}` : "";
};
// The assistant owns read errors; do not turn an optional chat outage into an operational-page alert.
const request = (path, options = {}) =>
  apiRequest(`/agents${path}`, { suppressReadNotice: true, ...options });
export const agentsService = {
  catalog: (signal) => request("", { signal }),
  config: (agent, body, signal) =>
    request(`/${key(agent)}/config`, { method: "PATCH", body, signal }),
  run: (agent, body, signal) =>
    request(`/${key(agent)}/run`, { method: "POST", body, signal }),
  command: (body, signal) =>
    request("/commands", { method: "POST", body, signal }),
  runs: (q, signal) => request(`/runs${query(q)}`, { signal }),
  getRun: (id, signal) => request(`/runs/${key(id)}`, { signal }),
  conversations: (q, signal) =>
    request(`/conversations${query(q)}`, { signal }),
  messages: (id, q, signal) =>
    request(`/conversations/${key(id)}/messages${query(q)}`, { signal }),
  proposals: (q, signal) => request(`/proposals${query(q)}`, { signal }),
  proposal: (id, signal) => request(`/proposals/${key(id)}`, { signal }),
  decision: (id, body, signal) =>
    request(`/proposals/${key(id)}/decision`, { method: "POST", body, signal }),
  occurrences: (q, signal) => request(`/occurrences${query(q)}`, { signal }),
  occurrence: (id, signal) => request(`/occurrences/${key(id)}`, { signal }),
  audit: (q, signal) => request(`/audit${query(q)}`, { signal }),
};
export const agentEventId = () => `web_${crypto.randomUUID()}`;
