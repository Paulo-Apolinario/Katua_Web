import { useState, useEffect } from "react";
import { Link } from "react-router";
import DataTable from "../../components/DataTable";
import DataExporter from "../../components/DataExporter";
import { House, ChevronRight, Search, } from "lucide-react";
import { toast } from 'react-hot-toast';
import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

const StaffReports = () => {
    const [staffData, setStaffData] = useState([]);
    const [stats, setStats] = useState({
        totalStaff: 0,
        activeStaff: 0,
        routesCompleted: 0,
    });
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('auth_token');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {

                // Fetch staff data
                const staffResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/staff-reports`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        'Authorization': `Bearer ${token}`
                    },
                    credentials: "include",
                });

                const staffResult = await staffResponse.json();
                setStaffData(staffResult.data);

                // Fetch statistics
                const statsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/staff-stats`, {
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
                    totalStaff: statsResult.data.total_staff,
                    activeStaff: statsResult.data.active_staff,
                    routesCompleted: statsResult.data.completed_routes,
                });

            } catch (err) {
                toast.error(`Error: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Filter staff data based on search input
    const filteredData = staffData.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    const columns = [
        { key: "sn", label: "SN" },
        { key: "name", label: "Name" },
        { key: "role", label: "Role" },
        { key: "routes_completed", label: "Routes Completed" },
        { key: "assigned_route", label: "Assigned Route" },
        { key: "vehicle_number", label: "Assigned Vehicle" },
        {
            key: 'status',
            label: 'Status',
            render: (value) => {
                let statusClass = 'status';
                if (value === 'active') statusClass += ' status-success';
                else if (value === 'inactive') statusClass += ' status-warning';
                else if (value === 'suspended') statusClass += ' status-danger';
                else statusClass += ' status-danger';
                return <span className={statusClass}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>;
            },
        },
    ];

    return (
        <>
          <HeadTags title="Staff Reports" />
          <TopProgressBar loading={loading} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Staff Reports</h3>
                    <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
                        <div className="breadcrumb-wrap">
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb pb-0 mb-0">
                                    <li className="breadcrumb-item"><Link to="" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                    <li className="breadcrumb-item"><ChevronRight /></li>
                                    <li className="breadcrumb-item active">Staff Reports</li>
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
                                        <path fillRule="evenodd" clipRule="evenodd" d="M6.33431 7.60547C7.76751 5.97247 9.82767 5.02266 12.022 5.02266C14.2187 5.02266 16.2765 5.97247 17.7097 7.60547C17.6904 4.48419 15.1468 1.95059 12.022 1.95059C8.8972 1.95059 6.35364 4.48419 6.33431 7.60547ZM17.5667 28.7865C17.1243 27.8959 16.8847 26.8043 16.8847 25.6453C16.8847 25.5568 16.887 25.4648 16.8941 25.3465C16.8988 25.2879 16.8824 25.2445 16.8413 25.2018C16.8009 25.159 16.7599 25.1408 16.7001 25.1408H7.34388C7.28646 25.1408 7.24368 25.159 7.20267 25.2018C7.16224 25.2445 7.14759 25.2879 7.14993 25.3465C7.15696 25.4648 7.15931 25.5568 7.15931 25.6453C7.15931 26.8043 6.92025 27.8959 6.47962 28.7865H17.5667ZM27.6982 26.3033H20.8755L20.2462 28.7859H21.5335V27.7922C21.5335 27.5982 21.6917 27.4406 21.8851 27.4406C22.079 27.4406 22.2367 27.5982 22.2367 27.7922V28.7859H23.9329V27.3416C23.9329 27.1477 24.0911 26.99 24.2845 26.99C24.4785 26.99 24.6361 27.1477 24.6361 27.3416V28.7859H26.3353V27.7922C26.3353 27.5982 26.4935 27.4406 26.6868 27.4406C26.8808 27.4406 27.0384 27.5982 27.0384 27.7922V28.7859H28.3234L27.6982 26.3033ZM23.6206 23.0977L22.6585 24.1195C22.2993 24.5016 21.8329 24.7031 21.3068 24.7031H21.039C20.7923 24.7031 20.5913 24.9041 20.5913 25.1514V25.5996H27.9829V25.1514C27.9829 24.9041 27.782 24.7031 27.5329 24.7031H27.2652C26.7413 24.7031 26.2743 24.501 25.9134 24.1195L24.9513 23.0977H23.6206ZM23.8216 11.4779V22.3951H24.7527V11.4779C24.7527 11.2219 24.5423 11.0133 24.2863 11.0133C24.0296 11.0127 23.8216 11.2213 23.8216 11.4779ZM17.04 20.5811L19.6913 21.4881C20.6201 21.8057 21.2587 22.5053 21.4931 23.4574L21.6173 23.9602C21.5195 23.9859 21.4163 24 21.3062 24H21.0384C20.4044 24 19.8876 24.5168 19.8876 25.1514V25.9512C19.8876 26.1158 20.0001 26.2529 20.1531 26.2916L19.5214 28.7859H18.4831L19.3855 26.1486C19.4154 26.0602 19.4091 25.9635 19.3678 25.8798C19.3264 25.7961 19.2536 25.7322 19.1652 25.7022C18.9835 25.6395 18.7826 25.7373 18.7199 25.9213L18.0021 28.0225C17.7343 27.3164 17.5878 26.4926 17.5878 25.6447C17.5878 25.5703 17.5902 25.4912 17.5972 25.3875C17.6118 25.1344 17.5281 24.9035 17.3529 24.719C17.2651 24.625 17.1582 24.5511 17.0394 24.5022V20.5811H17.04ZM15.0085 19.8867V24.4371H16.3368V20.3402L15.0085 19.8867ZM7.00696 24.5022C6.88978 24.5496 6.78431 24.6217 6.69114 24.719C6.51888 24.9035 6.43509 25.1344 6.44974 25.3875C6.45443 25.4912 6.45911 25.5703 6.45911 25.6447C6.45911 26.4926 6.31087 27.3164 6.04486 28.0225L5.32708 25.9213C5.26263 25.7379 5.064 25.6395 4.87943 25.7022C4.79109 25.7323 4.7183 25.7962 4.67701 25.8799C4.63571 25.9636 4.62928 26.0602 4.65911 26.1486L5.56146 28.7859H2.87904C2.47005 28.7859 2.1179 28.6154 1.86712 28.2932C1.61341 27.9709 1.53196 27.59 1.6304 27.1928L2.5515 23.458C2.78587 22.5053 3.42747 21.8063 4.3556 21.4887L7.00696 20.5816V24.5022ZM9.03607 24.4371V19.8867L7.70775 20.3402V24.4371H9.03607ZM14.3072 20.5699C13.7113 20.9648 12.9003 21.194 12.022 21.194C11.1437 21.194 10.3327 20.9654 9.73919 20.5699V24.4371H14.3072V20.5699ZM14.3072 17.0602C13.6058 17.5318 12.8142 17.7686 12.022 17.7686C11.2298 17.7686 10.4376 17.5324 9.73919 17.0602V19.643C10.1722 20.1604 11.0529 20.4902 12.022 20.4902C12.9911 20.4902 13.8718 20.1604 14.3072 19.643V17.0602ZM7.58587 9.53848C7.65032 9.34454 7.72943 9.15469 7.81556 8.96895C7.57122 9.11368 7.33685 9.27422 7.11185 9.44883C7.27474 9.45704 7.43236 9.48751 7.58587 9.53848ZM16.4611 9.53848C16.6117 9.48751 16.7722 9.45704 16.9327 9.44883C16.7077 9.27422 16.4734 9.11368 16.229 8.96895C16.3152 9.15411 16.3937 9.34454 16.4611 9.53848ZM16.7839 11.4568V12.3018C16.7839 12.7195 16.7406 13.1309 16.6544 13.5305C16.6714 13.5293 16.6878 13.5287 16.7072 13.5264C17.6786 13.3945 18.4087 12.5561 18.4087 11.5764V11.3789C18.4087 10.6998 17.8585 10.1473 17.1788 10.1473H17.0259C16.8964 10.1473 16.7699 10.1707 16.6503 10.2152C16.7391 10.6231 16.7839 11.0394 16.7839 11.4568ZM7.26009 11.4568C7.26009 11.0379 7.30579 10.6219 7.39427 10.2158C7.27474 10.1713 7.14759 10.1479 7.01868 10.1479H6.8681C6.18841 10.1479 5.63587 10.7004 5.63587 11.3795V11.577C5.63587 12.5566 6.36829 13.3951 7.33743 13.527C7.35677 13.5293 7.37318 13.5299 7.39017 13.5311C7.30638 13.1315 7.26068 12.7201 7.26068 12.3024V11.4568H7.26009ZM11.3306 7.99454H12.7134C13.532 7.99454 14.3359 8.14337 15.0917 8.42403C15.7304 9.29122 16.0826 10.3641 16.0826 11.4574V12.3024C16.0826 13.9389 15.3074 15.4734 14.0124 16.4086C12.8042 17.2811 11.2415 17.2811 10.0304 16.4086C8.73607 15.4734 7.96321 13.9383 7.96321 12.3024V11.4574C7.96321 10.3641 8.31478 9.2918 8.95169 8.42403C9.70814 8.14337 10.5144 7.99454 11.3306 7.99454ZM12.022 5.72579C14.3025 5.72579 16.4201 6.85547 17.7097 8.75274V9.1793C16.3316 7.9711 14.5509 7.29141 12.7134 7.29141H11.3306C9.4931 7.29141 7.71478 7.97169 6.33431 9.17989V8.75274C7.62396 6.85606 9.74154 5.72579 12.022 5.72579Z" fill="#1A7E00" />
                                    </svg>
                                </div>
                                <div className="content">
                                    <p className="title text-muted">
                                        Total Staff
                                    </p>
                                    <h3>{stats.totalStaff}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-4 col-xl-4">
                        <div className="card p-25">
                            <div className="d-flex">
                                <div className="icon">
                                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M13.1742 1C11.4823 1 9.8598 1.67212 8.66349 2.8685C7.46719 4.06488 6.79511 5.68753 6.79511 7.37947C6.79511 9.07141 7.46719 10.694 8.66349 11.8904C9.8598 13.0868 11.4823 13.7589 13.1742 13.7589C14.866 13.7589 16.4885 13.0868 17.6848 11.8904C18.8811 10.694 19.5532 9.07141 19.5532 7.37947C19.5532 5.68753 18.8811 4.06488 17.6848 2.8685C16.4885 1.67212 14.866 1 13.1742 1ZM13.8086 16.8745C14.1677 16.3536 13.8228 15.5587 13.1912 15.5587H11.4923C8.97478 15.5587 6.56038 16.5589 4.78023 18.3391C3.00008 20.1194 2 22.534 2 25.0516C2 26.0793 2.40823 27.0649 3.13487 27.7916C3.86152 28.5183 4.84706 28.9266 5.87469 28.9266H13.2834C13.925 28.9266 14.2684 28.1118 13.8966 27.5909C12.7672 26.0088 12.1617 24.1127 12.165 22.1688C12.165 20.2044 12.7725 18.3791 13.8086 16.8745Z" fill="#1A7E00" />
                                        <path fillRule="evenodd" clipRule="evenodd" d="M28.7312 22.1703C28.7312 24.0845 27.9708 25.9203 26.6173 27.2739C25.2638 28.6275 23.4281 29.3879 21.514 29.3879C19.5999 29.3879 17.7642 28.6275 16.4107 27.2739C15.0573 25.9203 14.2969 24.0845 14.2969 22.1703C14.2969 20.256 15.0573 18.4202 16.4107 17.0666C17.7642 15.7131 19.5999 14.9527 21.514 14.9527C23.4281 14.9527 25.2638 15.7131 26.6173 17.0666C27.9708 18.4202 28.7312 20.256 28.7312 22.1703ZM25.6456 19.4266C25.7509 19.5187 25.837 19.6307 25.899 19.7561C25.961 19.8815 25.9976 20.018 26.0068 20.1576C26.0161 20.2972 25.9977 20.4372 25.9528 20.5697C25.9078 20.7022 25.8372 20.8245 25.745 20.9297L22.0974 25.0928C21.9367 25.276 21.74 25.4241 21.5195 25.5279C21.2991 25.6317 21.0596 25.689 20.8161 25.6962C20.5725 25.7034 20.3301 25.6603 20.1039 25.5697C19.8778 25.4791 19.6727 25.3428 19.5015 25.1694L17.4534 23.0971C17.3551 22.9976 17.2773 22.8797 17.2246 22.7501C17.1718 22.6205 17.1451 22.4818 17.146 22.3419C17.1468 22.202 17.1752 22.0636 17.2296 21.9347C17.2839 21.8057 17.3631 21.6888 17.4626 21.5904C17.5622 21.4921 17.6801 21.4144 17.8097 21.3616C17.9392 21.3089 18.0779 21.2822 18.2178 21.283C18.3577 21.2839 18.4961 21.3123 18.625 21.3666C18.7539 21.4209 18.8709 21.5001 18.9692 21.5997L20.2125 22.8601C20.2811 22.9295 20.3632 22.984 20.4537 23.0203C20.5443 23.0565 20.6413 23.0737 20.7388 23.0708C20.8363 23.0679 20.9321 23.0449 21.0203 23.0033C21.1085 22.9616 21.1872 22.9023 21.2515 22.8289L24.1426 19.5274C24.2347 19.4221 24.3467 19.336 24.4721 19.274C24.5975 19.212 24.7339 19.1753 24.8735 19.1661C25.0131 19.1569 25.1531 19.1753 25.2856 19.2202C25.4181 19.2651 25.5404 19.3343 25.6456 19.4266Z" fill="#1A7E00" />
                                    </svg>


                                </div>
                                <div className="content">
                                    <p className="title text-muted">
                                        Active Staff
                                    </p>
                                    <h3>{stats.activeStaff}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-4 col-xl-4">
                        <div className="card p-25">
                            <div className="d-flex">
                                <div className="icon">
                                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_101_906)">
                                            <path d="M23.4375 0C19.8188 0 16.875 2.94375 16.875 6.5625C16.875 9.93 22.14 15.8944 22.74 16.5637C22.9181 16.7606 23.1712 16.875 23.4375 16.875C23.7038 16.875 23.9569 16.7606 24.135 16.5637C24.735 15.8944 30 9.93 30 6.5625C30 2.94375 27.0562 0 23.4375 0ZM23.4375 9.375C21.885 9.375 20.625 8.115 20.625 6.5625C20.625 5.01 21.885 3.75 23.4375 3.75C24.99 3.75 26.25 5.01 26.25 6.5625C26.25 8.115 24.99 9.375 23.4375 9.375ZM0.58875 11.0138C0.414886 11.0838 0.265939 11.2043 0.161033 11.3596C0.0561263 11.515 4.86294e-05 11.6982 0 11.8856L0 29.0625C0 29.3738 0.155625 29.6644 0.4125 29.8387C0.57 29.9437 0.751875 30 0.9375 30C1.05562 30 1.17375 29.9775 1.28625 29.9325L9.375 26.6962V7.5L0.58875 11.0138Z" fill="#1A7E00" />
                                            <path d="M25.53 17.8162C24.9975 18.4087 24.2344 18.75 23.4375 18.75C22.6406 18.75 21.8775 18.4087 21.345 17.8162C21.1537 17.6044 20.9081 17.325 20.625 16.9931V30L29.4112 26.4862C29.7675 26.3456 30 25.9987 30 25.6162V11.8331C28.4644 14.4337 26.4113 16.8337 25.53 17.8162ZM15.5906 9.23625L11.25 7.5V26.6962L18.75 29.6963V14.64C17.5519 13.0256 16.3012 11.0813 15.5906 9.23625Z" fill="#1A7E00" />
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_101_906">
                                                <rect width="30" height="30" fill="white" />
                                            </clipPath>
                                        </defs>
                                    </svg>
                                </div>
                                <div className="content">
                                    <p className="title text-muted">
                                        Routes Completed
                                    </p>
                                    <h3>{stats.routesCompleted}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="row gy-4 mb-4">
                <div className="col-12">
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
                                    placeholder="Search by staff name..."
                                />
                            </div>
                            <DataExporter
                                data={filteredData}
                                columns={columns}
                                filename="StaffReports"
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

export default StaffReports;