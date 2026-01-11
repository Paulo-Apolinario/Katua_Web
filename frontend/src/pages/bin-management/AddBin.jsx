import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { House, ChevronRight, Truck, MapPin, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { createBin } from '../../services/binService';
import { getAllZones } from '../../services/zoneService';
import { getAllVehicles } from '../../services/vehicleService';
import HeadTags from '../../components/HeadTags';

const AddBin = () => {
  // Initial form state
  const initialFormState = {
    bin_id: '',
    bin_type: '',
    location: '',
    zone_id: '',
    vehicle_id: '',
    collection_date: '',
    status: 'active',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [zones, setZones] = useState([]);
  const [vehicles, setVehicles] = useState([]);

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

        // Fetch vehicles
        const vehicleResponse = await getAllVehicles();
        if (vehicleResponse.success) {
          setVehicles(vehicleResponse.data);
        } else {
          toast.error('Failed to load vehicles');
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
      bin_id: formData.bin_id,
      bin_type: formData.bin_type || null,
      location: formData.location || null,
      zone_id: formData.zone_id,
      vehicle_id: formData.vehicle_id || null,
      last_collection_date: formData.collection_date,
      status: formData.status,
    };

    try {
      const response = await createBin(dataToSend);
      if (response.success) {
        toast.success(response.message || 'Bin created successfully');
        setFormData(initialFormState);
        setErrors({});
      } else {
        toast.error(response.message || 'Failed to create bin');
        if (response.errors) {
          setErrors(response.errors);
        }
      }
    } catch (err) {
      if (err?.errors) {
         setErrors(err.errors);
      } else {
         toast.error(err?.message || 'Failed to create bin');
         console.log(err.message);
      }
    }
  };

  return (
    <>
     <HeadTags title="Create Bin" />
      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Create Bin</h3>
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
                  <Link to="/bin-list">Bin List</Link>
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
      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-8">
          <div className="card p-25 mb-5">
            <h3 className="fw-600 fs-18 mb-4">Basic Bin Information</h3>
            <form className="form" onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="bin_id" className="form-label">
                  Bin ID <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="bin_id"
                  name="bin_id"
                  value={formData.bin_id}
                  onChange={handleInputChange}
                  placeholder="e.g., BIN-001"
                />
                {errors.bin_id && <div className="text-danger small mt-1">{errors.bin_id[0]}</div>}
              </div>
              <div className="mb-4">
                <label htmlFor="bin_type" className="form-label">
                  Bin Type
                </label>
                <div className="left-inner-addon">
                  <span className="icon">
                    <Archive />
                  </span>
                  <select
                    className="form-select"
                    id="bin_type"
                    name="bin_type"
                    value={formData.bin_type}
                    onChange={handleInputChange}
                  >
                    <option value="" disabled>
                      Select Bin Type
                    </option>
                    {['recyclable', 'non-recyclable', 'organic'].map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.bin_type && <div className="text-danger small mt-1">{errors.bin_type[0]}</div>}
              </div>
              <div className="mb-4">
                <label htmlFor="location" className="form-label">
                  Location <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Enter bin location"
                />
                {errors.location && <div className="text-danger small mt-1">{errors.location[0]}</div>}
              </div>
              <div className="mb-4">
                <label htmlFor="zone_id" className="form-label">
                  Assigned Zone <span className="text-danger">*</span>
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
                    <option value="" disabled>
                      Select Vehicle
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
                <label htmlFor="collection_date" className="form-label">
                  Collection Date 
                </label>
                <input
                  type="date"
                  className="form-control"
                  id="collection_date"
                  name="collection_date"
                  value={formData.collection_date}
                  onChange={handleInputChange}
                />
                {errors.last_collection_date && <div className="text-danger small mt-1">{errors.last_collection_date[0]}</div>}
              </div>
              <div className="mb-4">
                <label className="form-label">Status</label>
                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                  {['active', 'inactive', 'full'].map((status) => (
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
                <Link to="/bin-list" className="btn-md outline-btn">
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

export default AddBin;