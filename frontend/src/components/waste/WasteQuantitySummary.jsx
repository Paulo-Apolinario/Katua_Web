import {
  AlertTriangle,
  CheckCircle2,
  Package,
  Scale,
} from "lucide-react";

import {
  getCollectionEntryUnitShortLabel,
} from "../../services/collectionEntryService";

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

const normalizeNumber = (value) => {
  const normalized = Number(value);

  if (!Number.isFinite(normalized)) {
    return 0;
  }

  return normalized;
};

const formatQuantity = (
  value,
  locale = "pt-BR",
  maximumFractionDigits = 3
) => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(normalizeNumber(value));
};

const getPercentage = (
  value,
  total
) => {
  const normalizedValue =
    normalizeNumber(value);

  const normalizedTotal =
    normalizeNumber(total);

  if (normalizedTotal <= 0) {
    return 0;
  }

  const percentage =
    (normalizedValue / normalizedTotal) *
    100;

  return Math.min(
    Math.max(percentage, 0),
    100
  );
};

/*
 * ============================================================
 * COMPONENTE INTERNO
 * ============================================================
 */

const QuantityItem = ({
  icon,
  label,
  value,
  unit,
  className = "",
}) => {
  const Icon = icon;

  return (
    <div
      className={[
        "d-flex",
        "align-items-start",
        "gap-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="d-flex align-items-center justify-content-center flex-shrink-0"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor:
            "rgba(0, 0, 0, 0.04)",
        }}
      >
        <Icon
          size={17}
          aria-hidden="true"
        />
      </div>

      <div className="min-w-0">
        <div
          className="text-muted"
          style={{
            fontSize: 12,
            lineHeight: 1.2,
          }}
        >
          {label}
        </div>

        <div
          className="fw-semibold"
          style={{
            fontSize: 15,
            lineHeight: 1.35,
          }}
        >
          {formatQuantity(value)}

          {unit && (
            <span className="ms-1">
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/*
 * ============================================================
 * COMPONENTE PRINCIPAL
 * ============================================================
 */

const WasteQuantitySummary = ({
  totalQuantity = 0,
  destinedQuantity = 0,
  remainingQuantity,
  unit,
  showProgress = true,
  compact = false,
  className = "",
}) => {
  const normalizedTotal =
    normalizeNumber(totalQuantity);

  const normalizedDestined =
    normalizeNumber(destinedQuantity);

  const normalizedRemaining =
    remainingQuantity === undefined ||
    remainingQuantity === null
      ? Math.max(
          normalizedTotal -
            normalizedDestined,
          0
        )
      : normalizeNumber(
          remainingQuantity
        );

  const unitLabel =
    getCollectionEntryUnitShortLabel(
      unit
    );

  const destinedPercentage =
    getPercentage(
      normalizedDestined,
      normalizedTotal
    );

  const hasRemaining =
    normalizedRemaining > 0;

  const isFullyDestined =
    normalizedTotal > 0 &&
    normalizedRemaining <= 0;

  const containerClassName = [
    "waste-quantity-summary",
    "border",
    "rounded-3",
    compact ? "p-2" : "p-3",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName}>
      <div
        className={[
          "d-grid",
          "gap-3",
          compact
            ? ""
            : "align-items-start",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          gridTemplateColumns:
            compact
              ? "repeat(3, minmax(0, 1fr))"
              : "repeat(auto-fit, minmax(150px, 1fr))",
        }}
      >
        <QuantityItem
          icon={Scale}
          label="Quantidade coletada"
          value={normalizedTotal}
          unit={unitLabel}
        />

        <QuantityItem
          icon={Package}
          label="Quantidade destinada"
          value={normalizedDestined}
          unit={unitLabel}
        />

        <QuantityItem
          icon={
            isFullyDestined
              ? CheckCircle2
              : AlertTriangle
          }
          label={
            isFullyDestined
              ? "Quantidade finalizada"
              : "Saldo disponível"
          }
          value={normalizedRemaining}
          unit={unitLabel}
        />
      </div>

      {showProgress && (
        <div className="mt-3">
          <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
            <span
              className="text-muted"
              style={{
                fontSize: 12,
              }}
            >
              Progresso da destinação
            </span>

            <span
              className="fw-semibold"
              style={{
                fontSize: 12,
              }}
            >
              {formatQuantity(
                destinedPercentage,
                "pt-BR",
                1
              )}
              %
            </span>
          </div>

          <div
            className="progress"
            role="progressbar"
            aria-label="Progresso da destinação"
            aria-valuenow={
              destinedPercentage
            }
            aria-valuemin="0"
            aria-valuemax="100"
            style={{
              height: 8,
            }}
          >
            <div
              className="progress-bar"
              style={{
                width: `${destinedPercentage}%`,
              }}
            />
          </div>

          <div
            className="mt-2"
            style={{
              fontSize: 12,
            }}
          >
            {isFullyDestined ? (
              <span className="d-inline-flex align-items-center gap-1">
                <CheckCircle2
                  size={14}
                  aria-hidden="true"
                />

                Material totalmente destinado.
              </span>
            ) : hasRemaining ? (
              <span className="d-inline-flex align-items-center gap-1 text-muted">
                <AlertTriangle
                  size={14}
                  aria-hidden="true"
                />

                Ainda existem{" "}
                <strong>
                  {formatQuantity(
                    normalizedRemaining
                  )}{" "}
                  {unitLabel}
                </strong>{" "}
                disponíveis para destinação.
              </span>
            ) : (
              <span className="text-muted">
                Nenhuma quantidade disponível.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WasteQuantitySummary;