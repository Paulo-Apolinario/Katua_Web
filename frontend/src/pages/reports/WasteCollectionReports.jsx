import { useState, useEffect } from "react";
import { Link } from "react-router";
import DataTable from "../../components/DataTable";
import DataExporter from "../../components/DataExporter";
import { House, ChevronRight, Trash2, Search } from "lucide-react";
import toast from 'react-hot-toast';
import { getAllZones } from '../../services/zoneService';
import { getAllWasteTypes } from '../../services/wasteTypeService';
import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

const WasteCollectionReports = () => {
    const [wasteData, setWasteData] = useState([]);
    const [summary, setSummary] = useState({
        totalCollections: 0,
        totalQuantity: 0,
        monthlyAverage: 0,
    });
    const [zones, setZones] = useState([]);
    const [wasteTypes, setWasteTypes] = useState([]);
    const [statuses, setStatuses] = useState(['collected', 'pending', 'cancelled']);
    const [search, setSearch] = useState("");
    const [zoneFilter, setZoneFilter] = useState("");
    const [wasteTypeFilter, setWasteTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const token = localStorage.getItem('auth_token');

    // Determine if any filter is active
    const isFilterActive = zoneFilter || wasteTypeFilter || statusFilter;

    // Fetch data on component mount
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {

                // Fetch waste collection data
                const wasteResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/waste-reports`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        'Authorization': `Bearer ${token}`
                    },
                    credentials: "include",
                });

                const wasteResult = await wasteResponse.json();

                if (wasteResult.success) {
                    // Add serial number (sn) to each record
                    const dataWithSn = wasteResult.data.map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }));
                    setWasteData(dataWithSn);
                } else {
                    toast.error('Failed to load waste data');
                }

                // Fetch summary statistics
                const summaryResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/waste-stats`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        'Authorization': `Bearer ${token}`
                    },
                    credentials: "include",
                });

                const summaryResult = await summaryResponse.json();
                setSummary(summaryResult.data);

                // Fetch zones for filter dropdown
                const zonesResponse = await getAllZones();
                setZones(zonesResponse.data);

                // Fetch waste types for filter dropdown
                const wasteTypesResponse = await getAllWasteTypes()
                setWasteTypes(wasteTypesResponse.data);

            } catch (err) {
                toast.error(`Error: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);


    // Filter data based on search and dropdown filters
    const filteredData = wasteData.filter((item) => {
        return (
            (item.zone?.name?.toLowerCase().includes(search.toLowerCase()) ||
                item.waste_type?.name?.toLowerCase().includes(search.toLowerCase()) ||
                item.vehicle?.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ||
                item.staff?.name?.toLowerCase().includes(search.toLowerCase())) &&
                
            (zoneFilter === "" || item.zone?.name === zoneFilter) &&
            (wasteTypeFilter === "" || item.waste_type?.name === wasteTypeFilter) &&
            (statusFilter === "" || item.status === statusFilter)
        );
    });


    // Clear all filters
    const clearFilters = () => {
        setSearch("");
        setZoneFilter("");
        setWasteTypeFilter("");
        setStatusFilter("");
        setCurrentPage(1);
        toast.success("Filters cleared!");
    };

    const columns = [
        { key: "sn", label: "SN" },
        {
            key: "zone",
            label: "Zone Name",
            render: (value, row) => row.zone?.name || "N/A"
        },

        {
            key: "waste_type",
            label: "Waste Type",
            render: (value, row) => row.waste_type?.name || "N/A"
        },

        {
            key: "vehicle",
            label: "Vehicle Number",
            render: (value, row) => row.vehicle?.vehicle_number || "N/A"
        },

        {
            key: "staff",
            label: "Driver",
            render: (value, row) => row.staff?.name || "N/A"
        },

        {
            key: "quantity",
            label: "Quantity (KG)"
        },

        {
            key: "collected_date",
            label: "Collection Date",
            render: (value, row) => row.collected_date
                ? new Date(row.collected_date).toLocaleDateString()
                : "N/A"
        },

        {
            key: "status",
            label: "Status",
            render: (value, row) => {
                const status = row.status || "N/A";
                let statusClass = "status";
                if (status === "collected") statusClass += " status-success";
                else if (status === "pending") statusClass += " status-warning";
                else if (status === "cancelled") statusClass += " status-danger";

                return (
                    <span className={statusClass}>
                        {status !== "N/A" ? status.charAt(0).toUpperCase() + status.slice(1) : status}
                    </span>
                );
            },
        },
    ];


    return (
        <>
            <HeadTags title="Waste Collection Reports" />
            <TopProgressBar loading={loading} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Waste Collection Reports</h3>
                    <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
                        <div className="breadcrumb-wrap">
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb pb-0 mb-0">
                                    <li className="breadcrumb-item"><Link to="" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                    <li className="breadcrumb-item"><ChevronRight /></li>
                                    <li className="breadcrumb-item active">Waste Collection Reports</li>
                                </ol>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
            <div className="widget mb-5">
                <div className="row g-4">
                    <div className="col-md-6 col-lg-4 col-xl-4">
                        <div className="card p-25">
                            <div className="d-flex">
                                <div className="icon">
                                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M18.1357 17.9545H1.63565C1.13565 17.9545 0.726562 18.3636 0.726562 18.8636V22.6363C0.726562 23.1363 1.13565 23.5454 1.63565 23.5454H1.99929C1.95384 23.4091 1.95384 23.2273 1.95384 23.0909C1.95384 21.1363 3.54474 19.5454 5.49929 19.5454C7.45384 19.5454 8.99929 21.1363 8.99929 23.0909C8.99929 23.2273 8.99929 23.4091 8.95384 23.5454H18.2266C18.1811 23.4091 18.1357 23.2727 18.1357 23.0909V17.9545ZM29.4084 14.6818L25.6357 10.9091C25.5447 10.8182 25.4084 10.7727 25.3175 10.7727H19.4993C19.2266 10.7727 19.0447 10.9545 19.0447 11.2273V23.0454C19.0447 23.3182 19.2266 23.5 19.4993 23.5H20.8175C20.8175 23.3636 20.772 23.1818 20.772 23.0454C20.772 21.0909 22.3629 19.5 24.3175 19.5C26.272 19.5 27.8629 21.0909 27.8629 23.0454C27.8629 23.1818 27.8629 23.3636 27.8175 23.5H28.6357C29.1357 23.5 29.5447 23.0909 29.5447 22.5909V15C29.5447 14.8636 29.4993 14.7727 29.4084 14.6818ZM27.3175 18.1363C27.3175 18.3636 27.0902 18.5909 26.8629 18.5909H21.772C21.5447 18.5909 21.3175 18.4091 21.3175 18.1363V13.5C21.3175 13.2727 21.5447 13.0454 21.772 13.0454H24.4084C24.5447 13.0454 24.6357 13.0909 24.7266 13.1818L27.1811 15.5454C27.272 15.6363 27.3175 15.7273 27.3175 15.8636V18.1363Z" fill="#1A7E00" />
                                        <path d="M24.3168 20.4545C22.8622 20.4545 21.6804 21.6364 21.6804 23.0909C21.6804 24.5454 22.8622 25.7273 24.3168 25.7273C25.7713 25.7273 26.9531 24.5454 26.9531 23.0909C26.9077 21.5909 25.7259 20.4545 24.3168 20.4545ZM5.49858 20.4545C4.04403 20.4545 2.86222 21.6364 2.86222 23.0909C2.86222 24.5454 4.04403 25.7273 5.49858 25.7273C6.95313 25.7273 8.08949 24.5454 8.08949 23.0909C8.08949 21.5909 6.90767 20.4545 5.49858 20.4545ZM1.36222 13.9091V10.5909H2.31676L3.81676 17H12.7259L16.4986 16.1364C16.9986 16 17.2713 15.5454 17.1804 15.0454L15.4531 7.63635L16.3622 7.40908C16.5895 7.36362 16.7713 7.0909 16.7259 6.86363C16.6804 6.63635 16.4077 6.45453 16.1804 6.49999C16.1349 6.49999 13.9077 6.99999 13.7259 7.04544L9.81676 4.31817C9.6804 4.22726 9.54403 4.22726 9.40767 4.27272C9.27131 4.31817 9.1804 4.45453 9.13494 4.5909L8.40767 7.90908L5.63494 5.99999C5.49858 5.90908 5.36222 5.90908 5.22585 5.95453C5.08949 5.99999 4.99858 6.13635 4.95312 6.27272L3.99858 9.31817L2.72585 9.5909H0.90767C0.634943 9.5909 0.453125 9.81817 0.453125 10.0454V13.8182C0.453125 14.0909 0.634943 14.2727 0.90767 14.2727C1.1804 14.2727 1.36222 14.1818 1.36222 13.9091ZM12.0895 9.81817C12.3168 9.77272 12.5895 9.90908 12.6349 10.1818L13.544 14.0909C13.5895 14.3182 13.4531 14.5909 13.1804 14.6364C12.9531 14.6818 12.6804 14.5454 12.6349 14.3182L11.7259 10.4091C11.7259 10.0909 11.8622 9.86363 12.0895 9.81817ZM9.1804 10.5C9.40767 10.4545 9.6804 10.5909 9.72585 10.8636L10.6349 14.7727C10.6804 15 10.544 15.2727 10.2713 15.3182C10.044 15.3636 9.77131 15.2273 9.72585 14.9545L8.81676 11.0454C8.77131 10.7727 8.90767 10.5454 9.1804 10.5ZM6.22585 11.1818C6.45312 11.1364 6.72585 11.2727 6.77131 11.5454L7.6804 15.4545C7.72585 15.6818 7.58949 15.9545 7.31676 16C7.08949 16.0454 6.81676 15.9091 6.77131 15.6364L5.86222 11.7273C5.81676 11.4545 5.99858 11.2273 6.22585 11.1818Z" fill="#1A7E00" />
                                    </svg>
                                </div>
                                <div className="content">
                                    <p className="title text-muted">
                                        Total Collection
                                    </p>
                                    <h3>{summary.total_collections}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-4 col-xl-4">
                        <div className="card p-25">
                            <div className="d-flex">
                                <div className="icon">
                                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M28.7404 28.2341L25.5553 10.4643C25.4932 10.1177 25.3111 9.80393 25.0411 9.57796C24.771 9.35199 24.43 9.22817 24.0778 9.22818H18.7808C19.774 8.24993 20.3912 6.89092 20.3912 5.39001C20.3912 2.41792 17.9733 0 15.0012 0C12.0291 0 9.61105 2.41792 9.61105 5.39001C9.61105 6.89092 10.2283 8.24993 11.2214 9.22818H5.92438C5.57222 9.22817 5.23127 9.35199 4.96118 9.57796C4.69108 9.80393 4.50904 10.1177 4.44689 10.4643L1.26186 28.2341C1.2231 28.4502 1.23222 28.6722 1.28858 28.8844C1.34494 29.0966 1.44717 29.2938 1.58806 29.4622C1.72895 29.6306 1.90507 29.766 2.10399 29.8589C2.30291 29.9518 2.5198 29.9999 2.73935 29.9999H27.2629C27.4824 29.9999 27.6993 29.9517 27.8982 29.8588C28.0971 29.7659 28.2732 29.6305 28.4141 29.4621C28.555 29.2938 28.6572 29.0965 28.7136 28.8843C28.7699 28.6722 28.7791 28.4502 28.7404 28.2341ZM15.0012 3.00201C16.3179 3.00201 17.3892 4.07323 17.3892 5.39001C17.3892 6.70679 16.3179 7.77811 15.0012 7.77811C13.6844 7.77811 12.6131 6.70679 12.6131 5.39001C12.6131 4.07323 13.6844 3.00201 15.0012 3.00201ZM14.6089 23.2282C14.5705 23.2989 14.5137 23.358 14.4446 23.3991C14.3754 23.4403 14.2964 23.462 14.2159 23.462H13.5079C13.4298 23.462 13.3532 23.4416 13.2855 23.4028C13.2178 23.364 13.1615 23.3082 13.122 23.2409L11.3696 20.2494L10.249 21.3933V22.771C10.249 22.9542 10.1762 23.13 10.0466 23.2596C9.91697 23.3892 9.7412 23.462 9.55792 23.462C9.37464 23.462 9.19886 23.3892 9.06926 23.2596C8.93966 23.13 8.86685 22.9542 8.86685 22.771V17.3076C8.86685 17.1243 8.93966 16.9485 9.06926 16.8189C9.19886 16.6893 9.37464 16.6165 9.55792 16.6165C9.7412 16.6165 9.91697 16.6893 10.0466 16.8189C10.1762 16.9485 10.249 17.1243 10.249 17.3076V19.6563L12.9087 16.7611C12.9505 16.7156 13.0014 16.6792 13.0581 16.6543C13.1148 16.6294 13.176 16.6165 13.2379 16.6165H13.8456C13.9334 16.6166 14.0192 16.6424 14.0923 16.6909C14.1655 16.7394 14.2228 16.8083 14.2571 16.8891C14.2913 16.9699 14.3011 17.0589 14.2851 17.1452C14.2691 17.2315 14.2281 17.3112 14.1671 17.3743L12.3223 19.2826L14.5908 22.7711C14.6347 22.8386 14.6595 22.9167 14.6627 22.9971C14.6659 23.0776 14.6473 23.1574 14.6089 23.2282ZM21.4178 22.3166C21.4178 22.4524 21.3557 22.5815 21.2495 22.6663C20.9738 22.8863 20.6104 23.0839 20.1595 23.2588C19.61 23.472 19.0535 23.5786 18.4901 23.5786C17.774 23.5786 17.1501 23.4285 16.6175 23.128C16.0854 22.8277 15.6852 22.3981 15.4175 21.8392C15.1498 21.2805 15.016 20.6728 15.016 20.0158C15.016 19.303 15.1654 18.6694 15.4643 18.1154C15.7631 17.5613 16.2005 17.1365 16.7765 16.8406C17.2151 16.6134 17.7616 16.4997 18.4154 16.4997C19.2652 16.4997 19.929 16.678 20.4069 17.0344C20.61 17.1848 20.7873 17.3671 20.9319 17.5744C20.9992 17.671 21.0412 17.783 21.0541 17.9C21.0669 18.0171 21.0503 18.1355 21.0057 18.2444C20.9611 18.3534 20.8899 18.4496 20.7987 18.524C20.7074 18.5984 20.5989 18.6488 20.4831 18.6705L20.4815 18.6708C20.3468 18.696 20.2076 18.6801 20.0821 18.6252C19.9565 18.5703 19.8503 18.4789 19.7774 18.3629C19.6817 18.2108 19.5577 18.0784 19.4123 17.9728C19.146 17.7783 18.8137 17.681 18.4154 17.681C17.8113 17.681 17.3311 17.8726 16.9749 18.2553C16.6184 18.6384 16.4402 19.2065 16.4402 19.9598C16.4402 20.7723 16.6206 21.3816 16.9819 21.7879C17.3429 22.1941 17.8161 22.3972 18.4014 22.3972C18.6908 22.3972 18.9811 22.3405 19.2722 22.2268C19.5631 22.1131 19.813 21.9753 20.0216 21.8136V20.9449H19.0155C18.8625 20.9449 18.7159 20.8842 18.6077 20.7761C18.4996 20.6679 18.4389 20.5213 18.4389 20.3683C18.4389 20.2154 18.4996 20.0688 18.6077 19.9606C18.7159 19.8525 18.8625 19.7918 19.0155 19.7918H20.9707C21.0892 19.7918 21.203 19.8389 21.2868 19.9227C21.3707 20.0066 21.4178 20.1203 21.4178 20.2389V22.3166Z" fill="#1A7E00" />
                                    </svg>

                                </div>
                                <div className="content">
                                    <p className="title text-muted">
                                        Total Quantity
                                    </p>
                                    <h3>{Number(summary.total_quantity || 0).toFixed(2)} KG</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-4 col-xl-4">
                        <div className="card p-25">
                            <div className="d-flex">
                                <div className="icon">
                                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_99_353)">
                                            <path d="M9.72656 17.2998C10.2117 17.2998 10.6055 17.693 10.6055 18.1787V26.4844H5.33203V18.1787C5.33203 17.693 5.72578 17.2998 6.21094 17.2998H9.72656ZM16.7578 12.0264C17.243 12.0264 17.6367 12.4195 17.6367 12.9053V26.4844H12.3633V12.9053C12.3633 12.4195 12.757 12.0264 13.2422 12.0264H16.7578ZM23.7891 17.2998C24.2742 17.2998 24.668 17.693 24.668 18.1787V26.4844H19.3945V18.1787C19.3945 17.693 19.7883 17.2998 20.2734 17.2998H23.7891Z" fill="#1A7E00" />
                                            <path d="M30 29.1211C30 29.6063 29.6063 30 29.1211 30H0.878906C0.39375 30 0 29.6063 0 29.1211V0.878906C0 0.39375 0.39375 0 0.878906 0C1.36406 0 1.75781 0.39375 1.75781 0.878906V11.4404H8.99766L14.2898 4.18418C14.618 3.70781 15.382 3.70781 15.7102 4.18418L21.0023 11.4404H26.9994L26.073 10.5141C25.7303 10.1707 25.7303 9.61465 26.073 9.27129C26.4164 8.92793 26.973 8.92793 27.3164 9.27129L29.7428 11.6977C30.0779 12.0211 30.0838 12.6029 29.751 12.9311C29.7463 12.9369 29.7404 12.9422 29.7352 12.948L27.2502 15.3744C27.0791 15.5414 26.8576 15.6246 26.6361 15.6246C26.4076 15.6246 26.1797 15.5355 26.0074 15.3592C25.6682 15.0123 25.6746 14.4557 26.0221 14.1164L26.9631 13.1982H20.5553C20.2746 13.1982 20.0104 13.0641 19.8451 12.8367L15 6.19336L10.1549 12.8367C10.0734 12.9487 9.9666 13.0399 9.84318 13.1027C9.71976 13.1655 9.58322 13.1983 9.44473 13.1982H1.75781V28.2422H29.1211C29.6063 28.2422 30 28.6359 30 29.1211Z" fill="#1A7E00" />
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_99_353">
                                                <rect width="30" height="30" fill="white" />
                                            </clipPath>
                                        </defs>
                                    </svg>

                                </div>
                                <div className="content">
                                    <p className="title text-muted">
                                        Monthly Average
                                    </p>
                                    <h3> {Number(summary.monthly_average || 0).toFixed(2)}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card p-25 mb-4">
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
                            <DataExporter
                                data={filteredData}
                                columns={columns}
                                filename="WasteCollectionReports"
                            />
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
                />
            </div>
        </>

    )
}

export default WasteCollectionReports;