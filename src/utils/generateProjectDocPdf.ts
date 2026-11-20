import { jsPDF } from 'jspdf';

const NAVY_DARK: [number, number, number] = [7, 39, 84];      // #072754
const NAVY_MID: [number, number, number] = [12, 54, 111];     // #0C366F
const NAVY_TEXT: [number, number, number] = [10, 37, 78];     // #0A254E
const GOLD: [number, number, number] = [252, 209, 22];        // #FCD116
const GOLD_DARK: [number, number, number] = [180, 128, 0];    // #B48000
const SLATE_TEXT: [number, number, number] = [51, 65, 85];    // #334155
const MUTED_TEXT: [number, number, number] = [100, 116, 139]; // #64748B
const BORDER_LIGHT: [number, number, number] = [214, 224, 238];
const SURFACE_SOFT: [number, number, number] = [244, 248, 253];
const WHITE: [number, number, number] = [255, 255, 255];
const GREEN_ACCENT: [number, number, number] = [21, 128, 61]; // #15803D

const PAGE_W = 210; // A4 mm
const PAGE_H = 297; // A4 mm
const MARGIN_X = 16;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const TOTAL_PAGES = 8;

export const PROJECT_DOC_FILENAME =
  'Magic_Bus_Training_Report_Generator_Project_Documentation.pdf';

function setFill(doc: jsPDF, rgb: [number, number, number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setDraw(doc: jsPDF, rgb: [number, number, number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function setText(doc: jsPDF, rgb: [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function drawPageChrome(
  doc: jsPDF,
  pageNumber: number,
  sectionLabel: string,
  pageTitle: string
): number {
  // Top navy header band
  setFill(doc, NAVY_DARK);
  doc.rect(0, 0, PAGE_W, 20, 'F');
  // Gold accent strip below header
  setFill(doc, GOLD);
  doc.rect(0, 20, PAGE_W, 1.4, 'F');

  // Header left branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(doc, GOLD);
  doc.text('MAGIC BUS INDIA FOUNDATION', MARGIN_X, 9.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  setText(doc, [214, 230, 255]);
  doc.text('Training Program Report Generator  |  Project Documentation', MARGIN_X, 14.8);

  // Header right section badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  setText(doc, WHITE);
  doc.text(sectionLabel.toUpperCase(), PAGE_W - MARGIN_X, 12.2, { align: 'right' });

  // Page heading
  let y = 31;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16.5);
  setText(doc, NAVY_TEXT);
  doc.text(pageTitle, MARGIN_X, y);

  y += 3.2;
  setDraw(doc, GOLD);
  doc.setLineWidth(1.1);
  doc.line(MARGIN_X, y, MARGIN_X + 26, y);
  setDraw(doc, BORDER_LIGHT);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X + 27, y, PAGE_W - MARGIN_X, y);

  // Footer
  setDraw(doc, BORDER_LIGHT);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, PAGE_H - 14, PAGE_W - MARGIN_X, PAGE_H - 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, MUTED_TEXT);
  doc.text(
    'Magic Bus India Foundation  •  Empowering Youth For Building a Better Tomorrow  •  magicbus.org',
    MARGIN_X,
    PAGE_H - 9
  );
  doc.setFont('helvetica', 'bold');
  setText(doc, NAVY_TEXT);
  doc.text(`Page ${pageNumber} of ${TOTAL_PAGES}`, PAGE_W - MARGIN_X, PAGE_H - 9, {
    align: 'right',
  });

  return y + 7;
}

function drawSectionHeading(doc: jsPDF, title: string, y: number): number {
  setFill(doc, NAVY_MID);
  doc.rect(MARGIN_X, y - 3.6, 2.2, 4.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  setText(doc, NAVY_TEXT);
  doc.text(title, MARGIN_X + 4.8, y);
  return y + 5.2;
}

function drawParagraph(
  doc: jsPDF,
  text: string,
  y: number,
  fontSize = 9.4,
  lineHeight = 4.6
): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  setText(doc, SLATE_TEXT);
  const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
  doc.text(lines, MARGIN_X, y);
  return y + lines.length * lineHeight;
}

function drawBulletList(
  doc: jsPDF,
  items: Array<{ lead: string; body: string }>,
  y: number,
  options?: { x?: number; width?: number; fontSize?: number; gap?: number }
): number {
  const x = options?.x ?? MARGIN_X;
  const width = options?.width ?? CONTENT_W;
  const fontSize = options?.fontSize ?? 9.1;
  const gap = options?.gap ?? 2.3;
  const lineH = fontSize * 0.48;
  let cursor = y;

  for (const item of items) {
    // Gold bullet dot
    setFill(doc, GOLD_DARK);
    doc.circle(x + 1.8, cursor - 1.1, 0.9, 'F');

    const separator = item.lead.trim().endsWith('?') ? ' ' : ': ';
    const prefix = `${item.lead}${separator}`;
    const fullText = `${prefix}${item.body}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    const prefixW = doc.getTextWidth(prefix);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    const wrapped = doc.splitTextToSize(fullText, width - 6.5) as string[];

    if (wrapped.length > 0) {
      const firstLine = wrapped[0];
      if (firstLine.startsWith(prefix) && prefixW < width - 16) {
        doc.setFont('helvetica', 'bold');
        setText(doc, NAVY_TEXT);
        doc.text(prefix.trimEnd(), x + 5.2, cursor);
        doc.setFont('helvetica', 'normal');
        setText(doc, SLATE_TEXT);
        const remainder = firstLine.slice(prefix.length).trimStart();
        doc.text(remainder, x + 5.2 + prefixW + 0.9, cursor);
      } else {
        doc.setFont('helvetica', 'bold');
        setText(doc, NAVY_TEXT);
        doc.text(firstLine, x + 5.2, cursor);
      }
      doc.setFont('helvetica', 'normal');
      setText(doc, SLATE_TEXT);
      for (let i = 1; i < wrapped.length; i += 1) {
        cursor += lineH;
        doc.text(wrapped[i], x + 5.2, cursor);
      }
    }
    cursor += lineH + gap;
  }

  return cursor;
}

function drawInfoCardsGrid(
  doc: jsPDF,
  cards: Array<{ title: string; body: string; accent?: string }>,
  y: number,
  cols = 2,
  cardH = 26
): number {
  const gapX = 5;
  const gapY = 4.5;
  const cardW = (CONTENT_W - gapX * (cols - 1)) / cols;
  let cursorY = y;

  cards.forEach((card, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = MARGIN_X + col * (cardW + gapX);
    const cy = y + row * (cardH + gapY);

    setFill(doc, SURFACE_SOFT);
    setDraw(doc, BORDER_LIGHT);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, cy, cardW, cardH, 2, 2, 'FD');

    // Left accent stripe
    setFill(doc, NAVY_MID);
    doc.rect(x, cy + 2, 1.8, cardH - 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.0);
    setText(doc, NAVY_TEXT);
    doc.text(card.title, x + 4.8, cy + 6.8);

    if (card.accent) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      setText(doc, GREEN_ACCENT);
      doc.text(card.accent, x + cardW - 3.2, cy + 6.8, { align: 'right' });
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    setText(doc, SLATE_TEXT);
    const lines = doc.splitTextToSize(card.body, cardW - 8) as string[];
    doc.text(lines.slice(0, 4), x + 4.8, cy + 12.2);

    cursorY = Math.max(cursorY, cy + cardH);
  });

  return cursorY + 5;
}

function drawTable(
  doc: jsPDF,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  y: number
): number {
  let cursorY = y;
  const padX = 2.6;
  const headerH = 8;

  // Header bar
  setFill(doc, NAVY_DARK);
  doc.rect(MARGIN_X, cursorY, CONTENT_W, headerH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  setText(doc, WHITE);

  let cx = MARGIN_X;
  headers.forEach((header, idx) => {
    doc.text(header, cx + padX, cursorY + 5.3);
    cx += colWidths[idx];
  });
  cursorY += headerH;

  // Rows
  rows.forEach((row, rIdx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    const cellLines = row.map((cell, cIdx) =>
      doc.splitTextToSize(cell, colWidths[cIdx] - padX * 2) as string[]
    );
    const maxLines = Math.max(...cellLines.map((l) => l.length), 1);
    const rowH = Math.max(7.2, maxLines * 4.0 + 3.2);

    setFill(doc, rIdx % 2 === 0 ? WHITE : SURFACE_SOFT);
    setDraw(doc, BORDER_LIGHT);
    doc.setLineWidth(0.25);
    doc.rect(MARGIN_X, cursorY, CONTENT_W, rowH, 'FD');

    let rx = MARGIN_X;
    cellLines.forEach((lines, cIdx) => {
      if (cIdx === 0) {
        doc.setFont('helvetica', 'bold');
        setText(doc, NAVY_TEXT);
      } else {
        doc.setFont('helvetica', 'normal');
        setText(doc, SLATE_TEXT);
      }
      doc.text(lines, rx + padX, cursorY + 4.8);
      rx += colWidths[cIdx];
    });
    cursorY += rowH;
  });

  return cursorY + 5;
}

export function buildProjectDocumentationPdf(): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // =========================================================================
  // PAGE 1: EXECUTIVE COVER PAGE
  // =========================================================================
  setFill(doc, NAVY_DARK);
  doc.rect(0, 0, PAGE_W, 134, 'F');

  // Subtle geometric accent block top-right
  setFill(doc, NAVY_MID);
  doc.rect(PAGE_W - 62, 0, 62, 134, 'F');
  setFill(doc, GOLD);
  doc.rect(0, 134, PAGE_W, 3.2, 'F');

  // Top label bar
  setFill(doc, GOLD);
  doc.rect(MARGIN_X, 22, 2.2, 16, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setText(doc, GOLD);
  doc.text('MAGIC BUS INDIA FOUNDATION', MARGIN_X + 6, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  setText(doc, [220, 233, 250]);
  doc.text('Infosys Project (CWW-AI)  &  FedEx Cyber Security Project', MARGIN_X + 6, 35);

  // Main Cover Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  setText(doc, WHITE);
  doc.text('Training Program', MARGIN_X, 60);
  setText(doc, GOLD);
  doc.text('Report Generator', MARGIN_X, 72);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  setText(doc, [226, 236, 248]);
  const coverSub = doc.splitTextToSize(
    'Complete Project Documentation, Platform Feature Showcase, Technical Architecture & Live Presentation Guide',
    CONTENT_W - 8
  ) as string[];
  doc.text(coverSub, MARGIN_X, 86);

  // Key Highlight Strip on Dark Navy
  const coverPillars = [
    { num: '12-Days', label: 'AI & Life Skills PDF Reports' },
    { num: 'Cyber Sec', label: 'FedEx Report & Roster' },
    { num: '18–19 / Pg', label: 'Auto-Paginated Attendance' },
    { num: 'Cloud Sync', label: 'Per-User Secure Storage' },
  ];
  const pW = (CONTENT_W - 9) / 4;
  coverPillars.forEach((p, i) => {
    const px = MARGIN_X + i * (pW + 3);
    setFill(doc, [15, 62, 124]);
    doc.roundedRect(px, 105, pW, 20, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    setText(doc, GOLD);
    doc.text(p.num, px + 3.5, 113.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setText(doc, WHITE);
    doc.text(p.label, px + 3.5, 119.8);
  });

  // Lower White Cover Section: Executive Overview + Credits
  let y1 = 152;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setText(doc, NAVY_TEXT);
  doc.text('Executive Summary', MARGIN_X, y1);
  y1 += 5.5;

  y1 = drawParagraph(
    doc,
    'The Magic Bus Training Program Report Generator is a full-stack web platform purpose-built for Youth Trainers, Soft Skill Trainers, and Program Managers across Magic Bus India Foundation. It replaces hours of manual formatting in Word, PowerPoint, and Excel with an intuitive, mobile-responsive workspace that generates print-ready multi-page A4 PDF training reports, paginated student attendance sheets with signature blocks, Cyber Security program reports, and cross-batch progress comparisons in seconds.',
    y1,
    9.8,
    5.1
  );

  y1 += 6;
  // Document Contents Box
  setFill(doc, SURFACE_SOFT);
  setDraw(doc, BORDER_LIGHT);
  doc.setLineWidth(0.35);
  doc.roundedRect(MARGIN_X, y1, CONTENT_W, 56, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  setText(doc, NAVY_TEXT);
  doc.text('What This Presentation Document Covers', MARGIN_X + 5, y1 + 8);

  const tocItems = [
    ['Page 2', 'Project Overview, Problem Statement & Institutional Impact'],
    ['Page 3', 'Module 1: 12-Days AI & Life Skills Multi-Page Report Builder (Home Tab)'],
    ['Page 4', 'Module 2: Digital 12-Days Attendance Register, Calendar Dates & PDF Pagination'],
    ['Page 5', 'Module 3: Cyber Security Program Report Builder (FedEx) & Validation'],
    ['Page 6', 'Module 4: My Reports, Batch History Comparison & About Us Team Profiles'],
    ['Page 7', 'Full-Stack Architecture, Tech Stack & Per-User Data Security'],
    ['Page 8', 'Presenter Live Demo Walkthrough Script & Stakeholder Q&A Guide'],
  ];

  let ty = y1 + 15;
  tocItems.forEach(([pg, label]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    setText(doc, NAVY_MID);
    doc.text(pg, MARGIN_X + 6, ty);
    doc.setFont('helvetica', 'normal');
    setText(doc, SLATE_TEXT);
    doc.text(label, MARGIN_X + 24, ty);
    ty += 5.6;
  });

  // Bottom Metadata / Team Block
  y1 = 246;
  setDraw(doc, NAVY_DARK);
  doc.setLineWidth(0.7);
  doc.line(MARGIN_X, y1, PAGE_W - MARGIN_X, y1);
  y1 += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  setText(doc, NAVY_TEXT);
  doc.text('Prepared & Developed By', MARGIN_X, y1);
  doc.text('Team & Program Contributors', MARGIN_X + 94, y1);

  y1 += 5.2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  setText(doc, NAVY_MID);
  doc.text('Busi Reddy Yashwanth Reddy', MARGIN_X, y1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setText(doc, SLATE_TEXT);
  doc.text('Praveen Kumar P — Training Officer', MARGIN_X + 94, y1);

  y1 += 4.8;
  doc.text('Technical Youth Trainer (Infosys Project)', MARGIN_X, y1);
  doc.text('Mangali Devendra — Technical Youth Trainer', MARGIN_X + 94, y1);

  y1 += 4.8;
  setText(doc, MUTED_TEXT);
  doc.setFontSize(8.5);
  doc.text('Magic Bus India Foundation  •  Tirupati, Andhra Pradesh', MARGIN_X, y1);
  doc.text('Official Website: https://www.magicbus.org/', MARGIN_X + 94, y1);

  // Bottom navy footer bar on cover
  setFill(doc, NAVY_DARK);
  doc.rect(0, PAGE_H - 12, PAGE_W, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setText(doc, GOLD);
  doc.text(
    'Empowering Youth For Building a Better Tomorrow  |  Magic Bus India Foundation',
    PAGE_W / 2,
    PAGE_H - 4.8,
    { align: 'center' }
  );

  // =========================================================================
  // PAGE 2: PROJECT OVERVIEW, PROBLEM STATEMENT & OBJECTIVES
  // =========================================================================
  doc.addPage();
  let y = drawPageChrome(doc, 2, 'Overview', 'Project Overview, Problem & Objectives');

  y = drawSectionHeading(doc, '1. Background & The Challenge Trainers Faced', y);
  y = drawParagraph(
    doc,
    'Magic Bus India Foundation conducts intensive 12-Days AI & Life & Employability Skills programs (Infosys Project) and Cyber Security Awareness Programs (FedEx Project) across degree colleges and youth centers. After every batch, trainers must compile standardized multi-page reports containing cover sheets, curriculum pages, daily training photos (24 photos across 12 days), scanned letters, and complete student attendance records.',
    y
  );
  y += 3;

  y = drawInfoCardsGrid(
    doc,
    [
      {
        title: 'Manual Formatting Overhead',
        body: 'Trainers spent hours aligning logos, borders, gradients, and photos in Word or PowerPoint for every college batch.',
      },
      {
        title: 'Inconsistent Layouts & Scans',
        body: 'Sideways phone scans of Appreciation Letters, Feedback Forms, and MOE Letters broke report visual quality.',
      },
      {
        title: 'Attendance Pagination Pain',
        body: 'Exporting 40–60 student rows from spreadsheets caused clipped columns, awkward page breaks, and missing signature lines.',
      },
      {
        title: 'No Cross-Batch Tracking',
        body: 'Hard to compare student counts, completion percentages, and attendance trends across past batches at the same college.',
      },
    ],
    y,
    2,
    24
  );

  y = drawSectionHeading(doc, '2. Our Solution: One Unified Institutional Platform', y);
  y = drawParagraph(
    doc,
    'This web application unifies every stage of training documentation into a single, zero-friction workflow. Trainers simply enter batch information, pick dates from built-in calendars, upload photos or documents (Images, PDF, or Word), mark digital attendance, and export pixel-accurate A4 PDFs with one click—while every entry is securely persisted under their personal account.',
    y
  );
  y += 4;

  y = drawSectionHeading(doc, '3. Core Platform Modules at a Glance', y);
  y = drawTable(
    doc,
    ['Module / Tab', 'Primary Purpose', 'Key Output & Persistence'],
    [
      [
        'Home (12-Days Report)',
        '4-step report builder for Infosys Project 12-Days AI & Life Skills batches with live A4 preview.',
        '12+ Page A4 PDF, Page 1 Cover PNG, Auto-saved cloud drafts & My Reports.',
      ],
      [
        '12-Days Attendance',
        'Excel-style student register with Day 1–12 session calendars, P/A marks, and CSV import/export.',
        '18–19 rows/page A4 PDF with end signatures + CSV download + Permanent Save.',
      ],
      [
        'Cyber Security Workspace',
        'Dual-tab workspace for FedEx + Magic Bus Cyber Security Reports (with validation) & Attendance.',
        '3+ Page A4 PDF (Cover + 4-Photo Page + Attendance), Cover PNG, Saved Reports.',
      ],
      [
        'My Reports & Batch History',
        'Central archive of saved reports plus college/project-matched historical progress comparison.',
        'KPI summary strip, side-by-side batch comparison deltas, quick open & safe delete.',
      ],
      [
        'About Us & Team Hub',
        'Organization overview, interactive circular team profile showcase, and official project documentation.',
        'High-resolution portraits, downloadable trainer profile PDFs & Project Guide PDF.',
      ],
    ],
    [40, 74, 64],
    y
  );

  y = drawSectionHeading(doc, '4. Measurable Impact for Trainers & Managers', y);
  y = drawBulletList(
    doc,
    [
      {
        lead: '90% Faster Report Turnaround',
        body: 'Generate complete, print-ready multi-page A4 training reports in minutes instead of hours.',
      },
      {
        lead: '100% Brand Consistency',
        body: 'Every PDF preserves exact Magic Bus, Infosys, and FedEx visual gradients, borders, and typography.',
      },
      {
        lead: 'Zero Accidental Data Loss',
        body: 'Reports and attendance sheets save permanently to the trainer’s private account until explicitly deleted.',
      },
      {
        lead: 'Mobile & Field-Ready',
        body: 'Designed for trainers working directly from college classrooms on phones, tablets, or laptops.',
      },
    ],
    y
  );

  // =========================================================================
  // PAGE 3: MODULE 1 — 12-DAYS TRAINING REPORT BUILDER (HOME TAB)
  // =========================================================================
  doc.addPage();
  y = drawPageChrome(
    doc,
    3,
    'Module 1',
    '12-Days AI & Life Skills Report Builder (Home Tab)'
  );

  y = drawParagraph(
    doc,
    'The Home Tab provides a split-screen workspace: a guided 4-step Report Form on the left and a live, scaled A4 Document Preview on the right. Trainers can toggle between Single Page navigation (with Previous/Next arrows and dropdown selector) or View All Pages scrolling mode before exporting.',
    y
  );
  y += 4;

  y = drawSectionHeading(doc, 'Step 1: Cover Sheet Details (Page 1)', y);
  y = drawBulletList(
    doc,
    [
      {
        lead: 'Trainer & Co-Trainer Fields',
        body: 'Supports Primary Trainer and Co-Trainer names with custom Role/Designation labels cleanly formatted on the cover.',
      },
      {
        lead: 'College, Batch ID & Batch Size',
        body: 'Captures College/Organization name, full Batch ID (e.g., BT-CHITTOOR INFOSYS FOUNDATION CWW-AI – BT-4006), and Total Batch Size.',
      },
      {
        lead: 'Interactive From Date & To Date Calendars',
        body: 'Clicking either date field or its calendar icon opens a native date calendar picker and formats dates consistently as DD/MM/YYYY.',
      },
      {
        lead: 'Submission & Team Block',
        body: 'Captures Submitted To (Manager Name), Role/Designation dropdown (Program Manager, Cluster Manager, DGM, Master Trainer, etc.), and Team Name.',
      },
    ],
    y
  );

  y = drawSectionHeading(doc, 'Step 2: Fixed Curriculum & Daily Training Photos (Pages 2–7)', y);
  y = drawBulletList(
    doc,
    [
      {
        lead: 'Standardized Curriculum Pages',
        body: 'Automatically embeds the official Magic Bus 12-Days AI & Life Skills curriculum and core skills overview with zero manual typing.',
      },
      {
        lead: '24 Daily Photo Slots (2 Photos per Day)',
        body: 'Organized Day 1 through Day 12 with live completion counter (X/24 Photos), instant preview jump to the edited day page, and automatic client-side image optimization.',
      },
      {
        lead: 'Resume-Friendly Daily Progress',
        body: 'Trainers can upload Day 1–3 photos today, save to My Reports, and return later to add Day 4–12 photos right where they left off.',
      },
    ],
    y
  );

  y = drawSectionHeading(doc, 'Step 3: Conclusion & Acknowledgment (Page 8)', y);
  y = drawParagraph(
    doc,
    'Automatically synchronizes Trainer 1, Trainer 2, Manager Name, Designation, and Team Name from Step 1 while allowing trainers to customize College Head Name, Designation, Trainer Emails, and Mobile Numbers for an official institutional sign-off page.',
    y
  );
  y += 4;

  y = drawSectionHeading(doc, 'Step 4: Official Documents, Multi-Format Support & Rotation (Pages 9–12+)', y);
  y = drawInfoCardsGrid(
    doc,
    [
      {
        title: '4 Doc Slots + Extra Pages',
        body: 'Dedicated full-page slots for Appreciation Letter (Pg 9), Feedback Form (Pg 10), Attendance Sheet (Pg 11), MOE Letter (Pg 12), plus unlimited Extra Pages.',
        accent: 'Full A4 Fit',
      },
      {
        title: 'Universal File Format Support',
        body: 'Accepts PNG, JPG, JPEG, WebP images, PDF files (automatically rendered via pdf.js), and Microsoft Word (.docx) documents (rendered via Mammoth).',
        accent: 'IMG • PDF • DOCX',
      },
      {
        title: '90° Left / Right Image Rotation',
        body: 'Every uploaded document includes Rotate Left (-90°) and Rotate Right (+90°) buttons to fix sideways phone scans immediately inside the browser.',
        accent: 'One-Click Rotate',
      },
      {
        title: 'One-Click PDF & Cover PNG Export',
        body: 'Uses an off-screen 1:1 unscaled A4 capture pipeline to export crisp multi-page PDFs (exact gradients & alignment) or Page 1 high-res Cover PNG.',
        accent: '1:1 Exact PDF',
      },
    ],
    y,
    2,
    28
  );

  // =========================================================================
  // PAGE 4: MODULE 2 — 12-DAYS DIGITAL ATTENDANCE SHEET
  // =========================================================================
  doc.addPage();
  y = drawPageChrome(
    doc,
    4,
    'Module 2',
    '12-Days Digital Attendance Register & Smart PDF Pagination'
  );

  y = drawParagraph(
    doc,
    'The 12-Days Attendance tab replaces external spreadsheets with an interactive, Excel-like student attendance register directly integrated into the training report. Trainers can maintain daily attendance across an entire 12-day batch, record exact conducting dates for each day, and export print-ready paginated PDFs.',
    y
  );
  y += 4;

  y = drawSectionHeading(doc, '1. Interactive Attendance Workspace Features', y);
  y = drawBulletList(
    doc,
    [
      {
        lead: 'Dynamic Roll Number Range',
        body: 'Configure Start Roll No. and End Roll No. (supports up to 200 students per batch) without losing existing student names or attendance marks when expanding the batch.',
      },
      {
        lead: 'Day 01 to Day 12 Session Date Calendars',
        body: 'Every column header from Day 01 through Day 12 features an interactive calendar picker so trainers can stamp the exact date each session was conducted. Dates automatically appear on both the live sheet and exported PDF headers.',
      },
      {
        lead: 'Fast P / A Marking & Keyboard Navigation',
        body: 'Toggle Present (P), Absent (A), or blank with a single click or keyboard entry, with automatic per-student attendance totals and batch summary statistics.',
      },
      {
        lead: 'CSV Import & Excel-Compatible Export',
        body: 'Upload student rosters from CSV files in seconds or download the completed 12-day register as a formatted CSV file ready for Excel.',
      },
      {
        lead: 'Permanent Progress Saving (No Auto-Delete)',
        body: 'Save Attendance Sheet with progress to the trainer’s cloud account. Saved sheets persist permanently across sessions and are only removed when the trainer clicks Delete and confirms.',
      },
    ],
    y
  );

  y = drawSectionHeading(doc, '2. Precision Multi-Page PDF Pagination & End-of-Sheet Signatures', y);
  y = drawParagraph(
    doc,
    'A standout engineering highlight of the attendance exporter is its automatic A4 page-splitting algorithm. Regardless of whether a batch has 25, 45, or 90 students, every page stays legible, cleanly aligned, and never cuts student rows in half:',
    y
  );
  y += 3;

  y = drawTable(
    doc,
    ['Batch Size Example', 'Automatic PDF Page Breakdown (18–19 Rows / Page)', 'Signature Placement'],
    [
      [
        '18 Students',
        'Page 1: 18 student records (fits cleanly on 1 A4 page)',
        'Spaced below Row 18 on Page 1',
      ],
      [
        '36 Students',
        'Page 1: 18 records  •  Page 2: 18 records',
        'Spaced below Row 36 on Page 2',
      ],
      [
        '45 Students',
        'Page 1: 18 records  •  Page 2: 18 records  •  Page 3: 9 records',
        'Spaced below Row 45 on Page 3',
      ],
      [
        '60 Students',
        'Page 1: 18  •  Page 2: 18  •  Page 3: 18  •  Page 4: 6 records',
        'Spaced below Row 60 on Page 4',
      ],
    ],
    [34, 92, 52],
    y
  );

  // Signature block visual illustration
  setFill(doc, SURFACE_SOFT);
  setDraw(doc, BORDER_LIGHT);
  doc.setLineWidth(0.35);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  setText(doc, NAVY_MID);
  doc.text('Automated End-of-Register Signature Block (Rendered After Final Student Record)', MARGIN_X + 4, y + 6.5);

  // Left signature line
  setDraw(doc, [15, 23, 42]);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X + 10, y + 18, MARGIN_X + 66, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  setText(doc, [0, 0, 0]);
  doc.text('Trainer Signature', MARGIN_X + 38, y + 23.2, { align: 'center' });

  // Right signature line
  doc.line(PAGE_W - MARGIN_X - 66, y + 18, PAGE_W - MARGIN_X - 10, y + 18);
  doc.text('College SPOC Signature', PAGE_W - MARGIN_X - 38, y + 23.2, { align: 'center' });

  y += 34;

  y = drawSectionHeading(doc, '3. Seamless Sync with the 12-Days Main Report', y);
  y = drawParagraph(
    doc,
    'When "Use Digital Attendance in Report" is enabled, the 12-Days Report automatically embeds every paginated attendance page directly into Page 11+ of the final PDF export—removing the need to print, scan, and re-upload attendance sheets.',
    y
  );

  // =========================================================================
  // PAGE 5: MODULE 3 — CYBER SECURITY WORKSPACE (FEDEX + MAGIC BUS)
  // =========================================================================
  doc.addPage();
  y = drawPageChrome(
    doc,
    5,
    'Module 3',
    'Cyber Security Program Workspace (Report & Attendance)'
  );

  y = drawParagraph(
    doc,
    'The Cyber Security tab features a clean, mobile-friendly 2-tab workspace (Cyber Security Report & Attendance Sheet) engineered specifically for FedEx-sponsored Cyber Security Awareness sessions—with zero tab overflow on mobile screens.',
    y
  );
  y += 4;

  y = drawSectionHeading(doc, '1. Cyber Security Report Builder (3+ Page A4 PDF)', y);
  y = drawInfoCardsGrid(
    doc,
    [
      {
        title: 'Page 1: Dual-Logo Cover',
        body: 'Matches the executive Home cover gradient & frame while displaying both the Magic Bus India Foundation logo and official FedEx logo (plus optional custom FedEx logo upload).',
        accent: 'Magic Bus + FedEx',
      },
      {
        title: 'Student Demographics',
        body: 'Dedicated fields for Project Name, College Name, Trainer & Co-Trainer details, Total Students, Boys Count, Girls Count (with Auto-Sum helper), Completed Count, Manager & Team.',
        accent: 'Boys / Girls / Done',
      },
      {
        title: 'Page 2: 4-Photo Grid',
        body: 'Combines 2 Session Photos + Pre-Test Photo + Post-Test Photo neatly in a balanced 2×2 grid on a single A4 page, each with individual 90° rotation controls.',
        accent: '4 Photos on 1 Page',
      },
      {
        title: 'Page 3+: Attendance Sheet',
        body: 'Embeds paginated digital Cyber Security attendance (18–19 rows/page + signatures) OR an uploaded full-page scanned Attendance Sheet (PNG, JPG, PDF, or Word).',
        accent: 'Digital or Scan',
      },
    ],
    y,
    2,
    29
  );

  y = drawSectionHeading(doc, '2. Built-In Form Validation Engine', y);
  y = drawParagraph(
    doc,
    'Before saving a Cyber Security Report or generating its PDF / Cover PNG, the platform runs comprehensive validation to guarantee accurate, submission-ready institutional records:',
    y
  );
  y += 2.5;
  y = drawBulletList(
    doc,
    [
      {
        lead: 'Required Text Checks',
        body: 'Validates Project Name, College Name, Primary Trainer Name & Designation, Manager Name & Designation, Team Name, and conditional Co-Trainer Designation.',
      },
      {
        lead: 'Numeric Integrity Checks',
        body: 'Ensures Total Students is greater than 0, Boys and Girls counts are valid non-negative integers, and Completed Count never exceeds Total Students.',
      },
      {
        lead: 'Guided Error Recovery',
        body: 'Displays a summary banner of missing fields, highlights invalid inputs with red borders and clear inline messages, switches to the Cover step, and smoothly scrolls/focuses the first invalid field.',
      },
    ],
    y
  );

  y = drawSectionHeading(doc, '3. Cyber Security Digital Attendance Sheet', y);
  y = drawBulletList(
    doc,
    [
      {
        lead: 'Complete 9-Column Register',
        body: 'Tracks Unique ID, Full Name, Program (e.g., CWW AI), Qualification, Email ID, Mobile No., Pre-Test score, Post-Test score, and Signature.',
      },
      {
        lead: 'Permanent Progress Saving & Saved Drawer',
        body: 'Save, update, save as new copy, reload, or manually delete Cyber Security sheets and reports anytime without losing student data.',
      },
      {
        lead: 'Paginated PDF & CSV Export',
        body: 'Exports multi-page A4 PDFs fitting 18–19 students per page with bold black Trainer Signature (left) and College SPOC Signature (right) after the final record.',
      },
    ],
    y
  );

  // =========================================================================
  // PAGE 6: MODULE 4 — MY REPORTS, BATCH HISTORY & ABOUT US TEAM HUB
  // =========================================================================
  doc.addPage();
  y = drawPageChrome(
    doc,
    6,
    'Module 4',
    'My Reports, Batch History Comparison & About Us Hub'
  );

  y = drawSectionHeading(doc, '1. Batch History & Progress Comparison (Cross-Program Analytics)', y);
  y = drawParagraph(
    doc,
    'Available directly below the Home Report Builder, Cyber Security Report Builder, and inside My Reports, the Batch History section lets trainers view all previous programs conducted for the same college or project and measure progress batch over batch.',
    y
  );
  y += 3;

  y = drawInfoCardsGrid(
    doc,
    [
      {
        title: 'Smart College & Project Matching',
        body: 'Automatically matches saved 12-Days and Cyber Security reports by normalized College or Project Name—with instant toggle between "Same College / Project" and "All Batches".',
        accent: 'Auto-Matched',
      },
      {
        title: '4-KPI Progress Summary Strip',
        body: 'Displays Batches Tracked (12-Days vs. Cyber), Cumulative Students Reached, Batch Size Trend (Latest vs. Previous delta), and Avg. Completion / Attendance Rate.',
        accent: 'Live KPIs',
      },
      {
        title: 'Side-by-Side Progress Comparison',
        body: 'Click "Compare" on any past batch to inspect a structured comparison table against the active batch across Students, Attendance %, Photos, and Docs with +/- deltas.',
        accent: 'Delta Analysis',
      },
      {
        title: 'Individual & Bulk History Deletion',
        body: 'Provides safe two-step inline confirmation to delete a single historical batch record or clear all filtered batch history records from the trainer’s account.',
        accent: 'Safe Delete',
      },
    ],
    y,
    2,
    28
  );

  y = drawSectionHeading(doc, '2. My Saved Reports Dashboard', y);
  y = drawBulletList(
    doc,
    [
      {
        lead: 'Progress Visibility at a Glance',
        body: 'Lists every saved 12-Days report with College Name, Batch ID, Trainers, Team, Photo completion (e.g., 14/24 Photos — Up to Day 7), Document count (X/4 Docs), and last updated timestamp.',
      },
      {
        lead: 'Smart Next-Day Shortcut',
        body: 'Reports with pending photos automatically show an "Add Day-X Photos" button that opens the report directly on the exact next pending day.',
      },
      {
        lead: 'Permanent Cloud Persistence',
        body: 'Every saved report remains stored permanently until manually deleted with inline Confirm Delete / Cancel protection.',
      },
    ],
    y
  );

  y = drawSectionHeading(doc, '3. About Us, Circular Team Profiles & Official Links', y);
  y = drawBulletList(
    doc,
    [
      {
        lead: 'Interactive Circular Profile Icons',
        body: 'Displays high-resolution circular avatars for Busi Reddy Yashwanth Reddy (Technical Youth Trainer & Developer), Praveen Kumar P (Training Officer), and Mangali Devendra (Technical Youth Trainer). Clicking any avatar smoothly opens their complete executive profile card.',
      },
      {
        lead: 'High-Resolution Portraits & Lightbox',
        body: 'Serves crisp native high-resolution PNG portraits with a click-to-enlarge portrait preview modal and downloadable official trainer profile PDFs.',
      },
      {
        lead: 'Official Institutional Footer',
        body: 'Features the tagline "Empowering Youth For Building a Better Tomorrow" alongside direct links to Magic Bus India Foundation’s official website (https://www.magicbus.org/) and LinkedIn.',
      },
    ],
    y
  );

  // =========================================================================
  // PAGE 7: TECHNICAL ARCHITECTURE, TECH STACK & DATA SECURITY
  // =========================================================================
  doc.addPage();
  y = drawPageChrome(
    doc,
    7,
    'Architecture',
    'System Architecture, Technology Stack & Data Security'
  );

  y = drawSectionHeading(doc, '1. High-Level Full-Stack System Architecture', y);

  // Vector 3-Tier Architecture Diagram
  const diagY = y + 1;
  const boxH = 34;
  const boxW = 54;
  const gapDiag = 8;

  const tiers = [
    {
      title: '1. CLIENT SPA (BROWSER)',
      lines: [
        'React 19 + TypeScript',
        'Tailwind CSS v4 (Responsive)',
        'Live A4 Preview & Editor',
        'jsPDF + html2canvas Engine',
        'pdf.js + Mammoth + IndexedDB',
      ],
    },
    {
      title: '2. EXPRESS API SERVER',
      lines: [
        'Node.js + Express (server.ts)',
        'RESTful /api/* Endpoints',
        'Firebase Admin Token Check',
        'Strict Per-User Route Guard',
        'Vite Dev & Static Prod Serve',
      ],
    },
    {
      title: '3. CLOUD DATA & AUTH',
      lines: [
        'PostgreSQL (Cloud SQL)',
        'Drizzle ORM Schema',
        'Firebase Auth (Email/Google)',
        'Isolated user_id Records',
        'Permanent Draft & Archive',
      ],
    },
  ];

  tiers.forEach((tier, idx) => {
    const bx = MARGIN_X + idx * (boxW + gapDiag);
    setFill(doc, SURFACE_SOFT);
    setDraw(doc, NAVY_MID);
    doc.setLineWidth(0.45);
    doc.roundedRect(bx, diagY, boxW, boxH, 2, 2, 'FD');

    // Box Header
    setFill(doc, NAVY_DARK);
    doc.rect(bx, diagY, boxW, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    setText(doc, GOLD);
    doc.text(tier.title, bx + boxW / 2, diagY + 5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.7);
    setText(doc, SLATE_TEXT);
    tier.lines.forEach((line, lIdx) => {
      doc.text(`• ${line}`, bx + 2.8, diagY + 12.6 + lIdx * 4.3);
    });

    // Connector Arrow to next tier
    if (idx < 2) {
      const ax1 = bx + boxW + 0.8;
      const ax2 = bx + boxW + gapDiag - 0.8;
      const ay = diagY + boxH / 2;
      setDraw(doc, GOLD_DARK);
      doc.setLineWidth(0.8);
      doc.line(ax1, ay, ax2, ay);
      // Arrowhead right
      setFill(doc, GOLD_DARK);
      doc.triangle(ax2, ay, ax2 - 2.2, ay - 1.5, ax2 - 2.2, ay + 1.5, 'F');
    }
  });

  y = diagY + boxH + 8;

  y = drawSectionHeading(doc, '2. Technology Stack Summary', y);
  y = drawTable(
    doc,
    ['Layer', 'Technologies Used', 'Role in the Platform'],
    [
      [
        'Frontend UI',
        'React 19, TypeScript, Tailwind CSS v4, Lucide Icons',
        'Modular, responsive SPA with live interactive A4 preview and zero mobile overflow.',
      ],
      [
        'PDF & Document Pipeline',
        'jsPDF, html2canvas, pdfjs-dist, Mammoth (.docx)',
        '1:1 off-screen A4 PDF export, cover PNG capture, PDF/Word ingestion & 90° rotation.',
      ],
      [
        'Backend Server',
        'Express.js, TypeScript (tsx), REST APIs',
        'Authenticated CRUD endpoints for drafts, saved 12-day reports, and attendance/cyber sheets.',
      ],
      [
        'Database & Cache',
        'PostgreSQL (Cloud SQL), Drizzle ORM, IndexedDB',
        'Permanent relational persistence paired with fast user-scoped local browser caching.',
      ],
      [
        'Identity & Auth',
        'Firebase Authentication + Firebase Admin SDK',
        'Secure trainer login/sign-up with Bearer JWT verification on every API request.',
      ],
    ],
    [34, 62, 82],
    y
  );

  y = drawSectionHeading(doc, '3. Security, Privacy & Reliability Safeguards', y);
  y = drawBulletList(
    doc,
    [
      {
        lead: 'Strict Per-User Data Isolation',
        body: 'Every database query filters by the cryptographically verified Firebase UID. Trainer A can never view, modify, or delete Trainer B’s drafts, reports, or attendance sheets.',
      },
      {
        lead: 'Client-Side Document Processing',
        body: 'PDF/Word parsing, image compression, and 90° document rotations execute directly in the browser, keeping uploads fast and reducing server load.',
      },
      {
        lead: 'Resilient Hybrid Persistence',
        body: 'Active drafts and saved items synchronize to Cloud SQL while caching locally in user-scoped IndexedDB, protecting trainers against accidental tab closes or flaky college Wi-Fi.',
      },
      {
        lead: 'Explicit Delete Safeguards',
        body: 'No destructive action executes on a single click—every delete operation uses an inline two-step confirmation bar.',
      },
    ],
    y
  );

  // =========================================================================
  // PAGE 8: PRESENTER'S LIVE DEMO GUIDE & STAKEHOLDER Q&A
  // =========================================================================
  doc.addPage();
  y = drawPageChrome(
    doc,
    8,
    'Presentation Guide',
    "Presenter's 5-Minute Live Demo Script & Key Q&A"
  );

  y = drawParagraph(
    doc,
    'Use this structured walkthrough when presenting or demonstrating the Magic Bus Training Program Report Generator to Program Managers, Cluster Heads, Partner Foundations (Infosys / FedEx), or fellow trainers.',
    y
  );
  y += 4;

  y = drawSectionHeading(doc, '1. Recommended 5-Minute Live Demo Flow', y);
  y = drawTable(
    doc,
    ['Step', 'Screen / Tab', 'What to Show & Highlight to the Audience'],
    [
      [
        'Step 1 (45s)',
        'Login & Home Overview',
        'Show secure trainer sign-in, official Magic Bus navy/gold interface, and how every trainer gets a private persistent workspace.',
      ],
      [
        'Step 2 (60s)',
        'Home Tab (12-Days Report)',
        'Fill a college name, pick From/To dates from the Calendar, show the live A4 Cover updating instantly, upload a sample doc (PNG/PDF/Word), rotate it 90°, and click "Download Complete Report (PDF)".',
      ],
      [
        'Step 3 (60s)',
        '12-Days Attendance Tab',
        'Show Day 01–Day 12 calendar headers, mark P/A attendance, save progress permanently, and export PDF to highlight automatic 18–19 rows/page splitting + Trainer & College SPOC Signatures.',
      ],
      [
        'Step 4 (60s)',
        'Cyber Security Tab',
        'Show mobile-friendly sub-tabs, FedEx + Magic Bus dual-logo Cover Sheet, try saving with an empty field to demonstrate smart validation, show the 4-photo page, and export PDF.',
      ],
      [
        'Step 5 (45s)',
        'Batch History & My Reports',
        'Scroll to Batch History to demonstrate automatic College/Project matching, KPI trend strip, side-by-side "Compare" deltas, and safe Delete Batch History controls.',
      ],
      [
        'Step 6 (30s)',
        'About Us & Footer',
        'Click the circular team avatars (Yashwanth, Praveen, Devendra) to reveal full executive profiles, click a high-res portrait to zoom, and point out the official magicbus.org footer link.',
      ],
    ],
    [22, 42, 114],
    y
  );

  y = drawSectionHeading(doc, '2. Anticipated Stakeholder Questions & Crisp Answers', y);
  y = drawBulletList(
    doc,
    [
      {
        lead: 'Q: What if a trainer only finishes Day 4 photos today and closes the laptop?',
        body: 'All progress saves permanently to their cloud account and local cache. Next day, clicking "Add Day-5 Photos" in My Reports jumps right back to where they stopped.',
      },
      {
        lead: 'Q: Can multiple trainers share the same website without seeing each other’s batches?',
        body: 'Yes. Every trainer signs in with their own account and all database records are strictly isolated per user ID.',
      },
      {
        lead: 'Q: What happens when a college batch has 45 or 60 students in the Attendance PDF?',
        body: 'The exporter automatically paginates 18–19 students per page (e.g., 18 + 18 + 9 for 45 students) and places Trainer & College SPOC signature blocks neatly after the final student.',
      },
      {
        lead: 'Q: What if the college gives an Appreciation or MOE Letter as a PDF, Word file, or sideways photo?',
        body: 'Trainers can upload PNG, JPG, JPEG, PDF, or Word (.docx) files directly and fix orientation instantly using the built-in 90° Rotate Left / Right controls.',
      },
      {
        lead: 'Q: How does this help Program Managers track repeat colleges?',
        body: 'The Batch History section automatically groups all past 12-Days and Cyber Security reports for the same college/project and computes student growth and completion deltas side by side.',
      },
    ],
    y,
    { fontSize: 8.9, gap: 2.0 }
  );

  // Closing Presentation Sign-off Banner
  const signY = PAGE_H - 31;
  setFill(doc, NAVY_DARK);
  doc.roundedRect(MARGIN_X, signY, CONTENT_W, 13.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  setText(doc, GOLD);
  doc.text('Ready for Live Institutional Rollout', MARGIN_X + 5, signY + 5.6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  setText(doc, WHITE);
  doc.text(
    'Magic Bus India Foundation  •  Training Program Report Generator  •  Built by Busi Reddy Yashwanth Reddy',
    MARGIN_X + 5,
    signY + 10.6
  );

  return doc;
}

export function downloadProjectDocumentationPdf(): void {
  const doc = buildProjectDocumentationPdf();
  doc.save(PROJECT_DOC_FILENAME);
}
