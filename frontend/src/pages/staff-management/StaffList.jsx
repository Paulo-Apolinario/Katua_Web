import { useState, useEffect } from 'react';
import { Link } from "react-router";
import { House, ChevronRight, CirclePlus, Pencil, Trash2, Search } from 'lucide-react';
import DataTable from "../../components/DataTable";
import DeleteModal from "../../components/modal/DeleteModal";
import toast from 'react-hot-toast';
import { getAllStaff, deleteStaff } from '../../services/staffService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const StaffList = () => {
    const [staffs, setStaffs] = useState([]);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [deleteId, setDeleteId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getAllStaff();
                if (response.success) {
                    // Add serial number (sn) to each record
                    const dataWithSn = response.data.map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }));
                    setStaffs(dataWithSn);
                } else {
                    toast.error(response.message || 'Failed to load staff records');
                }
            } catch (error) {
                toast.error('Error fetching staff records');
                console.error('Fetch error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filter staff records based on search input
    const filteredData = staffs.filter(
        (item) =>
            item.name.toLowerCase().includes(search.toLowerCase())
    )

    const columns = [
        { key: 'sn', label: 'SN' },
        { key: 'name', label: 'Staff Name' },
        { key: 'role', label: 'Role' },
        { key: 'phone', label: 'Phone Number' },
        {
            key: 'joining_date',
            label: 'Joining Date',
            render: (value) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
        },
        { key: 'email', label: 'Email', render: (value) => value || 'N/A' },
        {
            key: 'vehicle_id',
            label: 'Assigned Vehicle',
            render: (value, row) => row.vehicle?.vehicle_number || 'N/A',
        },
        {
            key: 'file',
            label: 'Profile',
            render: (value) => (value ? (
                <a href={`${import.meta.env.VITE_API_BASE_URL}/uploads/staff_image/${value}`} target="_blank" rel="noopener noreferrer">
                    View
                </a>
            ) : 'N/A'),
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => {
                let statusClass = 'status';
                if (value === 'active') statusClass += ' status-success';
                else if (value === 'suspended') statusClass += ' status-warning';
                else statusClass += ' status-danger';
                return <span className={statusClass}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>;
            },
        },
    ];

    // Handle delete action
    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            const response = await deleteStaff(deleteId);
            if (response.success) {
                // Update staff list and reassign SN after deletion
                setStaffs((prev) =>
                    prev.filter((item) => item.id !== deleteId).map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }))
                );
                toast.success('Deleted successfully');
                setDeleteId(null);
            } else {
                toast.error(response.message || 'Failed to delete staff');
            }
        } catch (error) {
            toast.error('Error deleting staff');
            console.error('Delete error:', error);
        }
    };


    return (
        <>
            <HeadTags title="Staff List" />
            <TopProgressBar loading={loading} />
            <DeleteModal handleDelete={handleDelete} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Staff List</h3>
                    <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
                        <div className="breadcrumb-wrap">
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb pb-0 mb-0">
                                    <li className="breadcrumb-item"><Link to="/" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                    <li className="breadcrumb-item"><ChevronRight /></li>
                                    <li className="breadcrumb-item active">Staff List</li>
                                </ol>
                            </nav>
                        </div>
                        <Link to="/create-staff" className="primary-btn btn-sm"><CirclePlus />Create Staff</Link>
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
                                    placeholder="Search by staff name..."
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
                                    <Link to={`/edit-staff/${row.id}`} className="action-button edit"><Pencil /></Link>
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

export default StaffList;