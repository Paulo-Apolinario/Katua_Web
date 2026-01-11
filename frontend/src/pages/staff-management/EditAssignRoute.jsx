import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { House, ChevronRight, User, Truck, Route } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAssignmentById, updateAssignment } from '../../services/routeAssignmentService';
import { getAllStaff } from '../../services/staffService';
import { getAllVehicles } from '../../services/vehicleService';
import { getAllRoutes } from '../../services/routeService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const EditAssignRoute = () => {
  const { id } = useParams();
  // Initial form state
  const initialFormState = {
    staff_id: '',
    role: '',
    vehicle_id: '',
    route_id: '',
    assignment_start_date: '',
    shift: '',
    status: 'completed',
  };
  
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [staff, setStaff] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch staff
        const staffResponse = await getAllStaff();
        if (staffResponse.success) {
          setStaff(staffResponse.data);
        } else {
          toast.error('Failed to load staff');
        }

        // Fetch vehicles
        const vehicleResponse = await getAllVehicles();
        if (vehicleResponse.success) {
          setVehicles(vehicleResponse.data);
        } else {
          toast.error('Failed to load vehicles');
        }

        // Fetch routes
        const routeResponse = await getAllRoutes();
        if (routeResponse.success) {
          setRoutes(routeResponse.data);
        } else {
          toast.error('Failed to load routes');
        }

        // Fetch assignment data
        const assignmentResponse = await getAssignmentById(id);

        if (assignmentResponse.success) {
          setFormData({
            staff_id: assignmentResponse.data.staff_id || '',
            role: assignmentResponse.data.role || '',
            vehicle_id: assignmentResponse.data.vehicle_id || '',
            route_id: assignmentResponse.data.route_id || '',
            assignment_start_date: assignmentResponse.data.assignment_start_at.split('T')[0] || '',
            shift: assignmentResponse.data.shift || '',
            status: assignmentResponse.data.status
          });
          
        } else {
          toast.error('Failed to load assignment');
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
      staff_id: formData.staff_id,
      role: formData.role,
      vehicle_id: formData.vehicle_id || null,
      route_id: formData.route_id,
      assignment_start_at: formData.assignment_start_date,
      shift: formData.shift || null,
      status: formData.status,
    };

    try {
      const response = await updateAssignment(id, dataToSend);
      if (response.success) {
        toast.success(response.message || 'Route assignment updated successfully');
        setErrors({});
      } else {
        toast.error(response.message || 'Failed to update route assignment');
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
      <HeadTags title="Edit Assign" />
      <TopProgressBar loading={loading} />
      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Edit Assign</h3>
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
                  <Link to="/assign-list">Assign List</Link>
                </li>
                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Edit Assign
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>
      <div className="row justify-content-center mb-5">
        <div className="col-lg-10 col-xl-8">
          <div className="card p-25">
            <h3 className="fw-600 fs-18 mb-4">Edit Assign to Route Information</h3>
            <form className="form" onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="staff_id" className="form-label">
                  Staff <span className="text-danger">*</span>
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
                <label htmlFor="route_id" className="form-label">
                  Route <span className="text-danger">*</span>
                </label>
                <div className="left-inner-addon">
                  <span className="icon">
                    <Route />
                  </span>
                  <select
                    className="form-select"
                    id="route_id"
                    name="route_id"
                    value={formData.route_id}
                    onChange={handleInputChange}
                  >
                    <option value="" disabled>
                      Select Route
                    </option>
                    {routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.name}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.route_id && <div className="text-danger small mt-1">{errors.route_id[0]}</div>}
              </div>
              <div className="mb-4">
                <label htmlFor="assignment_start_date" className="form-label">
                  Assignment Start Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  id="assignment_start_date"
                  name="assignment_start_date"
                  value={formData.assignment_start_date}
                  onChange={handleInputChange}
                />
                {errors.assignment_start_at && (
                  <div className="text-danger small mt-1">{errors.assignment_start_at[0]}</div>
                )}
              </div>
              <div className="mb-4">
                <label htmlFor="shift" className="form-label">
                  Shift
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="shift"
                  name="shift"
                  value={formData.shift}
                  onChange={handleInputChange}
                  placeholder="e.g., morning/afternoon/night/custom time"
                />
                {errors.shift && <div className="text-danger small mt-1">{errors.shift[0]}</div>}
              </div>
              <div className="mb-4">
                <label className="form-label">Status</label>
                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                  {['completed', 'pending', 'cancelled',].map((status) => (
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
                <Link to="/assign-list" className="btn-md outline-btn">
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

export default EditAssignRoute;