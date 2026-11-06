import { materialName } from "./materialIdentification";
import { formatUnits, formatQuantity, formatEstimate } from "./impactAnalysis";
export async function exportImpact(kind, data, filters) {
  const issued = new Date().toISOString(),
    version = data.methodology.version || "Não informada";
  const generator =
    data.generators.find((g) => g.id === filters.generatorId)?.name ||
    filters.generatorId ||
    "Todas as origens";
  const material =
    data.catalog?.find((m) => m.id === filters.materialId)?.name ||
    filters.materialId ||
    "Todos";
  const metadata = [
    ["Emissão", issued],
    ["Período", `${data.start} a ${data.end}`],
    ["Gerador", generator],
    ["Item comercial", material],
    [
      "Material padronizado",
      filters.materialCode ? materialName(filters.materialCode) : "Todos",
    ],
    [
      "Conferência de quantidade",
      { ALL: "Todas", CONFIRMED: "Conferidas", PROVISIONAL: "Provisórias" }[
        filters.stage
      ] || filters.stage,
    ],
    ["Base de datas", data.basis],
    ["Metodologia", data.methodology.label || "Não cadastrada"],
    [
      "Base do cálculo",
      data.calculationMode === "REFERENCE"
        ? "Referência internacional automática EPA WARM v16 (EUA), sem calibração local"
        : data.calculationMode || "Metodologia própria",
    ],
    [
      "Massa provisória usada na referência (kg)",
      String(data.referenceProvisionalMassKg || 0),
    ],
    [
      "Energia na base de referência",
      "Energia total convertida em kWh equivalentes, não apenas eletricidade",
    ],
    ["Versão", version],
    ["Revisão da configuração", String(data.methodologyRevision || 0)],
    ["Fonte", data.methodology.source || "Não informada"],
    ["Referência", data.methodology.url || "Não informada"],
    ["Cenário", data.methodology.processScenario || "Não informado"],
    ["Região", data.methodology.region || "Não informada"],
    ["Responsável informado", data.methodology.approvedBy || "Não informado"],
    [
      "Validação declarada",
      data.methodology.approved
        ? "Sim — declarada pela cooperativa"
        : data.calculationMode === "REFERENCE"
          ? "Referência internacional — não validada localmente"
          : "Pendente",
    ],
    [
      "Aplicação",
      `${data.methodology.validFrom || "Não informada"} a ${data.methodology.validUntil || "sem término informado"}`,
    ],
    ["Composição desconhecida", formatUnits(data.unknownUnits)],
    [
      "Identificação pelo catálogo atual",
      formatUnits(data.currentMappingUnits),
    ],
    ["Saídas para destinatários", formatUnits(data.flows?.dispatched)],
    ["Rejeitos / descartes", formatUnits(data.flows?.rejected)],
    ["Estoque atual", formatUnits(data.flows?.currentStock)],
    ["Base do estoque", data.flows?.stockBasis || "Saldo atual"],
    ["Base das destinações", data.flows?.dateBasis || "Data da saída"],
    ["Limitações", data.description],
    [
      "Observação",
      "Resumo dos registros, não certificado de reciclagem ou crédito de carbono. Fatores por kg não abrangem litros, unidades ou m³. Estimativas podem ser revistas após correções.",
    ],
  ];
  const columns = [
    "Item",
    "Material padronizado",
    "Base da identificação",
    "Quantidade",
    "Massa conferida (kg)",
    "CO2e estimado (kg)",
    "Água estimada (L)",
    "Energia estimada (kWh)",
    "Abrangência CO2e (kg)",
  ];
  const rows = data.materials.map((m) => [
    m.name,
    materialName(m.materialCode) +
      (m.factorReference
        ? ` — referência: ${m.factorReference.label} (${m.factorReference.version})`
        : ""),
    {
      CONFIRMED: "Conferida na coleta",
      DECLARED_SNAPSHOT: "Declarada na coleta",
      CURRENT_CATALOG: "Catálogo atual — histórico não confirmado",
    }[m.identificationBasis] || m.identificationBasis,
    formatUnits(m.units),
    formatQuantity(m.confirmedMassKg),
    formatEstimate(m.co2Kg),
    formatEstimate(m.waterLiters),
    formatEstimate(m.energyKwh),
    formatQuantity(m.metricCoverage.co2Kg),
  ]);
  const filename = `impacto-ambiental-${data.start}-${data.end}`;
  if (kind === "xlsx") {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const info = workbook.addWorksheet("Metodologia e filtros");
    metadata.forEach((r) => info.addRow(r));
    info.columns = [{ width: 34 }, { width: 110 }];
    info.getColumn(2).alignment = { wrapText: true, vertical: "top" };
    const factors = workbook.addWorksheet("Base de fatores");
    factors.addRow([
      "Referência",
      "Versão",
      "Material da fonte",
      "CO2 aterro (t/short ton)",
      "CO2 reciclagem (t/short ton)",
      "Energia aterro (MMBtu/short ton)",
      "Energia reciclagem (MMBtu/short ton)",
      "CO2e potencial (kg/kg)",
      "Energia potencial (kWh eq./kg)",
      "Fonte",
    ]);
    (data.referenceFactors || []).forEach((f) =>
      factors.addRow([
        f.label,
        f.version,
        f.sourceMaterial,
        f.original.landfillCo2,
        f.original.recyclingCo2,
        f.original.landfillEnergy,
        f.original.recyclingEnergy,
        f.co2PerKg,
        f.energyPerKg,
        f.url,
      ]),
    );
    factors.columns = Array.from({ length: 10 }, () => ({ width: 30 }));
    factors.getRow(1).font = { bold: true };
    const sheet = workbook.addWorksheet("Por material");
    sheet.addRow(columns);
    rows.forEach((r) => sheet.addRow(r));
    sheet.columns = columns.map((_, i) => ({ width: i === 0 ? 32 : 26 }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    for (const [name, group] of [
      ["Por gerador", data.generators],
      ["Evolução mensal", data.monthly],
    ]) {
      const s = workbook.addWorksheet(name);
      s.addRow([
        "Origem / mês",
        "Quantidade",
        "Massa conferida (kg)",
        "CO2e estimado (kg)",
      ]);
      group.forEach((g) =>
        s.addRow([
          g.name || g.month,
          formatUnits(g.units),
          g.confirmedMassKg,
          g.co2Kg ?? "Sem estimativa",
        ]),
      );
      s.columns = [{ width: 40 }, { width: 35 }, { width: 25 }, { width: 25 }];
      s.getRow(1).font = { bold: true };
    }
    const { saveAs } = await import("file-saver");
    saveAs(
      new Blob([await workbook.xlsx.writeBuffer()], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      filename + ".xlsx",
    );
  } else {
    const { jsPDF } = await import("jspdf"),
      { default: autoTable } = await import("jspdf-autotable");
    const pdf = new jsPDF({ orientation: "landscape" });
    const pdfText = (value) =>
      String(value ?? "")
        .replace(/[−–—]/g, "-")
        .replace(/₂/g, "2")
        .replace(/³/g, "3")
        .replace(/²/g, "2")
        .replace(/…/g, "...");
    pdf.setFontSize(17);
    pdf.text("KATUA - Relatório de impacto ambiental", 14, 18);
    autoTable(pdf, {
      startY: 25,
      head: [["Informação", "Registro"]],
      body: metadata.map((row) => row.map(pdfText)),
      styles: { fontSize: 8, overflow: "linebreak" },
      columnStyles: { 0: { cellWidth: 48 } },
      headStyles: { fillColor: [7, 92, 69] },
    });
    autoTable(pdf, {
      startY: pdf.lastAutoTable.finalY + 10,
      head: [columns.map(pdfText)],
      body: rows.map((row) => row.map(pdfText)),
      styles: { fontSize: 7, overflow: "linebreak" },
      headStyles: { fillColor: [7, 92, 69] },
    });
    pdf.save(filename + ".pdf");
  }
}
