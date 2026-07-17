import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Boxes,
  ChevronRight,
  House,
  MapPin,
  Save,
  Scale,
} from "lucide-react";
import toast from "react-hot-toast";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

import {
  getWasteStockOverview,
  updateWasteStockLot,
  WASTE_LOT_STATUS_OPTIONS,
  WASTE_PROCESSING_STAGE_OPTIONS,
} from "../../services/wasteStockService";

import {
  getWasteUnitShortLabel,
} from "../../services/wasteTypeService";

const initialFormState = {
  lotCode: "",
  quantity: "",
  unit: "",
  storageLocation: "",
  processingStage: "TRIADO",
  origin: "",
  notes: "",
  status: "AVAILABLE",
};

const extractItems = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.stock)) return response.stock;
  if (Array.isArray(response?.data)) return response.data;

  return [];
};

const normalizeQuantity = (value) => {
  const normalized = String(value || "")
    .trim()
    .replace(",", ".");

  const quantity = Number(normalized);

  return Number.isFinite(quantity)
    ? quantity
    : null;
};

const getEffectiveLotQuantity = (lot) => {
  const quantity = Number(lot?.quantity || 0);

  if (quantity > 0) {
    return quantity;
  }

  return Number(lot?.quantityKg || 0);
};

const EditWasteStockLot = () => {
  const { lotId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadLot = async () => {
      try {
        setLoading(true);

        const response = await getWasteStockOverview();
        const items = extractItems(response);

        let foundLot = null;
        let foundItem = null;

        for (const item of items) {
          const lots = Array.isArray(item?.lots)
            ? item.lots
            : [];

          const lot = lots.find(
            (currentLot) => currentLot.id === lotId
          );

          if (lot) {
            foundLot = lot;
            foundItem = item;
            break;
          }
        }

        if (!foundLot || !foundItem) {
          throw new Error("Lote não encontrado.");
        }

        // setSelectedLot(foundLot);
        setSelectedItem(foundItem);

        setFormData({
          lotCode: foundLot.lotCode || "",
          quantity: String(
            getEffectiveLotQuantity(foundLot)
          ),
          unit:
            foundLot.unit ||
            foundItem.unit ||
            "KG",
          storageLocation:
            foundLot.storageLocation || "",
          processingStage:
            foundLot.processingStage || "TRIADO",
          origin: foundLot.origin || "",
          notes: foundLot.notes || "",
          status:
            foundLot.status || "AVAILABLE",
        });
      } catch (error) {
        console.error(
          "Erro ao carregar lote:",
          error
        );

        toast.error(
          error?.error ||
            error?.message ||
            "Erro ao carregar lote."
        );

        navigate("/waste-stock");
      } finally {
        setLoading(false);
      }
    };

    if (!lotId) {
      toast.error("ID do lote não informado.");
      navigate("/waste-stock");
      return;
    }

    loadLot();
  }, [lotId, navigate]);

  const unitLabel = useMemo(() => {
    return getWasteUnitShortLabel(
      formData.unit ||
        selectedItem?.unit ||
        "KG"
    );
  }, [formData.unit, selectedItem]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: "",
    }));
  };

  const validateForm = () => {
    const validationErrors = {};

    if (!formData.lotCode.trim()) {
      validationErrors.lotCode = [
        "Informe o código do lote.",
      ];
    }

    const quantity = normalizeQuantity(
      formData.quantity
    );

    if (
      quantity === null ||
      quantity <= 0
    ) {
      validationErrors.quantity = [
        "Informe uma quantidade maior que zero.",
      ];
    }

    if (!formData.unit) {
      validationErrors.unit = [
        "Informe a unidade de medida.",
      ];
    }

    setErrors(validationErrors);

    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error(
        "Revise os campos obrigatórios antes de salvar."
      );
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      const payload = {
        lotCode: formData.lotCode.trim(),
        quantity: normalizeQuantity(
          formData.quantity
        ),
        unit: formData.unit,
        storageLocation:
          formData.storageLocation.trim() ||
          undefined,
        processingStage:
          formData.processingStage,
        origin:
          formData.origin.trim() ||
          undefined,
        notes:
          formData.notes.trim() ||
          undefined,
        status: formData.status,
      };

      const response =
        await updateWasteStockLot(
          lotId,
          payload
        );

      if (response?.success === false) {
        if (response?.errors) {
          setErrors(response.errors);
        }

        toast.error(
          response?.error ||
            response?.message ||
            "Não foi possível atualizar o lote."
        );

        return;
      }

      toast.success(
        response?.message ||
          "Lote atualizado com sucesso."
      );

      navigate("/waste-stock");
    } catch (error) {
      console.error(
        "Erro ao atualizar lote:",
        error
      );

      if (
        error?.errors &&
        typeof error.errors === "object"
      ) {
        setErrors(error.errors);

        const firstError = Object.values(
          error.errors
        )
          .flat()
          .find(Boolean);

        if (firstError) {
          toast.error(firstError);
          return;
        }
      }

      toast.error(
        error?.error ||
          error?.message ||
          "Erro ao atualizar lote."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeadTags title="Editar Lote de Resíduo | KATUÁ" />

      <TopProgressBar
        loading={loading || submitting}
      />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">
            Editar Lote de Resíduo
          </h3>

          <p className="text-muted mb-0">
            Atualize quantidade, armazenamento, processamento,
            origem e situação operacional do lote.
          </p>
        </div>

        <div className="page-tool d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="breadcrumb-wrap">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb pb-0 mb-0">
                <li className="breadcrumb-item">
                  <Link
                    to="/"
                    className="d-flex align-items-center gap-8"
                  >
                    <House />
                    Painel
                  </Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li className="breadcrumb-item">
                  <Link to="/waste-stock">
                    Estoque de Resíduos
                  </Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li
                  className="breadcrumb-item active"
                  aria-current="page"
                >
                  Editar Lote
                </li>
              </ol>
            </nav>
          </div>

          <Link
            to="/waste-stock"
            className="outline-btn btn-sm"
          >
            <ArrowLeft size={18} />
            Voltar
          </Link>
        </div>
      </div>

      <div className="row justify-content-center mb-5">
        <div className="col-lg-11 col-xl-9">
          <div className="card p-25">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
              <div>
                <h3 className="fw-600 fs-18 mb-1">
                  Informações do lote
                </h3>

                <p className="text-muted mb-0">
                  O lote permanece vinculado ao mesmo tipo de resíduo.
                </p>
              </div>

              <Boxes
                color="#028C56"
                size={30}
              />
            </div>

            {loading ? (
              <div className="py-5 text-center text-muted">
                Carregando lote...
              </div>
            ) : (
              <form
                className="form"
                onSubmit={handleSubmit}
              >
                {selectedItem && (
                  <div
                    className="rounded-3 p-3 mb-4"
                    style={{
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <div className="row g-3">
                      <div className="col-md-4">
                        <small className="text-muted d-block">
                          Tipo de resíduo
                        </small>

                        <strong>
                          {selectedItem.name ||
                            "Não informado"}
                        </strong>
                      </div>

                      <div className="col-md-4">
                        <small className="text-muted d-block">
                          Categoria
                        </small>

                        <strong>
                          {selectedItem.category ||
                            "Não informado"}
                        </strong>
                      </div>

                      <div className="col-md-4">
                        <small className="text-muted d-block">
                          Unidade padrão
                        </small>

                        <strong>
                          {getWasteUnitShortLabel(
                            selectedItem.unit ||
                              formData.unit
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                <div className="row g-4">
                  <div className="col-md-6">
                    <label
                      htmlFor="lotCode"
                      className="form-label"
                    >
                      Código do lote{" "}
                      <span className="text-danger">*</span>
                    </label>

                    <input
                      id="lotCode"
                      name="lotCode"
                      type="text"
                      className="form-control"
                      value={formData.lotCode}
                      onChange={handleInputChange}
                      placeholder="Ex.: PAPELAO-20260716-001"
                      maxLength={100}
                      disabled={submitting}
                    />

                    {errors.lotCode && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.lotCode[0]}
                      </p>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label
                      htmlFor="quantity"
                      className="form-label"
                    >
                      Quantidade{" "}
                      <span className="text-danger">*</span>
                    </label>

                    <div className="input-group">
                      <input
                        id="quantity"
                        name="quantity"
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        placeholder="Ex.: 250"
                        disabled={submitting}
                      />

                      <span className="input-group-text">
                        {unitLabel}
                      </span>
                    </div>

                    {errors.quantity && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.quantity[0]}
                      </p>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label
                      htmlFor="unit"
                      className="form-label"
                    >
                      Unidade de medida
                    </label>

                    <div className="left-inner-addon">
                      <span className="icon">
                        <Scale size={18} />
                      </span>

                      <input
                        id="unit"
                        name="unit"
                        type="text"
                        className="form-control"
                        value={unitLabel}
                        disabled
                      />
                    </div>

                    <small className="text-muted d-block mt-1">
                      A unidade é definida pelo tipo de resíduo.
                    </small>

                    {errors.unit && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.unit[0]}
                      </p>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label
                      htmlFor="storageLocation"
                      className="form-label"
                    >
                      Local de armazenamento
                    </label>

                    <div className="left-inner-addon">
                      <span className="icon">
                        <MapPin size={18} />
                      </span>

                      <input
                        id="storageLocation"
                        name="storageLocation"
                        type="text"
                        className="form-control"
                        value={formData.storageLocation}
                        onChange={handleInputChange}
                        placeholder="Ex.: Galpão A, Baia 02"
                        maxLength={255}
                        disabled={submitting}
                      />
                    </div>

                    {errors.storageLocation && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.storageLocation[0]}
                      </p>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label
                      htmlFor="processingStage"
                      className="form-label"
                    >
                      Etapa de processamento
                    </label>

                    <select
                      id="processingStage"
                      name="processingStage"
                      className="form-select"
                      value={formData.processingStage}
                      onChange={handleInputChange}
                      disabled={submitting}
                    >
                      {WASTE_PROCESSING_STAGE_OPTIONS.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>

                    {errors.processingStage && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.processingStage[0]}
                      </p>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label
                      htmlFor="status"
                      className="form-label"
                    >
                      Status do lote
                    </label>

                    <select
                      id="status"
                      name="status"
                      className="form-select"
                      value={formData.status}
                      onChange={handleInputChange}
                      disabled={submitting}
                    >
                      {WASTE_LOT_STATUS_OPTIONS.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>

                    {errors.status && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.status[0]}
                      </p>
                    )}
                  </div>

                  <div className="col-md-12">
                    <label
                      htmlFor="origin"
                      className="form-label"
                    >
                      Origem do lote
                    </label>

                    <input
                      id="origin"
                      name="origin"
                      type="text"
                      className="form-control"
                      value={formData.origin}
                      onChange={handleInputChange}
                      placeholder="Ex.: Rota Centro, Gerador XPTO ou PEV 01"
                      maxLength={255}
                      disabled={submitting}
                    />

                    {errors.origin && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.origin[0]}
                      </p>
                    )}
                  </div>

                  <div className="col-12">
                    <label
                      htmlFor="notes"
                      className="form-label"
                    >
                      Observações
                    </label>

                    <textarea
                      id="notes"
                      name="notes"
                      className="form-control"
                      rows="4"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Informe condições do lote, características do material ou cuidados de armazenamento."
                      maxLength={1500}
                      disabled={submitting}
                    />

                    {errors.notes && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.notes[0]}
                      </p>
                    )}
                  </div>
                </div>

                <div className="d-flex gap-20 mt-4 flex-wrap">
                  <Link
                    to="/waste-stock"
                    className="btn-md outline-btn"
                  >
                    <ArrowLeft size={18} />
                    Cancelar
                  </Link>

                  <button
                    type="submit"
                    className="btn-md primary-btn border-0"
                    disabled={submitting}
                  >
                    <Save size={18} />

                    {submitting
                      ? "Salvando..."
                      : "Salvar Alterações"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EditWasteStockLot;