import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router';
import { House, ChevronRight, User } from 'lucide-react';
import toast from 'react-hot-toast';
import DragDropUpload from '../../components/DragDropUpload';
import { getDocumentById, updateDocument } from '../../services/staffDocumentService';
import { getAllStaff } from '../../services/staffService';
import HeadTags from '../../components/HeadTags';
import TopProgressBar from '../../components/TopProgressBar';

const EditStaffDocument = () => {
  const { id } = useParams();
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
  const [loading, setLoading] = useState(true);
  const [existingImage, setExistingImage] = useState(null);
  const [newFileSelected, setNewFileSelected] = useState(false);
  const fileRef = useRef(null);

  // Document type options
 const documentTypes = ['passport', 'license', 'certificate', 'nid', 'other'];

  // Fetch document and staff on component mount
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

        // Fetch document data
        const documentResponse = await getDocumentById(id);
        if (documentResponse.success) {
          setFormData({
            staff_id: documentResponse.data.staff_id || '',
            document_type: documentResponse.data.document_type || '',
            document_number: documentResponse.data.document_number || '',
            issue_date: documentResponse.data.issue_date.split('T')[0] || '',
            expiry_date: documentResponse.data.expiry_date.split('T')[0] || '',
            special_instructions: documentResponse.data.notes || '',
          });
          setExistingImage(documentResponse.data.file || null);
        } else {
          toast.error('Failed to load document');
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

  // Handle file change to hide existing image and clear errors
  const handleFileChange = (file) => {
    setNewFileSelected(!!file);
    setErrors((prev) => ({ ...prev, file: '' }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Prepare FormData for API request
    const dataToSend = new FormData();
    dataToSend.append('_method', 'PUT');
    dataToSend.append('staff_id', formData.staff_id);
    dataToSend.append('document_type', formData.document_type);
    dataToSend.append('document_number', formData.document_number);
    dataToSend.append('issue_date', formData.issue_date || '');
    dataToSend.append('expiry_date', formData.expiry_date || '');
    if (fileRef.current?.getFile()) {
      dataToSend.append('file', fileRef.current.getFile());
    }
    dataToSend.append('notes', formData.special_instructions || '');

    try {
      const response = await updateDocument(id, dataToSend);
      if (response.success) {
        toast.success(response.message || 'Staff document updated successfully');
        setExistingImage(response.data.file || null);
        setNewFileSelected(false);
        fileRef.current.clear();
      } else {
        toast.error(response.message || 'Failed to update staff document');
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
      <HeadTags title="Edit Staff Document" />
      <TopProgressBar loading={loading} />
      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Edit Staff Document</h3>
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
                  Edit Document
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>
      <div className="row justify-content-center mb-5">
        <div className="col-lg-10 col-xl-8">
          <div className="card p-25">
            <h3 className="fw-600 fs-18 mb-4">Edit Staff Document Information</h3>
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
              <DragDropUpload
                ref={fileRef}
                label="Document File"
                required={true}
                onChange={(file) => handleFileChange(file)}
              />
              {errors.file && <p className="text-danger">{errors.file[0]}</p>}
              {existingImage && (
                <div className="mb-4">
                  <label className="form-label">Current Document Preview</label>
                  <div className="border rounded p-2">
                    {existingImage.endsWith('.pdf') ? (
                      <a href={`${import.meta.env.VITE_API_BASE_URL}/uploads/staff_documents/${existingImage}`} target="_blank" rel="noopener noreferrer" className="d-flex align-items-center gap-2">
                        <span>View PDF</span>
                      </a>
                    ) : (
                      <img
                        src={`${import.meta.env.VITE_API_BASE_URL}/uploads/staff_documents/${existingImage}`}
                        alt="Document Preview"
                        style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }}
                        onError={() => setExistingImage(null)}
                      />
                    )}
                  </div>
                </div>
              )}
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

export default EditStaffDocument;