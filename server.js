const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const db = require('./config/db');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// CORS setup
app.use(cors());

// Cloudflare R2 Media Streaming Route (with long-lived edge cache)
const { getR2Object } = require('./utils/storage');
app.get('/media/*', async (req, res, next) => {
  const key = req.params[0];
  if (!key) return next();
  try {
    const data = await getR2Object(key);
    if (!data || !data.Body) return res.status(404).send('Media not found');
    if (data.ContentType) res.setHeader('Content-Type', data.ContentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (typeof data.Body.pipe === 'function') {
      data.Body.pipe(res);
    } else {
      const chunks = [];
      for await (const chunk of data.Body) chunks.push(chunk);
      res.send(Buffer.concat(chunks));
    }
  } catch (err) {
    res.status(404).send('Media not found');
  }
});

// Fallback middleware for uploads to load from live site if missing locally
const fs = require('fs');
app.use('/uploads', (req, res, next) => {
  const localPath = path.join(__dirname, 'public/uploads', req.path);
  if (fs.existsSync(localPath)) {
    return next();
  }
  // ONLY redirect if running locally (localhost) to prevent redirect loops on production
  const host = req.get('host') || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return res.redirect(`https://tajstudio.info/uploads${req.path}`);
  }
  next();
});

// Static files serving
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Method override for HTTP verbs like PUT/DELETE from forms
app.use(methodOverride('_method'));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'taj_studio_super_secret_session_key_9988',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    httpOnly: true
  }
}));

// Flash messages
app.use(flash());

// Global flash and session variables available in EJS views
app.use(async (req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.admin = req.session.admin || null;
  
  try {
    const [rows] = await db.query('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    
    res.locals.settings = {
      store_name: settings.store_name || 'Taj Studio',
      footer_about: settings.footer_about || 'Capturing your life\'s most precious stories and emotions. Cinematic filmmaking and high-end artistic photography based in India.',
      about_eyebrow: settings.about_eyebrow || 'Who We Are',
      about_title: settings.about_title || 'We Breathe Life Into Your Memories',
      about_text1: settings.about_text1 || 'Based in the heart of India, Taj Studio is an elite collective of filmmakers and visual artists specializing in premium weddings, corporate events, and lifestyle portraiture. We believe that every frame should tell a profound story—combining ambient lighting, natural gestures, and rich colors.',
      about_text2: settings.about_text2 || 'Our approach is discreet, intimate, and deeply personal. From local traditions to contemporary setups, we ensure your emotional landscape is recorded with absolute fidelity and creative distinction.',
      about_image: settings.about_image || 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
      hero_duration: parseInt(settings.hero_duration) || 5000,
      ugc_duration: parseInt(settings.ugc_duration) || 4000,
      contact_address: settings.contact_address || '123 Palace Road, Jaipur, Rajasthan, India',
      contact_phone: settings.contact_phone || '+91 99999 99999',
      contact_email: settings.contact_email || 'contact@tajstudio.com',
      contact_instagram: settings.contact_instagram || 'https://instagram.com',
      contact_facebook: settings.contact_facebook || 'https://facebook.com',
      contact_youtube: settings.contact_youtube || 'https://youtube.com',
      contact_whatsapp: settings.contact_whatsapp || 'https://wa.me/919999999999'
    };
  } catch (err) {
    res.locals.settings = {
      store_name: 'Taj Studio',
      footer_about: 'Capturing your life\'s most precious stories and emotions. Cinematic filmmaking and high-end artistic photography based in India.',
      about_eyebrow: 'Who We Are',
      about_title: 'We Breathe Life Into Your Memories',
      about_text1: 'Based in the heart of India, Taj Studio is an elite collective of filmmakers and visual artists specializing in premium weddings, corporate events, and lifestyle portraiture. We believe that every frame should tell a profound story—combining ambient lighting, natural gestures, and rich colors.',
      about_text2: 'Our approach is discreet, intimate, and deeply personal. From local traditions to contemporary setups, we ensure your emotional landscape is recorded with absolute fidelity and creative distinction.',
      about_image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
      hero_duration: 5000,
      ugc_duration: 4000,
      contact_address: '123 Palace Road, Jaipur, Rajasthan, India',
      contact_phone: '+91 99999 99999',
      contact_email: 'contact@tajstudio.com',
      contact_instagram: 'https://instagram.com',
      contact_facebook: 'https://facebook.com',
      contact_youtube: 'https://youtube.com',
      contact_whatsapp: 'https://wa.me/919999999999'
    };
  }
  next();
});

// Route registration
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));

// 404 Error handler for undefined routes
app.use((req, res) => {
  res.status(404).render('404', { title: '404 — Page Not Found' });
});

// Global internal error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).render('404', { title: '500 — Internal Server Error' });
});

if (require.main === module && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Taj Studio running on port ${PORT}`);
  });
}

module.exports = app;
