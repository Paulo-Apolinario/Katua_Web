import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { House, ChevronRight, CirclePlus, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import DeleteModal from '../../components/modal/DeleteModal';
import { getAllVehicles, deleteVehicle } from '../../services/vehicleService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const VehicleList = () => {
  
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch vehicle records on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getAllVehicles();
        if (response.success) {
          // Add serial number (sn) to each record
          const dataWithSn = response.data.map((item, index) => ({
            ...item,
            sn: index + 1,
          }));
          setVehicles(dataWithSn);
        } else {
          toast.error('Failed to load vehicles');
        }
      } catch (error) {
        toast.error('Error fetching vehicles');
        console.error('Fetch error:', error);
       } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter vehicle records based on search input
  const filteredData = vehicles.filter(
    (item) =>
      item.vehicle_number.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'sn', label: 'SN' },
    {
      key: 'vehicle_number',
      label: 'Vehicle Number',
      render: (value) => value || 'N/A',
    },
    {
      key: 'vehicle_type',
      label: 'Vehicle Type',
      render: (value) => value || 'N/A',
    },
    {
      key: 'zone_id',
      label: 'Assigned Zone',
      render: (value, row) => row.zone?.name || 'N/A',
    },
    {
      key: 'staff_id',
      label: 'Driver Name',
      render: (value, row) => row.staff?.name || 'N/A',
    },
    {
      key: 'capacity_kg',
      label: 'Capacity (KG)',
      render: (value) => (value ? `${value} KG` : 'N/A'),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => {
        let statusClass = 'status';
        if (value === 'active') statusClass += ' status-success';
        else if (value === 'maintenance') statusClass += ' status-warning';
        else statusClass += ' status-danger';
       return <span className={statusClass}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>;
      },
    },
  ];

  // Handle delete action
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await deleteVehicle(deleteId);
      if (response.success) {
        // Update vehicle list and reassign SN after deletion
        setVehicles((prev) =>
          prev.filter((item) => item.id !== deleteId).map((item, index) => ({
            ...item,
            sn: index + 1,
          }))
        );
        toast.success(response.message || 'Deleted successfully');
        setDeleteId(null);
      } else {
        toast.error(response.message || 'Failed to delete vehicle');
      }
    } catch (error) {
      toast.error('Error deleting vehicle');
    }
  };

  return (
    <>
      <HeadTags title="Vehicle List" />
      <TopProgressBar loading={loading} />
      <DeleteModal handleDelete={handleDelete} />
      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Vehicle List</h3>
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
                  <li className="breadcrumb-item active">Vehicle List</li>
                </ol>
              </nav>
            </div>
            <Link to="/create-vehicle" className="primary-btn btn-sm">
              <CirclePlus /> Create Vehicle
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
                  placeholder="Search by vehicle number..."
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
                  <Link to={`/edit-vehicle/${row.id}`} className="action-button edit">
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

export default VehicleList;