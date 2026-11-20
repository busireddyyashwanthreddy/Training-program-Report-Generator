import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const A4_PAGE_WIDTH = 540;
export const A4_PAGE_HEIGHT = 764;

const MAX_IMAGE_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB safety cap

/**
 * Sanitizes user-derived download filenames so OS/browser security filters never
 * flag or corrupt exported PDF, PNG, or CSV files.
 */
export function sanitizeDownloadFileName(
  rawName: string,
  expectedExtension: '.pdf' | '.png' | '.csv'
): string {
  const base = String(rawName || 'Magic_Bus_Export')
    .replace(/[\u0000-\u001F\u007F<>:"/\\|?*]+/g, '_')
    .replace(/\.+/g, '.')
    .replace(/^[\s._-]+|[\s._-]+$/g, '');

  const lowerExt = expectedExtension.toLowerCase();
  const withoutExt = base.toLowerCase().endsWith(lowerExt)
    ? base.slice(0, -lowerExt.length)
    : base;

  const cleanStem =
    withoutExt
      .replace(/[^a-zA-Z0-9._ -]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[_.-]+|[_.-]+$/g, '')
      .slice(0, 100) || 'Magic_Bus_Export';

  return `${cleanStem}${expectedExtension}`;
}

/**
 * Triggers a clean, cross-browser Blob download with delayed Object URL revocation
 * so large high-resolution PDF/PNG/CSV downloads never trigger data-URL blocks or abort early.
 */
export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);
}

function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to encode export image.'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Downscales large uploaded photos/scans cleanly while maintaining crisp print quality
 * so 12-day photo uploads and multi-page PDF generation stay fast and memory-safe.
 */
export function readAndOptimizeImage(file: File, maxDimension = 1600): Promise<string> {
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return Promise.reject(
      new Error('Image file is too large (maximum 25 MB). Please choose a smaller image.')
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        reject(new Error('Empty image data.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        const needsResize = width > maxDimension || height > maxDimension;
        const needsCompress = file.size > 350_000;

        if (!needsResize && !needsCompress) {
          resolve(result);
          return;
        }
        const ratio = needsResize
          ? Math.min(maxDimension / width, maxDimension / height)
          : 1;
        const targetW = Math.max(1, Math.round(width * ratio));
        const targetH = Math.max(1, Math.round(height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          releaseCanvas(canvas);
          resolve(result);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const optimized = canvas.toDataURL('image/jpeg', 0.86);
        releaseCanvas(canvas);
        resolve(optimized);
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

function attachFontMetricsFix(): HTMLStyleElement {
  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-html2canvas-metrics-fix', 'true');
  styleEl.textContent = `
    body > div[style*="visibility: hidden"] > img {
      display: inline !important;
      vertical-align: baseline !important;
    }
    body > div[style*="visibility: hidden"] > span {
      display: inline !important;
    }
  `;
  document.head.appendChild(styleEl);
  return styleEl;
}

async function capturePageCanvas(
  sourceNode: HTMLElement,
  scale: number
): Promise<HTMLCanvasElement> {
  const captureWidth = sourceNode.offsetWidth || A4_PAGE_WIDTH;
  const captureHeight = sourceNode.offsetHeight || A4_PAGE_HEIGHT;

  return html2canvas(sourceNode, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#FFFFFF',
    logging: false,
    width: captureWidth,
    height: captureHeight,
    x: 0,
    y: 0,
    scrollX: 0,
    scrollY: 0,
    windowWidth: 1440,
    windowHeight: Math.max(captureHeight + 240, 1080),
    onclone: (clonedDoc, clonedEl) => {
      const styleNodes = clonedDoc.querySelectorAll('style');
      styleNodes.forEach((node) => node.remove());

      const linkNodes = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
      linkNodes.forEach((link) => {
        const href = link.getAttribute('href') || '';
        if (!href.includes('fonts.googleapis.com')) {
          link.remove();
        }
      });

      const resetStyle = clonedDoc.createElement('style');
      resetStyle.textContent = `
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #FFFFFF; }
        img, svg { display: block; }
      `;
      clonedDoc.head.appendChild(resetStyle);

      clonedEl.style.transform = 'none';
      clonedEl.style.margin = '0';
      clonedEl.style.boxShadow = 'none';
      clonedEl.style.width = `${captureWidth}px`;
      clonedEl.style.height = `${captureHeight}px`;
      clonedEl.style.minHeight = `${captureHeight}px`;

      clonedDoc.body.innerHTML = '';
      clonedDoc.body.appendChild(clonedEl);
    },
  });
}

export async function exportCoverPageToPng(
  sourceNode: HTMLElement,
  fileName: string
): Promise<void> {
  const fixStyle = attachFontMetricsFix();
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    const canvas = await capturePageCanvas(sourceNode, 4);
    try {
      const blob = await canvasToBlob(canvas, 'image/png', 1.0);
      triggerBlobDownload(blob, sanitizeDownloadFileName(fileName, '.png'));
    } finally {
      releaseCanvas(canvas);
    }
  } finally {
    if (fixStyle.parentNode) {
      fixStyle.parentNode.removeChild(fixStyle);
    }
  }
}

export async function exportReportPagesToPdf(
  pageNodes: HTMLElement[],
  fileName: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (pageNodes.length === 0) {
    throw new Error('No report pages available to export.');
  }

  const fixStyle = attachFontMetricsFix();
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidthMm = pdf.internal.pageSize.getWidth();
    const pageHeightMm = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pageNodes.length; i += 1) {
      onProgress?.(i + 1, pageNodes.length);
      // Let the UI repaint progress text smoothly
      await new Promise((resolve) => window.setTimeout(resolve, 16));

      const canvas = await capturePageCanvas(pageNodes[i], 2.5);
      let imgData = '';
      try {
        imgData = canvas.toDataURL('image/jpeg', 0.94);
      } finally {
        releaseCanvas(canvas);
      }

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthMm, pageHeightMm, undefined, 'FAST');
    }

    const pdfBlob = pdf.output('blob');
    triggerBlobDownload(pdfBlob, sanitizeDownloadFileName(fileName, '.pdf'));
  } finally {
    if (fixStyle.parentNode) {
      fixStyle.parentNode.removeChild(fixStyle);
    }
  }
}

export const A4_LANDSCAPE_WIDTH = 960;
export const A4_LANDSCAPE_HEIGHT = 679;

export async function exportLandscapePagesToPdf(
  pageNodes: HTMLElement[],
  fileName: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (pageNodes.length === 0) {
    throw new Error('No attendance pages available to export.');
  }

  const fixStyle = attachFontMetricsFix();
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidthMm = pdf.internal.pageSize.getWidth();
    const pageHeightMm = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pageNodes.length; i += 1) {
      onProgress?.(i + 1, pageNodes.length);
      await new Promise((resolve) => window.setTimeout(resolve, 16));

      const canvas = await capturePageCanvas(pageNodes[i], 2.5);
      let imgData = '';
      try {
        imgData = canvas.toDataURL('image/png', 1.0);
      } finally {
        releaseCanvas(canvas);
      }

      if (i > 0) {
        pdf.addPage('a4', 'landscape');
      }

      pdf.addImage(imgData, 'PNG', 0, 0, pageWidthMm, pageHeightMm, undefined, 'FAST');
    }

    const pdfBlob = pdf.output('blob');
    triggerBlobDownload(pdfBlob, sanitizeDownloadFileName(fileName, '.pdf'));
  } finally {
    if (fixStyle.parentNode) {
      fixStyle.parentNode.removeChild(fixStyle);
    }
  }
}

export async function exportElementToPng(
  sourceNode: HTMLElement,
  fileName: string,
  scale = 3
): Promise<void> {
  const fixStyle = attachFontMetricsFix();
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    const canvas = await capturePageCanvas(sourceNode, scale);
    try {
      const blob = await canvasToBlob(canvas, 'image/png', 1.0);
      triggerBlobDownload(blob, sanitizeDownloadFileName(fileName, '.png'));
    } finally {
      releaseCanvas(canvas);
    }
  } finally {
    if (fixStyle.parentNode) {
      fixStyle.parentNode.removeChild(fixStyle);
    }
  }
}
