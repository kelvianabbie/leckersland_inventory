const express = require('express');
const PDFDocument = require('pdfkit');
const { Sale, SaleItem, Product, Customer } = require('../models');

const router = express.Router();

const drawTableHeader = (doc, y) => {
  doc
    .font('Helvetica-Bold')
    .fontSize(11);

  doc.moveTo(50, y - 10).lineTo(550, y - 10).stroke();

  doc
    .text('Product', 50, y)
    .text('Qty', 300, y)
    .text('Unit Price', 350, y)
    .text('Line Total', 450, y);

  doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();

  return y + 25;
};

router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        {
          model: SaleItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${sale.id}.pdf`
    );

    doc.pipe(res);

    const leftX = 50;
    const rightX = 320;
    const contentWidth = 250;

    let currentY = 50;

    /* =========================
      HEADER
    ========================= */

    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('LECKERSLAND', leftX, currentY);

    currentY += 25;

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(
        '45953 Warm Springs Blvd, Fremont, CA 94539',
        leftX,
        currentY,
        { width: contentWidth }
      );

    currentY += doc.heightOfString(
      '45953 Warm Springs Blvd, Fremont, CA 94539',
      { width: contentWidth }
    );

    doc.text('Email: info@leckersland.com', leftX, currentY, {
      width: contentWidth
    });

    currentY += 40;

    /* =========================
      CUSTOMER
    ========================= */

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Bill To:', leftX, currentY);

    currentY += 18;

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(sale.customer?.name || 'N/A', leftX, currentY, {
        width: contentWidth
      });

    currentY += doc.heightOfString(sale.customer?.name || 'N/A', {
      width: contentWidth
    });

    doc.text(`Contact: ${sale.customer?.contactInfo || 'N/A'}`, leftX, currentY, {
      width: contentWidth
    });

    currentY += doc.heightOfString(
      `Contact: ${sale.customer?.contactInfo || 'N/A'}`,
      { width: contentWidth }
    );

    doc.text(`Address: ${sale.customer?.address || 'N/A'}`, leftX, currentY, {
      width: contentWidth
    });

    currentY += doc.heightOfString(
      `Address: ${sale.customer?.address || 'N/A'}`,
      { width: contentWidth }
    );

    /* =========================
      RIGHT SIDE (DATE)
    ========================= */

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(
        `Invoice Date: ${new Date(sale.saleDate).toLocaleDateString()}`,
        rightX,
        currentY - 60,
        { width: 200, align: 'right' }
      );

    /* =========================
      TABLE START POSITION
    ========================= */

    const tableTop = currentY + 40;

    let y = drawTableHeader(doc, tableTop);

    /* =========================
      TABLE BODY
    ========================= */

    const PAGE_BOTTOM = 750;
    let subtotal = 0;

    doc.font('Helvetica').fontSize(10);

    sale.items.forEach((item) => {
      // 🚨 PAGE BREAK CHECK
      if (y > PAGE_BOTTOM) {
        doc.addPage();
        y = 50;

        // redraw table header on new page
        y = drawTableHeader(doc, y);
      }

      const name = item.product?.name || 'Unknown';
      const qty = item.quantity;
      const price = parseFloat(item.unitPrice);
      const lineTotal = qty * price;

      subtotal += lineTotal;

      doc
        .text(name, 50, y, { width: 230 })
        .text(qty.toString(), 300, y)
        .text(`$${price.toFixed(2)}`, 350, y)
        .text(`$${lineTotal.toFixed(2)}`, 450, y);

      const rowHeight = doc.heightOfString(name, { width: 230 });
      y += Math.max(rowHeight, 20);
    });

    /* =========================
      TOTALS
    ========================= */

    if (y > PAGE_BOTTOM - 100) {
      doc.addPage();
      y = 50;
    }

    doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();

    doc
      .fontSize(11)
      .text(`Subtotal: $${subtotal.toFixed(2)}`, 350, y + 20);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(`TOTAL: $${subtotal.toFixed(2)}`, 350, y + 40);

    /* =========================
      SIGNATURE SECTION
    ========================= */

    const signatureX = 420;
    const signatureY = y + 110;

    // NAME (TOP)
    doc
      .font('Helvetica')
      .fontSize(11)
      .text(sale.customer?.name || 'Customer', signatureX, signatureY);

    // BLANK SPACE (signature area)
    const gapHeight = 80;

    // DATE (BOTTOM)
    doc
      .font('Helvetica')
      .fontSize(11)
      .text(
        new Date(sale.saleDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric'}),
        signatureX,
        signatureY + gapHeight
      );

    /* ========================= */

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

module.exports = router;