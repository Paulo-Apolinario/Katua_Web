import * as XLSX from "xlsx";
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

  return value;
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

export const exportToExcel = ({
  fileName = "relatorio-katua",
  sheetName = "Relatório",
  rows = [],
}) => {
  try {
    const normalizedRows = normalizeRows(rows);

    if (!normalizedRows.length) {
      toast.error("Não há dados para exportar.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(normalizedRows);
    const workbook = XLSX.utils.book_new();

    const columnWidths = Object.keys(normalizedRows[0]).map((key) => ({
      wch: Math.max(key.length + 4, 18),
    }));

    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      String(sheetName).slice(0, 31)
    );

    XLSX.writeFile(workbook, `${sanitizeFileName(fileName)}.xlsx`);

    toast.success("Planilha Excel gerada com sucesso.");
  } catch (error) {
    toast.error("Erro ao gerar Excel.");
    console.error("[exportToExcel]", error);
  }
};

export default exportToExcel;