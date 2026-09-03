import html2pdf from 'html2pdf.js';

/**
 * Sanitizes DO number into a safe filename.
 * Example: "001/ALS-BPN/DO-PHM/IX/2026" -> "DO_001_ALS-BPN_DO-PHM_IX_2026.pdf"
 */
export function generateDoPdfFilename(doNumber?: string, id?: number | string): string {
  if (doNumber && doNumber.trim() && doNumber !== 'DRAFT') {
    const sanitized = doNumber
      .trim()
      .replace(/[/\\:*?"<>|]/g, '_')
      .replace(/\s+/g, '_');
    return `DO_${sanitized}.pdf`;
  }
  return `DO_Draft_${id || 'document'}.pdf`;
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
      img.onerror = () => resolve(); // continue even if image fails
    });
  });
  await Promise.all(promises);
}

/**
 * Exports the given container element to an A4 Landscape PDF.
 */
export async function downloadDeliveryOrderPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  await waitForImagesToLoad(element);

  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  const opt = {
    margin: [8, 10, 8, 10] as [number, number, number, number], // mm: top, right, bottom, left
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
      format: 'a4',
      orientation: 'landscape' as const,
      compressPDF: true,
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      avoid: ['tr', '.avoid-break', '.print-do-page > div'],
    },
  };

  await html2pdf().set(opt).from(element).save();
}
