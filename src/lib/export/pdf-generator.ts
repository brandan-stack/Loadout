// src/lib/export/pdf-generator.ts - PDF export utilities

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface PDFOptions {
  filename: string;
  title?: string;
  subtitle?: string;
}

/**
 * Generate PDF from HTML element
 */
export async function generatePDFFromElement(
  element: HTMLElement,
  options: PDFOptions
): Promise<void> {
  try {
    // Capture HTML as canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add title and metadata
    if (options.title) {
      pdf.setFontSize(16);
      pdf.text(options.title, 10, 10);
      position = 20;
    }

    if (options.subtitle) {
      pdf.setFontSize(11);
      pdf.setTextColor(100);
      pdf.text(options.subtitle, 10, position);
      position += 10;
    }

    // Add generated date
    pdf.setFontSize(10);
    pdf.setTextColor(150);
    pdf.text(
      `Generated: ${new Date().toLocaleString()}`,
      10,
      position
    );

    // Add image to PDF
    const imgData = canvas.toDataURL("image/png");
    let pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, "PNG", 0, position + 5, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Download PDF
    pdf.save(options.filename);
  } catch (error) {
    console.error("PDF generation error:", error);
    throw error;
  }
}

/**
 * Generate simple PDF with report data
 */
export function generateReportPDF(
  reportType: string,
  reportData: string,
  filename?: string
): Promise<void> {
  const element = document.createElement("div");
  element.innerHTML = reportData;

  return generatePDFFromElement(element, {
    filename: filename || `loadout-${reportType}-${Date.now()}.pdf`,
    title: `Loadout Report: ${reportType}`,
    subtitle: `Generated on ${new Date().toLocaleDateString()}`,
  });
}
