import dotenv from 'dotenv';
dotenv.config();

import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Debug: Check environment variables
console.log('Cloudinary Environment Variables:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Present' : 'Missing');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Present' : 'Missing');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'application-documents', // Folder name in Cloudinary
    allowed_formats: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'txt'],
    public_id: (req, file) => {
      // Create unique public ID
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const name = file.originalname.split('.')[0];
      return `${name}-${uniqueSuffix}`;
    },
    resource_type: 'auto', // Automatically detect resource type
    transformation: [
      { width: 2000, height: 2000, crop: 'limit' }, // Limit image dimensions
      { quality: 'auto' } // Optimize quality
    ]
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, PNG, and TXT files are allowed.'), false);
  }
};

// Configure multer with Cloudinary storage
import multer from 'multer';
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Single file upload middleware
export const uploadSingle = upload.single('document');

// Multiple files upload middleware
export const uploadMultiple = upload.array('documents', 5);

// Helper function to delete file from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

// Helper function to get file info from Cloudinary
export const getCloudinaryFileInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    console.error('Error getting Cloudinary file info:', error);
    throw error;
  }
};

export default cloudinary;
