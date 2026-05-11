import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";

const sanitizeFileName = (fileName = "relatorio-katua") =>
  String(fileName)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

const formatValue = (value) => {
  if (value === null || value === undefined) return "";

  if (value instanceof Date) {
    return value.toLocaleDateString("pt-BR");
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

const normalizeRows = (rows = []) => {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const normalized = {};

    Object.entries(row || {}).forEach(([key, value]) => {
      normalized[key] = formatValue(value);
    });

    return normalized;
  });
};

export const exportToPdf = ({
  fileName = "relatorio-katua",
  title = "Relatório KATUÁ",
  subtitle = "Relatório operacional",
  rows = [],
  orientation = "landscape",
}) => {
  try {
    const normalizedRows = normalizeRows(rows);

    if (!normalizedRows.length) {
      toast.error("Não há dados para exportar.");
      return;
    }

    const doc = new jsPDF({
      orientation,
      unit: "pt",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const generatedAt = new Date().toLocaleString("pt-BR");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(title, 40, 42);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(subtitle, 40, 62);

    doc.setFontSize(9);
    doc.text(`Gerado em: ${generatedAt}`, pageWidth - 40, 62, {
      align: "right",
    });

    const headers = Object.keys(normalizedRows[0]);

    const body = normalizedRows.map((row) =>
      headers.map((header) => row[header] ?? "")
    );

    autoTable(doc, {
      startY: 86,
      head: [headers],
      body,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 5,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [26, 126, 0],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 250, 245],
      },
      margin: {
        left: 40,
        right: 40,
      },
      didDrawPage: () => {
        const pageCount = doc.internal.getNumberOfPages();
        const pageCurrent = doc.internal.getCurrentPageInfo().pageNumber;
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(
          `KATUÁ • Página ${pageCurrent} de ${pageCount}`,
          pageWidth / 2,
          pageHeight - 20,
          { align: "center" }
        );
      },
    });

    doc.save(`${sanitizeFileName(fileName)}.pdf`);

    toast.success("PDF gerado com sucesso.");
  } catch (error) {
    toast.error("Erro ao gerar PDF.");
    console.error("[exportToPdf]", error);
  }
};

export default exportToPdf;