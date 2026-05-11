import { Link } from "react-router";
import { ChevronRight, House, RefreshCcw } from "lucide-react";

const ReportHeader = ({
  title,
  breadcrumbLabel,
  description,
  loading = false,
  onRefresh,
}) => {
  return (
    <div className="page-header mb-30 px-2">
      <div className="page-title mb-3">
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-15">
          <div>
            <h3 className="fs-30 mb-1">{title}</h3>

            {description ? (
              <p className="text-muted mb-0">{description}</p>
            ) : null}
          </div>

          {onRefresh ? (
            <button
              type="button"
              className="btn btn-success d-flex align-items-center gap-8"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCcw size={17} />
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
          ) : null}
        </div>

        <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center mt-3">
          <div className="breadcrumb-wrap">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb pb-0 mb-0">
                <li className="breadcrumb-item">
                  <Link to="/" className="d-flex align-items-center gap-8">
                    <House size={18} />
                    Dashboard
                  </Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight size={18} />
                </li>

                <li className="breadcrumb-item active">
                  {breadcrumbLabel || title}
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportHeader;