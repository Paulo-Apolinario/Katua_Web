import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  House,
  ChevronRight,
  CirclePlus,
  Pencil,
  Trash2,
  Search,
  Archive,
  MapPin,
  Truck,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

import DeleteModal from '../../components/modal/DeleteModal';
import { getAllBins, deleteBin } from '../../services/binService';
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
  { value: 'active', label: 'Ativo', className: 'status-success' },
  { value: 'inactive', label: 'Inativo', className: 'status-danger' },
  { value: 'full', label: 'Cheio', className: 'status-warning' },
  { value: 'maintenance', label: 'Manutenção', className: 'status-warning' },
];

const getBinTypeLabel = (value) => {
  return BIN_TYPES.find((item) => item.value === value)?.label || value || 'N/A';
};

const getStatusConfig = (value) => {
  return (
    BIN_STATUS.find((item) => item.value === value) || {
      label: value || 'N/A',
      className: 'status-danger',
    }
  );
};

const formatDate = (value) => {
  if (!value) return 'N/A';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleDateString('pt-BR');
};

const getZoneLabel = (zone) => {
  if (!zone) return 'N/A';

  return zone.name || zone.title || `Zona ${zone.id || ''}`.trim();
};

const getVehicleLabel = (vehicle) => {
  if (!vehicle) return 'N/A';

  return vehicle.vehicle_number || vehicle.plate || vehicle.name || vehicle.model || 'N/A';
};

const getPhotoUrl = (row) => {
  return row.photo_url || row.photoUrl || row.image_url || row.imageUrl || row.photo || null;
};

const SummaryCard = ({ icon, label, value }) => (
  <div
    className="card h-100"
    style={{
      padding: '18px 20px',
      borderRadius: 14,
      minHeight: 72,
      display: 'flex',
      justifyContent: 'center',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</div>

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span style={{ fontSize: 14, color: '#6b7280', lineHeight: '18px' }}>{label}</span>
        <strong style={{ fontSize: 22, lineHeight: '24px', color: '#111827' }}>{value}</strong>
      </div>
    </div>
  </div>
);

const BinList = () => {
  const [bins, setBins] = useState([]);
  const [search, setSearch] = useState('');
  const [binTypeFilter, setBinTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchBins = async () => {
    try {
      setLoading(true);

      const response = await getAllBins();

      if (response?.success) {
        const list = Array.isArray(response.data) ? response.data : [];
        setBins(list.map((item, index) => ({ ...item, sn: index + 1 })));
        return;
      }

      toast.error(response?.message || 'Não foi possível carregar os PEVs.');
    } catch (error) {
      console.error('Erro ao buscar PEVs:', error);
      toast.error(error?.message || 'Erro ao carregar PEVs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBins();
  }, []);

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();

    return bins.filter((item) => {
      const matchesSearch =
        !term ||
        String(item.bin_id || '').toLowerCase().includes(term) ||
        String(item.location || '').toLowerCase().includes(term) ||
        String(getZoneLabel(item.zone)).toLowerCase().includes(term) ||
        String(getVehicleLabel(item.vehicle)).toLowerCase().includes(term);

      const matchesType = !binTypeFilter || item.bin_type === binTypeFilter;
      const matchesStatus = !statusFilter || item.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [bins, search, binTypeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const startIndex = filteredData.length === 0 ? 0 : (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredData.length);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const summary = useMemo(() => {
    const active = bins.filter((item) => item.status === 'active').length;
    const full = bins.filter((item) => item.status === 'full').length;
    const inactive = bins.filter((item) => item.status === 'inactive').length;
    const maintenance = bins.filter((item) => item.status === 'maintenance').length;

    return {
      total: bins.length,
      active,
      full,
      unavailable: inactive + maintenance,
    };
  }, [bins]);

  const handleClearFilters = () => {
    setSearch('');
    setBinTypeFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);

      const response = await deleteBin(deleteId);

      if (response?.success) {
        setBins((prev) =>
          prev
            .filter((item) => item.id !== deleteId)
            .map((item, index) => ({ ...item, sn: index + 1 }))
        );

        toast.success(response.message || 'PEV excluído com sucesso.');
        setDeleteId(null);
        return;
      }

      toast.error(response?.message || 'Não foi possível excluir o PEV.');
    } catch (error) {
      console.error('Erro ao excluir PEV:', error);
      toast.error(error?.message || 'Erro ao excluir PEV.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <HeadTags title="PEVs | KATUÁ" />
      <TopProgressBar loading={loading || deleting} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">PEVs (Eco Pontos)</h3>
          <p className="mb-0 text-muted">
            Gerencie PEVs, pontos de coleta voluntária, vínculo com zonas e veículos.
          </p>
        </div>

        <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
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
                <li className="breadcrumb-item active">PEVs</li>
              </ol>
            </nav>
          </div>

          <div className="d-flex align-items-center gap-10 flex-wrap">
            <button
              type="button"
              className="outline-btn btn-sm"
              onClick={fetchBins}
              disabled={loading}
            >
              <RefreshCw size={16} /> Atualizar
            </button>

            <Link to="/create-bin" className="primary-btn btn-sm">
              <CirclePlus /> Cadastrar PEV
            </Link>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-6 col-xl-3">
          <SummaryCard icon={<Archive size={24} />} label="Total de PEVs" value={summary.total} />
        </div>

        <div className="col-md-6 col-xl-3">
          <SummaryCard icon={<MapPin size={24} />} label="Ativos" value={summary.active} />
        </div>

        <div className="col-md-6 col-xl-3">
          <SummaryCard icon={<Archive size={24} />} label="Cheios" value={summary.full} />
        </div>

        <div className="col-md-6 col-xl-3">
          <SummaryCard
            icon={<Truck size={24} />}
            label="Manutenção/Inativos"
            value={summary.unavailable}
          />
        </div>
      </div>

      <div className="card p-25">
        <div className="filter row g-4 mb-4">
          <div className="col-md-7">
            <div className="d-flex justify-content-start align-items-center flex-wrap gap-15">
              <select
                className="form-select"
                style={{ maxWidth: 180 }}
                value={binTypeFilter}
                onChange={(event) => {
                  setBinTypeFilter(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Todos os tipos</option>
                {BIN_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <select
                className="form-select"
                style={{ maxWidth: 190 }}
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Todos os status</option>
                {BIN_STATUS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>

              <button type="button" className="outline-btn btn-sm" onClick={handleClearFilters}>
                Limpar filtros
              </button>
            </div>
          </div>

          <div className="col-md-5">
            <div className="d-flex justify-content-lg-end align-items-center">
              <div className="filter-section search">
                <div className="icon">
                  <Search />
                </div>
                <input
                  className="form-control"
                  type="text"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar por código, local, zona ou veículo..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>SN</th>
                <th>Foto</th>
                <th>Código</th>
                <th>Tipo</th>
                <th>Localização</th>
                <th>Zona</th>
                <th>Veículo</th>
                <th>Capacidade</th>
                <th>Última Coleta</th>
                <th>Status</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>

            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-4 text-muted">
                    Nenhum PEV encontrado.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  const photoUrl = getPhotoUrl(row);
                  const status = getStatusConfig(row.status);

                  return (
                    <tr key={row.id}>
                      <td>{row.sn}</td>
                      <td>
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={`PEV ${row.bin_id || ''}`}
                            style={{
                              width: 44,
                              height: 44,
                              objectFit: 'cover',
                              borderRadius: 10,
                              border: '1px solid #e5e7eb',
                            }}
                          />
                        ) : (
                          <div
                            className="d-flex align-items-center justify-content-center"
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              background: '#f3f4f6',
                            }}
                          >
                            <ImageIcon size={18} />
                          </div>
                        )}
                      </td>
                      <td>{row.bin_id || 'N/A'}</td>
                      <td>{getBinTypeLabel(row.bin_type)}</td>
                      <td>{row.location || 'N/A'}</td>
                      <td>{getZoneLabel(row.zone)}</td>
                      <td>{getVehicleLabel(row.vehicle)}</td>
                      <td>
                        {row.capacity_kg
                          ? `${Number(row.capacity_kg).toLocaleString('pt-BR')} kg`
                          : 'N/A'}
                      </td>
                      <td>{formatDate(row.last_collection_date)}</td>
                      <td>
                        <span className={`status ${status.className}`}>{status.label}</span>
                      </td>
                      <td>
                        <div className="actions d-flex justify-content-center align-items-center gap-10">
                          <Link
                            to={`/edit-bin/${row.id}`}
                            className="action-button edit"
                            title="Editar"
                          >
                            <Pencil />
                          </Link>

                          <button
                            type="button"
                            className="action-button delete"
                            title="Excluir"
                            data-bs-toggle="modal"
                            data-bs-target="#deleteModal"
                            onClick={() => setDeleteId(row.id)}
                            disabled={deleting}
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="d-flex justify-content-between align-items-center flex-wrap gap-15 mt-3">
          <div className="d-flex align-items-center gap-10">
            <span>
              Exibindo {filteredData.length === 0 ? 0 : startIndex + 1} - {endIndex} de{' '}
              {filteredData.length}
            </span>

            <select
              className="form-select"
              style={{ width: 80 }}
              value={rowsPerPage}
              onChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="d-flex align-items-center gap-10">
            <button
              type="button"
              className="btn btn-light"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              Anterior
            </button>

            <button
              type="button"
              className="btn btn-light"
              disabled={currentPage >= totalPages || filteredData.length === 0}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            >
              Próximo
            </button>
          </div>
        </div>
      </div>

      <DeleteModal handleDelete={handleDelete} />
    </>
  );
};

export default BinList;