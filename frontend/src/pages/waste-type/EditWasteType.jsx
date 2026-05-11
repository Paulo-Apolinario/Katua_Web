import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import {
  House,
  ChevronRight,
  ArrowLeft,
  Save,
  PackageCheck,
} from "lucide-react";
import {
  getWasteTypeById,
  updateWasteType,
} from "../../services/wasteTypeService";
import { toast } from "react-hot-toast";
import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

const initialFormState = {
  name: "",
  category: "",
  description: "",
  status: "ACTIVE",
};

const getItemFromResponse = (response) => {
  return response?.item || response?.data || response?.stock || response || {};
};

const EditWasteType = () => {
  const { id } = useParams();

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const response = await getWasteTypeById(id);
        const item = getItemFromResponse(response);

        setFormData({
          name: item?.name || "",
          category: item?.category || "",
          description: item?.description || "",
          status: item?.status || "ACTIVE",
        });
      } catch (error) {
        toast.error(
          error?.message || "Erro ao carregar material de estoque."
        );
        console.error("Fetch stock item error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

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
      nextErrors.category = ["Informe a categoria do material."];
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
          name: formData.name.trim(),
          category: formData.category.trim(),
          description: formData.description?.trim() || null,
          status: formData.status,
        },
      };

      const response = await updateWasteType(id, payload);

      if (response?.success === false) {
        toast.error(
          response?.message || "Não foi possível atualizar o material."
        );
        setErrors(response?.errors || {});
        return;
      }

      toast.success(
        response?.message || "Material de estoque atualizado com sucesso."
      );
    } catch (err) {
      if (err?.errors) {
        setErrors(err.errors);
      }

      toast.error(
        err?.message || "Erro ao atualizar material de estoque."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeadTags title="Editar Material de Estoque" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Editar Material de Estoque</h3>
          <p className="text-muted mb-0">
            Atualize os dados principais do material reciclado registrado no
            estoque da cooperativa.
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

                <li className="breadcrumb-item active">
                  Editar Material
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <div className="row justify-content-center mb-5">
        <div className="col-lg-10 col-xl-8">
          <div className="card p-25">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
              <div>
                <h3 className="fw-600 fs-18 mb-1">
                  Informações do material
                </h3>
                <p className="text-muted mb-0">
                  Esses dados organizam o estoque por tipo de resíduo, categoria
                  e situação operacional.
                </p>
              </div>

              <PackageCheck color="#028C56" />
            </div>

            <form className="form" onSubmit={handleSubmit}>
              <div className="row g-4">
                <div className="col-md-8">
                  <label htmlFor="name" className="form-label">
                    Nome do material <span className="text-danger">*</span>
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ex: Vidro triturado verde"
                    disabled={loading}
                  />

                  {errors.name && (
                    <p className="text-danger mt-1 mb-0">
                      {errors.name[0]}
                    </p>
                  )}
                </div>

                <div className="col-md-4">
                  <label htmlFor="category" className="form-label">
                    Categoria <span className="text-danger">*</span>
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="Ex: Vidro"
                    disabled={loading}
                  />

                  {errors.category && (
                    <p className="text-danger mt-1 mb-0">
                      {errors.category[0]}
                    </p>
                  )}
                </div>

                <div className="col-12">
                  <label htmlFor="description" className="form-label">
                    Descrição
                  </label>

                  <textarea
                    className="form-control"
                    id="description"
                    name="description"
                    rows="4"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Ex: Material já triturado, pronto para comercialização ou armazenado para próximo lote."
                    disabled={loading}
                  />
                </div>

                <div className="col-md-6">
                  <label htmlFor="status" className="form-label">
                    Status do material
                  </label>

                  <select
                    className="form-select"
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="d-flex gap-20 mt-4 flex-wrap">
                <Link to="/waste-type-list" className="btn-md outline-btn">
                  <ArrowLeft size={18} />
                  Voltar
                </Link>

                <button
                  className="btn-md primary-btn border-0"
                  disabled={loading || submitting}
                >
                  <Save size={18} />
                  {submitting ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditWasteType;