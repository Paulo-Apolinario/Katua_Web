import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { quantity } from "./collectionWorkspace";
export const documentLabels = {
  SERVICE_ORDER: "Ordem de serviço",
  START_RECORD: "Registro de início",
  COLLECTION_RECEIPT: "Comprovante de coleta",
  RECEIVING_RECEIPT: "Comprovante de recebimento / conferência",
  CLOSURE: "Registro de encerramento",
  CANCELLATION: "Registro de cancelamento",
  DESTINATION_RECORD: "Registro interno de encaminhamento",
  TRANSPORT_RECORD: "Comprovante interno de saída e transporte",
  HISTORICAL_RECORD: "Registro de operação anterior"
};
export const stateLabels = {
  PENDING: "Aguardando saída",
  SCHEDULED: "Agendada",
  IN_PROGRESS: "Em campo",
  COLLECTED: "Coletada",
  RECEIVED: "Recebida",
  SORTING: "Em triagem",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  ACTIVE: "Ativo",
  HISTORICAL: "Histórico",
  STOCK: "Adicionar ao estoque",
  TRIAGE: "Triagem",
  RESERVATION: "Reserva",
  REJECT: "Rejeito",
  DISPOSAL: "Descarte",
  DIRECT_DESTINATION: "Destinação direta",
  SALE: "Venda / entrega",
  DONATION: "Doação",
  FULL: "Todos os pontos encerrados",
  NOT_PERFORMED: "Não realizada",
  OPEN: "Aberta",
  RESOLVED: "Resolvida",
  WITH_PENDING: "Com pendências",
  PARTIAL: "Parcial",
  NO_COLLECTION: "Sem coleta",
  AVAILABLE: "Disponível",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  DESTINED: "Destinado",
  DISCARDED: "Descartado"
};
export function internalDate(value, time = false) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "Não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    dateStyle: "short",
    ...(time ? {
      timeStyle: "short"
    } : {})
  }).format(new Date(value));
}
const dateLabel = internalDate;
const label = v => stateLabels[v] || v || "Não informado";
const text = v => v === null || v === undefined || v === "" ? "Não informado" : String(v);
export function internalDocumentSections(d) {
  const s = d.snapshot || {},
    sections = [["Identificação", [["Documento", d.number], ["Tipo", documentLabels[d.kind] || d.kind], ["Emitido em", dateLabel(d.createdAt, true)], ["O.S. vinculadas", (d.orders || []).map(o => o.serviceOrder.number).join(", ")], ["Cooperativa", s.cooperative?.name], ["CNPJ", s.cooperative?.document], ["Endereço", s.cooperative?.address], ["Responsável registrado", s.actor || s.movement?.actorName]]]];
  if (s.historicalReconstruction) sections.push(["Origem deste registro", [["Reconstrução", "Emitido com os dados disponíveis na implantação. Não comprova autorização ou emissão na data original do serviço."]]]);
  if (s.route) {
    const a = s.route;
    sections.push([d.kind === "TRANSPORT_RECORD" ? "Rota da coleta de origem" : "Rota", [["Nome", a.name], ["Programação", dateLabel(a.date, true)], ["Situação na emissão", label(a.status)], ["Motorista", a.driver], ["Veículo", a.vehicle], ["Início", dateLabel(a.startedAt, true)], ["Encerramento", dateLabel(a.closedAt, true)], ["Resultado", label(a.outcome)], ["Orientações", a.notes]].filter(([, v]) => v !== null && v !== undefined && v !== "Não informada")]);
  }
  const collections = s.subjectCollectionId ? (s.collections || []).filter(c => c.id === s.subjectCollectionId) : s.collections || [];
  for (const c of collections) {
    const rows = [["Coleta", c.id], ["Solicitação", c.scheduleId], ["Origem", c.origin], ["Endereço", c.address], ["Programação", dateLabel(c.date || s.route?.date, true)], ["Situação na emissão", label(c.status)], ["Catador", c.collector], ["Colaboradores", c.participants?.join(", ")], ["Motorista", c.driver || s.route?.driver], ["Veículo", c.vehicle || s.route?.vehicle], ["Início", dateLabel(c.startedAt, true)], ["Coletado em", dateLabel(c.collectedAt, true)], ["Recebido em", dateLabel(c.receivedAt, true)], ["Encerrado em", dateLabel(c.completedAt, true)], ["Cancelado em", dateLabel(c.cancelledAt, true)], ["Motivo do cancelamento", c.cancellationReason], ["Observações", c.notes]];
    if (d.kind === "SERVICE_ORDER") for (const m of c.expectedMaterials || []) rows.push(["Previsto · " + m.name, m.quantity === null ? "Quantidade a conferir na coleta" : quantity(m.quantity, m.unit)]);
    if (d.kind !== "TRANSPORT_RECORD") for (const m of c.materials || []) rows.push([m.name, quantity(m.quantity, m.unit) + (m.reportedQuantity !== null && m.reportedQuantity !== undefined ? " · Informado em campo: " + quantity(m.reportedQuantity, m.unit) : "")]);
    if (["HISTORICAL_RECORD", "CLOSURE"].includes(d.kind)) for (const x of c.destinations || []) rows.push(["Encaminhamento · " + x.material, [label(x.type), quantity(x.quantity, x.unit), x.destinationName, label(x.status)].filter(Boolean).join(" · ")]);
    for (const i of c.incidents || []) rows.push(["Pendência / ocorrência", [i.description, label(i.status), i.resolution].filter(Boolean).join(" · ")]);
    sections.push(["Ponto de coleta · " + (c.origin || c.id), rows.filter(([k, v]) => v !== null && v !== undefined && v !== "" && !(["Início", "Coletado em", "Recebido em", "Encerrado em", "Cancelado em"].includes(k) && v === "Não informada"))]);
  }
  if (s.destination || s.movement) {
    const x = s.destination || s.movement;
    sections.push([s.movement ? "Saída e transporte interno" : "Encaminhamento do material", [["Material", s.material], ["Lote", s.lot?.code || x.stockLotId], ["Operação", label(x.kind || x.type)], ["Motorista da saída", x.transportDriverName], ["Veículo da saída", x.transportVehiclePlate], ["Quantidade", quantity(x.quantity, x.unit)], ["Data", dateLabel(x.movementDate || x.destinationDate)], ["Destinatário", x.destinationName], ["Documento do destinatário", x.destinationDocument], ["Endereço do destinatário", x.destinationAddress], ["Documento de transporte informado", x.transportDocument], ["Documento ambiental informado", x.environmentalDocument], ["Situação do registro na emissão", label(x.status)], ["Observações", x.notes]]]);
  }
  if (d.kind === "TRANSPORT_RECORD") {
    const exit = sections.pop();
    sections.splice(1, 0, exit);
  }
  return sections.map(([title, rows]) => [title, rows.map(([k, v]) => [k, text(v)])]);
}
export function buildInternalDocumentPdf(d) {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    compress: true
  });
  doc.setProperties({
    title: `${documentLabels[d.kind]} · ${d.number}`,
    author: d.snapshot?.cooperative?.name || "Katuá",
    creator: "Katuá"
  });
  const rows = [];
  for (const [title, fields] of internalDocumentSections(d)) {
    rows.push([{
      content: title,
      colSpan: 2,
      styles: {
        fillColor: [231, 242, 236],
        textColor: [17, 90, 65],
        fontStyle: "bold"
      }
    }], ...fields);
  }
  autoTable(doc, {
    startY: 29,
    body: rows,
    theme: "grid",
    margin: {
      left: 16,
      right: 16,
      top: 29,
      bottom: 25
    },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "top"
    },
    columnStyles: {
      0: {
        cellWidth: 49,
        fontStyle: "bold"
      },
      1: {
        cellWidth: 129
      }
    },
    rowPageBreak: "avoid"
  });
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(17, 90, 65);
    doc.text("KATUÁ · DOCUMENTO INTERNO", 16, 14);
    doc.setFontSize(9).text(d.number, 16, 21);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(80, 90, 85);
    doc.text("Registro operacional interno. Não substitui documentos oficiais, fiscais ou ambientais.", 16, 280);
    doc.text("Dados preservados da emissão · horário do Ceará", 16, 285);
    doc.text(`${i} / ${pages}`, 194, 290, {
      align: "right"
    });
  }
  return doc;
}
