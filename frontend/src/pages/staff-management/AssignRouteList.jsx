import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { House, ChevronRight, CirclePlus, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import DeleteModal from '../../components/modal/DeleteModal';
import { getAllAssignments, deleteAssignment } from '../../services/routeAssignmentService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const AssignRouteList = () => {
  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch assignment records on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getAllAssignments();
        console.log(response);
        if (response.success) {
          // Add serial number (sn) to each record
          const dataWithSn = response.data.map((item, index) => ({
            ...item,
            sn: index + 1,
          }));
          setAssignments(dataWithSn);
        } else {
          toast.error('Failed to load assignments');
        }
      } catch (error) {
        toast.error('Error fetching assignments');
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter assignment records based on search input
  const filteredData = assignments.filter(
    (item) =>
      item.route?.name.toLowerCase().includes(search.toLowerCase()) ||
      item.staff?.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'sn', label: 'SN' },
    {
      key: 'route_id',
      label: 'Route Name',
      render: (value, row) => row.route?.name || 'N/A',
    },
    {
      key: 'staff_id',
      label: 'Staff Name',
      render: (value, row) => row.staff?.name || 'N/A',
    },
    {
      key: 'role',
      label: 'Role',
      render: (value) => value || 'N/A',
    },
    {
      key: 'vehicle_id',
      label: 'Vehicle',
      render: (value, row) => row.vehicle?.vehicle_number || 'N/A',
    },
    {
      key: 'assignment_start_at',
      label: 'Assignment Start Date',
      render: (value) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
    },
    {
      key: 'shift',
      label: 'Shift',
      render: (value) => value || 'N/A',
    },
    {
        key: 'status',
          label: 'Status',
          render: (value) => {
            let statusClass = 'status';
            if (value === 'completed') statusClass += ' status-success';
            else if (value === 'pending') statusClass += ' status-warning';
            else statusClass += ' status-danger';
            return <span className={statusClass}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>;
        },
    },
  ];

  // Handle delete action
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await deleteAssignment(deleteId);
      if (response.success) {
        setAssignments((prev) =>
          prev.filter((item) => item.id !== deleteId).map((item, index) => ({
            ...item,
            sn: index + 1,
          }))
        );
        toast.success('Route assignment deleted successfully');
        setDeleteId(null);
      } else {
        toast.error(response.message || 'Failed to delete route assignment');
      }
    } catch (error) {
      toast.error('Error deleting route assignment');
      console.error('Delete error:', error);
    }
  };

  return (
    <>
      <HeadTags title="Assign List" />
      <TopProgressBar loading={loading} />
      <DeleteModal handleDelete={handleDelete} />
      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Assign List</h3>
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
                  <li className="breadcrumb-item active">Assign List</li>
                </ol>
              </nav>
            </div>
            <Link to="/create-assign" className="primary-btn btn-sm">
              <CirclePlus /> Create Assign
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
                  placeholder="Search by route or staff name..."
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
                  <Link to={`/edit-assign/${row.id}`} className="action-button edit">
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
    </>
  );
};

export default AssignRouteList;