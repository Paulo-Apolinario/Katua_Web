import { useState, useEffect } from 'react';
import { Link } from "react-router";
import { House, ChevronRight, CirclePlus, Trash2, Search, Pencil } from "lucide-react";
import DataTable from "../../components/DataTable";
import DeleteModal from "../../components/modal/DeleteModal";
import { getVehicleDocuments, deleteVehicleDocument } from "../../services/vehicleDocumentService";
import toast from 'react-hot-toast';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const DocumentList = () => {

    const [documents, setDocuments] = useState([]);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [deleteId, setDeleteId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getVehicleDocuments();

                if (response.success) {
                    // Add serial number (sn) to each record
                    const dataWithSn = response.data.map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }));
                    setDocuments(dataWithSn);
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

    // Filter documents based on search input
    const filteredData = documents.filter((item) =>
        item.vehicle?.vehicle_number.toLowerCase().includes(search.toLowerCase())
    );

    const columns = [
        { key: 'sn', label: 'SN' },
        {
            key: 'vehicle_id',
            label: 'Vehicle Number',
            render: (value, row) => row.vehicle?.vehicle_number || 'N/A',
        },
        { key: 'document_type', label: 'Document Type', render: (value) => value.charAt(0).toUpperCase() + value.slice(1) },
        { key: 'document_number', label: 'Document Number' },
        {
            key: 'issue_date',
            label: 'Issue Date',
            render: (value) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
        },
        {
            key: 'expiry_date',
            label: 'Expiry Date',
            render: (value) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
        },
        {
            key: 'file',
            label: 'File',
            render: (value) => (
                <a href={`${import.meta.env.VITE_API_BASE_URL}/uploads/vehicle_documents/${value}`} target="_blank" rel="noopener noreferrer">
                    View
                </a>
            ),
        },
    ];

    // Handle delete action
    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            const response = await deleteVehicleDocument(deleteId);
            if (response.success) {
                // Update vehicle list and reassign SN after deletion
                setDocuments((prev) =>
                    prev.filter((item) => item.id !== deleteId).map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }))
                );
                toast.success(response.message || 'Deleted successfully');
                setDeleteId(null);
            } else {
                toast.error(response.message || 'Failed to delete vehicle document');
            }
        } catch (error) {
            toast.error('Error deleting vehicle document');
        }
    };

    return (
        <>
            <HeadTags title="Document List" />
            <TopProgressBar loading={loading} />
            <DeleteModal handleDelete={handleDelete} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Document List</h3>
                    <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
                        <div className="breadcrumb-wrap">
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb pb-0 mb-0">
                                    <li className="breadcrumb-item"><Link to="/" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                    <li className="breadcrumb-item"><ChevronRight /></li>
                                    <li className="breadcrumb-item active">Document List</li>
                                </ol>
                            </nav>
                        </div>
                        <Link to="/create-document" className="primary-btn btn-sm"><CirclePlus />Create Document</Link>
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
                                    <Link to={`/edit-document/${row.id}`} className="action-button edit"><Pencil /></Link>
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

export default DocumentList;