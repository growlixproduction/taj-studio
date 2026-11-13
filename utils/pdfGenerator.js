const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

function fmtInr(num) {
  return 'Rs. ' + Number(num || 0).toLocaleString('en-IN') + '/-';
}

/**
 * Generate a lightweight (~25-45 KB) A4 2-page branded vector PDF buffer using PDFKit.
 */
async function buildInvoicePdfBuffer(invoice, settings = {}) {
  const websiteUrl = 'https://tajstudio.info';
  const instagramUrl = settings.contact_instagram || 'https://instagram.com/tajstudio_official';
  const rawWa = (settings.contact_whatsapp || settings.contact_phone || '919876543210').replace(/[^0-9]/g, '');
  const waDigits = rawWa.length === 10 ? `91${rawWa}` : (rawWa || '919876543210');
  const whatsappUrl = `https://wa.me/${waDigits}`;

  const [webQrBuf, igQrBuf, waQrBuf] = await Promise.all([
    QRCode.toBuffer(websiteUrl, { type: 'png', width: 120, margin: 1, color: { dark: '#171513', light: '#ffffff' } }),
    QRCode.toBuffer(instagramUrl, { type: 'png', width: 120, margin: 1, color: { dark: '#171513', light: '#ffffff' } }),
    QRCode.toBuffer(whatsappUrl, { type: 'png', width: 120, margin: 1, color: { dark: '#171513', light: '#ffffff' } })
  ]);

  const logoPath = path.join(__dirname, '../public/images/taj-logo.png');
  const hasLogo = fs.existsSync(logoPath);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, compress: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width; // 595.28
    const H = doc.page.height; // 841.89
    const M = 34;
    const CW = W - M * 2;

    const finalAmt = Number(invoice.final_amount || 0);
    const mrpAmt = Number(invoice.mrp_total || 0);
    const discAmt = Number(invoice.discount || 0);
    const advAmt = Number(invoice.advance_paid || 0);
    const balAmt = Math.max(0, finalAmt - advAmt);
    const days = Array.isArray(invoice.day_wise_plan) ? invoice.day_wise_plan : [];
    const delivs = Array.isArray(invoice.deliverables) ? invoice.deliverables : [];
    const termsLines = (invoice.terms || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const issuedDate = invoice.created_at
      ? new Date(invoice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN');

    // ==================== PAGE 1 ====================
    // Dark Hero Header
    doc.rect(0, 0, W, 118).fill('#151413');
    doc.circle(W - 45, 22, 68).lineWidth(1.2).strokeOpacity(0.28).stroke('#e2bd73');
    doc.circle(W - 45, 22, 48).lineWidth(1).strokeOpacity(0.22).stroke('#e59368');
    doc.strokeOpacity(1);

    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(24).text((invoice.doc_type || 'QUOTATION').toUpperCase(), M, 28);
    doc.fillColor('#d7ccb8').font('Helvetica').fontSize(9.5).text('Timeless Luxury Wedding Cinema & Photography', M, 57);

    if (hasLogo) {
      try {
        doc.image(logoPath, W - M - 105, 22, { height: 32 });
      } catch (_) {}
    } else {
      doc.fillColor('#e8cb8b').font('Helvetica-Bold').fontSize(13).text('TAJ STUDIO', W - M - 100, 32, { width: 100, align: 'right' });
    }

    // Overlapping Warm Terracotta Client Banner
    doc.roundedRect(M, 86, CW, 84, 12).fill('#e28b61');
    doc.fillColor('#2b1a12').font('Helvetica-Bold').fontSize(8).text(`${(invoice.doc_type || 'Quotation').toUpperCase()} PREPARED FOR`, M + 16, 98);
    doc.fillColor('#171513').font('Helvetica-Bold').fontSize(17).text(invoice.client_name || 'Valued Client', M + 16, 110, { width: 290 });
    const contactLine = [invoice.client_phone, invoice.venue].filter(Boolean).join('  |  ');
    if (contactLine) {
      doc.font('Helvetica-Bold').fontSize(8.8).text(contactLine, M + 16, 134, { width: 290 });
    }
    if (invoice.client_email) {
      doc.font('Helvetica').fontSize(8.2).text(invoice.client_email, M + 16, 148, { width: 290 });
    }

    doc.fillColor('#171513').font('Helvetica-Bold').fontSize(8.5)
      .text(`Ref: ${invoice.quote_number}`, W - M - 195, 96, { width: 180, align: 'right' })
      .font('Helvetica').text(`Issued: ${issuedDate}`, W - M - 195, 108, { width: 180, align: 'right' });
    if (invoice.event_dates) {
      doc.font('Helvetica-Bold').text(`Event: ${invoice.event_dates}`, W - M - 195, 120, { width: 180, align: 'right' });
    }

    // Gold Total Pill
    doc.roundedRect(W - M - 160, 138, 145, 22, 11).fillAndStroke('#f5ca72', '#171513');
    doc.fillColor('#171513').font('Helvetica-Bold').fontSize(9.5).text(`Total: ${fmtInr(finalAmt)}`, W - M - 155, 144, { width: 135, align: 'center' });

    // Package Strip
    let y = 186;
    doc.roundedRect(M, y, CW, 34, 8).fillAndStroke('#faf6ee', '#e5dac7');
    doc.fillColor('#171513').font('Helvetica-Bold').fontSize(12.5).text(invoice.package_title || 'Custom Collection', M + 14, y + 10, { width: CW - 140 });
    doc.roundedRect(W - M - 115, y + 7, 102, 20, 10).fill('#171513');
    doc.fillColor('#e8cb8b').font('Helvetica-Bold').fontSize(7.5).text((invoice.event_type || 'EVENT').toUpperCase(), W - M - 112, y + 13, { width: 96, align: 'center' });

    y += 48;
    // Day-Wise Coverage
    if (days.length) {
      doc.fillColor('#171513').font('Helvetica-Bold').fontSize(13).text('Day-Wise Crew & Coverage', M, y);
      doc.fillColor('#9c7227').font('Helvetica-Bold').fontSize(8).text(`${days.length} DAY(S) PLANNED`, W - M - 120, y + 4, { width: 120, align: 'right' });
      y += 22;

      for (let i = 0; i < days.length; i++) {
        if (y > H - 180) break;
        const d = days[i];
        const servicesText = (d.services || []).map((s) => `• ${s}`).join('   ');
        const textH = doc.heightOfString(servicesText || 'Full Coverage', { width: CW - 66, fontSize: 8.5 });
        const boxH = Math.max(46, textH + 28);

        doc.roundedRect(M, y, CW, boxH, 9).fillAndStroke('#ffffff', '#e5dac7');
        doc.circle(M + 22, y + boxH / 2, 13).fill('#171513');
        doc.fillColor('#f5ca72').font('Helvetica-Bold').fontSize(9).text(String(i + 1).padStart(2, '0'), M + 9, y + boxH / 2 - 4, { width: 26, align: 'center' });

        doc.fillColor('#171513').font('Helvetica-Bold').fontSize(9.8).text(d.dayLabel || `Day ${i + 1}`, M + 46, y + 9, { width: CW - 60 });
        doc.fillColor('#4f3912').font('Helvetica').fontSize(8.3).text(servicesText || 'Custom Coverage', M + 46, y + 23, { width: CW - 60 });
        y += boxH + 8;
      }
    }

    // Taj Studio Promise Strip (fills Page 1 gracefully)
    if (y < H - 175) {
      y += 6;
      doc.fillColor('#171513').font('Helvetica-Bold').fontSize(12.5).text('The Taj Studio Promise', M, y);
      doc.fillColor('#9c7227').font('Helvetica-Bold').fontSize(7.5).text('CRAFTED FOR YOUR CELEBRATION', W - M - 160, y + 4, { width: 160, align: 'right' });
      y += 20;

      const colW = (CW - 16) / 3;
      const pillars = [
        { k: '01 • CINEMA', t: '4K Storytelling', d: 'Stabilized gimbals, wireless audio for pheras & bespoke color grading.' },
        { k: '02 • MOMENTS', t: 'Candid & Traditional', d: 'Dedicated artists capturing unscripted emotions & family rituals.' },
        { k: '03 • SAFETY', t: 'Dual-Slot Backup', d: 'Dual-card recording on-site so every memory stays 100% protected.' }
      ];
      pillars.forEach((p, idx) => {
        const px = M + idx * (colW + 8);
        doc.roundedRect(px, y, colW, 74, 8).fillAndStroke('#faf6ee', '#e5dac7');
        doc.fillColor('#9c7227').font('Helvetica-Bold').fontSize(7).text(p.k, px + 10, y + 10, { width: colW - 20 });
        doc.fillColor('#171513').font('Helvetica-Bold').fontSize(9).text(p.t, px + 10, y + 21, { width: colW - 20 });
        doc.fillColor('#5b5349').font('Helvetica').fontSize(7.5).text(p.d, px + 10, y + 35, { width: colW - 20 });
      });
      y += 86;
    }

    // Page 1 Dark Overview Strip
    if (y < H - 72) {
      doc.roundedRect(M, y, CW, 48, 9).fillAndStroke('#171513', '#c89d4c');
      const noteText = invoice.notes || 'Every wedding is a once-in-a-lifetime celebration of family bonds and traditions. Our team blends seamlessly into your festivities.';
      doc.fillColor('#f5ca72').font('Helvetica-Bold').fontSize(7.5).text(invoice.notes ? 'SPECIAL STUDIO NOTE' : 'OUR APPROACH', M + 14, y + 9);
      doc.fillColor('#dfd7ca').font('Helvetica').fontSize(7.8).text(noteText, M + 14, y + 20, { width: CW - 160, height: 24 });
      doc.fillColor('#cfc6b8').font('Helvetica').fontSize(7.5).text('Package Investment', W - M - 135, y + 11, { width: 120, align: 'right' });
      doc.fillColor('#f5ca72').font('Helvetica-Bold').fontSize(11.5).text(fmtInr(finalAmt), W - M - 135, y + 23, { width: 120, align: 'right' });
    }

    // Page 1 Footer
    doc.rect(0, H - 28, W, 28).fill('#faf7f0');
    doc.fillColor('#5b5349').font('Helvetica-Bold').fontSize(7.5).text(`Taj Studio  •  ${websiteUrl}`, M, H - 18);
    doc.text('Page 1 of 2 — Deliverables & Summary on Next Page', W - M - 230, H - 18, { width: 230, align: 'right' });

    // ==================== PAGE 2 ====================
    doc.addPage({ size: 'A4', margin: 0 });

    // Mini Header
    doc.rect(0, 0, W, 44).fill('#151413');
    doc.rect(0, 44, W, 2.5).fill('#c89d4c');
    doc.fillColor('#e8cb8b').font('Helvetica-Bold').fontSize(10.5).text('TAJ STUDIO', M, 17);
    doc.fillColor('#d7ccb8').font('Helvetica-Bold').fontSize(8.2).text(`${invoice.doc_type}: ${invoice.quote_number}  |  Client: ${invoice.client_name}`, W - M - 280, 18, { width: 280, align: 'right' });

    let y2 = 62;
    // Deliverables Table
    if (delivs.length) {
      doc.fillColor('#171513').font('Helvetica-Bold').fontSize(13).text('Curated Deliverables & Inclusions', M, y2);
      doc.fillColor('#9c7227').font('Helvetica-Bold').fontSize(8).text(`${delivs.length} ITEMS`, W - M - 80, y2 + 4, { width: 80, align: 'right' });
      y2 += 20;

      // Table Header
      doc.roundedRect(M, y2, CW, 22, 6).fill('#171513');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7.5)
        .text('#', M + 12, y2 + 7)
        .text('DELIVERABLE & DESCRIPTION', M + 42, y2 + 7)
        .text('STATUS', W - M - 65, y2 + 7, { width: 55, align: 'right' });
      y2 += 24;

      delivs.forEach((item, idx) => {
        if (y2 > H - 290) return;
        const descH = item.desc ? doc.heightOfString(item.desc, { width: CW - 130, fontSize: 7.8 }) : 0;
        const rowH = Math.max(28, descH + 20);

        if (idx % 2 === 1) {
          doc.rect(M, y2, CW, rowH).fill('#faf7f0');
        }
        doc.moveTo(M, y2 + rowH).lineTo(M + CW, y2 + rowH).lineWidth(0.5).stroke('#ece4d6');

        doc.roundedRect(M + 8, y2 + 7, 20, 16, 4).fill('#f5ca72');
        doc.fillColor('#171513').font('Helvetica-Bold').fontSize(7.5).text(String(idx + 1).padStart(2, '0'), M + 8, y2 + 11, { width: 20, align: 'center' });

        doc.fillColor('#171513').font('Helvetica-Bold').fontSize(8.8).text(item.title || '', M + 40, y2 + 6, { width: CW - 125 });
        if (item.desc) {
          doc.fillColor('#5b5349').font('Helvetica').fontSize(7.6).text(item.desc, M + 40, y2 + 18, { width: CW - 125 });
        }

        doc.roundedRect(W - M - 62, y2 + 8, 52, 15, 7).fill('#dcfce7');
        doc.fillColor('#166534').font('Helvetica-Bold').fontSize(7).text('Included', W - M - 62, y2 + 12, { width: 52, align: 'center' });

        y2 += rowH;
      });
      y2 += 14;
    }

    // 3 Color-Blocked Bottom Cards
    const cardY = Math.min(y2, H - 275);
    const cardH = 148;
    const cW1 = CW * 0.36;
    const cW2 = CW * 0.30;
    const cW3 = CW - cW1 - cW2 - 16;

    // Card 1: Terms
    doc.roundedRect(M, cardY, cW1, cardH, 10).fillAndStroke('#f7dfd2', '#e59368');
    doc.fillColor('#2b211c').font('Helvetica-Bold').fontSize(7.5).text('TERMS & CONDITIONS', M + 10, cardY + 10);
    const termsText = termsLines.slice(0, 5).map((t) => `• ${t}`).join('\n');
    doc.font('Helvetica').fontSize(7).text(termsText, M + 10, cardY + 24, { width: cW1 - 20, height: cardH - 30 });

    // Card 2: Studio Info & Signature
    const c2X = M + cW1 + 8;
    doc.roundedRect(c2X, cardY, cW2, cardH, 10).fillAndStroke('#f9e6bc', '#deb154');
    doc.fillColor('#241d11').font('Helvetica-Bold').fontSize(7.5).text('STUDIO INFO', c2X + 10, cardY + 10);
    const studioLines = [
      settings.contact_phone || '+91 98765 43210',
      settings.contact_email || 'hello@tajstudio.info',
      websiteUrl,
      settings.contact_address || 'India'
    ].join('\n');
    doc.font('Helvetica').fontSize(7.3).text(studioLines, c2X + 10, cardY + 24, { width: cW2 - 20, height: 68 });
    doc.font('Helvetica-BoldOblique').fontSize(12).text('Taj Studio', c2X + 10, cardY + cardH - 38);
    doc.roundedRect(c2X + 10, cardY + cardH - 22, 84, 13, 6).fill('#171513');
    doc.fillColor('#f5ca72').font('Helvetica-Bold').fontSize(6.2).text('AUTHORIZED STUDIO', c2X + 12, cardY + cardH - 18, { width: 80, align: 'center' });

    // Card 3: Dark Investment Summary
    const c3X = c2X + cW2 + 8;
    doc.roundedRect(c3X, cardY, cW3, cardH, 10).fillAndStroke('#171513', '#c89d4c');
    doc.fillColor('#f5ca72').font('Helvetica-Bold').fontSize(7.5).text('INVESTMENT SUMMARY', c3X + 10, cardY + 10);
    let py = cardY + 28;
    if (mrpAmt > finalAmt) {
      doc.fillColor('#d6cfc3').font('Helvetica').fontSize(7.5).text('Package Value', c3X + 10, py);
      doc.text(fmtInr(mrpAmt), c3X + 10, py, { width: cW3 - 20, align: 'right' });
      py += 16;
    }
    if (discAmt > 0) {
      doc.fillColor('#d6cfc3').font('Helvetica').fontSize(7.5).text('Discount', c3X + 10, py);
      doc.text('- ' + fmtInr(discAmt), c3X + 10, py, { width: cW3 - 20, align: 'right' });
      py += 16;
    }
    doc.moveTo(c3X + 10, py).lineTo(c3X + cW3 - 10, py).lineWidth(0.7).stroke('#c89d4c');
    py += 6;
    doc.fillColor('#f5ca72').font('Helvetica-Bold').fontSize(8.8).text('Final Amount', c3X + 10, py);
    doc.text(fmtInr(finalAmt), c3X + 10, py, { width: cW3 - 20, align: 'right' });
    py += 18;
    doc.fillColor('#d6cfc3').font('Helvetica').fontSize(7.5).text('Advance Paid', c3X + 10, py);
    doc.text(fmtInr(advAmt), c3X + 10, py, { width: cW3 - 20, align: 'right' });

    doc.fillColor('#86efac').font('Helvetica-Bold').fontSize(8.5).text('Balance Due', c3X + 10, cardY + cardH - 22);
    doc.text(fmtInr(balAmt), c3X + 10, cardY + cardH - 22, { width: cW3 - 20, align: 'right' });

    // QR Code Strip
    const qrY = cardY + cardH + 12;
    doc.roundedRect(M, qrY, CW, 78, 10).fillAndStroke('#faf6ee', '#e5dac7');
    doc.fillColor('#9c7227').font('Helvetica-Bold').fontSize(7.5).text('SCAN & CONNECT WITH US', M + 12, qrY + 12);
    doc.fillColor('#171513').font('Helvetica').fontSize(7.8).text(
      'Scan any QR code with your phone camera to visit our portfolio website, explore Instagram wedding stories, or chat directly on WhatsApp.',
      M + 12, qrY + 25, { width: CW - 235 }
    );

    const qrItems = [
      { buf: webQrBuf, label: 'Website' },
      { buf: igQrBuf, label: 'Instagram' },
      { buf: waQrBuf, label: 'WhatsApp' }
    ];
    qrItems.forEach((q, i) => {
      const qx = W - M - 204 + i * 66;
      doc.roundedRect(qx, qrY + 7, 58, 64, 6).fillAndStroke('#ffffff', '#e5dac7');
      doc.image(q.buf, qx + 7, qrY + 10, { width: 44, height: 44 });
      doc.fillColor('#171513').font('Helvetica-Bold').fontSize(6.5).text(q.label, qx, qrY + 57, { width: 58, align: 'center' });
    });

    // Page 2 Footer
    doc.rect(0, H - 28, W, 28).fill('#faf7f0');
    doc.fillColor('#5b5349').font('Helvetica-Bold').fontSize(7.5).text(`Taj Studio  •  ${invoice.quote_number}`, M, H - 18);
    doc.text('Page 2 of 2 — Thank You for Choosing Taj Studio', W - M - 230, H - 18, { width: 230, align: 'right' });

    doc.end();
  });
}

module.exports = { buildInvoicePdfBuffer };
