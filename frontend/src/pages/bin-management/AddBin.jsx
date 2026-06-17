import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  House,
  ChevronRight,
  Truck,
  MapPin,
  Archive,
  ImagePlus,
  Save,
  ArrowLeft,
  Hash,
  CalendarDays,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { createBin } from '../../services/binService';
import { getAllZones } from '../../services/zoneService';
import { getAllVehicles } from '../../services/vehicleService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const BIN_TYPES = [
  { value: 'recyclable', label: 'Reciclável' },
  { value: 'organic', label: 'Orgânico' },
  { value: 'non-recyclable', label: 'Não reciclável' },
  { value: 'mixed', label: 'Misto' },
  { value: 'electronic', label: 'Eletrônico' },
  { value: 'hazardous', label: 'Perigoso' },
];

const BIN_STATUS = [
  { value: 'active', label: 'Ativa' },
  { value: 'inactive', label: 'Inativa' },
  { value: 'full', label: 'Cheia' },
  { value: 'maintenance', label: 'Manutenção' },
];

const initialFormState = {
  bin_id: '',
  bin_type: '',
  location: '',
  zone_id: '',
  vehicle_id: '',
  collection_date: '',
  status: 'active',
  capacity_kg: '',
  notes: '',
  photo: null,
};

const AddBin = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [zones, setZones] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const photoPreview = useMemo(() => {
    if (!formData.photo) return null;
    return URL.createObjectURL(formData.photo);
  }, [formData.photo]);

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        setLoading(true);

        const [zoneResponse, vehicleResponse] = await Promise.all([
          getAllZones(),
          getAllVehicles(),
        ]);

        if (zoneResponse?.success) {
          setZones(Array.isArray(zoneResponse.data) ? zoneResponse.data : []);
        } else {
          toast.error(zoneResponse?.message || 'Não foi possível carregar as zonas.');
        }

        if (vehicleResponse?.success) {
          setVehicles(Array.isArray(vehicleResponse.data) ? vehicleResponse.data : []);
        } else {
          toast.error(vehicleResponse?.message || 'Não foi possível carregar os veículos.');
        }
      } catch (error) {
        console.error('Erro ao carregar dependências da lixeira:', error);
        toast.error('Erro ao carregar zonas e veículos.');
      } finally {
        setLoading(false);
      }
    };

    fetchDependencies();
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const clearFieldError = (fieldName) => {
    setErrors((prev) => ({ ...prev, [fieldName]: '' }));
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    clearFieldError(name);
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setFormData((prev) => ({ ...prev, photo: null }));
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeInMb = 5;
    const maxSizeInBytes = maxSizeInMb * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      toast.error('Envie uma imagem nos formatos JPG, PNG ou WEBP.');
      event.target.value = '';
      return;
    }

    if (file.size > maxSizeInBytes) {
      toast.error(`A imagem deve ter no máximo ${maxSizeInMb}MB.`);
      event.target.value = '';
      return;
    }

    setFormData((prev) => ({ ...prev, photo: file }));
    clearFieldError('photo');
  };

  const validateForm = () => {
    const validationErrors = {};

    if (!formData.bin_id.trim()) {
      validationErrors.bin_id = ['Informe o código da lixeira.'];
    }

    if (!formData.bin_type) {
      validationErrors.bin_type = ['Selecione o tipo da lixeira.'];
    }

    if (!formData.location.trim()) {
      validationErrors.location = ['Informe a localização da lixeira.'];
    }

    if (!formData.zone_id) {
      validationErrors.zone_id = ['Selecione a zona vinculada.'];
    }

    if (formData.capacity_kg && Number(formData.capacity_kg) <= 0) {
      validationErrors.capacity_kg = ['A capacidade deve ser maior que zero.'];
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const buildPayload = () => {
    const payload = {
      bin_id: formData.bin_id.trim(),
      bin_type: formData.bin_type || null,
      location: formData.location.trim() || null,
      zone_id: formData.zone_id || null,
      vehicle_id: formData.vehicle_id || null,
      last_collection_date: formData.collection_date || null,
      status: formData.status,
      capacity_kg: formData.capacity_kg ? Number(formData.capacity_kg) : null,
      notes: formData.notes.trim() || null,
    };

    if (!formData.photo) return payload;

    const multipartPayload = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        multipartPayload.append(key, value);
      }
    });

    multipartPayload.append('photo', formData.photo);

    return multipartPayload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error('Revise os campos obrigatórios antes de salvar.');
      return;
    }

    try {
      setSaving(true);

      const response = await createBin(buildPayload());

      if (response?.success) {
        toast.success(response.message || 'Lixeira criada com sucesso.');
        setFormData(initialFormState);
        setErrors({});
        navigate('/bin-list');
        return;
      }

      toast.error(response?.message || 'Não foi possível criar a lixeira.');

      if (response?.errors) {
        setErrors(response.errors);
      }
    } catch (error) {
      console.error('Erro ao criar lixeira:', error);

      if (error?.errors) {
        setErrors(error.errors);
      }

      toast.error(error?.message || 'Erro ao criar lixeira.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <HeadTags title="Criar Lixeira | KATUÁ" />
      <TopProgressBar loading={loading || saving} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Criar Lixeira</h3>
          <p className="mb-0 text-muted">
            Cadastre uma nova lixeira/ponto de coleta no painel KATUÁ.
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
                  <Link to="/bin-list">Lixeiras</Link>
                </li>
                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Nova Lixeira
                </li>
              </ol>
            </nav>
          </div>

          <Link to="/bin-list" className="outline-btn btn-sm">
            <ArrowLeft /> Voltar
          </Link>
        </div>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-8">
          <div className="card p-25 mb-5">
            <h3 className="fw-600 fs-18 mb-4">Informações da Lixeira</h3>

            <form className="form" onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="bin_id" className="form-label">
                  Código da Lixeira <span className="text-danger">*</span>
                </label>
                <div className="left-inner-addon">
                  <span className="icon">
                    <Hash />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    id="bin_id"
                    name="bin_id"
                    value={formData.bin_id}
                    onChange={handleInputChange}
                    placeholder="Ex: KATUA-BIN-001"
                    disabled={saving}
                  />
                </div>
                {errors.bin_id && (
                  <div className="text-danger small mt-1">{errors.bin_id[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="bin_type" className="form-label">
                  Tipo da Lixeira <span className="text-danger">*</span>
                </label>
                <div className="left-inner-addon">
                  <span className="icon">
                    <Archive />
                  </span>
                  <select
                    className="form-select"
                    id="bin_type"
                    name="bin_type"
                    value={formData.bin_type}
                    onChange={handleInputChange}
                    disabled={saving}
                  >
                    <option value="">Selecione o tipo</option>
                    {BIN_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.bin_type && (
                  <div className="text-danger small mt-1">{errors.bin_type[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="location" className="form-label">
                  Localização <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Ex: Rua, bairro, ponto de referência"
                  disabled={saving}
                />
                {errors.location && (
                  <div className="text-danger small mt-1">{errors.location[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="zone_id" className="form-label">
                  Zona Vinculada <span className="text-danger">*</span>
                </label>
                <div className="left-inner-addon">
                  <span className="icon">
                    <MapPin />
                  </span>
                  <select
                    className="form-select"
                    id="zone_id"
                    name="zone_id"
                    value={formData.zone_id}
                    onChange={handleInputChange}
                    disabled={saving || loading}
                  >
                    <option value="">Selecione a zona</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name || zone.title || `Zona ${zone.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.zone_id && (
                  <div className="text-danger small mt-1">{errors.zone_id[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="vehicle_id" className="form-label">
                  Veículo Vinculado
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
                    disabled={saving || loading}
                  >
                    <option value="">Nenhum veículo vinculado</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicle_number || vehicle.plate || vehicle.name || `Veículo ${vehicle.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.vehicle_id && (
                  <div className="text-danger small mt-1">{errors.vehicle_id[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="collection_date" className="form-label">
                  Última Coleta
                </label>
                <div className="left-inner-addon">
                  <span className="icon">
                    <CalendarDays />
                  </span>
                  <input
                    type="date"
                    className="form-control"
                    id="collection_date"
                    name="collection_date"
                    value={formData.collection_date}
                    onChange={handleInputChange}
                    disabled={saving}
                  />
                </div>
                {errors.last_collection_date && (
                  <div className="text-danger small mt-1">
                    {errors.last_collection_date[0]}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="capacity_kg" className="form-label">
                  Capacidade Estimada em KG
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  id="capacity_kg"
                  name="capacity_kg"
                  value={formData.capacity_kg}
                  onChange={handleInputChange}
                  placeholder="Ex: 120"
                  disabled={saving}
                />
                {errors.capacity_kg && (
                  <div className="text-danger small mt-1">{errors.capacity_kg[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="photo" className="form-label">
                  Foto da Lixeira
                </label>
                <div className="left-inner-addon">
                  <span className="icon">
                    <ImagePlus />
                  </span>
                  <input
                    type="file"
                    className="form-control"
                    id="photo"
                    name="photo"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoChange}
                    disabled={saving}
                  />
                </div>
                <small className="text-muted d-block mt-1">
                  Formatos aceitos: JPG, PNG ou WEBP. Tamanho máximo: 5MB.
                </small>
                {errors.photo && (
                  <div className="text-danger small mt-1">{errors.photo[0]}</div>
                )}

                {photoPreview && (
                  <div className="mt-3">
                    <img
                      src={photoPreview}
                      alt="Pré-visualização da lixeira"
                      style={{
                        width: '160px',
                        height: '120px',
                        objectFit: 'cover',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                      }}
                    />
                  </div>
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
                  placeholder="Informe observações importantes sobre localização, acesso, conservação ou restrições."
                  disabled={saving}
                />
                {errors.notes && (
                  <div className="text-danger small mt-1">{errors.notes[0]}</div>
                )}
              </div>

              <div className="mb-4">
                <label className="form-label">Status</label>
                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                  {BIN_STATUS.map((status) => (
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
                  <div className="text-danger small mt-1">{errors.status[0]}</div>
                )}
              </div>

              <div className="d-flex gap-20 flex-wrap">
                <Link to="/bin-list" className="btn-md outline-btn">
                  Cancelar
                </Link>

                <button type="submit" className="btn-md primary-btn border-0" disabled={saving}>
                  <Save />
                  {saving ? 'Salvando...' : 'Salvar Lixeira'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddBin;