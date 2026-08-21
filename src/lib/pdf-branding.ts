import jsPDF from "jspdf";
import { format } from "date-fns";
import { DEFAULT_SETTINGS, Settings } from "@/hooks/useSettings";

const SETTINGS_KEY = "axis_lite_settings";

export function getBrandingSettings(): Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [245, 158, 11]; // default amber
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export interface HeaderOptions {
  title?: string;
  docNumber?: string;
  date?: string | Date;
  customerName?: string;
  externalNumber?: string;
  status?: string;
  paid?: boolean;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyTaxNumber?: string;
  currency?: string;
}

export interface FooterOptions {
  subtotal?: number;
  taxTotal?: number;
  discountTotal?: number;
  grandTotal?: number;
  paidAmount?: number;
  change?: number;
  notes?: string;
  currency?: string;
}

/**
 * Draws the watermark (diagonal text and/or central logo) across all pages of a jsPDF doc
 */
export function applyPdfWatermarks(pdf: jsPDF, isReceipt = false) {
  const settings = getBrandingSettings();
  const pageCount = (pdf as any).internal.getNumberOfPages();

  for (let p = 1; p <= pageCount; p++) {
    pdf.setPage(p);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // 1. Central Faint Background Logo
    if (settings.enableBackgroundLogo && settings.logoUrl) {
      try {
        const opacity = Math.min(0.2, settings.backgroundLogoOpacity || 0.08);
        if ((pdf as any).GState) {
          pdf.setGState(new (pdf as any).GState({ opacity }));
        }

        const logoSize = isReceipt ? Math.min(pageWidth * 0.7, 50) : Math.min(pageWidth * 0.5, 90);
        const x = (pageWidth - logoSize) / 2;
        const y = (pageHeight - logoSize) / 2;

        pdf.addImage(settings.logoUrl, "PNG", x, y, logoSize, logoSize, undefined, "FAST");

        if ((pdf as any).GState) {
          pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
        }
      } catch (err) {
        console.warn("Could not draw watermark logo on PDF:", err);
      }
    }

    // 2. Diagonal Text Watermark
    if (settings.enableWatermark && settings.watermarkType === "text" && settings.watermarkText) {
      try {
        const opacity = Math.min(0.4, settings.watermarkOpacity || 0.12);
        if ((pdf as any).GState) {
          pdf.setGState(new (pdf as any).GState({ opacity }));
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(isReceipt ? 26 : 56);
        pdf.setTextColor(220, 38, 38); // red

        const angle = settings.watermarkAngle ?? -30;
        const cx = pageWidth / 2;
        const cy = pageHeight / 2;

        // Draw rotated watermark text centered
        (pdf as any).text(settings.watermarkText.toUpperCase(), cx, cy, {
          align: "center",
          angle,
        });

        if ((pdf as any).GState) {
          pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
        }
      } catch (err) {
        console.warn("Could not draw text watermark on PDF:", err);
      }
    }
  }
}

/**
 * Draws the top header of an A4 / Full Page Document with Company Logo and Metadata
 */
export function drawFullPageHeader(pdf: jsPDF, options: HeaderOptions): number {
  const settings = getBrandingSettings();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const [ar, ag, ab] = hexToRgb(settings.documentAccentColor || "#f59e0b");

  let y = 14;
  const leftX = 14;
  const rightX = pageWidth - 14;

  // 1. Draw Company Logo or Styled Text Header
  const isImageLogo = settings.enableLogo && settings.logoType !== "text" && !!settings.logoUrl;
  const brandTitle = (settings.logoType === "text" && settings.logoText)
    ? settings.logoText
    : (options.companyName || settings.storeName || "AXIS POS");

  if (isImageLogo) {
    try {
      const logoWidthMm = Math.min(65, (settings.logoWidth || 120) * 0.264);
      const logoHeightMm = logoWidthMm * 0.45; // aspect estimate

      let logoX = leftX;
      if (settings.logoPosition === "center") {
        logoX = (pageWidth - logoWidthMm) / 2;
      } else if (settings.logoPosition === "right") {
        logoX = rightX - logoWidthMm;
      }

      pdf.addImage(settings.logoUrl, "PNG", logoX, y, logoWidthMm, logoHeightMm, undefined, "FAST");
      y += logoHeightMm + 3;
    } catch (e) {
      console.warn("Could not add company logo image to PDF:", e);
      pdf.setFont("helvetica", "bold").setFontSize(16).setTextColor(ar, ag, ab);
      pdf.text(brandTitle, leftX, y + 5);
      y += 8;
    }
  } else {
    // Styled Text Logo
    const fontSize = settings.logoTextFontSize ? Math.min(24, Math.max(12, settings.logoTextFontSize * 0.75)) : 16;
    pdf.setFont("helvetica", "bold").setFontSize(fontSize);
    if (settings.logoUseAccentColor !== false) {
      pdf.setTextColor(ar, ag, ab);
    } else {
      pdf.setTextColor(24, 24, 27);
    }

    let textX = leftX;
    let align: "left" | "center" | "right" = "left";
    if (settings.logoPosition === "center") {
      textX = pageWidth / 2;
      align = "center";
    } else if (settings.logoPosition === "right") {
      textX = rightX;
      align = "right";
    }

    pdf.text(brandTitle.toUpperCase(), textX, y + 5, { align });
    y += (fontSize * 0.38) + 4;

    // Subtitle / Tagline if available
    if (settings.logoSubtitle) {
      pdf.setFont("helvetica", "italic").setFontSize(8).setTextColor(120, 120, 120);
      pdf.text(settings.logoSubtitle, textX, y, { align });
      y += 4;
    }
  }

  // Company Address line
  if (options.companyAddress) {
    pdf.setFont("helvetica", "normal").setFontSize(8).setTextColor(100, 100, 100);
    pdf.text(options.companyAddress, leftX, y);
    y += 4;
  }
  if (options.companyPhone || options.companyTaxNumber) {
    pdf.setFont("helvetica", "normal").setFontSize(8).setTextColor(100, 100, 100);
    const line = [
      options.companyPhone ? `Tel: ${options.companyPhone}` : "",
      options.companyTaxNumber ? `Tax ID: ${options.companyTaxNumber}` : "",
    ]
      .filter(Boolean)
      .join(" • ");
    pdf.text(line, leftX, y);
    y += 6;
  }

  // Document Title & Number on right corner
  const titleText = (options.title || settings.invoiceTitle || "DOCUMENT").toUpperCase();
  pdf.setFont("helvetica", "bold").setFontSize(16).setTextColor(ar, ag, ab);
  pdf.text(titleText, rightX, 18, { align: "right" });

  if (options.docNumber) {
    pdf.setFont("helvetica", "bold").setFontSize(9).setTextColor(60, 60, 60);
    pdf.text(`#${options.docNumber}`, rightX, 24, { align: "right" });
  }

  if (options.date) {
    const dateStr =
      typeof options.date === "string"
        ? options.date
        : format(options.date, "dd/MM/yyyy HH:mm");
    pdf.setFont("helvetica", "normal").setFontSize(8).setTextColor(120, 120, 120);
    pdf.text(`Date: ${dateStr}`, rightX, 29, { align: "right" });
  }

  // Divider Line
  y = Math.max(y, 36);
  pdf.setDrawColor(220, 225, 230);
  pdf.setLineWidth(0.4);
  pdf.line(leftX, y, rightX, y);
  y += 6;

  // Metadata Row (Customer, Status, External Ref)
  pdf.setFont("helvetica", "normal").setFontSize(9).setTextColor(70, 70, 70);
  if (options.customerName) {
    pdf.text(`Customer / Supplier: ${options.customerName}`, leftX, y);
  }
  if (options.status) {
    pdf.text(`Status: ${options.status}`, rightX, y, { align: "right" });
  }
  y += 5;

  if (options.externalNumber) {
    pdf.text(`External Ref: ${options.externalNumber}`, leftX, y);
    y += 5;
  }

  return y + 2;
}

/**
 * Draws the footer of an A4 / Full Page Document with Totals and Terms
 */
export function drawFullPageFooter(pdf: jsPDF, startY: number, options: FooterOptions) {
  const settings = getBrandingSettings();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const leftX = 14;
  const rightX = pageWidth - 14;
  const [ar, ag, ab] = hexToRgb(settings.documentAccentColor || "#f59e0b");
  const cur = options.currency || "$";

  let ty = Math.max(startY + 6, pageHeight - 65);

  // Check if we need to draw on current page or new page
  if (ty > pageHeight - 35) {
    pdf.addPage();
    ty = 20;
  }

  // Totals Box on the Right
  const totalsX = rightX - 65;
  pdf.setFont("helvetica", "normal").setFontSize(9).setTextColor(90, 90, 90);

  if (options.subtotal != null) {
    pdf.text("Subtotal:", totalsX, ty);
    pdf.text(`${cur}${options.subtotal.toFixed(2)}`, rightX, ty, { align: "right" });
    ty += 5;
  }

  if (options.discountTotal != null && options.discountTotal > 0) {
    pdf.text("Discount:", totalsX, ty);
    pdf.text(`-${cur}${options.discountTotal.toFixed(2)}`, rightX, ty, { align: "right" });
    ty += 5;
  }

  if (options.taxTotal != null) {
    pdf.text("Tax Amount:", totalsX, ty);
    pdf.text(`${cur}${options.taxTotal.toFixed(2)}`, rightX, ty, { align: "right" });
    ty += 5;
  }

  if (options.grandTotal != null) {
    pdf.setDrawColor(ar, ag, ab);
    pdf.setLineWidth(0.5);
    pdf.line(totalsX - 4, ty, rightX, ty);
    ty += 5;

    pdf.setFont("helvetica", "bold").setFontSize(11).setTextColor(ar, ag, ab);
    pdf.text("Total:", totalsX, ty);
    pdf.text(`${cur}${options.grandTotal.toFixed(2)}`, rightX, ty, { align: "right" });
    ty += 8;
  }

  // Notes & Terms on the Left
  const notesText = options.notes || settings.invoiceNotes;
  if (notesText) {
    pdf.setFont("helvetica", "bold").setFontSize(8).setTextColor(120, 120, 120);
    pdf.text("NOTES & PAYMENT TERMS:", leftX, startY + 6);
    pdf.setFont("helvetica", "normal").setFontSize(8).setTextColor(90, 90, 90);
    const splitNotes = pdf.splitTextToSize(notesText, pageWidth * 0.5);
    pdf.text(splitNotes, leftX, startY + 11);
  }

  // Bottom Copyright / Thank You
  pdf.setFont("helvetica", "normal").setFontSize(7).setTextColor(160, 160, 160);
  pdf.text(
    `Generated on ${format(new Date(), "dd/MM/yyyy HH:mm")} • Thank you for your business!`,
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" },
  );
}

/**
 * Draws an 80mm / Thermal POS Receipt with custom company logo, header, and footer messages
 */
export function drawThermalReceiptHeader(pdf: jsPDF, options: HeaderOptions): number {
  const settings = getBrandingSettings();
  const pageWidth = pdf.internal.pageSize.getWidth(); // 80mm
  const cx = pageWidth / 2;
  let y = 6;

  // 1. Logo or Brand Text
  const isImageLogo = settings.enableLogo && settings.logoType !== "text" && !!settings.logoUrl && settings.applyDesignToReceipt;
  const brandTitle = (settings.logoType === "text" && settings.logoText)
    ? settings.logoText
    : (options.companyName || settings.storeName || "AXIS POS");

  if (isImageLogo) {
    try {
      const logoWidthMm = Math.min(35, (settings.logoWidth || 120) * 0.2);
      const logoHeightMm = logoWidthMm * 0.45;
      const lx = (pageWidth - logoWidthMm) / 2;
      pdf.addImage(settings.logoUrl, "PNG", lx, y, logoWidthMm, logoHeightMm, undefined, "FAST");
      y += logoHeightMm + 2;
    } catch (e) {
      console.warn("Thermal logo add failed:", e);
    }
  }

  // Store Name / Text Logo
  pdf.setFont("helvetica", "bold").setFontSize(10).setTextColor(0, 0, 0);
  pdf.text(brandTitle, cx, y, { align: "center" });
  y += 4;

  if (settings.logoSubtitle && (settings.logoType === "text" || !settings.logoUrl)) {
    pdf.setFont("helvetica", "italic").setFontSize(7).setTextColor(80, 80, 80);
    pdf.text(settings.logoSubtitle, cx, y, { align: "center" });
    y += 3.5;
  }

  // Store Address & Phone
  pdf.setFont("helvetica", "normal").setFontSize(7).setTextColor(70, 70, 70);
  if (options.companyAddress) {
    pdf.text(options.companyAddress, cx, y, { align: "center" });
    y += 3.5;
  }
  if (options.companyPhone || options.companyTaxNumber) {
    const sub = [options.companyPhone, options.companyTaxNumber ? `VAT: ${options.companyTaxNumber}` : ""]
      .filter(Boolean)
      .join(" • ");
    pdf.text(sub, cx, y, { align: "center" });
    y += 3.5;
  }

  // Header Greeting Message
  if (settings.receiptHeaderMessage && settings.applyDesignToReceipt) {
    pdf.setFont("helvetica", "italic").setFontSize(7).setTextColor(50, 50, 50);
    pdf.text(`"${settings.receiptHeaderMessage}"`, cx, y, { align: "center" });
    y += 4;
  }

  // Dashed Line
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineDashPattern([1, 1], 0);
  pdf.line(4, y, pageWidth - 4, y);
  pdf.setLineDashPattern([], 0); // reset
  y += 4;

  // Receipt Number & Date
  pdf.setFont("helvetica", "normal").setFontSize(7).setTextColor(0, 0, 0);
  if (options.docNumber) {
    pdf.text(`#${options.docNumber}`, 4, y);
  }
  if (options.date) {
    const dStr = typeof options.date === "string" ? options.date : format(options.date, "dd/MM/yyyy HH:mm");
    pdf.text(dStr, pageWidth - 4, y, { align: "right" });
  }
  y += 4;

  return y;
}
