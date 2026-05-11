const ReportKpiCards = ({ cards = [] }) => {
  if (!cards.length) return null;

  return (
    <div className="widget mb-4">
      <div className="row g-4">
        {cards.map((card, index) => {
          const Icon = card.icon;

          return (
            <div
              className={card.className || "col-md-6 col-xl-3"}
              key={card.key || card.title || index}
            >
              <div className="card p-25 h-100">
                <div className="d-flex align-items-center gap-15">
                  {Icon ? (
                    <div className="icon">
                      <Icon color={card.iconColor || "#1A7E00"} size={card.iconSize || 30} />
                    </div>
                  ) : null}

                  <div className="content">
                    <p className="title text-muted mb-1">{card.title}</p>
                    <h3>{card.value}</h3>

                    {card.description ? (
                      <small className="text-muted">{card.description}</small>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportKpiCards;