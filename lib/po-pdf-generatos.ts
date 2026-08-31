// lib/po-pdf-generator.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportPOToPDF(po: any) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const primaryGreen: [number, number, number] = [77, 124, 15]; // #4D7C0F

  // 1. Company Brand Header (Top Left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(po.companyName || "PT PERDANA CIPTA KREASINDO", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Alamat : The Icon Ritzone N7 No 36", 14, 21);
  doc.text("Kota     : Tangerang Selatan", 14, 25.5);
  doc.text("Telpon : +6281295006061", 14, 30);
  doc.text("Email   : ptperdanaciptakreasindo@gmail.com", 14, 34.5);

  // 2. Purchase Order Title & Number (Top Right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...primaryGreen);
  doc.text("PURCHASE ORDER", 196, 16, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("DATE :", 145, 23);
  doc.text("PO      :", 145, 28);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(
    new Date(po.date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    160,
    23,
  );
  doc.setFont("helvetica", "bold");
  doc.text(po.poNumber, 160, 28);

  // 3. Vendor & Ship To Banners
  // Vendor Box
  doc.setFillColor(...primaryGreen);
  doc.rect(14, 40, 85, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("VENDOR", 16, 44.5);

  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 46, 85, 18);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(po.vendorName || "-", 16, 51);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(po.vendorAddress || "", 16, 56);

  // Ship To Box
  doc.setFillColor(...primaryGreen);
  doc.rect(111, 40, 85, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("SHIP TO", 113, 44.5);

  doc.setDrawColor(226, 232, 240);
  doc.rect(111, 46, 85, 18);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const shipLines = doc.splitTextToSize(po.shipToAddress || "-", 80);
  doc.text(shipLines, 113, 51);
  if (po.shipToContact) doc.text(`PIC: ${po.shipToContact}`, 113, 58);
  if (po.shipToPhone) doc.text(`Telp: ${po.shipToPhone}`, 113, 62);

  // 4. Items Table
  const tableData = (po.items || []).map((item: any, idx: number) => [
    idx + 1,
    item.description,
    item.quantity > 0 ? item.quantity : "-",
    item.unitPrice > 0
      ? new Intl.NumberFormat("id-ID").format(item.unitPrice)
      : "-",
    item.totalPrice > 0
      ? new Intl.NumberFormat("id-ID").format(item.totalPrice)
      : "-",
  ]);

  autoTable(doc, {
    startY: 68,
    head: [["No.", "DESCRIPTION", "QTY", "UNIT PRICE (Rp)", "TOTAL (Rp)"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: primaryGreen,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 85 },
      2: { halign: "center", cellWidth: 18 },
      3: { halign: "right", cellWidth: 34 },
      4: { halign: "right", cellWidth: 35, fontStyle: "bold" },
    },
    styles: {
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 4;

  // 5. Notes & Adjustments / Total Grid
  // Notes Left Box
  doc.setFillColor(241, 245, 249);
  doc.rect(14, finalY, 95, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("Note :", 16, finalY + 3.8);

  doc.setDrawColor(226, 232, 240);
  doc.rect(14, finalY + 5, 95, 25);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  if (po.notes) {
    const noteLines = doc.splitTextToSize(po.notes, 90);
    doc.text(noteLines, 16, finalY + 10);
  }

  // Subtotal & Adjustments Right Table
  let currentRightY = finalY;

  // Subtotal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("SUBTOTAL", 120, currentRightY + 4);
  doc.text(
    new Intl.NumberFormat("id-ID").format(po.subtotal || 0),
    196,
    currentRightY + 4,
    {
      align: "right",
    },
  );
  currentRightY += 6;

  // Adjustments
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  (po.adjustments || []).forEach((adj: any) => {
    if (adj.label) {
      doc.text(adj.label, 120, currentRightY + 4);
      doc.text(
        new Intl.NumberFormat("id-ID").format(adj.amount || 0),
        196,
        currentRightY + 4,
        {
          align: "right",
        },
      );
      currentRightY += 5;
    }
  });

  // Grand Total Box
  doc.setFillColor(219, 234, 254);
  doc.rect(115, currentRightY + 2, 81, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text("TOTAL", 120, currentRightY + 6.8);
  doc.text(
    `Rp ${new Intl.NumberFormat("id-ID").format(po.totalAmount || 0)}`,
    194,
    currentRightY + 6.8,
    { align: "right" },
  );

  // 6. Signatures (PT Left, Vendor Right)
  const signY = currentRightY + 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("RICHARD EDWIN GIOVANI", 40, signY, { align: "center" });
  doc.text(
    (po.vendorSignerName || po.vendorName || "").toUpperCase(),
    155,
    signY,
    {
      align: "center",
    },
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("(Richard Edwin Giovani)", 40, signY + 16, { align: "center" });
  doc.text(
    po.vendorSignerName
      ? `(${po.vendorSignerName})`
      : "(..................................)",
    155,
    signY + 16,
    { align: "center" },
  );

  const safeFilename = po.poNumber.replace(/[/\\?%*:|"<>]/g, "_");
  doc.save(`${safeFilename}.pdf`);
}
