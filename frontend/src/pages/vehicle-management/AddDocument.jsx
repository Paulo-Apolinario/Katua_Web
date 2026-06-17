import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  House,
  ChevronRight,
  ArrowLeft,
  Save,
  FileText,
  CalendarDays,
  Truck,
  Hash,
} from 'lucide-react';
import toast from 'react-hot-toast';

import DragDropUpload from '../../components/DragDropUpload';
import { getAllVehicles } from '../../services/vehicleService';
import { createVehicleDocument } from '../../services/vehicleDocumentService';
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

const AddDocument = () => {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);

        const response = await getAllVehicles();

        if (response?.success) {
          setVehicles(Array.isArray(response.data) ? response.data : []);
          return;
        }

        toast.error(response?.message || 'Não foi possível carregar os veículos.');
      } catch (error) {
        console.error('Erro ao carregar veículos:', error);
        toast.error(error?.message || 'Erro ao carregar veículos.');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

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

  const validateForm = () => {
    const validationErrors = {};
    const selectedFile = fileRef.current?.getFile?.();

    if (!formData.vehicle_id) {
      validationErrors.vehicle_id = ['Selecione o veículo vinculado.'];
    }

    if (!formData.document_type) {
      validationErrors.document_type = ['Selecione o tipo de documento.'];
    }

    if (!formData.document_number.trim()) {
      validationErrors.document_number = ['Informe o número/código do documento.'];
    }

    if (!selectedFile) {
      validationErrors.file = ['Anexe o arquivo do documento.'];
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

      const response = await createVehicleDocument(buildPayload());

      if (response?.success) {
        toast.success(response.message || 'Documento criado com sucesso.');
        setFormData(initialFormState);
        fileRef.current?.clear?.();
        setErrors({});
        navigate('/document-list');
        return;
      }

      toast.error(response?.message || 'Não foi possível criar o documento.');
      setErrors(response?.errors || {});
    } catch (error) {
      console.error('Erro ao criar documento:', error);

      if (error?.errors) {
        setErrors(error.errors);
      }

      toast.error(error?.message || 'Erro ao criar documento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <HeadTags title="Criar Documento | KATUÁ" />
      <TopProgressBar loading={loading || saving} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Criar Documento</h3>
          <p className="mb-0 text-muted">
            Cadastre documentos vinculados aos veículos da operação KATUÁ.
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
                  Novo Documento
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
                    disabled={saving}
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
                    disabled={saving}
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
                    disabled={saving}
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
                    disabled={saving}
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
                  disabled={saving}
                />

                {errors.notes && (
                  <div className="text-danger small mt-1">{errors.notes[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <DragDropUpload
                  ref={fileRef}
                  label="Arquivo do Documento"
                  required
                  onChange={() => clearFieldError('file')}
                />

                <small className="text-muted d-block mt-2">
                  Anexe PDF, imagem ou arquivo compatível com o backend atual.
                </small>

                {errors.file && (
                  <div className="text-danger small mt-1">{errors.file[0]}</div>
                )}
              </div>

              <div className="d-flex gap-20 flex-wrap">
                <Link to="/document-list" className="btn-md outline-btn">
                  Cancelar
                </Link>

                <button
                  type="submit"
                  className="btn-md primary-btn border-0"
                  disabled={saving || loading}
                >
                  <Save />
                  {saving ? 'Salvando...' : 'Salvar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddDocument;