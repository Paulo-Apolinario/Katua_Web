import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { House, ChevronRight, User, Truck, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { createVehicle } from '../../services/vehicleService';
import { getAllStaff } from '../../services/staffService';
import { getAllZones } from '../../services/zoneService';
import HeadTags from '../../components/HeadTags';

const AddVehicle = () => {
  
  // Initial form state
  const initialFormState = {
    vehicle_number: '',
    vehicle_type: '',
    model_brand: '',
    zone_id: '',
    staff_id: '',
    capacity_kg: '',
    fuel_type: 'diesel',
    fuel_efficiency: '',
    status: 'active',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [zones, setZones] = useState([]);
  const [staff, setStaff] = useState([]);

  // Vehicle type options
  const vehicleTypes = [
    'Truck',
    'Van',
    'Garbage Collector',
    'Compactor',
    'Dumper',
    'Loader',
    'Trolley',
    'Other',
  ];

  // Fuel type options
  const fuelTypes = ['Diesel', 'CNG', 'Electric'];
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch zones
        const zoneResponse = await getAllZones();
        if (zoneResponse.success) {
          setZones(zoneResponse.data);
        } else {
          toast.error('Failed to load zones');
        }

        // Fetch staff
        const staffResponse = await getAllStaff();
        if (staffResponse.success) {
          setStaff(staffResponse.data);
        } else {
          toast.error('Failed to load staff');
        }
      } catch (error) {
        toast.error('Error fetching data');
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
      vehicle_number: formData.vehicle_number,
      vehicle_type: formData.vehicle_type,
      model_brand: formData.model_brand || null,
      zone_id: formData.zone_id || null,
      staff_id: formData.staff_id || null,
      capacity_kg: formData.capacity_kg || null,
      fuel_type: formData.fuel_type,
      fuel_efficiency: formData.fuel_efficiency || null,
      status: formData.status,
    };

    try {
      const response = await createVehicle(dataToSend);
      if (response.success) {
        toast.success(response.message || 'Vehicle created successfully');
        setFormData(initialFormState);
        setErrors({});
      } else {
        toast.error(response.message || 'Failed to create vehicle');
        if (response.errors) {
          setErrors(response.errors);
        }
      }
    } catch (err) {
      if (err?.errors) {
        setErrors(err.errors);
      } else {
        toast.error(err?.message || 'Failed to create staff');
        console.log(err.message);
      }
    }
  };

  return (
    <>
     <HeadTags title="Create Vehicle" />
      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Create Vehicle</h3>
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
                  <Link to="/vehicle-list">Vehicle List</Link>
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
            <h3 className="fw-600 fs-18 mb-4">Basic Vehicle Information</h3>
            <form className="form" onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="vehicle_number" className="form-label">
                  Vehicle Number <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="vehicle_number"
                  name="vehicle_number"
                  value={formData.vehicle_number}
                  onChange={handleInputChange}
                  placeholder="(e.g., T-202)"
                />
                {errors.vehicle_number && <div className="text-danger small mt-1">{errors.vehicle_number[0]}</div>}
              </div>
              <div className="mb-4">
                <label htmlFor="vehicle_type" className="form-label">
                  Vehicle Type <span className="text-danger">*</span>
                </label>
                <div className="left-inner-addon">
                  <span className="icon">
                    <Truck />
                  </span>
                  <select
                    className="form-select"
                    id="vehicle_type"
                    name="vehicle_type"
                    value={formData.vehicle_type}
                    onChange={handleInputChange}
                  >
                    <option value="" disabled>
                      Select vehicle type
                    </option>
                    {vehicleTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.vehicle_type && <div className="text-danger small mt-1">{errors.vehicle_type[0]}</div>}
              </div>
              <div className="mb-4">
                <label htmlFor="model_brand" className="form-label">
                  Model & Brand
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="model_brand"
                  name="model_brand"
                  value={formData.model_brand}
                  onChange={handleInputChange}
                  placeholder="(e.g., Tata Ace, Hino)"
                />
                {errors.model_brand && <div className="text-danger small mt-1">{errors.model_brand[0]}</div>}
              </div>
              <div className="mb-4">
                <label htmlFor="zone_id" className="form-label">
                  Assigned Zone
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
                      Select Zone
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
                <label htmlFor="staff_id" className="form-label">
                  Assigned Driver
                </label>
                <div className="left-inner-addon">
                  <span className="icon">
                    <User />
                  </span>
                  <select
                    className="form-select"
                    id="staff_id"
                    name="staff_id"
                    value={formData.staff_id}
                    onChange={handleInputChange}
                  >
                    <option value="" disabled>
                      Select Staff
                    </option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.staff_id && <div className="text-danger small mt-1">{errors.staff_id[0]}</div>}
              </div>
              <div className="mb-4">
                <label htmlFor="capacity_kg" className="form-label">
                  Capacity (kg)
                </label>
                <input
                  type="number"
                  className="form-control"
                  id="capacity_kg"
                  name="capacity_kg"
                  value={formData.capacity_kg}
                  onChange={handleInputChange}
                  placeholder="Enter maximum load capacity"
                />
                {errors.capacity_kg && <div className="text-danger small mt-1">{errors.capacity_kg[0]}</div>}
              </div>
              <div className="mb-4">
                <label className="form-label">
                  Fuel Type
                </label>
                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                  {['diesel', 'cng', 'electric'].map((type) => (
                    <div className="form-check" key={type}>
                      <input
                        className="form-check-input"
                        type="radio"
                        name="fuel_type"
                        id={type}
                        value={type}
                        checked={formData.fuel_type === type}
                        onChange={handleInputChange}
                      />
                      <label className="form-check-label" htmlFor={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </label>
                    </div>
                  ))}
                </div>
                {errors.fuel_type && <div className="text-danger small mt-1">{errors.fuel_type[0]}</div>}
              </div>
              <div className="mb-4">
                <label htmlFor="fuel_efficiency" className="form-label">
                  Fuel Efficiency
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="fuel_efficiency"
                  name="fuel_efficiency"
                  value={formData.fuel_efficiency}
                  onChange={handleInputChange}
                  placeholder="e.g., 12.75"
                />
                {errors.fuel_efficiency && <div className="text-danger small mt-1">{errors.fuel_efficiency[0]}</div>}
              </div>
              <div className="mb-4">
                <label className="form-label">Status</label>
                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                  {['active', 'inactive', 'maintenance'].map((status) => (
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
                {errors.status && <div className="text-danger">{errors.status[0]}</div>}
              </div>
              <div className="d-flex gap-20">
                <Link to="/vehicle-list" className="btn-md outline-btn">
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

export default AddVehicle;