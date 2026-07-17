import {
  AlertCircle,
  Boxes,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  FileText,
  Loader2,
  MapPin,
  PackagePlus,
  RefreshCcw,
  Scale,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createWasteDestination,
  getWasteDestinationTypeLabel,
} from "../../services/collectionWasteDestinationService";

import {
  getCollectionEntryUnitShortLabel,
} from "../../services/collectionEntryService";

/*
 * ============================================================
 * CONFIGURAÇÕES
 * ============================================================
 */

const DESTINATION_TYPE_OPTIONS = [
  {
    value: "STOCK",
    label: "Adicionar ao estoque",
    description:
      "O material será destinado ao estoque e poderá gerar ou alimentar um lote.",
  },
  {
    value: "TRIAGE",
    label: "Enviar para triagem",
    description:
      "O material será encaminhado para processo de separação, classificação ou preparação.",
  },
  {
    value: "REJECT",
    label: "Registrar como rejeito",
    description:
      "O material será classificado como rejeito sem possibilidade de aproveitamento.",
  },
  {
    value: "DISPOSAL",
    label: "Enviar para descarte",
    description:
      "O material será destinado para descarte ambientalmente adequado.",
  },
  {
    value: "DIRECT_DESTINATION",
    label: "Destinação direta",
    description:
      "O material será encaminhado diretamente a uma empresa, unidade ou receptor.",
  },
  {
    value: "RESERVATION",
    label: "Reservar material",
    description:
      "O material ficará reservado para uma operação ou destinação futura.",
  },
];

const INITIAL_FORM = {
  type: "",
  quantity: "",
  destinationDate: "",
  stockItemId: "",
  destinationName: "",
  destinationDocument: "",
  destinationAddress: "",
    transportDocument: "",
  environmentalDocument: "",
  notes: "",
};

/*
 * ============================================================
 * HELPERS GERAIS
 * ============================================================
 */

const normalizeNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const normalizedValue =
    typeof value === "string"
      ? value.replace(",", ".")
      : value;

  const number = Number(
    normalizedValue
  );

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
};

const normalizeText = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
};

const formatNumber = (
  value,
  maximumFractionDigits = 3
) => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(normalizeNumber(value));
};

const getTodayInputValue = () => {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getErrorMessage = (
  error,
  fallbackMessage
) => {
  return (
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.message ||
    fallbackMessage
  );
};

/*
 * ============================================================
 * HELPERS DA ENTRADA
 * ============================================================
 */

const getEntryId = (entry) => {
  return (
    entry?.id ||
    entry?.collectionWasteEntryId ||
    ""
  );
};

const getWasteName = (entry) => {
  return (
    entry?.materialNameSnapshot ||
    entry?.wasteType?.name ||
    entry?.collectionMaterial?.nameSnapshot ||
    entry?.materialName ||
    entry?.wasteName ||
    "Resíduo não identificado"
  );
};

const getWasteCode = (entry) => {
  return (
    entry?.wasteType?.internalCode ||
    entry?.wasteType?.code ||
    entry?.wasteStockItem
      ?.internalCode ||
    entry?.wasteStockItem?.code ||
    entry?.stockItem?.internalCode ||
    entry?.stockItem?.code ||
    entry?.collectionMaterial?.wasteType
      ?.internalCode ||
    entry?.collectionMaterial?.wasteType
      ?.code ||
    entry?.materialCode ||
    ""
  );
};

const getEntryUnit = (entry) => {
  return (
    entry?.unit ||
    entry?.collectionMaterial?.unit ||
    entry?.wasteType?.unit ||
    "KG"
  );
};

const getTotalQuantity = (entry) => {
  return normalizeNumber(
    entry?.quantity ??
      entry?.totalQuantity ??
      entry?.collectedQuantity ??
      entry?.originalQuantity ??
      entry?.collectionMaterial
        ?.quantity ??
      entry?.collectionMaterial
        ?.quantityKg ??
      0
  );
};

const getDestinedQuantity = (
  entry
) => {
  return normalizeNumber(
    entry?.destinedQuantity ??
      entry?.allocatedQuantity ??
      entry?.processedQuantity ??
      entry?.totalDestinedQuantity ??
      0
  );
};

const getRemainingQuantity = (
  entry
) => {
  const explicitValue =
    entry?.remainingQuantity ??
    entry?.availableQuantity ??
    entry?.balanceQuantity;

  if (
    explicitValue !== undefined &&
    explicitValue !== null
  ) {
    return Math.max(
      normalizeNumber(explicitValue),
      0
    );
  }

  return Math.max(
    getTotalQuantity(entry) -
      getDestinedQuantity(entry),
    0
  );
};

/*
 * ============================================================
 * HELPERS DO CATÁLOGO
 * ============================================================
 */

const getStockItemId = (item) => {
  return (
    item?.id ||
    item?.wasteStockItemId ||
    item?.wasteTypeId ||
    ""
  );
};

const getStockItemName = (item) => {
  return (
    item?.name ||
    item?.wasteType?.name ||
    item?.title ||
    "Item não identificado"
  );
};

const getStockItemCode = (item) => {
  return (
    item?.internalCode ||
    item?.code ||
    item?.wasteType?.internalCode ||
    item?.wasteType?.code ||
    ""
  );
};

const getStockItemCategory = (
  item
) => {
  return (
    item?.category?.name ||
    item?.category ||
    item?.wasteType?.category?.name ||
    item?.wasteType?.category ||
    ""
  );
};

const isStockItemActive = (item) => {
  return (
    item?.isActive !== false &&
    normalizeText(
      item?.status || "ACTIVE"
    ).toUpperCase() === "ACTIVE"
  );
};

/*
 * ============================================================
 * VALIDAÇÃO
 * ============================================================
 */

const validateForm = ({
  form,
  entry,
}) => {
  const errors = {};

  const remainingQuantity =
    getRemainingQuantity(entry);

  const quantity = normalizeNumber(
    form.quantity
  );

  if (!form.type) {
    errors.type =
      "Selecione o tipo de destinação.";
  }

  if (!form.quantity) {
    errors.quantity =
      "Informe a quantidade que será destinada.";
  } else if (quantity <= 0) {
    errors.quantity =
      "A quantidade deve ser maior que zero.";
  } else if (
    quantity > remainingQuantity
  ) {
    errors.quantity = `A quantidade não pode ultrapassar o saldo disponível de ${formatNumber(
      remainingQuantity
    )} ${getCollectionEntryUnitShortLabel(
      getEntryUnit(entry)
    )}.`;
  }

  if (!form.destinationDate) {
    errors.destinationDate =
      "Informe a data da destinação.";
  }

  if (
    form.type === "STOCK" &&
    !form.stockItemId
  ) {
    errors.stockItemId =
      "Selecione o item do catálogo que receberá o material.";
  }

  if (
    [
      "TRIAGE",
      "DISPOSAL",
      "DIRECT_DESTINATION",
    ].includes(form.type) &&
    !normalizeText(
      form.destinationName
    )
  ) {
    errors.destinationName =
      "Informe o nome da empresa, unidade ou destino.";
  }

  return errors;
};

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

const WasteDestinationModal = ({
  open = false,
  entry = null,
  stockItems = [],
  loadingStockItems = false,
  stockItemsError = "",
  onReloadStockItems,
  onClose,
  onSuccess,
}) => {
  const [form, setForm] =
    useState(INITIAL_FORM);

  const [errors, setErrors] =
    useState({});

  const [requestError, setRequestError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const entryId = useMemo(
    () => getEntryId(entry),
    [entry]
  );

  const unit = useMemo(
    () => getEntryUnit(entry),
    [entry]
  );

  const totalQuantity = useMemo(
    () => getTotalQuantity(entry),
    [entry]
  );

  const destinedQuantity = useMemo(
    () =>
      getDestinedQuantity(entry),
    [entry]
  );

  const remainingQuantity = useMemo(
    () =>
      getRemainingQuantity(entry),
    [entry]
  );

  const selectedType = useMemo(
    () =>
      DESTINATION_TYPE_OPTIONS.find(
        (option) =>
          option.value === form.type
      ) || null,
    [form.type]
  );

  const availableStockItems =
    useMemo(() => {
      return stockItems
        .filter(
          (item) =>
            isStockItemActive(item)
        )
        .sort((first, second) =>
          getStockItemName(
            first
          ).localeCompare(
            getStockItemName(second),
            "pt-BR"
          )
        );
    }, [stockItems]);

  /*
   * ==========================================================
   * ABERTURA E FECHAMENTO
   * ==========================================================
   */

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      ...INITIAL_FORM,
      destinationDate:
        getTodayInputValue(),
    });

    setErrors({});
    setRequestError("");
    setSubmitting(false);
  }, [open, entryId]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleEscape = (event) => {
      if (
        event.key === "Escape" &&
        !submitting
      ) {
        onClose?.();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [
    open,
    submitting,
    onClose,
  ]);

  /*
   * ==========================================================
   * EVENTOS DO FORMULÁRIO
   * ==========================================================
   */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const nextErrors = {
        ...current,
      };

      delete nextErrors[name];

      return nextErrors;
    });

    setRequestError("");
  };

  const handleTypeChange = (
    event
  ) => {
    const type = event.target.value;

    setForm((current) => ({
      ...current,
      type,

      stockItemId:
        type === "STOCK"
          ? current.stockItemId
          : "",

      destinationName:
        type === "RESERVATION"
          ? ""
          : current.destinationName,

      destinationDocument:
        type === "RESERVATION"
          ? ""
          : current.destinationDocument,

      destinationAddress:
        type === "RESERVATION"
          ? ""
          : current.destinationAddress,

      transportDocument:
        [
          "TRIAGE",
          "DISPOSAL",
          "DIRECT_DESTINATION",
        ].includes(type)
          ? current.transportDocument
          : "",

      environmentalDocument:
        [
          "TRIAGE",
          "DISPOSAL",
          "DIRECT_DESTINATION",
        ].includes(type)
          ? current.environmentalDocument
          : "",
    }));

    setErrors({});
    setRequestError("");
  };

  const handleUseAllBalance = () => {
    setForm((current) => ({
      ...current,
      quantity:
        remainingQuantity > 0
          ? String(
              remainingQuantity
            )
          : "",
    }));

    setErrors((current) => {
      if (!current.quantity) {
        return current;
      }

      const nextErrors = {
        ...current,
      };

      delete nextErrors.quantity;

      return nextErrors;
    });
  };

  /*
   * ==========================================================
   * CONSTRUÇÃO DO PAYLOAD
   * ==========================================================
   */

  const buildPayload = () => {
    const payload = {
      collectionWasteEntryId:
        entryId,

      type: form.type,

      quantity: normalizeNumber(
        form.quantity
      ),

      unit,

      destinationDate:
        form.destinationDate,
    };

    const stockItemId =
      normalizeText(
        form.stockItemId
      );

    const destinationName =
      normalizeText(
        form.destinationName
      );

    const destinationDocument =
      normalizeText(
        form.destinationDocument
      );

    const destinationAddress =
      normalizeText(
        form.destinationAddress
      );

    const transportDocument =
      normalizeText(
        form.transportDocument
      );

    const environmentalDocument =
      normalizeText(
        form.environmentalDocument
      );

    const notes = normalizeText(
      form.notes
    );

    if (stockItemId) {
      payload.stockItemId =
        stockItemId;
    }

    if (destinationName) {
      payload.destinationName =
        destinationName;
    }

    if (destinationDocument) {
      payload.destinationDocument =
        destinationDocument;
    }

    if (destinationAddress) {
      payload.destinationAddress =
        destinationAddress;
    }

    if (transportDocument) {
      payload.transportDocument =
        transportDocument;
    }

    if (environmentalDocument) {
      payload.environmentalDocument =
        environmentalDocument;
    }

    if (notes) {
      payload.notes = notes;
    }

    return payload;
  };

  /*
   * ==========================================================
   * ENVIO
   * ==========================================================
   */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setRequestError("");

    const validationErrors =
      validateForm({
        form,
        entry,
      });

    setErrors(validationErrors);

    if (
      Object.keys(validationErrors)
        .length > 0
    ) {
      return;
    }

    if (!entryId) {
      setRequestError(
        "A entrada de resíduo não foi identificada."
      );

      return;
    }

    try {
      setSubmitting(true);

      const payload =
        buildPayload();

      const response =
        await createWasteDestination(
          payload
        );

      await onSuccess?.(
        response
      );

      onClose?.();
    } catch (error) {
      setRequestError(
        getErrorMessage(
          error,
          "Não foi possível registrar a destinação."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ==========================================================
   * NÃO RENDERIZAR QUANDO FECHADO
   * ==========================================================
   */

  if (!open) {
    return null;
  }

  /*
   * ==========================================================
   * REGRAS DE EXIBIÇÃO
   * ==========================================================
   */

  const showStockFields =
    form.type === "STOCK";

  const showExternalDestinationFields =
    [
      "TRIAGE",
      "DISPOSAL",
      "DIRECT_DESTINATION",
    ].includes(form.type);

  const showOptionalDestinationFields =
    [
      "REJECT",
      "TRIAGE",
      "DISPOSAL",
      "DIRECT_DESTINATION",
    ].includes(form.type);

  const showDocuments =
    [
      "TRIAGE",
      "DISPOSAL",
      "DIRECT_DESTINATION",
    ].includes(form.type);

  /*
   * ==========================================================
   * JSX
   * ==========================================================
   */

  return (
    <>
      <div
        className="modal fade show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="waste-destination-modal-title"
        tabIndex="-1"
      >
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-3 bg-light flex-shrink-0"
                  style={{
                    width: 44,
                    height: 44,
                  }}
                >
                  <PackagePlus
                    size={22}
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h5
                    id="waste-destination-modal-title"
                    className="modal-title"
                  >
                    Registrar destinação
                  </h5>

                  <span className="text-muted small">
                    Defina o encaminhamento do
                    resíduo coletado.
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-link text-secondary p-1"
                aria-label="Fechar janela"
                disabled={submitting}
                onClick={() =>
                  onClose?.()
                }
              >
                <X
                  size={23}
                  aria-hidden="true"
                />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {requestError && (
                  <div
                    className="alert alert-danger d-flex align-items-start gap-2"
                    role="alert"
                  >
                    <AlertCircle
                      size={20}
                      className="flex-shrink-0 mt-1"
                      aria-hidden="true"
                    />

                    <div>
                      {requestError}
                    </div>
                  </div>
                )}

                <div className="card bg-light border-0 mb-4">
                  <div className="card-body">
                    <div className="row g-3 align-items-center">
                      <div className="col-lg-5">
                        <div className="d-flex align-items-start gap-3">
                          <div
                            className="d-flex align-items-center justify-content-center rounded-3 bg-white flex-shrink-0"
                            style={{
                              width: 44,
                              height: 44,
                            }}
                          >
                            <Scale
                              size={22}
                              aria-hidden="true"
                            />
                          </div>

                          <div>
                            <span className="text-muted small d-block">
                              Resíduo selecionado
                            </span>

                            <strong className="d-block">
                              {getWasteName(entry)}
                            </strong>

                            {getWasteCode(
                              entry
                            ) && (
                              <span className="text-muted small">
                                Código:{" "}
                                {getWasteCode(
                                  entry
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="col-sm-4 col-lg-2">
                        <span className="text-muted small d-block">
                          Coletado
                        </span>

                        <strong>
                          {formatNumber(
                            totalQuantity
                          )}{" "}
                          {getCollectionEntryUnitShortLabel(
                            unit
                          )}
                        </strong>
                      </div>

                      <div className="col-sm-4 col-lg-2">
                        <span className="text-muted small d-block">
                          Já destinado
                        </span>

                        <strong>
                          {formatNumber(
                            destinedQuantity
                          )}{" "}
                          {getCollectionEntryUnitShortLabel(
                            unit
                          )}
                        </strong>
                      </div>

                      <div className="col-sm-4 col-lg-3">
                        <span className="text-muted small d-block">
                          Saldo disponível
                        </span>

                        <strong className="fs-5">
                          {formatNumber(
                            remainingQuantity
                          )}{" "}
                          {getCollectionEntryUnitShortLabel(
                            unit
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {remainingQuantity <= 0 && (
                  <div
                    className="alert alert-warning d-flex align-items-start gap-2"
                    role="alert"
                  >
                    <AlertCircle
                      size={20}
                      className="flex-shrink-0 mt-1"
                      aria-hidden="true"
                    />

                    <div>
                      Esta entrada não possui
                      saldo disponível para uma
                      nova destinação.
                    </div>
                  </div>
                )}

                <div className="row g-4">
                  <div className="col-12">
                    <label className="form-label fw-semibold">
                      Tipo de destinação
                    </label>

                    <div className="row g-3">
                      {DESTINATION_TYPE_OPTIONS.map(
                        (option) => {
                          const selected =
                            form.type ===
                            option.value;

                          return (
                            <div
                              className="col-md-6 col-xl-4"
                              key={
                                option.value
                              }
                            >
                              <label
                                className={[
                                  "border rounded-3 p-3 h-100 d-block",
                                  "position-relative",
                                  selected
                                    ? "border-primary bg-primary-subtle"
                                    : "bg-white",
                                ].join(" ")}
                                style={{
                                  cursor:
                                    submitting
                                      ? "not-allowed"
                                      : "pointer",
                                }}
                              >
                                <input
                                  type="radio"
                                  name="type"
                                  value={
                                    option.value
                                  }
                                  className="form-check-input me-2"
                                  checked={
                                    selected
                                  }
                                  disabled={
                                    submitting
                                  }
                                  onChange={
                                    handleTypeChange
                                  }
                                />

                                <span className="fw-semibold">
                                  {
                                    option.label
                                  }
                                </span>

                                <span className="text-muted small d-block mt-2">
                                  {
                                    option.description
                                  }
                                </span>
                              </label>
                            </div>
                          );
                        }
                      )}
                    </div>

                    {errors.type && (
                      <div className="text-danger small mt-2">
                        {errors.type}
                      </div>
                    )}
                  </div>

                  {selectedType && (
                    <div className="col-12">
                      <div className="alert alert-info mb-0">
                        <strong>
                          {getWasteDestinationTypeLabel(
                            selectedType.value
                          )}
                          :
                        </strong>{" "}
                        {
                          selectedType.description
                        }
                      </div>
                    </div>
                  )}

                  <div className="col-md-6">
                    <label
                      htmlFor="destination-quantity"
                      className="form-label"
                    >
                      Quantidade destinada
                    </label>

                    <div className="input-group">
                      <span className="input-group-text">
                        <Scale
                          size={17}
                          aria-hidden="true"
                        />
                      </span>

                      <input
                        id="destination-quantity"
                        name="quantity"
                        type="number"
                        min="0"
                        max={
                          remainingQuantity
                        }
                        step="0.001"
                        inputMode="decimal"
                        className={`form-control ${
                          errors.quantity
                            ? "is-invalid"
                            : ""
                        }`}
                        placeholder="0,000"
                        value={form.quantity}
                        disabled={
                          submitting ||
                          remainingQuantity <= 0
                        }
                        onChange={
                          handleChange
                        }
                      />

                      <span className="input-group-text">
                        {getCollectionEntryUnitShortLabel(
                          unit
                        )}
                      </span>

                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        disabled={
                          submitting ||
                          remainingQuantity <= 0
                        }
                        onClick={
                          handleUseAllBalance
                        }
                      >
                        Usar saldo
                      </button>
                    </div>

                    {errors.quantity ? (
                      <div className="text-danger small mt-1">
                        {errors.quantity}
                      </div>
                    ) : (
                      <div className="form-text">
                        Máximo disponível:{" "}
                        {formatNumber(
                          remainingQuantity
                        )}{" "}
                        {getCollectionEntryUnitShortLabel(
                          unit
                        )}
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label
                      htmlFor="destination-date"
                      className="form-label"
                    >
                      Data da destinação
                    </label>

                    <div className="input-group">
                      <span className="input-group-text">
                        <CalendarDays
                          size={17}
                          aria-hidden="true"
                        />
                      </span>

                      <input
                        id="destination-date"
                        name="destinationDate"
                        type="date"
                        className={`form-control ${
                          errors.destinationDate
                            ? "is-invalid"
                            : ""
                        }`}
                        value={
                          form.destinationDate
                        }
                        disabled={
                          submitting
                        }
                        onChange={
                          handleChange
                        }
                      />
                    </div>

                    {errors.destinationDate && (
                      <div className="text-danger small mt-1">
                        {
                          errors.destinationDate
                        }
                      </div>
                    )}
                  </div>

                  {showStockFields && (
                    <>
                      <div className="col-12">
                        <label
                          htmlFor="stock-item"
                          className="form-label"
                        >
                          Item do catálogo
                        </label>

                        <div className="input-group">
                          <span className="input-group-text">
                            <Boxes
                              size={17}
                              aria-hidden="true"
                            />
                          </span>

                          <select
                            id="stock-item"
                            name="stockItemId"
                            className={`form-select ${
                              errors.stockItemId
                                ? "is-invalid"
                                : ""
                            }`}
                            value={
                              form.stockItemId
                            }
                            disabled={
                              submitting ||
                              loadingStockItems
                            }
                            onChange={
                              handleChange
                            }
                          >
                            <option value="">
                              {loadingStockItems
                                ? "Carregando catálogo..."
                                : "Selecione o item do catálogo"}
                            </option>

                            {availableStockItems.map(
                              (item) => {
                                const itemId =
                                  getStockItemId(
                                    item
                                  );

                                const code =
                                  getStockItemCode(
                                    item
                                  );

                                const category =
                                  getStockItemCategory(
                                    item
                                  );

                                const details = [
                                  code,
                                  category,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(" • ");

                                return (
                                  <option
                                    key={
                                      itemId
                                    }
                                    value={
                                      itemId
                                    }
                                  >
                                    {getStockItemName(
                                      item
                                    )}
                                    {details
                                      ? ` — ${details}`
                                      : ""}
                                  </option>
                                );
                              }
                            )}
                          </select>
                        </div>

                        {errors.stockItemId && (
                          <div className="text-danger small mt-1">
                            {
                              errors.stockItemId
                            }
                          </div>
                        )}

                        {stockItemsError && (
                          <div className="mt-2">
                            <div className="text-danger small mb-2">
                              {
                                stockItemsError
                              }
                            </div>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2"
                              disabled={
                                loadingStockItems ||
                                submitting
                              }
                              onClick={() =>
                                onReloadStockItems?.()
                              }
                            >
                              {loadingStockItems ? (
                                <Loader2
                                  size={15}
                                  className="spinner-border spinner-border-sm"
                                  aria-hidden="true"
                                />
                              ) : (
                                <RefreshCcw
                                  size={15}
                                  aria-hidden="true"
                                />
                              )}

                              Tentar carregar novamente
                            </button>
                          </div>
                        )}

                        {!loadingStockItems &&
                          !stockItemsError &&
                          availableStockItems.length ===
                            0 && (
                            <div className="form-text text-warning">
                              Nenhum tipo de
                              resíduo ativo foi
                              encontrado no
                              catálogo.
                            </div>
                          )}
                      </div>
                    </>
                  )}

                  {(showExternalDestinationFields ||
                    showOptionalDestinationFields) && (
                    <>
                      <div className="col-md-6">
                        <label
                          htmlFor="destination-name"
                          className="form-label"
                        >
                          Nome do destino
                          {showExternalDestinationFields &&
                            " *"}
                        </label>

                        <div className="input-group">
                          <span className="input-group-text">
                            <Building2
                              size={17}
                              aria-hidden="true"
                            />
                          </span>

                          <input
                            id="destination-name"
                            name="destinationName"
                            type="text"
                            className={`form-control ${
                              errors.destinationName
                                ? "is-invalid"
                                : ""
                            }`}
                            placeholder="Empresa, unidade, aterro ou receptor"
                            value={
                              form.destinationName
                            }
                            disabled={
                              submitting
                            }
                            onChange={
                              handleChange
                            }
                          />
                        </div>

                        {errors.destinationName && (
                          <div className="text-danger small mt-1">
                            {
                              errors.destinationName
                            }
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label
                          htmlFor="destination-document"
                          className="form-label"
                        >
                          Documento do destino
                        </label>

                        <div className="input-group">
                          <span className="input-group-text">
                            <FileCheck2
                              size={17}
                              aria-hidden="true"
                            />
                          </span>

                          <input
                            id="destination-document"
                            name="destinationDocument"
                            type="text"
                            className="form-control"
                            placeholder="CNPJ, CPF ou identificação"
                            value={
                              form.destinationDocument
                            }
                            disabled={
                              submitting
                            }
                            onChange={
                              handleChange
                            }
                          />
                        </div>
                      </div>

                      <div className="col-12">
                        <label
                          htmlFor="destination-address"
                          className="form-label"
                        >
                          Endereço do destino
                        </label>

                        <div className="input-group">
                          <span className="input-group-text">
                            <MapPin
                              size={17}
                              aria-hidden="true"
                            />
                          </span>

                          <input
                            id="destination-address"
                            name="destinationAddress"
                            type="text"
                            className="form-control"
                            placeholder="Endereço completo da unidade de destino"
                            value={
                              form.destinationAddress
                            }
                            disabled={
                              submitting
                            }
                            onChange={
                              handleChange
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {showDocuments && (
                    <>
                      <div className="col-md-6">
                        <label
                          htmlFor="transport-document"
                          className="form-label"
                        >
                          Documento de transporte
                        </label>

                        <div className="input-group">
                          <span className="input-group-text">
                            <FileText
                              size={17}
                              aria-hidden="true"
                            />
                          </span>

                          <input
                            id="transport-document"
                            name="transportDocument"
                            type="text"
                            className="form-control"
                            placeholder="MTR, manifesto ou documento equivalente"
                            value={
                              form.transportDocument
                            }
                            disabled={
                              submitting
                            }
                            onChange={
                              handleChange
                            }
                          />
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label
                          htmlFor="environmental-document"
                          className="form-label"
                        >
                          Documento ambiental
                        </label>

                        <div className="input-group">
                          <span className="input-group-text">
                            <FileCheck2
                              size={17}
                              aria-hidden="true"
                            />
                          </span>

                          <input
                            id="environmental-document"
                            name="environmentalDocument"
                            type="text"
                            className="form-control"
                            placeholder="Certificado, licença ou comprovante"
                            value={
                              form.environmentalDocument
                            }
                            disabled={
                              submitting
                            }
                            onChange={
                              handleChange
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="col-12">
                    <label
                      htmlFor="destination-notes"
                      className="form-label"
                    >
                      Observações
                    </label>

                    <textarea
                      id="destination-notes"
                      name="notes"
                      className="form-control"
                      rows="4"
                      maxLength="2000"
                      placeholder="Inclua informações adicionais sobre a movimentação"
                      value={form.notes}
                      disabled={submitting}
                      onChange={
                        handleChange
                      }
                    />

                    <div className="form-text text-end">
                      {form.notes.length}/2000
                    </div>
                  </div>
                </div>

                {form.type &&
                  form.quantity &&
                  normalizeNumber(
                    form.quantity
                  ) > 0 &&
                  normalizeNumber(
                    form.quantity
                  ) <=
                    remainingQuantity && (
                    <div className="card border-success mt-4">
                      <div className="card-body">
                        <div className="d-flex align-items-start gap-3">
                          <CheckCircle2
                            size={22}
                            className="flex-shrink-0 mt-1"
                            aria-hidden="true"
                          />

                          <div>
                            <h6 className="mb-1">
                              Resumo da movimentação
                            </h6>

                            <p className="mb-1">
                              Serão destinados{" "}
                              <strong>
                                {formatNumber(
                                  form.quantity
                                )}{" "}
                                {getCollectionEntryUnitShortLabel(
                                  unit
                                )}
                              </strong>{" "}
                              como{" "}
                              <strong>
                                {getWasteDestinationTypeLabel(
                                  form.type
                                )}
                              </strong>
                              .
                            </p>

                            <span className="text-muted small">
                              O saldo após o
                              registro será de{" "}
                              {formatNumber(
                                Math.max(
                                  remainingQuantity -
                                    normalizeNumber(
                                      form.quantity
                                    ),
                                  0
                                )
                              )}{" "}
                              {getCollectionEntryUnitShortLabel(
                                unit
                              )}
                              .
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={submitting}
                  onClick={() =>
                    onClose?.()
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn btn-primary d-inline-flex align-items-center gap-2"
                  disabled={
                    submitting ||
                    remainingQuantity <= 0 ||
                    loadingStockItems ||
                    (form.type ===
                      "STOCK" &&
                      Boolean(
                        stockItemsError
                      ))
                  }
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={17}
                        className="spinner-border spinner-border-sm"
                        aria-hidden="true"
                      />

                      Registrando...
                    </>
                  ) : (
                    <>
                      {form.type ===
                      "DISPOSAL" ? (
                        <Trash2
                          size={17}
                          aria-hidden="true"
                        />
                      ) : (
                        <PackagePlus
                          size={17}
                          aria-hidden="true"
                        />
                      )}

                      Registrar destinação
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div
        className="modal-backdrop fade show"
        onClick={() => {
          if (!submitting) {
            onClose?.();
          }
        }}
      />
    </>
  );
};

export default WasteDestinationModal;