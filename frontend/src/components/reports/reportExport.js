import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  REPORTS,
  exportRows,
  filterSummary,
  unitsLabel,
  dateLabel,
  num,
} from "./reportModel";
const safe = (v) =>
  typeof v === "string" && /^[\s\uFEFF]*[=+@-]/u.test(v) ? "'" + v : v;
export function exportReport(format, kind, report, context) {
  const rows = exportRows(kind, report.rows).map((row) =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, safe(v)])),
  );
  if (!rows.length) throw Error("Não há registros no recorte para exportar.");
  const meta = [
    ["Organização", report.meta.cooperative.name],
    ["CNPJ", report.meta.cooperative.registrationNumber || "Não informado"],
    ["Relatório", REPORTS[kind].title],
    ["Gerado em", dateLabel(report.meta.generatedAt)],
    ["Escopo", report.meta.scope],
    ...filterSummary(report.meta.query, context),
    ["Registros exportados", report.meta.total],
    ["Quantidades", unitsLabel(report.summary.units)],
    ["Massa equivalente em kg (somente kg e toneladas)", report.summary.massKg],
    ["Registros sem quantidade", report.summary.missingQuantity || 0],
    ...report.meta.warnings.map((w) => ["Observação", w]),
  ];
  meta.push(
    [
      "Metodologia ambiental",
      report.settings.methodology.label || "Não configurada",
    ],
    [
      "Fonte e versão",
      [report.settings.methodology.source, report.settings.methodology.version]
        .filter(Boolean)
        .join(" | ") || "Não informadas",
    ],
    [
      "Potencial estimado de CO2 (kg)",
      report.environmental.co2Kg ?? "Não configurado",
    ],
    ["Massa coberta pela metodologia (kg)", report.environmental.coveredMassKg],
    ["Natureza do indicador ambiental", report.environmental.description],
  );
  if (kind === "vehicles")
    meta.push([
      "Custo de manutenção registrado",
      report.summary.maintenanceCost,
    ]);
  const filename = `katua-${REPORTS[kind].path}-${report.meta.query.start}-${report.meta.query.end}`;
  if (format === "excel") {
    const wb = XLSX.utils.book_new();
    const summary = XLSX.utils.aoa_to_sheet([
      ["Campo", "Valor"],
      ...meta.map((r) => r.map(safe)),
    ]);
    summary["!cols"] = [{ wch: 40 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(wb, summary, "Resumo");
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!autofilter"] = { ref: sheet["!ref"] };
    sheet["!cols"] = Object.keys(rows[0]).map(() => ({ wch: 24 }));
    XLSX.utils.book_append_sheet(wb, sheet, "Registros");
    const method = report.settings.methodology;
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["Metodologia ambiental", "Valor"],
        ["Nome", safe(method.label)],
        ["Fonte", safe(method.source)],
        ["URL", safe(method.url)],
        ["Versão", safe(method.version)],
        ["Natureza", report.environmental.description],
        ["Massa coberta (kg)", report.environmental.coveredMassKg],
        [
          "Potencial de CO2 estimado (kg)",
          report.environmental.co2Kg ?? "Não configurado",
        ],
        ["Material", "Fator kg CO2/kg de material"],
        ...method.factors.map((f) => [
          safe(
            context.materials.find((m) => m.id === f.materialId)?.name ||
              f.materialId,
          ),
          f.co2PerKg,
        ]),
      ]),
      "Metodologia",
    );
    XLSX.writeFile(wb, filename + ".xlsx");
    return;
  }
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  if (context.cooperative.logo) {
    try {
      const img = doc.getImageProperties(context.cooperative.logo);
      const scale = Math.min(65 / img.width, 42 / img.height);
      doc.addImage(
        context.cooperative.logo,
        img.fileType,
        740,
        20,
        img.width * scale,
        img.height * scale,
        undefined,
        "FAST",
      );
    } catch {
      /* Uma imagem indisponível não impede a emissão do relatório. */
    }
  }
  doc.setFontSize(18);
  doc.text("KATUÁ | " + REPORTS[kind].title, 36, 38);
  doc.setFontSize(11);
  doc.text(
    doc.splitTextToSize(
      report.meta.cooperative.name,
      context.cooperative.logo ? 680 : 760,
    ),
    36,
    60,
  );
  autoTable(doc, {
    startY: 78,
    head: [["Identificação e recorte", "Informação"]],
    body: meta.map((r) => r.map((v) => String(v))),
    styles: { fontSize: 8, overflow: "linebreak" },
    headStyles: { fillColor: [23, 105, 68] },
    columnStyles: { 0: { cellWidth: 230 } },
    margin: { left: 36, right: 36, bottom: 32 },
  });
  const keys = Object.keys(rows[0]);
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 18,
    head: [keys],
    body: rows.map((r) => keys.map((k) => r[k] ?? "")),
    styles: { fontSize: 7, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [23, 105, 68] },
    alternateRowStyles: { fillColor: [245, 250, 247] },
    horizontalPageBreak: true,
    horizontalPageBreakRepeat: 0,
    columnStyles: { 0: { cellWidth: 105 } },
    showHead: "everyPage",
    margin: { left: 36, right: 36, bottom: 32 },
  });
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.text(
      `KATUÁ - ${p} / ${pages} - ${num(report.meta.total)} registros`,
      36,
      doc.internal.pageSize.getHeight() - 15,
    );
  }
  doc.save(filename + ".pdf");
}
