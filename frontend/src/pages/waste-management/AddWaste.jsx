import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { House, ChevronRight, Truck, User, Archive, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { createWaste } from '../../services/wasteService';
import { getAllWasteTypes } from '../../services/wasteTypeService';
import { getAllZones } from '../../services/zoneService';
import { getAllVehicles } from '../../services/vehicleService';
import { getAllStaff } from '../../services/staffService';
import { getAllBins } from '../../services/binService';
import HeadTags from '../../components/HeadTags';

const AddWaste = () => {
    // Initial form state
    const initialFormState = {
        collected_date: '',
        time_slot: '',
        quantity: '',
        waste_type_id: '',
        zone_id: '',
        vehicle_id: '',
        staff_id: '',
        bin_id: '',
        special_instructions: '',
        status: 'pending',
    };

    // State management
    const [formData, setFormData] = useState(initialFormState);
    const [errors, setErrors] = useState({});
    const [wasteTypes, setWasteTypes] = useState([]);
    const [zones, setZones] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [staff, setStaff] = useState([]);
    const [bins, setBins] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch waste types
                const wasteTypeResponse = await getAllWasteTypes();
                if (wasteTypeResponse.success) {
                    setWasteTypes(wasteTypeResponse.data);
                } else {
                    toast.error('Failed to load waste types');
                }

                // Fetch zones
                const zoneResponse = await getAllZones();
                if (zoneResponse.success) {
                    setZones(zoneResponse.data);
                } else {
                    toast.error('Failed to load zones');
                }

                // Fetch vehicles
                const vehicleResponse = await getAllVehicles();
                if (vehicleResponse.success) {
                    setVehicles(vehicleResponse.data);
                } else {
                    toast.error('Failed to load vehicles');
                }

                // Fetch staff
                const staffResponse = await getAllStaff();
                if (staffResponse.success) {
                    setStaff(staffResponse.data);
                } else {
                    toast.error('Failed to load staff');
                }

                // Fetch bins
                const binResponse = await getAllBins();
                if (binResponse.success) {
                    setBins(binResponse.data);
                } else {
                    toast.error('Failed to load bins');
                }
            } catch (error) {
                toast.error('Error fetching data');
                console.error('Fetch error:', error);
            }
        };
        fetchData();
    }, []);

    // Handle input changes
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
            collected_date: formData.collected_date || null,
            time_slot: formData.time_slot || null,
            quantity: formData.quantity || null,
            waste_type_id: formData.waste_type_id || null,
            zone_id: formData.zone_id || null,
            vehicle_id: formData.vehicle_id || null,
            staff_id: formData.staff_id || null,
            bin_id: formData.bin_id || null,
            special_instructions: formData.special_instructions || null,
            status: formData.status,
        };

        try {
            const response = await createWaste(dataToSend);
            if (response.success) {
                toast.success(response.message || 'Waste record created successfully');
                setFormData(initialFormState);
                setErrors({});
            } else {
                toast.error(response.message || 'Failed to create waste record');
                if (response.errors) {
                    setErrors(response.errors);
                }
            }
        } catch (err) {
            if (err?.errors) {
                setErrors(err.errors);
            } else {
                toast.error(err?.message || 'Failed to create waste record');
                console.error('Error:', err.message);
            }
        }
    };

    return (
        <>
          <HeadTags title="Create Waste" />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Create Waste</h3>
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
                                    <Link to="/waste-list">Waste List</Link>
                                </li>
                                <li className="breadcrumb-item">
                                    <ChevronRight />
                                </li>
                                <li className="breadcrumb-item active" aria-current="page">
                                    Create New
                                </li>
                            </ol>
                        </nav>
                    </div>
                </div>
            </div>
            <div className="row justify-content-center mb-4">
                <div className="col-lg-10 col-xl-8">
                    <div className="card p-25">
                        <h3 className="fw-600 fs-18 mb-4">Basic Waste Information</h3>
                        <form className="form" onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label htmlFor="collected_date" className="form-label">
                                    Collection Date <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="form-control"
                                    id="collected_date"
                                    name="collected_date"
                                    value={formData.collected_date}
                                    onChange={handleInputChange}
                                />
                                {errors.collected_date && (
                                    <div className="text-danger small mt-1">{errors.collected_date[0]}</div>
                                )}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="time_slot" className="form-label">
                                    Time Slot
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="time_slot"
                                    name="time_slot"
                                    value={formData.time_slot}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 10:00 AM - 12:00 PM"
                                />
                                {errors.time_slot && (
                                    <div className="text-danger small mt-1">{errors.time_slot[0]}</div>
                                )}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="quantity" className="form-label">
                                    Quantity (KG) <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="quantity"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleInputChange}
                                    placeholder="Enter quantity in kilograms"
                                    step="0.01"
                                />
                                {errors.quantity && (
                                    <div className="text-danger small mt-1">{errors.quantity[0]}</div>
                                )}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="waste_type_id" className="form-label">
                                    Waste Type <span className="text-danger">*</span>
                                </label>
                                    <select
                                        className="form-select"
                                        id="waste_type_id"
                                        name="waste_type_id"
                                        value={formData.waste_type_id}
                                        onChange={handleInputChange}
                                    >
                                        <option value="" disabled>Select waste type</option>
                                        {wasteTypes.map((type) => (
                                            <option key={type.id} value={type.id}>
                                                {type.name}
                                            </option>
                                        ))}
                                    </select>
                                {errors.waste_type_id && (
                                    <div className="text-danger small mt-1">{errors.waste_type_id[0]}</div>
                                )}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="zone_id" className="form-label">
                                    Zone
                                </label>
                                <div className="left-inner-addon">
                                    <span className="icon"><MapPin /></span>
                                    <select
                                        className="form-select"
                                        id="zone_id"
                                        name="zone_id"
                                        value={formData.zone_id}
                                        onChange={handleInputChange}
                                    >
                                        <option value="" disabled>Select zone</option>
                                        {zones.map((zone) => (
                                            <option key={zone.id} value={zone.id}>
                                                {zone.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.zone_id && (
                                    <div className="text-danger small mt-1">{errors.zone_id[0]}</div>
                                )}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="vehicle_id" className="form-label">
                                    Vehicle
                                </label>
                                <div className="left-inner-addon">
                                    <span className="icon"><Truck /></span>
                                    <select
                                        className="form-select"
                                        id="vehicle_id"
                                        name="vehicle_id"
                                        value={formData.vehicle_id}
                                        onChange={handleInputChange}
                                    >
                                        <option value="" disabled>Select vehicle</option>
                                        {vehicles.map((vehicle) => (
                                            <option key={vehicle.id} value={vehicle.id}>
                                                {vehicle.vehicle_number}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.vehicle_id && (
                                    <div className="text-danger small mt-1">{errors.vehicle_id[0]}</div>
                                )}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="staff_id" className="form-label">
                                    Staff
                                </label>
                                <div className="left-inner-addon">
                                    <span className="icon"><User /></span>
                                    <select
                                        className="form-select"
                                        id="staff_id"
                                        name="staff_id"
                                        value={formData.staff_id}
                                        onChange={handleInputChange}
                                    >
                                        <option value="" disabled>Select staff</option>
                                        {staff.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.staff_id && (
                                    <div className="text-danger small mt-1">{errors.staff_id[0]}</div>
                                )}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="bin_id" className="form-label">
                                    Bin
                                </label>
                                <div className="left-inner-addon">
                                    <span className="icon"> <Archive /></span>
                                    <select
                                        className="form-select"
                                        id="bin_id"
                                        name="bin_id"
                                        value={formData.bin_id}
                                        onChange={handleInputChange}
                                    >
                                        <option value="" disabled>Select bin</option>
                                        {bins.map((bin) => (
                                            <option key={bin.id} value={bin.id}>
                                                {bin.bin_id}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.bin_id && (
                                    <div className="text-danger small mt-1">{errors.bin_id[0]}</div>
                                )}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="special_instructions" className="form-label">
                                    Special Instructions
                                </label>
                                <textarea
                                    className={`form-control textarea ${errors.special_instructions ? 'is-invalid' : ''}`}
                                    id="special_instructions"
                                    name="special_instructions"
                                    value={formData.special_instructions}
                                    onChange={handleInputChange}
                                    placeholder="Enter any special instructions or requirements"
                                ></textarea>
                                {errors.special_instructions && (
                                    <div className="invalid-feedback">{errors.special_instructions[0]}</div>
                                )}
                            </div>
                            <div className="mb-4">
                                <label className="form-label">
                                    Status <span className="text-danger">*</span>
                                </label>
                                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                                    {['pending', 'collected', 'cancelled'].map((status) => (
                                        <div className="form-check" key={status}>
                                            <input
                                                className="form-check-input"
                                                type="radio"
                                                name="status"
                                                id={`status_${status}`}
                                                value={status}
                                                checked={formData.status === status}
                                                onChange={handleInputChange}
                                            />
                                            <label className="form-check-label" htmlFor={`status_${status}`}>
                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {errors.status && (
                                    <div className="text-danger">{errors.status[0]}</div>
                                )}
                            </div>
                            <div className="d-flex gap-20">
                                <Link to="/waste-list" className="btn-md outline-btn">
                                    Back
                                </Link>
                                <button type="submit" className="btn-md primary-btn border-0">
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AddWaste;