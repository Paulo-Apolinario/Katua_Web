import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  House,
  ChevronRight,
  ArrowLeft,
  Save,
  Truck,
  Wrench,
  MapPin,
  CalendarDays,
  DollarSign,
  Building2,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

import DragDropUpload from '../../components/DragDropUpload';
import { getAllVehicles } from '../../services/vehicleService';
import { createMaintenanceLog } from '../../services/maintenanceLogService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const MAINTENANCE_STATUS = [
  { value: 'completed', label: 'Concluída' },
  { value: 'pending', label: 'Pendente' },
  { value: 'scheduled', label: 'Agendada' },
  { value: 'overdue', label: 'Atrasada' },
];

const initialFormState = {
  vehicle_id: '',
  maintenance_type: '',
  maintenance_date: '',
  location: '',
  cost: '',
  performed_by: '',
  next_maintenance_date: '',
  note: '',
  status: 'completed',
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

const AddMaintenanceLog = () => {
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

    if (!formData.vehicle_id) {
      validationErrors.vehicle_id = ['Selecione o veículo vinculado.'];
    }

    if (!formData.maintenance_type.trim()) {
      validationErrors.maintenance_type = ['Informe o tipo de manutenção.'];
    }

    if (!formData.maintenance_date) {
      validationErrors.maintenance_date = ['Informe a data da manutenção.'];
    }

    if (formData.cost && Number(formData.cost) < 0) {
      validationErrors.cost = ['O custo não pode ser negativo.'];
    }

    if (
      formData.maintenance_date &&
      formData.next_maintenance_date &&
      new Date(formData.next_maintenance_date) < new Date(formData.maintenance_date)
    ) {
      validationErrors.next_maintenance_date = [
        'A próxima manutenção não pode ser anterior à manutenção atual.',
      ];
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const buildPayload = () => {
    const payload = new FormData();

    payload.append('vehicle_id', formData.vehicle_id);
    payload.append('maintenance_type', formData.maintenance_type.trim());
    payload.append('maintenance_date', formData.maintenance_date);
    payload.append('status', formData.status);

    if (formData.location.trim()) {
      payload.append('location', formData.location.trim());
    }

    if (formData.cost) {
      payload.append('cost', formData.cost);
    }

    if (formData.performed_by.trim()) {
      payload.append('performed_by', formData.performed_by.trim());
    }

    if (formData.next_maintenance_date) {
      payload.append('next_maintenance_date', formData.next_maintenance_date);
    }

    if (formData.note.trim()) {
      payload.append('notes', formData.note.trim());
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

      const response = await createMaintenanceLog(buildPayload());

      if (response?.success) {
        toast.success(response.message || 'Manutenção criada com sucesso.');
        setFormData(initialFormState);
        fileRef.current?.clear?.();
        setErrors({});
        navigate('/maintenance-list');
        return;
      }

      toast.error(response?.message || 'Não foi possível criar a manutenção.');
      setErrors(response?.errors || {});
    } catch (error) {
      console.error('Erro ao criar manutenção:', error);

      if (error?.errors) {
        setErrors(error.errors);
      }

      toast.error(error?.message || 'Erro ao criar manutenção.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <HeadTags title="Criar Manutenção | KATUÁ" />
      <TopProgressBar loading={loading || saving} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Criar Manutenção</h3>
          <p className="mb-0 text-muted">
            Registre manutenções, custos, responsáveis, datas e comprovantes dos veículos.
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
                  <Link to="/maintenance-list">Manutenções</Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li className="breadcrumb-item active" aria-current="page">
                  Nova Manutenção
                </li>
              </ol>
            </nav>
          </div>

          <Link to="/maintenance-list" className="outline-btn btn-sm">
            <ArrowLeft /> Voltar
          </Link>
        </div>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-8">
          <div className="card p-25 mb-5">
            <h3 className="fw-600 fs-18 mb-4">Informações da Manutenção</h3>

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
                <label htmlFor="maintenance_type" className="form-label">
                  Tipo de Manutenção <span className="text-danger">*</span>
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <Wrench />
                  </span>

                  <input
                    type="text"
                    className="form-control"
                    id="maintenance_type"
                    name="maintenance_type"
                    value={formData.maintenance_type}
                    onChange={handleInputChange}
                    placeholder="Ex: Troca de óleo, revisão, pneus, motor"
                    disabled={saving}
                  />
                </div>

                {errors.maintenance_type && (
                  <div className="text-danger small mt-1">{errors.maintenance_type[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="maintenance_date" className="form-label">
                  Data da Manutenção <span className="text-danger">*</span>
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <CalendarDays />
                  </span>

                  <input
                    type="date"
                    className="form-control"
                    id="maintenance_date"
                    name="maintenance_date"
                    value={formData.maintenance_date}
                    onChange={handleInputChange}
                    disabled={saving}
                  />
                </div>

                {errors.maintenance_date && (
                  <div className="text-danger small mt-1">{errors.maintenance_date[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="location" className="form-label">
                  Local da Manutenção
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <MapPin />
                  </span>

                  <input
                    type="text"
                    className="form-control"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Ex: Oficina, garagem, endereço ou ponto de apoio"
                    disabled={saving}
                  />
                </div>

                {errors.location && (
                  <div className="text-danger small mt-1">{errors.location[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="cost" className="form-label">
                  Custo
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <DollarSign />
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    id="cost"
                    name="cost"
                    value={formData.cost}
                    onChange={handleInputChange}
                    placeholder="Ex: 350.00"
                    disabled={saving}
                  />
                </div>

                {errors.cost && (
                  <div className="text-danger small mt-1">{errors.cost[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="performed_by" className="form-label">
                  Responsável/Oficina
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <Building2 />
                  </span>

                  <input
                    type="text"
                    className="form-control"
                    id="performed_by"
                    name="performed_by"
                    value={formData.performed_by}
                    onChange={handleInputChange}
                    placeholder="Ex: Oficina parceira, mecânico ou equipe interna"
                    disabled={saving}
                  />
                </div>

                {errors.performed_by && (
                  <div className="text-danger small mt-1">{errors.performed_by[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="next_maintenance_date" className="form-label">
                  Próxima Manutenção
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <CalendarDays />
                  </span>

                  <input
                    type="date"
                    className="form-control"
                    id="next_maintenance_date"
                    name="next_maintenance_date"
                    value={formData.next_maintenance_date}
                    onChange={handleInputChange}
                    disabled={saving}
                  />
                </div>

                {errors.next_maintenance_date && (
                  <div className="text-danger small mt-1">
                    {errors.next_maintenance_date[0]}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <DragDropUpload
                  ref={fileRef}
                  label="Nota/Fatura da Manutenção"
                  onChange={() => clearFieldError('file')}
                />

                <small className="text-muted d-block mt-2">
                  Anexe nota fiscal, comprovante, orçamento ou imagem da manutenção, se houver.
                </small>

                {errors.file && (
                  <div className="text-danger small mt-1">{errors.file[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="note" className="form-label">
                  Observações
                </label>

                <div className="left-inner-addon">
                  <span className="icon">
                    <FileText />
                  </span>

                  <textarea
                    className="form-control textarea"
                    id="note"
                    name="note"
                    rows="4"
                    value={formData.note}
                    onChange={handleInputChange}
                    placeholder="Descreva peças trocadas, serviços executados, recomendações ou pendências."
                    disabled={saving}
                  />
                </div>

                {errors.notes && (
                  <div className="text-danger small mt-1">{errors.notes[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label className="form-label">Status</label>

                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                  {MAINTENANCE_STATUS.map((status) => (
                    <div className="form-check" key={status.value}>
                      <input
                        className="form-check-input"
                        type="radio"
                        name="status"
                        id={`status-${status.value}`}
                        value={status.value}
                        checked={formData.status === status.value}
                        onChange={handleInputChange}
                        disabled={saving}
                      />

                      <label className="form-check-label" htmlFor={`status-${status.value}`}>
                        {status.label}
                      </label>
                    </div>
                  ))}
                </div>

                {errors.status && (
                  <div className="text-danger small mt-1">
                    {Array.isArray(errors.status) ? errors.status[0] : errors.status}
                  </div>
                )}
              </div>

              <div className="d-flex gap-20 flex-wrap">
                <Link to="/maintenance-list" className="btn-md outline-btn">
                  Cancelar
                </Link>

                <button
                  type="submit"
                  className="btn-md primary-btn border-0"
                  disabled={saving || loading}
                >
                  <Save />
                  {saving ? 'Salvando...' : 'Salvar Manutenção'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddMaintenanceLog;