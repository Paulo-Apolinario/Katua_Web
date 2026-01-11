import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { House, ChevronRight, CirclePlus, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import DeleteModal from '../../components/modal/DeleteModal';
import { getAllAttendances, deleteAttendance } from '../../services/staffAttendanceService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const StaffAttendanceList = () => {
  const [attendances, setAttendances] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch attendance records on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getAllAttendances();
        if (response.success) {
          const dataWithSn = response.data.map((item, index) => ({
            ...item,
            sn: index + 1,
          }));
          setAttendances(dataWithSn);
        } else {
          toast.error('Failed to load attendances');
        }
      } catch (error) {
        toast.error('Error fetching attendances');
        console.error('Fetch error:', error);
      } finally {
          setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter attendance records based on search input
  const filteredData = attendances.filter(
    (item) =>
      item.staff?.name.toLowerCase().includes(search.toLowerCase()) ||
      item.route?.route_name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'sn', label: 'SN' },
    {
      key: 'staff_id',
      label: 'Staff Name',
      render: (value, row) => row.staff?.name || 'N/A',
    },
    {
      key: 'attendance_date',
      label: 'Attendance Date',
      render: (value) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
    },
    {
      key: 'route_id',
      label: 'Route Name',
      render: (value, row) => row.route?.name || 'N/A',
    },
    {
      key: 'role',
      label: 'Role',
      render: (value) => value || 'N/A',
    },
    {
      key: 'attendance_status',
      label: 'Attendance Status',
      render: (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'),
    },
    {
        key: 'attendance_status',
          label: 'Attendance Status',
          render: (value) => {
            let statusClass = 'status';
            if (value === 'present') statusClass += ' status-success';
            else if (value === 'leave') statusClass += ' status-warning';
            else statusClass += ' status-danger';
            return <span className={statusClass}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>;
        },
    },
    {
      key: 'check_in_time',
      label: 'Check-in Time',
      render: (value) => (value ? value : 'N/A'),
    },
    {
      key: 'check_out_time',
      label: 'Check-out Time',
      render: (value) => (value ? value : 'N/A'),
    },
    {
      key: 'leave_type',
      label: 'Leave Type',
      render: (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'),
    },
  ];

  // Handle delete action
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await deleteAttendance(deleteId);
      if (response.success) {
        // Update attendance list and reassign SN after deletion
        setAttendances((prev) =>
          prev.filter((item) => item.id !== deleteId).map((item, index) => ({
            ...item,
            sn: index + 1,
          }))
        );
        toast.success('Attendance deleted successfully');
        setDeleteId(null);
      } else {
        toast.error(response.message || 'Failed to delete attendance');
      }
    } catch (error) {
      toast.error('Error deleting attendance');
      console.error('Delete error:', error);
    }
  };

  return (
    <>
      <HeadTags title="Staff Attendance" />
      <TopProgressBar loading={loading} />
      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Staff Attendance</h3>
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
                  <li className="breadcrumb-item active">Staff Attendance</li>
                </ol>
              </nav>
            </div>
            <Link to="/create-attendance" className="primary-btn btn-sm">
              <CirclePlus /> Create Attendance
            </Link>
          </div>
        </div>
      </div>
      <div className="row mb-4">
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
                  placeholder="Search by staff name or route..."
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
                  <Link to={`/edit-attendance/${row.id}`} className="action-button edit">
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

export default StaffAttendanceList;