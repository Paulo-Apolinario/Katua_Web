import { useState, useEffect,useRef } from 'react';
import { Link } from 'react-router';
import { House, ChevronRight, User } from 'lucide-react';
import toast from 'react-hot-toast';
import DragDropUpload from '../../components/DragDropUpload';
import { getAllStaff } from '../../services/staffService';
import { createDocument } from '../../services/staffDocumentService';
import HeadTags from '../../components/HeadTags';

const AddStaffDocument = () => {
  // Initial form state
  const initialFormState = {
    staff_id: '',
    document_type: '',
    document_number: '',
    issue_date: '',
    expiry_date: '',
    special_instructions: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [staff, setStaff] = useState([]);
  const fileRef = useRef(null);

  // Document type options
  const documentTypes = ['passport', 'license', 'certificate', 'nid', 'other'];

  // Fetch staff for dropdown
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getAllStaff();
        if (response.success) {
          setStaff(response.data);
        } else {
          toast.error('Failed to load staff');
        }
      } catch (error) {
        toast.error('Error fetching staff');
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

    // Prepare FormData for API request
    const dataToSend = new FormData();
    dataToSend.append('staff_id', formData.staff_id);
    dataToSend.append('document_type', formData.document_type);
    dataToSend.append('document_number', formData.document_number);
    dataToSend.append('issue_date', formData.issue_date || '');
    dataToSend.append('expiry_date', formData.expiry_date || '');
    dataToSend.append('file', fileRef.current.getFile());
    dataToSend.append('notes', formData.special_instructions || '');

    try {
      const response = await createDocument(dataToSend);
      if (response.success) {
        toast.success(response.message ||'Staff document created successfully');
        setFormData(initialFormState);
        fileRef.current.clear();
        setErrors({});
      } else {
        toast.error(response.message || 'Failed to create staff document');
        setErrors(response.errors || {});
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
      <HeadTags title="Create Staff Document" />
      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Create Staff Document</h3>
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
                  <Link to="/staff-document-list">Staff Document</Link>
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
      <div className="row justify-content-center mb-5">
        <div className="col-lg-10 col-xl-8">
          <div className="card p-25">
            <h3 className="fw-600 fs-18 mb-4">Basic Staff Document Information</h3>
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
                <label htmlFor="document_type" className="form-label">
                  Document Type <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  id="document_type"
                  name="document_type"
                  value={formData.document_type}
                  onChange={handleInputChange}
                >
                  <option value="" disabled>
                    Select document type
                  </option>
                  {documentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.document_type && <div className="text-danger small mt-1">{errors.document_type[0]}</div>}
              </div>
              <div className="mb-4">
                <label htmlFor="document_number" className="form-label">
                  Document Number <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="document_number"
                  name="document_number"
                  value={formData.document_number}
                  onChange={handleInputChange}
                  placeholder="e.g., NID no, license no"
                />
                {errors.document_number && <div className="text-danger small mt-1">{errors.document_number[0]}</div>}
              </div>
              <div className="mb-4">
                <label htmlFor="issue_date" className="form-label">
                  Issue Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  id="issue_date"
                  name="issue_date"
                  value={formData.issue_date}
                  onChange={handleInputChange}
                />
                {errors.issue_date && <div className="text-danger small mt-1">{errors.issue_date[0]}</div>}
              </div>
              <div className="mb-4">
                <label htmlFor="expiry_date" className="form-label">
                  Expiry Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  id="expiry_date"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleInputChange}
                />
                {errors.expiry_date && <div className="text-danger small mt-1">{errors.expiry_date[0]}</div>}
              </div>
              <div className="mb-4">
                <DragDropUpload
                    ref={fileRef}
                    label="Document File"
                    required
                    onChange={(file) => setErrors((prev) => ({ ...prev, file: '' }))}
                />
                {errors.file && <div className="text-danger small mt-1">{errors.file[0]}</div>}
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
                  placeholder="Enter any special instructions or notes for this document"
                ></textarea>
                {errors.special_instructions && (
                  <div className="text-danger small mt-1">{errors.special_instructions[0]}</div>
                )}
              </div>
              <div className="d-flex gap-20">
                <Link to="/staff-document-list" className="btn-md outline-btn">
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

export default AddStaffDocument;
