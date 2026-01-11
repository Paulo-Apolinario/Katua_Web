import { useState, useEffect } from 'react';
import { Link } from "react-router";
import { toast } from 'react-hot-toast';
import { House, ChevronRight } from "lucide-react";
import { getAllSmtpConfig, saveSmtpConfig } from '../../services/settingService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const SmtpConfig = () => {
    const initialFormState = {
        mailer: '',
        host: '',
        port: '',
        username: '',
        password: '',
        mail_from_address: '',
        mail_from_name: ''
    };
    
    const [formData, setFormData] = useState(initialFormState);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);

    // Fetch existing settings on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {

                const response = await getAllSmtpConfig();
                if (response.success && response.data) {
                    setFormData({
                        mailer: response.data.mailer || '',
                        host: response.data.host || '',
                        port: response.data.port || '',
                        username: response.data.username || '',
                        password: response.data.password || '',
                        mail_from_address: response.data.mail_from_address || '',
                        mail_from_name: response.data.mail_from_name || ''
                    });

                } else if (!response.data) {
                    setFormData(initialFormState);

                } else {
                    toast.error('Failed to load smtp config');
                }

            } catch (error) {
                toast.error('Error fetching smtp config');
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

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        // Prepare data for API request
        const dataToSend = {
            mailer: formData.mailer,
            host: formData.host,
            port: formData.port,
            username: formData.username,
            password: formData.password,
            mail_from_address: formData.mail_from_address,
            mail_from_name: formData.mail_from_name
        };

        try {
            const response = await saveSmtpConfig(dataToSend);
            if (response.success) {
                toast.success(response.message || 'Smtp Config saved successfully');
            } else {
                toast.error(response.message || 'Failed to save Smtp Config');
                if (response.errors) {
                    setErrors(response.errors);
                }
            }

        } catch (err) {
            if (err?.errors) {
                setErrors(err.errors);
            } else {
                toast.error(err?.message || 'Failed to save Smtp Config');
            }
        }
    };

    return (
        <>
           <HeadTags title="SMTP Configuration" />
           <TopProgressBar loading={loading} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">SMTP Configuration</h3>
                </div>
                <div className="page-tool d-flex justify-content-between align-items-center">
                    <div className="breadcrumb-wrap">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb pb-0 mb-0">
                                <li className="breadcrumb-item"><Link to="/" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                <li className="breadcrumb-item"><ChevronRight /></li>
                                <li className="breadcrumb-item active" aria-current="page">SMTP Config</li>
                            </ol>
                        </nav>
                    </div>
                </div>
            </div>
            <div className="row justify-content-center mb-4">
                <div className="col-lg-10 col-xl-8">
                    <div className="card p-25">
                        <h3 className="fw-600 fs-18 mb-4">Basic Smtp Information</h3>
                        <form className="form" onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label htmlFor="mailer" className="form-label">
                                    Mailer <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="mailer"
                                    name="mailer"
                                    value={formData.mailer}
                                    onChange={handleInputChange}
                                    placeholder="e.g., smtp"
                                    aria-describedby="mailerHelp"
                                />
                                {errors.mailer && <p className="text-danger">{errors.mailer[0]}</p>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="host" className="form-label">
                                    Host <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="host"
                                    name="host"
                                    value={formData.host}
                                    onChange={handleInputChange}
                                    placeholder="e.g., smtp.example.com"
                                    aria-describedby="hostHelp"
                                />
                                {errors.host && <p className="text-danger">{errors.host[0]}</p>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="port" className="form-label">
                                    Port <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="port"
                                    name="port"
                                    value={formData.port}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 587"
                                    aria-describedby="portHelp"
                                />
                                {errors.port && <p className="text-danger">{errors.port[0]}</p>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="username" className="form-label">
                                    Username <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    placeholder="e.g., user@example.com"
                                    aria-describedby="usernameHelp"
                                />
                                {errors.username && <p className="text-danger">{errors.username[0]}</p>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="password" className="form-label">
                                    Password <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="password"
                                    className="form-control"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Enter password"
                                    aria-describedby="passwordHelp"
                                />
                                {errors.password && <p className="text-danger">{errors.password[0]}</p>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="mail_from_address" className="form-label">
                                    From Address <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="email"
                                    className="form-control"
                                    id="mail_from_address"
                                    name="mail_from_address"
                                    value={formData.mail_from_address}
                                    onChange={handleInputChange}
                                    placeholder="e.g., no-reply@example.com"
                                    aria-describedby="mailFromAddressHelp"
                                />
                                {errors.mail_from_address && <p className="text-danger">{errors.mail_from_address[0]}</p>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="mail_from_name" className="form-label">
                                    From Name <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="mail_from_name"
                                    name="mail_from_name"
                                    value={formData.mail_from_name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Your Company Name"
                                    aria-describedby="mailFromNameHelp"
                                />
                                {errors.mail_from_name && <p className="text-danger">{errors.mail_from_name[0]}</p>}
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

export default SmtpConfig;