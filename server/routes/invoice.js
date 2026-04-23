const express = require('express');
const PDFDocument = require('pdfkit');
const { Sale, SaleItem, Product, Customer } = require('../models');
const path = require('path');

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

    const fontRegular = path.join(__dirname, '../fonts/NotoSans-Regular.ttf');
    const fontBold = path.join(__dirname, '../fonts/NotoSans-Bold.ttf');
    const fontCJK = path.join(__dirname, '../fonts/NotoSansCJKsc-Regular.otf');
    const logoPath = path.join(__dirname, '../assets/leckersland_logo.png');

    doc.registerFont('Custom', fontRegular);
    doc.registerFont('Custom-Bold', fontBold);
    doc.registerFont('CJK', fontCJK);

    // default font
    doc.font('Helvetica');

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

    doc.image(logoPath, leftX, currentY, {
      width: 140, // adjust based on visual balance
    });

    currentY += 50;

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

    const rightTopY = currentY - 60;

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(
        `Ref: ${sale.ref || '-'}`,
        rightX,
        rightTopY,
        { width: 200, align: 'right' }
      );

    doc
      .text(
        `Invoice Date: ${new Date(sale.saleDate).toLocaleDateString()}`,
        rightX,
        rightTopY + 15,
        { width: 200, align: 'right' }
      );

    /* =========================
      TABLE START POSITION
    ========================= */

    const tableTop = currentY + 25;

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
      const isCJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(name);

      subtotal += lineTotal;

      doc
        .font(isCJK ? 'CJK' : 'Custom')
        .text(name, 50, y, { width: 230 });

      doc
        .font('Custom')
        .text(qty.toString(), 300, y)
        .text(`$${price.toFixed(2)}`, 350, y)
        .text(`$${lineTotal.toFixed(2)}`, 450, y);

      doc.font(isCJK ? 'CJK' : 'Custom');
      const rowHeight = doc.heightOfString(name, { width: 230 });
      doc.font('Helvetica');
      y += Math.max(rowHeight, 20);
    });

    /* =========================
      TOTALS
    ========================= */

    const credit = parseFloat(sale.creditMemo || 0);
    const total = subtotal - credit;

    if (y > PAGE_BOTTOM - 100) {
      doc.addPage();
      y = 50;
    }

    doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Subtotal: $${subtotal.toFixed(2)}`, 350, y + 20);

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Credit: $${credit.toFixed(2)}`, 350, y + 35); //350 align with subtotal, 361 align with $

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(`TOTAL: $${total.toFixed(2)}`, 350, y + 55);

    /* =========================
      TERMS + SIGNATURE SECTION
    ========================= */

    let sectionY = y + 90;

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(
        'Warehouse Verification (Signature): ________________________',
        50,
        sectionY
      )
      .text(
        'Date: ___________________',
        350,
        sectionY
      );

    sectionY += 30;

    const termsText = `The pricing information contained in this invoice reflects the goods and/or services provided. An electronic invoice may be issued to the customer or the party responsible for payment. Unless otherwise stated in a separate customer agreement, all amounts are due upon receipt.

    The customer is responsible for inspecting the order upon delivery or receipt, including verifying quantities, condition, markings, and labels, where applicable. Claims for discrepancies, shortages, or damaged goods must be made at the time of delivery or receipt. Signature below confirms that the goods and/or services listed above were received in apparent good order.`;

    doc
      .font('Helvetica')
      .fontSize(9)
      .text(termsText, 50, sectionY, {
        width: 500,
        align: 'justify'
      });

    sectionY += doc.heightOfString(termsText, { width: 500 }) + 30;

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(
        'Customer Signature: ____________________________________',
        50,
        sectionY
      )
      .text(
        'Date: ___________________',
        350,
        sectionY
      );

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

module.exports = router;