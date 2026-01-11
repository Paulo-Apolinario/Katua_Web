import { useState, useRef, useEffect } from 'react';
import { Link } from "react-router";
import { House, ChevronRight } from "lucide-react";
import DragDropUpload from "../../components/DragDropUpload";
import { getAllVehicles } from '../../services/vehicleService';
import { createMaintenanceLog } from '../../services/maintenanceLogService';
import { toast } from 'react-hot-toast';
import HeadTags from '../../components/HeadTags';

const AddMaintenanceLog = () => {
    // Initial form state
    const initialFormState = {
        vehicle_id: '',
        maintenance_type: '',
        maintenance_date: '',
        location: '',
        cost: '',
        performed_by: '',
        next_maintenance_date: '',
        note: '',
        status: 'completed',
    };

    const [formData, setFormData] = useState(initialFormState);
    const [errors, setErrors] = useState({});
    const [vehicles, setVehicles] = useState([]);
    const fileRef = useRef(null);

    // Fetch vehicles for dropdown on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getAllVehicles();

                if (response.success) {
                    setVehicles(response.data);
                } else {
                    toast.error('Failed to load vehicle');
                }
            } catch (error) {
                toast.error('Error fetching vehicle');
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

        // Prepare FormData for API request
        const formDataToSend = new FormData();
        formDataToSend.append('vehicle_id', formData.vehicle_id);
        formDataToSend.append('maintenance_type', formData.maintenance_type);
        formDataToSend.append('maintenance_date', formData.maintenance_date);
        if (formData.location) formDataToSend.append('location', formData.location);
        if (formData.cost) formDataToSend.append('cost', formData.cost);
        if (formData.performed_by) formDataToSend.append('performed_by', formData.performed_by);
        if (formData.next_maintenance_date) formDataToSend.append('next_maintenance_date', formData.next_maintenance_date);
        if (formData.note) formDataToSend.append('notes', formData.note);
        formDataToSend.append('status', formData.status);
        if (fileRef.current?.getFile()) {
            formDataToSend.append('file', fileRef.current.getFile());
        }

        try {
            const response = await createMaintenanceLog(formDataToSend);

            if (response.success) {
                toast.success(response.message || 'Created successfully');
                setFormData(initialFormState);
                fileRef.current.clear();
                setErrors({});

            } else {
                toast.error(response.message || 'Failed to create maintenance log');
                setErrors(response.errors || {});
            }

        } catch (err) {
            if (err?.errors) {
                setErrors(err.errors);
            } else {
                toast.error(err?.message || 'Failed to create maintenance log');
            }
        }
    };

    return (
        <>
            <HeadTags title="Create Maintenance Log" />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Create Maintenance Log</h3>
                </div>
                <div className="page-tool d-flex justify-content-between align-items-center">
                    <div className="breadcrumb-wrap">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb pb-0 mb-0">
                                <li className="breadcrumb-item"><Link to="/" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                <li className="breadcrumb-item"><ChevronRight /></li>
                                <li className="breadcrumb-item" ><Link to="/maintenance-list">Maintenance Log</Link></li>
                                <li className="breadcrumb-item"><ChevronRight /></li>
                                <li className="breadcrumb-item active" aria-current="page">Create New</li>
                            </ol>
                        </nav>
                    </div>
                </div>
            </div>
            <div className="row justify-content-center">
                <div className="col-lg-10 col-xl-8">
                    <div className="card p-25 mb-5">
                        <h3 className="fw-600 fs-18 mb-4">Basic Vehicle Information</h3>
                        <form className="form" onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label htmlFor="vehicle_id" className="form-label">
                                    Vehicle Number <span className="text-danger">*</span>
                                </label>
                                <select
                                    className="form-select"
                                    id="vehicle_id"
                                    name="vehicle_id"
                                    value={formData.vehicle_id}
                                    onChange={handleInputChange}
                                >
                                    <option value="" disabled>
                                        Select vehicle number
                                    </option>
                                    {vehicles.map((vehicle) => (
                                        <option key={vehicle.id} value={vehicle.id}>
                                            {vehicle.vehicle_number}
                                        </option>
                                    ))}
                                </select>
                                {errors.vehicle_id && <div className="text-danger">{errors.vehicle_id[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="maintenance_type" className="form-label">
                                    Maintenance Type <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="maintenance_type"
                                    name="maintenance_type"
                                    value={formData.maintenance_type}
                                    onChange={handleInputChange}
                                    placeholder="E.g., Oil Change, Engine Repair"
                                />
                                {errors.maintenance_type && <div className="text-danger">{errors.maintenance_type[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="maintenance_date" className="form-label">
                                    Maintenance Date <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="form-control"
                                    id="maintenance_date"
                                    name="maintenance_date"
                                    value={formData.maintenance_date}
                                    onChange={handleInputChange}
                                />
                                {errors.maintenance_date && <div className="text-danger">{errors.maintenance_date[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="location" className="form-label">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    placeholder="Enter full location"
                                />
                                {errors.location && <div className="text-danger">{errors.location[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="cost" className="form-label">
                                    Cost
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="cost"
                                    name="cost"
                                    value={formData.cost}
                                    onChange={handleInputChange}
                                    placeholder="Enter estimated or actual cost"
                                />
                                {errors.cost && <div className="text-danger">{errors.cost[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="performed_by" className="form-label">
                                    Performed By
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="performed_by"
                                    name="performed_by"
                                    value={formData.performed_by}
                                    onChange={handleInputChange}
                                    placeholder="Enter workshop name"
                                />
                                {errors.performed_by && <div className="text-danger">{errors.performed_by[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="next_maintenance_date" className="form-label">
                                    Next Maintenance Date
                                </label>
                                <input
                                    type="date"
                                    className="form-control"
                                    id="next_maintenance_date"
                                    name="next_maintenance_date"
                                    value={formData.next_maintenance_date}
                                    onChange={handleInputChange}
                                />
                                {errors.next_maintenance_date && <div className="text-danger">{errors.next_maintenance_date[0]}</div>}
                            </div>
                            <DragDropUpload
                                ref={fileRef}
                                label="Invoice"
                                onChange={(file) => console.log('File:', file)}
                            />
                            {errors.file && <div className="text-danger">{errors.file[0]}</div>}
                            <div className="mb-4">
                                <label htmlFor="note" className="form-label">
                                    Note
                                </label>
                                <textarea
                                    className="form-control textarea"
                                    id="note"
                                    name="note"
                                    value={formData.note}
                                    onChange={handleInputChange}
                                    placeholder="Type note"
                                />
                                {errors.notes && <div className="text-danger">{errors.notes[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label className="form-label">Status</label>
                                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                                    {['completed', 'pending', 'scheduled', 'overdue'].map((status) => (
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
                                {errors.status && <div className="text-danger">{errors.status}</div>}
                            </div>
                            <div className="d-flex gap-20">
                                <Link to="/maintenance-list" className="btn-md outline-btn">Back</Link>
                                <button className="btn-md primary-btn border-0">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}

export default AddMaintenanceLog;