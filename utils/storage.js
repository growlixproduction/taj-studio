const path = require('path');
const fs = require('fs');
const { supabase } = require('../config/db');

/**
 * Upload a file buffer or stream to Supabase Storage bucket 'uploads'
 * Falls back to local disk if running locally and storage is unreachable
 */
async function uploadFile(file, folder = 'photos') {
  if (!file) return null;

  const ext = path.extname(file.originalname || file.name || '.jpg');
  const cleanBaseName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
  const storagePath = `${folder}/${cleanBaseName}`;

  // 1. If buffer exists (from memoryStorage)
  if (file.buffer) {
    try {
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype || 'application/octet-stream',
          upsert: true
        });

      if (!error && data) {
        const { data: pubData } = supabase.storage.from('uploads').getPublicUrl(storagePath);
        return pubData.publicUrl;
      }
      console.warn('Supabase storage upload error:', error);
    } catch (e) {
      console.warn('Supabase upload exception:', e.message);
    }

    // Local disk fallback
    try {
      const localDir = path.join(__dirname, '../public/uploads', folder);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      fs.writeFileSync(path.join(localDir, cleanBaseName), file.buffer);
      return `/uploads/${folder}/${cleanBaseName}`;
    } catch (diskErr) {
      console.warn('Local disk write error (read-only environment on Vercel):', diskErr.message);
    }
  }

  // 2. If diskStorage was used and file was written to disk
  if (file.filename) {
    return `/uploads/${folder}/${file.filename}`;
  }

  return null;
}

/**
 * Delete a file either from Supabase Storage or local disk
 */
async function deleteFile(filePath) {
  if (!filePath) return;

  // If Supabase Storage public URL
  if (filePath.includes('/storage/v1/object/public/uploads/')) {
    const parts = filePath.split('/storage/v1/object/public/uploads/');
    if (parts[1]) {
      try {
        await supabase.storage.from('uploads').remove([parts[1]]);
      } catch (err) {
        console.warn('Failed to delete from Supabase storage:', err.message);
      }
    }
    return;
  }

  // If local /uploads path
  if (filePath.startsWith('/uploads/')) {
    try {
      const fullPath = path.join(__dirname, '../public', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (err) {
      console.warn('Local unlink error:', err.message);
    }
  }
}

module.exports = {
  uploadFile,
  deleteFile
};
