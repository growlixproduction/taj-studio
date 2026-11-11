const multer = require('multer');
const path = require('path');

// Use memoryStorage for Vercel serverless compatibility & direct Supabase Storage uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|mp4|mov|avi/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Invalid file type. Only JPG, JPEG, PNG, WEBP, MP4, MOV, and AVI are allowed.'));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit suitable for serverless & web
});
