import html2canvas from 'html2canvas';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { readAndOptimizeImage } from './exportPdf';

export const DOCUMENT_ACCEPT_TYPES =
  '.png,.jpg,.jpeg,.webp,.gif,.bmp,.pdf,.doc,.docx,image/png,image/jpeg,image/webp,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const MAX_DOCUMENT_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB safety limit

const ALLOWED_DOC_TAGS = new Set([
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'UL',
  'OL',
  'LI',
  'TABLE',
  'THEAD',
  'TBODY',
  'TFOOT',
  'TR',
  'TH',
  'TD',
  'SPAN',
  'DIV',
  'BLOCKQUOTE',
  'SUB',
  'SUP',
  'IMG',
]);

/**
 * Sanitizes HTML extracted from uploaded Word (.docx) files via a strict DOM
 * allowlist before rendering offscreen, preventing script/XSS execution.
 */
function sanitizeDocumentHtml(rawHtml: string): string {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(rawHtml, 'text/html');

  const sanitizeNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const el = node as Element;
    const tag = el.tagName.toUpperCase();

    if (
      tag === 'SCRIPT' ||
      tag === 'STYLE' ||
      tag === 'IFRAME' ||
      tag === 'OBJECT' ||
      tag === 'EMBED' ||
      tag === 'FORM' ||
      tag === 'LINK' ||
      tag === 'META' ||
      tag === 'SVG'
    ) {
      return null;
    }

    const safeTag = ALLOWED_DOC_TAGS.has(tag) ? tag.toLowerCase() : 'span';
    const cleanEl = document.createElement(safeTag);

    if (safeTag === 'img') {
      const src = (el.getAttribute('src') || '').trim();
      // Only allow safe embedded raster data URLs from mammoth (never javascript: or svg)
      if (
        /^data:image\/(png|jpeg|jpg|webp|gif|bmp);base64,[a-zA-Z0-9+/=\s]+$/i.test(
          src
        )
      ) {
        cleanEl.setAttribute('src', src);
        cleanEl.setAttribute('alt', (el.getAttribute('alt') || '').slice(0, 120));
      } else {
        return null;
      }
    } else if (safeTag === 'td' || safeTag === 'th') {
      const colspan = Number(el.getAttribute('colspan'));
      const rowspan = Number(el.getAttribute('rowspan'));
      if (Number.isInteger(colspan) && colspan > 1 && colspan <= 20) {
        cleanEl.setAttribute('colspan', String(colspan));
      }
      if (Number.isInteger(rowspan) && rowspan > 1 && rowspan <= 50) {
        cleanEl.setAttribute('rowspan', String(rowspan));
      }
    }

    el.childNodes.forEach((child) => {
      const cleanChild = sanitizeNode(child);
      if (cleanChild) {
        cleanEl.appendChild(cleanChild);
      }
    });

    return cleanEl;
  };

  const container = document.createElement('div');
  parsed.body.childNodes.forEach((child) => {
    const cleanChild = sanitizeNode(child);
    if (cleanChild) {
      container.appendChild(cleanChild);
    }
  });
  return container.innerHTML;
}

/**
 * Rotates an image data URL by +90 or -90 degrees on an offscreen canvas so
 * the pixel dimensions actually swap and the rotated document fills the A4 page cleanly.
 */
export function rotateImageDataUrl(
  dataUrl: string,
  deltaDegrees: 90 | -90
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const srcW = img.naturalWidth || img.width;
      const srcH = img.naturalHeight || img.height;
      if (!srcW || !srcH) {
        reject(new Error('Invalid image dimensions for rotation.'));
        return;
      }

      // Swapped dimensions for 90° / -90° rotation
      const canvas = document.createElement('canvas');
      canvas.width = srcH;
      canvas.height = srcW;

      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable.'));
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((deltaDegrees * Math.PI) / 180);
        ctx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH);

        const keepPng =
          dataUrl.startsWith('data:image/png') && srcW * srcH <= 2_500_000;
        resolve(
          keepPng
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', 0.92)
        );
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for rotation.'));
    img.src = dataUrl;
  });
}

function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Fallback text extractor for legacy binary .doc files when mammoth cannot parse them as .docx.
 */
function extractLegacyDocText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  let current = '';

  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i];
    if (b === 10 || b === 13 || b === 9 || (b >= 32 && b <= 126)) {
      current += String.fromCharCode(b);
    } else {
      if (current.trim().length >= 8) {
        chunks.push(current.trim());
      }
      current = '';
    }
  }
  if (current.trim().length >= 8) {
    chunks.push(current.trim());
  }

  // Filter out common OLE/Word binary metadata noise
  const cleaned = chunks
    .filter((line) => {
      const alphaCount = (line.match(/[A-Za-z]/g) || []).length;
      if (alphaCount < 5) return false;
      if (/^(Root Entry|WordDocument|1Table|0Table|CompObj|SummaryInformation|DocumentSummaryInformation|Microsoft Word)/i.test(line)) {
        return false;
      }
      return true;
    })
    .slice(0, 80);

  return cleaned.join('\n\n');
}

async function renderPdfToDataUrl(file: File, maxDimension: number): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  try {
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const longestSide = Math.max(baseViewport.width, baseViewport.height, 1);
    const scale = Math.min(3, Math.max(1.5, maxDimension / longestSide));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Unable to initialize canvas for PDF rendering.');
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvas,
        canvasContext: ctx,
        viewport,
      }).promise;

      return canvas.toDataURL('image/jpeg', 0.92);
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await loadingTask.destroy();
  }
}

async function renderHtmlToPageImage(
  htmlContent: string,
  maxDimension: number
): Promise<string> {
  const safeHtml = sanitizeDocumentHtml(htmlContent);
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-14000px';
  host.style.top = '0';
  host.style.width = '794px';
  host.style.minHeight = '1123px';
  host.style.backgroundColor = '#FFFFFF';
  host.style.color = '#111827';
  host.style.padding = '52px 56px';
  host.style.boxSizing = 'border-box';
  host.style.fontFamily = '"Source Sans 3", "Segoe UI", Arial, sans-serif';
  host.style.fontSize = '15px';
  host.style.lineHeight = '1.58';
  host.style.overflow = 'hidden';

  const styleBlock = `
    <style>
      .mb-word-render * { box-sizing: border-box; }
      .mb-word-render h1 { font-size: 24px; font-weight: 700; margin: 0 0 12px; color: #0A254E; }
      .mb-word-render h2 { font-size: 20px; font-weight: 700; margin: 14px 0 10px; color: #0A254E; }
      .mb-word-render h3 { font-size: 17px; font-weight: 700; margin: 12px 0 8px; color: #1E293B; }
      .mb-word-render p { margin: 0 0 10px; }
      .mb-word-render ul, .mb-word-render ol { margin: 0 0 12px; padding-left: 24px; }
      .mb-word-render li { margin-bottom: 5px; }
      .mb-word-render table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13.5px; }
      .mb-word-render th, .mb-word-render td { border: 1px solid #94A3B8; padding: 6px 8px; text-align: left; vertical-align: top; }
      .mb-word-render th { background: #F1F5F9; font-weight: 700; }
      .mb-word-render img { max-width: 100%; height: auto; margin: 8px 0; display: block; }
    </style>
  `;

  host.innerHTML = `${styleBlock}<div class="mb-word-render">${safeHtml}</div>`;
  document.body.appendChild(host);

  try {
    // Wait briefly for any embedded images in the Word document to decode
    const imgs = Array.from(host.querySelectorAll('img'));
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.onload = () => res();
              img.onerror = () => res();
            })
      )
    );

    const captureHeight = Math.min(Math.max(host.scrollHeight, 1123), 1600);
    const canvas = await html2canvas(host, {
      scale: 2,
      backgroundColor: '#FFFFFF',
      width: 794,
      height: captureHeight,
      windowWidth: 960,
      windowHeight: captureHeight + 120,
      logging: false,
      onclone: (clonedDoc, clonedEl) => {
        // Strip host Tailwind stylesheets so html2canvas never chokes on oklab/oklch
        clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
          if (!clonedEl.contains(node)) {
            node.remove();
          }
        });
        clonedEl.style.left = '0';
        clonedEl.style.position = 'static';
        clonedDoc.body.innerHTML = '';
        clonedDoc.body.style.margin = '0';
        clonedDoc.body.style.background = '#FFFFFF';
        clonedDoc.body.appendChild(clonedEl);
      },
    });

    try {
      const longestSide = Math.max(canvas.width, canvas.height);
      if (longestSide <= maxDimension) {
        return canvas.toDataURL('image/jpeg', 0.92);
      }

      const ratio = maxDimension / longestSide;
      const scaled = document.createElement('canvas');
      scaled.width = Math.max(1, Math.round(canvas.width * ratio));
      scaled.height = Math.max(1, Math.round(canvas.height * ratio));
      try {
        const ctx = scaled.getContext('2d');
        if (!ctx) {
          return canvas.toDataURL('image/jpeg', 0.92);
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, scaled.width, scaled.height);
        ctx.drawImage(canvas, 0, 0, scaled.width, scaled.height);
        return scaled.toDataURL('image/jpeg', 0.92);
      } finally {
        scaled.width = 0;
        scaled.height = 0;
      }
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}

async function renderWordToDataUrl(file: File, maxDimension: number): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  let html = '';

  try {
    const mammothModule = await import('mammoth/mammoth.browser');
    const mammoth = mammothModule.default || (mammothModule as unknown as typeof mammothModule.default);
    const result = await mammoth.convertToHtml({ arrayBuffer });
    html = (result.value || '').trim();
  } catch {
    // Fallback for legacy binary .doc files
    const extracted = extractLegacyDocText(arrayBuffer);
    if (extracted.trim().length > 0) {
      html = extracted
        .split(/\n{2,}/)
        .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br/>')}</p>`)
        .join('');
    } else {
      throw new Error(
        'Could not read this legacy .doc file. Please save it as .docx, PDF, or an image (PNG/JPG) and upload again.'
      );
    }
  }

  if (!html) {
    html = `<p><strong>${escapeHtml(file.name)}</strong></p><p>(Document appears to be empty.)</p>`;
  }

  return renderHtmlToPageImage(html, maxDimension);
}

/**
 * Accepts PNG, JPG, JPEG, general raster images, PDF, and Word (.docx / .doc) files
 * and converts them into a crisp A4-ready image data URL for live preview and PDF export.
 */
export async function processDocumentUpload(
  file: File,
  maxDimension = 1800
): Promise<string> {
  if (!file || file.size === 0) {
    throw new Error('The selected file is empty. Please choose a valid file.');
  }
  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    throw new Error(
      'File size exceeds the 25 MB safety limit. Please compress or resize the file and try again.'
    );
  }

  const ext = getFileExtension(file.name);
  const mime = (file.type || '').toLowerCase();

  if (mime === 'image/svg+xml' || ext === 'svg') {
    throw new Error(
      'SVG files are not supported for security reasons. Please upload PNG, JPG, PDF, or Word (.docx) files.'
    );
  }

  if (mime === 'application/pdf' || ext === 'pdf') {
    return renderPdfToDataUrl(file, maxDimension);
  }

  if (
    ext === 'docx' ||
    ext === 'doc' ||
    mime === 'application/msword' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return renderWordToDataUrl(file, maxDimension);
  }

  if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif'].includes(ext)
  ) {
    return readAndOptimizeImage(file, maxDimension);
  }

  throw new Error(
    'Unsupported file format. Please upload PNG, JPG, JPEG, PDF, or Word (.doc, .docx) files.'
  );
}
