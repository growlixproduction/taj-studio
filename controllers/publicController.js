const db = require('../config/db');
const { groupPhotosIntoStacks } = require('../utils/photoStacks');

const DEFAULT_BRANDS = [
  { id: 1, name: 'CINEVO', tagline: 'Luxury Cinema & Production', logo_url: '/media/brands/cinevo-logo.jpg', website_url: 'https://cinevo.in/' },
  { id: 2, name: 'GROWLIX', tagline: 'Digital Growth & Production', logo_url: '/media/brands/growlix-logo.jpg', website_url: 'https://growlix.info/' },
  { id: 3, name: 'Stories By Wedding', tagline: 'Wedding Stories on Instagram', logo_url: '/media/brands/stories-by-wedding-logo.jpg', website_url: 'https://www.instagram.com/storiesbywedding/' }
];

let homeCache = null;
let homeCacheAt = 0;
const HOME_CACHE_TTL = 10 * 1000; // 10s fast memory cache, cleared immediately on admin POST

exports.clearHomeCache = () => {
  homeCache = null;
  homeCacheAt = 0;
};

exports.home = async (req, res, next) => {
  try {
    const now = Date.now();
    if (homeCache && (now - homeCacheAt) < HOME_CACHE_TTL) {
      return res.render('index', homeCache);
    }

    const [
      [featuredVideos],
      [rawPhotos],
      [heroSlides],
      [ugcItems],
      brandResult
    ] = await Promise.all([
      db.query('SELECT * FROM videos ORDER BY order_index ASC, created_at DESC LIMIT 6'),
      db.query('SELECT * FROM photos ORDER BY order_index ASC, created_at DESC LIMIT 36'),
      db.query('SELECT * FROM hero_slides ORDER BY order_index ASC'),
      db.query('SELECT * FROM ugc_items ORDER BY order_index ASC'),
      db.supabase
        .from('featured_brands')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true })
        .order('id', { ascending: true })
        .then((r) => r)
        .catch(() => ({ data: null, error: true }))
    ]);

    const featuredPhotos = groupPhotosIntoStacks(rawPhotos).slice(0, 6);

    const featuredBrands =
      !brandResult.error && brandResult.data && brandResult.data.length > 0
        ? brandResult.data
        : DEFAULT_BRANDS;

    const viewData = {
      title: 'Taj Studio — Where Every Frame Tells a Story',
      featuredVideos,
      featuredPhotos,
      heroSlides,
      ugcItems,
      featuredBrands
    };
    homeCache = viewData;
    homeCacheAt = now;

    res.render('index', viewData);
  } catch (err) {
    console.error('Home Page Error:', err);
    res.render('index', { 
      title: 'Taj Studio — Where Every Frame Tells a Story', 
      featuredVideos: [], 
      featuredPhotos: [],
      heroSlides: [],
      ugcItems: [],
      featuredBrands: DEFAULT_BRANDS
    });
  }
};

exports.videosLanding = (req, res) => {
  res.render('videos', { title: 'Our Films — Taj Studio', navSolid: true });
};

exports.photosLanding = (req, res) => {
  res.render('photos', { title: 'Our Photography — Taj Studio', navSolid: true });
};

exports.videoCategory = async (req, res, next) => {
  const { category } = req.params;
  const validCats = ['wedding','prewedding','anniversary','engagement','birthday','indoor'];
  if (!validCats.includes(category)) return res.redirect('/videos');
  
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;
    
    const [
      [videos],
      [[{ total }]],
      [[bannerRow]]
    ] = await Promise.all([
      db.query(
        'SELECT * FROM videos WHERE category = ? ORDER BY order_index ASC, created_at DESC LIMIT ? OFFSET ?',
        [category, limit, offset]
      ),
      db.query('SELECT COUNT(*) as total FROM videos WHERE category = ?', [category]),
      db.query('SELECT setting_value FROM settings WHERE setting_key = ?', [`banner_videos_${category}`])
    ]);
    const totalPages = Math.ceil(total / limit) || 1;
    const pageBanner = bannerRow ? bannerRow.setting_value : null;
    
    res.render('category', { 
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} Films — Taj Studio`, 
      type: 'video', 
      category, 
      items: videos, 
      page, 
      totalPages,
      navSolid: true,
      pageBanner
    });
  } catch (err) {
    console.error('Video Category Error:', err);
    next(err);
  }
};

exports.photoCategory = async (req, res, next) => {
  const { category } = req.params;
  const validCats = ['wedding','prewedding','anniversary','engagement','birthday','indoor'];
  if (!validCats.includes(category)) return res.redirect('/photos');
  
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;
    
    const [
      [allCatPhotos],
      [[bannerRow]]
    ] = await Promise.all([
      db.query(
        'SELECT * FROM photos WHERE category = ? ORDER BY order_index ASC, created_at DESC',
        [category]
      ),
      db.query('SELECT setting_value FROM settings WHERE setting_key = ?', [`banner_photos_${category}`])
    ]);
    const allStacks = groupPhotosIntoStacks(allCatPhotos);
    const total = allStacks.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const photos = allStacks.slice(offset, offset + limit);
    const pageBanner = bannerRow ? bannerRow.setting_value : null;
    
    res.render('category', { 
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} Photography — Taj Studio`, 
      type: 'photo', 
      category, 
      items: photos, 
      page, 
      totalPages,
      navSolid: true,
      pageBanner
    });
  } catch (err) {
    console.error('Photo Category Error:', err);
    next(err);
  }
};

exports.contactPage = (req, res) => {
  res.render('contact', { title: 'Contact — Taj Studio', navSolid: true });
};

const { sendAppointmentEmails } = require('../utils/mailer');

exports.contactSubmit = async (req, res, next) => {
  const { name, email, phone, event_type, event_date, message } = req.body;
  try {
    await db.query(
      'INSERT INTO contacts (name, email, phone, event_type, event_date, message) VALUES (?,?,?,?,?,?)',
      [name, email, phone, event_type, event_date || null, message]
    );
    try {
      await sendAppointmentEmails({ name, email, phone, event_type, event_date, message }, res.locals.settings || {});
    } catch (mailErr) {
      console.warn('Appointment email warning:', mailErr.message);
    }
    req.flash('success', 'Message sent! We have also sent a confirmation to your email.');
    res.redirect('/contact');
  } catch (err) {
    console.error('Contact Submission Error:', err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/contact');
  }
};

exports.pricingPage = async (req, res) => {
  try {
    const { supabase } = db;
    const { data: categories } = await supabase
      .from('package_categories')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true })
      .order('id', { ascending: true });

    const { data: packages } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true })
      .order('id', { ascending: true });

    const groupedCategories = (categories || []).map(cat => ({
      ...cat,
      packages: (packages || []).filter(pkg => pkg.category_id === cat.id)
    }));

    res.render('pricing', {
      title: 'Pricing & Packages — Taj Studio',
      packageCategories: groupedCategories
    });
  } catch (err) {
    console.error('Pricing Page Error:', err);
    res.render('pricing', {
      title: 'Pricing & Packages — Taj Studio',
      packageCategories: []
    });
  }
};
