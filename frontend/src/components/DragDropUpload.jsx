import {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle
} from 'react';
import { Upload, X, FileText, Image } from 'lucide-react';

const DragDropUpload = forwardRef(({
  label = "Upload File",
  required = false,
  accept = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ],
  onChange,
}, ref) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    clear: () => removeFile(),
    getFile: () => uploadedFile?.file || null,
  }), [uploadedFile]);

  const handleDragEvents = (e, dragging = true) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(dragging);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file) => {
    if (!accept.includes(file.type)) {
      alert(`Invalid file type. Allowed types: ${accept.join(', ')}`);
      return;
    }

    const fileObject = {
      id: Date.now(),
      file,
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type
    };

    setUploadedFile(fileObject);
    onChange?.(fileObject.file);
  };

  const removeFile = () => {
    setUploadedFile(null);
    fileInputRef.current.value = '';
    onChange?.(null);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <Image size={20} />;
    return <FileText size={20} />;
  };

  return (
    <div className="upload-container mb-4">
      {label && (
        <label className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}

      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={(e) => handleDragEvents(e, true)}
        onDragLeave={(e) => handleDragEvents(e, false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={40} className="upload-icon mb-2" />
        <p className="upload-text">Drag & drop or click to upload</p>
        <div className="upload-subtext">or click to choose file</div>
        <button type="button" className="choose-file-btn">
          Choose File
        </button>
        <p className="supported-formats fs-16">
          Accepted: {accept.map(type => type.split('/')[1].toUpperCase()).join(', ')}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept.join(',')}
        hidden
        onChange={handleFileSelect}
      />

      {uploadedFile && (
        <div className="uploaded-file mt-3 d-flex justify-content-between align-items-center p-2 border rounded">
          <div className="d-flex align-items-center gap-2">
            {getFileIcon(uploadedFile.type)}
            <div>
              <div className="file-name fw-semibold">{uploadedFile.name}</div>
              <div className="file-size text-muted small">{uploadedFile.size}</div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-light"
            onClick={(e) => {
              e.stopPropagation();
              removeFile();
            }}
            aria-label="Remove file"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
});

export default DragDropUpload;
