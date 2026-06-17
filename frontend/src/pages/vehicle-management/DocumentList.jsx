import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  House,
  ChevronRight,
  CirclePlus,
  Trash2,
  Search,
  Pencil,
  FileText,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

import DeleteModal from '../../components/modal/DeleteModal';
import {
  getVehicleDocuments,
  deleteVehicleDocument,
} from '../../services/vehicleDocumentService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const DOCUMENT_TYPES = [
  { value: 'insurance', label: 'Seguro' },
  { value: 'pollution', label: 'Certificado Ambiental/Emissões' },
  { value: 'registration', label: 'Registro do Veículo' },
  { value: 'permit', label: 'Licença/Autorização' },
  { value: 'tax', label: 'Taxas/Tributos' },
  { value: 'inspection', label: 'Vistoria' },
  { value: 'maintenance', label: 'Documento de Manutenção' },
  { value: 'others', label: 'Outros' },
];

const getDocumentTypeLabel = (value) => {
  return DOCUMENT_TYPES.find((item) => item.value === value)?.label || value || 'N/A';
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

const getDocumentFileUrl = (file) => {
  if (!file) return null;

  if (String(file).startsWith('http')) return file;

  return `${import.meta.env.VITE_API_BASE_URL}/uploads/vehicle_documents/${file}`;
};

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);

      const response = await getVehicleDocuments();

      if (response?.success) {
        const list = Array.isArray(response.data) ? response.data : [];

        setDocuments(
          list.map((item, index) => ({
            ...item,
            sn: index + 1,
          }))
        );

        return;
      }

      toast.error(response?.message || 'Não foi possível carregar os documentos.');
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      toast.error(error?.message || 'Erro ao carregar documentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();

    return documents.filter((item) => {
      const vehicle = String(getVehicleLabel(item.vehicle)).toLowerCase();
      const documentNumber = String(item.document_number || '').toLowerCase();
      const documentType = String(getDocumentTypeLabel(item.document_type)).toLowerCase();

      const matchesSearch =
        !term ||
        vehicle.includes(term) ||
        documentNumber.includes(term) ||
        documentType.includes(term);

      const matchesType = !documentTypeFilter || item.document_type === documentTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [documents, search, documentTypeFilter]);

  const summary = useMemo(() => {
    const now = new Date();

    const expired = documents.filter((item) => {
      if (!item.expiry_date) return false;
      return new Date(item.expiry_date) < now;
    }).length;

    const withExpiry = documents.filter((item) => item.expiry_date).length;

    return {
      total: documents.length,
      withExpiry,
      expired,
      withoutExpiry: documents.length - withExpiry,
    };
  }, [documents]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const startIndex = filteredData.length === 0 ? 0 : (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredData.length);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const handleClearFilters = () => {
    setSearch('');
    setDocumentTypeFilter('');
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);

      const response = await deleteVehicleDocument(deleteId);

      if (response?.success) {
        setDocuments((prev) =>
          prev
            .filter((item) => item.id !== deleteId)
            .map((item, index) => ({
              ...item,
              sn: index + 1,
            }))
        );

        toast.success(response.message || 'Documento excluído com sucesso.');
        setDeleteId(null);
        return;
      }

      toast.error(response?.message || 'Não foi possível excluir o documento.');
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      toast.error(error?.message || 'Erro ao excluir documento.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <HeadTags title="Documentos | KATUÁ" />
      <TopProgressBar loading={loading || deleting} />
      <DeleteModal handleDelete={handleDelete} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Documentos</h3>
          <p className="mb-0 text-muted">
            Gerencie documentos, licenças, registros e anexos vinculados aos veículos.
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

                <li className="breadcrumb-item active">Documentos</li>
              </ol>
            </nav>
          </div>

          <div className="d-flex align-items-center gap-10 flex-wrap">
            <button
              type="button"
              className="outline-btn btn-sm"
              onClick={fetchDocuments}
              disabled={loading}
            >
              <RefreshCw size={16} /> Atualizar
            </button>

            <Link to="/create-document" className="primary-btn btn-sm">
              <CirclePlus /> Criar Documento
            </Link>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="card p-20 h-100">
            <p className="mb-1 text-muted">Total</p>
            <h4 className="mb-0">{summary.total}</h4>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-20 h-100">
            <p className="mb-1 text-muted">Com vencimento</p>
            <h4 className="mb-0">{summary.withExpiry}</h4>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-20 h-100">
            <p className="mb-1 text-muted">Vencidos</p>
            <h4 className="mb-0">{summary.expired}</h4>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-20 h-100">
            <p className="mb-1 text-muted">Sem vencimento</p>
            <h4 className="mb-0">{summary.withoutExpiry}</h4>
          </div>
        </div>
      </div>

      <div className="card p-25">
        <div className="filter row g-4 mb-4">
          <div className="col-md-7">
            <div className="d-flex justify-content-start align-items-center flex-wrap gap-15">
              <select
                className="form-select"
                style={{ maxWidth: 240 }}
                value={documentTypeFilter}
                onChange={(event) => {
                  setDocumentTypeFilter(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Todos os tipos</option>

                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
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
                  placeholder="Buscar por veículo, número ou tipo..."
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
                <th>Número</th>
                <th>Emissão</th>
                <th>Vencimento</th>
                <th>Arquivo</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>

            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">
                    Nenhum documento encontrado.
                  </td>
                </tr>
              ) : (
                paginatedData.map((document) => {
                  const fileUrl = getDocumentFileUrl(document.file);

                  return (
                    <tr key={document.id}>
                      <td>{document.sn}</td>

                      <td>{getVehicleLabel(document.vehicle)}</td>

                      <td>{getDocumentTypeLabel(document.document_type)}</td>

                      <td>{document.document_number || 'N/A'}</td>

                      <td>{formatDate(document.issue_date)}</td>

                      <td>{formatDate(document.expiry_date)}</td>

                      <td>
                        {fileUrl ? (
                          <a
                            href={fileUrl}
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
                            to={`/edit-document/${document.id}`}
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
                            onClick={() => setDeleteId(document.id)}
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

export default DocumentList;