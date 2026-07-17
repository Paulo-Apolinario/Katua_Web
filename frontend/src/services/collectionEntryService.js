import { apiRequest } from "./apiClient";

/*
 * ============================================================
 * ENDPOINTS
 * ============================================================
 */

const COLLECTION_ENTRY_ENDPOINT =
  "/collection-entries";

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

const normalizeText = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
};

const normalizeUppercase = (value) => {
  return normalizeText(value).toUpperCase();
};

const normalizePositiveInteger = (
  value,
  fallback
) => {
  const normalized = Number(value);

  if (
    !Number.isInteger(normalized) ||
    normalized <= 0
  ) {
    return fallback;
  }

  return normalized;
};

const normalizeBoolean = (value) => {
  if (
    value === true ||
    value === "true"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false"
  ) {
    return false;
  }

  return undefined;
};

const appendTextParam = (
  params,
  key,
  value
) => {
  const normalized = normalizeText(value);

  if (normalized) {
    params.set(key, normalized);
  }
};

const appendUppercaseParam = (
  params,
  key,
  value
) => {
  const normalized =
    normalizeUppercase(value);

  if (normalized) {
    params.set(key, normalized);
  }
};

const appendDateParam = (
  params,
  key,
  value
) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return;
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return;
  }

  params.set(key, date.toISOString());
};

/*
 * ============================================================
 * QUERY STRING
 * ============================================================
 */

const buildCollectionEntryQueryString = (
  filters = {},
  options = {}
) => {
  const params = new URLSearchParams();

  const includePagination =
    options.includePagination !== false;

  if (includePagination) {
    params.set(
      "page",
      String(
        normalizePositiveInteger(
          filters.page,
          1
        )
      )
    );

    params.set(
      "limit",
      String(
        normalizePositiveInteger(
          filters.limit,
          20
        )
      )
    );
  }

  appendTextParam(
    params,
    "search",
    filters.search
  );

  appendUppercaseParam(
    params,
    "status",
    filters.status
  );

  appendUppercaseParam(
    params,
    "unit",
    filters.unit
  );

  appendTextParam(
    params,
    "wasteTypeId",
    filters.wasteTypeId
  );

  appendTextParam(
    params,
    "collectionId",
    filters.collectionId
  );

  appendTextParam(
    params,
    "collectionMaterialId",
    filters.collectionMaterialId
  );

  appendTextParam(
    params,
    "generatorId",
    filters.generatorId
  );

  appendTextParam(
    params,
    "collectorId",
    filters.collectorId
  );

  appendTextParam(
    params,
    "driverId",
    filters.driverId
  );

  appendTextParam(
    params,
    "vehicleId",
    filters.vehicleId
  );

  appendTextParam(
    params,
    "routeId",
    filters.routeId
  );

  appendDateParam(
    params,
    "dateFrom",
    filters.dateFrom
  );

  appendDateParam(
    params,
    "dateTo",
    filters.dateTo
  );

  const onlyWithBalance =
    normalizeBoolean(
      filters.onlyWithBalance
    );

  if (
    onlyWithBalance !== undefined
  ) {
    params.set(
      "onlyWithBalance",
      String(onlyWithBalance)
    );
  }

  const queryString = params.toString();

  return queryString
    ? `?${queryString}`
    : "";
};

/*
 * ============================================================
 * NORMALIZAÇÃO DAS RESPOSTAS
 * ============================================================
 */

export const extractCollectionEntries = (
  response
) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.entries)) {
    return response.entries;
  }

  if (
    Array.isArray(response?.data?.entries)
  ) {
    return response.data.entries;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

export const extractCollectionEntry = (
  response
) => {
  if (!response) {
    return null;
  }

  if (response.entry) {
    return response.entry;
  }

  if (response.data?.entry) {
    return response.data.entry;
  }

  if (
    response.id &&
    response.collectionId
  ) {
    return response;
  }

  return null;
};

export const extractCollectionEntrySummary = (
  response
) => {
  if (!response) {
    return null;
  }

  if (response.summary) {
    return response.summary;
  }

  if (response.data?.summary) {
    return response.data.summary;
  }

  return response.data || response;
};

export const extractCollectionEntryPagination = (
  response
) => {
  const pagination =
    response?.pagination ||
    response?.data?.pagination;

  return {
    page: Number(
      pagination?.page || 1
    ),

    limit: Number(
      pagination?.limit || 20
    ),

    total: Number(
      pagination?.total || 0
    ),

    totalPages: Number(
      pagination?.totalPages || 0
    ),

    hasNextPage: Boolean(
      pagination?.hasNextPage
    ),

    hasPreviousPage: Boolean(
      pagination?.hasPreviousPage
    ),
  };
};

export const extractCollectionEntryTotals = (
  response
) => {
  return (
    response?.totalsByUnit ||
    response?.data?.totalsByUnit ||
    {}
  );
};

/*
 * ============================================================
 * ENDPOINT: PING
 * ============================================================
 */

/**
 * Verifica se o módulo de resíduos coletados está
 * disponível no backend.
 *
 * GET /collection-entries/ping
 */
export const pingCollectionEntries =
  async () => {
    return apiRequest(
      `${COLLECTION_ENTRY_ENDPOINT}/ping`,
      {
        method: "GET",
      }
    );
  };

/*
 * ============================================================
 * ENDPOINT: LISTAGEM GERAL
 * ============================================================
 */

/**
 * Lista todos os resíduos coletados acessíveis ao
 * usuário autenticado.
 *
 * GET /collection-entries
 */
export const getCollectionEntries =
  async (filters = {}) => {
    const queryString =
      buildCollectionEntryQueryString(
        filters
      );

    return apiRequest(
      `${COLLECTION_ENTRY_ENDPOINT}${queryString}`,
      {
        method: "GET",
      }
    );
  };

/*
 * ============================================================
 * ENDPOINT: ENTRADAS PENDENTES
 * ============================================================
 */

/**
 * Lista somente as entradas de resíduos que ainda
 * possuem saldo disponível para destinação.
 *
 * GET /collection-entries/pending
 */
export const getPendingCollectionEntries =
  async (filters = {}) => {
    const queryString =
      buildCollectionEntryQueryString(
        {
          ...filters,
          onlyWithBalance: true,
        }
      );

    return apiRequest(
      `${COLLECTION_ENTRY_ENDPOINT}/pending${queryString}`,
      {
        method: "GET",
      }
    );
  };

/*
 * ============================================================
 * ENDPOINT: RESUMO
 * ============================================================
 */

/**
 * Retorna o resumo das entradas coletadas.
 *
 * GET /collection-entries/summary
 */
export const getCollectionEntriesSummary =
  async (filters = {}) => {
    const queryString =
      buildCollectionEntryQueryString(
        filters,
        {
          includePagination: false,
        }
      );

    return apiRequest(
      `${COLLECTION_ENTRY_ENDPOINT}/summary${queryString}`,
      {
        method: "GET",
      }
    );
  };

/*
 * ============================================================
 * ENDPOINT: CONSULTA POR ID
 * ============================================================
 */

/**
 * Busca uma entrada de resíduo coletado pelo ID.
 *
 * GET /collection-entries/:id
 */
export const getCollectionEntryById =
  async (entryId) => {
    const normalizedEntryId =
      normalizeText(entryId);

    if (!normalizedEntryId) {
      throw new Error(
        "ID da entrada de resíduo não informado."
      );
    }

    return apiRequest(
      `${COLLECTION_ENTRY_ENDPOINT}/${normalizedEntryId}`,
      {
        method: "GET",
      }
    );
  };

/*
 * ============================================================
 * STATUS
 * ============================================================
 */

export const COLLECTION_ENTRY_STATUS_OPTIONS = [
  {
    value: "",
    label: "Todos os status",
  },
  {
    value: "PENDING_DESTINATION",
    label: "Pendente de destinação",
  },
  {
    value: "SENT_TO_TRIAGE",
    label: "Enviado para triagem",
  },
  {
    value: "ADDED_TO_STOCK",
    label: "Adicionado ao estoque",
  },
  {
    value: "PARTIALLY_DESTINED",
    label: "Parcialmente destinado",
  },
  {
    value: "FULLY_DESTINED",
    label: "Totalmente destinado",
  },
  {
    value: "REJECTED",
    label: "Rejeitado",
  },
  {
    value: "DISCARDED",
    label: "Descartado",
  },
  {
    value: "DIRECTLY_DESTINED",
    label: "Destinação direta",
  },
  {
    value: "RESERVED",
    label: "Reservado",
  },
  {
    value: "CANCELLED",
    label: "Cancelado",
  },
];

export const getCollectionEntryStatusLabel = (
  status
) => {
  const normalizedStatus =
    normalizeUppercase(status);

  return (
    COLLECTION_ENTRY_STATUS_OPTIONS.find(
      (option) =>
        option.value === normalizedStatus
    )?.label ||
    status ||
    "Não informado"
  );
};

/*
 * ============================================================
 * UNIDADES
 * ============================================================
 */

export const COLLECTION_ENTRY_UNIT_OPTIONS = [
  {
    value: "",
    label: "Todas as unidades",
    shortLabel: "",
  },
  {
    value: "KG",
    label: "Quilograma",
    shortLabel: "kg",
  },
  {
    value: "TON",
    label: "Tonelada",
    shortLabel: "t",
  },
  {
    value: "LITER",
    label: "Litro",
    shortLabel: "L",
  },
  {
    value: "UNIT",
    label: "Unidade",
    shortLabel: "un.",
  },
  {
    value: "CUBIC_METER",
    label: "Metro cúbico",
    shortLabel: "m³",
  },
];

export const getCollectionEntryUnitLabel = (
  unit
) => {
  const normalizedUnit =
    normalizeUppercase(unit);

  return (
    COLLECTION_ENTRY_UNIT_OPTIONS.find(
      (option) =>
        option.value === normalizedUnit
    )?.label ||
    unit ||
    "Não informado"
  );
};

export const getCollectionEntryUnitShortLabel = (
  unit
) => {
  const normalizedUnit =
    normalizeUppercase(unit);

  return (
    COLLECTION_ENTRY_UNIT_OPTIONS.find(
      (option) =>
        option.value === normalizedUnit
    )?.shortLabel ||
    unit ||
    ""
  );
};

/*
 * ============================================================
 * EXPORTAÇÃO PADRÃO
 * ============================================================
 */

export default {
  pingCollectionEntries,
  getCollectionEntries,
  getPendingCollectionEntries,
  getCollectionEntriesSummary,
  getCollectionEntryById,

  extractCollectionEntries,
  extractCollectionEntry,
  extractCollectionEntrySummary,
  extractCollectionEntryPagination,
  extractCollectionEntryTotals,

  getCollectionEntryStatusLabel,
  getCollectionEntryUnitLabel,
  getCollectionEntryUnitShortLabel,
};