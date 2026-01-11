import { useState, useEffect } from 'react';
import { Link } from "react-router";
import { House, ChevronRight, CirclePlus, Trash2, Search, Pencil } from "lucide-react";
import DataTable from "../../components/DataTable";
import DeleteModal from "../../components/modal/DeleteModal";
import { getAllZones, deleteZone } from '../../services/zoneService';
import toast from 'react-hot-toast';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const ZoneList = () => {

    const [zones, setZones] = useState([]);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [deleteId, setDeleteId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getAllZones();

                if (response.success) {
                    // Add serial number (sn) to each record
                    const dataWithSn = response.data.map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }));
                    setZones(dataWithSn);
                } else {
                    toast.error('Failed to load zone');
                }
            } catch (error) {
                toast.error('Error fetching zone');
                console.error('Fetch error:', error);
            } finally {
               setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filter zone records based on search input
    const filteredData = zones.filter(
        (item) =>
            item.name.toLowerCase().includes(search.toLowerCase())
    );

    const columns = [
        { key: 'sn', label: 'SN' },
        { key: 'name', label: 'Zone Name' },
        { key: 'area_names', label: 'Area Name(s)' },
        {
            key: 'staff_id',
            label: 'Assigned Staff',
            render: (value, row) => row.staff?.name || 'N/A',
        },
        { key: 'zone_type', label: 'Zone Type', render: (value) => value || 'N/A' },
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
            const response = await deleteZone(deleteId);
            if (response.success) {

                // Update zone list and reassign SN after deletion
                setZones((prev) =>
                    prev.filter((item) => item.id !== deleteId).map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }))
                );

                toast.success('Zone deleted successfully');
                setDeleteId(null);

            } else {
                toast.error(response.message || 'Failed to delete zone');
            }

        } catch (error) {
            toast.error('Error deleting zone');
            console.error('Delete error:', error);
        }
    };

    return (
        <>
           <HeadTags title="Zone List" />
           <TopProgressBar loading={loading} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Zone List</h3>
                    <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
                        <div className="breadcrumb-wrap">
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb pb-0 mb-0">
                                    <li className="breadcrumb-item"><Link to="/" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                    <li className="breadcrumb-item"><ChevronRight /></li>
                                    <li className="breadcrumb-item active">Zone List</li>
                                </ol>
                            </nav>
                        </div>
                        <Link to="/create-zone" className="primary-btn btn-sm"><CirclePlus />Create Zone</Link>
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
                                    placeholder="Search by zone..."
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
                                    <Link to={`/edit-zone/${row.id}`} className="action-button edit"><Pencil /></Link>
                                    <button className="action-button delete" onClick={() => setDeleteId(row.id)} data-bs-toggle="modal" data-bs-target="#deleteModal"><Trash2 /></button>
                                </div>
                            )}
                        />
                    </div>
                </div>
            </div>
            <DeleteModal handleDelete={handleDelete} />
        </>
    )
}


export default ZoneList;