import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { House, ChevronRight, CirclePlus, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import DeleteModal from '../../components/modal/DeleteModal';
import { getAllBins, deleteBin } from '../../services/binService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const BinList = () => {
  const [bins, setBins] = useState([]);
  const [search, setSearch] = useState('');
  const [binTypeFilter, setBinTypeFilter] = useState('');
  const [statuses, setStatuses] = useState(['active','inactive','full']);
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getAllBins();
        if (response.success) {
          // Add serial number (sn) to each record
          const dataWithSn = response.data.map((item, index) => ({
            ...item,
            sn: index + 1,
          }));
          setBins(dataWithSn);
        } else {
          toast.error('Failed to load bins');
        }
      } catch (error) {
        toast.error('Error fetching bins');
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);


  // Filter data based on search and dropdown filters
    const filteredData = bins.filter((item) => {
        return (
            item.bin_id.toLowerCase().includes(search.toLowerCase()) &&
           (statusFilter === "" || item.status === statusFilter) &&
           (binTypeFilter === "" || item.bin_type === binTypeFilter)
        );
    });

  const columns = [
    { key: 'sn', label: 'SN' },
    { key: 'bin_id', label: 'Bin ID' },
    { key: 'bin_type', label: 'Bin Type', render: (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A' },
    { key: 'location', label: 'Location', render: (value) => value || 'N/A' },
    {
      key: 'zone_id',
      label: 'Assigned Zone',
      render: (value, row) => row.zone?.name || 'N/A',
    },
    {
      key: 'vehicle_id',
      label: 'Assigned Vehicle',
      render: (value, row) => row.vehicle?.vehicle_number || 'N/A',
    },
    {
      key: 'last_collection_date',
      label: 'Collection Date',
      render: (value) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
    },
    {
        key: 'status',
          label: 'Status',
          render: (value) => {
            let statusClass = 'status';
            if (value === 'active') statusClass += ' status-success';
            else if (value === 'full') statusClass += ' status-warning';
            else statusClass += ' status-danger';
            return <span className={statusClass}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>;
        },
    },
  ];

  // Handle delete action
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await deleteBin(deleteId);
      if (response.success) {
        // Update bin list and reassign SN after deletion
        setBins((prev) =>
          prev.filter((item) => item.id !== deleteId).map((item, index) => ({
            ...item,
            sn: index + 1,
          }))
        );
        toast.success('Bin deleted successfully');
        setDeleteId(null);
      } else {
        toast.error(response.message || 'Failed to delete bin');
      }
    } catch (error) {
      toast.error('Error deleting bin');
      console.error('Delete error:', error);
    }
  };

  return (
    <>
      <HeadTags title="Bin List" />
      <TopProgressBar loading={loading} />
      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Bin List</h3>
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
                  <li className="breadcrumb-item active">Bin List</li>
                </ol>
              </nav>
            </div>
            <Link to="/create-bin" className="primary-btn btn-sm">
              <CirclePlus /> Create Bin
            </Link>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-12">
          <div className="card p-25">
            <div className="filter row g-4 mb-3">
              <div className="col-md-6">
                <div className="d-flex justify-content-start align-items-center flex-wrap gap-15">
                  <div className="filter-section">
                    <select
                      className="form-select"
                      value={binTypeFilter}
                      onChange={(e) => setBinTypeFilter(e.target.value)}
                    >
                      <option value="">All Bin Types</option>
                      {['recyclable', 'non-recyclable', 'organic'].map((type,index) => (
                        <option key={index} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                 
                  <div className="filter-section">
                    <select
                      className="form-select"
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      aria-label="Status select"
                    >
                      <option value="">All Status</option>
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                 
                </div>
              </div>
              <div className="col-md-6">
                <div className="d-flex justify-content-lg-end align-items-center flex-wrap gap-15">
                  <div className="filter-section search">
                    <div className="icon">
                      <Search />
                    </div>
                    <input
                      className="form-control"
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by bin id..."
                    />
                  </div>
                </div>
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
                  <Link to={`/edit-bin/${row.id}`} className="action-button edit">
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

export default BinList;