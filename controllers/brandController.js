const { supabase } = require('../config/db');
const { uploadFile, deleteFile } = require('../utils/storage');

exports.brandsPage = async (req, res, next) => {
  try {
    const { data: brands, error } = await supabase
      .from('featured_brands')
      .select('*')
      .order('order_index', { ascending: true })
      .order('id', { ascending: true });

    if (error) console.warn('Featured Brands fetch error:', error.message);

    res.render('admin/brands', {
      title: 'Featured Brands — Taj Studio Admin',
      brands: brands || []
    });
  } catch (err) {
    console.error('Brands Page Error:', err);
    next(err);
  }
};

exports.createBrand = async (req, res) => {
  try {
    const { name, tagline, logo_url, website_url, order_index } = req.body;
    let finalLogoUrl = (logo_url || '').trim();

    if (req.file) {
      finalLogoUrl = await uploadFile(req.file, 'brands');
    }

    if (!name || !finalLogoUrl || !website_url) {
      req.flash('error', 'Brand Name, Logo (upload or URL), and Website/Instagram Link are required.');
      return res.redirect('/admin/brands');
    }

    const { error } = await supabase.from('featured_brands').insert([{
      name: name.trim(),
      tagline: (tagline || '').trim() || null,
      logo_url: finalLogoUrl,
      website_url: website_url.trim(),
      order_index: parseInt(order_index) || 0,
      is_active: true
    }]);

    if (error) throw error;

    req.flash('success', `Brand "${name.trim()}" added successfully!`);
    res.redirect('/admin/brands');
  } catch (err) {
    console.error('Create Brand Error:', err);
    req.flash('error', 'Failed to add brand: ' + err.message);
    res.redirect('/admin/brands');
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, tagline, logo_url, website_url, order_index, is_active } = req.body;

    let finalLogoUrl = (logo_url || '').trim();
    if (req.file) {
      finalLogoUrl = await uploadFile(req.file, 'brands');
    }

    const updatePayload = {
      name: (name || '').trim(),
      tagline: (tagline || '').trim() || null,
      website_url: (website_url || '').trim(),
      order_index: parseInt(order_index) || 0,
      is_active: is_active === 'on' || is_active === 'true' || is_active === true
    };

    if (finalLogoUrl) {
      updatePayload.logo_url = finalLogoUrl;
    }

    const { error } = await supabase
      .from('featured_brands')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;

    req.flash('success', `Brand "${name.trim()}" updated successfully!`);
    res.redirect('/admin/brands');
  } catch (err) {
    console.error('Update Brand Error:', err);
    req.flash('error', 'Failed to update brand: ' + err.message);
    res.redirect('/admin/brands');
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: rows } = await supabase.from('featured_brands').select('logo_url').eq('id', id);
    if (rows && rows[0] && rows[0].logo_url) {
      await deleteFile(rows[0].logo_url);
    }

    const { error } = await supabase.from('featured_brands').delete().eq('id', id);
    if (error) throw error;

    req.flash('success', 'Brand deleted successfully.');
    res.redirect('/admin/brands');
  } catch (err) {
    console.error('Delete Brand Error:', err);
    req.flash('error', 'Failed to delete brand: ' + err.message);
    res.redirect('/admin/brands');
  }
};
