const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { fileTypeFromBuffer } = require('file-type');

// Ensure upload directories exist
function createUploadDirs() {
  const dirs = [
    'uploads/staff_image',
    'uploads/vehicle_documents',
    'uploads/staff_documents',
    'uploads/profile',
    'uploads/logo',
    'uploads/maintenance_invoices',
    'uploads/general'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
}

createUploadDirs();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';

    const fullUrl = req.originalUrl || req.url;
    
    // Settings files (logo, fav_icon)
    if (fullUrl.includes('/api/settings') || 
        fullUrl.includes('settings') ||
        file.fieldname === 'logo' || 
        file.fieldname === 'fav_icon') {
      uploadPath += 'logo/';
    }
    // Vehicle documents files
    else if (fullUrl.includes('/api/vehicle-documents') || 
             fullUrl.includes('vehicle-documents')) {
      uploadPath += 'vehicle_documents/';
    }
    // Vehicle maintenance invoice files
    else if (fullUrl.includes('/api/vehicle-documents') || 
             fullUrl.includes('vehicle-documents')) {
      uploadPath += 'vehicle_documents/';
    }
    // Staff document files
    else if (fullUrl.includes('/api/staff-documents') || 
             fullUrl.includes('staff-documents')) {
      uploadPath += 'staff_documents/';
    }
    // Staff files
    else if (fullUrl.includes('/api/staff') || 
             fullUrl.includes('staff')) {
      uploadPath += 'staff_image/';
    }
    // Maintenance files
    else if (fullUrl.includes('/api/maintenance-logs') || 
             fullUrl.includes('maintenance-logs')) {
      uploadPath += 'maintenance_invoices/';
    }
    // Profile files  
    else if (fullUrl.includes('/api/profile') || 
             fullUrl.includes('profile')) {
      uploadPath += 'profile/';
    }
    // Default folder
    else {
      uploadPath += 'general/';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter (preliminary by mimetype)
function fileFilter(req, file, cb) {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and documents are allowed.'), false);
  }
}

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});


module.exports = { upload };