import { useEffect, useState } from "react";
import { Link } from "react-router";
import { House, ChevronRight, Search } from "lucide-react";
import WasteCollectionChart from "../../components/WasteCollectionChart";
import WasteTypeChart from "../../components/WasteTypeChart";
import DataTable from "../../components/DataTable";
import DataExporter from "../../components/DataExporter";
import toast from 'react-hot-toast';
import HeadTags from "../../components/HeadTags";
import TopProgressBar from '../../components/TopProgressBar';

const WasteTypeReports = () => {
    const [wasteData, setWasteData] = useState([]);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('auth_token');

    // Fetch waste data on component mount
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {

                // Fetch waste data
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/waste-type-reports`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        'Authorization': `Bearer ${token}`
                    },
                    credentials: "include",
                });

                const wasteTypeResult = await response.json();

                if (wasteTypeResult.success) {
                    // Add serial number (sn) to each record
                    const dataWithSn = wasteTypeResult.data.map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }));
                     setWasteData(dataWithSn);
                } else {
                    toast.error('Failed to load waste data');
                }

            } catch (err) {
                toast.error(`Error: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Filter waste data based on search input
    const filteredData = wasteData.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    // DataTable columns configuration
    const columns = [
        { key: "sn", label: "SN" },
        { key: "name", label: "Waste Type" },
        {
            key: "quantity",
            label: "Quantity (KG)",
            render: (value, row) => row.collections?.[0]?.quantity || 'N/A',
        },
        {
            key: "collected_date",
            label: "Collection Date",
            render: (value, row) => (
                row.collections?.[0]?.collected_date
                    ? new Date(row.collections[0].collected_date).toLocaleDateString()
                    : 'N/A'
            ),
        },
        {
            key: "status",
            label: "Status",
            render: (value, row) => {
                const status = row.collections?.[0]?.status || "N/A";
                let statusClass = "status";
                if (status === "collected") statusClass += " status-success";
                else if (status === "pending") statusClass += " status-warning";
                else if (status === "cancelled") statusClass += " status-danger";

                return <span className={statusClass}>{status !== "N/A" ? status.charAt(0).toUpperCase() + status.slice(1) : status}</span>;
            },
        },
    ];

    return (
        <>
            <HeadTags title="Waste Type Reports" />
            <TopProgressBar loading={loading} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Waste Type Reports</h3>
                    <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
                        <div className="breadcrumb-wrap">
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb pb-0 mb-0">
                                    <li className="breadcrumb-item"><Link to="" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                    <li className="breadcrumb-item"><ChevronRight /></li>
                                    <li className="breadcrumb-item active">Waste type Reports</li>
                                </ol>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
            <div className="row gy-4">
                <div className="col-12">
                    <div className="row g-4">
                        <div className="col-lg-7">
                            <div className="card p-25">
                                <h3 className="fw-600">Waste Collection Trends</h3>
                                <WasteCollectionChart />
                            </div>
                        </div>
                        <div className="col-lg-5">
                            <div className="card p-25">
                                <h3 className="fw-600">Waste Collected Per Type</h3>
                                <WasteTypeChart />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 mb-4">
                    <div className="card p-25">
                        <div className="filter d-flex justify-content-lg-end align-items-center flex-wrap gap-15 mb-3">
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
                            <DataExporter
                                data={filteredData}
                                columns={columns}
                                filename="WasteTypeReports"
                            />
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
                        />
                    </div>
                </div>
            </div>
        </>
    )
}

export default WasteTypeReports;