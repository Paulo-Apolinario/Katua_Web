const ReportChartCard = ({
  title,
  description,
  icon: Icon,
  children,
  className = "col-xl-6",
  height = 330,
}) => {
  return (
    <div className={className}>
      <div className="card p-25 h-100">
        <div className="d-flex align-items-start justify-content-between gap-15 mb-3">
          <div>
            <h4 className="fw-600 fs-20 mb-1">{title}</h4>

            {description ? (
              <p className="text-muted mb-0">{description}</p>
            ) : null}
          </div>

          {Icon ? <Icon size={22} color="#1A7E00" /> : null}
        </div>

        <div style={{ width: "100%", height }}>{children}</div>
      </div>
    </div>
  );
};

export default ReportChartCard;