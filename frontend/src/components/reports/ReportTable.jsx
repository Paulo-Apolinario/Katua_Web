import DataTable from "../DataTable";

const ReportTable = ({
  title,
  description,
  data = [],
  columns = [],
  currentPage,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  actions,
}) => {
  return (
    <div className="card p-25 mb-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-15 mb-3">
        <div>
          <h4 className="fw-600 fs-20 mb-1">{title}</h4>

          {description ? (
            <p className="text-muted mb-0">{description}</p>
          ) : null}
        </div>

        {actions ? (
          <div className="d-flex align-items-center flex-wrap gap-10">
            {actions}
          </div>
        ) : null}
      </div>

      <DataTable
        data={data}
        columns={columns}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </div>
  );
};

export default ReportTable;