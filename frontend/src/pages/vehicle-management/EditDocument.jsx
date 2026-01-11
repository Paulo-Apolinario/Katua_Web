import { useState, useRef, useEffect } from 'react';
import { Link, useParams } from "react-router";
import { House, ChevronRight } from "lucide-react";
import DragDropUpload from "../../components/DragDropUpload";
import { getAllVehicles } from '../../services/vehicleService';
import { getVehicleDocumentById, updateVehicleDocument } from '../../services/vehicleDocumentService';
import { toast } from 'react-hot-toast';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';
import moment from 'moment/moment';

const EditDocument = () => {
    const { id } = useParams();

    // Initial form state
    const initialFormState = {
        vehicle_id: '',
        document_type: '',
        document_number: '',
        issue_date: '',
        expiry_date: '',
    };

    const [formData, setFormData] = useState(initialFormState);
    const [errors, setErrors] = useState({});
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [existingImage, setExistingImage] = useState(null);
    const [newFileSelected, setNewFileSelected] = useState(false)
    const fileRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch vehicles for dropdown
                const vehicleResponse = await getAllVehicles();

                if (vehicleResponse.success) {
                    setVehicles(vehicleResponse.data);
                } else {
                    toast.error('Failed to load vehicles');
                }

                // Fetch document data
                const documentResponse = await getVehicleDocumentById(id);
                if (documentResponse.success) {
                    setFormData({
                        vehicle_id: documentResponse.data.vehicle_id || '',
                        document_type: documentResponse.data.document_type || '',
                        document_number: documentResponse.data.document_number || '',
                        issue_date: documentResponse.data.issue_date.split('T')[0] || '',
                        expiry_date: documentResponse.data.expiry_date.split('T')[0] || '',
                    });
                    setExistingImage(documentResponse.data.file || null);
                } else {
                    toast.error('Failed to load document');
                }
            } catch (error) {
                toast.error('Error fetching vehicle document');
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
        formDataToSend.append('document_type', formData.document_type);
        formDataToSend.append('document_number', formData.document_number);
        if (formData.issue_date) formDataToSend.append('issue_date', formData.issue_date);
        if (formData.expiry_date) formDataToSend.append('expiry_date', formData.expiry_date);
        if (fileRef.current?.getFile()) {
            formDataToSend.append('file', fileRef.current.getFile());
        }

        try {
            const response = await updateVehicleDocument(id, formDataToSend);

            if (response.success) {
                toast.success(response.message || 'Update successfully');
                setErrors({});
                setExistingImage(response.data.file || null);
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
            <HeadTags title="Create Document" />
            <TopProgressBar loading={loading} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Edit Document</h3>
                </div>
                <div className="page-tool d-flex justify-content-between align-items-center">
                    <div className="breadcrumb-wrap">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb pb-0 mb-0">
                                <li className="breadcrumb-item"><Link to="/" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                <li className="breadcrumb-item"><ChevronRight /></li>
                                <li className="breadcrumb-item" ><Link to="/document-list">Document List</Link></li>
                                <li className="breadcrumb-item"><ChevronRight /></li>
                                <li className="breadcrumb-item active" aria-current="page">Edit Document</li>
                            </ol>
                        </nav>
                    </div>
                </div>
            </div>
            <div className="row justify-content-center">
                <div className="col-lg-10 col-xl-8">
                    <div className="card p-25 mb-5">
                        <h3 className="fw-600 fs-18 mb-4">Edit Vehicle Document Information</h3>
                        <form className="form" onSubmit={handleSubmit} >
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
                                {errors.vehicle_id && <p className="text-danger">{errors.vehicle_id[0]}</p>}
                            </div>
                            <div className="mb-4">
                                <label className="form-label">
                                    Document Type <span className="text-danger">*</span>
                                </label>
                                <select id="document_type" name="document_type" value={formData.document_type} onChange={handleInputChange} className="form-select">
                                    <option value="" disabled>Select document type</option>
                                    <option value="insurance">Insurance</option>
                                    <option value="pollution">Pollution Certificate</option>
                                    <option value="registration">Registration Copy</option>
                                    <option value="permit">Road Permit</option>
                                    <option value="tax">Tax Token</option>
                                    <option value="others">Others</option>
                                </select>
                                {errors.document_type && <p className="text-danger">{errors.document_type[0]}</p>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="document_number" className="form-label">
                                    Document Number <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="document_number"
                                    name="document_number"
                                    value={formData.document_number}
                                    onChange={handleInputChange}
                                    placeholder="e.g., DL-98347, REG-2342"
                                />
                                {errors.document_number && <p className="text-danger">{errors.document_number[0]}</p>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="issue_date" className="form-label">
                                    Issue Date
                                </label>
                                <input
                                    type="date"
                                    className="form-control"
                                    id="issue_date"
                                    name="issue_date"
                                    value={ formData.issue_date }
                                    onChange={handleInputChange}
                                />
                                {errors.issue_date && <p className="text-danger">{errors.issue_date[0]}</p>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="expiry_date" className="form-label">
                                    Expiry Date
                                </label>
                                <input
                                    type="date"
                                    className="form-control"
                                    id="expiry_date"
                                    name="expiry_date"
                                    value={formData.expiry_date}
                                    onChange={handleInputChange}
                                />
                                {errors.expiry_date && <p className="text-danger">{errors.expiry_date[0]}</p>}
                            </div>
                            <DragDropUpload
                                ref={fileRef}
                                label="Document File"
                                required={true}
                                onChange={(file) => handleFileChange(file)}
                            />
                            {errors.file && <p className="text-danger">{errors.file[0]}</p>}
                            {existingImage && (
                                <div className="mb-4">
                                    <label className="form-label">Current Document Preview</label>
                                    <div className="border rounded p-2">
                                        {existingImage.endsWith('.pdf') ? (
                                            <a href={`${import.meta.env.VITE_API_BASE_URL}/images/vehicle_documents/${existingImage}`} target="_blank" rel="noopener noreferrer" className="d-flex align-items-center gap-2">
                                                <span>View PDF</span>
                                            </a>
                                        ) : (
                                            <img
                                                src={`${import.meta.env.VITE_API_BASE_URL}/uploads/vehicle_documents/${existingImage}`}
                                                alt="Document Preview"
                                                style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }}
                                                onError={() => setExistingImage(null)}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="d-flex gap-20">
                                <Link to="/document-list" className="btn-md outline-btn">Back</Link>
                                <button className="btn-md primary-btn border-0">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}

export default EditDocument;