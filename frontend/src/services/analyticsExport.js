import {
  dateTime,
  requestOutcomeLabels,
  profileLabels,
  unitLabels,
} from "./participationAnalytics";
const place = (value) =>
  !value ? "Todos" : value === "__unknown__" ? "Não informado" : value;
export function executiveSections(data) {
  const compareLabels = {
    active: "Participantes identificados",
    participations: "Participações identificadas",
    receipts: "Recebimentos (todos os perfis)",
    repeated: "Participantes com 2+ recebimentos",
    requests_created: "Pedidos criados (toda a cooperativa)",
  };
  return [
    {
      title: "Contexto",
      head: ["Informação", "Valor"],
      rows: [
        ["Cooperativa", data.cooperative.name],
        ["Período", `${data.meta.start} a ${data.meta.end}`],
        ["Emitido em", dateTime(data.meta.generatedAt)],
        [
          "Município / UF",
          `${place(data.meta.filters.city)} / ${place(data.meta.filters.state)}`,
        ],
        ["Bairro", place(data.meta.filters.neighborhood)],
        ["Horário", "Fortaleza (America/Fortaleza)"],
        [
          "Cobertura do período",
          data.comparison.meta.partial
            ? `Dia atual parcial até ${dateTime(data.comparison.meta.currentCutoff)}`
            : "Período concluído",
        ],
        [
          "Perfil dos participantes",
          profileLabels[data.meta.filters.profile] || "Todos",
        ],
        ["Material", "Todos os materiais"],
      ],
    },
    {
      title: `Comparação com ${data.comparison.meta.previousStart} a ${data.comparison.meta.previousEnd}`,
      head: ["Indicador", "Atual", "Anterior", "Diferença", "Variação (%)"],
      rows: Object.entries(compareLabels).map(([key, label]) => [
        label,
        data.comparison.current[key],
        data.comparison.previous[key],
        data.comparison.changes[key].absolute,
        data.comparison.changes[key].percent ?? "Sem base",
      ]),
    },
    {
      title: "Pedidos criados no período — toda a cooperativa",
      head: ["Situação atual", "Pedidos"],
      rows: data.requests.map((row) => [
        requestOutcomeLabels[row.outcome] || "A conferir",
        row.count,
      ]),
    },
    {
      title: "Qualidade no período e seleção geográfica",
      head: ["Indicador", "Registros"],
      rows: [
        [
          "Recebimentos sem origem atribuível",
          data.quality.unattributed_receipts,
        ],
        ["Sem bairro informado", data.quality.missing_neighborhood],
        [
          "Sem quantidade informada e sem peso legado positivo",
          data.quality.unweighed,
        ],
      ],
    },
    {
      title: "Recebimentos por bairro",
      head: ["Município", "UF", "Bairro", "Recebimentos"],
      rows: data.territories.map((row) => [
        row.city,
        row.state || "Não informado",
        row.neighborhood,
        row.receipts,
      ]),
    },
    {
      title: "Quantidades registradas por unidade",
      head: ["Unidade", "Quantidade registrada", "Coletas distintas"],
      rows: data.materials.map((row) => [
        unitLabels[row.unit] || "A conferir",
        Number(row.quantity),
        row.receipts,
      ]),
    },
    {
      title: "Cobertura do uso — toda a cooperativa",
      head: ["Informação", "Valor"],
      rows: [
        ["Contas vinculadas", data.usage.accounts],
        ["Contas com medição no período", data.usage.measured_accounts],
        ["Tempo ativo estimado (segundos)", data.usage.seconds],
      ],
    },
    {
      title: "Método e limites",
      head: ["Descrição"],
      rows: [
        data.comparison.method,
        ...data.notes,
        `Comparação anterior: ${data.comparison.meta.previousStart} a ${data.comparison.meta.previousEnd}; até ${dateTime(data.comparison.meta.previousCutoff)}.`,
      ].map((text) => [text]),
    },
  ];
}
export async function exportExecutive(format, data, canSave = () => true) {
  const sections = executiveSections(data),
    filename = `katua-resumo-${data.meta.start}_${data.meta.end}`;
  if (format === "xlsx") {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "KATUÁ";
    sections.forEach((section, index) => {
      const sheet = workbook.addWorksheet(
        `${index + 1} ${section.title}`.slice(0, 31),
      );
      sheet.addRow(section.head);
      section.rows.forEach((row) => sheet.addRow(row));
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF007D5B" },
      };
      sheet.columns.forEach((column, i) => {
        column.width = section.head.length === 1 ? 120 : i === 0 ? 48 : 28;
        column.alignment = { vertical: "top", wrapText: true };
        column.numFmt = "#,##0.###";
      });
      sheet.eachRow((row, index) => {
        row.height = index === 1 ? 24 : section.head.length === 1 ? 75 : 30;
      });
      sheet.views = [{ state: "frozen", ySplit: 1 }];
    });
    const buffer = await workbook.xlsx.writeBuffer();
    if (!canSave()) return;
    const { saveAs } = await import("file-saver");
    if (canSave())
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        filename + ".xlsx",
      );
    return;
  }
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(18);
  doc.text("KATUÁ — Resumo executivo", 36, 36);
  doc.setFontSize(10);
  doc.text(
    `${data.meta.start} a ${data.meta.end} | ${dateTime(data.meta.generatedAt)}`,
    36,
    55,
  );
  let y = 75;
  sections.forEach((section) => {
    if (y > 480) {
      doc.addPage();
      y = 36;
    }
    doc.setFontSize(12);
    doc.text(section.title, 36, y);
    autoTable(doc, {
      head: [section.head],
      body: section.rows.length
        ? section.rows
        : [["Sem registros nesta seleção"]],
      startY: y + 10,
      margin: { left: 36, right: 36, bottom: 35 },
      styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak" },
      headStyles: { fillColor: [0, 125, 91] },
    });
    y = (doc.lastAutoTable?.finalY || y) + 25;
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(9);
    doc.text(
      `KATUÁ | ${page}/${pages}`,
      36,
      doc.internal.pageSize.getHeight() - 16,
    );
  }
  if (canSave()) doc.save(filename + ".pdf");
}
