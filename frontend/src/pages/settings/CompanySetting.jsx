import { useState, useRef, useEffect } from 'react';
import { Link } from "react-router";
import { toast } from 'react-hot-toast';
import { House, ChevronRight } from "lucide-react";
import DragDropUpload from "../../components/DragDropUpload";
import { getAllCompanySettings, saveCompanySettings } from '../../services/settingService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const CompanySetting = () => {
    // Initial form state
    const initialFormState = {
        company_name: '',
        fav_icon: null,
        logo: null,
        copy_right: '',
    };
    
    const [formData, setFormData] = useState(initialFormState);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [existingFavIcon, setExistingFavIcon] = useState(null);
    const [existingLogo, setExistingLogo] = useState(null);
    const favIconRef = useRef(null);
    const logoRef = useRef(null);

    // Base URL for accessing stored images
    const baseStorageUrl = `${import.meta.env.VITE_API_BASE_URL}/uploads/logo/`;

    // Fetch existing settings on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getAllCompanySettings();
                if (response.success && response.data) {
                    setFormData({
                        company_name: response.data.company_name || '',
                        fav_icon: null,
                        logo: null,
                        copy_right: response.data.copy_right || '',
                    });

                    setExistingFavIcon(response.data.fav_icon ? `${baseStorageUrl}${response.data.fav_icon}` : null);
                    setExistingLogo(response.data.logo ? `${baseStorageUrl}${response.data.logo}` : null);

                } else if (!response.data) {
                    setFormData(initialFormState);
                    setExistingFavIcon(null);
                    setExistingLogo(null);

                } else {
                    toast.error('Failed to load settings');
                }

            } catch (error) {
                toast.error('Error fetching settings');
                console.error('Fetch error:', error);
            } finally {
                setLoading(false);
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

    // Handle file upload for fav_icon
    const handleFavIconChange = (file) => {
        setFormData((prev) => ({ ...prev, fav_icon: file }));
        setErrors((prev) => ({ ...prev, fav_icon: '' }));
    };

    // Handle file upload for logo
    const handleLogoChange = (file) => {
        setFormData((prev) => ({ ...prev, logo: file }));
        setErrors((prev) => ({ ...prev, logo: '' }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        // Prepare FormData for API request
        const dataToSend = new FormData();
        dataToSend.append('company_name', formData.company_name);
        if (formData.fav_icon) dataToSend.append('fav_icon', formData.fav_icon);
        if (formData.logo) dataToSend.append('logo', formData.logo);
        dataToSend.append('copy_right', formData.copy_right);

        try {
            const response = await saveCompanySettings(dataToSend);
            if (response.success) {
                toast.success(response.message || 'Saved successfully');

                localStorage.removeItem('company_settings');
                const { fav_icon, logo } = response.data[0] || {};

                setExistingFavIcon(fav_icon ? `${baseStorageUrl}${fav_icon}` : null);
                setExistingLogo(logo ? `${baseStorageUrl}${logo}` : null);

                if (favIconRef.current) favIconRef.current.clear();
                if (logoRef.current) logoRef.current.clear();
                setFormData((prev) => ({ ...prev, fav_icon: null, logo: null }));

            } else {
                toast.error(response.message || 'Failed to save settings');
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
            <HeadTags title="Company Settings" />
            <TopProgressBar loading={loading} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Company Settings</h3>
                </div>
                <div className="page-tool d-flex justify-content-between align-items-center">
                    <div className="breadcrumb-wrap">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb pb-0 mb-0">
                                <li className="breadcrumb-item"><Link to="/" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                <li className="breadcrumb-item"><ChevronRight /></li>
                                <li className="breadcrumb-item active" aria-current="page">Settings</li>
                            </ol>
                        </nav>
                    </div>
                </div>
            </div>
            <div className="row justify-content-center">
                <div className="col-lg-10 col-xl-8">
                    <div className="card p-25 mb-5">
                        <h3 className="fw-600 fs-18 mb-4">Basic Company Settings Information</h3>
                        <form className="form" onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label htmlFor="company_name" className="form-label">
                                    Company Name 
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="company_name"
                                    name="company_name"
                                    value={formData.company_name}
                                    onChange={handleInputChange}
                                    placeholder="Enter company name"
                                />
                                {errors.company_name && <div className="text-danger small mt-1">{errors.company_name[0]}</div>}
                            </div>
                            {/* Fav Icon Upload with Preview */}
                            <div className="mb-4">
                                <DragDropUpload
                                    ref={favIconRef}
                                    label="Upload New Fav Icon"
                                    accept={['image/jpeg', 'image/jpg', 'image/png']}
                                    required={false}
                                    onChange={(file) => handleFavIconChange(file)}
                                />
                                {errors.fav_icon && <div className="text-danger small mt-1">{errors.fav_icon[0]}</div>}
                                {existingFavIcon && (
                                    <div className="mb-3">
                                       <label className="form-label">
                                          Preview Fav Icon
                                       </label>
                                        <img
                                            src={existingFavIcon}
                                            alt="Fav Icon Preview"
                                            style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'contain' }}
                                            onError={() => setExistingFavIcon(null)}
                                        />
                                    </div>
                                )}
                            </div>
                            {/* Logo Upload with Preview */}
                            <div className="mb-4">
                                <DragDropUpload
                                    ref={logoRef}
                                    label="Upload New Logo"
                                    accept={['image/jpeg', 'image/jpg', 'image/png']}
                                    required={false}
                                    onChange={(file) => handleLogoChange(file)}
                                />
                                {errors.logo && <div className="text-danger small mt-1">{errors.logo[0]}</div>}
                                {existingLogo && (
                                    <div className="mb-3">
                                      <label className="form-label">
                                          Preview Logo
                                       </label>
                                        <img
                                            src={existingLogo}
                                            alt="Logo Preview"
                                            style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'contain' }}
                                            onError={() => setExistingLogo(null)}
                                        />
                                    </div>
                                )}
                            </div>
                            {/* Copyright Input */}
                            <div className="mb-4">
                                <label htmlFor="copy_right" className="form-label">
                                    Copy Right 
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="copy_right"
                                    name="copy_right"
                                    value={formData.copy_right}
                                    onChange={handleInputChange}
                                    placeholder="© 2025 [Your Company Name]. All Rights Reserved"
                                />
                                {errors.copy_right && <div className="text-danger small mt-1">{errors.copy_right}</div>}
                            </div>
                            <div className="d-flex gap-20">
                                <button className="btn-md primary-btn border-0">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}

export default CompanySetting;