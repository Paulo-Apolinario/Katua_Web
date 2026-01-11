import { useState } from 'react';
import { Link } from "react-router";
import { House, ChevronRight } from "lucide-react";
import { createWasteType } from '../../services/wasteTypeService';
import { toast } from 'react-hot-toast';
import HeadTags from '../../components/HeadTags';


const AddWasteType = () => {
    // Initial form state
    const initialFormState = {
        name: '',
        status: 'active',
    };

    const [formData, setFormData] = useState(initialFormState);
    const [errors, setErrors] = useState({});

    // Handle input changes for controlled inputs
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        try {
            const response = await createWasteType(formData);
            if (response.success) {
                toast.success(response.message || 'Waste type created successfully');
                setFormData(initialFormState);
                setErrors({}); 

            } else {
                toast.error(response.message || 'Failed to create waste type');
                setErrors(response.errors || {});
            }

        } catch (err) {
            if (err?.errors) {
                setErrors(err.errors); 
            } else {
                toast.error(err?.message || 'Failed to create waste type');
            }
        }
    };

    return (
        <>
          <HeadTags title="Create Waste Type" />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Create Waste Type</h3>
                </div>
                <div className="page-tool d-flex justify-content-between align-items-center">
                    <div className="breadcrumb-wrap">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb pb-0 mb-0">
                                <li className="breadcrumb-item"><Link to="/" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                <li className="breadcrumb-item"><ChevronRight /></li>
                                <li className="breadcrumb-item" ><Link to="/waste-type-list">Waste Type</Link></li>
                                <li className="breadcrumb-item"><ChevronRight /></li>
                                <li className="breadcrumb-item active" aria-current="page">Create New</li>
                            </ol>
                        </nav>
                    </div>
                </div>
            </div>
            <div className="row justify-content-center mb-5">
                <div className="col-lg-10 col-xl-8">
                    <div className="card p-25">
                        <h3 className="fw-600 fs-18 mb-4">Basic Waste Type Information</h3>
                        <form className="form" onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label htmlFor="name" className="form-label">
                                    Waste Name <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter waste name"
                                />
                                {errors.name && <p className="text-danger">{errors.name[0]}</p>}
                            </div>
                            <div className="mb-4">
                                <label className="form-label">
                                    Status
                                </label>
                                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="status"
                                            id="active"
                                            value="active"
                                            checked={formData.status === 'active'}
                                            onChange={handleInputChange}
                                        />
                                        <label className="form-check-label" htmlFor="active">
                                            Active
                                        </label>
                                    </div>
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="status"
                                            id="inactive"
                                            value="inactive"
                                            checked={formData.status === 'inactive'}
                                            onChange={handleInputChange}
                                        />
                                        <label className="form-check-label" htmlFor="inactive">
                                            Inactive
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex gap-20">
                                <Link to="/waste-type-list" className="btn-md outline-btn">Back</Link>
                                <button className="btn-md primary-btn border-0">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}

export default AddWasteType;