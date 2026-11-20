import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardPaste,
  CopyPlus,
  FileDown,
  FilePlus2,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Table2,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  AttendanceMark,
  AttendanceSheetData,
  AttendanceStudentRow,
  buildAttendanceRowsForRange,
  createEmptyDayDatesArray,
  createEmptyDaysArray,
  normalizeAttendanceMark,
  normalizeDayDates,
  SavedAttendanceSheet,
} from '../types/report';
import {
  A4_LANDSCAPE_HEIGHT,
  A4_LANDSCAPE_WIDTH,
  exportLandscapePagesToPdf,
} from '../utils/exportPdf';
import {
  AttendanceLandscapeSheet,
  chunkAttendanceRows,
  LANDSCAPE_ROWS_PER_PAGE,
} from './AttendanceReportPage';

interface SheetActionResult {
  ok: boolean;
  message: string;
}

interface AttendanceSheetViewProps {
  attendance: AttendanceSheetData;
  defaultCollegeBatchHeader: string;
  savedSheets: SavedAttendanceSheet[];
  activeSheetId: string | null;
  isSavingSheet: boolean;
  onChangeAttendance: (next: AttendanceSheetData) => void;
  onSaveSheet: (options?: { asNew?: boolean }) => Promise<SheetActionResult>;
  onLoadSheet: (sheet: SavedAttendanceSheet) => void;
  onDeleteSheet: (sheetId: string) => Promise<SheetActionResult>;
  onNewBlankSheet: () => void;
  onOpenReportPreview: () => void;
}

const DAY_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const RANGE_PRESETS = [20, 30, 40, 50, 60] as const;
const CALENDAR_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const CALENDAR_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseDayDate(raw?: string): Date | null {
  const clean = (raw || '').trim();
  if (!clean) return null;
  const match = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!match) return null;
  const d = Number(match[1]);
  const m = Number(match[2]);
  const y = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
  const candidate = new Date(y, m - 1, d);
  if (
    candidate.getFullYear() === y &&
    candidate.getMonth() === m - 1 &&
    candidate.getDate() === d
  ) {
    return candidate;
  }
  return null;
}

function formatDayDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

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

function summarize12DaySheet(sheet: SavedAttendanceSheet): {
  filledStudents: number;
  totalRows: number;
  daysMarked: number;
  highestDay: number;
} {
  const data = sheet.data as Partial<AttendanceSheetData> | undefined;
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const filledStudents = rows.filter((r) => (r?.name || '').trim().length > 0).length;
  let daysMarked = 0;
  let highestDay = 0;
  for (let d = 0; d < 12; d += 1) {
    const hasMark = rows.some((r) => Array.isArray(r?.days) && (r.days[d] === 'P' || r.days[d] === 'A'));
    if (hasMark) {
      daysMarked += 1;
      highestDay = d + 1;
    }
  }
  return {
    filledStudents,
    totalRows: rows.length,
    daysMarked,
    highestDay,
  };
}

function stripLeadingSerial(raw: string): string {
  // Strips common list prefixes like "1.", "01)", "1 -", "1) " when pasted from lists/WhatsApp/Word
  return raw
    .replace(/^\s*\d+\s*[\.\)\-:]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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

export const AttendanceSheetView: React.FC<AttendanceSheetViewProps> = ({
  attendance,
  defaultCollegeBatchHeader,
  savedSheets,
  activeSheetId,
  isSavingSheet,
  onChangeAttendance,
  onSaveSheet,
  onLoadSheet,
  onDeleteSheet,
  onNewBlankSheet,
  onOpenReportPreview,
}) => {
  const [rangeStartInput, setRangeStartInput] = useState(String(attendance.startRollNo));
  const [rangeEndInput, setRangeEndInput] = useState(String(attendance.endRollNo));
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [confirmClearGrid, setConfirmClearGrid] = useState(false);
  const [confirmDeleteSheetId, setConfirmDeleteSheetId] = useState<string | null>(null);
  const [deletingSheetId, setDeletingSheetId] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [bulkMode, setBulkMode] = useState<'replace-from-start' | 'append'>('replace-from-start');
  const [bulkAutoFillDays, setBulkAutoFillDays] = useState<number>(0); // 0 = leave blank, 1..12 = mark Day 1..N as P
  const [bulkFromDay, setBulkFromDay] = useState<number>(1);
  const [bulkToDay, setBulkToDay] = useState<number>(12);
  const [onlyNamedRows, setOnlyNamedRows] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ text: string; tone: 'success' | 'error' } | null>(
    null
  );
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [activeCalendar, setActiveCalendar] = useState<{
    dayIdx: number;
    top: number;
    left: number;
    viewYear: number;
    viewMonth: number;
  } | null>(null);

  const landscapePageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cellRefs = useRef<Record<string, HTMLInputElement | HTMLButtonElement | null>>({});
  const calendarPopoverRef = useRef<HTMLDivElement | null>(null);

  const dayDates = useMemo(() => normalizeDayDates(attendance.dayDates), [attendance.dayDates]);

  useEffect(() => {
    setRangeStartInput(String(attendance.startRollNo));
    setRangeEndInput(String(attendance.endRollNo));
  }, [attendance.startRollNo, attendance.endRollNo]);

  useEffect(() => {
    if (!activeCalendar) return;

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (calendarPopoverRef.current && target && calendarPopoverRef.current.contains(target)) {
        return;
      }
      if (target?.closest?.('[data-day-calendar-trigger="true"]')) {
        return;
      }
      setActiveCalendar(null);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveCalendar(null);
    };
    const handleRepositionClose = () => {
      setActiveCalendar(null);
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleRepositionClose);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleRepositionClose);
    };
  }, [activeCalendar]);

  const handleOpenDayCalendar = (
    dayIdx: number,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (activeCalendar && activeCalendar.dayIdx === dayIdx) {
      setActiveCalendar(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const popoverWidth = 272;
    const popoverHeight = 318;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    left = Math.max(10, Math.min(viewportW - popoverWidth - 10, left));

    let top = rect.bottom + 6;
    if (top + popoverHeight > viewportH - 10 && rect.top - popoverHeight - 6 > 10) {
      top = rect.top - popoverHeight - 6;
    } else {
      top = Math.max(10, Math.min(viewportH - popoverHeight - 10, top));
    }

    // Default month: this day's date, else nearest previous day's date, else today
    let seedDate = parseDayDate(dayDates[dayIdx]);
    if (!seedDate) {
      for (let i = dayIdx - 1; i >= 0; i -= 1) {
        const prev = parseDayDate(dayDates[i]);
        if (prev) {
          seedDate = prev;
          break;
        }
      }
    }
    const base = seedDate || new Date();

    setActiveCalendar({
      dayIdx,
      top,
      left,
      viewYear: base.getFullYear(),
      viewMonth: base.getMonth(),
    });
  };

  const handleSetDayDate = (dayIdx: number, formatted: string) => {
    const nextDates = [...dayDates];
    nextDates[dayIdx] = formatted;
    onChangeAttendance({ ...attendance, dayDates: nextDates });
    setActiveCalendar(null);
  };

  const effectiveCollegeBatch =
    attendance.collegeBatchHeader.trim() || defaultCollegeBatchHeader;

  const activeSavedSheet = useMemo(
    () => (activeSheetId ? savedSheets.find((s) => s.id === activeSheetId) || null : null),
    [activeSheetId, savedSheets]
  );

  const landscapeChunks = useMemo(
    () => chunkAttendanceRows(attendance.rows, LANDSCAPE_ROWS_PER_PAGE),
    [attendance.rows]
  );

  const filledStudentCount = useMemo(
    () => attendance.rows.filter((r) => r.name.trim().length > 0).length,
    [attendance.rows]
  );

  const progressStats = useMemo(() => {
    let daysMarked = 0;
    let highestMarkedDay = 0;
    let totalMarks = 0;
    DAY_INDICES.forEach((dIdx) => {
      let dayCount = 0;
      attendance.rows.forEach((row) => {
        if (row.days[dIdx] === 'P' || row.days[dIdx] === 'A') {
          dayCount += 1;
        }
      });
      if (dayCount > 0) {
        daysMarked += 1;
        highestMarkedDay = dIdx + 1;
        totalMarks += dayCount;
      }
    });
    const percent = Math.round((daysMarked / 12) * 100);
    return { daysMarked, highestMarkedDay, totalMarks, percent };
  }, [attendance.rows]);

  const dailyPresentCounts = useMemo(
    () =>
      DAY_INDICES.map((dIdx) =>
        attendance.rows.reduce((acc, row) => acc + (row.days[dIdx] === 'P' ? 1 : 0), 0)
      ),
    [attendance.rows]
  );

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

  const applyRange = (nextStart: number, nextEnd: number) => {
    const safeStart = Math.max(1, Math.min(500, Math.floor(nextStart) || 1));
    const safeEnd = Math.max(safeStart, Math.min(safeStart + 199, Math.floor(nextEnd) || safeStart));
    const nextRows = buildAttendanceRowsForRange(safeStart, safeEnd, attendance.rows);
    setRangeStartInput(String(safeStart));
    setRangeEndInput(String(safeEnd));
    onChangeAttendance({
      ...attendance,
      startRollNo: safeStart,
      endRollNo: safeEnd,
      rows: nextRows,
    });
    flashFeedback(`Student range updated to S.NO ${safeStart} – ${safeEnd} (${nextRows.length} rows).`);
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    applyRange(Number(rangeStartInput), Number(rangeEndInput));
  };

  const handleAddSingleRow = () => {
    const nextEnd = attendance.endRollNo + 1;
    applyRange(attendance.startRollNo, nextEnd);
  };

  const handleNameChange = (rowIdx: number, value: string) => {
    const nextRows = attendance.rows.map((row, idx) =>
      idx === rowIdx ? { ...row, name: value } : row
    );
    onChangeAttendance({ ...attendance, rows: nextRows });
  };

  const handleSetDayMark = (rowIdx: number, dayIdx: number, mark: AttendanceMark) => {
    const nextRows = attendance.rows.map((row, idx) => {
      if (idx !== rowIdx) return row;
      const nextDays = [...row.days];
      nextDays[dayIdx] = mark;
      return { ...row, days: nextDays };
    });
    onChangeAttendance({ ...attendance, rows: nextRows });
  };

  const handleCycleDayMark = (rowIdx: number, dayIdx: number) => {
    const current = attendance.rows[rowIdx]?.days[dayIdx] || '';
    const next: AttendanceMark = current === '' ? 'P' : current === 'P' ? 'A' : '';
    handleSetDayMark(rowIdx, dayIdx, next);
  };

  const handleBulkColumnMark = (dayIdx: number, mark: AttendanceMark) => {
    const hasAnyNamed = attendance.rows.some((r) => r.name.trim().length > 0);
    const filterNamed = onlyNamedRows && hasAnyNamed;
    const nextRows = attendance.rows.map((row) => {
      if (filterNamed && !row.name.trim()) return row;
      const nextDays = [...row.days];
      nextDays[dayIdx] = mark;
      return { ...row, days: nextDays };
    });
    onChangeAttendance({ ...attendance, rows: nextRows });
  };

  const handleBulkDayRangeAction = (mark: AttendanceMark) => {
    const fromIdx = Math.max(0, Math.min(11, Math.min(bulkFromDay, bulkToDay) - 1));
    const toIdx = Math.max(0, Math.min(11, Math.max(bulkFromDay, bulkToDay) - 1));
    const hasAnyNamed = attendance.rows.some((r) => r.name.trim().length > 0);
    const filterNamed = onlyNamedRows && hasAnyNamed;

    const nextRows = attendance.rows.map((row) => {
      if (filterNamed && !row.name.trim()) return row;
      const nextDays = [...row.days];
      for (let d = fromIdx; d <= toIdx; d += 1) {
        nextDays[d] = mark;
      }
      return { ...row, days: nextDays };
    });

    onChangeAttendance({ ...attendance, rows: nextRows });
    const label = mark === 'P' ? 'Present (P)' : mark === 'A' ? 'Absent (A)' : 'cleared';
    flashFeedback(`Day ${fromIdx + 1} to Day ${toIdx + 1} marked ${label}.`);
  };

  /**
   * Parses pasted multi-line / tab-separated / CSV text from Excel, Google Sheets, Word, or WhatsApp
   * and cleanly aligns names & P/A attendance marks into rows starting at targetStartIdx.
   */
  const applyPastedLines = (
    rawText: string,
    targetStartIdx: number,
    colOffset: number, // -1 means Student Name column, 0..11 means Day 1..12 column
    autoFillPresentDays = 0
  ) => {
    const rawLines = rawText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.trim().length > 0);

    if (rawLines.length === 0) return 0;

    const neededEndIndex = targetStartIdx + rawLines.length - 1;
    let workingRows: AttendanceStudentRow[] = attendance.rows.map((r) => ({
      ...r,
      days: [...r.days],
    }));

    let nextEndRollNo = attendance.endRollNo;
    if (neededEndIndex >= workingRows.length) {
      const extraCount = neededEndIndex - workingRows.length + 1;
      const lastSNo =
        workingRows.length > 0
          ? workingRows[workingRows.length - 1].sNo
          : attendance.startRollNo - 1;
      for (let i = 1; i <= extraCount; i += 1) {
        workingRows.push({
          sNo: lastSNo + i,
          name: '',
          days: createEmptyDaysArray(),
        });
      }
      nextEndRollNo = workingRows[workingRows.length - 1].sNo;
    }

    rawLines.forEach((line, offset) => {
      const rowIdx = targetStartIdx + offset;
      const targetRow = workingRows[rowIdx];
      if (!targetRow) return;

      // Split by tab first (Excel / Google Sheets copy); fallback to comma if multi-part CSV line
      let cols: string[];
      if (line.includes('\t')) {
        cols = line.split('\t').map((c) => c.trim());
      } else if (colOffset === -1 && line.includes(',')) {
        const commaParts = line.split(',').map((c) => c.trim());
        const looksLikeAttendanceCsv =
          commaParts.length >= 2 &&
          commaParts.slice(1).every((part) => {
            const u = part.toUpperCase();
            return u === '' || u === 'P' || u === 'A' || u === 'PRESENT' || u === 'ABSENT';
          });
        cols = looksLikeAttendanceCsv ? commaParts : [line.trim()];
      } else {
        cols = [line.trim()];
      }

      if (colOffset === -1) {
        // Check if col 0 is just a serial number (e.g., pasted from Excel columns A:N including S.NO)
        let nameIdx = 0;
        if (cols.length >= 2 && /^\d+$/.test(cols[0]) && !/^\d+$/.test(cols[1])) {
          nameIdx = 1;
        }
        const cleanedName = stripLeadingSerial(cols[nameIdx] || '');
        if (cleanedName) {
          targetRow.name = cleanedName;
        }
        const remainingDays = cols.slice(nameIdx + 1);
        if (remainingDays.length > 0) {
          remainingDays.slice(0, 12).forEach((val, dIdx) => {
            targetRow.days[dIdx] = normalizeAttendanceMark(val);
          });
        } else if (autoFillPresentDays > 0) {
          for (let d = 0; d < Math.min(12, autoFillPresentDays); d += 1) {
            targetRow.days[d] = 'P';
          }
        }
      } else {
        // Pasting directly into a Day column (Day 1..Day 12)
        cols.forEach((val, cIdx) => {
          const dayIdx = colOffset + cIdx;
          if (dayIdx >= 0 && dayIdx < 12) {
            targetRow.days[dayIdx] = normalizeAttendanceMark(val);
          }
        });
      }
    });

    setRangeEndInput(String(nextEndRollNo));
    onChangeAttendance({
      ...attendance,
      endRollNo: nextEndRollNo,
      rows: workingRows,
    });
    return rawLines.length;
  };

  const handleBulkSubmit = () => {
    if (!bulkText.trim()) return;
    let startIdx = 0;
    if (bulkMode === 'append') {
      const lastFilledIdx = attendance.rows.reduce(
        (last, row, idx) => (row.name.trim() ? idx : last),
        -1
      );
      startIdx = lastFilledIdx + 1;
    }
    const inserted = applyPastedLines(bulkText, startIdx, -1, bulkAutoFillDays);
    setBulkText('');
    setShowBulkPanel(false);
    flashFeedback(`Added ${inserted} student row${inserted === 1 ? '' : 's'} cleanly in order.`);
  };

  const handleCellPaste = (
    e: React.ClipboardEvent,
    rowIdx: number,
    colOffset: number // -1 = name, 0..11 = day 1..12
  ) => {
    const pasted = e.clipboardData.getData('text/plain');
    if (!pasted) return;
    // Intercept multi-line or tab-separated Excel paste; let single plain-word paste behave normally on name input
    const isMultiCell = pasted.includes('\n') || pasted.includes('\t');
    if (colOffset === -1 && !isMultiCell) return;

    e.preventDefault();
    const count = applyPastedLines(pasted, rowIdx, colOffset, 0);
    if (count > 0) {
      flashFeedback(`Pasted ${count} row${count === 1 ? '' : 's'} cleanly into the sheet.`);
    }
  };

  const focusCell = (rowIdx: number, colIdx: number) => {
    const safeRow = Math.max(0, Math.min(attendance.rows.length - 1, rowIdx));
    const safeCol = Math.max(-1, Math.min(11, colIdx));
    const el = cellRefs.current[`${safeRow}:${safeCol}`];
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement) {
        el.select();
      }
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusCell(rowIdx + 1, -1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusCell(rowIdx - 1, -1);
    }
  };

  const handleDayCellKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    rowIdx: number,
    dayIdx: number
  ) => {
    const key = e.key;
    if (key === 'p' || key === 'P') {
      e.preventDefault();
      handleSetDayMark(rowIdx, dayIdx, 'P');
      focusCell(rowIdx, Math.min(11, dayIdx + 1));
    } else if (key === 'a' || key === 'A') {
      e.preventDefault();
      handleSetDayMark(rowIdx, dayIdx, 'A');
      focusCell(rowIdx, Math.min(11, dayIdx + 1));
    } else if (key === 'Backspace' || key === 'Delete') {
      e.preventDefault();
      handleSetDayMark(rowIdx, dayIdx, '');
    } else if (key === 'ArrowRight') {
      e.preventDefault();
      focusCell(rowIdx, dayIdx + 1);
    } else if (key === 'ArrowLeft') {
      e.preventDefault();
      focusCell(rowIdx, dayIdx - 1);
    } else if (key === 'ArrowDown' || key === 'Enter') {
      e.preventDefault();
      focusCell(rowIdx + 1, dayIdx);
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      focusCell(rowIdx - 1, dayIdx);
    }
  };

  const handleClearSheet = () => {
    const cleared = buildAttendanceRowsForRange(
      attendance.startRollNo,
      attendance.endRollNo,
      []
    );
    onChangeAttendance({
      ...attendance,
      dayDates: createEmptyDayDatesArray(),
      rows: cleared,
    });
    setActiveCalendar(null);
    setConfirmClearGrid(false);
    flashFeedback(
      'Cleared the current editor grid. Your saved attendance sheets are still preserved until you delete them.'
    );
  };

  const handleExportCsv = () => {
    const csvRows: string[] = [];
    csvRows.push(escapeCsvCell(attendance.organizationTitle || 'Magic Bus India Foundation'));
    csvRows.push(escapeCsvCell(effectiveCollegeBatch));
    csvRows.push(
      [
        'S.NO',
        'Student Name',
        ...DAY_INDICES.map((d) =>
          dayDates[d] ? `Day ${d + 1} (${dayDates[d]})` : `Day ${d + 1}`
        ),
      ]
        .map(escapeCsvCell)
        .join(',')
    );
    attendance.rows.forEach((row) => {
      csvRows.push([row.sNo, row.name, ...row.days].map(escapeCsvCell).join(','));
    });

    const blob = new Blob([`\uFEFF${csvRows.join('\r\n')}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const slug = effectiveCollegeBatch.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 36);
    link.href = url;
    link.download = `Attendance_Sheet_${slug || '12_Days'}.csv`;
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    flashFeedback('Excel-compatible CSV attendance sheet downloaded.');
  };

  const handleExportPdf = async () => {
    if (pdfProgress) return;
    const nodes = landscapePageRefs.current
      .slice(0, landscapeChunks.length)
      .filter((el): el is HTMLDivElement => el !== null);
    if (nodes.length === 0) return;

    setPdfProgress({ current: 1, total: nodes.length });
    try {
      const slug = effectiveCollegeBatch.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 36);
      await exportLandscapePagesToPdf(
        nodes,
        `Magic_Bus_Attendance_Sheet_${slug || '12_Days'}.pdf`,
        (current, total) => setPdfProgress({ current, total })
      );
      flashFeedback(
        `Exported formatted A4 PDF (${nodes.length} page${nodes.length === 1 ? '' : 's'}, 18–19 students/page).`
      );
    } catch (err) {
      console.error('Attendance PDF export failed:', err);
      flashFeedback('Unable to export Attendance PDF. Please try again.', 'error');
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
          <Table2 className="w-5 h-5 text-[#FCD116] shrink-0" />
          <div className="min-w-0">
            <h2 className="text-white text-[17px] sm:text-[18px] font-bold tracking-tight leading-snug">
              12-Days Attendance Sheet Builder
            </h2>
            <p className="text-[#CBDDF5] text-[12px] sm:text-[12.5px]">
              Excel-style bulk entry grid &middot; Exports clean multi-page A4 PDF (18–19 students per page)
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
                  Export as PDF ({landscapeChunks.length}{' '}
                  {landscapeChunks.length === 1 ? 'Page' : 'Pages'})
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

      {/* Sheet Metadata & Report Sync Controls */}
      <div className="p-4 sm:p-5 bg-[#F8FAFD] border-b border-[#E2E8F0] space-y-4">
        {/* Progress Tracker & Saved Sheets Bar */}
        <div className="rounded-lg border border-[#D4E0F0] bg-white p-3.5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                <span className="font-extrabold text-[#0A254E]">
                  Attendance Progress: {progressStats.daysMarked} / 12 Days Tracked ({progressStats.percent}%)
                </span>
                <span className="text-[#94A3B8]">&middot;</span>
                <span className="font-semibold text-[#334155] tabular-nums">
                  {filledStudentCount} / {attendance.rows.length} Students
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

          {/* Saved 12-Days Attendance Sheets Drawer */}
          {showSavedPanel && (
            <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-extrabold text-[#0A254E]">
                  Saved 12-Days Attendance Sheets ({savedSheets.length})
                </h3>
                <span className="text-[11.5px] font-medium text-[#64748B]">
                  Saved attendance stays permanently preserved until you click Delete
                </span>
              </div>

              {savedSheets.length === 0 ? (
                <div className="rounded-md bg-[#F8FAFD] border border-dashed border-[#CBD5E1] px-4 py-4 text-center text-[12.5px] text-[#475569]">
                  No 12-Days attendance sheets saved yet. Enter student names or daily marks and click{' '}
                  <strong>Save Sheet</strong> to save your progress.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {savedSheets.map((sheet) => {
                    const summary = summarize12DaySheet(sheet);
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
                              {summary.filledStudents} / {summary.totalRows} Students
                            </span>
                            <span>&middot;</span>
                            <span>{summary.daysMarked} / 12 Days Marked</span>
                            <span>&middot;</span>
                            <span className="font-normal text-[#64748B]">
                              Saved {formatSavedTimestamp(sheet.updatedAt)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.round((summary.daysMarked / 12) * 100)}%`,
                                backgroundColor:
                                  summary.daysMarked === 12 ? '#16A34A' : '#0B3C82',
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label
              htmlFor="att-org-title"
              className="block text-[12.5px] font-bold text-[#0A254E] mb-1"
            >
              Row 1 Sheet Header (Organization)
            </label>
            <input
              id="att-org-title"
              type="text"
              value={attendance.organizationTitle}
              onChange={(e) =>
                onChangeAttendance({ ...attendance, organizationTitle: e.target.value })
              }
              placeholder="Magic Bus India Foundation"
              className="w-full px-3 py-2 rounded-md border border-[#CBD4E1] bg-white text-[16px] sm:text-[13.5px] font-semibold text-[#0F172A] focus:outline-none focus:border-[#0B336B]"
            />
          </div>

          <div>
            <label
              htmlFor="att-college-batch"
              className="block text-[12.5px] font-bold text-[#0A254E] mb-1"
            >
              Row 2 Sheet Header (College &amp; Batch Code)
            </label>
            <input
              id="att-college-batch"
              type="text"
              value={attendance.collegeBatchHeader}
              onChange={(e) =>
                onChangeAttendance({ ...attendance, collegeBatchHeader: e.target.value })
              }
              placeholder={defaultCollegeBatchHeader}
              className="w-full px-3 py-2 rounded-md border border-[#CBD4E1] bg-white text-[16px] sm:text-[13.5px] font-semibold text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#0B336B]"
            />
          </div>
        </div>

        {/* Row Range Selector + Bulk Paste + Report Page 11 Sync */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-1">
          {/* Student Range Selector */}
          <form
            onSubmit={handleApplyCustomRange}
            className="flex flex-wrap items-center gap-2 bg-white border border-[#D8E1EE] rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#0A254E]">
              <Users className="w-4 h-4 text-[#0B336B]" />
              <span>Student Range:</span>
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor="range-start" className="text-[12px] font-semibold text-[#475569]">
                From
              </label>
              <input
                id="range-start"
                type="number"
                min={1}
                max={500}
                value={rangeStartInput}
                onChange={(e) => setRangeStartInput(e.target.value)}
                className="w-16 px-2 py-1 rounded border border-[#CBD4E1] text-[13px] font-bold text-center text-[#0A254E] focus:outline-none focus:border-[#0B336B]"
              />
              <label htmlFor="range-end" className="text-[12px] font-semibold text-[#475569]">
                To
              </label>
              <input
                id="range-end"
                type="number"
                min={1}
                max={500}
                value={rangeEndInput}
                onChange={(e) => setRangeEndInput(e.target.value)}
                className="w-16 px-2 py-1 rounded border border-[#CBD4E1] text-[13px] font-bold text-center text-[#0A254E] focus:outline-none focus:border-[#0B336B]"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded bg-[#082B59] text-white text-[12px] font-bold hover:brightness-110 cursor-pointer"
              >
                Apply
              </button>
            </div>

            <span className="hidden sm:inline-block h-4 w-[1px] bg-[#CBD5E1]" />

            <div className="flex flex-wrap items-center gap-1">
              {RANGE_PRESETS.map((count) => {
                const isSelected =
                  attendance.startRollNo === 1 && attendance.endRollNo === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => applyRange(1, count)}
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

          {/* Action Buttons: Bulk Add + Add Row + Clear */}
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
              <span>Bulk Add / Paste Students</span>
            </button>

            <button
              type="button"
              onClick={handleAddSingleRow}
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

        {/* Bulk Day-Range Attendance Marking Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#D8E1EE] rounded-lg px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-extrabold text-[#0A254E]">
              Bulk Mark Days:
            </span>
            <select
              aria-label="Bulk mark from day"
              value={bulkFromDay}
              onChange={(e) => setBulkFromDay(Number(e.target.value))}
              className="px-2 py-1 rounded border border-[#CBD4E1] bg-white text-[12.5px] font-bold text-[#0A254E]"
            >
              {DAY_INDICES.map((d) => (
                <option key={d} value={d + 1}>
                  Day {d + 1}
                </option>
              ))}
            </select>
            <span className="text-[12px] text-[#64748B] font-semibold">to</span>
            <select
              aria-label="Bulk mark to day"
              value={bulkToDay}
              onChange={(e) => setBulkToDay(Number(e.target.value))}
              className="px-2 py-1 rounded border border-[#CBD4E1] bg-white text-[12.5px] font-bold text-[#0A254E]"
            >
              {DAY_INDICES.map((d) => (
                <option key={d} value={d + 1}>
                  Day {d + 1}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleBulkDayRangeAction('P')}
              className="px-2.5 py-1 rounded bg-[#166534] text-white text-[12px] font-bold hover:brightness-110 cursor-pointer"
            >
              Mark All P
            </button>
            <button
              type="button"
              onClick={() => handleBulkDayRangeAction('A')}
              className="px-2.5 py-1 rounded bg-[#B91C1C] text-white text-[12px] font-bold hover:brightness-110 cursor-pointer"
            >
              Mark All A
            </button>
            <button
              type="button"
              onClick={() => handleBulkDayRangeAction('')}
              className="px-2.5 py-1 rounded border border-[#CBD4E1] bg-[#F8FAFC] text-[#334155] text-[12px] font-bold flex items-center gap-1 hover:bg-[#E2E8F0] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>

            <label className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#475569] cursor-pointer ml-1">
              <input
                type="checkbox"
                checked={onlyNamedRows}
                onChange={(e) => setOnlyNamedRows(e.target.checked)}
                className="accent-[#0B336B]"
              />
              <span>Only filled names</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-[12.5px] font-bold text-[#0A254E] cursor-pointer">
              <input
                type="checkbox"
                checked={attendance.useInReport}
                onChange={(e) =>
                  onChangeAttendance({ ...attendance, useInReport: e.target.checked })
                }
                className="w-4 h-4 accent-[#0B336B]"
              />
              <span>Use in Complete PDF Report (Page 11)</span>
            </label>
            <button
              type="button"
              onClick={onOpenReportPreview}
              className="text-[12px] font-bold text-[#0B336B] underline hover:text-[#061F45] cursor-pointer"
            >
              View in Report &rarr;
            </button>
          </div>
        </div>

        {/* Expandable Bulk Paste Panel */}
        {showBulkPanel && (
          <div className="rounded-lg border-2 border-[#0B336B]/25 bg-white p-4 space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-[14px] font-extrabold text-[#0A254E]">
                  Bulk Paste Student Names or Excel Attendance Rows
                </h3>
                <p className="text-[12px] text-[#475569]">
                  Paste one student name per line (serial numbers like &ldquo;1.&rdquo; are auto-cleaned) OR copy &amp; paste columns directly from Excel (Name + Day 1–12 P/A values).
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
              placeholder={`Example (plain list or copied from Excel):\nA Manjunath\nK Reddy Susmitha\nShaik Jasmeen\nRepana Santhosh\n\nOr with attendance columns:\nA Manjunath\tP\tP\tP\tP\nK Reddy Susmitha\tP\tP\tA\tP`}
              className="w-full px-3 py-2.5 rounded-md border border-[#CBD4E1] font-mono text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0B336B]"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
                <label className="inline-flex items-center gap-1.5 font-semibold text-[#334155] cursor-pointer">
                  <input
                    type="radio"
                    name="bulk-mode"
                    checked={bulkMode === 'replace-from-start'}
                    onChange={() => setBulkMode('replace-from-start')}
                    className="accent-[#0B336B]"
                  />
                  <span>Fill from S.NO {attendance.startRollNo}</span>
                </label>

                <label className="inline-flex items-center gap-1.5 font-semibold text-[#334155] cursor-pointer">
                  <input
                    type="radio"
                    name="bulk-mode"
                    checked={bulkMode === 'append'}
                    onChange={() => setBulkMode('append')}
                    className="accent-[#0B336B]"
                  />
                  <span>Append after last student</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#334155]">Auto-mark Present:</span>
                  <select
                    value={bulkAutoFillDays}
                    onChange={(e) => setBulkAutoFillDays(Number(e.target.value))}
                    className="px-2 py-1 rounded border border-[#CBD4E1] bg-white text-[12px] font-bold text-[#0A254E]"
                  >
                    <option value={0}>Keep days blank</option>
                    {DAY_INDICES.map((d) => (
                      <option key={d} value={d + 1}>
                        Day 1 to Day {d + 1} = P
                      </option>
                    ))}
                  </select>
                </div>
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

      {/* Interactive Excel-Style 12-Day Attendance Spreadsheet Grid */}
      <div className="p-3 sm:p-5 bg-white">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#475569]">
          <span>
            <strong>Tip:</strong> Click any Day cell to toggle <strong>P</strong> &rarr;{' '}
            <strong>A</strong> &rarr; Blank, or use keyboard keys (<strong>P</strong>,{' '}
            <strong>A</strong>, Arrow keys, <strong>Ctrl+V</strong> directly from Excel).
          </span>
          <span className="font-bold text-[#0A254E] tabular-nums">
            {filledStudentCount} / {attendance.rows.length} Students Entered
          </span>
        </div>

        <div className="w-full overflow-x-auto border border-[#000000] rounded-sm shadow-xs">
          <table
            className="w-full border-collapse min-w-[1320px]"
            style={{ fontFamily: "'Source Sans 3', 'Segoe UI', Arial, sans-serif" }}
          >
            <thead>
              {/* Merged Row 1: Magic Bus India Foundation */}
              <tr className="bg-white">
                <th
                  colSpan={14}
                  className="border-b border-[#000000] py-2 px-3 text-center text-[17px] font-bold text-black"
                >
                  {attendance.organizationTitle || 'Magic Bus India Foundation'}
                </th>
              </tr>

              {/* Merged Row 2: College Name (Batch Code) */}
              <tr className="bg-white">
                <th
                  colSpan={14}
                  className="border-b border-[#000000] py-1.5 px-3 text-center text-[15px] font-bold text-black"
                >
                  {effectiveCollegeBatch}
                </th>
              </tr>

              {/* Column Header Row 3: S.NO | Student Name | Day 1 ... Day 12 */}
              <tr className="bg-[#F8FAFC]">
                <th className="w-[54px] border-b border-r border-[#000000] py-1.5 px-2 text-center text-[13px] font-bold text-black">
                  S.NO
                </th>
                <th className="min-w-[220px] border-b border-r border-[#000000] py-1.5 px-3 text-center text-[13px] font-bold text-black">
                  Student Name
                </th>
                {DAY_INDICES.map((dIdx) => {
                  const dateValue = dayDates[dIdx];
                  const isOpen = activeCalendar?.dayIdx === dIdx;
                  return (
                    <th
                      key={dIdx}
                      className="w-[96px] min-w-[96px] border-b border-r last:border-r-0 border-[#000000] py-1.5 px-1 text-center text-[12.5px] font-bold text-black align-middle"
                    >
                      <div className="leading-tight">Day {dIdx + 1}</div>
                      <button
                        type="button"
                        data-day-calendar-trigger="true"
                        onClick={(e) => handleOpenDayCalendar(dIdx, e)}
                        title={
                          dateValue
                            ? `Day ${dIdx + 1} Session Date: ${dateValue} (Click to change)`
                            : `Set Day ${dIdx + 1} Session Date`
                        }
                        className={`mt-1 w-full px-1 py-0.5 rounded border text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                          isOpen
                            ? 'bg-[#082B59] text-white border-[#082B59]'
                            : dateValue
                              ? 'bg-[#E8F1FD] text-[#082B59] border-[#BFD6F7] hover:bg-[#DCEAFE]'
                              : 'bg-white text-[#64748B] border-dashed border-[#94A3B8] hover:border-[#0B336B] hover:text-[#082B59]'
                        }`}
                      >
                        <Calendar className="w-2.5 h-2.5 shrink-0" />
                        <span className="tabular-nums">{dateValue || 'Add Date'}</span>
                      </button>
                      <div className="mt-1 flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          title={`Mark all Day ${dIdx + 1} as Present (P)`}
                          onClick={() => handleBulkColumnMark(dIdx, 'P')}
                          className="px-1 py-0 text-[9.5px] font-extrabold rounded bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0] cursor-pointer leading-tight"
                        >
                          P
                        </button>
                        <button
                          type="button"
                          title={`Mark all Day ${dIdx + 1} as Absent (A)`}
                          onClick={() => handleBulkColumnMark(dIdx, 'A')}
                          className="px-1 py-0 text-[9.5px] font-extrabold rounded bg-[#FEE2E2] text-[#B91C1C] hover:bg-[#FECACA] cursor-pointer leading-tight"
                        >
                          A
                        </button>
                        <button
                          type="button"
                          title={`Clear Day ${dIdx + 1}`}
                          onClick={() => handleBulkColumnMark(dIdx, '')}
                          className="px-1 py-0 text-[9.5px] font-extrabold rounded bg-[#E2E8F0] text-[#475569] hover:bg-[#CBD5E1] cursor-pointer leading-tight"
                        >
                          &times;
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {attendance.rows.map((row, rowIdx) => (
                <tr key={row.sNo} className="bg-white hover:bg-[#F8FBFF]">
                  {/* S.NO */}
                  <td className="border-b border-r border-[#000000] py-1 px-2 text-center text-[13px] font-bold text-black tabular-nums select-none bg-[#FCFDFF]">
                    {row.sNo}
                  </td>

                  {/* Student Name Input Cell */}
                  <td className="border-b border-r border-[#000000] p-0">
                    <input
                      ref={(el) => {
                        cellRefs.current[`${rowIdx}:-1`] = el;
                      }}
                      type="text"
                      aria-label={`Student ${row.sNo} Name`}
                      value={row.name}
                      onChange={(e) => handleNameChange(rowIdx, e.target.value)}
                      onPaste={(e) => handleCellPaste(e, rowIdx, -1)}
                      onKeyDown={(e) => handleNameKeyDown(e, rowIdx)}
                      placeholder={`Student ${row.sNo}`}
                      className="w-full h-full px-3 py-2 text-[13.5px] font-bold text-black placeholder:text-[#CBD5E1] placeholder:font-normal bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#1D6F42] focus:bg-[#F0FDF4]"
                    />
                  </td>

                  {/* Day 1 .. Day 12 Attendance Cells */}
                  {DAY_INDICES.map((dIdx) => {
                    const mark = row.days[dIdx] || '';
                    return (
                      <td
                        key={dIdx}
                        className="border-b border-r last:border-r-0 border-[#000000] p-0"
                      >
                        <button
                          ref={(el) => {
                            cellRefs.current[`${rowIdx}:${dIdx}`] = el;
                          }}
                          type="button"
                          aria-label={`Row ${row.sNo} Day ${dIdx + 1}: ${mark || 'Blank'}`}
                          onClick={() => handleCycleDayMark(rowIdx, dIdx)}
                          onKeyDown={(e) => handleDayCellKeyDown(e, rowIdx, dIdx)}
                          onPaste={(e) => handleCellPaste(e, rowIdx, dIdx)}
                          className={`w-full h-[32px] flex items-center justify-center text-[13px] font-bold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#1D6F42] ${
                            mark === 'P'
                              ? 'text-black bg-[#F0FDF4] hover:bg-[#DCFCE7]'
                              : mark === 'A'
                                ? 'text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2]'
                                : 'text-[#94A3B8] bg-transparent hover:bg-[#F1F5F9]'
                          }`}
                        >
                          {mark}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>

            {/* Summary Footer Row: Daily Present Count */}
            <tfoot>
              <tr className="bg-[#EEF4FC]">
                <td
                  colSpan={2}
                  className="border-t border-r border-[#000000] py-1.5 px-3 text-right text-[12px] font-extrabold text-[#0A254E]"
                >
                  Daily Present Count (P):
                </td>
                {dailyPresentCounts.map((count, dIdx) => (
                  <td
                    key={dIdx}
                    className="border-t border-r last:border-r-0 border-[#000000] py-1.5 px-1 text-center text-[12px] font-extrabold text-[#0A254E] tabular-nums"
                  >
                    {count}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Off-Screen 1:1 Landscape A4 Staging Container for Standalone Attendance PDF / PNG Export */}
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
        {landscapeChunks.map((chunk, idx) => (
          <div
            key={`landscape-attendance-${idx}`}
            ref={(el) => {
              landscapePageRefs.current[idx] = el;
            }}
            style={{
              width: `${A4_LANDSCAPE_WIDTH}px`,
              height: `${A4_LANDSCAPE_HEIGHT}px`,
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
            }}
          >
            <AttendanceLandscapeSheet
              organizationTitle={attendance.organizationTitle}
              collegeBatchHeader={effectiveCollegeBatch}
              dayDates={dayDates}
              rows={chunk}
              pageIndex={idx}
              totalPages={landscapeChunks.length}
            />
          </div>
        ))}
      </div>

      {/* Floating Fixed-Position Session Date Calendar Popover for Day 1 .. Day 12 */}
      {activeCalendar && (() => {
        const { dayIdx, top, left, viewYear, viewMonth } = activeCalendar;
        const selectedDate = parseDayDate(dayDates[dayIdx]);
        const today = new Date();
        const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const calendarCells: Array<number | null> = [
          ...Array.from({ length: firstDayOfMonth }, () => null),
          ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
        ];

        const shiftMonth = (delta: number) => {
          const next = new Date(viewYear, viewMonth + delta, 1);
          setActiveCalendar((prev) =>
            prev
              ? { ...prev, viewYear: next.getFullYear(), viewMonth: next.getMonth() }
              : null
          );
        };

        return (
          <div
            ref={calendarPopoverRef}
            role="dialog"
            aria-label={`Select session date for Day ${dayIdx + 1}`}
            style={{ top: `${top}px`, left: `${left}px` }}
            className="fixed z-50 w-[272px] rounded-xl border border-[#CBD4E1] bg-white shadow-[0_14px_34px_rgba(7,35,75,0.22)] overflow-hidden"
          >
            {/* Calendar Header */}
            <div
              className="px-3 py-2 flex items-center justify-between text-white"
              style={{ background: 'linear-gradient(90deg, #072754 0%, #0C366F 100%)' }}
            >
              <div className="flex items-center gap-1.5 text-[12px] font-bold">
                <Calendar className="w-3.5 h-3.5 text-[#FCD116]" />
                <span>Day {dayIdx + 1} Session Date</span>
              </div>
              <button
                type="button"
                aria-label="Close calendar"
                onClick={() => setActiveCalendar(null)}
                className="p-0.5 rounded hover:bg-white/15 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Month / Year Controls */}
            <div className="px-2.5 pt-2.5 pb-1.5 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
                className="p-1 rounded-md border border-[#DCE4F0] text-[#0A254E] hover:bg-[#F1F5FA] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-[13px] font-extrabold text-[#0A254E]">
                {CALENDAR_MONTHS[viewMonth]} {viewYear}
              </div>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
                className="p-1 rounded-md border border-[#DCE4F0] text-[#0A254E] hover:bg-[#F1F5FA] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday Header & Day Grid */}
            <div className="px-2.5 pb-2.5">
              <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                {CALENDAR_WEEKDAYS.map((wd) => (
                  <div
                    key={wd}
                    className="text-[10.5px] font-bold text-[#64748B] py-1 select-none"
                  >
                    {wd}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center">
                {calendarCells.map((dayNum, cIdx) => {
                  if (dayNum === null) {
                    return <div key={`empty-${cIdx}`} className="h-7" />;
                  }
                  const isSelected =
                    Boolean(selectedDate) &&
                    selectedDate!.getFullYear() === viewYear &&
                    selectedDate!.getMonth() === viewMonth &&
                    selectedDate!.getDate() === dayNum;
                  const isToday =
                    today.getFullYear() === viewYear &&
                    today.getMonth() === viewMonth &&
                    today.getDate() === dayNum;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() =>
                        handleSetDayDate(
                          dayIdx,
                          formatDayDate(new Date(viewYear, viewMonth, dayNum))
                        )
                      }
                      className={`h-7 rounded-md text-[12px] font-bold tabular-nums transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#082B59] text-white shadow-xs'
                          : isToday
                            ? 'bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B] hover:bg-[#FDE68A]'
                            : 'text-[#0F172A] hover:bg-[#E8F1FD] hover:text-[#082B59]'
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Footer Shortcuts */}
              <div className="mt-2.5 pt-2 border-t border-[#E6ECF5] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleSetDayDate(dayIdx, formatDayDate(new Date()))}
                  className="px-2.5 py-1 rounded bg-[#E8F1FD] text-[#082B59] text-[11.5px] font-bold hover:bg-[#DCEAFE] cursor-pointer"
                >
                  Today
                </button>
                {dayDates[dayIdx] && (
                  <button
                    type="button"
                    onClick={() => handleSetDayDate(dayIdx, '')}
                    className="px-2.5 py-1 rounded border border-[#FECACA] bg-white text-[#B91C1C] text-[11.5px] font-bold hover:bg-[#FEF2F2] cursor-pointer"
                  >
                    Clear Date
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
