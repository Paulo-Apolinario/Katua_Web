import { useState, useEffect } from 'react';
import { Link } from "react-router";
import { House, ChevronRight, CirclePlus, Pencil, Trash2, Search } from 'lucide-react';
import DataTable from '../../components/DataTable';
import DeleteModal from "../../components/modal/DeleteModal";
import { getAllWasteTypes, deleteWasteType } from '../../services/wasteTypeService';
import toast from 'react-hot-toast';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const WasteTypeList = () => {

    const [wasteTypes, setWasteTypes] = useState([]);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [deleteId, setDeleteId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getAllWasteTypes();

                if (response.success) {
                    const dataWithSn = response.data.map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }));
                    setWasteTypes(dataWithSn);
                } else {
                    toast.error('Failed to load waste types');
                }
            } catch (error) {
                toast.error('Error fetching waste types');
                console.error('Fetch error:', error);
           } finally {
        setLoading(false);
      }
        };
        fetchData();
    }, []);

    // Filter waste types based on search input
    const filteredData = wasteTypes.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    const columns = [
        { key: 'sn', label: 'SN' },
        { key: 'name', label: 'Name' },
        { key: 'created_at', label: 'Created At', render: (value) => new Date(value).toLocaleDateString() },
        {
            key: 'status',
            label: 'Status',
            render: (value) => {
                const statusClass = `status ${value === 'active' ? 'status-success' : 'status-danger'}`;
                return <span className={statusClass}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>;
            },
        },
    ];

    // Handle delete action
    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            const response = await deleteWasteType(deleteId);
            if (response.success) {
                setWasteTypes((prev) =>
                    prev.filter((item) => item.id !== deleteId).map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }))
                );
                toast.success('Waste type deleted successfully');
                setDeleteId(null);
            } else {
                toast.error(response.message || 'Failed to delete waste type');
            }
        } catch (error) {
            toast.error('Error deleting waste type');
            console.error('Delete error:', error);
        }
    };

    return (
        <>
          <HeadTags title="Waste Type" />
          <TopProgressBar loading={loading} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Waste Type</h3>
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
                                    <li className="breadcrumb-item active">Waste Type</li>
                                </ol>
                            </nav>
                        </div>
                        <Link to="/create-type" className="primary-btn btn-sm">
                            <CirclePlus /> Create Waste Type
                        </Link>
                    </div>
                </div>
            </div>
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
                            placeholder="Search by waste type..."
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
                            <Link to={`/edit-waste-type/${row.id}`} className="action-button edit"><Pencil /></Link>
                            <button className="action-button delete" onClick={() => setDeleteId(row.id)} data-bs-toggle="modal" data-bs-target="#deleteModal"><Trash2 /></button>
                        </div>
                    )}
                />
            </div>
           <DeleteModal handleDelete={handleDelete} />
        </>
    );
};

export default WasteTypeList;