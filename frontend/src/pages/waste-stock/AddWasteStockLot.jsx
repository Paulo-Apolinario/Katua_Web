import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft,
  Boxes,
  ChevronRight,
  House,
  MapPin,
  PackagePlus,
  Save,
  Scale,
} from "lucide-react";
import toast from "react-hot-toast";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

import {
  getAllWasteTypes,
  getWasteUnitShortLabel,
} from "../../services/wasteTypeService";

import {
  createWasteStockLot,
  WASTE_LOT_STATUS_OPTIONS,
  WASTE_PROCESSING_STAGE_OPTIONS,
} from "../../services/wasteStockService";

const initialFormState = {
  itemId: "",
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

const generateLotCode = (item) => {
  if (!item) return "";

  const baseCode =
    item.internalCode ||
    item.name
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8)
      .toUpperCase() ||
    "LOTE";

  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `${baseCode}-${year}${month}${day}-${hour}${minute}`;
};

const AddWasteStockLot = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const preselectedItemId = searchParams.get("itemId") || "";

  const [formData, setFormData] = useState({
    ...initialFormState,
    itemId: preselectedItemId,
  });

  const [wasteTypes, setWasteTypes] = useState([]);
  const [errors, setErrors] = useState({});
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadWasteTypes = async () => {
      try {
        setLoadingTypes(true);

        const response = await getAllWasteTypes({
          status: "ACTIVE",
        });

        const items = extractItems(response).filter(
          (item) => item.status === "ACTIVE"
        );

        setWasteTypes(items);

        if (preselectedItemId) {
          const selectedItem = items.find(
            (item) => item.id === preselectedItemId
          );

          if (selectedItem) {
            setFormData((current) => ({
              ...current,
              itemId: selectedItem.id,
              unit: selectedItem.unit || "KG",
              lotCode:
                current.lotCode ||
                generateLotCode(selectedItem),
            }));
          }
        }
      } catch (error) {
        console.error(
          "Erro ao carregar tipos de resíduos:",
          error
        );

        toast.error(
          error?.error ||
            error?.message ||
            "Não foi possível carregar os tipos de resíduos."
        );
      } finally {
        setLoadingTypes(false);
      }
    };

    loadWasteTypes();
  }, [preselectedItemId]);

  const selectedItem = useMemo(() => {
    return wasteTypes.find(
      (item) => item.id === formData.itemId
    );
  }, [wasteTypes, formData.itemId]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    if (name === "itemId") {
      const item = wasteTypes.find(
        (currentItem) => currentItem.id === value
      );

      setFormData((current) => ({
        ...current,
        itemId: value,
        unit: item?.unit || "",
        lotCode: item
          ? generateLotCode(item)
          : "",
      }));

      setErrors((current) => ({
        ...current,
        itemId: "",
        unit: "",
        lotCode: "",
      }));

      return;
    }

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

    if (!formData.itemId) {
      validationErrors.itemId = [
        "Selecione o tipo de resíduo.",
      ];
    }

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
        await createWasteStockLot(
          formData.itemId,
          payload
        );

      if (response?.success === false) {
        if (response?.errors) {
          setErrors(response.errors);
        }

        toast.error(
          response?.error ||
            response?.message ||
            "Não foi possível cadastrar o lote."
        );

        return;
      }

      toast.success(
        response?.message ||
          "Cadastro efetuado com sucesso."
      );

      navigate("/waste-stock");
    } catch (error) {
      console.error(
        "Erro ao cadastrar lote:",
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
          "Erro ao cadastrar lote."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeadTags title="Adicionar Lote de Resíduo | KATUÁ" />

      <TopProgressBar
        loading={loadingTypes || submitting}
      />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">
            Adicionar Lote ao Estoque
          </h3>

          <p className="text-muted mb-0">
            Selecione um tipo de resíduo já cadastrado e registre
            quantidade, unidade, armazenamento, origem e situação do lote.
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
                  Novo Lote
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
                  O lote será vinculado ao tipo de resíduo e à cooperativa
                  autenticada.
                </p>
              </div>

              <PackagePlus
                color="#028C56"
                size={30}
              />
            </div>

            {!loadingTypes &&
              wasteTypes.length === 0 && (
                <div className="alert alert-warning">
                  Nenhum tipo de resíduo ativo foi encontrado.

                  <div className="mt-3">
                    <Link
                      to="/create-type"
                      className="primary-btn btn-sm"
                    >
                      Cadastrar Tipo de Resíduo
                    </Link>
                  </div>
                </div>
              )}

            <form
              className="form"
              onSubmit={handleSubmit}
            >
              <div className="row g-4">
                <div className="col-md-8">
                  <label
                    htmlFor="itemId"
                    className="form-label"
                  >
                    Tipo de resíduo{" "}
                    <span className="text-danger">*</span>
                  </label>

                  <select
                    id="itemId"
                    name="itemId"
                    className="form-select"
                    value={formData.itemId}
                    onChange={handleInputChange}
                    disabled={
                      loadingTypes ||
                      submitting ||
                      wasteTypes.length === 0
                    }
                  >
                    <option value="">
                      Selecione o tipo de resíduo
                    </option>

                    {wasteTypes.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                        {item.category
                          ? ` — ${item.category}`
                          : ""}
                      </option>
                    ))}
                  </select>

                  {errors.itemId && (
                    <p className="text-danger mt-1 mb-0">
                      {errors.itemId[0]}
                    </p>
                  )}
                </div>

                <div className="col-md-4">
                  <label
                    htmlFor="unit"
                    className="form-label"
                  >
                    Unidade
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
                      value={
                        formData.unit
                          ? getWasteUnitShortLabel(
                              formData.unit
                            )
                          : ""
                      }
                      placeholder="Selecione o material"
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

                {selectedItem && (
                  <div className="col-12">
                    <div
                      className="rounded-3 p-3"
                      style={{
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      <div className="row g-3">
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
                            Subcategoria
                          </small>

                          <strong>
                            {selectedItem.subcategory ||
                              "Não informado"}
                          </strong>
                        </div>

                        <div className="col-md-4">
                          <small className="text-muted d-block">
                            Código interno
                          </small>

                          <strong>
                            {selectedItem.internalCode ||
                              "Não informado"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                    placeholder="Ex.: OLEO-20260716-001"
                    maxLength={100}
                    disabled={submitting}
                  />

                  <small className="text-muted d-block mt-1">
                    O sistema sugere um código, mas ele pode ser alterado.
                  </small>

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
                      placeholder="Ex.: 500"
                      disabled={submitting}
                    />

                    <span className="input-group-text">
                      {formData.unit
                        ? getWasteUnitShortLabel(
                            formData.unit
                          )
                        : "-"}
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
                      placeholder="Ex.: Galpão A, Baia 03"
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
                    placeholder="Informe características do lote, cuidados de armazenamento, condição do material ou outras observações."
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
                  disabled={
                    submitting ||
                    loadingTypes ||
                    wasteTypes.length === 0
                  }
                >
                  <Save size={18} />

                  {submitting
                    ? "Salvando..."
                    : "Salvar Lote"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddWasteStockLot;