import { useState, useEffect } from 'react';
import { Link } from "react-router";
import { House, ChevronRight, CirclePlus, Trash2, Search, Pencil } from "lucide-react";
import DataTable from "../../components/DataTable";
import DeleteModal from "../../components/modal/DeleteModal";
import { getAllRoutes, deleteRoute } from '../../services/routeService';
import toast from 'react-hot-toast';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const RouteList = () => {
    const [routes, setRoutes] = useState([]);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [deleteId, setDeleteId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch route records on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getAllRoutes();
                if (response.success) {
                    // Add serial number (sn) to each record
                    const dataWithSn = response.data.map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }));
                    setRoutes(dataWithSn);
                } else {
                    toast.error('Failed to load routes');
                }
            } catch (error) {
                toast.error('Error fetching routes');
                console.error('Fetch error:', error);
            } finally {
              setLoading(false);
           }
        };
        fetchData();
    }, []);


    // Filter route records based on search input
    const filteredData = routes.filter(
        (item) =>
            item.name.toLowerCase().includes(search.toLowerCase())
    );

    // Define table columns with SN
    const columns = [
        { key: 'sn', label: 'SN' },
        { key: 'name', label: 'Route Name' },
        {
            key: 'zone_id',
            label: 'Zone/Area Name',
            render: (value, row) => row.zone?.name || 'N/A',
        },
        {
            key: 'vehicle_id',
            label: 'Vehicle',
            render: (value, row) => row.vehicle?.vehicle_number || 'N/A',
        },
        {
            key: 'staff_id',
            label: 'Driver Name',
            render: (value, row) => row.staff?.name || 'N/A',
        },
        {
            key: 'estimated_time',
            label: 'Estimated Time',
            render: (value) => value || 'N/A',
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => {
                const statusClass = `status ${value === 'active' ? 'status-success' : 'status-warning'}`;
                return <span className={statusClass}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>;
            },
        },
    ];

    // Handle delete action
    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            const response = await deleteRoute(deleteId);
            if (response.success) {
                // Update route list and reassign SN after deletion
                setRoutes((prev) =>
                    prev.filter((item) => item.id !== deleteId).map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }))
                );
                toast.success('Route deleted successfully');
                setDeleteId(null);
            } else {
                toast.error(response.message || 'Failed to delete route');
            }
        } catch (error) {
            toast.error('Error deleting route');
            console.error('Delete error:', error);
        }
    };

    return (
        <>
           <HeadTags title="Route List" />
           <TopProgressBar loading={loading} />
            <DeleteModal handleDelete={handleDelete} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Route List</h3>
                    <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
                        <div className="breadcrumb-wrap">
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb pb-0 mb-0">
                                    <li className="breadcrumb-item"><Link to="/" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                    <li className="breadcrumb-item"><ChevronRight /></li>
                                    <li className="breadcrumb-item active">Route List</li>
                                </ol>
                            </nav>
                        </div>
                        <Link to="/create-route" className="primary-btn btn-sm"><CirclePlus />Create Route</Link>
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
                                    placeholder="Search by route name..."
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
                                    <Link to={`/edit-route/${row.id}`} className="action-button edit">
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
    )
}

export default RouteList;