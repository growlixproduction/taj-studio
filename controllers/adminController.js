const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { uploadFile, deleteFile } = require('../utils/storage');

exports.dashboard = async (req, res, next) => {
  try {
    const [[{ videos }]] = await db.query('SELECT COUNT(*) as videos FROM videos');
    const [[{ photos }]] = await db.query('SELECT COUNT(*) as photos FROM photos');
    const [[{ messages }]] = await db.query('SELECT COUNT(*) as messages FROM contacts');
    const [recent] = await db.query('SELECT * FROM contacts ORDER BY submitted_at DESC LIMIT 5');
    
    res.render('admin/dashboard', { 
      title: 'Dashboard — Taj Studio Admin', 
      stats: { videos, photos, messages }, 
      recent 
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    next(err);
  }
};

exports.uploadVideoPage = (req, res) => {
  res.render('admin/upload-video', { title: 'Upload Video' });
};

exports.uploadVideo = async (req, res, next) => {
  const { title, description, category, video_type, youtube_url } = req.body;
  let file_path = null;
  let thumbnail = null;

  try {
    if (video_type === 'youtube') {
      if (!youtube_url) {
        req.flash('error', 'YouTube URL is required for YouTube video type');
        return res.redirect('/admin/upload-video');
      }
      const ytMatch = youtube_url.match(/(?:v=|youtu\.be\/|embed\/)([^&\s?]+)/);
      const ytId = ytMatch ? ytMatch[1] : null;
      thumbnail = ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null;
    } else {
      if (!req.files || !req.files['video_file']) {
        req.flash('error', 'Video file is required for Upload video type');
        return res.redirect('/admin/upload-video');
      }
      file_path = await uploadFile(req.files['video_file'][0], 'videos');
      
      if (req.files['thumbnail']) {
        thumbnail = await uploadFile(req.files['thumbnail'][0], 'photos');
      }
    }

    await db.query(
      'INSERT INTO videos (title, description, category, video_type, youtube_url, file_path, thumbnail) VALUES (?,?,?,?,?,?,?)',
      [title, description, category, video_type, youtube_url || null, file_path, thumbnail]
    );
    
    req.flash('success', 'Video uploaded successfully');
    res.redirect('/admin/manage-videos');
  } catch (err) {
    console.error('Upload Video Error:', err);
    req.flash('error', 'Failed to upload video. ' + err.message);
    res.redirect('/admin/upload-video');
  }
};

exports.uploadPhotoPage = (req, res) => {
  res.render('admin/upload-photo', { title: 'Upload Photos' });
};

exports.uploadPhotos = async (req, res, next) => {
  const { category, alt_text } = req.body;
  
  if (!req.files || req.files.length === 0) {
    req.flash('error', 'Please select at least one photo to upload');
    return res.redirect('/admin/upload-photo');
  }

  try {
    for (const file of req.files) {
      const filePath = await uploadFile(file, 'photos');
      await db.query(
        'INSERT INTO photos (category, file_path, alt_text) VALUES (?,?,?)',
        [category, filePath, alt_text || '']
      );
    }
    
    req.flash('success', `${req.files.length} photo(s) uploaded successfully`);
    res.redirect('/admin/manage-photos');
  } catch (err) {
    console.error('Upload Photos Error:', err);
    req.flash('error', 'Failed to upload photos. ' + err.message);
    res.redirect('/admin/upload-photo');
  }
};

exports.manageVideos = async (req, res, next) => {
  try {
    const [videos] = await db.query('SELECT * FROM videos ORDER BY order_index ASC, created_at DESC');
    res.render('admin/manage-videos', { title: 'Manage Videos', videos });
  } catch (err) {
    console.error('Manage Videos Error:', err);
    next(err);
  }
};

exports.managePhotos = async (req, res, next) => {
  try {
    const [photos] = await db.query('SELECT * FROM photos ORDER BY order_index ASC, created_at DESC');
    res.render('admin/manage-photos', { title: 'Manage Photos', photos });
  } catch (err) {
    console.error('Manage Photos Error:', err);
    next(err);
  }
};

exports.messages = async (req, res, next) => {
  try {
    const [messages] = await db.query('SELECT * FROM contacts ORDER BY submitted_at DESC');
    res.render('admin/messages', { title: 'Contact Messages', messages });
  } catch (err) {
    console.error('View Messages Error:', err);
    next(err);
  }
};

exports.deleteVideo = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM videos WHERE id = ?', [req.params.id]);
    if (rows && rows.length) {
      if (rows[0].file_path) await deleteFile(rows[0].file_path);
      if (rows[0].thumbnail) await deleteFile(rows[0].thumbnail);
    }
    
    await db.query('DELETE FROM videos WHERE id = ?', [req.params.id]);
    req.flash('success', 'Video deleted successfully');
    res.redirect('/admin/manage-videos');
  } catch (err) {
    console.error('Delete Video Error:', err);
    req.flash('error', 'Failed to delete video. ' + err.message);
    res.redirect('/admin/manage-videos');
  }
};

exports.deletePhoto = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM photos WHERE id = ?', [req.params.id]);
    if (rows && rows.length && rows[0].file_path) {
      await deleteFile(rows[0].file_path);
    }
    
    await db.query('DELETE FROM photos WHERE id = ?', [req.params.id]);
    req.flash('success', 'Photo deleted successfully');
    res.redirect('/admin/manage-photos');
  } catch (err) {
    console.error('Delete Photo Error:', err);
    req.flash('error', 'Failed to delete photo. ' + err.message);
    res.redirect('/admin/manage-photos');
  }
};

// =============================================================
// SITE CUSTOM SETTINGS CONTROLLERS
// =============================================================

exports.settingsPage = async (req, res, next) => {
  try {
    const [settingsRows] = await db.query('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    if (Array.isArray(settingsRows)) {
      settingsRows.forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });
    }
    const [heroSlides] = await db.query('SELECT * FROM hero_slides ORDER BY order_index ASC');
    const [ugcItems] = await db.query('SELECT * FROM ugc_items ORDER BY order_index ASC');
    
    res.render('admin/settings', {
      title: 'Site Custom Settings — Taj Studio',
      settings,
      heroSlides,
      ugcItems
    });
  } catch (err) {
    console.error('Settings Page Error:', err);
    next(err);
  }
};

// =============================================================
// REORDER CONTROLLERS (AJAX)
// =============================================================

exports.reorderPhotos = async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'Invalid payload' });
    for (const item of order) {
      await db.query('UPDATE photos SET order_index = ? WHERE id = ?', [item.order_index, item.id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Reorder Photos Error:', err);
    res.status(500).json({ error: 'Failed to reorder' });
  }
};

exports.reorderVideos = async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'Invalid payload' });
    for (const item of order) {
      await db.query('UPDATE videos SET order_index = ? WHERE id = ?', [item.order_index, item.id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Reorder Videos Error:', err);
    res.status(500).json({ error: 'Failed to reorder' });
  }
};

exports.reorderHeroSlides = async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'Invalid payload' });
    for (const item of order) {
      await db.query('UPDATE hero_slides SET order_index = ? WHERE id = ?', [item.order_index, item.id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Reorder Hero Slides Error:', err);
    res.status(500).json({ error: 'Failed to reorder' });
  }
};

exports.reorderUgcItems = async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'Invalid payload' });
    for (const item of order) {
      await db.query('UPDATE ugc_items SET order_index = ? WHERE id = ?', [item.order_index, item.id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Reorder UGC Items Error:', err);
    res.status(500).json({ error: 'Failed to reorder' });
  }
};

// =============================================================
// BANNER UPDATE CONTROLLER
// =============================================================

exports.updateBanners = async (req, res, next) => {
  try {
    const bannerKeys = [
      'banner_photos_wedding','banner_photos_prewedding','banner_photos_anniversary',
      'banner_photos_engagement','banner_photos_birthday','banner_photos_indoor',
      'banner_videos_wedding','banner_videos_prewedding','banner_videos_anniversary',
      'banner_videos_engagement','banner_videos_birthday','banner_videos_indoor'
    ];
    for (const key of bannerKeys) {
      if (req.files && req.files[key] && req.files[key][0]) {
        const filePath = await uploadFile(req.files[key][0], 'photos');
        await db.query(
          'INSERT INTO settings (setting_key, setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=?',
          [key, filePath, filePath]
        );
      } else if (req.body[key] && req.body[key].trim()) {
        const url = req.body[key].trim();
        await db.query(
          'INSERT INTO settings (setting_key, setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=?',
          [key, url, url]
        );
      }
    }
    req.flash('success', 'Page banners updated successfully!');
    res.redirect('/admin/settings?tab=banners');
  } catch (err) {
    console.error('Update Banners Error:', err);
    req.flash('error', 'Failed to update banners. ' + err.message);
    res.redirect('/admin/settings?tab=banners');
  }
};

exports.updateGeneralSettings = async (req, res, next) => {
  const fields = [
    'store_name', 'footer_about', 'about_eyebrow', 'about_title', 'about_text1', 'about_text2',
    'hero_duration', 'ugc_duration', 'contact_address', 'contact_phone',
    'contact_email', 'contact_instagram', 'contact_facebook', 'contact_youtube', 'contact_whatsapp'
  ];
  
  let targetTab = 'general';
  if (req.body.about_eyebrow !== undefined || req.file) {
    targetTab = 'about';
  } else if (req.body.contact_address !== undefined) {
    targetTab = 'contact';
  }

  try {
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        await db.query(
          'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
          [field, req.body[field], req.body[field]]
        );
      }
    }
    // Handle About Image upload
    if (req.file) {
      const aboutImgPath = await uploadFile(req.file, 'photos');
      await db.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        ['about_image', aboutImgPath, aboutImgPath]
      );
    }
    req.flash('success', 'General site settings updated successfully');
    res.redirect(`/admin/settings?tab=${targetTab}`);
  } catch (err) {
    console.error('Update General Settings Error:', err);
    req.flash('error', 'Failed to update settings. ' + err.message);
    res.redirect(`/admin/settings?tab=${targetTab}`);
  }
};

exports.addHeroSlide = async (req, res, next) => {
  const { title, subtitle, order_index } = req.body;
  if (!req.file) {
    req.flash('error', 'Please select a hero slide image to upload.');
    return res.redirect('/admin/settings?tab=hero');
  }
  try {
    const image_path = await uploadFile(req.file, 'photos');
    await db.query(
      'INSERT INTO hero_slides (image_path, title, subtitle, order_index) VALUES (?,?,?,?)',
      [image_path, title || '', subtitle || '', parseInt(order_index) || 0]
    );
    req.flash('success', 'Hero slide image added successfully');
    res.redirect('/admin/settings?tab=hero');
  } catch (err) {
    console.error('Add Hero Slide Error:', err);
    req.flash('error', 'Failed to add hero slide. ' + err.message);
    res.redirect('/admin/settings?tab=hero');
  }
};

exports.deleteHeroSlide = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM hero_slides WHERE id = ?', [req.params.id]);
    if (rows && rows.length && rows[0].image_path) {
      await deleteFile(rows[0].image_path);
    }
    await db.query('DELETE FROM hero_slides WHERE id = ?', [req.params.id]);
    req.flash('success', 'Hero slide deleted successfully');
    res.redirect('/admin/settings?tab=hero');
  } catch (err) {
    console.error('Delete Hero Slide Error:', err);
    req.flash('error', 'Failed to delete hero slide. ' + err.message);
    res.redirect('/admin/settings?tab=hero');
  }
};

exports.addUgcItems = async (req, res, next) => {
  const { order_index } = req.body;
  if (!req.files || req.files.length === 0) {
    req.flash('error', 'Please select at least one photo or video reel to upload.');
    return res.redirect('/admin/settings?tab=ugc');
  }
  try {
    for (const file of req.files) {
      const type = file.mimetype.startsWith('video') ? 'video' : 'image';
      const folder = type === 'video' ? 'videos' : 'photos';
      const file_path = await uploadFile(file, folder);
      await db.query(
        'INSERT INTO ugc_items (type, file_path, order_index) VALUES (?,?,?)',
        [type, file_path, parseInt(order_index) || 0]
      );
    }
    req.flash('success', `${req.files.length} Social UGC Reel(s) added successfully`);
    res.redirect('/admin/settings?tab=ugc');
  } catch (err) {
    console.error('Add UGC Items Error:', err);
    req.flash('error', 'Failed to add UGC stories. ' + err.message);
    res.redirect('/admin/settings?tab=ugc');
  }
};

exports.deleteUgcItem = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM ugc_items WHERE id = ?', [req.params.id]);
    if (rows && rows.length && rows[0].file_path) {
      await deleteFile(rows[0].file_path);
    }
    await db.query('DELETE FROM ugc_items WHERE id = ?', [req.params.id]);
    req.flash('success', 'Social UGC Reel deleted successfully');
    res.redirect('/admin/settings?tab=ugc');
  } catch (err) {
    console.error('Delete UGC Item Error:', err);
    req.flash('error', 'Failed to delete UGC Reel. ' + err.message);
    res.redirect('/admin/settings?tab=ugc');
  }
};
