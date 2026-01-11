import { useState, useRef, useEffect } from 'react';
import { Link, useParams } from "react-router";
import { House, ChevronRight } from "lucide-react";
import DragDropUpload from "../../components/DragDropUpload";
import { getAllVehicles } from '../../services/vehicleService';
import { getMaintenanceLogById, updateMaintenanceLog } from '../../services/maintenanceLogService';
import { toast } from 'react-hot-toast';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';
import moment from 'moment/moment';

const EditMaintenanceLog = () => {
    const { id } = useParams();

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
    const [existingFile, setExistingFile] = useState(null);
    const [newFileSelected, setNewFileSelected] = useState(false);
    const fileRef = useRef(null);
    const [loading, setLoading] = useState(true);


    // Fetch vehicles for dropdown on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getAllVehicles();

                if (response.success) {
                    setVehicles(response.data);
                } else {
                    toast.error('Failed to load waste types');
                }
                // Fetch document data
                const logResponse = await getMaintenanceLogById(id);
                if (logResponse.success) {
                    setFormData({
                        vehicle_id: logResponse.data.vehicle_id || '',
                        maintenance_type: logResponse.data.maintenance_type || '',
                        maintenance_date: logResponse.data.maintenance_date.split('T')[0] || '',
                        location: logResponse.data.location || '',
                        cost: logResponse.data.cost || '',
                        performed_by: logResponse.data.performed_by || '',
                        next_maintenance_date: logResponse.data.next_maintenance_date.split('T')[0] || '',
                        note: logResponse.data.notes || '',
                        status: logResponse.data.status || 'completed',
                    });
                    setExistingFile(logResponse.data.file || null);
                } else {
                    toast.error('Failed to load document');
                }
            } catch (error) {
                toast.error('Error fetching waste types');
                console.error('Fetch error:', error);
             } finally {
               setLoading(false);
             }
        };
        fetchData();
    }, [id]);

    // Handle input changes for controlled inputs
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    // Handle file change to hide existing image and clear errors
    const handleFileChange = (file) => {
        setNewFileSelected(!!file);
        setErrors((prev) => ({ ...prev, file: '' }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        // Prepare FormData for API request
        const formDataToSend = new FormData();
        formDataToSend.append('_method', 'PUT');
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
            const response = await updateMaintenanceLog(id, formDataToSend);

            if (response.success) {
                toast.success(response.message || 'Update successfully');
                setErrors({});
                setExistingFile(response.data.file || null);
                setNewFileSelected(false);
                fileRef.current.clear();
            } else {
                toast.error(response.message || 'Failed to update vehicle document');
                if (response.errors) {
                    setErrors(response.errors);
                }
            }
        } catch (err) {
            if (err?.errors) {
                setErrors(err.errors);
            } else {
                toast.error(err?.message || 'Failed to update vehicle document');
            }
        }
    };

    return (
        <>
           <HeadTags title="Create Maintenance Log" />
           <TopProgressBar loading={loading} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Edit Maintenance Log</h3>
                </div>
                <div className="page-tool d-flex justify-content-between align-items-center">
                    <div className="breadcrumb-wrap">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb pb-0 mb-0">
                                <li className="breadcrumb-item"><Link to="/" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                <li className="breadcrumb-item"><ChevronRight /></li>
                                <li className="breadcrumb-item" ><Link to="/maintenance-list">Maintenance Log</Link></li>
                                <li className="breadcrumb-item"><ChevronRight /></li>
                                <li className="breadcrumb-item active" aria-current="page">Edit Maintenance Log</li>
                            </ol>
                        </nav>
                    </div>
                </div>
            </div>
            <div className="row justify-content-center mb-4">
                <div className="col-lg-10 col-xl-8">
                    <div className="card p-25 mb-5">
                        <h3 className="fw-600 fs-18 mb-4">Edit Vehicle Information</h3>
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
                                onChange={(file) => handleFileChange(file)}
                            />
                            {errors.file && <div className="text-danger">{errors.file[0]}</div>}
                            {existingFile && (
                                <div className="mb-4">
                                    <label className="form-label">Current Invoice Preview</label>
                                    <div className="border rounded p-2">
                                        {existingFile.endsWith('.pdf') ? (
                                            <a href={`${import.meta.env.VITE_API_BASE_URL}/images/vehicle_invoice/${existingFile}`} target="_blank" rel="noopener noreferrer" className="d-flex align-items-center gap-2">
                                                <span>View PDF</span>
                                            </a>
                                        ) : (
                                            <img
                                                src={`${import.meta.env.VITE_API_BASE_URL}/images/vehicle_invoice/${existingFile}`}
                                                alt="Document Preview"
                                                style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }}
                                                onError={() => setExistingFile(null)}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
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
                                {errors.note && <div className="text-danger">{errors.note[0]}</div>}
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
                                <button className="btn-md primary-btn border-0">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}

export default EditMaintenanceLog;