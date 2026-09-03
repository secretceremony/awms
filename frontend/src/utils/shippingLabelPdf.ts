import html2pdf from 'html2pdf.js';
import type { ShippingLabel } from '../components/delivery/ShippingLabelFormModal.js';

/**
 * Sanitizes string for filename.
 */
function sanitizeFilename(str: string): string {
  return str
    .trim()
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_');
}

/**
 * Generates clean filename for a single shipping label with timestamp.
 * Example: "Shipping_Label_DO_001_ALS-BPN_2026-09-04_1045.pdf"
 */
export function generateShippingLabelFilename(label: ShippingLabel): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ts = `${yyyy}-${mm}-${dd}_${hh}${min}`;

  if (label.doNumber && label.doNumber.trim()) {
    return `Shipping_Label_DO_${sanitizeFilename(label.doNumber)}_${ts}.pdf`;
  }
  const name = sanitizeFilename(label.recipientName || 'Client');
  return `Shipping_Label_${name}_${ts}.pdf`;
}

/**
 * Generates clean filename for batch shipping labels.
 */
export function generateMultiShippingLabelsFilename(count: number): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `Shipping_Labels_${yyyy}-${mm}-${dd}_${hh}${min}_${count}-labels.pdf`;
}

/**
 * Waits for all <img> elements inside a container to finish loading or fail safely.
 */
export async function waitForImagesToLoad(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  const promises = images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  });
  await Promise.all(promises);
}

/**
 * Exports a single or batch shipping labels element into high-resolution PDF.
 */
export async function downloadShippingLabelPdf(
  element: HTMLElement,
  filename: string,
  size: 'A6' | 'A5' = 'A6'
): Promise<void> {
  await waitForImagesToLoad(element);

  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const formatDimensions = size === 'A5' ? [210, 148] : [148, 105];

  const opt = {
    margin: [0, 0, 0, 0] as [number, number, number, number],
    filename: safeName,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
    },
    jsPDF: {
      unit: 'mm',
      format: formatDimensions as [number, number],
      orientation: 'landscape' as const,
      compressPDF: true,
    },
    pagebreak: {
      mode: ['css', 'legacy'],
      after: '.shipping-label-container',
    },
  };

  await html2pdf().set(opt).from(element).save();
}
