import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  House,
  ChevronRight,
  CirclePlus,
  Trash2,
  Search,
  Pencil,
  RefreshCw,
  Wrench,
  CalendarClock,
  CheckCircle,
  AlertTriangle,
  FileText,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

import DeleteModal from '../../components/modal/DeleteModal';
import {
  getAllMaintenanceLogs,
  deleteMaintenanceLog,
} from '../../services/maintenanceLogService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const MAINTENANCE_STATUS = [
  { value: 'completed', label: 'Concluída', className: 'status-success' },
  { value: 'pending', label: 'Pendente', className: 'status-warning' },
  { value: 'scheduled', label: 'Agendada', className: 'status-info' },
  { value: 'overdue', label: 'Atrasada', className: 'status-danger' },
];

const getStatusConfig = (value) => {
  return (
    MAINTENANCE_STATUS.find((item) => item.value === value) || {
      label: value || 'N/A',
      className: 'status-danger',
    }
  );
};

const getVehicleLabel = (vehicle) => {
  if (!vehicle) return 'N/A';

  return (
    vehicle.vehicle_number ||
    vehicle.plate ||
    vehicle.name ||
    vehicle.model ||
    `Veículo ${vehicle.id || ''}`.trim()
  );
};

const formatDate = (value) => {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleDateString('pt-BR');
};

const formatMoney = (value) => {
  if (!value) return 'N/A';

  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const getInvoiceUrl = (file) => {
  if (!file) return null;

  if (String(file).startsWith('http')) return file;

  return `${import.meta.env.VITE_API_BASE_URL}/images/vehicle_invoice/${file}`;
};

const MaintenanceLogList = () => {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const response = await getAllMaintenanceLogs();

      if (response?.success) {
        const list = Array.isArray(response.data) ? response.data : [];

        setLogs(
          list.map((item, index) => ({
            ...item,
            sn: index + 1,
          }))
        );

        return;
      }

      toast.error(response?.message || 'Não foi possível carregar as manutenções.');
    } catch (error) {
      console.error('Erro ao carregar manutenções:', error);
      toast.error(error?.message || 'Erro ao carregar manutenções.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();

    return logs.filter((item) => {
      const vehicle = String(getVehicleLabel(item.vehicle)).toLowerCase();
      const type = String(item.maintenance_type || '').toLowerCase();
      const location = String(item.location || '').toLowerCase();
      const performedBy = String(item.performed_by || '').toLowerCase();

      const matchesSearch =
        !term ||
        vehicle.includes(term) ||
        type.includes(term) ||
        location.includes(term) ||
        performedBy.includes(term);

      const matchesStatus = !statusFilter || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [logs, search, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: logs.length,
      completed: logs.filter((item) => item.status === 'completed').length,
      scheduled: logs.filter((item) => item.status === 'scheduled').length,
      pending:
        logs.filter((item) => item.status === 'pending').length +
        logs.filter((item) => item.status === 'overdue').length,
    };
  }, [logs]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const startIndex = filteredData.length === 0 ? 0 : (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredData.length);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);

      const response = await deleteMaintenanceLog(deleteId);

      if (response?.success) {
        setLogs((prev) =>
          prev
            .filter((item) => item.id !== deleteId)
            .map((item, index) => ({
              ...item,
              sn: index + 1,
            }))
        );

        toast.success(response.message || 'Manutenção excluída com sucesso.');
        setDeleteId(null);
        return;
      }

      toast.error(response?.message || 'Não foi possível excluir a manutenção.');
    } catch (error) {
      console.error('Erro ao excluir manutenção:', error);
      toast.error(error?.message || 'Erro ao excluir manutenção.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <HeadTags title="Manutenções | KATUÁ" />
      <TopProgressBar loading={loading || deleting} />
      <DeleteModal handleDelete={handleDelete} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Manutenções</h3>
          <p className="mb-0 text-muted">
            Acompanhe manutenções realizadas, agendadas, pendentes e documentos anexados.
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

                <li className="breadcrumb-item active">Manutenções</li>
              </ol>
            </nav>
          </div>

          <div className="d-flex align-items-center gap-10 flex-wrap">
            <button
              type="button"
              className="outline-btn btn-sm"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw size={16} /> Atualizar
            </button>

            <Link to="/create-maintenance" className="primary-btn btn-sm">
              <CirclePlus /> Criar Manutenção
            </Link>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="card p-20 h-100">
            <div className="d-flex align-items-center gap-12">
              <Wrench size={24} />
              <div>
                <p className="mb-1 text-muted">Total</p>
                <h4 className="mb-0">{summary.total}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-20 h-100">
            <div className="d-flex align-items-center gap-12">
              <CheckCircle size={24} />
              <div>
                <p className="mb-1 text-muted">Concluídas</p>
                <h4 className="mb-0">{summary.completed}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-20 h-100">
            <div className="d-flex align-items-center gap-12">
              <CalendarClock size={24} />
              <div>
                <p className="mb-1 text-muted">Agendadas</p>
                <h4 className="mb-0">{summary.scheduled}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-20 h-100">
            <div className="d-flex align-items-center gap-12">
              <AlertTriangle size={24} />
              <div>
                <p className="mb-1 text-muted">Pendentes/Atrasadas</p>
                <h4 className="mb-0">{summary.pending}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-25">
        <div className="filter row g-4 mb-4">
          <div className="col-md-7">
            <div className="d-flex justify-content-start align-items-center flex-wrap gap-15">
              <select
                className="form-select"
                style={{ maxWidth: 220 }}
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Todos os status</option>

                {MAINTENANCE_STATUS.map((status) => (
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
                  placeholder="Buscar por veículo, tipo, local ou oficina..."
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
                <th>Veículo</th>
                <th>Tipo</th>
                <th>Local</th>
                <th>Data</th>
                <th>Próxima</th>
                <th>Custo</th>
                <th>Responsável</th>
                <th>Status</th>
                <th>Nota/Fatura</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>

            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-4 text-muted">
                    Nenhuma manutenção encontrada.
                  </td>
                </tr>
              ) : (
                paginatedData.map((log) => {
                  const status = getStatusConfig(log.status);
                  const invoiceUrl = getInvoiceUrl(log.file);

                  return (
                    <tr key={log.id}>
                      <td>{log.sn}</td>
                      <td>{getVehicleLabel(log.vehicle)}</td>
                      <td>{log.maintenance_type || 'N/A'}</td>
                      <td>{log.location || 'N/A'}</td>
                      <td>{formatDate(log.maintenance_date)}</td>
                      <td>{formatDate(log.next_maintenance_date)}</td>
                      <td>{formatMoney(log.cost)}</td>
                      <td>{log.performed_by || 'N/A'}</td>

                      <td>
                        <span className={`status ${status.className}`}>{status.label}</span>
                      </td>

                      <td>
                        {invoiceUrl ? (
                          <a
                            href={invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="d-inline-flex align-items-center gap-2"
                          >
                            <FileText size={16} />
                            Ver arquivo
                            <ExternalLink size={14} />
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </td>

                      <td>
                        <div className="actions d-flex justify-content-center align-items-center gap-10">
                          <Link
                            to={`/edit-maintenance/${log.id}`}
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
                            onClick={() => setDeleteId(log.id)}
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
    </>
  );
};

export default MaintenanceLogList;