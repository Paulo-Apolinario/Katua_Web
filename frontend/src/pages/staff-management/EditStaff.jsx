import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from "react-router";
import { House, ChevronRight, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import DragDropUpload from '../../components/DragDropUpload';
import { getAllVehicles } from '../../services/vehicleService';
import { getStaffById, updateStaff } from '../../services/staffService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';
import moment from 'moment/moment';

const EditStaff = () => {
    const { id } = useParams(); 
    // Initial form state
    const initialFormState = {
        name: '',
        role: '',
        email: '',
        phone_number: '',
        gender: 'male',
        date_of_birth: '',
        national_id: '',
        address: '',
        joining_date: '',
        vehicle_id: '',
        status: 'active',
    };

    const [formData, setFormData] = useState(initialFormState);
    const [errors, setErrors] = useState({});
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [existingProfile, setExistingProfile] = useState(null); 
    const [newFileSelected, setNewFileSelected] = useState(false); 
    const fileRef = useRef(null);

    // Fetch vehicles and staff data on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch vehicles for dropdown
                const response = await getAllVehicles();

                if (response.success) {
                    setVehicles(response.data);
                } else {
                    toast.error('Failed to load vehicle');
                }

                // Fetch staff data
                const staffResponse = await getStaffById(id);
                console.log(staffResponse);
                if (staffResponse.success) {
                    setFormData({
                        name: staffResponse.data.name || '',
                        role: staffResponse.data.role || '',
                        email: staffResponse.data.email || '',
                        phone_number: staffResponse.data.phone || '',
                        gender: staffResponse.data.gender || 'male',
                        date_of_birth: moment(staffResponse.data.date_of_birth).format('yy-MM-DD') || '',
                        national_id: staffResponse.data.nid_or_passport || '',
                        address: staffResponse.data.address || '',
                        joining_date: moment(staffResponse.data.joining_date).format('yy-MM-DD') || '',
                        vehicle_id: staffResponse.data.vehicle_id || '',
                        status: staffResponse.data.status || 'active',
                    });
                    setExistingProfile(staffResponse.data.file || null);
                } else {
                    toast.error('Failed to load staff');
                }
            } catch (error) {
                toast.error('Error fetching data');
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

    // Handle file change to hide existing profile and clear errors
    const handleFileChange = (file) => {
        setNewFileSelected(!!file); 
        setErrors((prev) => ({ ...prev, profile: '' }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
       setErrors({});

        // Prepare FormData for API request
        const formDataToSend = new FormData();
        formDataToSend.append('_method', 'PUT');
        formDataToSend.append('name', formData.name);
        formDataToSend.append('role', formData.role);
        if (formData.email) formDataToSend.append('email', formData.email);
        formDataToSend.append('phone', formData.phone_number);
        formDataToSend.append('gender', formData.gender);
        if (formData.date_of_birth) formDataToSend.append('date_of_birth', formData.date_of_birth);
        if (formData.national_id) formDataToSend.append('nid_or_passport', formData.national_id);
        if (formData.address) formDataToSend.append('address', formData.address);
        formDataToSend.append('joining_date', formData.joining_date);
        if (formData.vehicle_id) formDataToSend.append('vehicle_id', formData.vehicle_id);
        formDataToSend.append('status', formData.status);
        if (fileRef.current?.getFile()) {
            formDataToSend.append('file', fileRef.current.getFile());
        }

        try {
            const response = await updateStaff(id, formDataToSend);
            if (response.success) {
                toast.success(response.message || 'Updated successfully');
                setErrors({});
                setExistingProfile(response.data.file || null); 
                setNewFileSelected(false); 
                fileRef.current.clear(); 
            } else {
                toast.error(response.message || 'Failed to update staff');
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
           <HeadTags title="Edit Staff" />
           <TopProgressBar loading={loading} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Edit Staff</h3>
                </div>
                <div className="page-tool d-flex justify-content-between align-items-center">
                    <div className="breadcrumb-wrap">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb pb-0 mb-0">
                                <li className="breadcrumb-item">
                                    <Link to="/" className="d-flex align-items-center gap-8">
                                        <House /> Dashboard
                                    </Link>
                                </li>
                                <li className="breadcrumb-item">
                                    <ChevronRight />
                                </li>
                                <li className="breadcrumb-item">
                                    <Link to="/staff-list">Staff List</Link>
                                </li>
                                <li className="breadcrumb-item">
                                    <ChevronRight />
                                </li>
                                <li className="breadcrumb-item active" aria-current="page">
                                    Edit Staff
                                </li>
                            </ol>
                        </nav>
                    </div>
                </div>
            </div>
            <div className="row justify-content-center mb-5">
                <div className="col-lg-10 col-xl-8">
                    <div className="card p-25">
                        <h3 className="fw-600 fs-18 mb-4">Edit Staff Information</h3>
                        <form className="form" onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label htmlFor="name" className="form-label">
                                    Full Name <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter full name"
                                />
                                {errors.name && <div className="text-danger small mt-1">{errors.name[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="role" className="form-label">
                                    Role <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    placeholder="e.g., driver/loader/supervisor"
                                />
                                {errors.role && <div className="text-danger small mt-1">{errors.role[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="email" className="form-label">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    className="form-control"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="Enter email address"
                                />
                                {errors.email && <div className="text-danger small mt-1">{errors.email[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="phone_number" className="form-label">
                                    Phone Number <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="phone_number"
                                    name="phone_number"
                                    value={formData.phone_number}
                                    onChange={handleInputChange}
                                    placeholder="Enter phone number"
                                />
                                {errors.phone_number && <div className="text-danger small mt-1">{errors.phone_number[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label className="form-label">Gender</label>
                                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                                    {['male', 'female'].map((gender) => (
                                        <div className="form-check" key={gender}>
                                            <input
                                                className="form-check-input"
                                                type="radio"
                                                name="gender"
                                                id={gender}
                                                value={gender}
                                                checked={formData.gender === gender}
                                                onChange={handleInputChange}
                                            />
                                            <label className="form-check-label" htmlFor={gender}>
                                                {gender.charAt(0).toUpperCase() + gender.slice(1)}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {errors.gender && <div className="text-danger small mt-1">{errors.gender[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="date_of_birth" className="form-label">
                                    Date of Birth
                                </label>
                                <input
                                    type="date"
                                    className="form-control"
                                    id="date_of_birth"
                                    name="date_of_birth"
                                    value={formData.date_of_birth}
                                    onChange={handleInputChange}
                                />
                                {errors.date_of_birth && <div className="text-danger small mt-1">{errors.date_of_birth[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="national_id" className="form-label">
                                    National ID / Passport
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="national_id"
                                    name="national_id"
                                    value={formData.national_id}
                                    onChange={handleInputChange}
                                    placeholder="Enter national id or passport number"
                                />
                                {errors.national_id && <div className="text-danger small mt-1">{errors.national_id[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="address" className="form-label">
                                    Address
                                </label>
                                <textarea
                                    className="form-control textarea"
                                    id="address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    placeholder="Enter staff address"
                                />
                                {errors.address && <div className="text-danger small mt-1">{errors.address[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="joining_date" className="form-label">
                                    Joining Date <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="form-control"
                                    id="joining_date"
                                    name="joining_date"
                                    value={formData.joining_date}
                                    onChange={handleInputChange}
                                />
                                {errors.joining_date && <div className="text-danger small mt-1">{errors.joining_date[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="vehicle_id" className="form-label">
                                    Assigned Vehicle
                                </label>
                                <div className="left-inner-addon">
                                    <span className="icon">
                                        <Truck />
                                    </span>
                                    <select
                                        className="form-select"
                                        id="vehicle_id"
                                        name="vehicle_id"
                                        value={formData.vehicle_id}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Vehicle</option>
                                        {vehicles.map((vehicle) => (
                                            <option key={vehicle.id} value={vehicle.id}>
                                                {vehicle.vehicle_number}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.vehicle_id && <div className="text-danger small mt-1">{errors.vehicle_id[0]}</div>}
                            </div>
                           
                            <DragDropUpload
                                ref={fileRef}
                                label="Profile Picture (Optional)"
                                accept={['image/jpeg', 'image/jpg', 'image/png']}
                                required={false}
                                onChange={handleFileChange}
                            />
                            {errors.profile && <div className="text-danger small mt-1">{errors.profile[0]}</div>}
                             { existingProfile && (
                                    <div className="mb-4">
                                        <label className="form-label">Current Document Preview</label>
                                        <div className="border rounded p-2">
                                            {existingProfile.endsWith('.pdf') ? (
                                                <a href={`${import.meta.env.VITE_API_BASE_URL}/uploads/staff_image/${existingProfile}`} target="_blank" rel="noopener noreferrer" className="d-flex align-items-center gap-2">
                                                    <span>View PDF</span>
                                                </a>
                                            ) : (
                                                <img
                                                    src={`${import.meta.env.VITE_API_BASE_URL}/uploads/staff_image/${existingProfile}`}
                                                    alt="Document Preview"
                                                    style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }}
                                                    onError={() => setExistingProfile(null)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                            <div className="mb-4">
                                <label className="form-label">Status</label>
                                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                                    {['active', 'inactive','suspended'].map((status) => (
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
                                {errors.status && <div className="text-danger small mt-1">{errors.status[0]}</div>}
                            </div>
                            <div className="d-flex gap-20">
                                <Link to="/staff-list" className="btn-md outline-btn">
                                    Back
                                </Link>
                                <button type="submit" className="btn-md primary-btn border-0">
                                    Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default EditStaff;