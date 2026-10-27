import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  COLLECTION_STAGES,
  generatorName,
  personName,
  location,
  materials,
  quantity,
} from "./collectionWorkspace";
const stamp = (v) =>
  v && !Number.isNaN(+new Date(v))
    ? new Date(v).toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })
    : "Não informado";
export const collectionEvents = (c) =>
  [
    ["Criada", c.createdAt],
    ["Iniciada", c.startedAt, c.startedBy],
    [
      c.extraOrder ? "Registro da coleta por O.C." : "Finalizada em campo",
      c.collectedAt,
      c.fieldCompletedBy,
    ],
    ["Recebida na cooperativa", c.receivedAt, c.receivedBy],
    ["Triagem iniciada", c.sortingStartedAt, c.sortingStartedBy],
    ["Concluída", c.completedAt, c.completedBy],
    ["Cancelada", c.cancelledAt, c.cancelledBy],
  ].filter(([, date]) => date);
export function buildCollectionPdf(
  c,
  { event, cooperativeName = "Cooperativa / OSC" } = {},
) {
  if (!c?.id) throw Error("Selecione uma coleta válida.");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const table = (head, body, startY) => {
    autoTable(doc, {
      head: [head],
      body,
      startY,
      margin: { left: 16, right: 16, top: 20, bottom: 22 },
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 2.5,
        overflow: "linebreak",
      },
      headStyles: { fillColor: [23, 62, 50] },
      columnStyles: head.length === 2 ? { 0: { cellWidth: 45 } } : {},
    });
    return doc.lastAutoTable.finalY + 6;
  };
  doc.setFillColor(23, 62, 50);
  doc.rect(0, 0, 210, 34, "F");
  doc.setTextColor(255);
  doc.setFontSize(19);
  doc.setFont("helvetica", "bold");
  doc.text("KATUÁ", 16, 14);
  doc.setFontSize(12);
  doc.text(
    event ? "Registro de ação da coleta" : "Comprovante operacional de coleta",
    16,
    24,
  );
  doc.setTextColor(35);
  doc.setFont("helvetica", "normal");
  let y = table(
    ["Identificação", "Dados registrados"],
    [
      ["Cooperativa / OSC", c.cooperative?.name || cooperativeName],
      ["Coleta", c.id],
      ["Origem", generatorName(c)],
      ["Endereço de retirada", location(c)],
      [
        "Status atual",
        COLLECTION_STAGES[c.status] || c.status || "Não informado",
      ],
      ["Catador", personName(c.collector)],
      ["Motorista", personName(c.driver)],
      [
        "Veículo",
        [c.vehicle?.plate, c.vehicle?.model].filter(Boolean).join(" · ") ||
          "Não vinculado",
      ],
      [
        "Rota",
        c.route?.name ||
          c.extraOrder?.routeNameSnapshot ||
          "Sem rota vinculada",
      ],
    ],
    42,
  );
  if (event)
    y = table(
      ["Ação selecionada", "Registro"],
      [
        [event[0], stamp(event[1])],
        [
          "Responsável registrado",
          event[2] ? personName(event[2]) : "Não informado",
        ],
      ],
      y,
    );
  const rows = materials(c);
  y = table(
    ["Material registrado", "Quantidade / unidade"],
    rows.length
      ? rows.map((m) => [m.name, quantity(m.value, m.unit)])
      : [["Sem material efetivo registrado", "—"]],
    y,
  );
  if (c.participants?.length) {
    const confirmed =
      c.allocationVersion > 0 &&
      c.allocationQuantityVersion === c.quantityReviewVersion;
    y = table(
      ["Equipe", "Conferência da divisão"],
      [
        [
          c.teamNameSnapshot || "Equipe",
          confirmed
            ? `Divisão confirmada · versão ${c.allocationVersion}`
            : "Divisão pendente ou pesagem alterada",
        ],
      ],
      y,
    );
    y = table(
      ["Participante", "Material", "Parcela individual"],
      c.participants.flatMap((p) =>
        confirmed && p.allocations?.length
          ? p.allocations.map((m) => [
              p.nameSnapshot,
              m.name,
              quantity(m.quantity, m.unit),
            ])
          : [[p.nameSnapshot, "Aguardando conferência", "—"]],
      ),
      y,
    );
  }
  for (const review of c.quantityReviews || []) {
    y = table(
      ["Conferência", "Registro"],
      [
        [
          `Versão ${review.version}`,
          `${stamp(review.createdAt)} · ${review.actorName}`,
        ],
        ["Justificativa", review.reason],
      ],
      y,
    );
    y = table(
      ["Material", "Informado em campo", "Anterior", "Conferido"],
      review.items.map((item) => [
        item.name,
        quantity(item.reportedQuantity, item.unit),
        quantity(item.previousQuantity, item.unit),
        quantity(item.confirmedQuantity, item.unit),
      ]),
      y,
    );
  }
  y = table(
    ["Etapa registrada", "Data / hora (Fortaleza)", "Responsável"],
    collectionEvents(c).map(([label, date, actor]) => [
      label,
      stamp(date),
      actor ? personName(actor) : "Não informado",
    ]),
    y,
  );
  if (c.incidents?.length)
    y = table(
      ["Ocorrência", "Descrição"],
      c.incidents.map((i) => [
        i.type || i.title || "Ocorrência",
        i.description || i.notes || "Não informado",
      ]),
      y,
    );
  table(
    ["Informações adicionais", "Conteúdo"],
    [
      ["Observações", c.notes || "Não informadas"],
      ["Cancelamento", c.cancellationReason || "Não se aplica"],
      ["Emissão do relatório", stamp(new Date())],
    ],
    y,
  );
  const count = doc.getNumberOfPages();
  for (let p = 1; p <= count; p++) {
    doc.setPage(p);
    doc.setTextColor(90);
    doc.setFontSize(8);
    doc.text(
      "Registro operacional do sistema. Não substitui MTR, CDF ou documento fiscal.",
      16,
      282,
    );
    doc.text(`KATUÁ | Página ${p} de ${count}`, 16, 288);
  }
  return doc;
}
export function downloadCollectionPdf(c, options) {
  buildCollectionPdf(c, options).save(
    `katua-coleta-${String(c.id).replace(/[^a-zA-Z0-9-]/g, "")}${options?.event ? "-acao" : ""}.pdf`,
  );
}
