import { useState, useEffect } from "react";
import { Link } from "react-router";
import VehicleStatusChart from "../../components/VehicleStatusChart";
import DataTable from "../../components/DataTable";
import DataExporter from "../../components/DataExporter";
import { House, ChevronRight, Search } from "lucide-react";
import { toast } from 'react-hot-toast';
import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

const VehicleReports = () => {
    const [vehicleData, setVehicleData] = useState([]);
    const [stats, setStats] = useState({
        activeVehicles: 0,
        expiredDocuments: 0,
        outOfService: 0,
    });

    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const [series, setSeries] = useState([1, 1, 1]);
    const token = localStorage.getItem('auth_token');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch vehicle data
                const vehicleResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/vehicle-reports`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        'Authorization': `Bearer ${token}`
                    },
                    credentials: "include",
                });


                const vehicleResult = await vehicleResponse.json();

                if (vehicleResult.success) {
                    // Add serial number (sn) to each record
                    const dataWithSn = vehicleResult.data.map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }));
                     setVehicleData(dataWithSn);
                } else {
                    toast.error('Failed to load vehicle');
                }

                // Fetch statistics
                const statsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/vehicle-stats`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        'Authorization': `Bearer ${token}`
                    },
                    credentials: "include",
                });

                const statsResult = await statsResponse.json();

                setStats({
                    activeVehicles: statsResult.data.active_vehicles,
                    expiredDocuments: statsResult.data.expired_documents,
                    outOfService: statsResult.data.inactive_vehicles,
                });

                //fetch vehicle status distribution
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/vehicle-status-distribution`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    credentials: "include",
                });

                const result = await response.json();

                // Transform array to object for easier access
                const statusMap = result.data.reduce((acc, curr) => {
                    acc[curr.status] = curr.count;
                    return acc;
                }, {});

                const newSeries = [
                    statusMap.maintenance || 0,
                    statusMap.active || 0,
                    statusMap.inactive || 0,
                ];

                setSeries(newSeries);

            } catch (err) {
                setError(err.message);
                toast.error(`Error: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Filter vehicle data based on search input
    const filteredData = vehicleData.filter((item) =>
        item.vehicle_number.toLowerCase().includes(search.toLowerCase())
    );

    // DataTable columns configuration
    const columns = [
        { key: "sn", label: "SN" },
        { key: "vehicle_number", label: "Vehicle Number" },
        { key: "vehicle_type", label: "Vehicle Type" },
        { key: "last_service", label: "Last Service",
            render: (value, row) => ( row.vehicleMaintenanceLogs?.maintenance_date ? new Date(row.vehicleMaintenanceLogs?.maintenance_date).toLocaleDateString() : 'N/A'),
         },
        { key: "staff", label: "Driver",
            render: (value, row) => row.staff?.name || 'N/A',
         },
        {
            key: "status",
            label: "Status",
            render: (value) => {
                let statusClass = "status";
                if (value === "active") statusClass += " status-success";
                else if (value === "maintenance") statusClass += " status-warning";
                else statusClass += " status-danger";
                return <span className={statusClass}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>;
            },
        },
    ];

    return (
        <>
            <HeadTags title="Vehicle Reports" />
            <TopProgressBar loading={loading} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Vehicle Reports</h3>
                    <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
                        <div className="breadcrumb-wrap">
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb pb-0 mb-0">
                                    <li className="breadcrumb-item"><Link to="" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                    <li className="breadcrumb-item"><ChevronRight /></li>
                                    <li className="breadcrumb-item active">Vehicle Reports</li>
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
                                        Active Vehicles
                                    </p>
                                    <h3>{stats.activeVehicles}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-4 col-xl-4">
                        <div className="card p-25">
                            <div className="d-flex">
                                <div className="icon">
                                    <svg width="24" height="28" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M16.3359 8.78906C15.2051 8.78906 14.2852 7.86908 14.2852 6.73828V0H3.79688C2.0199 0 0.574219 1.44568 0.574219 3.22266V26.7773C0.574219 28.5543 2.0199 30 3.79688 30H20.2031C21.9801 30 23.4258 28.5543 23.4258 26.7773V8.78906H16.3359ZM5.37891 21.0938H9.63984C10.1252 21.0938 10.5188 21.4873 10.5188 21.9727C10.5188 22.458 10.1252 22.8516 9.63984 22.8516H5.37891C4.89352 22.8516 4.5 22.458 4.5 21.9727C4.5 21.4873 4.89352 21.0938 5.37891 21.0938ZM4.5 17.2852C4.5 16.7998 4.89352 16.4062 5.37891 16.4062H18.2695C18.7549 16.4062 19.1484 16.7998 19.1484 17.2852C19.1484 17.7705 18.7549 18.1641 18.2695 18.1641H5.37891C4.89352 18.1641 4.5 17.7705 4.5 17.2852ZM18.2695 11.7188C18.7549 11.7188 19.1484 12.1123 19.1484 12.5977C19.1484 13.083 18.7549 13.4766 18.2695 13.4766H5.37891C4.89352 13.4766 4.5 13.083 4.5 12.5977C4.5 12.1123 4.89352 11.7188 5.37891 11.7188H18.2695Z" fill="#1A7E00" />
                                        <path d="M16.043 6.73829C16.043 6.89983 16.1744 7.03126 16.3359 7.03126H23.034C22.8725 6.73217 22.6645 6.46059 22.4179 6.22665L16.7681 0.881607C16.5515 0.676596 16.3074 0.50258 16.043 0.364517V6.73829H16.043Z" fill="#1A7E00" />
                                    </svg>
                                </div>
                                <div className="content">
                                    <p className="title text-muted">
                                        Expired Documents
                                    </p>
                                    <h3>{stats.expiredDocuments}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-4 col-xl-4">
                        <div className="card p-25">
                            <div className="d-flex">
                                <div className="icon">
                                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_104_322)">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M18.8569 16.729L15.5072 10.9271C15.2823 10.5375 14.7174 10.5375 14.4924 10.9271L11.1427 16.729C10.9165 17.1209 11.1977 17.6079 11.6501 17.6079H18.3495C18.802 17.6079 19.0832 17.1209 18.8569 16.729ZM14.5897 12.7631C14.5897 12.6543 14.6329 12.55 14.7098 12.473C14.7867 12.3961 14.891 12.3529 14.9998 12.3529C15.1086 12.3529 15.2129 12.3961 15.2898 12.473C15.3668 12.55 15.41 12.6543 15.41 12.7631V15.078C15.41 15.1868 15.3668 15.2911 15.2898 15.368C15.2129 15.4449 15.1086 15.4881 14.9998 15.4881C14.891 15.4881 14.7867 15.4449 14.7098 15.368C14.6329 15.2911 14.5897 15.1868 14.5897 15.078V12.7631ZM14.9998 16.6682C14.8755 16.6682 14.7563 16.6188 14.6684 16.5309C14.5805 16.443 14.5311 16.3237 14.5311 16.1994C14.5311 16.0751 14.5805 15.9559 14.6684 15.868C14.7563 15.78 14.8755 15.7307 14.9998 15.7307C15.1241 15.7307 15.2434 15.78 15.3313 15.868C15.4192 15.9559 15.4686 16.0751 15.4686 16.1994C15.4686 16.3237 15.4192 16.443 15.3313 16.5309C15.2434 16.6188 15.1241 16.6682 14.9998 16.6682ZM28.1386 12.6701C26.8037 12.6701 25.7897 11.8904 25.3165 10.8635C25.3053 10.8382 25.2882 10.816 25.2665 10.7988C25.2448 10.7816 25.2193 10.7699 25.1922 10.7648L24.0079 10.5223C23.9662 10.5132 23.9227 10.5201 23.886 10.5416L22.8546 11.1257C22.7069 11.2093 22.5377 11.0545 22.608 10.9L23.4367 9.07705C23.451 9.04475 23.4747 9.01759 23.5049 8.99921C23.535 8.98083 23.57 8.97211 23.6053 8.97422L24.9085 9.03726C24.9502 9.03949 24.9914 9.0267 25.0245 9.0012C25.0576 8.9757 25.0804 8.93919 25.0889 8.89828C25.2059 8.34867 25.4803 7.81465 25.938 7.35703C26.2986 6.99633 26.2986 6.41133 25.938 6.05062L23.9493 4.06189C23.5886 3.70125 23.0035 3.70125 22.6429 4.06189C20.6848 6.01992 17.3298 4.63054 17.3298 1.86117C17.3298 1.35088 16.9161 0.937439 16.4061 0.937439H13.5937C13.0837 0.937439 12.67 1.35082 12.67 1.86117C12.67 4.63049 9.315 6.01992 7.35697 4.06189C6.99627 3.70125 6.41121 3.70125 6.05057 4.06189L4.06184 6.05062C3.70119 6.41133 3.70119 6.99638 4.06184 7.35703C5.00566 8.30086 5.17137 9.56918 4.77996 10.63C4.77002 10.6558 4.76648 10.6836 4.76965 10.711C4.77283 10.7385 4.78262 10.7648 4.79818 10.7876L5.46416 11.7964C5.48854 11.8334 5.52135 11.8572 5.56395 11.869L6.70623 12.1853C6.86982 12.2306 6.87996 12.4597 6.72105 12.5193L4.84605 13.2223C4.81317 13.2351 4.77715 13.2375 4.74286 13.2292C4.70856 13.2209 4.67763 13.2023 4.65422 13.1759L3.77742 12.2099C3.7495 12.1788 3.71135 12.1587 3.66991 12.1534C3.62847 12.148 3.58648 12.1576 3.55154 12.1806C3.08027 12.4865 2.50852 12.6701 1.86123 12.6701C1.35094 12.6701 0.9375 13.0837 0.9375 13.5938V16.4061C0.9375 16.9162 1.35094 17.3298 1.86123 17.3298C4.63061 17.3298 6.01998 20.6848 4.06195 22.6428C3.70131 23.0035 3.70131 23.5886 4.06195 23.9493L6.05068 25.938C6.41133 26.2987 6.99645 26.2987 7.35709 25.938C9.31758 23.9774 12.6701 25.366 12.6701 28.1387C12.6701 28.6491 13.0838 29.0624 13.5938 29.0624H16.4062C16.9163 29.0624 17.3299 28.6491 17.3299 28.1387C17.3299 26.8038 18.1097 25.7898 19.1365 25.3167C19.1618 25.3055 19.184 25.2883 19.2012 25.2666C19.2184 25.2449 19.2301 25.2194 19.2352 25.1923L19.4777 24.008C19.4868 23.9664 19.4799 23.9229 19.4584 23.8861L18.8743 22.8547C18.7906 22.707 18.9454 22.5378 19.1 22.6081L20.923 23.4369C20.9552 23.4511 20.9824 23.4749 21.0008 23.505C21.0192 23.5351 21.0279 23.5701 21.0258 23.6054L20.9627 24.9086C20.9605 24.9503 20.9733 24.9914 20.9988 25.0245C21.0243 25.0576 21.0608 25.0805 21.1017 25.089C21.6513 25.2059 22.1854 25.4804 22.643 25.938C23.0037 26.2987 23.5888 26.2987 23.9494 25.938L25.9382 23.9493C26.2988 23.5886 26.2988 23.0036 25.9382 22.6429C23.9801 20.6849 25.3696 17.3299 28.1389 17.3299C28.6492 17.3299 29.0626 16.9162 29.0626 16.4062V13.5939C29.0623 13.0837 28.649 12.6701 28.1386 12.6701ZM14.9998 21.7567C11.2682 21.7567 8.24314 18.7316 8.24314 15C8.24314 11.2684 11.2682 8.24332 14.9998 8.24332C18.7315 8.24332 21.7565 11.2684 21.7565 15C21.7565 18.7316 18.7315 21.7567 14.9998 21.7567Z" fill="#1A7E00" />
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_104_322">
                                                <rect width="30" height="30" fill="white" />
                                            </clipPath>
                                        </defs>
                                    </svg>

                                </div>
                                <div className="content">
                                    <p className="title text-muted">
                                        Out of Service
                                    </p>
                                    <h3>{stats.outOfService}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="row g-4 mb-4">
                <div className="col-lg-12 col-xl-4 ">
                    <div className="card p-25 sticky-lg-top">
                        <h4 className="fw-600 fs-20">Vehicle Status Distribution</h4>
                        <VehicleStatusChart series={series} />
                    </div>
                </div>
                <div className="col-lg-12 col-xl-8">
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
                                    placeholder="Search by vehicle number..."
                                />
                            </div>
                            <DataExporter
                                data={filteredData}
                                columns={columns}
                                filename="VehicleReports"
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

export default VehicleReports;