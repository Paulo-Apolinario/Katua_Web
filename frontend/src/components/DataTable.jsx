import { useEffect } from "react";
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';

const DataTable = ({
    columns = [],
    data = [],
    currentPage,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    rowsPerPageOptions = [5, 10, 15, 20],
    renderActions,
}) => {
    const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
    const safePage = Math.max(1, Math.min(currentPage || 1, totalPages));
    useEffect(() => { if (currentPage !== safePage) onPageChange(safePage); }, [currentPage, safePage, onPageChange]);
    const indexOfLastRow = safePage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = data.slice(indexOfFirstRow, indexOfLastRow);


    return (
        <>
            <SimpleBar forceVisible="x" autoHide={true}>
                <table className="table align-middle nowrap w-100 mb-4">
                    <thead>
                        <tr>
                            {columns.map(col => (
                                <th key={col.key} scope="col">{col.label}</th>
                            ))}
                            {renderActions && <th>Ações</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {currentRows.length > 0 ? (
                            currentRows.map((row, i) => (
                                <tr key={row.id || i}>
                                    {columns.map(col => (
                                        <td key={col.key}>
                                            {col.render
                                                ? col.render(row[col.key], row)
                                                : row[col.key]}
                                        </td>
                                    ))}
                                    {renderActions && (
                                        <td>{renderActions(row)}</td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length + (renderActions ? 1 : 0)} className="text-center text-muted">
                                    Nenhum registro encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </SimpleBar>
            <div className="row g-4">
                <div className="col-lg-6">
                    <div className="d-flex justify-content-start gap-2 flex-wrap align-items-center">
                        <span className="text-muted">
                            Exibindo {data.length === 0 ? 0 : indexOfFirstRow + 1} - {Math.min(indexOfLastRow, data.length)} de {data.length}
                        </span>
                        <select
                            className="form-select show-perpage"
                            style={{ width: '80px' }}
                            aria-label="Registros por página"
                            value={rowsPerPage}
                            onChange={(e) => {
                                onRowsPerPageChange(Number(e.target.value));
                                onPageChange(1);
                            }}
                        >
                            {rowsPerPageOptions.map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="col-lg-6">
                    <nav className="d-flex justify-content-end">
                        <ul className="pagination mb-0">
                            <li className={`page-item ${safePage <= 1 && 'disabled'}`}>
                                <button className="page-link" disabled={safePage <= 1} onClick={() => onPageChange(Math.max(1, safePage - 1))}>Anterior</button>
                            </li>
                            {Array.from({ length: totalPages }, (_, i) => (
                                <li
                                    key={i}
                                    className={`page-item ${safePage === i + 1 ? 'active' : ''}`}
                                >
                                    <button className="page-link" onClick={() => onPageChange(i + 1)}>{i + 1}</button>
                                </li>
                            ))}
                            <li className={`page-item ${safePage >= totalPages && 'disabled'}`}>
                                <button className="page-link" disabled={safePage >= totalPages} onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}>Próximo</button>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </>
    );
};

export default DataTable;
