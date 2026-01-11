import { useState, useEffect } from "react";
import { Link } from "react-router";
import { House, ChevronRight, CirclePlus, Trash2, Search, Pencil, AlignJustify, LayoutGrid } from "lucide-react";
import DataTable from "../../components/DataTable";
import DeleteModal from "../../components/modal/DeleteModal";
import toast from 'react-hot-toast';
import { getAllWastes, deleteWaste } from "../../services/wasteService";
import { getAllZones } from '../../services/zoneService';
import { getAllWasteTypes } from '../../services/wasteTypeService';
import CustomCalendar from "./Calendar";
import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

const WasteList = () => {
    const [wastes, setWastes] = useState([]);
    const [zones, setZones] = useState([]);
    const [wasteTypes, setWasteTypes] = useState([]);
    const [statuses, setStatuses] = useState(['collected', 'pending', 'cancelled']);
    const [zoneFilter, setZoneFilter] = useState("");
    const [wasteTypeFilter, setWasteTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [deleteId, setDeleteId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Determine if any filter is active
    const isFilterActive = zoneFilter || wasteTypeFilter || statusFilter;

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch wastes
                const response = await getAllWastes();

                if (response.success) {
                    // Add serial number (sn) to each record
                    const dataWithSn = response.data.map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }));
                    setWastes(dataWithSn);
                } else {
                    toast.error('Failed to load waste');
                }

                // Fetch zones for filter dropdown
                const zonesResponse = await getAllZones();
                setZones(zonesResponse.data);

                // Fetch waste types for filter dropdown
                const wasteTypesResponse = await getAllWasteTypes()
                setWasteTypes(wasteTypesResponse.data);

            } catch (error) {
                toast.error('Error fetching data');
                console.error('Fetch error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredData = wastes.filter(item =>
        (item.zone?.name?.toLowerCase() || '').includes(search.toLowerCase()) &&
        (zoneFilter === "" || item.zone?.name === zoneFilter) &&
        (wasteTypeFilter === "" || item.waste_type?.name === wasteTypeFilter) &&
        (statusFilter === "" || item.status === statusFilter)
    );

    const columns = [
        { key: 'sn', label: 'SN' },
        { key: 'collected_date', label: 'Collection Date' ,
          render: (value) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
        },
        { key: 'time_slot', label: 'Time Slot' },
        { key: 'waste_type', label: 'Waste Type',
          render: (value, row) => row.waste_type?.name || 'N/A',
        },
        { key: 'zone', label: 'Zone Name',
          render: (value, row) => row.zone?.name || 'N/A',
        },
        {key: 'vehicle', label: 'Vehicle',
          render: (value, row) => row.vehicle?.vehicle_number || 'N/A',
        },
        {key: 'staff', label: 'Driver',
          render: (value, row) => row.staff?.name || 'N/A',
        },
        {key: 'bin', label: 'Bin',
           render: (value, row) => row.bin?.bin_id || 'N/A',
        },
        { key: 'quantity', label: 'Quantity (KG)' },
        {
            key: 'status',
            label: 'Status',
            render: (value) => {
                let statusClass = 'status';
                if (value === 'collected') statusClass += ' status-success';
                else if (value === 'pending') statusClass += ' status-warning';
                else statusClass += ' status-danger';
                return <span className={statusClass}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>;
            }
        }
    ];

    // Handle delete action
    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            const response = await deleteWaste(deleteId);
            if (response.success) {
                // Update bin list and reassign SN after deletion
                setWastes((prev) =>
                    prev.filter((item) => item.id !== deleteId).map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }))
                );
                toast.success('Waste deleted successfully');
                setDeleteId(null);
            } else {
                toast.error(response.message || 'Failed to delete waste');
            }
        } catch (error) {
            toast.error('Error deleting waste');
            console.error('Delete error:', error);
        }
    };

    // Clear all filters
    const clearFilters = () => {
        setSearch("");
        setZoneFilter("");
        setWasteTypeFilter("");
        setStatusFilter("");
        setCurrentPage(1);
        toast.success("Filters cleared!");
    };

    return (
        <>
           <HeadTags title="Waste List" />
           <TopProgressBar loading={loading} />
            <DeleteModal handleDelete={handleDelete} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Waste List</h3>
                    <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
                        <div className="breadcrumb-wrap">
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb pb-0 mb-0">
                                    <li className="breadcrumb-item"><Link to="/" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                    <li className="breadcrumb-item"><ChevronRight /></li>
                                    <li className="breadcrumb-item active">Waste List</li>
                                </ol>
                            </nav>
                        </div>
                        <div className="d-flex flex-wrap flex-wrap-reverse gap-15 align-items-center">
                            <div className="list-group flex-row tab" id="list-tab" role="tablist">
                                <a className="list-group-item tab-item list-group-item-action active" id="list-home-list" data-bs-toggle="list" href="#list-home" role="tab" aria-controls="list-home"><AlignJustify />List</a>
                                <a className="list-group-item tab-item list-group-item-action" id="list-profile-list" data-bs-toggle="list" href="#list-profile" role="tab" aria-controls="list-profile"><LayoutGrid />Grid</a>
                            </div>
                            <Link to="/create-waste" className="primary-btn btn-sm"><CirclePlus />Create Waste</Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="tab-content mb-4" id="nav-tabContent">
                <div className="tab-pane show active" id="list-home" role="tabpanel" aria-labelledby="list-home-list">
                    <div className="row mb-4">
                        <div className="col-12">
                            <div className="card p-25">
                                <div className="filter row g-4 mb-3">
                                    <div className="col-md-6">
                                        <div className="d-flex justify-content-start align-items-center flex-wrap gap-15">
                                            <div className="filter-section">
                                                <select
                                                    className="form-select"
                                                    value={zoneFilter}
                                                    onChange={(e) => {
                                                        setZoneFilter(e.target.value);
                                                        setCurrentPage(1);
                                                    }}
                                                    aria-label="Zone select"
                                                >
                                                    <option value="">All Zone</option>
                                                    {zones.map((zone) => (
                                                        <option key={zone.id} value={zone.name}>
                                                            {zone.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="filter-section">
                                                <select
                                                    className="form-select"
                                                    value={wasteTypeFilter}
                                                    onChange={(e) => {
                                                        setWasteTypeFilter(e.target.value);
                                                        setCurrentPage(1);
                                                    }}
                                                    aria-label="Waste Type select"
                                                >
                                                    <option value="">All Waste Type</option>
                                                    {wasteTypes.map((wasteType) => (
                                                        <option key={wasteType.id} value={wasteType.name}>
                                                            {wasteType.name}
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
                                            {isFilterActive && (
                                                <button className="clear-filter" onClick={clearFilters}>
                                                    <Trash2 /> Clear All
                                                </button>
                                            )}
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
                                                    placeholder="Search by zone name..."
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
                                            <Link to={`/edit-waste/${row.id}`} className="action-button edit">
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
                </div>
                <div className="tab-pane" id="list-profile" role="tabpanel" aria-labelledby="list-profile-list">
                    <CustomCalendar wastes={wastes} />
                </div>
            </div>
        </>
    )
}

export default WasteList;