import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  ChevronRight,
  House,
  PackageCheck,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

import {
  getWasteTypeById,
  updateWasteType,
  WASTE_CLASS_OPTIONS,
  WASTE_STATUS_OPTIONS,
  WASTE_UNIT_OPTIONS,
} from "../../services/wasteTypeService";

const initialFormState = {
  name: "",
  category: "",
  subcategory: "",
  unit: "KG",
  ncm: "",
  internalCode: "",
  wasteClass: "NOT_INFORMED",
  description: "",
  status: "ACTIVE",
};

const normalizeNcm = (value) => {
  return String(value || "").replace(/\D/g, "");
};

const extractItem = (response) => {
  return (
    response?.item ||
    response?.data ||
    response?.stock ||
    response ||
    null
  );
};

const EditWasteType = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadWasteType = async () => {
      try {
        setLoading(true);

        const response = await getWasteTypeById(id);
        const item = extractItem(response);

        if (!item?.id) {
          throw new Error("Tipo de resíduo não encontrado.");
        }

        setFormData({
          name: item.name || "",
          category: item.category || "",
          subcategory: item.subcategory || "",
          unit: item.unit || "KG",
          ncm: item.ncm || "",
          internalCode: item.internalCode || "",
          wasteClass: item.wasteClass || "NOT_INFORMED",
          description: item.description || "",
          status: item.status || "ACTIVE",
        });
      } catch (error) {
        console.error(
          "Erro ao carregar tipo de resíduo:",
          error
        );

        toast.error(
          error?.error ||
            error?.message ||
            "Erro ao carregar tipo de resíduo."
        );

        navigate("/waste-type-list");
      } finally {
        setLoading(false);
      }
    };

    if (!id) {
      toast.error("ID do tipo de resíduo não informado.");
      navigate("/waste-type-list");
      return;
    }

    loadWasteType();
  }, [id, navigate]);

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

    if (!formData.name.trim()) {
      validationErrors.name = [
        "Informe o nome do tipo de resíduo.",
      ];
    } else if (formData.name.trim().length < 2) {
      validationErrors.name = [
        "O nome deve possuir pelo menos 2 caracteres.",
      ];
    }

    if (!formData.category.trim()) {
      validationErrors.category = [
        "Informe a categoria do resíduo.",
      ];
    } else if (formData.category.trim().length < 2) {
      validationErrors.category = [
        "A categoria deve possuir pelo menos 2 caracteres.",
      ];
    }

    const normalizedNcm = normalizeNcm(formData.ncm);

    if (normalizedNcm && normalizedNcm.length > 8) {
      validationErrors.ncm = [
        "O NCM deve possuir no máximo 8 dígitos.",
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
        name: formData.name.trim(),
        category: formData.category.trim(),
        subcategory:
          formData.subcategory.trim() || undefined,
        unit: formData.unit,
        ncm: normalizeNcm(formData.ncm) || undefined,
        internalCode:
          formData.internalCode.trim().toUpperCase() ||
          undefined,
        wasteClass: formData.wasteClass,
        description:
          formData.description.trim() || undefined,
        status: formData.status,
      };

      const response = await updateWasteType(id, payload);

      if (response?.success === false) {
        if (response?.errors) {
          setErrors(response.errors);
        }

        toast.error(
          response?.error ||
            response?.message ||
            "Não foi possível atualizar o tipo de resíduo."
        );

        return;
      }

      toast.success(
        response?.message ||
          "Tipo de resíduo atualizado com sucesso."
      );

      navigate("/waste-type-list");
    } catch (error) {
      console.error(
        "Erro ao atualizar tipo de resíduo:",
        error
      );

      if (
        error?.errors &&
        typeof error.errors === "object"
      ) {
        setErrors(error.errors);

        const firstError = Object.values(error.errors)
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
          "Erro ao atualizar tipo de resíduo."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeadTags title="Editar Tipo de Resíduo | KATUÁ" />

      <TopProgressBar loading={loading || submitting} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">
            Editar Tipo de Resíduo
          </h3>

          <p className="text-muted mb-0">
            Atualize as informações do material utilizado nas coletas,
            pesagens, estoque, relatórios e Analytics.
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
                  <Link to="/waste-type-list">
                    Gestão de Resíduos
                  </Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li
                  className="breadcrumb-item active"
                  aria-current="page"
                >
                  Editar Tipo
                </li>
              </ol>
            </nav>
          </div>

          <Link
            to="/waste-type-list"
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
                  Informações do tipo de resíduo
                </h3>

                <p className="text-muted mb-0">
                  A edição não remove nem altera os lotes históricos
                  vinculados ao material.
                </p>
              </div>

              <PackageCheck color="#028C56" />
            </div>

            {loading ? (
              <div className="py-5 text-center text-muted">
                Carregando tipo de resíduo...
              </div>
            ) : (
              <form className="form" onSubmit={handleSubmit}>
                <div className="row g-4">
                  <div className="col-md-8">
                    <label
                      htmlFor="name"
                      className="form-label"
                    >
                      Nome do resíduo{" "}
                      <span className="text-danger">*</span>
                    </label>

                    <input
                      id="name"
                      name="name"
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Ex.: Óleo de cozinha usado"
                      maxLength={150}
                      disabled={submitting}
                    />

                    {errors.name && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.name[0]}
                      </p>
                    )}
                  </div>

                  <div className="col-md-4">
                    <label
                      htmlFor="internalCode"
                      className="form-label"
                    >
                      Código interno
                    </label>

                    <input
                      id="internalCode"
                      name="internalCode"
                      type="text"
                      className="form-control"
                      value={formData.internalCode}
                      onChange={handleInputChange}
                      placeholder="Ex.: OLEO-COZ"
                      maxLength={50}
                      disabled={submitting}
                    />

                    {errors.internalCode && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.internalCode[0]}
                      </p>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label
                      htmlFor="category"
                      className="form-label"
                    >
                      Categoria{" "}
                      <span className="text-danger">*</span>
                    </label>

                    <input
                      id="category"
                      name="category"
                      type="text"
                      className="form-control"
                      value={formData.category}
                      onChange={handleInputChange}
                      placeholder="Ex.: Óleos e gorduras"
                      maxLength={100}
                      disabled={submitting}
                    />

                    {errors.category && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.category[0]}
                      </p>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label
                      htmlFor="subcategory"
                      className="form-label"
                    >
                      Subcategoria
                    </label>

                    <input
                      id="subcategory"
                      name="subcategory"
                      type="text"
                      className="form-control"
                      value={formData.subcategory}
                      onChange={handleInputChange}
                      placeholder="Ex.: Óleo vegetal usado"
                      maxLength={100}
                      disabled={submitting}
                    />

                    {errors.subcategory && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.subcategory[0]}
                      </p>
                    )}
                  </div>

                  <div className="col-md-4">
                    <label
                      htmlFor="unit"
                      className="form-label"
                    >
                      Unidade de medida
                    </label>

                    <select
                      id="unit"
                      name="unit"
                      className="form-select"
                      value={formData.unit}
                      onChange={handleInputChange}
                      disabled={submitting}
                    >
                      {WASTE_UNIT_OPTIONS.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>

                    {errors.unit && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.unit[0]}
                      </p>
                    )}
                  </div>

                  <div className="col-md-4">
                    <label
                      htmlFor="ncm"
                      className="form-label"
                    >
                      NCM
                    </label>

                    <input
                      id="ncm"
                      name="ncm"
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      value={formData.ncm}
                      onChange={handleInputChange}
                      placeholder="Ex.: 15180090"
                      maxLength={10}
                      disabled={submitting}
                    />

                    <small className="text-muted d-block mt-1">
                      Informe somente os números.
                    </small>

                    {errors.ncm && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.ncm[0]}
                      </p>
                    )}
                  </div>

                  <div className="col-md-4">
                    <label
                      htmlFor="wasteClass"
                      className="form-label"
                    >
                      Classe do resíduo
                    </label>

                    <select
                      id="wasteClass"
                      name="wasteClass"
                      className="form-select"
                      value={formData.wasteClass}
                      onChange={handleInputChange}
                      disabled={submitting}
                    >
                      {WASTE_CLASS_OPTIONS.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>

                    {errors.wasteClass && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.wasteClass[0]}
                      </p>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label
                      htmlFor="status"
                      className="form-label"
                    >
                      Status
                    </label>

                    <select
                      id="status"
                      name="status"
                      className="form-select"
                      value={formData.status}
                      onChange={handleInputChange}
                      disabled={submitting}
                    >
                      {WASTE_STATUS_OPTIONS.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>

                    {errors.status && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.status[0]}
                      </p>
                    )}
                  </div>

                  <div className="col-md-12">
                    <label
                      htmlFor="description"
                      className="form-label"
                    >
                      Descrição
                    </label>

                    <textarea
                      id="description"
                      name="description"
                      className="form-control"
                      rows="4"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Descreva o material, a forma de coleta, armazenamento ou outras informações importantes."
                      maxLength={1500}
                      disabled={submitting}
                    />

                    {errors.description && (
                      <p className="text-danger mt-1 mb-0">
                        {errors.description[0]}
                      </p>
                    )}
                  </div>
                </div>

                <div className="d-flex gap-20 mt-4 flex-wrap">
                  <Link
                    to="/waste-type-list"
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

export default EditWasteType;