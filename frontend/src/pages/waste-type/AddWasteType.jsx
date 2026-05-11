import { useState } from "react";
import { Link } from "react-router";
import {
  House,
  ChevronRight,
  PackagePlus,
  Save,
  ArrowLeft,
} from "lucide-react";
import { createWasteType } from "../../services/wasteTypeService";
import { toast } from "react-hot-toast";
import HeadTags from "../../components/HeadTags";

const initialFormState = {
  name: "",
  category: "",
  description: "",
  lotCode: "",
  quantityKg: "",
  storageLocation: "",
  processingStage: "TRIADO",
  origin: "",
  notes: "",
  itemStatus: "ACTIVE",
  lotStatus: "AVAILABLE",
};

const AddWasteType = () => {
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = ["Informe o nome do material."];
    }

    if (!formData.category.trim()) {
      nextErrors.category = ["Informe a categoria."];
    }

    if (!formData.lotCode.trim()) {
      nextErrors.lotCode = ["Informe o código do lote."];
    }

    if (!formData.quantityKg || Number(formData.quantityKg) <= 0) {
      nextErrors.quantityKg = ["Informe uma quantidade válida em KG."];
    }

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Revise os campos obrigatórios.");
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      const payload = {
        item: {
          name: formData.name,
          category: formData.category,
          description: formData.description,
          status: formData.itemStatus,
        },
        lot: {
          lotCode: formData.lotCode,
          quantityKg: Number(formData.quantityKg),
          storageLocation: formData.storageLocation,
          processingStage: formData.processingStage,
          origin: formData.origin,
          notes: formData.notes,
          status: formData.lotStatus,
        },
      };

      const response = await createWasteType(payload);

      if (response?.success === false) {
        toast.error(response.message || "Não foi possível cadastrar o estoque.");
        setErrors(response.errors || {});
        return;
      }

      toast.success("Material e lote cadastrados no estoque com sucesso.");
      setFormData(initialFormState);
    } catch (err) {
      if (err?.errors) setErrors(err.errors);
      toast.error(err?.message || "Erro ao cadastrar estoque.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeadTags title="Cadastrar Estoque de Resíduo" />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Cadastrar Estoque de Resíduo</h3>
          <p className="text-muted mb-0">
            Registre materiais reciclados, lotes, quantidade disponível e local
            de armazenamento.
          </p>
        </div>

        <div className="page-tool d-flex justify-content-between align-items-center">
          <div className="breadcrumb-wrap">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb pb-0 mb-0">
                <li className="breadcrumb-item">
                  <Link to="/" className="d-flex align-items-center gap-8">
                    <House /> Painel
                  </Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li className="breadcrumb-item">
                  <Link to="/waste-type-list">Estoque de Resíduos</Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li className="breadcrumb-item active">Novo Lote</li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <div className="row justify-content-center mb-5">
        <div className="col-lg-11 col-xl-9">
          <div className="card p-25">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
              <div>
                <h3 className="fw-600 fs-18 mb-1">
                  Informações do material e lote
                </h3>
                <p className="text-muted mb-0">
                  Exemplo: vidro triturado, papelão prensado, plástico separado,
                  alumínio enfardado.
                </p>
              </div>

              <PackagePlus color="#028C56" />
            </div>

            <form className="form" onSubmit={handleSubmit}>
              <div className="row g-4">
                <div className="col-md-8">
                  <label className="form-label">
                    Nome do material <span className="text-danger">*</span>
                  </label>
                  <input
                    name="name"
                    className="form-control"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ex: Vidro triturado verde"
                  />
                  {errors.name && (
                    <p className="text-danger mt-1 mb-0">{errors.name[0]}</p>
                  )}
                </div>

                <div className="col-md-4">
                  <label className="form-label">
                    Categoria <span className="text-danger">*</span>
                  </label>
                  <input
                    name="category"
                    className="form-control"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="Ex: Vidro"
                  />
                  {errors.category && (
                    <p className="text-danger mt-1 mb-0">
                      {errors.category[0]}
                    </p>
                  )}
                </div>

                <div className="col-12">
                  <label className="form-label">Descrição do material</label>
                  <input
                    name="description"
                    className="form-control"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Ex: Vidro verde já triturado e pronto para comercialização"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">
                    Código do lote <span className="text-danger">*</span>
                  </label>
                  <input
                    name="lotCode"
                    className="form-control"
                    value={formData.lotCode}
                    onChange={handleInputChange}
                    placeholder="Ex: VID-TRI-001"
                  />
                  {errors.lotCode && (
                    <p className="text-danger mt-1 mb-0">
                      {errors.lotCode[0]}
                    </p>
                  )}
                </div>

                <div className="col-md-4">
                  <label className="form-label">
                    Quantidade em KG <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="quantityKg"
                    className="form-control"
                    value={formData.quantityKg}
                    onChange={handleInputChange}
                    placeholder="Ex: 350.50"
                  />
                  {errors.quantityKg && (
                    <p className="text-danger mt-1 mb-0">
                      {errors.quantityKg[0]}
                    </p>
                  )}
                </div>

                <div className="col-md-4">
                  <label className="form-label">Etapa</label>
                  <select
                    name="processingStage"
                    className="form-select"
                    value={formData.processingStage}
                    onChange={handleInputChange}
                  >
                    <option value="TRIADO">Triado</option>
                    <option value="TRITURADO">Triturado</option>
                    <option value="PRENSADO">Prensado</option>
                    <option value="ENFARDADO">Enfardado</option>
                    <option value="ARMAZENADO">Armazenado</option>
                    <option value="DESTINADO">Destinado</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Local de armazenamento</label>
                  <input
                    name="storageLocation"
                    className="form-control"
                    value={formData.storageLocation}
                    onChange={handleInputChange}
                    placeholder="Ex: Galpão 01, Baia de vidro"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Origem</label>
                  <input
                    name="origin"
                    className="form-control"
                    value={formData.origin}
                    onChange={handleInputChange}
                    placeholder="Ex: Coletas comerciais, triagem interna"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Status do material</label>
                  <select
                    name="itemStatus"
                    className="form-select"
                    value={formData.itemStatus}
                    onChange={handleInputChange}
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Status do lote</label>
                  <select
                    name="lotStatus"
                    className="form-select"
                    value={formData.lotStatus}
                    onChange={handleInputChange}
                  >
                    <option value="AVAILABLE">Disponível</option>
                    <option value="RESERVED">Reservado</option>
                    <option value="SOLD">Vendido/Destinado</option>
                    <option value="DISCARDED">Descartado</option>
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label">Observações</label>
                  <textarea
                    name="notes"
                    rows="4"
                    className="form-control"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Observações internas sobre o lote."
                  />
                </div>
              </div>

              <div className="d-flex gap-20 mt-4 flex-wrap">
                <Link to="/waste-type-list" className="btn-md outline-btn">
                  <ArrowLeft size={18} />
                  Voltar
                </Link>

                <button
                  className="btn-md primary-btn border-0"
                  disabled={submitting}
                >
                  <Save size={18} />
                  {submitting ? "Salvando..." : "Salvar estoque"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddWasteType;