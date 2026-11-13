const { supabase } = require('../config/db');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

exports.adminPackagesPage = async (req, res, next) => {
  try {
    const { data: categories, error: catErr } = await supabase
      .from('package_categories')
      .select('*')
      .order('order_index', { ascending: true })
      .order('id', { ascending: true });

    const { data: packages, error: pkgErr } = await supabase
      .from('packages')
      .select('*')
      .order('order_index', { ascending: true })
      .order('id', { ascending: true });

    if (catErr) console.warn('Categories fetch error:', catErr.message);
    if (pkgErr) console.warn('Packages fetch error:', pkgErr.message);

    res.render('admin/packages', {
      title: 'Packages & Heads Manager — Taj Studio Admin',
      categories: categories || [],
      packages: packages || []
    });
  } catch (err) {
    console.error('Admin Packages Page Error:', err);
    next(err);
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, subtitle, order_index } = req.body;
    if (!name || !name.trim()) {
      req.flash('error', 'Category / Head name is required.');
      return res.redirect('/admin/packages');
    }

    const baseSlug = slugify(name) || `category-${Date.now()}`;
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    const { error } = await supabase.from('package_categories').insert([{
      name: name.trim(),
      slug: baseSlug,
      subtitle: (subtitle || '').trim() || null,
      order_index: parseInt(order_index) || 0,
      is_active: true
    }]);

    if (error) {
      // Retry with unique suffix if slug collided
      if (error.code === '23505') {
        const { error: retryErr } = await supabase.from('package_categories').insert([{
          name: name.trim(),
          slug,
          subtitle: (subtitle || '').trim() || null,
          order_index: parseInt(order_index) || 0,
          is_active: true
        }]);
        if (retryErr) throw retryErr;
      } else {
        throw error;
      }
    }

    req.flash('success', `Custom Head "${name.trim()}" created successfully!`);
    res.redirect('/admin/packages');
  } catch (err) {
    console.error('Create Category Error:', err);
    req.flash('error', 'Failed to create head: ' + err.message);
    res.redirect('/admin/packages');
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subtitle, order_index, is_active } = req.body;

    const { error } = await supabase
      .from('package_categories')
      .update({
        name: (name || '').trim(),
        subtitle: (subtitle || '').trim() || null,
        order_index: parseInt(order_index) || 0,
        is_active: is_active === 'on' || is_active === 'true' || is_active === true
      })
      .eq('id', id);

    if (error) throw error;

    req.flash('success', 'Package Head updated successfully!');
    res.redirect('/admin/packages');
  } catch (err) {
    console.error('Update Category Error:', err);
    req.flash('error', 'Failed to update head: ' + err.message);
    res.redirect('/admin/packages');
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('package_categories').delete().eq('id', id);
    if (error) throw error;

    req.flash('success', 'Package Head & its packages deleted.');
    res.redirect('/admin/packages');
  } catch (err) {
    console.error('Delete Category Error:', err);
    req.flash('error', 'Failed to delete head: ' + err.message);
    res.redirect('/admin/packages');
  }
};

exports.createPackage = async (req, res) => {
  try {
    const { category_id, name, tagline, mrp, offer_price, badge, is_featured, order_index, sections_json } = req.body;

    if (!category_id || !name || !offer_price) {
      req.flash('error', 'Head, Package Name, and Offer Price are required.');
      return res.redirect('/admin/packages');
    }

    let sections = [];
    try {
      sections = sections_json ? JSON.parse(sections_json) : [];
    } catch (e) {
      sections = [];
    }

    const { error } = await supabase.from('packages').insert([{
      category_id: parseInt(category_id),
      name: name.trim(),
      tagline: (tagline || '').trim() || null,
      mrp: (mrp || '').trim() || null,
      offer_price: offer_price.trim(),
      badge: (badge || '').trim() || null,
      is_featured: is_featured === 'on' || is_featured === 'true' || is_featured === true,
      order_index: parseInt(order_index) || 0,
      is_active: true,
      sections
    }]);

    if (error) throw error;

    req.flash('success', `Package "${name.trim()}" added successfully!`);
    res.redirect('/admin/packages');
  } catch (err) {
    console.error('Create Package Error:', err);
    req.flash('error', 'Failed to create package: ' + err.message);
    res.redirect('/admin/packages');
  }
};

exports.updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, tagline, mrp, offer_price, badge, is_featured, is_active, order_index, sections_json } = req.body;

    let sections = [];
    try {
      sections = sections_json ? JSON.parse(sections_json) : [];
    } catch (e) {
      sections = [];
    }

    const { error } = await supabase
      .from('packages')
      .update({
        category_id: parseInt(category_id),
        name: (name || '').trim(),
        tagline: (tagline || '').trim() || null,
        mrp: (mrp || '').trim() || null,
        offer_price: (offer_price || '').trim(),
        badge: (badge || '').trim() || null,
        is_featured: is_featured === 'on' || is_featured === 'true' || is_featured === true,
        is_active: is_active === 'on' || is_active === 'true' || is_active === true,
        order_index: parseInt(order_index) || 0,
        sections
      })
      .eq('id', id);

    if (error) throw error;

    req.flash('success', `Package "${name.trim()}" updated successfully!`);
    res.redirect('/admin/packages');
  } catch (err) {
    console.error('Update Package Error:', err);
    req.flash('error', 'Failed to update package: ' + err.message);
    res.redirect('/admin/packages');
  }
};

exports.deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('packages').delete().eq('id', id);
    if (error) throw error;

    req.flash('success', 'Package deleted successfully.');
    res.redirect('/admin/packages');
  } catch (err) {
    console.error('Delete Package Error:', err);
    req.flash('error', 'Failed to delete package: ' + err.message);
    res.redirect('/admin/packages');
  }
};
