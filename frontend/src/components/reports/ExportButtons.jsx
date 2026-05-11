import { Download, FileSpreadsheet } from "lucide-react";
import { exportToExcel } from "../../utils/exportExcel";
import { exportToPdf } from "../../utils/exportPdf";

const ExportButtons = ({
  rows = [],
  excelFileName = "relatorio-katua",
  excelSheetName = "Relatório",
  pdfFileName = "relatorio-katua",
  pdfTitle = "Relatório KATUÁ",
  pdfSubtitle = "Relatório operacional",
  pdfOrientation = "landscape",
}) => {
  return (
    <>
      <button
        type="button"
        className="btn btn-outline-success d-flex align-items-center gap-8"
        onClick={() =>
          exportToExcel({
            fileName: excelFileName,
            sheetName: excelSheetName,
            rows,
          })
        }
      >
        <FileSpreadsheet size={17} />
        Excel
      </button>

      <button
        type="button"
        className="btn btn-success d-flex align-items-center gap-8"
        onClick={() =>
          exportToPdf({
            fileName: pdfFileName,
            title: pdfTitle,
            subtitle: pdfSubtitle,
            rows,
            orientation: pdfOrientation,
          })
        }
      >
        <Download size={17} />
        PDF
      </button>
    </>
  );
};

export default ExportButtons;