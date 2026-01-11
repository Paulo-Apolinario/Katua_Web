import { useState, useEffect } from 'react';
import { Link } from "react-router";
import { House, ChevronRight, User } from "lucide-react";
import { getAllStaff } from '../../services/staffService';
import { createZone } from '../../services/zoneService';
import { toast } from 'react-hot-toast';
import HeadTags from '../../components/HeadTags';

const AddZone = () => {

    // Initial form state
    const initialFormState = {
        zone_name: '',
        area_name: '',
        assigned_staff_id: '',
        zone_type: '',
        special_instructions: '',
        status: 'active',
    };

    const [formData, setFormData] = useState(initialFormState);
    const [errors, setErrors] = useState({});
    const [staff, setStaff] = useState([]);

    // Fetch staff for dropdown
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getAllStaff();

                if (response.success) {
                    setStaff(response.data);
                } else {
                    toast.error('Failed to load staff');
                }
            } catch (error) {
                toast.error('Error fetching staff');
                console.error('Fetch error:', error);
            }
        };
        fetchData();
    }, []);

    // Handle input changes for controlled inputs
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        // Prepare data for API request
        const dataToSend = {
            name: formData.zone_name,
            area_names: formData.area_name,
            staff_id: formData.assigned_staff_id,
            zone_type: formData.zone_type || null,
            description: formData.special_instructions || null,
            status: formData.status,
        };

        try {
            const response = await createZone(dataToSend);
            if (response.success) {
                toast.success(response.message || 'Zone created successfully');
                setFormData(initialFormState);
                setErrors({}); 

            } else {
                toast.error(response.message || 'Failed to create zone');
                setErrors(response.errors || {});
            }

        } catch (err) {
            if (err?.errors) {
                setErrors(err.errors);
            } else {
                toast.error(err?.message || 'Failed to create zone');
            }
        }
    };

    return (
        <>
           <HeadTags title="Create Zone" />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Create Zone</h3>
                </div>
                <div className="page-tool d-flex justify-content-between align-items-center">
                    <div className="breadcrumb-wrap">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb pb-0 mb-0">
                                <li className="breadcrumb-item"><Link to="/" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                <li className="breadcrumb-item"><ChevronRight /></li>
                                <li className="breadcrumb-item" ><Link to="/zone-list">Zone List</Link></li>
                                <li className="breadcrumb-item"><ChevronRight /></li>
                                <li className="breadcrumb-item active" aria-current="page">Create New</li>
                            </ol>
                        </nav>
                    </div>
                </div>
            </div>
            <div className="row justify-content-center mb-4">
                <div className="col-lg-10 col-xl-8">
                    <div className="card p-25">
                        <h3 className="fw-600 fs-18 mb-4">Basic Zone Information</h3>
                        <form className="form" onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label htmlFor="zone_name" className="form-label">
                                    Zone Name <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="zone_name"
                                    name="zone_name"
                                    value={formData.zone_name}
                                    onChange={handleInputChange}
                                    placeholder="Enter Zone Name"
                                />
                                {errors.name && <div className="text-danger small mt-1">{errors.name[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="area_name" className="form-label">
                                    Area Name(s) <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="area_name"
                                    name="area_name"
                                    value={formData.area_name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Area 1, Area 2"
                                />
                                {errors.area_names && <div className="text-danger small mt-1">{errors.area_names[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="assigned_staff_id" className="form-label">
                                    Assigned Staff <span className="text-danger">*</span>
                                </label>
                                <div className="left-inner-addon">
                                    <span className="icon">
                                        <User />
                                    </span>
                                    <select
                                        className="form-select"
                                        id="assigned_staff_id"
                                        name="assigned_staff_id"
                                        value={formData.assigned_staff_id}
                                        onChange={handleInputChange}
                                    >
                                        <option value="" disabled>
                                            Select Staff
                                        </option>
                                        {staff.map((member) => (
                                            <option key={member.id} value={member.id}>
                                                {member.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.staff_id && <div className="text-danger small mt-1">{errors.staff_id[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="zone_type" className="form-label">
                                    Zone Type
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="zone_type"
                                    name="zone_type"
                                    value={formData.zone_type}
                                    onChange={handleInputChange}
                                    placeholder="Enter zone type"
                                />
                                {errors.zone_type && <div className="text-danger small mt-1">{errors.zone_type[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="special_instructions" className="form-label">
                                    Special Instructions
                                </label>
                                <textarea
                                    className="form-control textarea"
                                    id="special_instructions"
                                    name="special_instructions"
                                    value={formData.special_instructions}
                                    onChange={handleInputChange}
                                    placeholder="Enter any special instructions or notes for this zone"
                                />
                                {errors.description && <div className="text-danger small mt-1">{errors.description[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label className="form-label">Status</label>
                                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                                    {['active', 'inactive'].map((status) => (
                                        <div className="form-check" key={status}>
                                            <input
                                                className="form-check-input"
                                                type="radio"
                                                name="status"
                                                id={status}
                                                value={status}
                                                checked={formData.status === status}
                                                onChange={handleInputChange}
                                            />
                                            <label className="form-check-label" htmlFor={status}>
                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {errors.status && <div className="text-danger small mt-1">{errors.status}</div>}
                            </div>
                            <div className="d-flex gap-20">
                                <Link to="/zone-list" className="btn-md outline-btn">Back</Link>
                                <button className="btn-md primary-btn border-0">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}

export default AddZone;