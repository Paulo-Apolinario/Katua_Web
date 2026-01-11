import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { House, ChevronRight, CirclePlus, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import DeleteModal from '../../components/modal/DeleteModal';
import { getStaffDocuments, deleteDocument } from '../../services/staffDocumentService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const StaffDocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getStaffDocuments();
        if (response.success) {
          // Add serial number (sn) to each record
          const dataWithSn = response.data.map((item, index) => ({
            ...item,
            sn: index + 1,
          }));
          setDocuments(dataWithSn);
        } else {
          toast.error('Failed to load documents');
        }
      } catch (error) {
        toast.error('Error fetching documents');
        console.error('Fetch error:', error);
      } finally {
          setLoading(false);
      }

    };
    fetchData();
  }, []);

  // Filter document records based on search input
  const filteredData = documents.filter(
    (item) =>
      item.staff?.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'sn', label: 'SN' },
    {
      key: 'staff_id',
      label: 'Staff Name',
      render: (value, row) => row.staff?.name || 'N/A',
    },
    {
      key: 'document_type',
      label: 'Document Type',
      render: (value) => value || 'N/A',
    },
    {
      key: 'document_number',
      label: 'Document Number',
      render: (value) => value || 'N/A',
    },
    {
      key: 'issue_date',
      label: 'Issue Date',
      render: (value) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
    },
    {
      key: 'expiry_date',
      label: 'Expiry Date',
      render: (value) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
    },
  ];

  // Handle delete action
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await deleteDocument(deleteId);
      if (response.success) {
        // Update document list and reassign SN after deletion
        setDocuments((prev) =>
          prev.filter((item) => item.id !== deleteId).map((item, index) => ({
            ...item,
            sn: index + 1,
          }))
        );
        toast.success(response.message || 'Staff document deleted successfully');
        setDeleteId(null);
      } else {
        toast.error(response.message || 'Failed to delete staff document');
      }
    } catch (error) {
      toast.error('Error deleting staff document');
      console.error('Delete error:', error);
    }
  };

  return (
    <>
      <HeadTags title="Staff Document" />
      <TopProgressBar loading={loading} />
      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Staff Document</h3>
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
                  <li className="breadcrumb-item active">Staff Document</li>
                </ol>
              </nav>
            </div>
            <Link to="/create-staff-document" className="primary-btn btn-sm">
              <CirclePlus /> Create Document
            </Link>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-12">
          <div className="card p-25">
            <div className="filter d-flex justify-content-end mb-3">
              <div className="filter-section search">
                <div className="icon">
                  <Search />
                </div>
                <input
                  className="form-control"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by staff name...."
                />
              </div>
            </div>
            <DataTable
              data={filteredData}
              columns={columns}
              currentPage={currentPage}
              rowsPerPage={rowsPerPage}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={(n) => {
                setRowsPerPage(n);
                setCurrentPage(1);
              }}
              renderActions={(row) => (
                <div className="actions d-flex align-items-center gap-10">
                  <Link to={`/edit-staff-document/${row.id}`} className="action-button edit">
                    <Pencil />
                  </Link>
                  <button
                    className="action-button delete"
                    data-bs-toggle="modal"
                    data-bs-target="#deleteModal"
                    onClick={() => setDeleteId(row.id)}
                    >
                    <Trash2 />
                  </button>
                </div>
              )}
            />
          </div>
        </div>
      </div>
      <DeleteModal handleDelete={handleDelete} />
    </>
  );
};

export default StaffDocumentList;
