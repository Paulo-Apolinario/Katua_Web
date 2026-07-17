import { apiRequest } from "./apiClient";

/*
 * ============================================================
 * ENDPOINTS
 * ============================================================
 */

const WASTE_DESTINATION_ENDPOINT =
  "/collection-waste-destinations";

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

const normalizeNumber = (value) => {
  const normalized = Number(value);

  if (!Number.isFinite(normalized)) {
    return 0;
  }

  return normalized;
};

const normalizePositiveNumber = (
  value,
  fieldLabel
) => {
  const normalized = normalizeNumber(value);

  if (normalized <= 0) {
    throw new Error(
      `${fieldLabel} deve ser maior que zero.`
    );
  }

  return normalized;
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

const normalizeDate = (value) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return undefined;
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
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
  const normalized = normalizeDate(value);

  if (normalized) {
    params.set(key, normalized);
  }
};

const appendBooleanParam = (
  params,
  key,
  value
) => {
  const normalized =
    normalizeBoolean(value);

  if (
    normalized !== undefined
  ) {
    params.set(
      key,
      String(normalized)
    );
  }
};

/*
 * ============================================================
 * QUERY STRING
 * ============================================================
 */

const buildWasteDestinationQueryString = (
  filters = {}
) => {
  const params = new URLSearchParams();

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

  appendTextParam(
    params,
    "search",
    filters.search
  );

  appendUppercaseParam(
    params,
    "type",
    filters.type
  );

  appendUppercaseParam(
    params,
    "unit",
    filters.unit
  );

  appendUppercaseParam(
    params,
    "status",
    filters.status
  );

  appendTextParam(
    params,
    "collectionWasteEntryId",
    filters.collectionWasteEntryId ||
      filters.entryId
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
    "stockItemId",
    filters.stockItemId
  );

  appendTextParam(
    params,
    "stockLotId",
    filters.stockLotId
  );

  appendTextParam(
    params,
    "destinationName",
    filters.destinationName
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

  appendBooleanParam(
    params,
    "includeCancelled",
    filters.includeCancelled
  );

  const queryString = params.toString();

  return queryString
    ? `?${queryString}`
    : "";
};

/*
 * ============================================================
 * NORMALIZAÇÃO DE PAYLOAD
 * ============================================================
 */

const normalizeMetadata = (metadata) => {
  if (
    metadata === null ||
    metadata === undefined
  ) {
    return undefined;
  }

  if (
    typeof metadata === "object" &&
    !Array.isArray(metadata)
  ) {
    return metadata;
  }

  return undefined;
};

const addOptionalTextField = (
  data,
  key,
  value
) => {
  const normalized = normalizeText(value);

  if (normalized) {
    data[key] = normalized;
  }
};

const normalizeCreatePayload = (
  payload = {}
) => {
  const collectionWasteEntryId =
    normalizeText(
      payload.collectionWasteEntryId ||
        payload.entryId
    );

  if (!collectionWasteEntryId) {
    throw new Error(
      "Entrada de resíduo não informada."
    );
  }

  const type =
    normalizeUppercase(payload.type);

  if (!type) {
    throw new Error(
      "Tipo de destinação não informado."
    );
  }

  const quantity =
    normalizePositiveNumber(
      payload.quantity,
      "A quantidade destinada"
    );

  const unit =
    normalizeUppercase(payload.unit);

  if (!unit) {
    throw new Error(
      "Unidade da destinação não informada."
    );
  }

  const data = {
    collectionWasteEntryId,
    type,
    quantity,
    unit,
  };

  addOptionalTextField(
    data,
    "stockItemId",
    payload.stockItemId
  );

  addOptionalTextField(
    data,
    "destinationName",
    payload.destinationName
  );

  addOptionalTextField(
    data,
    "destinationDocument",
    payload.destinationDocument
  );

  addOptionalTextField(
    data,
    "destinationAddress",
    payload.destinationAddress
  );

  addOptionalTextField(
    data,
    "destinationContact",
    payload.destinationContact
  );

  addOptionalTextField(
    data,
    "transportDocument",
    payload.transportDocument
  );

  addOptionalTextField(
    data,
    "environmentalDocument",
    payload.environmentalDocument
  );

  addOptionalTextField(
    data,
    "notes",
    payload.notes
  );

  const destinationDate =
    normalizeDate(payload.destinationDate);

  if (destinationDate) {
    data.destinationDate =
      destinationDate;
  }

  const metadata =
    normalizeMetadata(payload.metadata);

  if (metadata) {
    data.metadata = metadata;
  }

  return data;
};

const normalizeUpdatePayload = (
  payload = {}
) => {
  const data = {};

  const optionalTextFields = [
    "destinationName",
    "destinationDocument",
    "destinationAddress",
    "destinationContact",
    "transportDocument",
    "environmentalDocument",
    "notes",
  ];

  for (const field of optionalTextFields) {
    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        field
      )
    ) {
      const value = payload[field];

      data[field] =
        value === null
          ? null
          : normalizeText(value) || null;
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "destinationDate"
    )
  ) {
    const destinationDate =
      normalizeDate(
        payload.destinationDate
      );

    data.destinationDate =
      destinationDate || null;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "metadata"
    )
  ) {
    data.metadata =
      payload.metadata === null
        ? null
        : normalizeMetadata(
            payload.metadata
          );
  }

  return data;
};

const normalizeCancelPayload = (
  payload = {}
) => {
  const reason =
    normalizeText(payload.reason);

  if (!reason) {
    throw new Error(
      "Informe o motivo do cancelamento."
    );
  }

  const data = {
    reason,
  };

  const cancelledAt =
    normalizeDate(payload.cancelledAt);

  if (cancelledAt) {
    data.cancelledAt =
      cancelledAt;
  }

  return data;
};

/*
 * ============================================================
 * NORMALIZAÇÃO DAS RESPOSTAS
 * ============================================================
 */

export const extractWasteDestinations = (
  response
) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (
    Array.isArray(
      response?.destinations
    )
  ) {
    return response.destinations;
  }

  if (
    Array.isArray(
      response?.data?.destinations
    )
  ) {
    return response.data.destinations;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

export const extractWasteDestination = (
  response
) => {
  if (!response) {
    return null;
  }

  if (response.destination) {
    return response.destination;
  }

  if (response.data?.destination) {
    return response.data.destination;
  }

  if (
    response.id &&
    (
      response.collectionWasteEntryId ||
      response.entryId
    )
  ) {
    return response;
  }

  return null;
};

export const extractWasteDestinationEntry = (
  response
) => {
  return (
    response?.entry ||
    response?.data?.entry ||
    null
  );
};

export const extractWasteDestinationStockLot = (
  response
) => {
  return (
    response?.stockLot ||
    response?.data?.stockLot ||
    null
  );
};

export const extractWasteDestinationPagination = (
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

export const extractWasteDestinationTotals = (
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
 * PING
 * ============================================================
 */

/**
 * Verifica se o módulo de destinações está disponível.
 *
 * GET /collection-waste-destinations/ping
 */
export const pingWasteDestinations =
  async () => {
    return apiRequest(
      `${WASTE_DESTINATION_ENDPOINT}/ping`,
      {
        method: "GET",
      }
    );
  };

/*
 * ============================================================
 * LISTAGEM GERAL
 * ============================================================
 */

/**
 * Lista destinações de resíduos.
 *
 * GET /collection-waste-destinations
 */
export const getWasteDestinations =
  async (filters = {}) => {
    const queryString =
      buildWasteDestinationQueryString(
        filters
      );

    return apiRequest(
      `${WASTE_DESTINATION_ENDPOINT}${queryString}`,
      {
        method: "GET",
      }
    );
  };

/*
 * ============================================================
 * LISTAGEM POR ENTRADA
 * ============================================================
 */

/**
 * Lista o histórico de destinações de uma entrada.
 *
 * GET /collection-waste-destinations/entry/:entryId
 */
export const getWasteDestinationsByEntry =
  async (
    entryId,
    filters = {}
  ) => {
    const normalizedEntryId =
      normalizeText(entryId);

    if (!normalizedEntryId) {
      throw new Error(
        "ID da entrada de resíduo não informado."
      );
    }

    const queryString =
      buildWasteDestinationQueryString(
        filters
      );

    return apiRequest(
      `${WASTE_DESTINATION_ENDPOINT}/entry/${normalizedEntryId}${queryString}`,
      {
        method: "GET",
      }
    );
  };

/*
 * ============================================================
 * CONSULTA POR ID
 * ============================================================
 */

/**
 * Busca uma destinação pelo ID.
 *
 * GET /collection-waste-destinations/:id
 */
export const getWasteDestinationById =
  async (destinationId) => {
    const normalizedId =
      normalizeText(destinationId);

    if (!normalizedId) {
      throw new Error(
        "ID da destinação não informado."
      );
    }

    return apiRequest(
      `${WASTE_DESTINATION_ENDPOINT}/${normalizedId}`,
      {
        method: "GET",
      }
    );
  };

/*
 * ============================================================
 * CRIAÇÃO
 * ============================================================
 */

/**
 * Registra uma nova destinação.
 *
 * Quando type = STOCK, o backend cria um lote.
 *
 * POST /collection-waste-destinations
 */
export const createWasteDestination =
  async (payload = {}) => {
    const data =
      normalizeCreatePayload(payload);

    return apiRequest(
      WASTE_DESTINATION_ENDPOINT,
      {
        method: "POST",
        body: data,
      }
    );
  };

/*
 * ============================================================
 * ATUALIZAÇÃO
 * ============================================================
 */

/**
 * Atualiza somente dados complementares da destinação.
 *
 * Não altera:
 * - entrada;
 * - tipo;
 * - quantidade;
 * - unidade;
 * - item de estoque;
 * - lote.
 *
 * PATCH /collection-waste-destinations/:id
 */
export const updateWasteDestination =
  async (
    destinationId,
    payload = {}
  ) => {
    const normalizedId =
      normalizeText(destinationId);

    if (!normalizedId) {
      throw new Error(
        "ID da destinação não informado."
      );
    }

    const data =
      normalizeUpdatePayload(payload);

    return apiRequest(
      `${WASTE_DESTINATION_ENDPOINT}/${normalizedId}`,
      {
        method: "PATCH",
        body: data,
      }
    );
  };

/*
 * ============================================================
 * CANCELAMENTO
 * ============================================================
 */

/**
 * Cancela uma destinação.
 *
 * O backend:
 * - devolve a quantidade ao saldo da entrada;
 * - recalcula o status;
 * - cancela o lote quando ele ainda não possuir movimentações.
 *
 * POST /collection-waste-destinations/:id/cancel
 */
export const cancelWasteDestination =
  async (
    destinationId,
    payload = {}
  ) => {
    const normalizedId =
      normalizeText(destinationId);

    if (!normalizedId) {
      throw new Error(
        "ID da destinação não informado."
      );
    }

    const data =
      normalizeCancelPayload(payload);

    return apiRequest(
      `${WASTE_DESTINATION_ENDPOINT}/${normalizedId}/cancel`,
      {
        method: "POST",
        body: data,
      }
    );
  };

/*
 * ============================================================
 * TIPOS DE DESTINAÇÃO
 * ============================================================
 */

export const WASTE_DESTINATION_TYPE_OPTIONS = [
  {
    value: "",
    label: "Todos os tipos",
  },
  {
    value: "STOCK",
    label: "Adicionar ao estoque",
    shortLabel: "Estoque",
  },
  {
    value: "TRIAGE",
    label: "Enviar para triagem",
    shortLabel: "Triagem",
  },
  {
    value: "REJECT",
    label: "Registrar como rejeito",
    shortLabel: "Rejeito",
  },
  {
    value: "DISPOSAL",
    label: "Enviar para descarte",
    shortLabel: "Descarte",
  },
  {
    value: "DIRECT_DESTINATION",
    label: "Destinação direta",
    shortLabel: "Destino direto",
  },
  {
    value: "RESERVATION",
    label: "Reservar material",
    shortLabel: "Reserva",
  },
];

export const getWasteDestinationTypeLabel = (
  type
) => {
  const normalizedType =
    normalizeUppercase(type);

  return (
    WASTE_DESTINATION_TYPE_OPTIONS.find(
      (option) =>
        option.value === normalizedType
    )?.label ||
    type ||
    "Não informado"
  );
};

export const getWasteDestinationTypeShortLabel = (
  type
) => {
  const normalizedType =
    normalizeUppercase(type);

  return (
    WASTE_DESTINATION_TYPE_OPTIONS.find(
      (option) =>
        option.value === normalizedType
    )?.shortLabel ||
    type ||
    "Não informado"
  );
};

/*
 * ============================================================
 * STATUS
 * ============================================================
 */

export const WASTE_DESTINATION_STATUS_OPTIONS = [
  {
    value: "",
    label: "Todos os status",
  },
  {
    value: "ACTIVE",
    label: "Ativa",
  },
  {
    value: "CANCELLED",
    label: "Cancelada",
  },
];

export const getWasteDestinationStatusLabel = (
  status
) => {
  const normalizedStatus =
    normalizeUppercase(status);

  return (
    WASTE_DESTINATION_STATUS_OPTIONS.find(
      (option) =>
        option.value === normalizedStatus
    )?.label ||
    status ||
    "Não informado"
  );
};

/*
 * ============================================================
 * REGRAS DE FORMULÁRIO
 * ============================================================
 */

export const getWasteDestinationRequirements = (
  type
) => {
  const normalizedType =
    normalizeUppercase(type);

  switch (normalizedType) {
    case "STOCK":
      return {
        stockItemId: true,
        destinationName: false,
        notes: false,
      };

    case "TRIAGE":
      return {
        stockItemId: false,
        destinationName: true,
        notes: false,
      };

    case "REJECT":
      return {
        stockItemId: false,
        destinationName: false,
        notes: true,
      };

    case "DISPOSAL":
      return {
        stockItemId: false,
        destinationName: true,
        notes: true,
      };

    case "DIRECT_DESTINATION":
      return {
        stockItemId: false,
        destinationName: true,
        notes: false,
      };

    case "RESERVATION":
      return {
        stockItemId: false,
        destinationName: true,
        notes: false,
      };

    default:
      return {
        stockItemId: false,
        destinationName: false,
        notes: false,
      };
  }
};

/*
 * ============================================================
 * EXPORTAÇÃO PADRÃO
 * ============================================================
 */

export default {
  pingWasteDestinations,
  getWasteDestinations,
  getWasteDestinationsByEntry,
  getWasteDestinationById,
  createWasteDestination,
  updateWasteDestination,
  cancelWasteDestination,

  extractWasteDestinations,
  extractWasteDestination,
  extractWasteDestinationEntry,
  extractWasteDestinationStockLot,
  extractWasteDestinationPagination,
  extractWasteDestinationTotals,

  getWasteDestinationTypeLabel,
  getWasteDestinationTypeShortLabel,
  getWasteDestinationStatusLabel,
  getWasteDestinationRequirements,
};