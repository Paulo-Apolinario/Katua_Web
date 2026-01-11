import { useState } from 'react';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, FileSpreadsheet, FileText, FileDown } from 'lucide-react';

const DataExporter = ({ data, columns, filename = 'export' }) => {
    const [isExporting, setIsExporting] = useState(false);

    // Helper function to extract text from rendered content
    const extractTextValue = (value, row, col) => {
        if (col.render && typeof col.render === 'function') {
            const rendered = col.render(value, row);
            if (typeof rendered === 'object' && rendered?.props?.children) {
                return String(rendered.props.children);
            }
            return String(rendered);
        }
        return value || '';
    };

    // Export to Excel using ExcelJS
    const exportToExcel = async () => {
        setIsExporting(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sheet1');

            // Define columns
            worksheet.columns = columns.map(col => ({
                header: col.label,
                key: col.key,
                width: 20
            }));

            // Style header row
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1A7E00' }
            };
            worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            // Add data rows
            data.forEach((row) => {
                const rowData = {};
                columns.forEach(col => {
                    rowData[col.key] = extractTextValue(row[col.key], row, col);
                });
                worksheet.addRow(rowData);
            });

            // Apply borders
            worksheet.eachRow((row) => {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });

            // Download
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Failed to export Excel file');
        } finally {
            setIsExporting(false);
        }
    };

    // Export to CSV
    const exportToCSV = () => {
        setIsExporting(true);
        try {
            const headers = columns.map(col => col.label).join(',');
            
            const rows = data.map(row => {
                return columns.map(col => {
                    const value = extractTextValue(row[col.key], row, col);
                    return `"${String(value).replace(/"/g, '""')}"`;
                }).join(',');
            });

            const csvContent = [headers, ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            alert('Failed to export CSV file');
        } finally {
            setIsExporting(false);
        }
    };

    // Export to PDF using jsPDF
    const exportToPDF = () => {
        setIsExporting(true);
        try {
            // Create PDF instance
            const doc = new jsPDF({
                orientation: columns.length > 5 ? 'landscape' : 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Add title
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(filename, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

            // Prepare table headers
            const headers = [columns.map(col => col.label)];

            // Prepare table data
            const tableData = data.map(row => {
                return columns.map(col => {
                    return extractTextValue(row[col.key], row, col);
                });
            });

            // Add table using autoTable
            autoTable(doc, {
                head: headers,
                body: tableData,
                startY: 25,
                theme: 'grid',
                headStyles: {
                    fillColor: [26, 126, 0],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center',
                    fontSize: 10
                },
                bodyStyles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                alternateRowStyles: {
                    fillColor: [243, 244, 246] // Light gray for alternate rows
                },
                margin: { top: 25, left: 10, right: 10 },
                styles: {
                    lineColor: [204, 204, 204],
                    lineWidth: 0.1
                }
            });

            // Download PDF
            doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            alert('Failed to export PDF file');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="btn-group export">
            <button 
                className="btn dropdown-toggle d-flex align-items-center gap-8" 
                data-bs-toggle="dropdown" 
                disabled={isExporting || data.length === 0}
            >
                {isExporting ? 'Exporting...' : 'Export'}
                <Download size={16} />
            </button>
            <ul className="dropdown-menu">
                <li><button className="dropdown-item" onClick={exportToExcel}><FileSpreadsheet size={16} /> Export as Excel</button></li>
                <li><button className="dropdown-item" onClick={exportToCSV}><FileText size={16} /> Export as CSV</button></li>
                <li><button className="dropdown-item" onClick={exportToPDF}><FileDown size={16} /> Export as PDF</button></li>
            </ul>
        </div>
    );
};

export default DataExporter;