import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  House,
  ChevronRight,
  ArrowLeft,
  Save,
  FileText,
  CalendarDays,
  Truck,
  Hash,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

import DragDropUpload from '../../components/DragDropUpload';
import { getAllVehicles } from '../../services/vehicleService';
import {
  getVehicleDocumentById,
  updateVehicleDocument,
} from '../../services/vehicleDocumentService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const DOCUMENT_TYPES = [
  { value: 'insurance', label: 'Seguro' },
  { value: 'pollution', label: 'Certificado Ambiental/Emissões' },
  { value: 'registration', label: 'Registro do Veículo' },
  { value: 'permit', label: 'Licença/Autorização de Circulação' },
  { value: 'tax', label: 'Taxas/Tributos' },
  { value: 'inspection', label: 'Vistoria' },
  { value: 'maintenance', label: 'Documento de Manutenção' },
  { value: 'others', label: 'Outros' },
];

const initialFormState = {
  vehicle_id: '',
  document_type: '',
  document_number: '',
  issue_date: '',
  expiry_date: '',
  notes: '',
};

const formatDateInput = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().split('T')[0];
};

const getVehicleLabel = (vehicle) => {
  if (!vehicle) return 'Veículo sem identificação';

  return (
    vehicle.vehicle_number ||
    vehicle.plate ||
    vehicle.name ||
    vehicle.model ||
    `Veículo ${vehicle.id || ''}`.trim()
  );
};

const getDocumentFileUrl = (file) => {
  if (!file) return null;

  if (String(file).startsWith('http')) return file;

  return `${import.meta.env.VITE_API_BASE_URL}/uploads/vehicle_documents/${file}`;
};

const EditDocument = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [existingFile, setExistingFile] = useState(null);
  const [newFileSelected, setNewFileSelected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [vehicleResponse, documentResponse] = await Promise.all([
          getAllVehicles(),
          getVehicleDocumentById(id),
        ]);

        if (vehicleResponse?.success) {
          setVehicles(Array.isArray(vehicleResponse.data) ? vehicleResponse.data : []);
        } else {
          toast.error(vehicleResponse?.message || 'Não foi possível carregar os veículos.');
        }

        if (documentResponse?.success) {
          const document = documentResponse.data || {};

          setFormData({
            vehicle_id: document.vehicle_id || '',
            document_type: document.document_type || '',
            document_number: document.document_number || '',
            issue_date: formatDateInput(document.issue_date),
            expiry_date: formatDateInput(document.expiry_date),
            notes: document.notes || '',
          });

          setExistingFile(document.file || null);
        } else {
          toast.error(documentResponse?.message || 'Não foi possível carregar o documento.');
        }
      } catch (error) {
        console.error('Erro ao carregar documento:', error);
        toast.error(error?.message || 'Erro ao carregar documento.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const clearFieldError = (field) => {
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    clearFieldError(name);
  };

  const handleFileChange = (file) => {
    setNewFileSelected(Boolean(file));
    clearFieldError('file');
  };

  const validateForm = () => {
    const validationErrors = {};

    if (!formData.vehicle_id) {
      validationErrors.vehicle_id = ['Selecione o veículo vinculado.'];
    }

    if (!formData.document_type) {
      validationErrors.document_type = ['Selecione o tipo de documento.'];
    }

    if (!formData.document_number.trim()) {
      validationErrors.document_number = ['Informe o número/código do documento.'];
    }

    if (
      formData.issue_date &&
      formData.expiry_date &&
      new Date(formData.issue_date) > new Date(formData.expiry_date)
    ) {
      validationErrors.expiry_date = [
        'A data de vencimento não pode ser anterior à data de emissão.',
      ];
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const buildPayload = () => {
    const payload = new FormData();

    payload.append('_method', 'PUT');
    payload.append('vehicle_id', formData.vehicle_id);
    payload.append('document_type', formData.document_type);
    payload.append('document_number', formData.document_number.trim());

    if (formData.issue_date) {
      payload.append('issue_date', formData.issue_date);
    }

    if (formData.expiry_date) {
      payload.append('expiry_date', formData.expiry_date);
    }

    if (formData.notes.trim()) {
      payload.append('notes', formData.notes.trim());
    }

    const selectedFile = fileRef.current?.getFile?.();

    if (selectedFile) {
      payload.append('file', selectedFile);
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error('Revise os campos obrigatórios antes de salvar.');
      return;
    }

    try {
      setSaving(true);

      const response = await updateVehicleDocument(id, buildPayload());

      if (response?.success) {
        toast.success(response.message || 'Documento atualizado com sucesso.');
        setErrors({});
        setExistingFile(response.data?.file || existingFile);
        setNewFileSelected(false);
        fileRef.current?.clear?.();
        navigate('/document-list');
        return;
      }

      toast.error(response?.message || 'Não foi possível atualizar o documento.');

      if (response?.errors) {
        setErrors(response.errors);
      }
    } catch (error) {
      console.error('Erro ao atualizar documento:', error);

      if (error?.errors) {
        setErrors(error.errors);
      }

      toast.error(error?.message || 'Erro ao atualizar documento.');
    } finally {
      setSaving(false);
    }
  };

  const existingFileUrl = getDocumentFileUrl(existingFile);

  return (
    <>
      <HeadTags title="Editar Documento | KATUÁ" />
      <TopProgressBar loading={loading || saving} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Editar Documento</h3>
          <p className="mb-0 text-muted">
            Atualize documentos, licenças, registros e anexos vinculados aos veículos.
          </p>
        </div>

        <div className="page-tool d-flex justify-content-between align-items-center flex-wrap gap-20">
          <div className="breadcrumb-wrap">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb pb-0 mb-0">
                <li className="breadcrumb-item">
                  <Link to="/" className="d-flex align-items-center gap-8">
                    <House /> Dashboard
                  </Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li className="breadcrumb-item">
                  <Link to="/document-list">Documentos</Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li className="breadcrumb-item active" aria-current="page">
                  Editar
                </li>
              </ol>
            </nav>
          </div>

          <Link to="/document-list" className="outline-btn btn-sm">
            <ArrowLeft /> Voltar
          </Link>
        </div>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-8">
          <div className="card p-25 mb-5">
            <h3 className="fw-600 fs-18 mb-4">Informações do Documento</h3>

            <form className="form" onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="vehicle_id" className="form-label">
                  Veículo Vinculado <span className="text-danger">*</span>
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <Truck />
                  </span>

                  <select
                    className="form-select"
                    id="vehicle_id"
                    name="vehicle_id"
                    value={formData.vehicle_id}
                    onChange={handleInputChange}
                    disabled={loading || saving}
                  >
                    <option value="">Selecione o veículo</option>

                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {getVehicleLabel(vehicle)}
                      </option>
                    ))}
                  </select>
                </div>

                {errors.vehicle_id && (
                  <div className="text-danger small mt-1">{errors.vehicle_id[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="document_type" className="form-label">
                  Tipo de Documento <span className="text-danger">*</span>
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <FileText />
                  </span>

                  <select
                    id="document_type"
                    name="document_type"
                    value={formData.document_type}
                    onChange={handleInputChange}
                    className="form-select"
                    disabled={loading || saving}
                  >
                    <option value="">Selecione o tipo</option>

                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {errors.document_type && (
                  <div className="text-danger small mt-1">{errors.document_type[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="document_number" className="form-label">
                  Número/Código do Documento <span className="text-danger">*</span>
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <Hash />
                  </span>

                  <input
                    type="text"
                    className="form-control"
                    id="document_number"
                    name="document_number"
                    value={formData.document_number}
                    onChange={handleInputChange}
                    placeholder="Ex: CRLV-2026, SEG-98347, DOC-001"
                    disabled={loading || saving}
                  />
                </div>

                {errors.document_number && (
                  <div className="text-danger small mt-1">{errors.document_number[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="issue_date" className="form-label">
                  Data de Emissão
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <CalendarDays />
                  </span>

                  <input
                    type="date"
                    className="form-control"
                    id="issue_date"
                    name="issue_date"
                    value={formData.issue_date}
                    onChange={handleInputChange}
                    disabled={loading || saving}
                  />
                </div>

                {errors.issue_date && (
                  <div className="text-danger small mt-1">{errors.issue_date[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="expiry_date" className="form-label">
                  Data de Vencimento
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <CalendarDays />
                  </span>

                  <input
                    type="date"
                    className="form-control"
                    id="expiry_date"
                    name="expiry_date"
                    value={formData.expiry_date}
                    onChange={handleInputChange}
                    disabled={loading || saving}
                  />
                </div>

                {errors.expiry_date && (
                  <div className="text-danger small mt-1">{errors.expiry_date[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="notes" className="form-label">
                  Observações
                </label>

                <textarea
                  className="form-control"
                  id="notes"
                  name="notes"
                  rows="4"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Informe observações sobre validade, renovação, vistoria ou restrições do documento."
                  disabled={loading || saving}
                />

                {errors.notes && (
                  <div className="text-danger small mt-1">{errors.notes[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <DragDropUpload
                  ref={fileRef}
                  label="Arquivo do Documento"
                  required={false}
                  onChange={handleFileChange}
                />

                <small className="text-muted d-block mt-2">
                  Envie um novo arquivo somente se desejar substituir o documento atual.
                </small>

                {errors.file && (
                  <div className="text-danger small mt-1">{errors.file[0]}</div>
                )}
              </div>

              {existingFile && !newFileSelected && (
                <div className="mb-4">
                  <label className="form-label">Arquivo atual</label>

                  <div className="border rounded p-3 d-flex align-items-center justify-content-between flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <FileText size={20} />
                      <span>{existingFile}</span>
                    </div>

                    {existingFileUrl && (
                      <a
                        href={existingFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="outline-btn btn-sm"
                      >
                        Ver arquivo <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="d-flex gap-20 flex-wrap">
                <Link to="/document-list" className="btn-md outline-btn">
                  Cancelar
                </Link>

                <button
                  type="submit"
                  className="btn-md primary-btn border-0"
                  disabled={loading || saving}
                >
                  <Save />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditDocument;