import { useState, useEffect } from 'react';
import { Link } from "react-router";
import DataTable from "../../components/DataTable";
import { House, ChevronRight, Trash2, Search, AlignJustify, LayoutGrid } from "lucide-react";
import DeleteModal from "../../components/modal/DeleteModal";
import { getAllSystemAlert, deleteSystemAlert } from '../../services/settingService';
import { toast } from 'react-hot-toast';
import HeadTags from '../../components/HeadTags';
import moment from 'moment';
import TopProgressBar from '../../components/TopProgressBar';

const SystemAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [deleteId, setDeleteId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statuses, setStatuses] = useState(['error', 'warning', 'info']);
    const [statusFilter, setStatusFilter] = useState("");

    // Calculate status counts
    const statusCounts = {
        Critical: alerts.filter((item) => item.type === 'error').length,
        Warning: alerts.filter((item) => item.type === 'warning').length,
        Info: alerts.filter((item) => item.type === 'info').length,
    };

    // Fetch alerts and status types on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getAllSystemAlert();

                if (response.success) {
                    // Add serial number (sn) to each alert
                    const dataWithSn = response.data.map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }));
                    setAlerts(dataWithSn);
                } else {
                    toast.error('Failed to load alerts');
                }
            } catch (error) {
                toast.error('Error fetching alerts');
                console.error('Fetch error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filter alerts based on search and status
     const filteredData = alerts.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase()) &&
        (statusFilter === "" || item.type === statusFilter)
    );

    const columns = [
        { key: 'sn', label: 'SN' },
        {

            key: 'type',
            label: 'Status',
            render: (value) => {
                let statusClass = 'status';
                if (value === 'info') statusClass += ' status-info';
                else if (value === 'warning') statusClass += ' status-warning';
                else statusClass += ' status-danger';

                return <span className={statusClass}>{value}</span>;
            }
        },
        { key: 'title', label: 'Alert Title' },
        { key: 'message', label: 'Message' },
        { key: 'created_at', label: 'Created At',
            render: (value) => moment(value).format('LL') || 'N/A',
         },

    ];

    // Handle delete action
    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            const response = await deleteSystemAlert(deleteId);
            if (response.success) {
                // Update alerts list and reassign SN after deletion
                setAlerts((prev) =>
                    prev.filter((item) => item.id !== deleteId).map((item, index) => ({
                        ...item,
                        sn: index + 1,
                    }))
                );
                toast.success(response.message || 'Alert deleted successfully');
                setDeleteId(null);
            } else {
                toast.error(response.message || 'Failed to delete alert');
            }
        } catch (error) {
            toast.error('Error deleting alert');
            console.error('Delete error:', error);
        }
    };

    return (
        <>
            <HeadTags title="System Alerts" />
            <TopProgressBar loading={loading} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">System Alerts</h3>
                    <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
                        <div className="breadcrumb-wrap">
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb pb-0 mb-0">
                                    <li className="breadcrumb-item"><Link to="" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                    <li className="breadcrumb-item"><ChevronRight /></li>
                                    <li className="breadcrumb-item active">System Alerts</li>
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
                                        <g clipPath="url(#clip0_378_419)">
                                            <path d="M15 0.9375C12.2187 0.9375 9.49987 1.76225 7.1873 3.30746C4.87473 4.85267 3.07231 7.04893 2.00795 9.61851C0.943593 12.1881 0.665109 15.0156 1.20771 17.7435C1.75032 20.4713 3.08964 22.977 5.05632 24.9437C7.02299 26.9104 9.52869 28.2497 12.2565 28.7923C14.9844 29.3349 17.8119 29.0564 20.3815 27.9921C22.9511 26.9277 25.1473 25.1253 26.6925 22.8127C28.2378 20.5001 29.0625 17.7813 29.0625 15C29.0613 11.2708 27.5793 7.69464 24.9423 5.05768C22.3054 2.42072 18.7292 0.938742 15 0.9375ZM15 23.4375C14.6292 23.4375 14.2667 23.3275 13.9583 23.1215C13.65 22.9155 13.4096 22.6226 13.2677 22.28C13.1258 21.9374 13.0887 21.5604 13.161 21.1967C13.2334 20.833 13.412 20.4989 13.6742 20.2367C13.9364 19.9745 14.2705 19.7959 14.6342 19.7235C14.9979 19.6512 15.3749 19.6883 15.7175 19.8302C16.0601 19.9721 16.353 20.2125 16.559 20.5208C16.765 20.8291 16.875 21.1917 16.875 21.5625C16.8735 22.0593 16.6755 22.5354 16.3242 22.8867C15.9729 23.238 15.4968 23.436 15 23.4375ZM17.1469 8.89687L16.5188 16.4156C16.486 16.7959 16.3118 17.15 16.0306 17.408C15.7494 17.666 15.3816 17.8092 15 17.8092C14.6184 17.8092 14.2506 17.666 13.9694 17.408C13.6882 17.15 13.514 16.7959 13.4813 16.4156L12.8531 8.89687C12.826 8.60565 12.8585 8.31195 12.9485 8.03365C13.0385 7.75536 13.1842 7.49829 13.3767 7.27807C13.5692 7.05786 13.8045 6.87911 14.0682 6.7527C14.332 6.6263 14.6187 6.55487 14.9109 6.54277C15.2032 6.53068 15.4948 6.57816 15.7681 6.68234C16.0414 6.78651 16.2907 6.94521 16.5007 7.14876C16.7108 7.35231 16.8772 7.59646 16.9899 7.86636C17.1026 8.13627 17.1592 8.42628 17.1563 8.71875C17.1578 8.77828 17.1547 8.83784 17.1469 8.89687Z" fill="#DC2626" />
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_378_419">
                                                <rect width="30" height="30" fill="white" />
                                            </clipPath>
                                        </defs>
                                    </svg>
                                </div>
                                <div className="content">
                                    <p className="title text-muted">Critical Alerts</p>
                                    <h3>{statusCounts.Critical}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-4 col-xl-4">
                        <div className="card p-25">
                            <div className="d-flex">
                                <div className="icon">
                                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M29.736 24.9648L16.5741 3.13694C16.4105 2.86571 16.1796 2.64135 15.9038 2.4856C15.628 2.32986 15.3167 2.24802 14.9999 2.24802C14.6832 2.24802 14.3719 2.32986 14.0961 2.4856C13.8203 2.64135 13.5894 2.86571 13.4258 3.13694L0.264029 24.9648C0.0958853 25.2437 0.00483301 25.5622 0.000187149 25.8877C-0.00445871 26.2133 0.0774687 26.5343 0.237588 26.8178C0.397707 27.1014 0.63027 27.3373 0.911486 27.5014C1.1927 27.6656 1.51247 27.7521 1.83809 27.7521H28.1619C28.4875 27.752 28.8072 27.6655 29.0884 27.5014C29.3696 27.3372 29.6022 27.1013 29.7623 26.8178C29.9224 26.5343 30.0044 26.2133 29.9997 25.8877C29.9951 25.5622 29.9041 25.2437 29.736 24.9648ZM15.0098 9.79846C15.7657 9.79846 16.4053 10.2249 16.4053 10.9808C16.4053 13.2872 16.134 16.6016 16.134 18.908C16.134 19.5089 15.475 19.7608 15.0098 19.7608C14.3896 19.7608 13.8663 19.5089 13.8663 18.908C13.8663 16.6016 13.595 13.2872 13.595 10.9808C13.595 10.2249 14.2151 9.79846 15.0098 9.79846ZM15.0292 24.0831C14.1764 24.0831 13.5367 23.3854 13.5367 22.5907C13.5367 21.7767 14.1764 21.0983 15.0292 21.0983C15.8238 21.0983 16.5022 21.7767 16.5022 22.5907C16.5022 23.3854 15.8238 24.0831 15.0292 24.0831Z" fill="#FBBC04" />
                                    </svg>
                                </div>
                                <div className="content">
                                    <p className="title text-muted">
                                        Warnings
                                    </p>
                                    <h3>{statusCounts.Warning}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-4 col-xl-4">
                        <div className="card p-25">
                            <div className="d-flex">
                                <div className="icon">
                                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_378_427)">
                                            <path d="M14.9994 0C6.71619 0 0 6.71619 0 14.9994C0 23.2825 6.71619 30 14.9994 30C23.2825 30 30 23.2825 30 14.9994C30 6.71619 23.2825 0 14.9994 0ZM18.1219 23.247C17.3498 23.5517 16.7352 23.7829 16.2743 23.9429C15.7572 24.1117 15.2156 24.1928 14.6717 24.1829C13.7371 24.1829 13.0095 23.9543 12.4914 23.4984C11.9733 23.0425 11.7156 22.4648 11.7156 21.7625C11.7156 21.4895 11.7346 21.2102 11.7727 20.9257C11.8198 20.6017 11.8821 20.2801 11.9594 19.9619L12.9257 16.5486C13.0108 16.221 13.0844 15.9098 13.1429 15.6203C13.2013 15.3283 13.2292 15.0603 13.2292 14.8165C13.2292 14.3822 13.139 14.0775 12.96 13.906C12.7784 13.7346 12.4368 13.6508 11.9276 13.6508C11.6787 13.6508 11.4222 13.6876 11.1594 13.7651C10.899 13.8451 10.673 13.9175 10.4876 13.9886L10.7429 12.9371C11.3752 12.6794 11.981 12.4584 12.5587 12.2756C13.0871 12.0988 13.6397 12.0054 14.1968 11.9987C15.1251 11.9987 15.8413 12.2248 16.3454 12.6717C16.847 13.12 17.0997 13.7029 17.0997 14.419C17.0997 14.5676 17.0819 14.8292 17.0476 15.2025C17.0178 15.5514 16.9532 15.8964 16.8546 16.2324L15.8933 19.6356C15.8072 19.9434 15.7364 20.2553 15.6813 20.5702C15.6289 20.8322 15.5979 21.098 15.5886 21.3651C15.5886 21.8171 15.6889 22.1257 15.8921 22.2895C16.0927 22.4533 16.4444 22.5359 16.9422 22.5359C17.1771 22.5359 17.44 22.494 17.7371 22.4127C18.0317 22.3314 18.2451 22.259 18.3797 22.1968L18.1219 23.247ZM17.9517 9.43365C17.5147 9.84582 16.9334 10.0701 16.3327 10.0584C15.7029 10.0584 15.1594 9.85016 14.7073 9.43365C14.4923 9.24455 14.3206 9.01136 14.2038 8.74995C14.087 8.48853 14.0279 8.20503 14.0305 7.91873C14.0305 7.32825 14.259 6.82032 14.7073 6.4C15.1453 5.98454 15.7291 5.75788 16.3327 5.76889C16.9638 5.76889 17.5048 5.97841 17.9517 6.4C18.4 6.82032 18.6248 7.32825 18.6248 7.91873C18.6248 8.51175 18.4 9.01714 17.9517 9.43365Z" fill="#2563EB" />
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_378_427">
                                                <rect width="30" height="30" fill="white" />
                                            </clipPath>
                                        </defs>
                                    </svg>
                                </div>
                                <div className="content">
                                    <p className="title text-muted">
                                        Informations
                                    </p>
                                    <h3>{statusCounts.Info}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="filter row g-4 mb-3">
                <div className="col-md-6">
                    <div className="d-flex justify-content-start align-items-center flex-wrap gap-15">
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
                                placeholder="Search by alert title..."
                            />
                        </div>
                        <div className="row">
                            <div className="col-12">
                                <div className="list-group flex-row tab" id="list-tab" role="tablist">
                                    <a className="list-group-item tab-item list-group-item-action active" id="list-home-list" data-bs-toggle="list" href="#list-home" role="tab" aria-controls="list-home"><AlignJustify />List</a>
                                    <a className="list-group-item tab-item list-group-item-action" id="list-profile-list" data-bs-toggle="list" href="#list-profile" role="tab" aria-controls="list-profile"><LayoutGrid />Grid</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="tab-content mb-4" id="nav-tabContent">
                <div className="tab-pane show active" id="list-home" role="tabpanel" aria-labelledby="list-home-list">
                    <div className="card p-25">
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
                                <div className="actions">
                                    <button className="action-button delete" onClick={() => setDeleteId(row.id)} data-bs-toggle="modal" data-bs-target="#deleteModal"><Trash2 /></button>
                                </div>
                            )}
                        />
                    </div>
                </div>
                <div className="tab-pane" id="list-profile" role="tabpanel" aria-labelledby="list-profile-list">
                    <div className="row g-3">
                        {filteredData.map((item) => (
                            <div key={item.id} className="col-lg-6 col-xl-4">
                                <div className={`alert-card ${item.type.toLowerCase()} flat-shadow`}>
                                    <div className="top-content d-flex align-items-center gap-20 mb-20">
                                        <div className="icon-wrap">
                                            {
                                                item.type === 'error' ? (
                                                    <svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <g clipPath="url(#clip0_24_407)">
                                                            <path d="M16 8C16 10.1217 15.1571 12.1566 13.6569 13.6569C12.1566 15.1571 10.1217 16 8 16C5.87827 16 3.84344 15.1571 2.34315 13.6569C0.842855 12.1566 0 10.1217 0 8C0 5.87827 0.842855 3.84344 2.34315 2.34315C3.84344 0.842855 5.87827 0 8 0C10.1217 0 12.1566 0.842855 13.6569 2.34315C15.1571 3.84344 16 5.87827 16 8ZM8 4C7.87361 4.00007 7.74863 4.02662 7.63312 4.07793C7.51761 4.12924 7.41413 4.20418 7.32934 4.29791C7.24456 4.39165 7.18035 4.5021 7.14084 4.62217C7.10134 4.74223 7.08743 4.86923 7.1 4.995L7.45 8.502C7.46176 8.63977 7.5248 8.76811 7.62664 8.86164C7.72849 8.95516 7.86173 9.00705 8 9.00705C8.13827 9.00705 8.27151 8.95516 8.37336 8.86164C8.4752 8.76811 8.53824 8.63977 8.55 8.502L8.9 4.995C8.91257 4.86923 8.89866 4.74223 8.85915 4.62217C8.81965 4.5021 8.75544 4.39165 8.67066 4.29791C8.58587 4.20418 8.48239 4.12924 8.36688 4.07793C8.25137 4.02662 8.12639 4.00007 8 4ZM8.002 10C7.73678 10 7.48243 10.1054 7.29489 10.2929C7.10736 10.4804 7.002 10.7348 7.002 11C7.002 11.2652 7.10736 11.5196 7.29489 11.7071C7.48243 11.8946 7.73678 12 8.002 12C8.26722 12 8.52157 11.8946 8.70911 11.7071C8.89664 11.5196 9.002 11.2652 9.002 11C9.002 10.7348 8.89664 10.4804 8.70911 10.2929C8.52157 10.1054 8.26722 10 8.002 10Z" fill="#DC2626" />
                                                        </g>
                                                        <defs>
                                                            <clipPath id="clip0_24_407">
                                                                <rect width="30" height="30" fill="white" />
                                                            </clipPath>
                                                        </defs>
                                                    </svg>

                                                ) : item.type === 'warning' ? (
                                                    <svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <g clipPath="url(#clip0_24_444)">
                                                            <path d="M8.98195 1.56595C8.88296 1.39352 8.74022 1.25025 8.56815 1.15062C8.39608 1.051 8.20078 0.998535 8.00195 0.998535C7.80312 0.998535 7.60781 1.051 7.43574 1.15062C7.26367 1.25025 7.12094 1.39352 7.02195 1.56595L0.164946 13.233C-0.292054 14.011 0.255946 15 1.14495 15H14.8579C15.7469 15 16.2959 14.01 15.8379 13.233L8.98195 1.56595ZM7.99995 4.99995C8.53495 4.99995 8.95395 5.46195 8.89995 5.99495L8.54995 9.50195C8.53819 9.63972 8.47515 9.76806 8.3733 9.86159C8.27145 9.95511 8.13822 10.007 7.99995 10.007C7.86167 10.007 7.72844 9.95511 7.62659 9.86159C7.52474 9.76806 7.46171 9.63972 7.44995 9.50195L7.09995 5.99495C7.08738 5.86919 7.10129 5.74218 7.14079 5.62212C7.18029 5.50206 7.2445 5.3916 7.32929 5.29786C7.41408 5.20413 7.51756 5.12919 7.63307 5.07788C7.74858 5.02657 7.87355 5.00002 7.99995 4.99995ZM8.00195 11C8.26716 11 8.52152 11.1053 8.70905 11.2928C8.89659 11.4804 9.00195 11.7347 9.00195 12C9.00195 12.2652 8.89659 12.5195 8.70905 12.7071C8.52152 12.8946 8.26716 13 8.00195 13C7.73673 13 7.48238 12.8946 7.29484 12.7071C7.1073 12.5195 7.00195 12.2652 7.00195 12C7.00195 11.7347 7.1073 11.4804 7.29484 11.2928C7.48238 11.1053 7.73673 11 8.00195 11Z" fill="#D97706" />
                                                        </g>
                                                        <defs>
                                                            <clipPath id="clip0_24_444">
                                                                <rect width="24" height="24" fill="white" />
                                                            </clipPath>
                                                        </defs>
                                                    </svg>

                                                ) : (
                                                    <svg width="24" height="24" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <g clipPath="url(#clip0_378_427)">
                                                            <path d="M14.9994 0C6.71619 0 0 6.71619 0 14.9994C0 23.2825 6.71619 30 14.9994 30C23.2825 30 30 23.2825 30 14.9994C30 6.71619 23.2825 0 14.9994 0ZM18.1219 23.247C17.3498 23.5517 16.7352 23.7829 16.2743 23.9429C15.7572 24.1117 15.2156 24.1928 14.6717 24.1829C13.7371 24.1829 13.0095 23.9543 12.4914 23.4984C11.9733 23.0425 11.7156 22.4648 11.7156 21.7625C11.7156 21.4895 11.7346 21.2102 11.7727 20.9257C11.8198 20.6017 11.8821 20.2801 11.9594 19.9619L12.9257 16.5486C13.0108 16.221 13.0844 15.9098 13.1429 15.6203C13.2013 15.3283 13.2292 15.0603 13.2292 14.8165C13.2292 14.3822 13.139 14.0775 12.96 13.906C12.7784 13.7346 12.4368 13.6508 11.9276 13.6508C11.6787 13.6508 11.4222 13.6876 11.1594 13.7651C10.899 13.8451 10.673 13.9175 10.4876 13.9886L10.7429 12.9371C11.3752 12.6794 11.981 12.4584 12.5587 12.2756C13.0871 12.0988 13.6397 12.0054 14.1968 11.9987C15.1251 11.9987 15.8413 12.2248 16.3454 12.6717C16.847 13.12 17.0997 13.7029 17.0997 14.419C17.0997 14.5676 17.0819 14.8292 17.0476 15.2025C17.0178 15.5514 16.9532 15.8964 16.8546 16.2324L15.8933 19.6356C15.8072 19.9434 15.7364 20.2553 15.6813 20.5702C15.6289 20.8322 15.5979 21.098 15.5886 21.3651C15.5886 21.8171 15.6889 22.1257 15.8921 22.2895C16.0927 22.4533 16.4444 22.5359 16.9422 22.5359C17.1771 22.5359 17.44 22.494 17.7371 22.4127C18.0317 22.3314 18.2451 22.259 18.3797 22.1968L18.1219 23.247ZM17.9517 9.43365C17.5147 9.84582 16.9334 10.0701 16.3327 10.0584C15.7029 10.0584 15.1594 9.85016 14.7073 9.43365C14.4923 9.24455 14.3206 9.01136 14.2038 8.74995C14.087 8.48853 14.0279 8.20503 14.0305 7.91873C14.0305 7.32825 14.259 6.82032 14.7073 6.4C15.1453 5.98454 15.7291 5.75788 16.3327 5.76889C16.9638 5.76889 17.5048 5.97841 17.9517 6.4C18.4 6.82032 18.6248 7.32825 18.6248 7.91873C18.6248 8.51175 18.4 9.01714 17.9517 9.43365Z" fill="#2563EB" />
                                                        </g>
                                                        <defs>
                                                            <clipPath id="clip0_378_427">
                                                                <rect width="24" height="24" fill="white" />
                                                            </clipPath>
                                                        </defs>
                                                    </svg>
                                                )
                                            }
                                        </div>
                                        <div className="title">
                                            <h6 className="fw-500 fs-18">{item.title}</h6>
                                            <span className="fs-16">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bottom-content d-flex justify-content-end gap-20">
                                        <button
                                            className="border-0 bg-transparent"
                                            data-bs-toggle="modal"
                                            data-bs-target="#deleteModal"
                                            onClick={() => setDeleteId(item.id)}
                                        >
                                            <Trash2 />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <DeleteModal handleDelete={handleDelete} />
        </>
    )
}

export default SystemAlerts;