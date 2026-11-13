const { supabase } = require('../config/db');
const QRCode = require('qrcode');
const { uploadNamedBuffer, deleteFile, getR2Object } = require('../utils/storage');
const { buildInvoicePdfBuffer } = require('../utils/pdfGenerator');
const { sendInvoiceEmail } = require('../utils/mailer');

const DEFAULT_TERMS = [
  '50% advance payment is required to block the event dates.',
  '25% payment on the first day of the event; remaining 25% at final deliverable handover.',
  'Raw footage/photos are shared only if included in the agreed deliverables.',
  'Outstation travel, lodging, and food for the crew will be borne by the client.',
  'Edited photos & cinematic films will be delivered within 45–60 working days after event completion.'
].join('\n');

function generateQuoteNumber() {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `TS-${ym}-${rand}`;
}

function safeParseJson(val, fallback) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

exports.adminInvoicesPage = async (req, res) => {
  try {
    const [catRes, pkgRes, invRes] = await Promise.all([
      supabase.from('package_categories').select('*').order('display_order', { ascending: true }),
      supabase.from('packages').select('*').order('display_order', { ascending: true }),
      supabase.from('invoices').select('*').order('created_at', { ascending: false })
    ]);

    const schemaMissing =
      invRes.error &&
      (invRes.error.code === '42P01' ||
        invRes.error.code === 'PGRST205' ||
        (invRes.error.message || '').toLowerCase().includes('invoices'));

    if (invRes.error && !schemaMissing) {
      console.error('Invoices fetch error:', invRes.error);
    }

    const categories = catRes.data || [];
    const packages = pkgRes.data || [];
    const invoices = invRes.data || [];

    const editId = req.query.edit ? Number(req.query.edit) : null;
    const editingInvoice = editId ? invoices.find((i) => Number(i.id) === editId) || null : null;

    res.render('admin/invoices', {
      title: 'Custom Quote & Invoice Generator — Taj Studio Admin',
      categories,
      packages,
      invoices,
      editingInvoice,
      schemaMissing,
      defaultTerms: DEFAULT_TERMS,
      createdQuote: req.query.created || null,
      updatedQuote: req.query.updated || null,
      errorMsg: req.query.error || null
    });
  } catch (err) {
    console.error('adminInvoicesPage error:', err);
    res.status(500).send('Failed to load invoice generator');
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const quoteNumber = generateQuoteNumber();
    const dayWisePlan = safeParseJson(req.body.day_wise_json, []);
    const deliverables = safeParseJson(req.body.deliverables_json, []);

    const mrpTotal = Math.max(0, Number(req.body.mrp_total) || 0);
    const discount = Math.max(0, Number(req.body.discount) || 0);
    const finalAmount = Math.max(0, Number(req.body.final_amount) || Math.max(0, mrpTotal - discount));
    const advancePaid = Math.max(0, Number(req.body.advance_paid) || 0);

    const payload = {
      quote_number: quoteNumber,
      doc_type: req.body.doc_type === 'Invoice' ? 'Invoice' : 'Quotation',
      client_name: (req.body.client_name || '').trim() || 'Valued Client',
      client_phone: (req.body.client_phone || '').trim(),
      client_email: (req.body.client_email || '').trim(),
      event_type: (req.body.event_type || '').trim() || 'Wedding',
      event_dates: (req.body.event_dates || '').trim(),
      venue: (req.body.venue || '').trim(),
      package_title: (req.body.package_title || '').trim() || 'Custom Wedding Collection',
      day_wise_plan: dayWisePlan,
      deliverables,
      mrp_total: mrpTotal,
      discount,
      final_amount: finalAmount,
      advance_paid: advancePaid,
      notes: (req.body.notes || '').trim(),
      terms: (req.body.terms || '').trim() || DEFAULT_TERMS
    };

    const { error } = await supabase.from('invoices').insert([payload]);
    if (error) {
      console.error('Create invoice error:', error);
      return res.redirect('/admin/invoices?error=' + encodeURIComponent(error.message || 'Could not save invoice'));
    }

    // Generate lightweight vector PDF (~25-40 KB), store on R2, and email client if email provided
    try {
      const fullInv = { ...payload, created_at: new Date().toISOString() };
      const pdfBuf = await buildInvoicePdfBuffer(fullInv, res.locals.settings || {});
      await uploadNamedBuffer(`invoices/${quoteNumber}.pdf`, pdfBuf, 'application/pdf');
      if (payload.client_email) {
        await sendInvoiceEmail(fullInv, pdfBuf, res.locals.settings || {});
      }
    } catch (pdfErr) {
      console.warn('PDF generation/R2/Email warning:', pdfErr.message);
    }

    res.redirect(`/admin/invoices?created=${encodeURIComponent(quoteNumber)}`);
  } catch (err) {
    console.error('createInvoice error:', err);
    res.redirect('/admin/invoices?error=' + encodeURIComponent('Server error while saving invoice'));
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const dayWisePlan = safeParseJson(req.body.day_wise_json, []);
    const deliverables = safeParseJson(req.body.deliverables_json, []);

    const mrpTotal = Math.max(0, Number(req.body.mrp_total) || 0);
    const discount = Math.max(0, Number(req.body.discount) || 0);
    const finalAmount = Math.max(0, Number(req.body.final_amount) || Math.max(0, mrpTotal - discount));
    const advancePaid = Math.max(0, Number(req.body.advance_paid) || 0);

    const payload = {
      doc_type: req.body.doc_type === 'Invoice' ? 'Invoice' : 'Quotation',
      client_name: (req.body.client_name || '').trim() || 'Valued Client',
      client_phone: (req.body.client_phone || '').trim(),
      client_email: (req.body.client_email || '').trim(),
      event_type: (req.body.event_type || '').trim() || 'Wedding',
      event_dates: (req.body.event_dates || '').trim(),
      venue: (req.body.venue || '').trim(),
      package_title: (req.body.package_title || '').trim() || 'Custom Wedding Collection',
      day_wise_plan: dayWisePlan,
      deliverables,
      mrp_total: mrpTotal,
      discount,
      final_amount: finalAmount,
      advance_paid: advancePaid,
      notes: (req.body.notes || '').trim(),
      terms: (req.body.terms || '').trim() || DEFAULT_TERMS
    };

    const { data, error } = await supabase
      .from('invoices')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Update invoice error:', error);
      return res.redirect('/admin/invoices?error=' + encodeURIComponent(error.message || 'Could not update invoice'));
    }

    const qn = (data && data.quote_number) || '';
    if (qn) {
      try {
        const pdfBuf = await buildInvoicePdfBuffer(data, res.locals.settings || {});
        await uploadNamedBuffer(`invoices/${qn}.pdf`, pdfBuf, 'application/pdf');
      } catch (pdfErr) {
        console.warn('PDF update/R2 upload warning:', pdfErr.message);
      }
    }

    res.redirect(`/admin/invoices?updated=${encodeURIComponent(qn)}`);
  } catch (err) {
    console.error('updateInvoice error:', err);
    res.redirect('/admin/invoices?error=' + encodeURIComponent('Server error while updating invoice'));
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { data: existing } = await supabase.from('invoices').select('quote_number').eq('id', id).single();
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) {
      console.error('Delete invoice error:', error);
      return res.redirect('/admin/invoices?error=' + encodeURIComponent(error.message || 'Could not delete invoice'));
    }
    if (existing && existing.quote_number) {
      await deleteFile(`/media/invoices/${existing.quote_number}.pdf`);
    }
    res.redirect('/admin/invoices');
  } catch (err) {
    console.error('deleteInvoice error:', err);
    res.redirect('/admin/invoices?error=' + encodeURIComponent('Server error while deleting invoice'));
  }
};

exports.downloadPdfFile = async (req, res) => {
  try {
    const quoteNumber = (req.params.quoteNumber || '').trim();
    const key = `invoices/${quoteNumber}.pdf`;

    // 1. Serve cached lightweight PDF directly from Cloudflare R2 if available
    try {
      const r2Obj = await getR2Object(key);
      if (r2Obj && r2Obj.Body) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${quoteNumber}.pdf"`);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return r2Obj.Body.pipe(res);
      }
    } catch (_) {
      // Not yet in R2 — generate on the fly below
    }

    // 2. Fallback: fetch invoice from Supabase, build PDF, upload to R2, and serve
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('quote_number', quoteNumber)
      .single();

    if (error || !invoice) {
      return res.status(404).send('PDF not found');
    }

    const pdfBuf = await buildInvoicePdfBuffer(invoice, res.locals.settings || {});
    uploadNamedBuffer(key, pdfBuf, 'application/pdf').catch(() => {});

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${quoteNumber}.pdf"`);
    res.send(pdfBuf);
  } catch (err) {
    console.error('downloadPdfFile error:', err);
    res.status(500).send('Unable to generate PDF');
  }
};

exports.emailInvoice = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { data: invoice, error } = await supabase.from('invoices').select('*').eq('id', id).single();
    if (error || !invoice) {
      return res.redirect('/admin/invoices?error=' + encodeURIComponent('Invoice not found'));
    }
    if (!invoice.client_email || !invoice.client_email.includes('@')) {
      return res.redirect('/admin/invoices?error=' + encodeURIComponent('No valid client email on this quote'));
    }
    const pdfBuf = await buildInvoicePdfBuffer(invoice, res.locals.settings || {});
    await sendInvoiceEmail(invoice, pdfBuf, res.locals.settings || {});
    res.redirect(`/admin/invoices?updated=${encodeURIComponent(invoice.quote_number)}`);
  } catch (err) {
    console.error('emailInvoice error:', err);
    res.redirect('/admin/invoices?error=' + encodeURIComponent('Failed to send email'));
  }
};

exports.viewPublicQuote = async (req, res) => {
  try {
    const quoteNumber = (req.params.quoteNumber || '').trim();
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('quote_number', quoteNumber)
      .single();

    if (error || !invoice) {
      return res.status(404).render('404', { title: 'Quote Not Found — Taj Studio' });
    }

    const settings = res.locals.settings || {};
    const websiteUrl = 'https://tajstudio.info';
    const instagramUrl = settings.contact_instagram || 'https://instagram.com/tajstudio_official';
    const rawWa = (settings.contact_whatsapp || settings.contact_phone || '919876543210').replace(/[^0-9]/g, '');
    const waDigits = rawWa.length === 10 ? `91${rawWa}` : rawWa || '919876543210';
    const whatsappUrl = `https://wa.me/${waDigits}`;

    const [websiteQr, instagramQr, whatsappQr] = await Promise.all([
      QRCode.toString(websiteUrl, { type: 'svg', margin: 1, width: 100, color: { dark: '#1a1816', light: '#ffffff' } }),
      QRCode.toString(instagramUrl, { type: 'svg', margin: 1, width: 100, color: { dark: '#1a1816', light: '#ffffff' } }),
      QRCode.toString(whatsappUrl, { type: 'svg', margin: 1, width: 100, color: { dark: '#1a1816', light: '#ffffff' } })
    ]);

    res.render('quote-pdf', {
      title: `${invoice.doc_type} ${invoice.quote_number} — Taj Studio`,
      invoice,
      websiteUrl,
      instagramUrl,
      whatsappUrl,
      websiteQr,
      instagramQr,
      whatsappQr
    });
  } catch (err) {
    console.error('viewPublicQuote error:', err);
    res.status(500).send('Unable to render quote');
  }
};
