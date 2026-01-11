import { useState, useEffect } from 'react';
import { Link, useParams } from "react-router";
import { House, ChevronRight, User, Truck, MapPin } from "lucide-react";
import toast from 'react-hot-toast';
import { getAllZones } from '../../services/zoneService';
import { getAllVehicles } from '../../services/vehicleService';
import { getAllStaff } from '../../services/staffService';
import { getRouteById, updateRoute } from '../../services/routeService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const EditRoute = () => {

    const { id } = useParams();

    // Initial form state
    const initialFormState = {
        route_name: '',
        zone_id: '',
        vehicle_id: '',
        driver_id: '',
        start_location: '',
        end_location: '',
        waypoints: '',
        estimated_distance: '',
        estimated_time: '',
        special_instructions: '',
        status: 'active',
    };

    const [formData, setFormData] = useState(initialFormState);
    const [errors, setErrors] = useState({});
    const [zones, setZones] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch zones
                const zoneResponse = await getAllZones();
                if (zoneResponse.success) {
                    setZones(zoneResponse.data);
                } else {
                    toast.error('Failed to load zone');
                }

                // Fetch vehicles
                const vehicleResponse = await getAllVehicles();
                if (vehicleResponse.success) {
                    setVehicles(vehicleResponse.data);
                } else {
                    toast.error('Failed to load vehicle');
                }

                // Fetch staff
                const staffResponse = await getAllStaff();

                if (staffResponse.success) {
                    setDrivers(staffResponse.data);
                } else {
                    toast.error('Failed to load staff');
                }

                // Fetch route data
                const routeResponse = await getRouteById(id);
                if (routeResponse.success) {
                    setFormData({
                        route_name: routeResponse.data.name || '',
                        zone_id: routeResponse.data.zone_id || '',
                        vehicle_id: routeResponse.data.vehicle_id || '',
                        driver_id: routeResponse.data.staff_id || '',
                        start_location: routeResponse.data.start_location || '',
                        end_location: routeResponse.data.end_location || '',
                        waypoints: routeResponse.data.waypoints || '',
                        estimated_distance: routeResponse.data.estimated_distance || '',
                        estimated_time: routeResponse.data.estimated_time || '',
                        special_instructions: routeResponse.data.special_instructions || '',
                        status: routeResponse.data.status || 'active',
                    });
                } else {
                    toast.error('Failed to load route');
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

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        // Prepare data for API request
        const dataToSend = {
            name: formData.route_name,
            zone_id: formData.zone_id,
            vehicle_id: formData.vehicle_id || null,
            staff_id: formData.driver_id || null,
            start_location: formData.start_location || null,
            end_location: formData.end_location || null,
            waypoints: formData.waypoints || null,
            estimated_distance: formData.estimated_distance || null,
            estimated_time: formData.estimated_time || null,
            special_instructions: formData.special_instructions || null,
            status: formData.status,
        };

        try {
            const response = await updateRoute(id, dataToSend);

            if (response.success) {
                toast.success(response.message || 'Route Update successfully');
            } else {
                toast.error(response.message || 'Failed to update route');
                setErrors(response.errors || {});
            }

        } catch (err) {
            if (err?.errors) {
                setErrors(err.errors);
            } else {
                toast.error(err?.message || 'Failed to update route');
                console.log(err.message);
            }
        }
    };

    return (
        <>
           <HeadTags title="Edit Route" />
           <TopProgressBar loading={loading} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Edit Route</h3>
                </div>
                <div className="page-tool d-flex justify-content-between align-items-center">
                    <div className="breadcrumb-wrap">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb pb-0 mb-0">
                                <li className="breadcrumb-item"><Link to="/" className="d-flex align-items-center gap-8" ><House />Dashboard</Link></li>
                                <li className="breadcrumb-item"><ChevronRight /></li>
                                <li className="breadcrumb-item" ><Link to="/route-list">Route List</Link></li>
                                <li className="breadcrumb-item"><ChevronRight /></li>
                                <li className="breadcrumb-item active" aria-current="page">Edit Route</li>
                            </ol>
                        </nav>
                    </div>
                </div>
            </div>
            <div className="row justify-content-center mb-5">
                <div className="col-lg-10 col-xl-8">
                    <div className="card p-25">
                        <h3 className="fw-600 fs-18 mb-4">Basic Route Information</h3>
                        <form className="form" onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label htmlFor="route_name" className="form-label">
                                    Route Name <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="route_name"
                                    name="route_name"
                                    value={formData.route_name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Morning Zone A"
                                />
                                {errors.name && <div className="text-danger small mt-1">{errors.name[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="zone_id" className="form-label">
                                    Zone/Area <span className="text-danger">*</span>
                                </label>
                                <div className="left-inner-addon">
                                    <span className="icon">
                                        <MapPin />
                                    </span>
                                    <select
                                        className="form-select"
                                        id="zone_id"
                                        name="zone_id"
                                        value={formData.zone_id}
                                        onChange={handleInputChange}
                                    >
                                        <option value="" disabled>
                                            Select zone or area
                                        </option>
                                        {zones.map((zone) => (
                                            <option key={zone.id} value={zone.id}>
                                                {zone.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.zone_id && <div className="text-danger small mt-1">{errors.zone_id[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="vehicle_id" className="form-label">
                                    Vehicle
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
                                        <option value="" disabled>
                                            Select vehicle
                                        </option>
                                        {vehicles.map((vehicle) => (
                                            <option key={vehicle.id} value={vehicle.id}>
                                                {vehicle.vehicle_number}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.vehicle_id && <div className="text-danger small mt-1">{errors.vehicle_id[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="driver_id" className="form-label">
                                    Assigned Driver
                                </label>
                                <div className="left-inner-addon">
                                    <span className="icon">
                                        <User />
                                    </span>
                                    <select
                                        className="form-select"
                                        id="driver_id"
                                        name="driver_id"
                                        value={formData.driver_id}
                                        onChange={handleInputChange}
                                    >
                                        <option value="" disabled>
                                            Select Driver
                                        </option>
                                        {drivers.map((driver) => (
                                            <option key={driver.id} value={driver.id}>
                                                {driver.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.staff_id && <div className="text-danger small mt-1">{errors.staff_id[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="start_location" className="form-label">
                                    Start Location
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="start_location"
                                    name="start_location"
                                    value={formData.start_location}
                                    onChange={handleInputChange}
                                    placeholder="Enter start location"
                                />
                                {errors.start_location && <div className="text-danger small mt-1">{errors.start_location[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="end_location" className="form-label">
                                    End Location
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="end_location"
                                    name="end_location"
                                    value={formData.end_location}
                                    onChange={handleInputChange}
                                    placeholder="Enter end location"
                                />
                                {errors.end_location && <div className="text-danger small mt-1">{errors.end_location[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="waypoints" className="form-label">
                                    Waypoints
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="waypoints"
                                    name="waypoints"
                                    value={formData.waypoints}
                                    onChange={handleInputChange}
                                    placeholder="Enter number of stops"
                                />
                                {errors.waypoints && <div className="text-danger small mt-1">{errors.waypoints[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="waypoints" className="form-label">
                                    Waypoints
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="waypoints"
                                    name="waypoints"
                                    value={formData.waypoints}
                                    onChange={handleInputChange}
                                    placeholder="Enter number of stops"
                                />
                                {errors.waypoints && <div className="text-danger small mt-1">{errors.waypoints[0]}</div>}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="estimated_time" className="form-label">
                                    Estimated Time
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="estimated_time"
                                    name="estimated_time"
                                    value={formData.estimated_time}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 34min"
                                />
                                {errors.estimated_time && <div className="text-danger small mt-1">{errors.estimated_time[0]}</div>}
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
                                    placeholder="Enter any special instructions or notes for this route"
                                />
                                {errors.special_instructions && <div className="text-danger small mt-1">{errors.special_instructions[0]}</div>}
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
                                {errors.status && <div className="text-danger small mt-1">{errors.status[0]}</div>}
                            </div>
                            <div className="d-flex gap-20">
                                <Link to="/route-list" className="btn-md outline-btn">Back</Link>
                                <button className="btn-md primary-btn border-0">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}

export default EditRoute;