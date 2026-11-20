import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  CopyPlus,
  FileDown,
  FilePlus2,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import {
  buildCyberSecurityRows,
  createEmptyCyberSecurityRow,
  CyberSecurityAttendanceData,
  CyberSecurityStudentRow,
  SavedAttendanceSheet,
} from '../types/report';
import {
  A4_LANDSCAPE_HEIGHT,
  A4_LANDSCAPE_WIDTH,
  exportLandscapePagesToPdf,
} from '../utils/exportPdf';
import {
  chunkCyberSecurityRows,
  CyberSecurityLandscapeSheet,
} from './CyberSecuritySheetPage';

interface SheetActionResult {
  ok: boolean;
  message: string;
}

interface CyberSecurityAttendanceViewProps {
  data: CyberSecurityAttendanceData;
  defaultSheetTitle: string;
  defaultStartDate: string;
  defaultEndDate: string;
  savedSheets: SavedAttendanceSheet[];
  activeSheetId: string | null;
  isSavingSheet: boolean;
  onChange: (next: CyberSecurityAttendanceData) => void;
  onSaveSheet: (options?: { asNew?: boolean }) => Promise<SheetActionResult>;
  onLoadSheet: (sheet: SavedAttendanceSheet) => void;
  onDeleteSheet: (sheetId: string) => Promise<SheetActionResult>;
  onNewBlankSheet: () => void;
}

type CyberColumnKey = keyof CyberSecurityStudentRow;

function formatSavedTimestamp(iso?: string): string {
  if (!iso) return 'Just now';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Recently saved';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function summarizeCyberSheet(sheet: SavedAttendanceSheet): {
  filledStudents: number;
  totalRows: number;
  withContact: number;
} {
  const payload = sheet.data as Partial<CyberSecurityAttendanceData> | undefined;
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const filledStudents = rows.filter(
    (r) => (r?.fullName || '').trim().length > 0 || (r?.uniqueId || '').trim().length > 0
  ).length;
  const withContact = rows.filter(
    (r) =>
      ((r?.fullName || '').trim().length > 0 || (r?.uniqueId || '').trim().length > 0) &&
      ((r?.emailId || '').trim().length > 0 || (r?.mobileNo || '').trim().length > 0)
  ).length;
  return {
    filledStudents,
    totalRows: rows.length,
    withContact,
  };
}

const COLUMN_ORDER: CyberColumnKey[] = [
  'uniqueId',
  'fullName',
  'program',
  'qualification',
  'emailId',
  'mobileNo',
  'preTest',
  'postTest',
  'signature',
];

const ROW_COUNT_PRESETS = [20, 30, 40, 50, 60] as const;

function escapeCsvCell(val: string | number): string {
  let s = String(val);
  // Neutralize Excel/spreadsheet formula injection (OWASP CSV injection protection)
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function normalizePhoneNumber(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91-${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91-${digits.slice(2)}`;
  }
  return trimmed;
}

export const CyberSecurityAttendanceView: React.FC<CyberSecurityAttendanceViewProps> = ({
  data,
  defaultSheetTitle,
  defaultStartDate,
  defaultEndDate,
  savedSheets,
  activeSheetId,
  isSavingSheet,
  onChange,
  onSaveSheet,
  onLoadSheet,
  onDeleteSheet,
  onNewBlankSheet,
}) => {
  const [rowCountInput, setRowCountInput] = useState(String(data.rowCount));
  const [defaultProgramInput, setDefaultProgramInput] = useState('CWW AI');
  const [defaultQualificationInput, setDefaultQualificationInput] = useState('GRADUATE');
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [confirmClearGrid, setConfirmClearGrid] = useState(false);
  const [confirmDeleteSheetId, setConfirmDeleteSheetId] = useState<string | null>(null);
  const [deletingSheetId, setDeletingSheetId] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [bulkTargetCol, setBulkTargetCol] = useState<'all' | CyberColumnKey>('all');
  const [bulkMode, setBulkMode] = useState<'replace' | 'append'>('replace');
  const [onlyNamedRows, setOnlyNamedRows] = useState(true);
  const [feedback, setFeedback] = useState<{ text: string; tone: 'success' | 'error' } | null>(
    null
  );
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(
    null
  );

  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setRowCountInput(String(data.rowCount));
  }, [data.rowCount]);

  const effectiveTitle = data.sheetTitle.trim() || defaultSheetTitle;
  const effectiveFunder = data.funder.trim() || 'INFOSYS FOUNDATION';
  const effectiveStartDate = data.batchStartDate.trim() || defaultStartDate;
  const effectiveEndDate = data.batchEndDate.trim() || defaultEndDate;

  const activeSavedSheet = useMemo(
    () => (activeSheetId ? savedSheets.find((s) => s.id === activeSheetId) || null : null),
    [activeSheetId, savedSheets]
  );

  const chunks = useMemo(() => chunkCyberSecurityRows(data.rows), [data.rows]);

  const filledStudentCount = useMemo(
    () =>
      data.rows.filter(
        (r) => r.fullName.trim().length > 0 || r.uniqueId.trim().length > 0
      ).length,
    [data.rows]
  );

  const progressStats = useMemo(() => {
    const withContact = data.rows.filter(
      (r) =>
        (r.fullName.trim().length > 0 || r.uniqueId.trim().length > 0) &&
        (r.emailId.trim().length > 0 || r.mobileNo.trim().length > 0)
    ).length;
    const percent =
      data.rows.length > 0 ? Math.round((filledStudentCount / data.rows.length) * 100) : 0;
    return { withContact, percent };
  }, [data.rows, filledStudentCount]);

  const flashFeedback = (text: string, tone: 'success' | 'error' = 'success') => {
    setFeedback({ text, tone });
    window.setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const handleSaveProgressClick = async (asNew = false) => {
    if (isSavingSheet) return;
    const result = await onSaveSheet({ asNew });
    flashFeedback(result.message, result.ok ? 'success' : 'error');
    if (result.ok) {
      setShowSavedPanel(true);
    }
  };

  const handleLoadSavedSheetClick = (sheet: SavedAttendanceSheet) => {
    onLoadSheet(sheet);
    setConfirmClearGrid(false);
    setConfirmDeleteSheetId(null);
    flashFeedback(`Loaded "${sheet.title}". All saved student attendance is intact.`);
  };

  const handleConfirmDeleteSheet = async (sheetId: string) => {
    if (deletingSheetId) return;
    setDeletingSheetId(sheetId);
    try {
      const result = await onDeleteSheet(sheetId);
      setConfirmDeleteSheetId(null);
      flashFeedback(result.message, result.ok ? 'success' : 'error');
    } finally {
      setDeletingSheetId(null);
    }
  };

  const handleStartBlankSheetClick = () => {
    onNewBlankSheet();
    setConfirmClearGrid(false);
    flashFeedback('Opened a new blank sheet. All previously saved attendance sheets remain safe.');
  };

  const applyRowCount = (nextCount: number) => {
    const safeCount = Math.max(1, Math.min(200, Math.floor(nextCount) || 30));
    const nextRows = buildCyberSecurityRows(
      safeCount,
      data.rows,
      defaultProgramInput,
      defaultQualificationInput
    );
    setRowCountInput(String(safeCount));
    onChange({
      ...data,
      rowCount: safeCount,
      rows: nextRows,
    });
    flashFeedback(`Updated Cyber Security sheet to ${safeCount} student rows.`);
  };

  const handleApplyRowCountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyRowCount(Number(rowCountInput));
  };

  const handleAddRow = () => {
    applyRowCount(data.rowCount + 1);
  };

  const handleCellChange = (rowIdx: number, col: CyberColumnKey, value: string) => {
    const nextRows = data.rows.map((row, idx) =>
      idx === rowIdx ? { ...row, [col]: value } : row
    );
    onChange({ ...data, rows: nextRows });
  };

  const handleBulkFillColumn = (col: 'program' | 'qualification', value: string) => {
    const hasNamed = data.rows.some(
      (r) => r.fullName.trim().length > 0 || r.uniqueId.trim().length > 0
    );
    const filterNamed = onlyNamedRows && hasNamed;
    const nextRows = data.rows.map((row) => {
      if (filterNamed && !row.fullName.trim() && !row.uniqueId.trim()) return row;
      return { ...row, [col]: value };
    });
    onChange({ ...data, rows: nextRows });
    flashFeedback(
      `Applied "${value}" to ${col === 'program' ? 'Program' : 'Qualification'} column.`
    );
  };

  const handleFormatAllMobiles = () => {
    const nextRows = data.rows.map((row) => ({
      ...row,
      mobileNo: normalizePhoneNumber(row.mobileNo),
    }));
    onChange({ ...data, rows: nextRows });
    flashFeedback('Formatted all 10-digit mobile numbers to +91-XXXXXXXXXX.');
  };

  /**
   * Pastes multi-line / multi-column Excel or CSV rows starting at (startRowIdx, startColIdx).
   */
  const applyPastedGrid = (rawText: string, startRowIdx: number, startColIdx: number) => {
    const lines = rawText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.trim().length > 0);

    if (lines.length === 0) return 0;

    const neededLength = startRowIdx + lines.length;
    const nextRows: CyberSecurityStudentRow[] = data.rows.map((r) => ({ ...r }));
    while (nextRows.length < neededLength) {
      nextRows.push(
        createEmptyCyberSecurityRow(defaultProgramInput, defaultQualificationInput)
      );
    }

    lines.forEach((line, offset) => {
      const target = nextRows[startRowIdx + offset];
      if (!target) return;

      const cells = line.includes('\t')
        ? line.split('\t').map((c) => c.trim())
        : line.includes(',') && startColIdx === 0 && line.split(',').length >= 3
          ? line.split(',').map((c) => c.trim())
          : [line.trim()];

      cells.forEach((cellVal, cOffset) => {
        const colKey = COLUMN_ORDER[startColIdx + cOffset];
        if (!colKey) return;
        target[colKey] = cellVal;
      });
    });

    setRowCountInput(String(nextRows.length));
    onChange({
      ...data,
      rowCount: nextRows.length,
      rows: nextRows,
    });
    return lines.length;
  };

  const handleBulkSubmit = () => {
    if (!bulkText.trim()) return;
    let startRowIdx = 0;
    if (bulkMode === 'append') {
      const lastFilled = data.rows.reduce(
        (last, r, idx) => (r.fullName.trim() || r.uniqueId.trim() ? idx : last),
        -1
      );
      startRowIdx = lastFilled + 1;
    }

    const startColIdx =
      bulkTargetCol === 'all' ? 0 : Math.max(0, COLUMN_ORDER.indexOf(bulkTargetCol));

    const inserted = applyPastedGrid(bulkText, startRowIdx, startColIdx);
    setBulkText('');
    setShowBulkPanel(false);
    flashFeedback(`Inserted ${inserted} row${inserted === 1 ? '' : 's'} cleanly into the sheet.`);
  };

  const handleInputPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ) => {
    const pasted = e.clipboardData.getData('text/plain');
    if (!pasted) return;
    const isMultiCell = pasted.includes('\n') || pasted.includes('\t');
    if (!isMultiCell) return;

    e.preventDefault();
    const count = applyPastedGrid(pasted, rowIdx, colIdx);
    if (count > 0) {
      flashFeedback(`Pasted ${count} row${count === 1 ? '' : 's'} from Excel cleanly.`);
    }
  };

  const focusCell = (rowIdx: number, colIdx: number) => {
    const safeRow = Math.max(0, Math.min(data.rows.length - 1, rowIdx));
    const safeCol = Math.max(0, Math.min(COLUMN_ORDER.length - 1, colIdx));
    const el = inputRefs.current[`${safeRow}:${safeCol}`];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusCell(rowIdx + 1, colIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusCell(rowIdx - 1, colIdx);
    }
  };

  const handleClearSheet = () => {
    const cleared = buildCyberSecurityRows(
      data.rowCount,
      [],
      defaultProgramInput,
      defaultQualificationInput
    );
    onChange({ ...data, rows: cleared });
    setConfirmClearGrid(false);
    flashFeedback(
      'Cleared the current editor grid. Your saved Cyber Security sheets remain preserved until you delete them.'
    );
  };

  const handleExportCsv = () => {
    const csvLines: string[] = [];
    csvLines.push(escapeCsvCell(effectiveTitle));
    csvLines.push(
      [
        `Funder : ${effectiveFunder}`,
        '',
        '',
        '',
        `Batch start Date:${effectiveStartDate}`,
        `Batch End Date:${effectiveEndDate}`,
        '',
        '',
        '',
      ]
        .map(escapeCsvCell)
        .join(',')
    );
    csvLines.push(
      [
        'Unique ID',
        'Full Name',
        'Program',
        'Qualification',
        'Email id',
        'Mobile No',
        'Pre Test',
        'Post Test',
        'Signature',
      ]
        .map(escapeCsvCell)
        .join(',')
    );
    data.rows.forEach((r) => {
      csvLines.push(
        [
          r.uniqueId,
          r.fullName,
          r.program,
          r.qualification,
          r.emailId,
          r.mobileNo,
          r.preTest,
          r.postTest,
          r.signature,
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    });

    const blob = new Blob([`\uFEFF${csvLines.join('\r\n')}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const slug = effectiveTitle.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40);
    link.href = url;
    link.download = `${slug || 'Cyber_Security_Attendance_Sheet'}.csv`;
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    flashFeedback('Excel-compatible Cyber Security CSV downloaded.');
  };

  const handleExportPdf = async () => {
    if (pdfProgress) return;
    const nodes = pageRefs.current
      .slice(0, chunks.length)
      .filter((el): el is HTMLDivElement => el !== null);
    if (nodes.length === 0) return;

    setPdfProgress({ current: 1, total: nodes.length });
    try {
      const slug = effectiveTitle.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40);
      await exportLandscapePagesToPdf(
        nodes,
        `${slug || 'Cyber_Security_Attendance_Sheet'}.pdf`,
        (current, total) => setPdfProgress({ current, total })
      );
      flashFeedback(
        `Exported Cyber Security Attendance PDF (${nodes.length} page${nodes.length === 1 ? '' : 's'}, 18–19 students/page).`
      );
    } catch (err) {
      console.error('Cyber Security PDF export failed:', err);
      flashFeedback('Unable to export Cyber Security PDF. Please try again.', 'error');
    } finally {
      setPdfProgress(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-[0_3px_16px_rgba(8,37,82,0.08)] border border-[#E1E6EF] overflow-hidden flex flex-col">
      {/* Top Institutional Bar */}
      <div
        className="px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
        style={{ background: 'linear-gradient(90deg, #072754 0%, #0C366F 100%)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <ShieldCheck className="w-5 h-5 text-[#FCD116] shrink-0" />
          <div className="min-w-0">
            <h2 className="text-white text-[17px] sm:text-[18px] font-bold tracking-tight leading-snug">
              Cyber Security Attendance Sheet Generator
            </h2>
            <p className="text-[#CBDDF5] text-[12px] sm:text-[12.5px]">
              Excel-style 9-column grid &middot; Exports clean multi-page A4 PDF (18–19 students per page)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSaveProgressClick(false)}
            disabled={isSavingSheet}
            className="px-4 py-2 rounded-lg bg-[#16A34A] text-white text-[12.5px] sm:text-[13px] font-extrabold flex items-center gap-1.5 hover:brightness-110 disabled:opacity-75 transition-all cursor-pointer whitespace-nowrap shadow-xs"
          >
            {isSavingSheet ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 shrink-0" />
                <span>{activeSavedSheet ? 'Save Progress' : 'Save Sheet'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowSavedPanel((v) => !v)}
            className={`px-3 py-2 rounded-lg text-[12.5px] sm:text-[13px] font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap border ${
              showSavedPanel
                ? 'bg-white text-[#07234B] border-white'
                : 'bg-white/12 text-white border-white/25 hover:bg-white/20'
            }`}
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            <span>Saved Sheets ({savedSheets.length})</span>
            {showSavedPanel ? (
              <ChevronUp className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={Boolean(pdfProgress)}
            className="px-4 py-2 rounded-lg bg-[#FFD100] text-[#07234B] text-[12.5px] sm:text-[13px] font-extrabold flex items-center gap-1.5 hover:brightness-95 disabled:opacity-75 transition-all cursor-pointer whitespace-nowrap shadow-xs"
          >
            {pdfProgress ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>
                  Exporting PDF ({pdfProgress.current}/{pdfProgress.total})...
                </span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 shrink-0" />
                <span>
                  Export as PDF ({chunks.length} {chunks.length === 1 ? 'Page' : 'Pages'})
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-lg bg-[#1D6F42] text-white text-[12.5px] sm:text-[13px] font-bold flex items-center gap-1.5 hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>Export Excel (.csv)</span>
          </button>
        </div>
      </div>

      {/* Header Fields & Controls */}
      <div className="p-4 sm:p-5 bg-[#F8FAFD] border-b border-[#E2E8F0] space-y-4">
        {/* Progress Tracker & Saved Sheets Bar */}
        <div className="rounded-lg border border-[#D4E0F0] bg-white p-3.5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                <span className="font-extrabold text-[#0A254E] tabular-nums">
                  Sheet Progress: {filledStudentCount} / {data.rows.length} Students Entered ({progressStats.percent}%)
                </span>
                <span className="text-[#94A3B8]">&middot;</span>
                <span className="font-semibold text-[#334155] tabular-nums">
                  {progressStats.withContact} with Email/Mobile
                </span>
                {activeSavedSheet ? (
                  <>
                    <span className="text-[#94A3B8]">&middot;</span>
                    <span className="font-semibold text-[#15803D] truncate max-w-[320px]">
                      Saved: {activeSavedSheet.title} ({formatSavedTimestamp(activeSavedSheet.updatedAt)})
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[#94A3B8]">&middot;</span>
                    <span className="text-[#64748B] font-medium">
                      Click Save Sheet to permanently keep this attendance until you delete it
                    </span>
                  </>
                )}
              </div>

              <div className="w-full max-w-[480px] h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progressStats.percent}%`,
                    backgroundColor: progressStats.percent === 100 ? '#16A34A' : '#0B3C82',
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void handleSaveProgressClick(false)}
                disabled={isSavingSheet}
                className="px-3 py-1.5 rounded-md bg-[#082B59] text-white text-[12px] font-bold flex items-center gap-1.5 hover:brightness-110 disabled:opacity-65 cursor-pointer"
              >
                {isSavingSheet ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{activeSavedSheet ? 'Update Saved Progress' : 'Save Progress'}</span>
              </button>

              {activeSavedSheet && (
                <button
                  type="button"
                  onClick={() => void handleSaveProgressClick(true)}
                  disabled={isSavingSheet}
                  className="px-3 py-1.5 rounded-md border border-[#BFD6F7] bg-[#E8F1FD] text-[#082B59] text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#DCEAFE] disabled:opacity-65 cursor-pointer"
                >
                  <CopyPlus className="w-3.5 h-3.5" />
                  <span>Save as New</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleStartBlankSheetClick}
                className="px-3 py-1.5 rounded-md border border-[#CBD4E1] bg-white text-[#334155] text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#F1F5FA] cursor-pointer"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span>New Blank Sheet</span>
              </button>
            </div>
          </div>

          {/* Saved Cyber Security Attendance Sheets Drawer */}
          {showSavedPanel && (
            <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-extrabold text-[#0A254E]">
                  Saved Cyber Security Attendance Sheets ({savedSheets.length})
                </h3>
                <span className="text-[11.5px] font-medium text-[#64748B]">
                  Saved attendance stays permanently preserved until you click Delete
                </span>
              </div>

              {savedSheets.length === 0 ? (
                <div className="rounded-md bg-[#F8FAFD] border border-dashed border-[#CBD5E1] px-4 py-4 text-center text-[12.5px] text-[#475569]">
                  No Cyber Security attendance sheets saved yet. Enter student details and click{' '}
                  <strong>Save Sheet</strong> to save your progress.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {savedSheets.map((sheet) => {
                    const summary = summarizeCyberSheet(sheet);
                    const pct =
                      summary.totalRows > 0
                        ? Math.round((summary.filledStudents / summary.totalRows) * 100)
                        : 0;
                    const isActive = sheet.id === activeSheetId;
                    const isConfirmingDelete = confirmDeleteSheetId === sheet.id;
                    const isDeleting = deletingSheetId === sheet.id;
                    return (
                      <div
                        key={sheet.id}
                        className={`rounded-lg border p-3 flex flex-col justify-between gap-2.5 transition-colors ${
                          isActive
                            ? 'border-[#0B3C82] bg-[#F2F7FE]'
                            : 'border-[#DCE4F0] bg-[#FAFBFD] hover:border-[#BFD2EB]'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-extrabold text-[#0A254E] leading-snug break-words">
                              {sheet.title}
                            </p>
                            {isActive && (
                              <span className="text-[10.5px] font-extrabold text-[#0B3C82] bg-white border border-[#BFD6F7] px-2 py-0.5 rounded shrink-0">
                                Open
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] font-semibold text-[#475569] tabular-nums">
                            <span>
                              {summary.filledStudents} / {summary.totalRows} Students ({pct}%)
                            </span>
                            <span>&middot;</span>
                            <span>{summary.withContact} Contacts</span>
                            <span>&middot;</span>
                            <span className="font-normal text-[#64748B]">
                              Saved {formatSavedTimestamp(sheet.updatedAt)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: pct === 100 ? '#16A34A' : '#0B3C82',
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {isConfirmingDelete ? (
                            <>
                              <span className="text-[11.5px] font-bold text-[#B91C1C] mr-auto">
                                Permanently delete this sheet?
                              </span>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSheetId(null)}
                                disabled={isDeleting}
                                className="px-2.5 py-1 rounded border border-[#CBD4E1] bg-white text-[#334155] text-[11.5px] font-bold hover:bg-[#F1F5FA] cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleConfirmDeleteSheet(sheet.id)}
                                disabled={isDeleting}
                                className="px-2.5 py-1 rounded bg-[#B91C1C] text-white text-[11.5px] font-bold flex items-center gap-1 hover:brightness-110 disabled:opacity-65 cursor-pointer"
                              >
                                {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                                <span>Confirm Delete</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleLoadSavedSheetClick(sheet)}
                                className="px-3 py-1 rounded bg-[#082B59] text-white text-[11.5px] font-bold hover:brightness-110 cursor-pointer"
                              >
                                {isActive ? 'Reload Saved' : 'Open & Resume'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSheetId(sheet.id)}
                                className="px-2.5 py-1 rounded border border-[#FECACA] bg-white text-[#B91C1C] text-[11.5px] font-bold flex items-center gap-1 hover:bg-[#FEF2F2] cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label
              htmlFor="cyber-sheet-title"
              className="block text-[12px] font-bold text-[#0A254E] mb-1"
            >
              Row 1 Sheet Title (with Batch ID)
            </label>
            <input
              id="cyber-sheet-title"
              type="text"
              value={data.sheetTitle}
              onChange={(e) => onChange({ ...data, sheetTitle: e.target.value })}
              placeholder={defaultSheetTitle}
              className="w-full px-3 py-2 rounded-md border border-[#CBD4E1] bg-white text-[16px] sm:text-[13px] font-semibold text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#0B336B]"
            />
          </div>

          <div>
            <label
              htmlFor="cyber-funder"
              className="block text-[12px] font-bold text-[#0A254E] mb-1"
            >
              Funder Name
            </label>
            <input
              id="cyber-funder"
              type="text"
              value={data.funder}
              onChange={(e) => onChange({ ...data, funder: e.target.value })}
              placeholder="INFOSYS FOUNDATION"
              className="w-full px-3 py-2 rounded-md border border-[#CBD4E1] bg-white text-[16px] sm:text-[13px] font-semibold text-[#0F172A] focus:outline-none focus:border-[#0B336B]"
            />
          </div>

          <div>
            <label
              htmlFor="cyber-start-date"
              className="block text-[12px] font-bold text-[#0A254E] mb-1"
            >
              Batch Start Date
            </label>
            <input
              id="cyber-start-date"
              type="text"
              value={data.batchStartDate}
              onChange={(e) => onChange({ ...data, batchStartDate: e.target.value })}
              placeholder={defaultStartDate}
              className="w-full px-3 py-2 rounded-md border border-[#CBD4E1] bg-white text-[16px] sm:text-[13px] font-semibold text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#0B336B]"
            />
          </div>

          <div>
            <label
              htmlFor="cyber-end-date"
              className="block text-[12px] font-bold text-[#0A254E] mb-1"
            >
              Batch End Date
            </label>
            <input
              id="cyber-end-date"
              type="text"
              value={data.batchEndDate}
              onChange={(e) => onChange({ ...data, batchEndDate: e.target.value })}
              placeholder={defaultEndDate}
              className="w-full px-3 py-2 rounded-md border border-[#CBD4E1] bg-white text-[16px] sm:text-[13px] font-semibold text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#0B336B]"
            />
          </div>
        </div>

        {/* Row Count Selector + Bulk Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <form
            onSubmit={handleApplyRowCountSubmit}
            className="flex flex-wrap items-center gap-2 bg-white border border-[#D8E1EE] rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#0A254E]">
              <Users className="w-4 h-4 text-[#0B336B]" />
              <span>Student Rows:</span>
            </div>

            <input
              type="number"
              aria-label="Total student rows"
              min={1}
              max={200}
              value={rowCountInput}
              onChange={(e) => setRowCountInput(e.target.value)}
              className="w-16 px-2 py-1 rounded border border-[#CBD4E1] text-[13px] font-bold text-center text-[#0A254E] focus:outline-none focus:border-[#0B336B]"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded bg-[#082B59] text-white text-[12px] font-bold hover:brightness-110 cursor-pointer"
            >
              Apply
            </button>

            <span className="hidden sm:inline-block h-4 w-[1px] bg-[#CBD5E1]" />

            <div className="flex flex-wrap items-center gap-1">
              {ROW_COUNT_PRESETS.map((count) => {
                const isSelected = data.rowCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => applyRowCount(count)}
                    className={`px-2 py-1 rounded text-[11.5px] font-bold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#0B336B] text-white'
                        : 'bg-[#EEF3FA] text-[#334155] hover:bg-[#DCE7F7]'
                    }`}
                  >
                    1–{count}
                  </button>
                );
              })}
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBulkPanel((v) => !v)}
              className={`px-3.5 py-2 rounded-lg text-[12.5px] font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                showBulkPanel
                  ? 'bg-[#082B59] text-white border-[#082B59]'
                  : 'bg-[#E8F1FD] text-[#082B59] border-[#BFD6F7] hover:bg-[#DCEAFE]'
              }`}
            >
              <ClipboardPaste className="w-4 h-4 shrink-0" />
              <span>Bulk Paste from Excel</span>
            </button>

            <button
              type="button"
              onClick={handleAddRow}
              className="px-3 py-2 rounded-lg border border-[#CBD4E1] bg-white text-[#0A254E] text-[12.5px] font-bold flex items-center gap-1 hover:bg-[#F1F5FA] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>

            {confirmClearGrid ? (
              <div className="flex items-center gap-1.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-2.5 py-1.5">
                <span className="text-[11.5px] font-bold text-[#B91C1C]">Clear grid?</span>
                <button
                  type="button"
                  onClick={handleClearSheet}
                  className="px-2 py-0.5 rounded bg-[#B91C1C] text-white text-[11.5px] font-bold hover:brightness-110 cursor-pointer"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearGrid(false)}
                  className="px-2 py-0.5 rounded border border-[#CBD4E1] bg-white text-[#334155] text-[11.5px] font-bold hover:bg-[#F1F5FA] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearGrid(true)}
                className="px-3 py-2 rounded-lg border border-[#FECACA] bg-white text-[#B91C1C] text-[12.5px] font-bold flex items-center gap-1 hover:bg-[#FEF2F2] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Grid</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Bulk Fill Defaults (Program, Qualification, Mobile +91- Formatter) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#D8E1EE] rounded-lg px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-extrabold text-[#0A254E]">
              Quick Bulk Fill:
            </span>

            <div className="flex items-center gap-1">
              <input
                type="text"
                aria-label="Bulk Program value"
                value={defaultProgramInput}
                onChange={(e) => setDefaultProgramInput(e.target.value)}
                className="w-24 px-2 py-1 rounded border border-[#CBD4E1] text-[12px] font-bold text-[#0A254E]"
                placeholder="CWW AI"
              />
              <button
                type="button"
                onClick={() => handleBulkFillColumn('program', defaultProgramInput)}
                className="px-2.5 py-1 rounded bg-[#0B336B] text-white text-[11.5px] font-bold hover:brightness-110 cursor-pointer whitespace-nowrap"
              >
                Fill Program
              </button>
            </div>

            <div className="flex items-center gap-1">
              <input
                type="text"
                aria-label="Bulk Qualification value"
                value={defaultQualificationInput}
                onChange={(e) => setDefaultQualificationInput(e.target.value)}
                className="w-28 px-2 py-1 rounded border border-[#CBD4E1] text-[12px] font-bold text-[#0A254E]"
                placeholder="GRADUATE"
              />
              <button
                type="button"
                onClick={() =>
                  handleBulkFillColumn('qualification', defaultQualificationInput)
                }
                className="px-2.5 py-1 rounded bg-[#0B336B] text-white text-[11.5px] font-bold hover:brightness-110 cursor-pointer whitespace-nowrap"
              >
                Fill Qualification
              </button>
            </div>

            <button
              type="button"
              onClick={handleFormatAllMobiles}
              className="px-2.5 py-1 rounded border border-[#BFD6F7] bg-[#E8F1FD] text-[#082B59] text-[11.5px] font-bold flex items-center gap-1 hover:bg-[#DCEAFE] cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3 h-3" />
              <span>Format Mobiles (+91-)</span>
            </button>

            <label className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#475569] cursor-pointer ml-1">
              <input
                type="checkbox"
                checked={onlyNamedRows}
                onChange={(e) => setOnlyNamedRows(e.target.checked)}
                className="accent-[#0B336B]"
              />
              <span>Only filled rows</span>
            </label>
          </div>

          <span className="text-[12px] font-bold text-[#0A254E] tabular-nums">
            {filledStudentCount} / {data.rows.length} Students Entered
          </span>
        </div>

        {/* Expandable Bulk Paste Panel */}
        {showBulkPanel && (
          <div className="rounded-lg border-2 border-[#0B336B]/25 bg-white p-4 space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-[14px] font-extrabold text-[#0A254E]">
                  Bulk Paste Student Data from Excel / Google Sheets
                </h3>
                <p className="text-[12px] text-[#475569]">
                  Copy columns directly from Excel (e.g. Unique ID, Full Name, Program, Qualification, Email id, Mobile No) or paste a single column into a chosen field.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkPanel(false)}
                className="text-[12px] font-bold text-[#64748B] hover:text-[#0A254E] self-start sm:self-center cursor-pointer"
              >
                Close
              </button>
            </div>

            <textarea
              rows={6}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Paste directly from Excel (tab-separated columns):\n265774701\tA Manjunath\tCWW AI\tGRADUATE\tmm7119024@gmail.com\t+91-8919161993\n265774720\tK Reddy Susmitha\tCWW AI\tGRADUATE\tkanyamadugususmitha1@gmail.com\t+91-8297399572`}
              className="w-full px-3 py-2.5 rounded-md border border-[#CBD4E1] font-mono text-[12.5px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0B336B]"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#334155]">Target Column:</span>
                  <select
                    value={bulkTargetCol}
                    onChange={(e) =>
                      setBulkTargetCol(e.target.value as 'all' | CyberColumnKey)
                    }
                    className="px-2 py-1 rounded border border-[#CBD4E1] bg-white text-[12px] font-bold text-[#0A254E]"
                  >
                    <option value="all">Full Excel Rows (starting at Unique ID)</option>
                    <option value="uniqueId">Unique ID column only</option>
                    <option value="fullName">Full Name column only</option>
                    <option value="emailId">Email id column only</option>
                    <option value="mobileNo">Mobile No column only</option>
                  </select>
                </div>

                <label className="inline-flex items-center gap-1.5 font-semibold text-[#334155] cursor-pointer">
                  <input
                    type="radio"
                    name="cyber-bulk-mode"
                    checked={bulkMode === 'replace'}
                    onChange={() => setBulkMode('replace')}
                    className="accent-[#0B336B]"
                  />
                  <span>Fill from Row 1</span>
                </label>

                <label className="inline-flex items-center gap-1.5 font-semibold text-[#334155] cursor-pointer">
                  <input
                    type="radio"
                    name="cyber-bulk-mode"
                    checked={bulkMode === 'append'}
                    onChange={() => setBulkMode('append')}
                    className="accent-[#0B336B]"
                  />
                  <span>Append after last student</span>
                </label>
              </div>

              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={!bulkText.trim()}
                className="px-4 py-2 rounded-lg text-white text-[13px] font-bold disabled:opacity-50 hover:brightness-110 cursor-pointer"
                style={{ background: 'linear-gradient(180deg, #0D366E 0%, #07234B 100%)' }}
              >
                Insert into Sheet
              </button>
            </div>
          </div>
        )}

        {feedback && (
          <div
            role="status"
            className={`text-[12.5px] font-semibold rounded-md px-3 py-2 flex items-center gap-2 border ${
              feedback.tone === 'error'
                ? 'text-[#991B1B] bg-[#FEF2F2] border-[#FECACA]'
                : 'text-[#0B336B] bg-[#EDF4FD] border-[#C6DCFA]'
            }`}
          >
            {feedback.tone === 'error' ? (
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}
      </div>

      {/* Interactive Excel-Style 9-Column Grid */}
      <div className="p-3 sm:p-5 bg-white">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#475569]">
          <span>
            <strong>Tip:</strong> Copy multiple rows/columns in Excel and press{' '}
            <strong>Ctrl+V</strong> inside any cell below to bulk-fill cleanly in order.
          </span>
          <span className="font-semibold text-[#0A254E]">
            Pre Test, Post Test &amp; Signature can be left blank for handwritten entry
          </span>
        </div>

        <div className="w-full overflow-x-auto border border-[#000000] rounded-sm shadow-xs">
          <table
            className="w-full border-collapse min-w-[1180px]"
            style={{ fontFamily: "'Source Sans 3', 'Segoe UI', Arial, sans-serif" }}
          >
            <thead>
              {/* Row 1: Cyber Security Attendance Sheet (BT-4006) */}
              <tr className="bg-white">
                <th
                  colSpan={9}
                  className="border-b border-[#000000] py-2 px-3 text-center text-[16.5px] font-bold text-black"
                >
                  {effectiveTitle}
                </th>
              </tr>

              {/* Row 2: Funder | Blank | Batch start Date | Batch End Date | Blank */}
              <tr className="bg-white text-[13.5px] font-bold text-black">
                <th
                  colSpan={3}
                  className="border-b border-r border-[#000000] py-1.5 px-3 text-center"
                >
                  Funder : {effectiveFunder}
                </th>
                <th className="border-b border-r border-[#000000] py-1.5 px-2 text-center">
                  &nbsp;
                </th>
                <th className="border-b border-r border-[#000000] py-1.5 px-3 text-center">
                  Batch start Date:{effectiveStartDate}
                </th>
                <th
                  colSpan={3}
                  className="border-b border-r border-[#000000] py-1.5 px-3 text-center"
                >
                  Batch End Date:{effectiveEndDate}
                </th>
                <th className="border-b border-[#000000] py-1.5 px-2 text-center">
                  &nbsp;
                </th>
              </tr>

              {/* Row 3: 9 Column Headers */}
              <tr className="bg-[#F8FAFC] text-[13px] font-bold text-black">
                <th className="w-[105px] border-b border-r border-[#000000] py-2 px-2 text-center">
                  Unique ID
                </th>
                <th className="min-w-[200px] border-b border-r border-[#000000] py-2 px-3 text-center">
                  Full Name
                </th>
                <th className="w-[88px] border-b border-r border-[#000000] py-2 px-2 text-center">
                  Program
                </th>
                <th className="w-[116px] border-b border-r border-[#000000] py-2 px-2 text-center">
                  Qualification
                </th>
                <th className="min-w-[240px] border-b border-r border-[#000000] py-2 px-3 text-center">
                  Email id
                </th>
                <th className="w-[144px] border-b border-r border-[#000000] py-2 px-2 text-center">
                  Mobile No
                </th>
                <th className="w-[82px] border-b border-r border-[#000000] py-2 px-2 text-center">
                  Pre Test
                </th>
                <th className="w-[82px] border-b border-r border-[#000000] py-2 px-2 text-center">
                  Post Test
                </th>
                <th className="w-[120px] border-b border-[#000000] py-2 px-2 text-center">
                  Signature
                </th>
              </tr>
            </thead>

            <tbody>
              {data.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="bg-white hover:bg-[#F8FBFF]">
                  {COLUMN_ORDER.map((colKey, colIdx) => {
                    const isLeftAligned = colKey === 'fullName' || colKey === 'emailId';
                    const placeholderMap: Record<CyberColumnKey, string> = {
                      uniqueId: `${rowIdx + 1}`,
                      fullName: `Student ${rowIdx + 1}`,
                      program: 'CWW AI',
                      qualification: 'GRADUATE',
                      emailId: 'email@gmail.com',
                      mobileNo: '+91-...',
                      preTest: '',
                      postTest: '',
                      signature: '',
                    };
                    return (
                      <td
                        key={colKey}
                        className="border-b border-r last:border-r-0 border-[#000000] p-0"
                      >
                        <input
                          ref={(el) => {
                            inputRefs.current[`${rowIdx}:${colIdx}`] = el;
                          }}
                          type="text"
                          aria-label={`Row ${rowIdx + 1} ${colKey}`}
                          value={row[colKey]}
                          onChange={(e) => handleCellChange(rowIdx, colKey, e.target.value)}
                          onPaste={(e) => handleInputPaste(e, rowIdx, colIdx)}
                          onKeyDown={(e) => handleInputKeyDown(e, rowIdx, colIdx)}
                          placeholder={placeholderMap[colKey]}
                          className={`w-full h-full px-2.5 py-2 text-[13px] font-bold text-black placeholder:text-[#CBD5E1] placeholder:font-normal bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#1D6F42] focus:bg-[#F0FDF4] ${
                            isLeftAligned ? 'text-left' : 'text-center'
                          }`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Off-Screen 1:1 Landscape A4 Staging Container for Exact Multi-Page PDF Capture */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-12000px',
          top: 0,
          width: `${A4_LANDSCAPE_WIDTH}px`,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        {chunks.map((chunk, idx) => (
          <div
            key={`cyber-pdf-page-${idx}`}
            ref={(el) => {
              pageRefs.current[idx] = el;
            }}
            style={{
              width: `${A4_LANDSCAPE_WIDTH}px`,
              height: `${A4_LANDSCAPE_HEIGHT}px`,
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
            }}
          >
            <CyberSecurityLandscapeSheet
              sheetTitle={effectiveTitle}
              funder={effectiveFunder}
              batchStartDate={effectiveStartDate}
              batchEndDate={effectiveEndDate}
              rows={chunk}
              pageIndex={idx}
              totalPages={chunks.length}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
