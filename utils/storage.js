const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { supabase } = require('../config/db');
require('dotenv').config();

const r2Bucket = process.env.R2_BUCKET || 'tajstudio';
const r2Endpoint = process.env.R2_ENDPOINT;
const r2AccessKey = process.env.R2_ACCESS_KEY_ID;
const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY;
const r2PublicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

const r2Client = (r2Endpoint && r2AccessKey && r2SecretKey)
  ? new S3Client({
      region: 'auto',
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId: r2AccessKey,
        secretAccessKey: r2SecretKey
      }
    })
  : null;

/**
 * Upload a file buffer to Cloudflare R2 (primary), falling back to Supabase Storage or local disk.
 */
async function uploadFile(file, folder = 'photos') {
  if (!file) return null;

  const ext = path.extname(file.originalname || file.name || '.jpg');
  const cleanBaseName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
  const storagePath = `${folder}/${cleanBaseName}`;

  if (file.buffer) {
    // 1. Primary: Cloudflare R2 Object Storage
    if (r2Client) {
      try {
        await r2Client.send(new PutObjectCommand({
          Bucket: r2Bucket,
          Key: storagePath,
          Body: file.buffer,
          ContentType: file.mimetype || 'application/octet-stream'
        }));

        if (r2PublicUrl) {
          return `${r2PublicUrl}/${storagePath}`;
        }
        return `/media/${storagePath}`;
      } catch (r2Err) {
        console.warn('Cloudflare R2 upload error:', r2Err.message);
      }
    }

    // 2. Fallback: Supabase Storage
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
    } catch (e) {
      console.warn('Supabase upload exception:', e.message);
    }

    // 3. Fallback: Local disk (dev only)
    try {
      const localDir = path.join(__dirname, '../public/uploads', folder);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      fs.writeFileSync(path.join(localDir, cleanBaseName), file.buffer);
      return `/uploads/${folder}/${cleanBaseName}`;
    } catch (diskErr) {
      console.warn('Local disk write error:', diskErr.message);
    }
  }

  if (file.filename) {
    return `/uploads/${folder}/${file.filename}`;
  }

  return null;
}

/**
 * Fetch an object from Cloudflare R2 for /media/* route
 */
async function getR2Object(key) {
  if (!r2Client) return null;
  return await r2Client.send(new GetObjectCommand({
    Bucket: r2Bucket,
    Key: key
  }));
}

/**
 * Delete a file from Cloudflare R2, Supabase Storage, or local disk
 */
async function deleteFile(filePath) {
  if (!filePath) return;

  // 1. R2 via /media/ prefix
  if (filePath.startsWith('/media/') && r2Client) {
    const key = filePath.replace(/^\/media\//, '');
    try {
      await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key }));
    } catch (err) {
      console.warn('Failed to delete from R2:', err.message);
    }
    return;
  }

  // 2. R2 via R2_PUBLIC_URL
  if (r2PublicUrl && filePath.startsWith(r2PublicUrl) && r2Client) {
    const key = filePath.replace(r2PublicUrl + '/', '');
    try {
      await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key }));
    } catch (err) {
      console.warn('Failed to delete from R2 public URL:', err.message);
    }
    return;
  }

  // 3. Supabase Storage public URL
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

  // 4. Local /uploads path
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
  deleteFile,
  getR2Object
};
