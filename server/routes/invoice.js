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

    const ITEMS_PER_PAGE = 11;
    const itemChunks = [];

    for (let i = 0; i < sale.items.length; i += ITEMS_PER_PAGE) {
      itemChunks.push(sale.items.slice(i, i + ITEMS_PER_PAGE));
    }

    const totalPages = itemChunks.length;
    let subtotal = 0;

    itemChunks.forEach((items, pageIndex) => {
      if (pageIndex > 0) {
        doc.addPage();
      }

      let currentY = 50;

      /* =========================
        HEADER (repeat every page)
      ========================= */

      doc.font('Helvetica-Bold').fontSize(20).text('LECKERSLAND', leftX, currentY);

      currentY += 25;

      doc.font('Helvetica').fontSize(10)
        .text('45953 Warm Springs Blvd, Fremont, CA 94539', leftX, currentY, { width: contentWidth });

      currentY += doc.heightOfString('45953 Warm Springs Blvd, Fremont, CA 94539', { width: contentWidth });

      doc.text('Email: info@leckersland.com', leftX, currentY, { width: contentWidth });

      currentY += 40;

      /* =========================
        CUSTOMER
      ========================= */

      doc.font('Helvetica-Bold').fontSize(12).text('Bill To:', leftX, currentY);
      currentY += 18;

      doc.font('Helvetica').fontSize(10)
        .text(sale.customer?.name || 'N/A', leftX, currentY, { width: contentWidth });

      currentY += doc.heightOfString(sale.customer?.name || 'N/A', { width: contentWidth });

      doc.text(`Contact: ${sale.customer?.contactInfo || 'N/A'}`, leftX, currentY, { width: contentWidth });

      currentY += doc.heightOfString(`Contact: ${sale.customer?.contactInfo || 'N/A'}`, { width: contentWidth });

      doc.text(`Address: ${sale.customer?.address || 'N/A'}`, leftX, currentY, { width: contentWidth });

      currentY += doc.heightOfString(`Address: ${sale.customer?.address || 'N/A'}`, { width: contentWidth });

      /* =========================
        RIGHT SIDE
      ========================= */

      const rightTopY = currentY - 60;

      doc.font('Helvetica').fontSize(10)
        .text(`Ref: ${sale.ref || '-'}`, rightX, rightTopY, { width: 200, align: 'right' });

      doc.text(`Invoice Date: ${new Date(sale.sale_date || sale.saleDate).toLocaleDateString()}`, rightX, rightTopY + 15, { width: 200, align: 'right' });

      /* =========================
        TABLE
      ========================= */

      let y = drawTableHeader(doc, currentY + 40);

      doc.font('Helvetica').fontSize(10);

      items.forEach((item) => {
        const name = item.product?.name || 'Unknown';
        const qty = item.quantity;
        const price = parseFloat(item.unit_price || item.unitPrice || 0);
        const lineTotal = qty * price;

        subtotal += lineTotal;

        doc.text(name, 50, y, { width: 230 });
        doc.text(qty.toString(), 300, y);
        doc.text(`$${price.toFixed(2)}`, 350, y);
        doc.text(`$${lineTotal.toFixed(2)}`, 450, y);

        y += 20;
      });

      /* =========================
        PAGE NUMBER
      ========================= */

      doc.fontSize(9).text(
        `Page: ${pageIndex + 1} of ${totalPages}`,
        450,
        780,
        { align: 'right' }
      );

      /* =========================
        ONLY LAST PAGE → TOTALS + TERMS
      ========================= */

      if (pageIndex === totalPages - 1) {
        const credit = parseFloat(sale.creditMemo || 0);
        const total = subtotal - credit;

        y += 20;

        doc.moveTo(50, y).lineTo(550, y).stroke();

        doc.fontSize(11).text(`Subtotal: $${subtotal.toFixed(2)}`, 350, y + 10);
        doc.text(`Credit: $${credit.toFixed(2)}`, 350, y + 25);

        doc.fontSize(14).font('Helvetica-Bold')
          .text(`TOTAL: $${total.toFixed(2)}`, 350, y + 45);

        let sectionY = y + 90;

        doc.font('Helvetica').fontSize(10)
          .text('Warehouse Verification (Signature): ________________________', 50, sectionY)
          .text('Date: ___________________', 350, sectionY);

        sectionY += 30;

        const termsText = `The pricing information contained in this invoice reflects the goods and/or services provided...`;

        doc.font('Helvetica').fontSize(9)
          .text(termsText, 50, sectionY, { width: 500, align: 'justify' });

        sectionY += doc.heightOfString(termsText, { width: 500 }) + 30;

        doc.font('Helvetica').fontSize(10)
          .text('Customer Signature: ____________________________________', 50, sectionY)
          .text('Date: ___________________', 350, sectionY);
      }
    });

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

module.exports = router;