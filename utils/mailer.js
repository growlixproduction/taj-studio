const nodemailer = require('nodemailer');

function getSender(settings = {}) {
  return {
    name: process.env.BREVO_SENDER_NAME || 'Taj Studio',
    email: process.env.BREVO_SENDER_EMAIL || 'growlixproduction@gmail.com',
    replyTo: settings.contact_email || process.env.BREVO_SENDER_EMAIL || 'growlixproduction@gmail.com'
  };
}

/**
 * Send email via Brevo REST API (primary, fast on serverless) with Nodemailer SMTP fallback.
 */
async function sendBrevoEmail({ to, toName, subject, html, replyTo, attachments = [] }) {
  if (!to || !String(to).includes('@')) return { skipped: true };

  const sender = getSender();
  const apiKey = process.env.BREVO_API_KEY;

  // 1. Primary: Brevo HTTPS REST API
  if (apiKey) {
    try {
      const body = {
        sender: { name: sender.name, email: sender.email },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent: html
      };
      if (replyTo || sender.replyTo) {
        body.replyTo = { email: replyTo || sender.replyTo, name: sender.name };
      }
      if (attachments.length) {
        body.attachment = attachments.map((a) => ({
          name: a.filename,
          content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content
        }));
      }

      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const json = await resp.json().catch(() => ({}));
      if (resp.ok) {
        return { ok: true, via: 'brevo-api', messageId: json.messageId };
      }
      console.warn('Brevo API warning:', resp.status, json);
    } catch (apiErr) {
      console.warn('Brevo API exception:', apiErr.message);
    }
  }

  // 2. Fallback: Brevo SMTP via Nodemailer
  const smtpUser = process.env.BREVO_SMTP_USER;
  const smtpPass = process.env.BREVO_SMTP_PASS;
  if (smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
      port: Number(process.env.BREVO_SMTP_PORT || 587),
      secure: false,
      auth: { user: smtpUser, pass: smtpPass }
    });

    const info = await transporter.sendMail({
      from: `"${sender.name}" <${sender.email}>`,
      to: toName ? `"${toName}" <${to}>` : to,
      replyTo: replyTo || sender.replyTo,
      subject,
      html,
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: a.content
      }))
    });
    return { ok: true, via: 'brevo-smtp', messageId: info.messageId };
  }

  return { skipped: true, reason: 'No Brevo credentials configured' };
}

/**
 * Send branded Quotation / Invoice email with PDF attachment + direct links.
 */
async function sendInvoiceEmail(invoice, pdfBuffer, settings = {}) {
  if (!invoice || !invoice.client_email || !invoice.client_email.includes('@')) {
    return { skipped: true };
  }

  const websiteUrl = 'https://tajstudio.info';
  const webLink = `${websiteUrl}/quote/${invoice.quote_number}`;
  const pdfLink = `${websiteUrl}/quote/${invoice.quote_number}/pdf`;
  const finalAmt = Number(invoice.final_amount || 0).toLocaleString('en-IN');
  const studioPhone = settings.contact_phone || '+91 7828950968';

  const html = `
  <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f5f0e8;padding:28px 14px;color:#171513;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4dac9;">
      <div style="background:#151413;padding:24px 28px;border-bottom:3px solid #c89d4c;">
        <div style="font-size:12px;letter-spacing:2px;color:#e8cb8b;font-weight:700;text-transform:uppercase;">TAJ STUDIO</div>
        <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;">Your Customized ${invoice.doc_type} (${invoice.quote_number})</h1>
      </div>
      <div style="padding:26px 28px;line-height:1.6;font-size:15px;">
        <p style="margin-top:0;">Namaste <strong>${invoice.client_name}</strong> ji,</p>
        <p>Thank you for connecting with <strong>Taj Studio</strong>! Please find attached your customized <strong>${invoice.doc_type} PDF</strong> for your upcoming celebration.</p>

        <div style="background:#faf6ee;border:1px solid #e5dac7;border-radius:10px;padding:16px 18px;margin:18px 0;">
          <div style="font-size:13px;color:#6b6258;">Package</div>
          <div style="font-size:16px;font-weight:700;margin-bottom:8px;">${invoice.package_title || 'Custom Collection'}</div>
          <div style="font-size:14px;"><strong>Event:</strong> ${invoice.event_type}${invoice.event_dates ? ' (' + invoice.event_dates + ')' : ''}</div>
          ${invoice.venue ? `<div style="font-size:14px;"><strong>Venue:</strong> ${invoice.venue}</div>` : ''}
          <div style="font-size:16px;margin-top:8px;color:#9c7227;"><strong>Final Package Investment: ₹${finalAmt}/-</strong></div>
        </div>

        <div style="margin:22px 0;text-align:center;">
          <a href="${pdfLink}" style="display:inline-block;background:#c89d4c;color:#111111;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;margin:4px;">Download PDF File</a>
          <a href="${webLink}" style="display:inline-block;background:#171513;color:#f5ca72;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;margin:4px;">View Interactive Quote</a>
        </div>

        <p style="font-size:13px;color:#5b5349;margin-bottom:0;">
          For any customization or date confirmation, reply to this email or call/WhatsApp us at <strong>${studioPhone}</strong>.<br><br>
          Warm regards,<br><strong>Team Taj Studio</strong><br>
          <a href="${websiteUrl}" style="color:#9c7227;">${websiteUrl}</a>
        </p>
      </div>
    </div>
  </div>`;

  const attachments = pdfBuffer
    ? [{ filename: `${invoice.quote_number}.pdf`, content: pdfBuffer }]
    : [];

  return await sendBrevoEmail({
    to: invoice.client_email,
    toName: invoice.client_name,
    subject: `Taj Studio — ${invoice.doc_type} ${invoice.quote_number} for ${invoice.client_name}`,
    html,
    replyTo: settings.contact_email,
    attachments
  });
}

/**
 * Send confirmation email to client + notification email to studio on /contact appointment booking.
 */
async function sendAppointmentEmails(contact, settings = {}) {
  const studioPhone = settings.contact_phone || '+91 7828950968';
  const studioEmail = settings.contact_email || process.env.BREVO_SENDER_EMAIL || 'growlixproduction@gmail.com';
  const websiteUrl = 'https://tajstudio.info';

  const tasks = [];

  if (contact.email && String(contact.email).includes('@')) {
    const clientHtml = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f5f0e8;padding:28px 14px;color:#171513;">
      <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4dac9;">
        <div style="background:#151413;padding:22px 26px;border-bottom:3px solid #c89d4c;">
          <div style="font-size:12px;letter-spacing:2px;color:#e8cb8b;font-weight:700;">TAJ STUDIO</div>
          <h1 style="margin:6px 0 0;color:#ffffff;font-size:21px;">Appointment / Inquiry Received</h1>
        </div>
        <div style="padding:24px 26px;line-height:1.6;font-size:15px;">
          <p style="margin-top:0;">Namaste <strong>${contact.name}</strong> ji,</p>
          <p>Thank you for booking an inquiry / session with <strong>Taj Studio</strong>! We have received your details and our creative team will reach out to you shortly.</p>
          <div style="background:#faf6ee;border:1px solid #e5dac7;border-radius:10px;padding:14px 16px;margin:16px 0;font-size:14px;">
            <div><strong>Event Type:</strong> ${contact.event_type || 'Photography / Cinema'}</div>
            <div><strong>Preferred Date:</strong> ${contact.event_date || 'To be discussed'}</div>
            <div><strong>Phone:</strong> ${contact.phone || '-'}</div>
            ${contact.message ? `<div style="margin-top:6px;"><strong>Message:</strong> ${contact.message}</div>` : ''}
          </div>
          <p style="font-size:13px;color:#5b5349;margin-bottom:0;">
            Need urgent assistance? Call or WhatsApp us at <strong>${studioPhone}</strong>.<br><br>
            Warm regards,<br><strong>Team Taj Studio</strong><br>
            <a href="${websiteUrl}" style="color:#9c7227;">${websiteUrl}</a>
          </p>
        </div>
      </div>
    </div>`;

    tasks.push(
      sendBrevoEmail({
        to: contact.email,
        toName: contact.name,
        subject: 'Taj Studio — We Received Your Appointment Request!',
        html: clientHtml,
        replyTo: studioEmail
      })
    );
  }

  if (studioEmail && String(studioEmail).includes('@')) {
    const adminHtml = `
    <div style="font-family:Arial,sans-serif;padding:18px;background:#faf6ee;color:#171513;">
      <h2 style="margin-top:0;color:#151413;">New Appointment / Contact Inquiry</h2>
      <p><strong>Name:</strong> ${contact.name}</p>
      <p><strong>Phone:</strong> ${contact.phone}</p>
      <p><strong>Email:</strong> ${contact.email}</p>
      <p><strong>Event Type:</strong> ${contact.event_type || '-'}</p>
      <p><strong>Preferred Date:</strong> ${contact.event_date || '-'}</p>
      <p><strong>Message:</strong> ${contact.message || '-'}</p>
      <p><a href="${websiteUrl}/admin/messages">Open Admin Messages</a></p>
    </div>`;

    tasks.push(
      sendBrevoEmail({
        to: studioEmail,
        toName: 'Taj Studio Admin',
        subject: `New Appointment Inquiry: ${contact.name} (${contact.event_type || 'Event'})`,
        html: adminHtml,
        replyTo: contact.email || studioEmail
      })
    );
  }

  return Promise.allSettled(tasks);
}

module.exports = {
  sendBrevoEmail,
  sendInvoiceEmail,
  sendAppointmentEmails
};
