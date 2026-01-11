import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { House, ChevronRight, User, Route } from 'lucide-react';
import toast from 'react-hot-toast';
import { createAttendance } from '../../services/staffAttendanceService';
import { getAllStaff } from '../../services/staffService';
import { getAllRoutes } from '../../services/routeService';
import HeadTags from '../../components/HeadTags';

const AddStaffAttendance = () => {
  // Initial form state
  const initialFormState = {
    staff_id: '',
    attendance_date: '',
    role: '',
    route_id: '',
    attendance_status: 'present',
    check_in_time: '',
    check_out_time: '',
    leave_type: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [staff, setStaff] = useState([]);
  const [routes, setRoutes] = useState([]);

  // Fetch staff and routes for dropdowns
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

        // Fetch routes
        const routeResponse = await getAllRoutes();
        if (routeResponse.success) {
          setRoutes(routeResponse.data);
        } else {
          toast.error('Failed to load routes');
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
      staff_id: formData.staff_id,
      attendance_date: formData.attendance_date,
      role: formData.role || null,
      route_id: formData.route_id || null,
      attendance_status: formData.attendance_status,
      check_in_time: formData.check_in_time || null,
      check_out_time: formData.attendance_status === 'present' ? formData.check_out_time : null,
      leave_type: formData.attendance_status === 'leave' ? formData.leave_type : null,
    };

    try {
      const response = await createAttendance(dataToSend);
      if (response.success) {
        toast.success(response.message || 'Attendance created successfully');
        setFormData(initialFormState);
        setErrors({});
      } else {
        toast.error(response.message || 'Failed to create attendance');
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
      <HeadTags title="Create Staff Attendance" />
      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Create Staff Attendance</h3>
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
                  <Link to="/attendance-list">Staff Attendance</Link>
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
            <h3 className="fw-600 fs-18 mb-4">Basic Staff Attendance Information</h3>
            <form className="form" onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="staff_id" className="form-label">
                  Staff Name <span className="text-danger">*</span>
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
                <label htmlFor="attendance_date" className="form-label">
                  Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  id="attendance_date"
                  name="attendance_date"
                  value={formData.attendance_date}
                  onChange={handleInputChange}
                />
                {errors.attendance_date && <div className="text-danger small mt-1">{errors.attendance_date[0]}</div>}
              </div>
              <div className="mb-4">
                <label htmlFor="role" className="form-label">
                  Role
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
                <label htmlFor="route_id" className="form-label">
                  Assigned Route
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
                <label className="form-label">
                  Attendance Status <span className="text-danger">*</span>
                </label>
                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                  {['present', 'absent', 'leave', 'late'].map((status) => (
                    <div className="form-check" key={status}>
                      <input
                        className="form-check-input"
                        type="radio"
                        name="attendance_status"
                        id={status}
                        value={status}
                        checked={formData.attendance_status === status}
                        onChange={handleInputChange}
                      />
                      <label className="form-check-label" htmlFor={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </label>
                    </div>
                  ))}
                </div>
                {errors.attendance_status && <div className="text-danger small mt-1">{errors.attendance_status[0]}</div>}
              </div>
              <div className="mb-4">
                <label htmlFor="check_in_time" className="form-label">
                  Check-in Time
                </label>
                <input
                  type="time"
                  className="form-control"
                  id="check_in_time"
                  name="check_in_time"
                  value={formData.check_in_time}
                  onChange={handleInputChange}
                />
                {errors.check_in_time && <div className="text-danger small mt-1">{errors.check_in_time[0]}</div>}
              </div>
              <div className="mb-4">
                <label htmlFor="check_out_time" className="form-label">
                  Check-out Time <span className={formData.attendance_status === 'present' ? 'text-danger' : ''}>*</span>
                </label>
                <input
                  type="time"
                  className="form-control"
                  id="check_out_time"
                  name="check_out_time"
                  value={formData.check_out_time}
                  onChange={handleInputChange}
                  disabled={formData.attendance_status !== 'present'}
                />
                {errors.check_out_time && <div className="text-danger small mt-1">{errors.check_out_time[0]}</div>}
              </div>
              
              <div className="mb-4">
                <label className="form-label">
                  Leave Type <span className={formData.attendance_status === 'leave' ? 'text-danger' : ''}>*</span>
                </label>
                <div className="d-flex gap-4 align-items-center flex-wrap custom-radio">
                  {['sick', 'casual', 'emergency'].map((type) => (
                    <div className="form-check" key={type}>
                      <input
                        className="form-check-input"
                        type="radio"
                        name="leave_type"
                        id={type}
                        value={type}
                        checked={formData.leave_type === type}
                        onChange={handleInputChange}
                        disabled={formData.attendance_status !== 'leave'}
                      />
                      <label className="form-check-label" htmlFor={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </label>
                    </div>
                  ))}
                </div>
                {errors.leave_type && <div className="text-danger small mt-1">{errors.leave_type[0]}</div>}
              </div>
              <div className="d-flex gap-20">
                <Link to="/attendance-list" className="btn-md outline-btn">
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

export default AddStaffAttendance;