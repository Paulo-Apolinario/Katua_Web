import {
  Archive,
  Ban,
  CheckCircle2,
  CircleDot,
  Clock3,
  PackageCheck,
  Recycle,
  ShieldAlert,
  Trash2,
  Warehouse,
} from "lucide-react";

import {
  getCollectionEntryStatusLabel,
} from "../../services/collectionEntryService";

/*
 * ============================================================
 * CONFIGURAÇÃO DOS STATUS
 * ============================================================
 */

const STATUS_CONFIG = {
  PENDING_DESTINATION: {
    className:
      "status status-warning",
    icon: Clock3,
  },

  SENT_TO_TRIAGE: {
    className:
      "status status-info",
    icon: Recycle,
  },

  ADDED_TO_STOCK: {
    className:
      "status status-success",
    icon: Warehouse,
  },

  PARTIALLY_DESTINED: {
    className:
      "status status-warning",
    icon: CircleDot,
  },

  FULLY_DESTINED: {
    className:
      "status status-success",
    icon: CheckCircle2,
  },

  REJECTED: {
    className:
      "status status-danger",
    icon: ShieldAlert,
  },

  DISCARDED: {
    className:
      "status status-danger",
    icon: Trash2,
  },

  DIRECTLY_DESTINED: {
    className:
      "status status-info",
    icon: PackageCheck,
  },

  RESERVED: {
    className:
      "status status-warning",
    icon: Archive,
  },

  CANCELLED: {
    className:
      "status status-danger",
    icon: Ban,
  },
};

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

const normalizeStatus = (status) => {
  return String(status || "")
    .trim()
    .toUpperCase();
};

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

const CollectionEntryStatusBadge = ({
  status,
  showIcon = true,
  showLabel = true,
  className = "",
  iconSize = 14,
  title,
}) => {
  const normalizedStatus =
    normalizeStatus(status);

  const config =
    STATUS_CONFIG[normalizedStatus] || {
      className: "status",
      icon: CircleDot,
    };

  const Icon = config.icon;

  const label =
    getCollectionEntryStatusLabel(
      normalizedStatus
    );

  const composedClassName = [
    config.className,
    "d-inline-flex",
    "align-items-center",
    "gap-1",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={composedClassName}
      title={title || label}
      aria-label={label}
    >
      {showIcon && (
        <Icon
          size={iconSize}
          aria-hidden="true"
        />
      )}

      {showLabel && (
        <span>{label}</span>
      )}
    </span>
  );
};

export default CollectionEntryStatusBadge;