import { useState, useEffect } from 'react';
import { Link } from "react-router";
import { House, ChevronRight, CirclePlus, Trash2, Search, Pencil } from "lucide-react";
import DataTable from "../../components/DataTable";
import DeleteModal from "../../components/modal/DeleteModal";
import { getAllMaintenanceLogs, deleteMaintenanceLog } from '../../services/maintenanceLogService';
import toast from 'react-hot-toast';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const MaintenanceLogList = () => {

    const [logs, setLogs] = useState([]);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [deleteId, setDeleteId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getAllMaintenanceLogs();

                if (response.success) {
                    // Add serial number (sn) to each record
                    const dataWithSn = response.data.map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }));
                    setLogs(dataWithSn);
                } else {
                    toast.error('Failed to load vehicle document');
                }
            } catch (error) {
                toast.error('Error fetchings vehicle document');
            } finally {
              setLoading(false);
           }
        };
        fetchData();
    }, []);

    // Filter logs based on search input
    const filteredData = logs.filter(
        (item) =>
            item.vehicle?.vehicle_number.toLowerCase().includes(search.toLowerCase())
    );

    const columns = [
        { key: 'sn', label: 'SN' },
        {
            key: 'vehicle_id',
            label: 'Vehicle Number',
            render: (value, row) => row.vehicle?.vehicle_number || 'N/A',
        },
        { key: 'maintenance_type', label: 'Maintenance Type' },
        { key: 'location', label: 'Location' },
        {
            key: 'maintenance_date',
            label: 'Maintenance Date',
            render: (value) => (value ? new Date(value).toLocaleString() : 'N/A'),
        },
        {
            key: 'next_maintenance_date',
            label: 'Next Maintenance Date',
            render: (value) => (value ? new Date(value).toLocaleString() : 'N/A'),
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => {
                let statusClass = 'status';
                if (value === 'completed') statusClass += ' status-success';
                else if (value === 'pending') statusClass += ' status-warning';
                else if (value === 'scheduled') statusClass += ' status-info';
                else statusClass += ' status-danger';
                return <span className={statusClass}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>;
            },
        },
        {
            key: 'file',
            label: 'Invoice',
            render: (value) => (value ? (
                <a href={`${import.meta.env.VITE_API_BASE_URL}/images/vehicle_invoice/${value}`} target="_blank" rel="noopener noreferrer">
                    View
                </a>
            ) : 'N/A'),
        },
    ];

    // Handle delete action
    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            const response = await deleteMaintenanceLog(deleteId);
            if (response.success) {
                setLogs(logs.filter((item) => item.id !== deleteId));
                toast.success('Deleted successfully');
                setDeleteId(null);
            } else {
                toast.error(response.message || 'Failed to delete maintenance log');
            }
        } catch (error) {
            toast.error('Error deleting maintenance log');
            console.error('Delete error:', error);
        }
    };

    return (
        <>
            <HeadTags title="Maintenance Log" />
            <TopProgressBar loading={loading} />
            <DeleteModal handleDelete={handleDelete} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Maintenance Log</h3>
                    <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
                        <div className="breadcrumb-wrap">
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb pb-0 mb-0">
                                    <li className="breadcrumb-item"><Link to="/" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                    <li className="breadcrumb-item"><ChevronRight /></li>
                                    <li className="breadcrumb-item active">Maintenance Log</li>
                                </ol>
                            </nav>
                        </div>
                        <Link to="/create-maintenance" className="primary-btn btn-sm"><CirclePlus />Create log</Link>
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
                                    <Link to={`/edit-maintenance/${row.id}`} className="action-button edit"><Pencil /></Link>
                                    <button className="action-button delete" onClick={() => setDeleteId(row.id)} data-bs-toggle="modal" data-bs-target="#deleteModal"><Trash2 /></button>
                                </div>
                            )}
                        />
                    </div>
                </div>
            </div>

        </>
    )
}

export default MaintenanceLogList;