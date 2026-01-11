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
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = data.slice(indexOfFirstRow, indexOfLastRow);
    const totalPages = Math.ceil(data.length / rowsPerPage);

    return (
        <>
            <SimpleBar forceVisible="x" autoHide={true}>
                <table className="table align-middle nowrap w-100 mb-4">
                    <thead>
                        <tr>
                            {columns.map(col => (
                                <th key={col.key}>{col.label}</th>
                            ))}
                            {renderActions && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {currentRows.length > 0 ? (
                            currentRows.map((row, i) => (
                                <tr key={i}>
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
                                    No data found.
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
                            Showing {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, data.length)} of {data.length}
                        </span>
                        <select
                            className="form-select show-perpage"
                            style={{ width: '80px' }}
                            value={rowsPerPage}
                            onChange={(e) => {
                                onRowsPerPageChange(Number(e.target.value));
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
                            <li className={`page-item ${currentPage === 1 && 'disabled'}`}>
                                <button className="page-link" onClick={() => onPageChange(currentPage - 1)}>Previous</button>
                            </li>
                            {Array.from({ length: totalPages }, (_, i) => (
                                <li
                                    key={i}
                                    className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}
                                >
                                    <button className="page-link" onClick={() => onPageChange(i + 1)}>{i + 1}</button>
                                </li>
                            ))}
                            <li className={`page-item ${currentPage === totalPages && 'disabled'}`}>
                                <button className="page-link" onClick={() => onPageChange(currentPage + 1)}>Next</button>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </>
    );
};

export default DataTable;
