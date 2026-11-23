import { apiRequest } from "./apiClient";
import { analyticsAccessHeaders, clearAnalyticsAccess } from "./analyticsAccess";
export async function monitoringRequest(filters, signal, exporting = false) {
  try {
    const result = await apiRequest(`/analytics/monitoring${exporting ? "/export" : ""}?${new URLSearchParams(filters)}`, { headers: analyticsAccessHeaders(), signal, suppressReadNotice: true });
    return result.data;
  } catch (error) { if (error.code === "ANALYTICS_LOCKED") clearAnalyticsAccess(); throw error; }
}
export const accessLabels = { READY: "Habilitado", PENDING: "Aguardando ativação", BLOCKED: "Bloqueado / inativo" };
export const roleLabels = { COOPERATIVE: "Gestor da cooperativa", COLLECTOR: "Catador", DRIVER: "Motorista", GENERATOR_SMALL: "Pequeno gerador", GENERATOR_LARGE: "Grande gerador" };
export const monitoringDate = value => value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "Não registrado";
export function activeTime(value) {
  const s = Math.max(0, Math.floor(Number(value) || 0));
  return `${Math.floor(s / 3600)}h ${Math.floor(s % 3600 / 60)}min ${s % 60}s`;
}
export const systemsUsed = row => [row.web_used && "Painel web", row.app_used && "Aplicativo"].filter(Boolean).join(" / ") || "Sem sinal no período";
export function monitoringExportRows(data, detail) {
  return (detail ? data.accounts || [] : data.items).map(row => ({
    Nome: row.name,
    ...(detail ? { Perfil: roleLabels[row.role] || row.role } : { "CPF/CNPJ informado": row.document || "Não informado", Município: [row.city, row.state].filter(Boolean).join(" / ") || "Não informado" }),
    Situação: accessLabels[row.access_status] || row.access_status,
    Cadastro: monitoringDate(row.registered_at), Habilitação: monitoringDate(row.enabled_at), Sistemas: systemsUsed(row), "Validade contratual": "Não configurada",
    ...(detail ? { "Primeiro login observado": monitoringDate(row.first_login) } : {}),
    "Último login": monitoringDate(row.last_login), "Última atividade": monitoringDate(row.last_activity),
    "Tempo ativo estimado": activeTime(row.seconds), "Dias com sinal": row.days,
    ...(!detail ? { Contas: row.accounts, "Contas com sinal": row.measured_accounts, "Coletas criadas": row.collections, "Recebimentos confirmados": row.receipts, "Triagens de bags": row.triages, "Saídas de estoque": row.dispatches } : {}),
  }));
}
export async function exportMonitoring(data, detail, format) {
  const rows = monitoringExportRows(data, detail);
  if (!rows.length) throw Error("Não há registros para exportar nesta seleção.");
  const title = detail ? "Contas da cooperativa" : "Uso e adesão das cooperativas";
  const period = `Período: ${data.meta.start} a ${data.meta.end} | Horário de Fortaleza | Gerado em ${monitoringDate(data.meta.generatedAt)}`;
  if (format === "xlsx") {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook(), sheet = workbook.addWorksheet("Acompanhamento");
    sheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key, width: 27 }));
    rows.forEach(row => sheet.addRow(row)); sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: sheet.columns.length } };
    const notes = workbook.addWorksheet("Método e período");
    [title, period, data.method, data.limitations].forEach(text => notes.addRow([text]));
    const { saveAs } = await import("file-saver");
    saveAs(new Blob([await workbook.xlsx.writeBuffer()]), "katua-uso-e-adesao.xlsx");
  } else {
    const { jsPDF } = await import("jspdf"), { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape", format: "a3" });
    doc.setFontSize(15); doc.text(title, 12, 15); doc.setFontSize(9); doc.text(period, 12, 22);
    doc.text(doc.splitTextToSize("Tempo ativo é estimado; ausência de sinal não comprova ausência de uso. Datas históricas desconhecidas não foram reconstruídas.", 390), 12, 29);
    autoTable(doc, { startY: 40, head: [Object.keys(rows[0])], body: rows.map(row => Object.values(row)), styles: { fontSize: 6, overflow: "linebreak" }, margin: { left: 12, right: 12, bottom: 16 }, horizontalPageBreak: true,
      didDrawPage: () => { doc.setFontSize(8); doc.text(`KATUÁ | ${doc.getNumberOfPages()} | Horário de Fortaleza`, 12, doc.internal.pageSize.getHeight() - 8); } });
    doc.save("katua-uso-e-adesao.pdf");
  }
}
